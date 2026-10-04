const express = require('express');
const db = require('../db');

const router = express.Router();

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

    // Check 7-day lead time — REQ-ORD-02
    const today = new Date();
    const requested = new Date(deliveryDate);
    const diffDays = (requested - today) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
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

    // Check and reserve HQ stock for each item — team-added inventory feature (see Part 4)
    let totalValue = 0;
    let totalVolume = 0;
    for (const item of items) {
        const [stockRows] = await connection.query(
        'SELECT quantity_in_stock FROM main_inventory WHERE product_id = ? FOR UPDATE',
        [item.productId]
        );
        if (stockRows.length === 0 || stockRows[0].quantity_in_stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
        }

        const [productRows] = await connection.query('SELECT * FROM product WHERE product_id = ?', [item.productId]);
        const product = productRows[0];
        totalValue += product.unit_price * item.quantity;
        totalVolume += product.space_consumption_rate * item.quantity;
    }

    // Create the order — REQ-ORD-01, REQ-ORD-04
    const [orderResult] = await connection.query(
        `INSERT INTO \`order\` (customer_id, route_id, route_stop_id, delivery_address, order_date, requested_delivery_date, total_value, total_volume, status)
        VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, 'Placed')`,
        [customerId, routeId, routeStopId, deliveryAddress, deliveryDate, totalValue, totalVolume]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
        await connection.query(
        'INSERT INTO order_item (order_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.quantity, 'Pending']
        );
        await connection.query(
        'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?',
        [item.quantity, item.productId]
        );
    }

    await connection.commit();
    res.status(201).json({ message: 'Order placed', orderId });
    } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
    } finally {
    connection.release();
    }
});

// Get order history for a customer — REQ-ORD-05
router.get('/customer/:customerId', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM `order` WHERE customer_id = ?', [req.params.customerId]);
    res.json(rows);
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

    const [items] = await connection.query('SELECT product_id, quantity FROM order_item WHERE order_id = ?', [req.params.id]);
    for (const item of items) {
        await connection.query(
        'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
        );
    }

    await connection.query("UPDATE `order` SET status = 'Cancelled' WHERE order_id = ?", [req.params.id]);
    await connection.commit();
    res.json({ message: 'Order cancelled and stock restored' });
    } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
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

        await connection.query(
            'UPDATE `order` SET delivery_address = ?, requested_delivery_date = ? WHERE order_id = ?',
            [deliveryAddress, deliveryDate, req.params.id]
        );

        await connection.commit();
        res.json({ message: 'Order updated successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Confirm receipt of an order — REQ-ORD-07
router.put('/:id/confirm-receipt', async (req, res) => {
    try {
        const [result] = await db.query(
            "UPDATE `order` SET status = 'Delivered' WHERE order_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        res.json({ message: 'Order receipt confirmed' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;