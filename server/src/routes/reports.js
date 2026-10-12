'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
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

// 1. REQ-RPT-01: Quarterly Sales Report (Admins & Dispatchers)
router.get('/sales', requireAuth, requireRole([1, 2]), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Error generating sales report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate sales report.' });
  }
});

// 2. REQ-RPT-02: Top Selling Products (Admins, Dispatchers, Store Managers)
router.get('/top-products', requireAuth, requireRole([1, 2, 3]), async (req, res) => {
  try {
    const { limit = 10, format } = req.query;
    const [rows] = await db.query(
      `SELECT * FROM vw_top_selling_products ORDER BY total_quantity_sold DESC LIMIT ?`,
      [parseInt(limit, 10)]
    );
    sendFormatted(res, rows, format);
  } catch (err) {
    console.error('Error generating top products report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate top products report.' });
  }
});

// 3. REQ-RPT-03: City/Store Breakdown (Admins, Dispatchers, Store Managers)
router.get('/city-breakdown', requireAuth, requireRole([1, 2, 3]), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Error generating city breakdown report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate city breakdown report.' });
  }
});

// 4. REQ-RPT-04: Staff Working Hours & Threshold Monitoring (Admins & Dispatchers)
router.get('/staff-hours', requireAuth, requireRole([1, 2]), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Error generating staff hours report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate staff hours report.' });
  }
});

// 5. REQ-RPT-05: Truck Utilization Report (Admins & Dispatchers)
router.get('/truck-utilization', requireAuth, requireRole([1, 2]), async (req, res) => {
  try {
    const { format } = req.query;
    const [rows] = await db.query(
      `SELECT * FROM vw_truck_utilization ORDER BY total_trips_assigned DESC`
    );
    sendFormatted(res, rows, format);
  } catch (err) {
    console.error('Error generating truck utilization report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate truck utilization report.' });
  }
});

// 6. REQ-RPT-06: Customer Order Lifecycle Report
router.get('/customer/:customerId', requireAuth, async (req, res) => {
  try {
    const currentRoleId = req.user.roleId || req.user.role_id;
    const currentUserId = req.user.userId || req.user.user_id;
    if (currentRoleId === 6 && Number(currentUserId) !== Number(req.params.customerId)) {
      return res.status(403).json({ error: 'You are only authorized to view your own order history.' });
    }

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
  } catch (err) {
    console.error('Error generating customer order history:', err);
    res.status(500).json({ error: err.message || 'Failed to generate customer report.' });
  }
});

// 7. Recent Deliveries Summary (Admins, Dispatchers, Store Managers)
router.get('/recent-deliveries', requireAuth, requireRole([1, 2, 3]), async (req, res) => {
  try {
    const { limit = 10, format } = req.query;
    const [rows] = await db.query(
      `SELECT 
         ta.truck_allocation_id,
         o.order_id,
         u.name AS customer_name,
         c.phone,
         ta.delivery_status,
         ta.delivered_at,
         ta.delivery_note
       FROM truck_allocation ta
       JOIN \`order\` o ON ta.order_id = o.order_id
       JOIN \`user\` u ON o.customer_id = u.user_id
       JOIN \`customer\` c ON u.user_id = c.user_id
       WHERE ta.delivery_status IN ('Delivered', 'Failed', 'Attempted')
       ORDER BY ta.delivered_at DESC
       LIMIT ?`,
      [parseInt(limit, 10)]
    );
    sendFormatted(res, rows, format);
  } catch (err) {
    console.error('Error generating recent deliveries report:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve recent deliveries.' });
  }
});

// 8. Complete System Summary (Admin Only)
router.get('/system-summary', requireAuth, requireRole([1]), async (req, res) => {
  try {
    const { limit = 10, format } = req.query;
    const [rows] = await db.query(
      `SELECT * FROM vw_complete_system_summary ORDER BY truck_allocation_id DESC LIMIT ?`,
      [parseInt(limit, 10)]
    );
    sendFormatted(res, rows, format);
  } catch (err) {
    console.error('Error generating complete system summary:', err);
    res.status(500).json({ error: err.message || 'Failed to generate system summary.' });
  }
});

module.exports = router;