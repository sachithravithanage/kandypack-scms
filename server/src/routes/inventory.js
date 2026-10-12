const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

// Admin restocks a product with batch tracking and notes
router.put(
  "/:productId/restock",
  requireAuth,
  requireRole([1]),
  async (req, res) => {
    try {
      const productId = Number(req.params.productId);
      const { quantityAdded, batchNumber, notes } = req.body;
      if (!Number.isInteger(productId) || productId <= 0) {
        return res
          .status(400)
          .json({ error: "Product ID must be a positive integer." });
      }
      if (!Number.isInteger(Number(quantityAdded)) || Number(quantityAdded) <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity added must be a positive integer." });
      }

      const qty = Number(quantityAdded);

      const [products] = await db.query(
        "SELECT product_id, name FROM product WHERE product_id = ?",
        [productId],
      );
      if (products.length === 0) {
        return res.status(404).json({ error: "Product not found." });
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          `INSERT INTO main_inventory (product_id, quantity_in_stock) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE quantity_in_stock = quantity_in_stock + ?`,
          [productId, qty, qty],
        );

        const auditDetail = `Added ${qty} units${batchNumber ? ` | Batch: ${batchNumber.trim()}` : ""}${notes ? ` | Notes: ${notes.trim()}` : ""}`;

        await connection.query(
          "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
          [
            req.user.userId,
            "Restocked product",
            "main_inventory",
            productId,
            auditDetail,
          ],
        );
        await connection.commit();
        res.json({ message: `Successfully added ${qty} units to stock.` });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// View current stock levels with Available-to-Promise (ATP) breakdown
router.get("/", requireAuth, requireRole([1, 2, 3]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        mi.product_id,
        p.name,
        p.unit_price,
        p.space_consumption_rate,
        mi.quantity_in_stock,
        mi.quantity_in_stock AS physical_stock,
        COALESCE(SUM(CASE WHEN o.status IN ('Placed', 'Scheduled') THEN oi.quantity ELSE 0 END), 0) AS reserved_stock,
        (mi.quantity_in_stock - COALESCE(SUM(CASE WHEN o.status IN ('Placed', 'Scheduled') THEN oi.quantity ELSE 0 END), 0)) AS available_stock
      FROM main_inventory mi
      JOIN product p ON mi.product_id = p.product_id
      LEFT JOIN order_item oi ON oi.product_id = p.product_id
      LEFT JOIN \`order\` o ON oi.order_id = o.order_id
      GROUP BY mi.product_id, p.name, p.unit_price, p.space_consumption_rate, mi.quantity_in_stock
      ORDER BY mi.product_id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Inventory error:", err);
    res.status(500).json({ error: "Could not load inventory." });
  }
});

// View restock history from audit_log
router.get("/history", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT al.log_id, al.user_id, u.name AS user_name, al.record_id AS product_id,
             p.name AS product_name, al.action, al.details, al.timestamp
      FROM audit_log al
      LEFT JOIN \`user\` u ON al.user_id = u.user_id
      LEFT JOIN product p ON al.record_id = p.product_id
      WHERE al.table_affected = 'main_inventory'
      ORDER BY al.timestamp DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Could not load restock history." });
  }
});

module.exports = router;
