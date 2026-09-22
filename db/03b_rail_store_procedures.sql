USE kandypack;

DELIMITER //

-- ============================================================
-- Procedure: sp_allocate_cargo
-- REQ-RAIL-03, REQ-RAIL-04
-- Atomically allocates p_quantity of an order_item to a trip.
-- Uses SELECT … FOR UPDATE to block concurrent allocations.
-- OUT p_status: 'OK' | 'INSUFFICIENT_CAPACITY' | 'TRIP_NOT_FOUND' | 'TRIP_NOT_SCHEDULABLE'
-- ============================================================
CREATE PROCEDURE sp_allocate_cargo (
  IN  p_order_item_id INT,
  IN  p_trip_id       INT,
  IN  p_quantity      INT,
  OUT p_status        VARCHAR(100)
)
BEGIN
  DECLARE v_total_cap   DECIMAL(10, 2);
  DECLARE v_used_cap    DECIMAL(10, 2);
  DECLARE v_remaining   DECIMAL(10, 2);
  DECLARE v_trip_status VARCHAR(30);
  DECLARE v_order_id    INT;

  -- Lock the trip row to prevent concurrent over-allocation (REQ-RAIL-04)
  SELECT total_capacity, status
    INTO v_total_cap, v_trip_status
    FROM train_trip
   WHERE trip_id = p_trip_id
   FOR UPDATE;

  IF v_total_cap IS NULL THEN
    SET p_status = 'TRIP_NOT_FOUND';

  ELSEIF v_trip_status != 'Scheduled' THEN
    SET p_status = 'TRIP_NOT_SCHEDULABLE';

  ELSE
    SELECT COALESCE(SUM(allocated_quantity), 0)
      INTO v_used_cap
      FROM cargo_allocation
     WHERE trip_id = p_trip_id;

    SET v_remaining = v_total_cap - v_used_cap;

    IF p_quantity > v_remaining THEN
      SET p_status = 'INSUFFICIENT_CAPACITY';

    ELSE
      INSERT INTO cargo_allocation
        (order_item_id, trip_id, allocated_quantity, status)
      VALUES
        (p_order_item_id, p_trip_id, p_quantity, 'Not Loaded');

      -- Advance parent order from Placed → Scheduled (REQ-RAIL-03)
      SELECT order_id INTO v_order_id
        FROM order_item
       WHERE order_item_id = p_order_item_id;

      UPDATE `order`
         SET status = 'Scheduled'
       WHERE order_id = v_order_id
         AND status = 'Placed';

      SET p_status = 'OK';
    END IF;
  END IF;
END //

-- ============================================================
-- Procedure: sp_overflow_allocate
-- REQ-RAIL-05, REQ-RAIL-07
-- Fills p_start_trip_id as much as possible, then loops to
-- the next Scheduled trip for the same destination city,
-- repeating until the full quantity is allocated.
-- Logs each overflow hop to audit_log.
-- ============================================================
CREATE PROCEDURE sp_overflow_allocate (
  IN p_order_item_id INT,
  IN p_start_trip_id INT,
  IN p_quantity      INT
)
BEGIN
  DECLARE v_remaining       INT DEFAULT p_quantity;
  DECLARE v_cur_trip_id     INT DEFAULT p_start_trip_id;
  DECLARE v_cur_departure   DATETIME;
  DECLARE v_dest_city_id    INT;
  DECLARE v_total_cap       DECIMAL(10, 2);
  DECLARE v_used_cap        DECIMAL(10, 2);
  DECLARE v_available       INT;
  DECLARE v_to_allocate     INT;
  DECLARE v_next_trip_id    INT;
  DECLARE v_next_departure  DATETIME;
  DECLARE v_new_alloc_id    INT;
  DECLARE v_order_id        INT;

  -- Resolve order_id once
  SELECT order_id INTO v_order_id
    FROM order_item WHERE order_item_id = p_order_item_id;

  -- Get starting trip metadata
  SELECT destination_city_id, departure_datetime
    INTO v_dest_city_id, v_cur_departure
    FROM train_trip WHERE trip_id = p_start_trip_id;

  WHILE v_remaining > 0 DO

    -- Lock current trip
    SELECT total_capacity
      INTO v_total_cap
      FROM train_trip
     WHERE trip_id = v_cur_trip_id
     FOR UPDATE;

    SELECT COALESCE(SUM(allocated_quantity), 0)
      INTO v_used_cap
      FROM cargo_allocation
     WHERE trip_id = v_cur_trip_id;

    SET v_available   = FLOOR(v_total_cap - v_used_cap);
    SET v_to_allocate = LEAST(v_remaining, v_available);

    IF v_to_allocate > 0 THEN
      INSERT INTO cargo_allocation
        (order_item_id, trip_id, allocated_quantity, status)
      VALUES
        (p_order_item_id, v_cur_trip_id, v_to_allocate, 'Not Loaded');

      SET v_new_alloc_id = LAST_INSERT_ID();
      SET v_remaining    = v_remaining - v_to_allocate;

      -- Audit overflow hops (REQ-RAIL-05)
      IF v_cur_trip_id != p_start_trip_id THEN
        INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
        VALUES (
          NULL,
          'Cargo overflow allocation',
          'cargo_allocation',
          v_new_alloc_id,
          CONCAT('order_item_id=', p_order_item_id,
                 ' overflowed from trip ', p_start_trip_id,
                 ' → trip ', v_cur_trip_id,
                 ', qty=', v_to_allocate)
        );
      END IF;
    END IF;

    -- Find next trip if still quantity left
    IF v_remaining > 0 THEN
      SET v_next_trip_id = NULL;

      SELECT trip_id, departure_datetime
        INTO v_next_trip_id, v_next_departure
        FROM train_trip
       WHERE destination_city_id = v_dest_city_id
         AND status = 'Scheduled'
         AND departure_datetime > v_cur_departure
       ORDER BY departure_datetime ASC
       LIMIT 1;

      IF v_next_trip_id IS NULL THEN
        SET v_remaining = 0; -- No more trips; exit loop
      ELSE
        SET v_cur_trip_id   = v_next_trip_id;
        SET v_cur_departure = v_next_departure;
      END IF;
    END IF;

  END WHILE;

  -- Advance order to Scheduled
  UPDATE `order`
     SET status = 'Scheduled'
   WHERE order_id = v_order_id
     AND status = 'Placed';

END //

-- ============================================================
-- Trigger: trg_lock_trip_on_all_loaded
-- REQ-RAIL-06
-- When every cargo_allocation for a trip is 'Loaded':
--   1. Set train_trip.status = 'Loaded'  (locks the manifest)
--   2. Cascade parent orders → 'In Transit'
-- ============================================================
CREATE TRIGGER trg_lock_trip_on_all_loaded
AFTER UPDATE ON cargo_allocation
FOR EACH ROW
BEGIN
  DECLARE v_unloaded_count INT;

  IF NEW.status = 'Loaded' AND OLD.status != 'Loaded' THEN

    SELECT COUNT(*)
      INTO v_unloaded_count
      FROM cargo_allocation
     WHERE trip_id = NEW.trip_id
       AND status != 'Loaded';

    IF v_unloaded_count = 0 THEN

      UPDATE train_trip
         SET status = 'Loaded'
       WHERE trip_id = NEW.trip_id;

      UPDATE `order`
         SET status = 'In Transit'
       WHERE order_id IN (
               SELECT DISTINCT oi.order_id
                 FROM order_item oi
                 JOIN cargo_allocation ca ON ca.order_item_id = oi.order_item_id
                WHERE ca.trip_id = NEW.trip_id
             )
         AND status = 'Scheduled';

    END IF;
  END IF;
END //

DELIMITER ;
