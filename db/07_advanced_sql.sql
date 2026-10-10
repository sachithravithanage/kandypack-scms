USE kandypack;

-- Intermediate SQL: integrity constraints and indexes.
ALTER TABLE product
  ADD CONSTRAINT chk_product_price CHECK (unit_price >= 0),
  ADD CONSTRAINT chk_product_space CHECK (space_consumption_rate > 0);

ALTER TABLE main_inventory
  ADD CONSTRAINT chk_inventory_quantity CHECK (quantity_in_stock >= 0);

ALTER TABLE order_item
  ADD CONSTRAINT chk_order_item_quantity CHECK (quantity > 0);

CREATE INDEX idx_order_customer_status
  ON `order` (customer_id, status, order_date);

CREATE INDEX idx_order_item_product
  ON order_item (product_id, order_id);

CREATE INDEX idx_trip_destination_departure
  ON train_trip (destination_city_id, departure_datetime);

CREATE INDEX idx_schedule_date_status
  ON truck_schedule (scheduled_date, status);

-- Intermediate SQL: views hide implementation details while preserving joins.
CREATE OR REPLACE VIEW v_inventory_overview AS
SELECT
  p.product_id,
  p.name AS product_name,
  p.unit_price,
  COALESCE(mi.quantity_in_stock, 0) AS quantity_in_stock,
  CASE
    WHEN COALESCE(mi.quantity_in_stock, 0) = 0 THEN 'Out of stock'
    WHEN COALESCE(mi.quantity_in_stock, 0) < 100 THEN 'Low stock'
    ELSE 'In stock'
  END AS stock_status
FROM product AS p
LEFT JOIN main_inventory AS mi
  ON mi.product_id = p.product_id;

CREATE OR REPLACE VIEW v_order_delivery_summary AS
SELECT
  o.order_id,
  u.name AS customer_name,
  c.name AS destination_city,
  r.name AS route_name,
  s.name AS store_name,
  o.status,
  o.requested_delivery_date,
  o.total_value,
  COALESCE(SUM(oi.quantity), 0) AS total_units
FROM `order` AS o
JOIN customer AS cu ON cu.user_id = o.customer_id
JOIN `user` AS u ON u.user_id = cu.user_id
LEFT JOIN city AS c ON c.city_id = cu.city_id
JOIN route AS r ON r.route_id = o.route_id
JOIN store AS s ON s.store_id = r.store_id
LEFT JOIN order_item AS oi ON oi.order_id = o.order_id
GROUP BY
  o.order_id, u.name, c.name, r.name, s.name, o.status,
  o.requested_delivery_date, o.total_value;

-- Advanced SQL: window functions rank orders without collapsing report rows.
CREATE OR REPLACE VIEW v_order_value_rankings AS
SELECT
  summary.*,
  RANK() OVER (
    PARTITION BY summary.route_name
    ORDER BY summary.total_value DESC
  ) AS route_value_rank,
  SUM(summary.total_value) OVER (
    PARTITION BY summary.route_name
  ) AS route_total_value
FROM v_order_delivery_summary AS summary;

DELIMITER //

-- Advanced SQL: a reusable transactional unit for inventory restocking.
CREATE FUNCTION fn_order_item_value(
  p_product_id INT,
  p_quantity INT
)
RETURNS DECIMAL(14, 2)
DETERMINISTIC
READS SQL DATA
SQL SECURITY INVOKER
BEGIN
  DECLARE v_unit_price DECIMAL(8, 2);

  SELECT unit_price
    INTO v_unit_price
  FROM product
  WHERE product_id = p_product_id;

  RETURN COALESCE(v_unit_price, 0) * p_quantity;
END//

CREATE PROCEDURE sp_restock_product(
  IN p_product_id INT,
  IN p_quantity_added INT,
  IN p_user_id INT
)
SQL SECURITY INVOKER
BEGIN
  DECLARE v_product_exists INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_quantity_added IS NULL OR p_quantity_added <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Restock quantity must be a positive integer';
  END IF;

  SELECT COUNT(*)
    INTO v_product_exists
  FROM product
  WHERE product_id = p_product_id;

  IF v_product_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product does not exist';
  END IF;

  START TRANSACTION;

  INSERT INTO main_inventory (product_id, quantity_in_stock)
  VALUES (p_product_id, p_quantity_added)
  ON DUPLICATE KEY UPDATE
    quantity_in_stock = quantity_in_stock + p_quantity_added;

  INSERT INTO audit_log
    (user_id, action, table_affected, record_id, details)
  VALUES
    (p_user_id, 'Restocked product', 'main_inventory', p_product_id,
     CONCAT('quantity_added ', p_quantity_added));
  COMMIT;
END//

-- Advanced SQL: triggers enforce rules for writes from any client, not only the API.
CREATE TRIGGER trg_order_item_validate_insert
BEFORE INSERT ON order_item
FOR EACH ROW
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Order item quantity must be positive';
  END IF;
END//

CREATE TRIGGER trg_inventory_validate_update
BEFORE UPDATE ON main_inventory
FOR EACH ROW
BEGIN
  IF NEW.quantity_in_stock < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Inventory quantity cannot be negative';
  END IF;
END//

DELIMITER ;
