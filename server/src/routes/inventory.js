const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

// ── View current stock levels with Available-to-Promise (ATP) breakdown ─────
router.get("/", requireAuth, requireRole([1, 2, 3]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        mi.product_id,
        p.name,
        p.unit_price,
        p.space_consumption_rate,
        mi.quantity_in_stock,
        mi.quantity_in_stock AS available_stock,
        COALESCE(SUM(CASE WHEN o.status IN ('Placed', 'Scheduled') THEN oi.quantity ELSE 0 END), 0) AS reserved_stock,
        (mi.quantity_in_stock + COALESCE(SUM(CASE WHEN o.status IN ('Placed', 'Scheduled') THEN oi.quantity ELSE 0 END), 0)) AS physical_stock,
        ((mi.quantity_in_stock + COALESCE(SUM(CASE WHEN o.status IN ('Placed', 'Scheduled') THEN oi.quantity ELSE 0 END), 0)) * p.unit_price) AS valuation
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

// ── View restock & adjustment history from audit_log ────────────────────────
router.get("/history", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT al.log_id, al.user_id, u.name AS user_name, al.record_id AS product_id,
             p.name AS product_name, al.action, al.details, al.timestamp
      FROM audit_log al
      LEFT JOIN \`user\` u ON al.user_id = u.user_id
      LEFT JOIN product p ON al.record_id = p.product_id
      WHERE al.table_affected IN ('main_inventory', 'product')
      ORDER BY al.timestamp DESC
      LIMIT 150
    `);
    res.json(rows);
  } catch (err) {
    console.error("Restock history error:", err);
    res.status(500).json({ error: "Could not load restock history." });
  }
});

// ── Create a new Product SKU & initialize inventory (Admin only) ─────────────
router.post("/products", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const { name, unitPrice, spaceConsumptionRate, initialStock } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required." });
    }

    const price = Number(unitPrice);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Unit price must be a positive number." });
    }

    const space = Number(spaceConsumptionRate);
    if (isNaN(space) || space <= 0) {
      return res.status(400).json({ error: "Space consumption rate must be a positive number." });
    }

    const initStock = initialStock !== undefined && initialStock !== "" ? Number(initialStock) : 0;
    if (!Number.isInteger(initStock) || initStock < 0) {
      return res.status(400).json({ error: "Initial stock must be a non-negative integer." });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Check if product name exists
      const [existing] = await connection.query(
        "SELECT product_id FROM product WHERE LOWER(name) = LOWER(?)",
        [name.trim()]
      );
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Product with name "${name.trim()}" already exists.` });
      }

      const [result] = await connection.query(
        "INSERT INTO product (name, unit_price, space_consumption_rate) VALUES (?, ?, ?)",
        [name.trim(), price, space]
      );
      const productId = result.insertId;

      await connection.query(
        "INSERT INTO main_inventory (product_id, quantity_in_stock) VALUES (?, ?)",
        [productId, initStock]
      );

      await connection.query(
        "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [
          req.user.user_id,
          "Created Product SKU",
          "product",
          productId,
          `Created SKU "${name.trim()}" (Price: ${price.toFixed(2)}, Space: ${space}m³, Initial Stock: ${initStock})`,
        ]
      );

      await connection.commit();
      res.status(201).json({
        message: `Product SKU "${name.trim()}" created successfully.`,
        productId,
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Create product error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ── Update Product SKU details (Admin only) ──────────────────────────────────
router.put("/products/:productId", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const { name, unitPrice, spaceConsumptionRate } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Invalid product ID." });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required." });
    }

    const price = Number(unitPrice);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Unit price must be a positive number." });
    }

    const space = Number(spaceConsumptionRate);
    if (isNaN(space) || space <= 0) {
      return res.status(400).json({ error: "Space consumption rate must be a positive number." });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        "SELECT product_id, name, unit_price, space_consumption_rate FROM product WHERE product_id = ?",
        [productId]
      );
      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Product not found." });
      }

      // Check for duplicate name under another product
      const [conflict] = await connection.query(
        "SELECT product_id FROM product WHERE LOWER(name) = LOWER(?) AND product_id != ?",
        [name.trim(), productId]
      );
      if (conflict.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Another product with name "${name.trim()}" already exists.` });
      }

      await connection.query(
        "UPDATE product SET name = ?, unit_price = ?, space_consumption_rate = ? WHERE product_id = ?",
        [name.trim(), price, space, productId]
      );

      await connection.query(
        "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [
          req.user.user_id,
          "Updated Product SKU",
          "product",
          productId,
          `Updated SKU #${productId}: "${name.trim()}" (Price: ${price.toFixed(2)}, Space: ${space}m³)`,
        ]
      );

      await connection.commit();
      res.json({ message: "Product SKU updated successfully." });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Update product error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ── Admin restocks a product with batch tracking and notes ───────────────────
router.put("/:productId/restock", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const { quantityAdded, batchNumber, notes } = req.body;
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Product ID must be a positive integer." });
    }
    if (!Number.isInteger(Number(quantityAdded)) || Number(quantityAdded) <= 0) {
      return res.status(400).json({ error: "Quantity added must be a positive integer." });
    }

    const qty = Number(quantityAdded);

    const [products] = await db.query(
      "SELECT product_id, name FROM product WHERE product_id = ?",
      [productId]
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
        [productId, qty, qty]
      );

      const auditDetail = `Added ${qty} units${batchNumber ? ` | Batch: ${batchNumber.trim()}` : ""}${notes ? ` | Notes: ${notes.trim()}` : ""}`;

      await connection.query(
        "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [
          req.user.user_id,
          "Restocked product",
          "main_inventory",
          productId,
          auditDetail,
        ]
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
    console.error("Restock error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ── Admin performs stock adjustment (write-off, damage, inventory discrepancy) ─
router.post("/:productId/adjust", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const { adjustmentType, quantity, direction, reason, batchNumber } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: "Product ID must be a positive integer." });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive integer." });
    }

    if (!["ADD", "REDUCE"].includes(direction)) {
      return res.status(400).json({ error: "Adjustment direction must be ADD or REDUCE." });
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ error: "A valid reason for stock adjustment is required." });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [stockRows] = await connection.query(
        "SELECT quantity_in_stock FROM main_inventory WHERE product_id = ? FOR UPDATE",
        [productId]
      );

      if (stockRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Product not found in main inventory." });
      }

      const currentStock = stockRows[0].quantity_in_stock;

      if (direction === "REDUCE" && currentStock < qty) {
        await connection.rollback();
        return res.status(400).json({
          error: `Cannot reduce stock by ${qty}. Current available stock is only ${currentStock}.`,
        });
      }

      const delta = direction === "ADD" ? qty : -qty;
      await connection.query(
        "UPDATE main_inventory SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?",
        [delta, productId]
      );

      const typeLabel = adjustmentType || (direction === "ADD" ? "Manual Restock" : "Damage / Write-Off");
      const auditDetail = `${direction === "ADD" ? "Increased" : "Decreased"} stock by ${qty} units (${typeLabel}) | Previous: ${currentStock}, New: ${currentStock + delta} | Reason: ${reason.trim()}${batchNumber ? ` | Batch: ${batchNumber.trim()}` : ""}`;

      await connection.query(
        "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [
          req.user.user_id,
          `Stock Adjustment (${typeLabel})`,
          "main_inventory",
          productId,
          auditDetail,
        ]
      );

      await connection.commit();
      res.json({
        message: `Stock successfully adjusted. New stock: ${currentStock + delta}.`,
        previousStock: currentStock,
        newStock: currentStock + delta,
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Adjustment error:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
