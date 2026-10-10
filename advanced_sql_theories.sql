-- =========================================================================
-- CS3043: Database Systems
-- Advanced SQL Implementation for Member 5 (Reporting & Notifications)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. DATABASE VIEWS
-- -------------------------------------------------------------------------

-- View 1: Top Selling Products
-- Pre-aggregates total quantity sold and total revenue per product,
-- avoiding complex JOINS in the application code.
DROP VIEW IF EXISTS vw_top_selling_products;
CREATE VIEW vw_top_selling_products AS
SELECT 
  p.product_id,
  p.name,
  p.unit_price,
  COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
  COALESCE(SUM(oi.quantity * p.unit_price), 0) AS total_sales_value
FROM product p
JOIN order_item oi ON p.product_id = oi.product_id
JOIN \`order\` o ON oi.order_id = o.order_id
WHERE o.status != 'Cancelled'
GROUP BY p.product_id, p.name, p.unit_price;

-- View 2: Truck Utilization Summary
-- Calculates total trips assigned and stops serviced for each truck.
DROP VIEW IF EXISTS vw_truck_utilization;
CREATE VIEW vw_truck_utilization AS
SELECT 
  t.truck_id,
  t.plate_number,
  t.capacity,
  COUNT(DISTINCT ts.truck_schedule_id) AS total_trips_assigned,
  COUNT(ta.truck_allocation_id) AS total_stops_serviced
FROM truck t
LEFT JOIN truck_schedule ts ON t.truck_id = ts.truck_id
LEFT JOIN truck_allocation ta ON ts.truck_schedule_id = ta.truck_schedule_id
GROUP BY t.truck_id, t.plate_number, t.capacity;

-- View 3: Complete System Summary (Administrator Dashboard)
-- Master System Log utilizing multi-table LEFT JOINs to aggregate allocation details
DROP VIEW IF EXISTS vw_complete_system_summary;
CREATE VIEW vw_complete_system_summary AS
SELECT 
  ta.truck_allocation_id,
  o.order_id,
  uc.name AS customer_name,
  ta.delivery_status AS status,
  ta.delivered_at,
  t.plate_number AS truck_plate,
  ud.name AS driver_name,
  ua.name AS assistant_name
FROM truck_allocation ta
JOIN \`order\` o ON ta.order_id = o.order_id
JOIN \`user\` uc ON o.customer_id = uc.user_id
JOIN truck_schedule ts ON ta.truck_schedule_id = ts.truck_schedule_id
JOIN truck t ON ts.truck_id = t.truck_id
LEFT JOIN employee ed ON ts.driver_id = ed.user_id
LEFT JOIN \`user\` ud ON ed.user_id = ud.user_id
LEFT JOIN employee ea ON ts.assistant_id = ea.user_id
LEFT JOIN \`user\` ua ON ea.user_id = ua.user_id;


-- -------------------------------------------------------------------------
-- 2. STORED PROCEDURES
-- -------------------------------------------------------------------------

-- Procedure 1: Dynamic Sales Report
-- Generates a monthly sales breakdown filtered by a date range.
DELIMITER //
DROP PROCEDURE IF EXISTS sp_generate_sales_report //
CREATE PROCEDURE sp_generate_sales_report(IN p_start_date DATE, IN p_end_date DATE)
BEGIN
  SELECT 
    DATE_FORMAT(order_date, '%Y-%m') AS period,
    COUNT(*) AS total_orders,
    COALESCE(SUM(total_value), 0) AS total_revenue,
    COALESCE(SUM(total_volume), 0) AS total_volume
  FROM \`order\`
  WHERE order_date BETWEEN p_start_date AND p_end_date
  GROUP BY period
  ORDER BY period ASC;
END //
DELIMITER ;

-- Procedure 2: Administrator Delivery Summary
-- Replaces the Notification CRON job. Fetches the N most recent deliveries.
DELIMITER //
DROP PROCEDURE IF EXISTS sp_get_recent_deliveries_summary //
CREATE PROCEDURE sp_get_recent_deliveries_summary(IN p_limit INT)
BEGIN
  SET @query = CONCAT(
    'SELECT ta.truck_allocation_id, o.order_id, u.name AS customer_name, c.phone, ',
    'ta.delivery_status, ta.delivered_at, ta.delivery_note ',
    'FROM truck_allocation ta ',
    'JOIN \`order\` o ON ta.order_id = o.order_id ',
    'JOIN \`user\` u ON o.customer_id = u.user_id ',
    'JOIN \`customer\` c ON u.user_id = c.user_id ',
    'ORDER BY ta.delivered_at DESC LIMIT ', p_limit
  );
  PREPARE stmt FROM @query;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;


-- -------------------------------------------------------------------------
-- 3. TRIGGERS
-- -------------------------------------------------------------------------

-- Trigger: Notification Audit Log
-- Automatically logs when a user reads a notification, demonstrating
-- event-driven backend logic within the database.
DELIMITER //
DROP TRIGGER IF EXISTS trg_audit_notification_read //
CREATE TRIGGER trg_audit_notification_read
AFTER UPDATE ON notification
FOR EACH ROW
BEGIN
  IF NEW.is_read = 1 AND OLD.is_read = 0 THEN
    INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
    VALUES (
      NEW.user_id, 
      'Read notification', 
      'notification', 
      NEW.notification_id, 
      CONCAT('Marked notification as read: ', NEW.type)
    );
  END IF;
END //
DELIMITER ;
