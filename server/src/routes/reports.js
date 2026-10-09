const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Helper to convert DB rows to CSV format
function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csvRows = rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
  return [headers.join(','), ...csvRows].join('\n');
}

function sendFormatted(res, rows, format) {
  if (format === 'csv') {
    res.header('Content-Type', 'text/csv');
    res.attachment('report.csv');
    return res.send(toCsv(rows));
  }
  return res.json(rows);
}

// 1. REQ-RPT-01: Quarterly Sales Report
router.get('/sales', requireAuth, async (req, res) => {
  const { startDate, endDate, format } = req.query;
  const [rows] = await db.query(
    `SELECT 
       DATE_FORMAT(order_date, '%Y-%m') AS period,
       COUNT(*) AS total_orders,
       COALESCE(SUM(total_value), 0) AS total_revenue,
       COALESCE(SUM(total_volume), 0) AS total_volume
     FROM \`order\`
     WHERE order_date BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period ASC`,
    [startDate || '2026-01-01', endDate || '2026-12-31']
  );
  sendFormatted(res, rows, format);
});

// 2. REQ-RPT-02: Top Selling Products
router.get('/top-products', requireAuth, async (req, res) => {
  const { limit = 10, format } = req.query;
  const [rows] = await db.query(
    `SELECT 
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
     ORDER BY total_quantity_sold DESC
     LIMIT ?`,
    [parseInt(limit)]
  );
  sendFormatted(res, rows, format);
});

// 3. REQ-RPT-03: City/Store Breakdown
router.get('/city-breakdown', requireAuth, async (req, res) => {
  const { format } = req.query;
  const [rows] = await db.query(
    `SELECT 
       c.city_id,
       c.name AS city_name,
       COUNT(DISTINCT o.order_id) AS total_orders,
       COALESCE(SUM(o.total_value), 0) AS total_sales_value,
       COALESCE(SUM(o.total_volume), 0) AS total_volume
     FROM city c
     LEFT JOIN store s ON c.city_id = s.city_id
     LEFT JOIN route r ON s.store_id = r.store_id
     LEFT JOIN \`order\` o ON r.route_id = o.route_id
     GROUP BY c.city_id, c.name
     ORDER BY total_sales_value DESC`
  );
  sendFormatted(res, rows, format);
});

// 4. REQ-RPT-04: Staff Working Hours & Threshold Monitoring
router.get('/staff-hours', requireAuth, async (req, res) => {
  const { weekStart, format } = req.query;
  const [rows] = await db.query(
    `SELECT 
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
     WHERE (? IS NULL OR DATE_FORMAT(DATE_ADD(ts.scheduled_date, INTERVAL -WEEKDAY(ts.scheduled_date) DAY), '%Y-%m-%d') = ?)
     GROUP BY e.user_id, u.name, d.user_id, a.user_id, role_type, week_start_date
     ORDER BY week_start_date DESC, total_hours DESC`,
    [weekStart || null, weekStart || null]
  );
  sendFormatted(res, rows, format);
});

// 5. REQ-RPT-05: Truck Utilization Report
router.get('/truck-utilization', requireAuth, async (req, res) => {
  const { format } = req.query;
  const [rows] = await db.query(
    `SELECT 
       t.truck_id,
       t.plate_number,
       t.capacity,
       COUNT(DISTINCT ts.truck_schedule_id) AS total_trips_assigned,
       COUNT(ta.truck_allocation_id) AS total_stops_serviced
     FROM truck t
     LEFT JOIN truck_schedule ts ON t.truck_id = ts.truck_id
     LEFT JOIN truck_allocation ta ON ts.truck_schedule_id = ta.truck_schedule_id
     GROUP BY t.truck_id, t.plate_number, t.capacity
     ORDER BY total_trips_assigned DESC`
  );
  sendFormatted(res, rows, format);
});

// 6. REQ-RPT-06: Customer Order Lifecycle Report
router.get('/customer/:customerId', requireAuth, async (req, res) => {
  const { format } = req.query;
  const [rows] = await db.query(
    `SELECT 
       o.order_id,
       o.order_date,
       o.requested_delivery_date,
       o.status AS order_status,
       oi.order_item_id,
       p.name AS product_name,
       oi.quantity,
       oi.status AS item_status
     FROM \`order\` o
     JOIN order_item oi ON o.order_id = oi.order_id
     JOIN product p ON oi.product_id = p.product_id
     WHERE o.customer_id = ?
     ORDER BY o.order_date DESC, oi.order_item_id ASC`,
    [req.params.customerId]
  );
  sendFormatted(res, rows, format);
});

module.exports = router;