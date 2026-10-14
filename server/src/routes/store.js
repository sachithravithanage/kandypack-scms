'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// List all stores
router.get('/', requireAuth, async (_req, res, next) => {
        try {
                const [rows] = await db.query(
                        `SELECT s.store_id, s.name, s.address, s.city_id, c.name AS city_name
       FROM store s JOIN city c ON c.city_id = s.city_id
       ORDER BY c.name, s.name`
                );
                res.json(rows);
        } catch (err) { next(err); }
});

// Admin creates a store
router.post('/', requireAuth, requireRole([1]), async (req, res, next) => {
        try {
                const { cityId, name, address } = req.body;
                if (!cityId || !name) return res.status(400).json({ error: 'cityId and name are required' });
                const [result] = await db.query(
                        'INSERT INTO store (city_id, name, address) VALUES (?, ?, ?)',
                        [cityId, name, address ?? null]
                );
                res.status(201).json({ storeId: result.insertId });
        } catch (err) { next(err); }
});

// Advance train trip statuses according to timetable (Loaded -> In Transit -> Arrived)
// Invokes stored procedure sp_advance_train_trip_statuses with an inline SQL fallback.
async function advanceTrainTripStatuses(dbOrConn) {
        try {
                await dbOrConn.query('CALL sp_advance_train_trip_statuses()');
        } catch (_err) {
                // Fallback if stored procedure not defined on engine (e.g. TiDB)
                await dbOrConn.query(
                        `UPDATE train_trip
       SET status = 'In Transit'
       WHERE status = 'Loaded' AND departure_datetime <= NOW()`
                );
                await dbOrConn.query(
                        `UPDATE train_trip
       SET status = 'Arrived'
       WHERE status = 'In Transit' AND arrival_datetime <= NOW()`
                );
        }
}

// Incoming loaded trips arriving at this store's city
router.get('/:storeId/incoming-trips', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const storeId = Number(req.params.storeId);
                await advanceTrainTripStatuses(db);
                const [rows] = await db.query(
                        `SELECT tt.trip_id,
              tt.departure_datetime,
              tt.arrival_datetime,
              tt.status,
              t.name AS train_name,
              c.name AS destination_city,
              CASE
                WHEN tt.status = 'Arrived' OR tt.arrival_datetime <= NOW() THEN 1
                ELSE 0
              END AS is_arrived
       FROM train_trip tt
       JOIN train t ON t.train_id = tt.train_id
       JOIN city  c ON c.city_id  = tt.destination_city_id
       WHERE tt.destination_city_id = (SELECT city_id FROM store WHERE store_id = ?)
         AND tt.status IN ('Loaded', 'In Transit', 'Arrived')
       ORDER BY tt.arrival_datetime DESC`,
                        [storeId]
                );
                res.json(rows);
        } catch (err) { next(err); }
});

// Helper for manifest retrieval
async function fetchTripManifest(tripId) {
        const [[trip]] = await db.query(
                `SELECT tt.*, t.name AS train_name, c.name AS destination_city
     FROM train_trip tt
     JOIN train t ON t.train_id = tt.train_id
     JOIN city  c ON c.city_id  = tt.destination_city_id
     WHERE tt.trip_id = ?`,
                [tripId]
        );
        if (!trip) return null;

        const [manifest] = await db.query(
                `SELECT ca.cargo_allocation_id,
            ca.order_item_id,
            ca.allocated_quantity        AS expected_quantity,
            ca.received_quantity,
            ca.discrepancy_flag,
            ca.discrepancy_note,
            ca.status                    AS loading_status,
            oi.order_id,
            oi.product_id,
            p.name                       AS product_name,
            p.space_consumption_rate,
            CASE
              WHEN ca.received_quantity IS NULL THEN 'Pending'
              WHEN ca.discrepancy_flag  = 1     THEN 'Discrepant'
              ELSE 'Received'
            END                          AS receipt_status
     FROM cargo_allocation ca
     JOIN order_item oi ON oi.order_item_id = ca.order_item_id
     JOIN product   p  ON p.product_id      = oi.product_id
     WHERE ca.trip_id = ?
     ORDER BY oi.order_id`,
                [tripId]
        );
        return { trip, manifest };
}

// Expected manifest for an arriving trip at a store — REQ-STORE-01 (Supports both /:tripId and /:tripId/manifest)
router.get('/:storeId/incoming/:tripId/manifest', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const tripId = Number(req.params.tripId);
                const data = await fetchTripManifest(tripId);
                if (!data) return res.status(404).json({ error: 'Trip not found' });
                res.json(data);
        } catch (err) { next(err); }
});

router.get('/:storeId/incoming/:tripId', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const tripId = Number(req.params.tripId);
                const data = await fetchTripManifest(tripId);
                if (!data) return res.status(404).json({ error: 'Trip not found' });
                res.json(data.manifest);
        } catch (err) { next(err); }
});

// Store Manager records received quantities — REQ-STORE-02, REQ-STORE-03
// Supports both single receipt { cargoAllocationId, productId, receivedQuantity, note }
// and batch format { tripId, receipts: [...] }
router.post('/:storeId/receive', requireAuth, requireRole([1, 3]), async (req, res, next) => {
        const conn = await db.getConnection();
        try {
                await conn.beginTransaction();
                await advanceTrainTripStatuses(conn);

                const storeId = Number(req.params.storeId);
                let { tripId, receipts, cargoAllocationId, productId, receivedQuantity, note } = req.body;

                if (!receipts && cargoAllocationId !== undefined) {
                        receipts = [{ cargoAllocationId, productId, receivedQuantity, note }];
                }

                if (!Array.isArray(receipts) || receipts.length === 0) {
                        await conn.rollback();
                        return res.status(400).json({ error: 'Provide receipts[] or single receipt fields (cargoAllocationId, productId, receivedQuantity)' });
                }

                // Verify train trip arrival before allowing receipt
                if (tripId) {
                        const [[tripCheck]] = await conn.query(
                                'SELECT trip_id, status, arrival_datetime FROM train_trip WHERE trip_id = ?',
                                [tripId]
                        );
                        if (tripCheck && tripCheck.status !== 'Arrived' && new Date(tripCheck.arrival_datetime) > new Date()) {
                                await conn.rollback();
                                return res.status(400).json({
                                        error: `Cannot reconcile shipment: Train trip #${tripId} has not arrived yet (Scheduled arrival: ${new Date(tripCheck.arrival_datetime).toLocaleString()}). Reconcile is only allowed after arrival.`
                                });
                        }
                }

                const discrepancies = [];
                const recorded = [];

                for (const item of receipts) {
                        const cAllocId = item.cargoAllocationId;
                        const pId = item.productId;
                        const recQty = item.receivedQuantity;
                        const itemNote = item.note ?? null;

                        if (cAllocId === undefined || pId === undefined || recQty === undefined) {
                                await conn.rollback();
                                return res.status(400).json({ error: 'Each receipt requires cargoAllocationId, productId, receivedQuantity' });
                        }

                        // Fetch the allocation to get expected quantity and order_item_id
                        const [[alloc]] = await conn.query(
                                'SELECT * FROM cargo_allocation WHERE cargo_allocation_id = ?',
                                [cAllocId]
                        );
                        if (!alloc) {
                                await conn.rollback();
                                return res.status(404).json({ error: `Allocation ${cAllocId} not found` });
                        }

                        // Verify arrival for the allocation's trip if tripId was not provided in root body
                        if (!tripId && alloc.trip_id) {
                                const [[tripCheck]] = await conn.query(
                                        'SELECT trip_id, status, arrival_datetime FROM train_trip WHERE trip_id = ?',
                                        [alloc.trip_id]
                                );
                                if (tripCheck && tripCheck.status !== 'Arrived' && new Date(tripCheck.arrival_datetime) > new Date()) {
                                        await conn.rollback();
                                        return res.status(400).json({
                                                error: `Cannot reconcile shipment: Train trip #${alloc.trip_id} has not arrived yet (Scheduled arrival: ${new Date(tripCheck.arrival_datetime).toLocaleString()}). Reconcile is only allowed after arrival.`
                                        });
                                }
                        }

                        const expected = alloc.allocated_quantity;
                        const isDiscrep = recQty < expected;

                        // Update received qty and discrepancy on the allocation
                        await conn.query(
                                `UPDATE cargo_allocation
         SET received_quantity = ?,
             discrepancy_flag  = ?,
             discrepancy_note  = ?
         WHERE cargo_allocation_id = ?`,
                                [recQty, isDiscrep ? 1 : 0, itemNote, cAllocId]
                        );

                        // Append-only store inventory ledger (REQ-STORE-03, Project Guide C1/4.4)
                        await conn.query(
                                `INSERT INTO store_inventory (store_id, product_id, cargo_allocation_id, quantity_on_hand)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand)`,
                                [storeId, pId, cAllocId, recQty]
                        );

                        // Update customer-facing order_item status
                        const newItemStatus = isDiscrep ? 'Discrepant' : 'Out for Delivery';
                        await conn.query(
                                'UPDATE order_item SET status = ? WHERE order_item_id = ?',
                                [newItemStatus, alloc.order_item_id]
                        );

                        if (isDiscrep) {
                                discrepancies.push({
                                        cargoAllocationId: cAllocId,
                                        productId: pId,
                                        expected,
                                        received: recQty,
                                        shortfall: expected - recQty,
                                        tripId: alloc.trip_id
                                });
                        }
                        recorded.push({ cargoAllocationId: cAllocId, productId: pId, receivedQuantity: recQty });
                }

                const operatorUserId = req.user?.user_id || req.user?.userId || null;

                // Log each discrepancy to audit_log (REQ-STORE-02) and trigger notifications (REQ-NOT-01)
                if (discrepancies.length > 0) {
                        for (const d of discrepancies) {
                                await conn.query(
                                        `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
           VALUES (?, 'Shipment discrepancy', 'cargo_allocation', ?, ?)`,
                                        [
                                                operatorUserId,
                                                d.cargoAllocationId,
                                                `store=${storeId} trip=${d.tripId || tripId} product=${d.productId} expected=${d.expected} received=${d.received} shortfall=${d.shortfall}`
                                        ]
                                );
                        }

                        // Notify Dispatcher (role 2) and Administrator (role 1) — REQ-NOT-01
                        const [staffUsers] = await conn.query(
                                'SELECT user_id FROM `user` WHERE role_id IN (1, 2) AND is_active = TRUE'
                        );
                        for (const staff of staffUsers) {
                                for (const d of discrepancies) {
                                        await conn.query(
                                                `INSERT INTO notification (user_id, type, message)
             VALUES (?, 'DISCREPANCY', ?)`,
                                                [
                                                        staff.user_id,
                                                        `Discrepancy at store ${storeId}: allocation #${d.cargoAllocationId} received ${d.received}/${d.expected} (shortfall: ${d.shortfall})`
                                                ]
                                        );
                                }
                        }
                }

                // Always log the receipt batch event
                await conn.query(
                        `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Store shipment receipt recorded', 'cargo_allocation', ?, ?)`,
                        [
                                operatorUserId,
                                recorded[0]?.cargoAllocationId || storeId,
                                `store=${storeId} trip=${tripId || 'N/A'} items_recorded=${recorded.length} discrepancies=${discrepancies.length}`
                        ]
                );

                await conn.commit();
                res.status(201).json({
                        message: 'Receipt recorded',
                        recorded: recorded.length,
                        hasDiscrepancy: discrepancies.length > 0,
                        discrepancy: discrepancies.length > 0,
                        discrepancies: discrepancies.length > 0 ? discrepancies : undefined
                });
        } catch (err) {
                await conn.rollback();
                next(err);
        } finally {
                conn.release();
        }
});

// Current stock on hand per product — sums the append-only ledger
router.get('/:storeId/stock', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const storeId = Number(req.params.storeId);
                const [rows] = await db.query(
                        `SELECT si.product_id,
              p.name AS product_name,
              SUM(si.quantity_on_hand) AS current_stock
       FROM store_inventory si
       JOIN product p ON p.product_id = si.product_id
       WHERE si.store_id = ?
       GROUP BY si.product_id, p.name
       ORDER BY p.name`,
                        [storeId]
                );
                res.json(rows);
        } catch (err) { next(err); }
});

// Daily Dispatch — Store Manager assigns a received order onto one of today's truck runs (SRS Section 3.1.4)
router.post('/:storeId/dispatch', requireAuth, requireRole([1, 3]), async (req, res, next) => {
        try {
                const { truckScheduleId, orderId } = req.body;
                if (!truckScheduleId || !orderId) {
                        return res.status(400).json({ error: 'truckScheduleId and orderId are required' });
                }

                const [orderRows] = await db.query(
                        'SELECT route_stop_id FROM `order` WHERE order_id = ?',
                        [orderId]
                );
                if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });

                const [result] = await db.query(
                        'INSERT INTO truck_allocation (truck_schedule_id, order_id, route_stop_id, delivery_status) VALUES (?, ?, ?, ?)',
                        [truckScheduleId, orderId, orderRows[0].route_stop_id, 'Pending']
                );

                // Update order status to Out for Delivery
                await db.query(
                        "UPDATE `order` SET status = 'Out for Delivery' WHERE order_id = ?",
                        [orderId]
                );

                const operatorUserId = req.user?.user_id || req.user?.userId || null;
                await db.query(
                        `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Dispatched order to truck schedule', 'truck_allocation', ?, ?)`,
                        [
                                operatorUserId,
                                result.insertId,
                                `truckScheduleId=${truckScheduleId}, orderId=${orderId}, routeStopId=${orderRows[0].route_stop_id}`
                        ]
                );

                res.status(201).json({
                        message: 'Order dispatched to truck schedule',
                        truckAllocationId: result.insertId
                });
        } catch (err) { next(err); }
});

// List today's truck runs and assigned deliveries for this store
router.get('/:storeId/dispatch/today', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const storeId = Number(req.params.storeId);
                const [rows] = await db.query(
                        `SELECT ts.truck_schedule_id,
              ts.route_id,
              r.name AS route_name,
              ts.truck_id,
              ts.scheduled_date,
              ts.start_time,
              ts.end_time,
              ts.status AS schedule_status,
              ta.truck_allocation_id,
              ta.order_id,
              ta.route_stop_id,
              rs.stop_name,
              ta.delivery_status
       FROM truck_schedule ts
       JOIN route r ON r.route_id = ts.route_id
       LEFT JOIN truck_allocation ta ON ta.truck_schedule_id = ts.truck_schedule_id
       LEFT JOIN route_stop rs ON rs.route_stop_id = ta.route_stop_id
       WHERE ts.scheduled_date = CURDATE()
         AND ts.route_id IN (SELECT route_id FROM route WHERE store_id = ?)
       ORDER BY ts.start_time, ta.truck_allocation_id`,
                        [storeId]
                );
                res.json(rows);
        } catch (err) { next(err); }
});

// Available orders waiting for last-mile truck dispatch at this store
router.get('/:storeId/dispatch/available-orders', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const storeId = Number(req.params.storeId);
                const [rows] = await db.query(
                        `SELECT o.order_id,
              o.order_date,
              o.requested_delivery_date AS delivery_date,
              o.status,
              o.total_value AS total_amount,
              o.route_stop_id,
              rs.stop_name,
              rs.route_id,
              r.name AS route_name
       FROM \`order\` o
       JOIN route_stop rs ON rs.route_stop_id = o.route_stop_id
       JOIN route r ON r.route_id = rs.route_id
       WHERE r.store_id = ?
         AND o.order_id NOT IN (
           SELECT order_id FROM truck_allocation WHERE order_id IS NOT NULL
         )
       ORDER BY o.order_date ASC`,
                        [storeId]
                );
                res.json(rows);
        } catch (err) { next(err); }
});

// System-suggested daily truck requirements per route — REQ-STORE-04, REQ-STORE-05
router.get('/:storeId/truck-suggestion', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const storeId = Number(req.params.storeId);
                const days = Math.max(1, Number(req.query.days) || 14);
                const defaultCapacity = Number(req.query.capacity) || 20;

                const [routes] = await db.query(
                        'SELECT route_id, name, service_days, max_delivery_time_minutes FROM route WHERE store_id = ?',
                        [storeId]
                );

                const suggestions = await Promise.all(
                        routes.map(async (rt) => {
                                const [stats] = await db.query(
                                        `SELECT COUNT(*) AS total_orders,
                  COUNT(DISTINCT order_date) AS active_days
           FROM \`order\`
           WHERE route_id = ?
             AND order_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
                                        [rt.route_id, days]
                                );

                                const totalOrders = stats[0].total_orders || 0;
                                const activeDays = stats[0].active_days || 1;
                                const avgOrdersPerDay = totalOrders / (activeDays || 1);
                                const suggestedTrucks = Math.max(1, Math.ceil(avgOrdersPerDay / defaultCapacity));

                                return {
                                        routeId: rt.route_id,
                                        routeName: rt.name,
                                        serviceDays: rt.service_days,
                                        trailingDays: days,
                                        totalOrders,
                                        avgOrdersPerDay: Number(avgOrdersPerDay.toFixed(2)),
                                        assumedTruckCapacity: defaultCapacity,
                                        suggestedTrucks
                                };
                        })
                );

                res.json(suggestions);
        } catch (err) { next(err); }
});

module.exports = router;
