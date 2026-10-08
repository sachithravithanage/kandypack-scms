USE kandypack;

DELIMITER //

-- REQ-ORD-02  Days between order date and requested delivery date

CREATE FUNCTION fn_days_until_delivery (p_from DATE, p_requested DATE)
RETURNS INT
DETERMINISTIC
BEGIN
  RETURN DATEDIFF(p_requested, p_from);
END //


-- REQ-ORD-04  Order totals computed from items x product

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

CREATE PROCEDURE sp_recalc_order_totals (IN p_order_id INT)
BEGIN
  UPDATE `order`
     SET total_value  = fn_order_total_value(p_order_id),
         total_volume = fn_order_total_volume(p_order_id)
   WHERE order_id = p_order_id;
END //


-- REQ-ORD-02  7-day lead time enforced by the database

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

CREATE EVENT ev_auto_close_delivered_orders
ON SCHEDULE EVERY 1 HOUR
DO CALL sp_auto_close_delivered_orders() //

DELIMITER ;