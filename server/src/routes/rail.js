'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// List all trains — useful for trip creation dropdowns
router.get('/trains', requireAuth, requireRole([1, 2]), async (_req, res, next) => {
  try {
    const [rows] = await db.query('SELECT train_id, name FROM train ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Admin defines a new train trip — REQ-RAIL-01
router.post('/train-trips', requireAuth, requireRole([1]), async (req, res, next) => {
  try {
    const { trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity } = req.body;
    if (!trainId || !destinationCityId || !departureDatetime || !arrivalDatetime || !totalCapacity) {
      return res.status(400).json({ error: 'trainId, destinationCityId, departureDatetime, arrivalDatetime, and totalCapacity are required' });
    }

    const [result] = await db.query(
      `INSERT INTO train_trip (train_id, destination_city_id, departure_datetime, arrival_datetime, total_capacity, status)
       VALUES (?, ?, ?, ?, ?, 'Scheduled')`,
      [trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity]
    );
    res.status(201).json({ tripId: result.insertId });
  } catch (err) {
    next(err);
  }
});

// List trips (with joined train and city details, plus capacity usage)
router.get('/train-trips', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
  try {
    const { destinationCityId, status } = req.query;
    let query = `
      SELECT tt.trip_id, tt.train_id, tt.destination_city_id, tt.departure_datetime,
             tt.arrival_datetime, tt.total_capacity, tt.status,
             c.name AS destination_city, t.name AS train_name,
             COALESCE(SUM(ca.allocated_quantity), 0) AS used_capacity,
             (tt.total_capacity - COALESCE(SUM(ca.allocated_quantity), 0)) AS remaining_capacity
      FROM train_trip tt
      JOIN city c ON tt.destination_city_id = c.city_id
      JOIN train t ON tt.train_id = t.train_id
      LEFT JOIN cargo_allocation ca ON ca.trip_id = tt.trip_id
      WHERE 1=1
    `;
    const params = [];

    if (destinationCityId) {
      query += ' AND tt.destination_city_id = ?';
      params.push(destinationCityId);
    }
    if (status) {
      query += ' AND tt.status = ?';
      params.push(status);
    }

    query += ' GROUP BY tt.trip_id ORDER BY tt.departure_datetime';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get a specific trip and its cargo allocations
router.get('/train-trips/:id', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
  try {
    const tripId = Number(req.params.id);
    const [[trip]] = await db.query(
      `SELECT tt.*, c.name AS destination_city, t.name AS train_name
       FROM train_trip tt
       JOIN city c ON tt.destination_city_id = c.city_id
       JOIN train t ON tt.train_id = t.train_id
       WHERE tt.trip_id = ?`,
      [tripId]
    );
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const [allocations] = await db.query(
      `SELECT ca.*, oi.order_id, oi.product_id, p.name AS product_name, p.space_consumption_rate
       FROM cargo_allocation ca
       JOIN order_item oi ON ca.order_item_id = oi.order_item_id
       JOIN product p ON oi.product_id = p.product_id
       WHERE ca.trip_id = ?`,
      [tripId]
    );

    const [capRows] = await db.query(
      'SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?',
      [tripId]
    );
    const usedCapacity = Number(capRows[0].used);
    const remainingCapacity = Number(trip.total_capacity) - usedCapacity;

    res.json({ trip, allocations, usedCapacity, remainingCapacity });
  } catch (err) {
    next(err);
  }
});

// Allocate ONE order item's quantity to a trip — uses transaction + FOR UPDATE lock (REQ-RAIL-03, REQ-RAIL-04)
router.post('/train-trips/:id/allocate', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { orderItemId, quantity } = req.body;
    const tripId = Number(req.params.id);

    if (!orderItemId || !quantity || quantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'orderItemId and positive quantity are required' });
    }

    // Lock the trip row so no other request can allocate concurrently
    const [tripRows] = await connection.query(
      'SELECT * FROM train_trip WHERE trip_id = ? FOR UPDATE',
      [tripId]
    );
    const trip = tripRows[0];
    if (!trip) {
      await connection.rollback();
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.status !== 'Scheduled') {
      await connection.rollback();
      return res.status(400).json({ error: `Cannot allocate to a trip with status '${trip.status}'` });
    }

    const [allocatedRows] = await connection.query(
      'SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?',
      [tripId]
    );
    const usedCapacity = Number(allocatedRows[0].used);
    const remaining = Number(trip.total_capacity) - usedCapacity;

    if (quantity > remaining) {
      await connection.rollback();
      return res.status(400).json({
        error: `Not enough capacity. Only ${remaining} remaining.`,
        remaining,
        insufficientCapacity: true
      });
    }

    const [allocResult] = await connection.query(
      'INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status) VALUES (?, ?, ?, ?)',
      [orderItemId, tripId, quantity, 'Not Loaded']
    );

    // Advance parent order from Placed to Scheduled (REQ-ORD-05)
    await connection.query(
      `UPDATE \`order\` SET status = 'Scheduled'
       WHERE order_id = (SELECT order_id FROM order_item WHERE order_item_id = ?)
         AND status = 'Placed'`,
      [orderItemId]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Allocated successfully',
      cargoAllocationId: allocResult.insertId,
      allocatedQuantity: quantity,
      remainingCapacity: remaining - quantity
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// Automatic overflow allocation across multiple trips — REQ-RAIL-05
router.post('/train-trips/:id/allocate-overflow', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { orderItemId, quantity } = req.body;
    const startTripId = Number(req.params.id);

    if (!orderItemId || !quantity || quantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'orderItemId and positive quantity are required' });
    }

    const [[startTrip]] = await connection.query(
      'SELECT destination_city_id, departure_datetime FROM train_trip WHERE trip_id = ?',
      [startTripId]
    );
    if (!startTrip) {
      await connection.rollback();
      return res.status(404).json({ error: 'Initial trip not found' });
    }

    let remainingQty = quantity;
    let curTripId = startTripId;
    let curDeparture = startTrip.departure_datetime;
    const destCityId = startTrip.destination_city_id;
    const allocationsMade = [];

    while (remainingQty > 0) {
      const [[trip]] = await connection.query(
        'SELECT trip_id, total_capacity, status FROM train_trip WHERE trip_id = ? FOR UPDATE',
        [curTripId]
      );

      if (trip && trip.status === 'Scheduled') {
        const [[usedRow]] = await connection.query(
          'SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?',
          [curTripId]
        );
        const available = Math.max(0, Math.floor(Number(trip.total_capacity) - Number(usedRow.used)));
        const toAllocate = Math.min(remainingQty, available);

        if (toAllocate > 0) {
          const [ins] = await connection.query(
            'INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status) VALUES (?, ?, ?, ?)',
            [orderItemId, curTripId, toAllocate, 'Not Loaded']
          );
          remainingQty -= toAllocate;
          allocationsMade.push({
            cargoAllocationId: ins.insertId,
            tripId: curTripId,
            allocatedQuantity: toAllocate,
            isOverflow: curTripId !== startTripId
          });

          // Log overflow hop to audit_log (REQ-RAIL-05)
          if (curTripId !== startTripId) {
            await connection.query(
              `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
               VALUES (?, 'Cargo overflow allocation', 'cargo_allocation', ?, ?)`,
              [
                req.user?.userId || null,
                ins.insertId,
                `order_item_id=${orderItemId} overflowed from trip ${startTripId} -> trip ${curTripId}, qty=${toAllocate}`
              ]
            );
          }
        }
      }

      if (remainingQty > 0) {
        const [nextTrips] = await connection.query(
          `SELECT trip_id, departure_datetime
           FROM train_trip
           WHERE destination_city_id = ?
             AND status = 'Scheduled'
             AND departure_datetime > ?
           ORDER BY departure_datetime ASC
           LIMIT 1`,
          [destCityId, curDeparture]
        );

        if (nextTrips.length === 0) {
          break; // No further scheduled trips
        }
        curTripId = nextTrips[0].trip_id;
        curDeparture = nextTrips[0].departure_datetime;
      }
    }

    if (allocationsMade.length > 0) {
      await connection.query(
        `UPDATE \`order\` SET status = 'Scheduled'
         WHERE order_id = (SELECT order_id FROM order_item WHERE order_item_id = ?)
           AND status = 'Placed'`,
        [orderItemId]
      );
    }

    await connection.commit();
    res.status(201).json({
      message: remainingQty === 0 ? 'Allocated in full across trip(s)' : `Partially allocated. ${remainingQty} units could not be accommodated.`,
      allocations: allocationsMade,
      unallocatedQuantity: remainingQty
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// Dispatcher updates loading status for an allocation — REQ-RAIL-06
router.put('/allocations/:id/loading-status', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  try {
    const { status } = req.body; // 'Not Loaded' | 'Partially Loaded' | 'Loaded'
    const allocId = Number(req.params.id);

    if (!['Not Loaded', 'Partially Loaded', 'Loaded'].includes(status)) {
      return res.status(400).json({ error: "status must be 'Not Loaded', 'Partially Loaded', or 'Loaded'" });
    }

    const [[allocRow]] = await db.query(
      'SELECT order_item_id, trip_id FROM cargo_allocation WHERE cargo_allocation_id = ?',
      [allocId]
    );
    if (!allocRow) return res.status(404).json({ error: 'Allocation not found' });

    await db.query('UPDATE cargo_allocation SET status = ? WHERE cargo_allocation_id = ?', [status, allocId]);

    // Update customer-facing order_item status — REQ-DEL-05
    if (status === 'Loaded') {
      await db.query("UPDATE order_item SET status = 'Out for Delivery' WHERE order_item_id = ?", [allocRow.order_item_id]);
    }

    // Check if every allocation on this trip is Loaded; if so, lock trip manifest and cascade order status — REQ-ORD-05, REQ-RAIL-06
    const tripId = allocRow.trip_id;
    const [remaining] = await db.query(
      "SELECT COUNT(*) AS cnt FROM cargo_allocation WHERE trip_id = ? AND status != 'Loaded'",
      [tripId]
    );

    let tripLocked = false;
    if (remaining[0].cnt === 0) {
      await db.query("UPDATE train_trip SET status = 'Loaded' WHERE trip_id = ?", [tripId]);
      await db.query(
        `UPDATE \`order\` SET status = 'In Transit'
         WHERE order_id IN (
           SELECT oi.order_id FROM order_item oi
           JOIN cargo_allocation ca ON ca.order_item_id = oi.order_item_id
           WHERE ca.trip_id = ?
         ) AND status = 'Scheduled'`,
        [tripId]
      );
      tripLocked = true;
    }

    res.json({ message: 'Loading status updated', tripLocked });
  } catch (err) {
    next(err);
  }
});

// Platform loading shortfall requeue — REQ-RAIL-07
router.post('/allocations/:id/shortfall', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const allocId = Number(req.params.id);
    const { unloadedQuantity } = req.body;

    if (!unloadedQuantity || unloadedQuantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'unloadedQuantity must be greater than 0' });
    }

    const [[alloc]] = await connection.query(
      `SELECT ca.*, tt.destination_city_id, tt.departure_datetime
       FROM cargo_allocation ca
       JOIN train_trip tt ON ca.trip_id = tt.trip_id
       WHERE ca.cargo_allocation_id = ?`,
      [allocId]
    );
    if (!alloc) {
      await connection.rollback();
      return res.status(404).json({ error: 'Allocation not found' });
    }

    if (unloadedQuantity >= alloc.allocated_quantity) {
      await connection.rollback();
      return res.status(400).json({ error: 'unloadedQuantity cannot exceed or equal full allocated quantity' });
    }

    // Reduce current allocation and mark loaded
    const newQty = alloc.allocated_quantity - unloadedQuantity;
    await connection.query(
      'UPDATE cargo_allocation SET allocated_quantity = ?, status = ? WHERE cargo_allocation_id = ?',
      [newQty, 'Loaded', allocId]
    );

    // Find next available scheduled trip for the destination city
    const [nextTrips] = await connection.query(
      `SELECT trip_id FROM train_trip
       WHERE destination_city_id = ?
         AND status = 'Scheduled'
         AND departure_datetime > ?
       ORDER BY departure_datetime ASC
       LIMIT 1`,
      [alloc.destination_city_id, alloc.departure_datetime]
    );

    if (nextTrips.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'No subsequent scheduled train trip available to queue shortfall' });
    }

    const nextTripId = nextTrips[0].trip_id;
    const [ins] = await connection.query(
      'INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status) VALUES (?, ?, ?, ?)',
      [alloc.order_item_id, nextTripId, unloadedQuantity, 'Not Loaded']
    );

    // Log physical shortfall requeue to audit_log
    await connection.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Physical loading shortfall requeued', 'cargo_allocation', ?, ?)`,
      [
        req.user?.userId || null,
        ins.insertId,
        `order_item_id=${alloc.order_item_id} shortfall of ${unloadedQuantity} from trip ${alloc.trip_id} -> next trip ${nextTripId}`
      ]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Shortfall requeued to next trip',
      requeuedAllocationId: ins.insertId,
      nextTripId,
      requeuedQuantity: unloadedQuantity
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

module.exports = router;
