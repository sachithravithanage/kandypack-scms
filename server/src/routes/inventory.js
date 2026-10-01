const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

// Admin restocks a product (e.g. after a manufacturing run)
router.put(
  "/:productId/restock",
  requireAuth,
  requireRole([1]),
  async (req, res) => {
    const { quantityAdded } = req.body;
    await db.query(
      `INSERT INTO main_inventory (product_id, quantity_in_stock) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE quantity_in_stock = quantity_in_stock + ?`,
      [req.params.productId, quantityAdded, quantityAdded],
    );
    res.json({ message: "Stock updated" });
  },
);

// View current stock levels (used by Admin dashboard and by Member B's order-placement check)
router.get("/", async (req, res) => {
  const [rows] = await db.query(
    `SELECT mi.product_id, p.name, mi.quantity_in_stock
     FROM main_inventory mi JOIN product p ON mi.product_id = p.product_id`,
  );
  res.json(rows);
});

module.exports = router;
