const express = require('express');
const db = require('../db');

const router = express.Router();

// Maps errors to HTTP responses: trigger (SIGNAL) errors -> 400, everything else -> 500.
// Avoids leaking raw SQL error text to the client.
function sendError(res, err) {
    if (err.sqlState === '45000') {
        return res.status(400).json({ error: err.sqlMessage });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: 'Invalid reference: product, customer or stop does not exist.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
}

// REQ-ORD-02 — the 7-day rule is defined once, in MySQL (fn_days_until_delivery)
async function leadTimeDays(connection, deliveryDate) {
    const [[row]] = await connection.query(
        'SELECT fn_days_until_delivery(CURDATE(), ?) AS days', [deliveryDate]
    );
    return row.days;
}

// Place a new order
router.post('/', async (req, res) => {
    const connection = await db.getConnection();
    try {
    await connection.beginTransaction();

    // routeStopId is chosen by the customer from a dropdown of stops (see B4's
    // GET /api/routes/stops endpoint below) — the schema requires a specific route AND
    // stop up front, so there's no automatic address-matching step here (the SRS notes
    // route geometry/address-matching is out of scope for V1.0 — see Part 4).
    const { customerId, routeStopId, deliveryAddress, deliveryDate, items } = req.body;

    // Input validation — REQ-ORD-01. Rejects empty orders and zero/negative quantities
    // (a negative quantity would otherwise ADD stock to main_inventory).
    if (!customerId || !routeStopId || !deliveryAddress || !deliveryDate || !Array.isArray(items) || items.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'customerId, routeStopId, deliveryAddress, deliveryDate and at least one item are required.' });
    }
    // Merge duplicate products and sort by productId, so every transaction locks stock
    // rows in the same order (prevents deadlocks) and duplicates can't bypass the stock check.
    const merged = new Map();
    for (const item of items) {
        const pid = Number(item.productId);
        const qty = Number(item.quantity);
        if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(qty) || qty <= 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Each item needs a valid productId and a positive whole-number quantity.' });
        }
        merged.set(pid, (merged.get(pid) || 0) + qty);
    }
    const lines = [...merged.entries()].sort((a, b) => a[0] - b[0]);

    // Check 7-day lead time — REQ-ORD-02 (rule lives in MySQL: fn_days_until_delivery)
    const days = await leadTimeDays(connection, deliveryDate);
    if (days === null || days < 7) {
        await connection.rollback();
        return res.status(400).json({ error: 'Delivery date must be at least 7 days from today.' });
    }

    const [customerRows] = await connection.query('SELECT user_id FROM customer WHERE user_id = ?', [customerId]);
    if (customerRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Customer not found' });
    }

    // Look up the route via the chosen stop — route_id and route_stop_id are both
    // NOT NULL on `order`, so a valid stop selection is required to place an order at
    // all (see the note on this in B1 — this order can't be saved as "Unroutable").
    const [stopRows] = await connection.query('SELECT route_id FROM route_stop WHERE route_stop_id = ?', [routeStopId]);
    if (stopRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Please select a valid delivery stop.' });
    }
    const routeId = stopRows[0].route_id;

    // HQ stock is checked and reserved atomically inside the item loop below
    // (team-added inventory feature — see Part 4).

    // Create the order — REQ-ORD-01 (totals start at 0; filled by sp_recalc_order_totals below)
    const [orderResult] = await connection.query(
        `INSERT INTO \`order\` (customer_id, route_id, route_stop_id, delivery_address, order_date, requested_delivery_date, total_value, total_volume, status)
        VALUES (?, ?, ?, ?, CURDATE(), ?, 0, 0, 'Placed')`,
        [customerId, routeId, routeStopId, deliveryAddress, deliveryDate]
    );
    const orderId = orderResult.insertId;

    // Insert items and reserve stock. The guarded UPDATE (quantity_in_stock >= ?) checks AND
    // decrements in ONE atomic statement, so concurrent orders can never oversell stock.
    for (const [productId, quantity] of lines) {
        await connection.query(
        'INSERT INTO order_item (order_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
        [orderId, productId, quantity, 'Pending']
        );
        const [stockUpdate] = await connection.query(
        'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ? AND quantity_in_stock >= ?',
        [quantity, productId, quantity]
        );
        if (stockUpdate.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ error: `Insufficient stock for product ${productId}` });
        }
    }

    // REQ-ORD-04 — totals computed by MySQL (fn_order_total_value / fn_order_total_volume),
    // inside the same transaction as the order, items and stock change.
    await connection.query('CALL sp_recalc_order_totals(?)', [orderId]);

    await connection.commit();
    res.status(201).json({ message: 'Order placed', orderId });
    } catch (err) {
    await connection.rollback();
    sendError(res, err);
    } finally {
    connection.release();
    }
});

// Get order history for a customer — REQ-ORD-05
router.get('/customer/:customerId', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM `order` WHERE customer_id = ?', [req.params.customerId]);
        res.json(rows);
    } catch (err) {
        sendError(res, err);
    }
});

// Cancel an order — only while status is 'Placed' — REQ-ORD-06
// Must return reserved stock to main_inventory, otherwise stock leaks every time an order is cancelled.
router.delete('/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
    await connection.beginTransaction();
    const [orderRows] = await connection.query('SELECT status FROM `order` WHERE order_id = ? FOR UPDATE', [req.params.id]);
    if (orderRows.length === 0 || orderRows[0].status !== 'Placed') {
        await connection.rollback();
        return res.status(400).json({ error: 'Order can only be cancelled while status is Placed.' });
    }

    const [items] = await connection.query('SELECT product_id, quantity FROM order_item WHERE order_id = ? ORDER BY product_id', [req.params.id]);
    for (const item of items) {
        await connection.query(
        'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
        );
    }

    await connection.query("UPDATE `order` SET status = 'Cancelled' WHERE order_id = ?", [req.params.id]);

    // REQ-ORD-06 — cancellation is audit-logged inside the same transaction
    await connection.query(
    "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (NULL, 'Order cancelled', 'order', ?, 'Status Placed -> Cancelled, stock restored')",
    [req.params.id]
    );
    await connection.commit();
    res.json({ message: 'Order cancelled and stock restored' });
    } catch (err) {
    await connection.rollback();
    sendError(res, err);
    } finally {
    connection.release();
    }
});

// Edit an order — allowed only while status is 'Placed'
router.put('/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orderRows] = await connection.query(
            'SELECT status FROM `order` WHERE order_id = ? FOR UPDATE',
            [req.params.id]
        );

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (orderRows[0].status !== 'Placed') {
            await connection.rollback();
            return res.status(400).json({ error: 'Order can only be edited while status is Placed.' });
        }

        const { deliveryAddress, deliveryDate } = req.body;

        if (!deliveryAddress || !deliveryDate) {
            await connection.rollback();
            return res.status(400).json({ error: 'deliveryAddress and deliveryDate are required.' });
        }

        // REQ-ORD-02 — an edit must also respect the 7-day lead time
        const days = await leadTimeDays(connection, deliveryDate);
        if (days === null || days < 7) {
            await connection.rollback();
            return res.status(400).json({ error: 'Delivery date must be at least 7 days from today.' });
        }

        await connection.query(
            'UPDATE `order` SET delivery_address = ?, requested_delivery_date = ? WHERE order_id = ?',
            [deliveryAddress, deliveryDate, req.params.id]
        );

        // REQ-ORD-06 — modification is audit-logged inside the same transaction
        await connection.query(
            "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (NULL, 'Order modified', 'order', ?, ?)",
            [req.params.id, `new address=[${deliveryAddress}], new delivery date=${deliveryDate}`]
        );

        await connection.commit();
        res.json({ message: 'Order updated successfully' });
    } catch (err) {
        await connection.rollback();
        sendError(res, err);
    } finally {
        connection.release();
    }
});

// Customer confirms receipt: Delivered -> Closed — REQ-ORD-07
// ('Delivered' is set by the driver flow; the 48 h auto-close is the MySQL event ev_auto_close_delivered_orders)
router.put('/:id/confirm-receipt', async (req, res) => {
    try {
        const [result] = await db.query(
            "UPDATE `order` SET status = 'Closed' WHERE order_id = ? AND status = 'Delivered'",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: 'Order not found or not awaiting confirmation (status must be Delivered).' });
        }

        res.json({ message: 'Order receipt confirmed' });
    } catch (err) {
        sendError(res, err);
    }
});

module.exports = router;