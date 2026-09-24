'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
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

router.get('/:storeId/incoming-trips', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const storeId = Number(req.params.storeId);
                const [rows] = await db.query(
                        `SELECT tt.trip_id,
              tt.departure_datetime,
              tt.arrival_datetime,
              tt.status,
              t.name AS train_name,
              c.name AS destination_city
         FROM train_trip tt
         JOIN train t ON t.train_id = tt.train_id
         JOIN city  c ON c.city_id  = tt.destination_city_id
        WHERE tt.destination_city_id = (SELECT city_id FROM store WHERE store_id = ?)
          AND tt.status = 'Loaded'
        ORDER BY tt.arrival_datetime DESC`,
                        [storeId]
                );
                res.json(rows);
        } catch (err) { next(err); }
});

router.get('/:storeId/incoming/:tripId/manifest', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
        try {
                const tripId = Number(req.params.tripId);

                const [[trip]] = await db.query(
                        `SELECT tt.*, t.name AS train_name, c.name AS destination_city
         FROM train_trip tt
         JOIN train t ON t.train_id = tt.train_id
         JOIN city  c ON c.city_id  = tt.destination_city_id
        WHERE tt.trip_id = ?`,
                        [tripId]
                );
                if (!trip) return res.status(404).json({ error: 'Trip not found' });

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

                res.json({ trip, manifest });
        } catch (err) { next(err); }
});

router.post('/:storeId/receive', requireAuth, requireRole([1, 3]), async (req, res, next) => {
        const conn = await db.getConnection();
        try {
                await conn.beginTransaction();

                const storeId = Number(req.params.storeId);
                const { tripId, receipts } = req.body;

                if (!tripId || !Array.isArray(receipts) || receipts.length === 0) {
                        await conn.rollback();
                        return res.status(400).json({ error: 'tripId and receipts[] are required' });
                }

                const discrepancies = [];
                const recorded = [];

                for (const { cargoAllocationId, productId, receivedQuantity, note } of receipts) {
                        if (cargoAllocationId === undefined || productId === undefined || receivedQuantity === undefined) {
                                await conn.rollback();
                                return res.status(400).json({ error: 'Each receipt requires cargoAllocationId, productId, receivedQuantity' });
                        }

                        // Fetch the allocation to get expected quantity
                        const [[alloc]] = await conn.query(
                                'SELECT * FROM cargo_allocation WHERE cargo_allocation_id = ?',
                                [cargoAllocationId]
                        );
                        if (!alloc) {
                                await conn.rollback();
                                return res.status(404).json({ error: `Allocation ${cargoAllocationId} not found` });
                        }

                        const expected = alloc.allocated_quantity;
                        const isDiscrep = receivedQuantity < expected;

                        // Record received qty and discrepancy on the allocation
                        await conn.query(
                                `UPDATE cargo_allocation
            SET received_quantity = ?,
                discrepancy_flag  = ?,
                discrepancy_note  = ?
          WHERE cargo_allocation_id = ?`,
                                [receivedQuantity, isDiscrep ? 1 : 0, note ?? null, cargoAllocationId]
                        );

                        // Append-only store inventory ledger (REQ-STORE-03)
                        await conn.query(
                                `INSERT INTO store_inventory (store_id, product_id, cargo_allocation_id, quantity_on_hand)
         VALUES (?, ?, ?, ?)`,
                                [storeId, productId, cargoAllocationId, receivedQuantity]
                        );

                        // Update order_item status
                        const newItemStatus = isDiscrep ? 'Discrepant' : 'Out for Delivery';
                        await conn.query(
                                'UPDATE order_item SET status = ? WHERE order_item_id = ?',
                                [newItemStatus, alloc.order_item_id]
                        );

                        if (isDiscrep) {
                                discrepancies.push({
                                        cargoAllocationId,
                                        productId,
                                        expected,
                                        received: receivedQuantity,
                                        shortfall: expected - receivedQuantity,
                                });
                        }
                        recorded.push({ cargoAllocationId, productId, receivedQuantity });
                }

                // Log each discrepancy to audit_log (REQ-STORE-02)
                for (const d of discrepancies) {
                        await conn.query(
                                `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
         VALUES (?, 'Shipment discrepancy', 'cargo_allocation', ?, ?)`,
                                [
                                        req.user.userId,
                                        d.cargoAllocationId,
                                        `store=${storeId} trip=${tripId} product=${d.productId} expected=${d.expected} received=${d.received} shortfall=${d.shortfall}`,
                                ]
                        );
                }

                await conn.commit();
                res.status(201).json({
                        message: 'Receipt recorded',
                        recorded: recorded.length,
                        hasDiscrepancy: discrepancies.length > 0,
                        discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
                });
        } catch (err) {
                await conn.rollback();
                next(err);
        } finally {
                conn.release();
        }
});

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
        GROUP BY si.product_id
        ORDER BY p.name`,
                        [storeId]
                );
                res.json(rows);
        } catch (err) { next(err); }
});

module.exports = router;
