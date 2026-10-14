USE kandypack;

-- =========================================================================
-- TRIGGER 1: trg_enforce_roster_scheduling_guards
-- Event: BEFORE INSERT ON truck_schedule
-- Enforces:
--   1. Driver Minimum Rest Gap >= 2 hours (REQ-SCHED-02)
--   2. Assistant Maximum 2 Routes per day (REQ-SCHED-03)
--   3. Driver Statutory 40-Hour Weekly Cap (REQ-SCHED-04)
--   4. Assistant Statutory 60-Hour Weekly Cap (REQ-SCHED-04)
-- =========================================================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_enforce_roster_scheduling_guards$$
CREATE TRIGGER trg_enforce_roster_scheduling_guards
BEFORE INSERT ON truck_schedule
FOR EACH ROW
BEGIN
  DECLARE v_min_rest_hours INT DEFAULT 2;
  DECLARE v_rest_violation_count INT DEFAULT 0;
  DECLARE v_asst_route_count INT DEFAULT 0;
  DECLARE v_week_start DATE;
  DECLARE v_new_shift_hours DECIMAL(5,2);
  DECLARE v_driver_weekly_hours DECIMAL(5,2) DEFAULT 0.00;
  DECLARE v_asst_weekly_hours DECIMAL(5,2) DEFAULT 0.00;

  -- Read configurable rest hours parameter (default 2)
  SELECT CAST(param_value AS UNSIGNED) INTO v_min_rest_hours
  FROM system_parameter
  WHERE param_name = 'driver_min_rest_hours'
  LIMIT 1;

  IF v_min_rest_hours IS NULL THEN
    SET v_min_rest_hours = 2;
  END IF;

  -- Calculate planned duration of the new shift in hours
  SET v_new_shift_hours = TIMESTAMPDIFF(MINUTE, 
    CONCAT(NEW.scheduled_date, ' ', NEW.start_time), 
    CONCAT(NEW.scheduled_date, ' ', NEW.end_time)
  ) / 60.0;

  -- -----------------------------------------------------------------------
  -- GUARD 1: REQ-SCHED-02 - Driver No Consecutive Routes (Rest Gap >= 2 Hours)
  -- -----------------------------------------------------------------------
  SELECT COUNT(*) INTO v_rest_violation_count
  FROM truck_schedule ts
  WHERE ts.driver_id = NEW.driver_id
    AND ts.scheduled_date = NEW.scheduled_date
    AND ts.status != 'Cancelled'
    AND (
      -- Case A: Prior run finishes with less than min rest gap before new run starts
      (ts.end_time <= NEW.start_time AND TIMESTAMPDIFF(MINUTE, ts.end_time, NEW.start_time) < (v_min_rest_hours * 60))
      OR
      -- Case B: Following run starts with less than min rest gap after new run ends
      (ts.start_time >= NEW.end_time AND TIMESTAMPDIFF(MINUTE, NEW.end_time, ts.start_time) < (v_min_rest_hours * 60))
      OR
      -- Case C: Direct time overlap
      (NEW.start_time < ts.end_time AND NEW.end_time > ts.start_time)
    );

  IF v_rest_violation_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Violation: Drivers cannot run 2 consecutive routes without at least 2 hours rest between shifts.';
  END IF;

  -- -----------------------------------------------------------------------
  -- GUARD 2: REQ-SCHED-03 - Assistant Max 2 Consecutive Routes
  -- Assistants cannot run for more than 2 consecutive routes without a rest break (>= v_min_rest_hours).
  -- -----------------------------------------------------------------------
  SELECT COUNT(*) INTO v_asst_route_count
  FROM truck_schedule r1
  JOIN truck_schedule r2 ON r1.assistant_id = r2.assistant_id
                         AND r1.scheduled_date = r2.scheduled_date
                         AND r1.truck_schedule_id != r2.truck_schedule_id
                         AND r1.status != 'Cancelled'
                         AND r2.status != 'Cancelled'
  WHERE r1.assistant_id = NEW.assistant_id
    AND r1.scheduled_date = NEW.scheduled_date
    AND (
      -- Case 1: r1 -> r2 -> NEW (all gaps < min_rest)
      (
        r1.end_time <= r2.start_time
        AND TIMESTAMPDIFF(MINUTE, r1.end_time, r2.start_time) < (v_min_rest_hours * 60)
        AND r2.end_time <= NEW.start_time
        AND TIMESTAMPDIFF(MINUTE, r2.end_time, NEW.start_time) < (v_min_rest_hours * 60)
      )
      OR
      -- Case 2: r1 -> NEW -> r2 (all gaps < min_rest)
      (
        r1.end_time <= NEW.start_time
        AND TIMESTAMPDIFF(MINUTE, r1.end_time, NEW.start_time) < (v_min_rest_hours * 60)
        AND NEW.end_time <= r2.start_time
        AND TIMESTAMPDIFF(MINUTE, NEW.end_time, r2.start_time) < (v_min_rest_hours * 60)
      )
      OR
      -- Case 3: NEW -> r1 -> r2 (all gaps < min_rest)
      (
        NEW.end_time <= r1.start_time
        AND TIMESTAMPDIFF(MINUTE, NEW.end_time, r1.start_time) < (v_min_rest_hours * 60)
        AND r1.end_time <= r2.start_time
        AND TIMESTAMPDIFF(MINUTE, r1.end_time, r2.start_time) < (v_min_rest_hours * 60)
      )
    );

  IF v_asst_route_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Violation: Assistants cannot run for more than 2 consecutive routes without a mandatory rest break.';
  END IF;

  -- -----------------------------------------------------------------------
  -- GUARD 3: REQ-SCHED-04 - Driver 40-Hour & Assistant 60-Hour Weekly Caps
  -- -----------------------------------------------------------------------
  -- Determine Monday of the ISO week
  SET v_week_start = DATE_SUB(NEW.scheduled_date, INTERVAL WEEKDAY(NEW.scheduled_date) DAY);

  -- Sum Driver's planned & logged hours in this week
  SELECT COALESCE(SUM(
    TIMESTAMPDIFF(MINUTE, ts.start_time, ts.end_time) / 60.0
  ), 0.00) INTO v_driver_weekly_hours
  FROM truck_schedule ts
  WHERE ts.driver_id = NEW.driver_id
    AND ts.scheduled_date >= v_week_start
    AND ts.scheduled_date < DATE_ADD(v_week_start, INTERVAL 7 DAY)
    AND ts.status != 'Cancelled';

  IF (v_driver_weekly_hours + v_new_shift_hours) > 40.0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Violation: Driver weekly scheduled hours exceed statutory 40-hour cap.';
  END IF;

  -- Sum Assistant's planned & logged hours in this week
  SELECT COALESCE(SUM(
    TIMESTAMPDIFF(MINUTE, ts.start_time, ts.end_time) / 60.0
  ), 0.00) INTO v_asst_weekly_hours
  FROM truck_schedule ts
  WHERE ts.assistant_id = NEW.assistant_id
    AND ts.scheduled_date >= v_week_start
    AND ts.scheduled_date < DATE_ADD(v_week_start, INTERVAL 7 DAY)
    AND ts.status != 'Cancelled';

  IF (v_asst_weekly_hours + v_new_shift_hours) > 60.0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Violation: Assistant weekly scheduled hours exceed statutory 60-hour cap.';
  END IF;

END$$
DELIMITER ;


-- =========================================================================
-- TRIGGER 2: trg_enforce_pre_pickup_and_sequence
-- Event: BEFORE UPDATE ON truck_allocation
-- Enforces:
--   1. Store Pickup Gatekeeper (REQ-DEL-02): Cannot record delivery outcomes
--      before departure is confirmed on truck_schedule.
--   2. Sequential Route Progression (REQ-DEL-03): Cannot deliver a stop if
--      an earlier route_stop_id is still 'Pending'.
-- =========================================================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_enforce_pre_pickup_and_sequence$$
CREATE TRIGGER trg_enforce_pre_pickup_and_sequence
BEFORE UPDATE ON truck_allocation
FOR EACH ROW
BEGIN
  DECLARE v_pickup_confirmed DATETIME;
  DECLARE v_current_stop_order INT;
  DECLARE v_pending_earlier_stops INT DEFAULT 0;

  -- Only check when changing delivery status away from 'Pending'
  IF NEW.delivery_status != 'Pending' AND OLD.delivery_status = 'Pending' THEN

    -- 1. Check Store Pickup Confirmation (REQ-DEL-02)
    SELECT ts.pickup_confirmed_at INTO v_pickup_confirmed
    FROM truck_schedule ts
    WHERE ts.truck_schedule_id = NEW.truck_schedule_id;

    IF v_pickup_confirmed IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Violation: Store pickup must be confirmed before recording delivery stop outcomes.';
    END IF;

    -- 2. Check Stop Sequence (REQ-DEL-03)
    SELECT stop_order INTO v_current_stop_order
    FROM route_stop
    WHERE route_stop_id = NEW.route_stop_id;

    SELECT COUNT(*) INTO v_pending_earlier_stops
    FROM truck_allocation ta
    JOIN route_stop rs ON ta.route_stop_id = rs.route_stop_id
    WHERE ta.truck_schedule_id = NEW.truck_schedule_id
      AND rs.stop_order < v_current_stop_order
      AND ta.delivery_status = 'Pending';

    IF v_pending_earlier_stops > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Violation: Route stop sequence violation. Preceding stops must be attempted before advancing.';
    END IF;

  END IF;
END$$
DELIMITER ;


-- =========================================================================
-- TRIGGER 3: trg_auto_requeue_failed_delivery
-- Event: AFTER UPDATE ON truck_allocation
-- Enforces:
--   Auto-Requeue on Delivery Failure (REQ-DEL-04)
--   When a stop outcome is marked 'Failed', the order status is automatically
--   reverted to 'Placed' in the database so it can be re-routed.
-- =========================================================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_auto_requeue_failed_delivery$$
CREATE TRIGGER trg_auto_requeue_failed_delivery
AFTER UPDATE ON truck_allocation
FOR EACH ROW
BEGIN
  -- When outcome changes to 'Failed'
  IF NEW.delivery_status = 'Failed' AND OLD.delivery_status != 'Failed' THEN
    -- Revert order status to 'Placed' to allow rescheduling
    UPDATE `order`
    SET status = 'Placed'
    WHERE order_id = NEW.order_id;

    -- Log system event into audit_log
    INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
    VALUES (
      NULL,
      'AUTO_REQUEUE_DELIVERY',
      'order',
      NEW.order_id,
      CONCAT('Order #', NEW.order_id, ' automatically reverted to Placed following delivery failure at allocation #', NEW.truck_allocation_id, '. Note: ', COALESCE(NEW.delivery_note, 'No note provided'))
    );
  END IF;
END$$
DELIMITER ;
