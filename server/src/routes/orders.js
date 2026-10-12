const express = require('express');
const db = require('../db');
const { createNotification } = require('./notifications');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Maps errors to HTTP responses: trigger (SIGNAL) errors -> 400, reference errors -> 400, others -> 500.
function sendError(res, err) {
    if (err.sqlState === '45000') {
        return res.status(400).json({ error: err.sqlMessage || err.message });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: 'Invalid reference: product, customer or stop does not exist.' });
    }
    console.error('Order route error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
}

// REQ-ORD-02 — 7-day rule calculated by the stored function fn_days_until_delivery
// (db/02b_orders_procedures.sql); JS date diff is only a fallback if the function is missing.
async function leadTimeDays(connection, deliveryDate) {
    try {
        const [[row]] = await connection.query(
            'SELECT fn_days_until_delivery(CURDATE(), ?) AS days', [deliveryDate]
        );
        if (row && row.days !== null && row.days !== undefined) {
            return Number(row.days);
        }
    } catch (e) {
        console.warn('fn_days_until_delivery unavailable, using JS fallback:', e.message);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requested = new Date(deliveryDate);
    requested.setHours(0, 0, 0, 0);
    return Math.round((requested - today) / (1000 * 60 * 60 * 24));
}

// REQ-ORD-05 — List all orders with filters (Admin & Dispatcher)
router.get('/', requireAuth, requireRole([1, 2]), async (req, res) => {
    try {
        const { status, limit = 100 } = req.query;
        let query =
            'SELECT o.*, r.name AS route_name, rs.stop_name, u.name AS customer_name, c.phone AS customer_phone ' +
            'FROM `order` o ' +
            'LEFT JOIN route r ON o.route_id = r.route_id ' +
            'LEFT JOIN route_stop rs ON o.route_stop_id = rs.route_stop_id ' +
            'LEFT JOIN customer c ON o.customer_id = c.user_id ' +
            'LEFT JOIN `user` u ON o.customer_id = u.user_id ';
        const params = [];
        if (status) {
            query += 'WHERE o.status = ? ';
            params.push(status);
        }
        query += 'ORDER BY o.order_id DESC LIMIT ?';
        params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        sendError(res, err);
    }
});

// Place a new order — REQ-ORD-01 to REQ-ORD-04
router.post('/', requireAuth, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let { customerId, routeStopId, deliveryAddress, deliveryDate, items } = req.body;

        // Non-admin customers can only place orders under their own user account
        if (![1, 2].includes(req.user.role_id)) {
            customerId = req.user.user_id;
        } else if (!customerId) {
            customerId = req.user.user_id;
        }

        // Input validation — REQ-ORD-01
        if (!customerId || !routeStopId || !deliveryAddress || !deliveryDate || !Array.isArray(items) || items.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'customerId, routeStopId, deliveryAddress, deliveryDate and at least one item are required.' });
        }

        // Deduplicate and validate quantities
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

        // Check 7-day lead time — REQ-ORD-02
        const days = await leadTimeDays(connection, deliveryDate);
        if (days === null || days < 7) {
            await connection.rollback();
            return res.status(400).json({ error: 'Delivery date must be at least 7 days from today.' });
        }

        // Verify customer exists, or auto-provision if user exists in `user` table
        let [customerRows] = await connection.query('SELECT user_id FROM customer WHERE user_id = ?', [customerId]);
        if (customerRows.length === 0) {
            const [userRows] = await connection.query('SELECT user_id FROM user WHERE user_id = ?', [customerId]);
            if (userRows.length > 0) {
                // customer.phone is UNIQUE, so the placeholder must differ for every customer
                // (one shared number would make every auto-created customer after the first fail).
                // The customer can replace it with a real number later.
                await connection.query(
                    'INSERT IGNORE INTO customer (user_id, phone, address, city_id) VALUES (?, ?, ?, ?)',
                    [customerId, `PENDING-${customerId}`, deliveryAddress, 1]
                );
                [customerRows] = await connection.query('SELECT user_id FROM customer WHERE user_id = ?', [customerId]);
            }
            if (customerRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Customer not found. Please log in or register first.' });
            }
        }

        // Look up the route via the chosen stop — REQ-ORD-03
        const [stopRows] = await connection.query('SELECT route_id FROM route_stop WHERE route_stop_id = ?', [routeStopId]);
        if (stopRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Please select a valid delivery stop.' });
        }
        const routeId = stopRows[0].route_id;

        // Check stock in main_inventory — REQ-ORD-01
        // (prices and volumes are NOT calculated here: the database does that, see REQ-ORD-04 below)
        for (const [productId, quantity] of lines) {
            const [stockRows] = await connection.query(
                'SELECT quantity_in_stock FROM main_inventory WHERE product_id = ? FOR UPDATE',
                [productId]
            );
            const currentStock = stockRows.length > 0 ? stockRows[0].quantity_in_stock : 0;
            if (currentStock < quantity) {
                await connection.rollback();
                return res.status(400).json({
                    error: `Insufficient stock for product #${productId} (Available: ${currentStock}, Requested: ${quantity}).`
                });
            }

            const [productRows] = await connection.query(
                'SELECT product_id FROM product WHERE product_id = ?',
                [productId]
            );
            if (productRows.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: `Product #${productId} not found.` });
            }
        }

        // Create the order — REQ-ORD-01
        // Totals start at 0 (the columns are NOT NULL) and are filled in by sp_recalc_order_totals below.
        // The BEFORE INSERT trigger trg_order_before_insert also enforces the 7-day rule here.
        const [orderResult] = await connection.query(
            `INSERT INTO \`order\` (customer_id, route_id, route_stop_id, delivery_address, order_date, requested_delivery_date, total_value, total_volume, status)
             VALUES (?, ?, ?, ?, CURDATE(), ?, 0, 0, 'Placed')`,
            [customerId, routeId, routeStopId, deliveryAddress, deliveryDate]
        );
        const orderId = orderResult.insertId;

        // Insert items and decrement stock atomically
        for (const [productId, quantity] of lines) {
            await connection.query(
                'INSERT INTO order_item (order_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
                [orderId, productId, quantity, 'Pending']
            );
            await connection.query(
                'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?',
                [quantity, productId]
            );
        }

        // REQ-ORD-04: totals are calculated by the database.
        // sp_recalc_order_totals uses fn_order_total_value and fn_order_total_volume.
        await connection.query('CALL sp_recalc_order_totals(?)', [orderId]);

        // Read back the database-calculated total for the audit log
        const [[totals]] = await connection.query(
            'SELECT total_value FROM `order` WHERE order_id = ?',
            [orderId]
        );
        const totalValue = Number(totals.total_value);

        // Audit log entry
        await connection.query(
            'INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)',
            [customerId, 'Placed order', 'order', orderId, `Total value: ${totalValue.toFixed(2)}, total items: ${lines.length}`]
        );

        await connection.commit();

        // Send Real-Time Notifications
        try {
            // Notify Customer
            await createNotification(customerId, 'Order Placed', `Your order #${orderId} has been successfully placed and is awaiting dispatch.`);
            
            // Notify Dispatchers
            const [dispatchers] = await db.query('SELECT user_id FROM `user` WHERE role_id = 2 AND is_active = 1');
            for (const dispatcher of dispatchers) {
                await createNotification(dispatcher.user_id, 'New Order', `New order #${orderId} was just placed and needs to be scheduled.`);
            }
        } catch (notifErr) {
            console.error('Failed to send order notifications:', notifErr.message);
        }

        res.status(201).json({ message: 'Order placed successfully', orderId });
    } catch (err) {
        await connection.rollback();
        sendError(res, err);
    } finally {
        connection.release();
    }
});

// Get order history for a customer — REQ-ORD-05
// Reads from the view v_customer_orders and attaches itemized product details
router.get('/customer/:customerId', requireAuth, async (req, res) => {
    try {
        const targetCustomerId = Number(req.params.customerId);

        // Security check: Customers can only access their own history; Admins/Dispatchers can view any
        if (![1, 2].includes(req.user.role_id) && req.user.user_id !== targetCustomerId) {
            return res.status(403).json({ error: 'You do not have permission to view these orders.' });
        }

        const [orders] = await db.query(
            'SELECT * FROM v_customer_orders WHERE customer_id = ? ORDER BY order_id DESC',
            [targetCustomerId]
        );

        if (orders.length === 0) {
            return res.json([]);
        }

        // Attach itemized order items
        const orderIds = orders.map((o) => o.order_id);
        const [items] = await db.query(
            `SELECT oi.order_item_id, oi.order_id, oi.product_id, oi.quantity, oi.status,
                    p.name AS product_name, p.unit_price, p.space_consumption_rate,
                    (oi.quantity * p.unit_price) AS line_total,
                    (oi.quantity * p.space_consumption_rate) AS line_volume
             FROM order_item oi
             JOIN product p ON oi.product_id = p.product_id
             WHERE oi.order_id IN (?)
             ORDER BY oi.order_id, oi.order_item_id`,
            [orderIds]
        );

        const itemsByOrder = {};
        for (const item of items) {
            if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
            itemsByOrder[item.order_id].push(item);
        }

        const ordersWithItems = orders.map((o) => ({
            ...o,
            items: itemsByOrder[o.order_id] || [],
        }));

        res.json(ordersWithItems);
    } catch (err) {
        sendError(res, err);
    }
});

// Get single order with items
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM `order` WHERE order_id = ?', [req.params.id]);
        if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
        const order = orders[0];

        // Security check: only order owner or Admin/Dispatcher can view
        if (![1, 2].includes(req.user.role_id) && req.user.user_id !== order.customer_id) {
            return res.status(403).json({ error: 'You do not have permission to view this order.' });
        }

        const [items] = await db.query(
            `SELECT oi.*, p.name AS product_name, p.unit_price, p.space_consumption_rate
             FROM order_item oi
             JOIN product p ON oi.product_id = p.product_id
             WHERE oi.order_id = ?`,
            [req.params.id]
        );
        res.json({ ...order, items });
    } catch (err) {
        sendError(res, err);
    }
});

// Cancel an order — only while status is 'Placed' — REQ-ORD-06
// Must return reserved stock to main_inventory
router.delete('/:id', requireAuth, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [orderRows] = await connection.query(
            'SELECT customer_id, status FROM `order` WHERE order_id = ? FOR UPDATE',
            [req.params.id]
        );
        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found.' });
        }
        const order = orderRows[0];

        // Security check: only order owner or Admin can cancel
        if (![1, 2].includes(req.user.role_id) && req.user.user_id !== order.customer_id) {
            await connection.rollback();
            return res.status(403).json({ error: 'You do not have permission to cancel this order.' });
        }

        if (order.status !== 'Placed') {
            await connection.rollback();
            return res.status(400).json({ error: 'Order can only be cancelled while status is Placed.' });
        }

        const [items] = await connection.query(
            'SELECT product_id, quantity FROM order_item WHERE order_id = ? ORDER BY product_id',
            [req.params.id]
        );
        for (const item of items) {
            await connection.query(
                'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?',
                [item.quantity, item.product_id]
            );
        }

        await connection.query("UPDATE `order` SET status = 'Cancelled' WHERE order_id = ?", [req.params.id]);

        // REQ-ORD-06 — cancellation is audit-logged with active user
        await connection.query(
            "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, 'Order cancelled', 'order', ?, 'Status Placed -> Cancelled, stock restored')",
            [req.user.user_id, req.params.id]
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

// Edit an order — allowed only while status is 'Placed' — REQ-ORD-06 & REQ-ORD-02
router.put('/:id', requireAuth, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orderRows] = await connection.query(
            'SELECT customer_id, status FROM `order` WHERE order_id = ? FOR UPDATE',
            [req.params.id]
        );

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found.' });
        }
        const order = orderRows[0];

        // Security check: only order owner or Admin can edit
        if (![1, 2].includes(req.user.role_id) && req.user.user_id !== order.customer_id) {
            await connection.rollback();
            return res.status(403).json({ error: 'You do not have permission to edit this order.' });
        }

        if (order.status !== 'Placed') {
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

        // REQ-ORD-06 — modification is audit-logged with active user
        await connection.query(
            "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, 'Order modified', 'order', ?, ?)",
            [req.user.user_id, req.params.id, `new address=[${deliveryAddress}], new delivery date=${deliveryDate}`]
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
router.put('/:id/confirm-receipt', requireAuth, async (req, res) => {
    try {
        const [orderRows] = await db.query(
            'SELECT customer_id, status FROM `order` WHERE order_id = ?',
            [req.params.id]
        );
        if (orderRows.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        const order = orderRows[0];

        // Security check: only order owner or Admin can confirm receipt
        if (![1, 2].includes(req.user.role_id) && req.user.user_id !== order.customer_id) {
            return res.status(403).json({ error: 'You do not have permission to confirm this order.' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ error: 'Order not found or not awaiting confirmation (status must be Delivered).' });
        }

        const [result] = await db.query(
            "UPDATE `order` SET status = 'Closed' WHERE order_id = ? AND status = 'Delivered'",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: 'Failed to update order status.' });
        }

        await db.query(
            "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, 'Confirmed order receipt', 'order', ?, 'Status Delivered -> Closed by customer')",
            [req.user.user_id, req.params.id]
        );

        res.json({ message: 'Order receipt confirmed successfully' });
    } catch (err) {
        sendError(res, err);
    }
});

module.exports = router;