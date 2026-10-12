USE kandypack;

DELIMITER //

-- REQ-ORD-02  Days between order date and requested delivery date
DROP FUNCTION IF EXISTS fn_days_until_delivery //
CREATE FUNCTION fn_days_until_delivery (p_from DATE, p_requested DATE)
RETURNS INT
DETERMINISTIC
BEGIN
  RETURN DATEDIFF(p_requested, p_from);
END //


-- REQ-ORD-04  Order totals computed from items x product
DROP FUNCTION IF EXISTS fn_order_total_value //
CREATE FUNCTION fn_order_total_value (p_order_id INT)
RETURNS DECIMAL(11,2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(11,2);
  SELECT COALESCE(SUM(oi.quantity * p.unit_price), 0)
    INTO v_total
    FROM order_item oi
    JOIN product p ON p.product_id = oi.product_id
   WHERE oi.order_id = p_order_id;
  RETURN v_total;
END //

DROP FUNCTION IF EXISTS fn_order_total_volume //
CREATE FUNCTION fn_order_total_volume (p_order_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(10,2);
  SELECT COALESCE(SUM(oi.quantity * p.space_consumption_rate), 0)
    INTO v_total
    FROM order_item oi
    JOIN product p ON p.product_id = oi.product_id
   WHERE oi.order_id = p_order_id;
  RETURN v_total;
END //

DROP PROCEDURE IF EXISTS sp_recalc_order_totals //
CREATE PROCEDURE sp_recalc_order_totals (IN p_order_id INT)
BEGIN
  UPDATE `order`
     SET total_value  = fn_order_total_value(p_order_id),
         total_volume = fn_order_total_volume(p_order_id)
   WHERE order_id = p_order_id;
END //


-- REQ-ORD-02  7-day lead time enforced by the database
DROP TRIGGER IF EXISTS trg_order_before_insert //
CREATE TRIGGER trg_order_before_insert
BEFORE INSERT ON `order`
FOR EACH ROW
BEGIN
  IF fn_days_until_delivery(NEW.order_date, NEW.requested_delivery_date) < 7 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Delivery date must be at least 7 days after the order date.';
  END IF;
END //


-- REQ-ORD-07  Auto-close 'Delivered' orders after 48 h without
-- customer confirmation, and log that it was system-closed.
-- Whoever sets status = 'Delivered' MUST also set delivered_at = NOW().
-- One transaction: every eligible order is closed AND logged, or nothing changes.
-- Requires:  SET GLOBAL event_scheduler = ON;
DROP PROCEDURE IF EXISTS sp_auto_close_delivered_orders //
CREATE PROCEDURE sp_auto_close_delivered_orders ()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Log first, while status is still 'Delivered'
  INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
  SELECT NULL, 'Order auto-closed (system)', 'order', o.order_id,
         'No customer confirmation within 48 hours of Delivered'
    FROM `order` o
   WHERE o.status = 'Delivered'
     AND o.delivered_at IS NOT NULL
     AND o.delivered_at <= NOW() - INTERVAL 48 HOUR;

  UPDATE `order`
     SET status = 'Closed'
   WHERE status = 'Delivered'
     AND delivered_at IS NOT NULL
     AND delivered_at <= NOW() - INTERVAL 48 HOUR;

  COMMIT;
END //

DROP EVENT IF EXISTS ev_auto_close_delivered_orders //
CREATE EVENT ev_auto_close_delivered_orders
ON SCHEDULE EVERY 1 HOUR
DO CALL sp_auto_close_delivered_orders() //


-- REQ-ORD-05  View: a customer's orders with route and stop names
-- Used by GET /api/orders/customer/:customerId (orders.js).
-- The route filters it with WHERE customer_id = ?. Read-only: orders are still
-- created, edited and cancelled on the real `order` table.

CREATE OR REPLACE VIEW v_customer_orders AS
SELECT o.order_id, o.customer_id, o.route_id, o.route_stop_id,
       o.delivery_address, o.order_date, o.requested_delivery_date,
       o.status, o.total_value, o.total_volume, o.delivered_at,
       r.name AS route_name, rs.stop_name
  FROM `order` o
  LEFT JOIN route r ON o.route_id = r.route_id
  LEFT JOIN route_stop rs ON o.route_stop_id = rs.route_stop_id //

DELIMITER ;