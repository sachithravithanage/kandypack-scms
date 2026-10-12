const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 4000,
  user: process.env.DB_USER || '3RMV7RtvWn5FFds.root',
  password: process.env.DB_PASSWORD || 'CA1C4000fIE7agjV',
  database: process.env.DB_NAME || 'kandypack',
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
};

async function run() {
  try {
    const conn = await mysql.createConnection(poolConfig);
    
    // =========================================================================
    // 1. DATABASE VIEWS
    // =========================================================================
    console.log("Creating View: vw_top_selling_products...");
    await conn.query(`DROP VIEW IF EXISTS vw_top_selling_products`);
    await conn.query(`
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
      GROUP BY p.product_id, p.name, p.unit_price
    `);

    console.log("Creating View: vw_truck_utilization...");
    await conn.query(`DROP VIEW IF EXISTS vw_truck_utilization`);
    await conn.query(`
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
      GROUP BY t.truck_id, t.plate_number, t.capacity
    `);

    // =========================================================================
    // 2. STORED PROCEDURES
    // =========================================================================
    console.log("Creating Stored Procedure: sp_generate_sales_report...");
    await conn.query(`DROP PROCEDURE IF EXISTS sp_generate_sales_report`);
    await conn.query(`
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
      END
    `);

    console.log("Creating Stored Procedure: sp_get_staff_hours...");
    await conn.query(`DROP PROCEDURE IF EXISTS sp_get_staff_hours`);
    await conn.query(`
      CREATE PROCEDURE sp_get_staff_hours(IN p_week_start DATE)
      BEGIN
        SELECT 
          e.user_id,
          u.name AS staff_name,
          CASE WHEN d.user_id IS NOT NULL THEN 'Driver' ELSE 'Assistant' END AS role_type,
          DATE_FORMAT(DATE_ADD(ts.scheduled_date, INTERVAL -WEEKDAY(ts.scheduled_date) DAY), '%Y-%m-%d') AS week_start_date,
          COALESCE(SUM(rl.actual_hours_worked), 0) AS total_hours,
          CASE 
            WHEN d.user_id IS NOT NULL AND COALESCE(SUM(rl.actual_hours_worked), 0) > 40 THEN 1
            WHEN a.user_id IS NOT NULL AND COALESCE(SUM(rl.actual_hours_worked), 0) > 60 THEN 1
            ELSE 0
          END AS limit_exceeded
        FROM employee e
        JOIN \`user\` u ON e.user_id = u.user_id
        LEFT JOIN driver d ON e.user_id = d.user_id
        LEFT JOIN assistant a ON e.user_id = a.user_id
        JOIN truck_schedule ts ON (ts.driver_id = e.user_id OR ts.assistant_id = e.user_id)
        JOIN roster_log rl ON rl.truck_schedule_id = ts.truck_schedule_id
        WHERE (p_week_start IS NULL OR DATE_FORMAT(DATE_ADD(ts.scheduled_date, INTERVAL -WEEKDAY(ts.scheduled_date) DAY), '%Y-%m-%d') = p_week_start)
        GROUP BY e.user_id, u.name, d.user_id, a.user_id, role_type, week_start_date
        ORDER BY week_start_date DESC, total_hours DESC;
      END
    `);

    console.log("Creating Stored Procedure: sp_get_recent_deliveries_summary...");
    await conn.query(`DROP PROCEDURE IF EXISTS sp_get_recent_deliveries_summary`);
    await conn.query(`
      CREATE PROCEDURE sp_get_recent_deliveries_summary(IN p_limit INT)
      BEGIN
        SET @query = CONCAT(
          'SELECT ta.truck_allocation_id, o.order_id, u.name AS customer_name, c.phone, ',
          'ta.delivery_status, ta.delivered_at, ta.failed_reason ',
          'FROM truck_allocation ta ',
          'JOIN \`order\` o ON ta.order_id = o.order_id ',
          'JOIN \`user\` u ON o.customer_id = u.user_id ',
          'JOIN \`customer\` c ON u.user_id = c.user_id ',
          'ORDER BY ta.delivered_at DESC LIMIT ', p_limit
        );
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
      END
    `);

    // =========================================================================
    // 3. DATABASE TRIGGERS
    // =========================================================================
    console.log("Creating Trigger: trg_audit_notification_read...");
    await conn.query(`DROP TRIGGER IF EXISTS trg_audit_notification_read`);
    await conn.query(`
      CREATE TRIGGER trg_audit_notification_read
      AFTER UPDATE ON notification
      FOR EACH ROW
      BEGIN
        IF NEW.is_read = 1 AND OLD.is_read = 0 THEN
          INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
          VALUES (NEW.user_id, 'Read notification', 'notification', NEW.notification_id, CONCAT('Marked notification as read: ', NEW.type));
        END IF;
      END
    `);

    console.log("Advanced SQL successfully applied to Kandypack DB!");
    process.exit(0);
  } catch (err) {
    console.error("Migration Error:", err);
    process.exit(1);
  }
}

run();
