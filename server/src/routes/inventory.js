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
    try {
      const productId = Number(req.params.productId);
      const { quantityAdded } = req.body;
      if (!Number.isInteger(productId) || productId <= 0) {
        return res
          .status(400)
          .json({ error: "Product ID must be a positive integer." });
      }
      if (!Number.isInteger(quantityAdded) || quantityAdded <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity added must be a positive integer." });
      }

      const [products] = await db.query(
        "SELECT product_id FROM product WHERE product_id = ?",
        [productId],
      );
      if (products.length === 0) {
        return res.status(404).json({ error: "Product not found." });
      }

      await db.query(
        `INSERT INTO main_inventory (product_id, quantity_in_stock) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE quantity_in_stock = quantity_in_stock + ?`,
        [productId, quantityAdded, quantityAdded],
      );
      res.json({ message: "Stock updated" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
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
