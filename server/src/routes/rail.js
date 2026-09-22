'use strict';
/**
 * Rail Cargo Scheduling — Section 4.2
 * REQ-RAIL-01  Train trip CRUD (Admin)
 * REQ-RAIL-02  Space-consumption rate used in capacity calc
 * REQ-RAIL-03  Earliest-trip allocation per order item
 * REQ-RAIL-04  Atomic capacity enforcement (FOR UPDATE)
 * REQ-RAIL-05  Overflow to next trip when capacity insufficient
 * REQ-RAIL-06  Loading-status per allocation; manifest lock when all Loaded
 * REQ-RAIL-07  Physical shortfall → requeue remainder to next trip
 */
const express = require('express');
const db      = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// REQ-RAIL-01 — Train Trip Management
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/rail/train-trips
 * List trips with remaining capacity.
 * Optional query params: ?cityId= &status= &fromDate=YYYY-MM-DD
 */
router.get('/train-trips', requireAuth, async (req, res, next) => {
  try {
    const where  = ['1=1'];
    const params = [];

    if (req.query.cityId)   { where.push('tt.destination_city_id = ?'); params.push(Number(req.query.cityId)); }
    if (req.query.status)   { where.push('tt.status = ?');              params.push(req.query.status); }
    if (req.query.fromDate) { where.push('tt.departure_datetime >= ?'); params.push(req.query.fromDate); }

    const [rows] = await db.query(
      `SELECT tt.trip_id,
              tt.train_id,
              t.name                                            AS train_name,
              tt.destination_city_id,
              c.name                                            AS destination_city,
              tt.departure_datetime,
              tt.arrival_datetime,
              tt.total_capacity,
              COALESCE(SUM(ca.allocated_quantity), 0)           AS allocated_capacity,
              tt.total_capacity - COALESCE(SUM(ca.allocated_quantity), 0)
                                                                AS remaining_capacity,
              tt.status
         FROM train_trip tt
         JOIN train t ON t.train_id = tt.train_id
         JOIN city  c ON c.city_id  = tt.destination_city_id
         LEFT JOIN cargo_allocation ca ON ca.trip_id = tt.trip_id
        WHERE ${where.join(' AND ')}
        GROUP BY tt.trip_id
        ORDER BY tt.departure_datetime`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * POST /api/rail/train-trips  — create a trip (Admin only)
 * Body: { trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity }
 */
router.post('/train-trips', requireAuth, requireRole([1]), async (req, res, next) => {
  try {
    const { trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity } = req.body;
    if (!trainId || !destinationCityId || !departureDatetime || !arrivalDatetime || !totalCapacity) {
      return res.status(400).json({ error: 'trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity are all required' });
    }
    if (new Date(arrivalDatetime) <= new Date(departureDatetime)) {
      return res.status(400).json({ error: 'arrivalDatetime must be after departureDatetime' });
    }
    const [result] = await db.query(
      `INSERT INTO train_trip
         (train_id, destination_city_id, departure_datetime, arrival_datetime, total_capacity, status)
       VALUES (?, ?, ?, ?, ?, 'Scheduled')`,
      [trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity]
    );
    res.status(201).json({ tripId: result.insertId });
  } catch (err) { next(err); }
});

/**
 * PUT /api/rail/train-trips/:id  — update a trip (Admin only)
 * Only allowed when status is 'Scheduled'.
 */
router.put('/train-trips/:id', requireAuth, requireRole([1]), async (req, res, next) => {
  try {
    const tripId = Number(req.params.id);
    const [existing] = await db.query('SELECT * FROM train_trip WHERE trip_id = ?', [tripId]);
    if (!existing.length) return res.status(404).json({ error: 'Trip not found' });
    if (existing[0].status !== 'Scheduled') {
      return res.status(409).json({ error: `Cannot edit a trip with status '${existing[0].status}'` });
    }
    const { trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity } = req.body;
    await db.query(
      `UPDATE train_trip SET
         train_id            = COALESCE(?, train_id),
         destination_city_id = COALESCE(?, destination_city_id),
         departure_datetime  = COALESCE(?, departure_datetime),
         arrival_datetime    = COALESCE(?, arrival_datetime),
         total_capacity      = COALESCE(?, total_capacity)
       WHERE trip_id = ?`,
      [trainId ?? null, destinationCityId ?? null, departureDatetime ?? null, arrivalDatetime ?? null, totalCapacity ?? null, tripId]
    );
    res.json({ message: 'Trip updated', tripId });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/rail/train-trips/:id  — cancel a trip (Admin only)
 * Blocked if any cargo_allocations already exist for this trip.
 */
router.delete('/train-trips/:id', requireAuth, requireRole([1]), async (req, res, next) => {
  try {
    const tripId = Number(req.params.id);
    const [[{ cnt }]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM cargo_allocation WHERE trip_id = ?', [tripId]
    );
    if (cnt > 0) {
      return res.status(409).json({ error: 'Cannot cancel a trip that already has cargo allocations' });
    }
    const [result] = await db.query(
      "UPDATE train_trip SET status = 'Cancelled' WHERE trip_id = ?", [tripId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Trip not found' });
    res.json({ message: 'Trip cancelled', tripId });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// REQ-RAIL-06 — Trip Manifest (read)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/rail/train-trips/:id/manifest
 * Full manifest: trip info + all allocations with product & order details.
 */
router.get('/train-trips/:id/manifest', requireAuth, async (req, res, next) => {
  try {
    const tripId = Number(req.params.id);

    const [[trip]] = await db.query(
      `SELECT tt.*,
              t.name AS train_name,
              c.name AS destination_city,
              tt.total_capacity - COALESCE(SUM(ca.allocated_quantity), 0) AS remaining_capacity
         FROM train_trip tt
         JOIN train t ON t.train_id = tt.train_id
         JOIN city  c ON c.city_id  = tt.destination_city_id
         LEFT JOIN cargo_allocation ca ON ca.trip_id = tt.trip_id
        WHERE tt.trip_id = ?
        GROUP BY tt.trip_id`,
      [tripId]
    );
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const [allocations] = await db.query(
      `SELECT ca.cargo_allocation_id,
              ca.order_item_id,
              ca.allocated_quantity,
              ca.status            AS loading_status,
              ca.received_quantity,
              ca.discrepancy_flag,
              ca.discrepancy_note,
              oi.order_id,
              oi.product_id,
              p.name               AS product_name,
              p.space_consumption_rate
         FROM cargo_allocation ca
         JOIN order_item oi ON oi.order_item_id = ca.order_item_id
         JOIN product   p  ON p.product_id      = oi.product_id
        WHERE ca.trip_id = ?
        ORDER BY oi.order_id, p.name`,
      [tripId]
    );

    res.json({ trip, allocations });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// REQ-RAIL-03 / REQ-RAIL-04 — Atomic Allocation
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/rail/train-trips/:id/allocate
 * Allocate one or more order items to this trip atomically.
 * Roles: Admin (1), Dispatcher (2)
 * Body: { allocations: [{ orderItemId, quantity }] }
 * Returns 409 with remainingCapacity if a single item won't fit.
 */
router.post('/train-trips/:id/allocate', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const tripId = Number(req.params.id);
    const { allocations } = req.body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'allocations[] must be a non-empty array' });
    }

    const results = [];

    for (const { orderItemId, quantity } of allocations) {
      if (!orderItemId || !quantity || quantity <= 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Each item needs orderItemId and quantity > 0' });
      }

      // Lock trip row — prevents concurrent over-allocation (REQ-RAIL-04)
      const [[trip]] = await conn.query(
        'SELECT trip_id, total_capacity, status FROM train_trip WHERE trip_id = ? FOR UPDATE',
        [tripId]
      );
      if (!trip) {
        await conn.rollback();
        return res.status(404).json({ error: 'Trip not found' });
      }
      if (trip.status !== 'Scheduled') {
        await conn.rollback();
        return res.status(409).json({ error: `Trip status is '${trip.status}'; only Scheduled trips accept allocations` });
      }

      const [[{ used }]] = await conn.query(
        'SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?',
        [tripId]
      );
      const remaining = trip.total_capacity - Number(used);

      if (quantity > remaining) {
        await conn.rollback();
        return res.status(409).json({
          error: `Insufficient capacity for order_item ${orderItemId}`,
          remainingCapacity: remaining,
          requested: quantity,
        });
      }

      const [ins] = await conn.query(
        "INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status) VALUES (?, ?, ?, 'Not Loaded')",
        [orderItemId, tripId, quantity]
      );

      // Advance parent order Placed → Scheduled
      const [[oi]] = await conn.query('SELECT order_id FROM order_item WHERE order_item_id = ?', [orderItemId]);
      if (oi) {
        await conn.query(
          "UPDATE `order` SET status = 'Scheduled' WHERE order_id = ? AND status = 'Placed'",
          [oi.order_id]
        );
      }

      results.push({ cargoAllocationId: ins.insertId, orderItemId, tripId, quantity });
    }

    await conn.commit();
    res.status(201).json({ message: 'Allocated successfully', allocations: results });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// REQ-RAIL-05 — Overflow Allocation
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/rail/train-trips/:id/allocate-with-overflow
 * Fills this trip, then automatically spills the remainder to
 * the next Scheduled trip(s) for the same destination city.
 * Body: { allocations: [{ orderItemId, quantity }] }
 * Returns: { allocated: [...], overflowed: [...] }
 */
router.post('/train-trips/:id/allocate-with-overflow', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const startTripId = Number(req.params.id);
    const { allocations } = req.body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'allocations[] must be a non-empty array' });
    }

    const [[startTrip]] = await conn.query(
      'SELECT destination_city_id, departure_datetime FROM train_trip WHERE trip_id = ?',
      [startTripId]
    );
    if (!startTrip) {
      await conn.rollback();
      return res.status(404).json({ error: 'Trip not found' });
    }

    const allocated  = [];
    const overflowed = [];

    for (const { orderItemId, quantity } of allocations) {
      let remaining   = quantity;
      let curTripId   = startTripId;
      let curDepart   = startTrip.departure_datetime;
      const destCity  = startTrip.destination_city_id;

      while (remaining > 0) {
        const [[ct]] = await conn.query(
          'SELECT trip_id, total_capacity, status FROM train_trip WHERE trip_id = ? FOR UPDATE',
          [curTripId]
        );
        if (!ct || ct.status !== 'Scheduled') break;

        const [[{ used }]] = await conn.query(
          'SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?',
          [curTripId]
        );
        const available  = Math.floor(ct.total_capacity - Number(used));
        const toAllocate = Math.min(remaining, available);

        if (toAllocate > 0) {
          const [ins] = await conn.query(
            "INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status) VALUES (?, ?, ?, 'Not Loaded')",
            [orderItemId, curTripId, toAllocate]
          );
          const entry = { cargoAllocationId: ins.insertId, orderItemId, tripId: curTripId, quantity: toAllocate };

          if (curTripId === startTripId) {
            allocated.push(entry);
          } else {
            overflowed.push(entry);
            await conn.query(
              `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
               VALUES (?, 'Cargo overflow allocation', 'cargo_allocation', ?, ?)`,
              [
                req.user.userId,
                ins.insertId,
                `order_item_id=${orderItemId} overflowed from trip ${startTripId} to trip ${curTripId}, qty=${toAllocate}`,
              ]
            );
          }
          remaining -= toAllocate;
        }

        if (remaining > 0) {
          // Find next trip for same city
          const [nextTrips] = await conn.query(
            `SELECT trip_id, departure_datetime FROM train_trip
              WHERE destination_city_id = ?
                AND status = 'Scheduled'
                AND departure_datetime > ?
              ORDER BY departure_datetime ASC LIMIT 1`,
            [destCity, curDepart]
          );
          if (!nextTrips.length) break; // no more trips
          curTripId = nextTrips[0].trip_id;
          curDepart = nextTrips[0].departure_datetime;
        }
      }

      // Advance parent order
      const [[oi]] = await conn.query('SELECT order_id FROM order_item WHERE order_item_id = ?', [orderItemId]);
      if (oi) {
        await conn.query(
          "UPDATE `order` SET status = 'Scheduled' WHERE order_id = ? AND status = 'Placed'",
          [oi.order_id]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'Allocated with overflow', allocated, overflowed });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// REQ-RAIL-06 — Loading Status
// ─────────────────────────────────────────────────────────────

/**
 * PATCH /api/rail/allocations/:id/loading-status
 * Update loading status for one cargo_allocation.
 * Valid values: 'Not Loaded' | 'Partially Loaded' | 'Loaded'
 * When all allocations on a trip reach 'Loaded' the manifest is
 * locked and parent orders advance to 'In Transit'.
 */
router.patch('/allocations/:id/loading-status', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const allocationId = Number(req.params.id);
    const { status }   = req.body;
    const VALID        = ['Not Loaded', 'Partially Loaded', 'Loaded'];

    if (!VALID.includes(status)) {
      await conn.rollback();
      return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
    }

    const [[alloc]] = await conn.query(
      'SELECT * FROM cargo_allocation WHERE cargo_allocation_id = ?', [allocationId]
    );
    if (!alloc) {
      await conn.rollback();
      return res.status(404).json({ error: 'Allocation not found' });
    }

    const [[trip]] = await conn.query(
      'SELECT status FROM train_trip WHERE trip_id = ?', [alloc.trip_id]
    );
    if (trip?.status === 'Loaded') {
      await conn.rollback();
      return res.status(409).json({ error: 'Trip manifest is already locked (status: Loaded)' });
    }

    await conn.query(
      'UPDATE cargo_allocation SET status = ? WHERE cargo_allocation_id = ?',
      [status, allocationId]
    );

    // Mark order_item Out for Delivery when physically loaded
    if (status === 'Loaded') {
      await conn.query(
        "UPDATE order_item SET status = 'Out for Delivery' WHERE order_item_id = ?",
        [alloc.order_item_id]
      );
    }

    // Check if ALL allocations on this trip are now 'Loaded' → lock manifest
    if (status === 'Loaded') {
      const [[{ cnt }]] = await conn.query(
        "SELECT COUNT(*) AS cnt FROM cargo_allocation WHERE trip_id = ? AND status != 'Loaded'",
        [alloc.trip_id]
      );
      if (cnt === 0) {
        await conn.query("UPDATE train_trip SET status = 'Loaded' WHERE trip_id = ?", [alloc.trip_id]);
        // Cascade orders to In Transit
        await conn.query(
          `UPDATE \`order\` SET status = 'In Transit'
            WHERE order_id IN (
              SELECT DISTINCT oi.order_id
                FROM order_item oi
                JOIN cargo_allocation ca ON ca.order_item_id = oi.order_item_id
               WHERE ca.trip_id = ?
            ) AND status = 'Scheduled'`,
          [alloc.trip_id]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Loading status updated', allocationId, status });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// ─────────────────────────────────────────────────────────────
// REQ-RAIL-07 — Physical Shortfall / Requeue
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/rail/allocations/:id/requeue
 * When a physical loading shortfall is discovered at the platform,
 * move the unloaded portion to the next available trip for the
 * same destination city and log the change.
 * Body: { unloadedQuantity, reason }
 */
router.post('/allocations/:id/requeue', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const allocationId        = Number(req.params.id);
    const { unloadedQuantity, reason } = req.body;

    if (!unloadedQuantity || unloadedQuantity <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'unloadedQuantity must be a positive integer' });
    }

    const [[alloc]] = await conn.query(
      `SELECT ca.*, tt.destination_city_id, tt.departure_datetime
         FROM cargo_allocation ca
         JOIN train_trip tt ON tt.trip_id = ca.trip_id
        WHERE ca.cargo_allocation_id = ?`,
      [allocationId]
    );
    if (!alloc) {
      await conn.rollback();
      return res.status(404).json({ error: 'Allocation not found' });
    }
    if (unloadedQuantity > alloc.allocated_quantity) {
      await conn.rollback();
      return res.status(400).json({
        error: `unloadedQuantity (${unloadedQuantity}) cannot exceed allocated_quantity (${alloc.allocated_quantity})`,
      });
    }

    // Find next scheduled trip for same destination
    const [nextTrips] = await conn.query(
      `SELECT t.trip_id,
              t.total_capacity - COALESCE(SUM(ca2.allocated_quantity), 0) AS remaining
         FROM train_trip t
         LEFT JOIN cargo_allocation ca2 ON ca2.trip_id = t.trip_id
        WHERE t.destination_city_id = ?
          AND t.status = 'Scheduled'
          AND t.departure_datetime > ?
        GROUP BY t.trip_id
        ORDER BY t.departure_datetime ASC
        LIMIT 1`,
      [alloc.destination_city_id, alloc.departure_datetime]
    );

    if (!nextTrips.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'No subsequent scheduled trip found for this destination' });
    }

    const next = nextTrips[0];
    if (unloadedQuantity > next.remaining) {
      await conn.rollback();
      return res.status(409).json({
        error: `Next trip (${next.trip_id}) only has ${next.remaining} capacity remaining`,
        nextTripId: next.trip_id,
        remainingCapacity: next.remaining,
      });
    }

    // Create new allocation on next trip
    const [ins] = await conn.query(
      "INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status) VALUES (?, ?, ?, 'Not Loaded')",
      [alloc.order_item_id, next.trip_id, unloadedQuantity]
    );

    // Adjust original allocation
    const newQty = alloc.allocated_quantity - unloadedQuantity;
    await conn.query(
      `UPDATE cargo_allocation
          SET allocated_quantity = ?,
              status = IF(? > 0, 'Partially Loaded', 'Not Loaded')
        WHERE cargo_allocation_id = ?`,
      [newQty, newQty, allocationId]
    );

    // Audit log
    await conn.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Loading shortfall requeue', 'cargo_allocation', ?, ?)`,
      [
        req.user.userId,
        ins.insertId,
        `original_allocation=${allocationId} requeued=${unloadedQuantity} to_trip=${next.trip_id} reason: ${reason || 'not specified'}`,
      ]
    );

    await conn.commit();
    res.status(201).json({
      message: 'Requeued successfully',
      newAllocationId: ins.insertId,
      newTripId: next.trip_id,
      requeuedQuantity: unloadedQuantity,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
