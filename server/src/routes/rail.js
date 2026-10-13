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

    const operatorUserId = req.user?.user_id || req.user?.userId || null;
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Created train trip schedule', 'train_trip', ?, ?)`,
      [
        operatorUserId,
        result.insertId,
        `train_id=${trainId}, dest_city_id=${destinationCityId}, cap=${totalCapacity}, dep=${departureDatetime}, arr=${arrivalDatetime}`
      ]
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
             COALESCE(ca.used_capacity, 0) AS used_capacity,
             (tt.total_capacity - COALESCE(ca.used_capacity, 0)) AS remaining_capacity
      FROM train_trip tt
      JOIN city c ON tt.destination_city_id = c.city_id
      JOIN train t ON tt.train_id = t.train_id
      LEFT JOIN (
        SELECT trip_id, SUM(allocated_quantity) AS used_capacity
        FROM cargo_allocation
        GROUP BY trip_id
      ) ca ON ca.trip_id = tt.trip_id
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

    query += ' ORDER BY tt.departure_datetime';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get a specific trip and its cargo allocations (including overflown and sibling part states)
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
      `SELECT ca.*, oi.order_id, oi.product_id, p.name AS product_name, p.space_consumption_rate,
              u.name AS customer_name, o.delivery_address, r.name AS route_name
       FROM cargo_allocation ca
       JOIN order_item oi ON ca.order_item_id = oi.order_item_id
       JOIN \`order\` o ON oi.order_id = o.order_id
       JOIN \`user\` u ON o.customer_id = u.user_id
       LEFT JOIN route r ON o.route_id = r.route_id
       JOIN product p ON oi.product_id = p.product_id
       WHERE ca.trip_id = ?
       ORDER BY ca.is_overflow ASC, ca.cargo_allocation_id ASC`,
      [tripId]
    );

    // Fetch sibling allocations for order items split across multiple trips
    const orderItemIds = [...new Set(allocations.map(a => a.order_item_id))];
    let allSiblings = [];
    if (orderItemIds.length > 0) {
      const [siblingRows] = await db.query(
        `SELECT ca.cargo_allocation_id, ca.order_item_id, ca.trip_id, ca.allocated_quantity,
                ca.status, ca.is_overflow, ca.parent_allocation_id,
                tt.departure_datetime, tt.arrival_datetime, tt.status AS trip_status,
                t.name AS train_name, c.name AS destination_city
         FROM cargo_allocation ca
         JOIN train_trip tt ON ca.trip_id = tt.trip_id
         JOIN train t ON tt.train_id = t.train_id
         JOIN city c ON tt.destination_city_id = c.city_id
         WHERE ca.order_item_id IN (?)
         ORDER BY tt.departure_datetime ASC, ca.cargo_allocation_id ASC`,
        [orderItemIds]
      );
      allSiblings = siblingRows;
    }

    const allocationsWithSiblings = allocations.map(a => {
      const siblings = allSiblings.filter(
        s => s.order_item_id === a.order_item_id && s.cargo_allocation_id !== a.cargo_allocation_id
      );
      return {
        ...a,
        is_overflow: Boolean(a.is_overflow),
        has_linked_parts: siblings.length > 0,
        linked_parts: siblings.map(s => ({
          ...s,
          is_overflow: Boolean(s.is_overflow)
        }))
      };
    });

    const [capRows] = await db.query(
      'SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?',
      [tripId]
    );
    const usedCapacity = Number(capRows[0].used);
    const remainingCapacity = Math.max(0, Number(trip.total_capacity) - usedCapacity);

    res.json({ trip, allocations: allocationsWithSiblings, usedCapacity, remainingCapacity });
  } catch (err) {
    next(err);
  }
});

// GET /api/rail/train-trips/:id/allotable-orders
// Shows all allotable orders matching the selected train trip's delivery path (store city = destination city)
router.get('/train-trips/:id/allotable-orders', requireAuth, requireRole([1, 2, 3]), async (req, res, next) => {
  try {
    const tripId = Number(req.params.id);
    const [[trip]] = await db.query(
      `SELECT tt.*, c.name AS destination_city
       FROM train_trip tt
       JOIN city c ON tt.destination_city_id = c.city_id
       WHERE tt.trip_id = ?`,
      [tripId]
    );
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Fetch unallocated / partially allocated order items whose delivery path corresponds to this city
    const [rows] = await db.query(
      `SELECT 
         oi.order_item_id,
         oi.order_id,
         oi.product_id,
         oi.quantity AS ordered_quantity,
         oi.status AS item_status,
         p.name AS product_name,
         p.unit_price,
         p.space_consumption_rate,
         (oi.quantity * p.space_consumption_rate) AS total_item_volume,
         COALESCE(ca_sum.total_allocated, 0) AS allocated_quantity,
         (oi.quantity - COALESCE(ca_sum.total_allocated, 0)) AS unallocated_quantity,
         o.status AS order_status,
         o.order_date,
         o.requested_delivery_date,
         o.delivery_address,
         u.name AS customer_name,
         r.name AS route_name,
         s.name AS store_name,
         c.name AS destination_city_name
       FROM order_item oi
       JOIN \`order\` o ON oi.order_id = o.order_id
       JOIN product p ON oi.product_id = p.product_id
       JOIN \`user\` u ON o.customer_id = u.user_id
       LEFT JOIN route r ON o.route_id = r.route_id
       LEFT JOIN store s ON r.store_id = s.store_id
       LEFT JOIN city c ON s.city_id = c.city_id
       LEFT JOIN (
         SELECT order_item_id, SUM(allocated_quantity) AS total_allocated
         FROM cargo_allocation
         GROUP BY order_item_id
       ) ca_sum ON oi.order_item_id = ca_sum.order_item_id
       WHERE s.city_id = ?
         AND o.status NOT IN ('Delivered', 'Cancelled')
         AND (oi.quantity - COALESCE(ca_sum.total_allocated, 0)) > 0
       ORDER BY o.requested_delivery_date ASC, o.order_id ASC`,
      [trip.destination_city_id]
    );

    // Also fetch any existing partial/overflown allocations for these items
    const itemIds = rows.map(r => r.order_item_id);
    let itemAllocations = [];
    if (itemIds.length > 0) {
      const [allocRows] = await db.query(
        `SELECT ca.cargo_allocation_id, ca.order_item_id, ca.trip_id, ca.allocated_quantity,
                ca.status, ca.is_overflow, ca.parent_allocation_id,
                tt.departure_datetime, t.name AS train_name, c.name AS destination_city
         FROM cargo_allocation ca
         JOIN train_trip tt ON ca.trip_id = tt.trip_id
         JOIN train t ON tt.train_id = t.train_id
         JOIN city c ON tt.destination_city_id = c.city_id
         WHERE ca.order_item_id IN (?)
         ORDER BY tt.departure_datetime ASC`,
        [itemIds]
      );
      itemAllocations = allocRows;
    }

    const allotableOrders = rows.map(r => ({
      ...r,
      unallocated_volume: Number((r.unallocated_quantity * r.space_consumption_rate).toFixed(2)),
      existing_allocations: itemAllocations
        .filter(a => a.order_item_id === r.order_item_id)
        .map(a => ({
          ...a,
          is_overflow: Boolean(a.is_overflow)
        }))
    }));

    res.json({
      tripId,
      destinationCityId: trip.destination_city_id,
      destinationCity: trip.destination_city,
      count: allotableOrders.length,
      orders: allotableOrders
    });
  } catch (err) {
    next(err);
  }
});

// Allocate ONE order item's quantity to a trip — uses Member C stored procedure sp_allocate_cargo (REQ-RAIL-03, REQ-RAIL-04) with app-level fallback
router.post('/train-trips/:id/allocate', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { orderItemId, quantity, isOverflow = false, parentAllocationId = null } = req.body;
    const tripId = Number(req.params.id);

    if (!orderItemId || !quantity || quantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'orderItemId and positive quantity are required' });
    }

    let procedureHandled = false;
    let allocInsertId = null;
    let remainingCapacity = 0;

    // 1. Attempt to execute Member C's stored procedure: sp_allocate_cargo
    try {
      await connection.query('CALL sp_allocate_cargo(?, ?, ?, @p_status)', [orderItemId, tripId, quantity]);
      const [[spOut]] = await connection.query('SELECT @p_status AS status, LAST_INSERT_ID() AS insertId');
      const spStatus = spOut?.status;

      if (spStatus) {
        procedureHandled = true;
        if (spStatus === 'TRIP_NOT_FOUND') {
          await connection.rollback();
          return res.status(404).json({ error: 'Trip not found' });
        }
        if (spStatus === 'TRIP_NOT_SCHEDULABLE') {
          await connection.rollback();
          return res.status(400).json({ error: "Cannot allocate to a trip with status not 'Scheduled'" });
        }
        if (spStatus === 'INSUFFICIENT_CAPACITY') {
          const [[tripRow]] = await connection.query('SELECT total_capacity FROM train_trip WHERE trip_id = ?', [tripId]);
          const [[usedRow]] = await connection.query('SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?', [tripId]);
          const rem = Math.max(0, Number(tripRow?.total_capacity || 0) - Number(usedRow?.used || 0));
          await connection.rollback();
          return res.status(400).json({
            error: `Not enough capacity. Only ${rem} remaining on this trip.`,
            remaining: rem,
            insufficientCapacity: true
          });
        }
        if (spStatus === 'OK') {
          allocInsertId = spOut.insertId;
          if (isOverflow || parentAllocationId) {
            await connection.query(
              'UPDATE cargo_allocation SET is_overflow = ?, parent_allocation_id = ? WHERE cargo_allocation_id = ?',
              [isOverflow ? 1 : 0, parentAllocationId || null, allocInsertId]
            );
          }
          const [[tripRow]] = await connection.query('SELECT total_capacity FROM train_trip WHERE trip_id = ?', [tripId]);
          const [[usedRow]] = await connection.query('SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?', [tripId]);
          remainingCapacity = Math.max(0, Number(tripRow?.total_capacity || 0) - Number(usedRow?.used || 0));
        }
      }
    } catch (spErr) {
      // Procedure not installed or not supported (e.g. distributed DB without SP support)
      procedureHandled = false;
    }

    // 2. Application-layer fallback if procedure is not present
    if (!procedureHandled) {
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
          error: `Not enough capacity. Only ${remaining} remaining on this trip.`,
          remaining,
          insufficientCapacity: true
        });
      }

      const [allocResult] = await connection.query(
        'INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status, is_overflow, parent_allocation_id) VALUES (?, ?, ?, ?, ?, ?)',
        [orderItemId, tripId, quantity, 'Not Loaded', isOverflow ? 1 : 0, parentAllocationId || null]
      );

      await connection.query(
        `UPDATE \`order\` SET status = 'Scheduled'
         WHERE order_id = (SELECT order_id FROM order_item WHERE order_item_id = ?)
           AND status = 'Placed'`,
        [orderItemId]
      );

      allocInsertId = allocResult.insertId;
      remainingCapacity = remaining - quantity;
    }

    await connection.commit();
    res.status(201).json({
      message: 'Allocated successfully',
      cargoAllocationId: allocInsertId,
      allocatedQuantity: quantity,
      remainingCapacity,
      isOverflow: Boolean(isOverflow)
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// Automatic overflow allocation across multiple trips — uses Member C stored procedure sp_overflow_allocate (REQ-RAIL-05) with app-level fallback
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
      'SELECT destination_city_id, departure_datetime, status FROM train_trip WHERE trip_id = ?',
      [startTripId]
    );
    if (!startTrip) {
      await connection.rollback();
      return res.status(404).json({ error: 'Initial trip not found' });
    }
    if (startTrip.status !== 'Scheduled') {
      await connection.rollback();
      return res.status(400).json({ error: `Cannot allocate to a trip with status '${startTrip.status}'` });
    }

    let procedureHandled = false;
    let allocationsMade = [];
    let remainingQty = quantity;

    // 1. Attempt to invoke Member C's stored procedure: sp_overflow_allocate
    try {
      const [beforeRows] = await connection.query(
        'SELECT cargo_allocation_id FROM cargo_allocation WHERE order_item_id = ?',
        [orderItemId]
      );
      const existingIds = new Set(beforeRows.map(r => r.cargo_allocation_id));

      await connection.query('CALL sp_overflow_allocate(?, ?, ?)', [orderItemId, startTripId, quantity]);

      const [afterRows] = await connection.query(
        `SELECT cargo_allocation_id, trip_id, allocated_quantity
         FROM cargo_allocation
         WHERE order_item_id = ?
         ORDER BY cargo_allocation_id ASC`,
        [orderItemId]
      );

      const newRows = afterRows.filter(r => !existingIds.has(r.cargo_allocation_id));
      if (newRows.length > 0) {
        procedureHandled = true;
        const firstAllocId = newRows[0].cargo_allocation_id;
        for (let i = 0; i < newRows.length; i++) {
          const alloc = newRows[i];
          const isOverflow = (alloc.trip_id !== startTripId) || (i > 0);
          if (isOverflow) {
            await connection.query(
              'UPDATE cargo_allocation SET is_overflow = 1, parent_allocation_id = ? WHERE cargo_allocation_id = ?',
              [firstAllocId, alloc.cargo_allocation_id]
            );
          }
          allocationsMade.push({
            cargoAllocationId: alloc.cargo_allocation_id,
            tripId: alloc.trip_id,
            allocatedQuantity: alloc.allocated_quantity,
            isOverflow
          });
        }
        const totalAllocated = allocationsMade.reduce((sum, a) => sum + Number(a.allocatedQuantity), 0);
        remainingQty = Math.max(0, quantity - totalAllocated);
      }
    } catch (spErr) {
      procedureHandled = false;
      allocationsMade = [];
      remainingQty = quantity;
    }

    // 2. Application-layer fallback if procedure is not present
    if (!procedureHandled) {
      let curTripId = startTripId;
      let curDeparture = startTrip.departure_datetime;
      const destCityId = startTrip.destination_city_id;
      let firstAllocationId = null;

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
            const isOverflow = (curTripId !== startTripId) || (allocationsMade.length > 0);
            const [ins] = await connection.query(
              'INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity, status, is_overflow, parent_allocation_id) VALUES (?, ?, ?, ?, ?, ?)',
              [orderItemId, curTripId, toAllocate, 'Not Loaded', isOverflow ? 1 : 0, firstAllocationId]
            );

            if (!firstAllocationId) {
              firstAllocationId = ins.insertId;
            }

            remainingQty -= toAllocate;
            allocationsMade.push({
              cargoAllocationId: ins.insertId,
              tripId: curTripId,
              allocatedQuantity: toAllocate,
              isOverflow
            });

            // Log overflow hop to audit_log (REQ-RAIL-05)
            if (isOverflow) {
              const operatorUserId = req.user?.user_id || req.user?.userId || null;
              await connection.query(
                `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
                 VALUES (?, 'Cargo overflow allocation', 'cargo_allocation', ?, ?)`,
                [
                  operatorUserId,
                  ins.insertId,
                  `order_item_id=${orderItemId} overflowed to trip ${curTripId}, qty=${toAllocate} (parent_allocation_id=${firstAllocationId})`
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
    }

    await connection.commit();
    res.status(201).json({
      message: remainingQty === 0 
        ? (allocationsMade.length > 1 ? `Allocated across ${allocationsMade.length} trips with overflow!` : 'Allocated in full to trip!') 
        : `Partially allocated across trips. ${remainingQty} units could not be accommodated (no further trips).`,
      allocations: allocationsMade,
      unallocatedQuantity: remainingQty,
      hasOverflow: allocationsMade.some(a => a.isOverflow)
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// Remove an un-loaded cargo allocation (undo action)
router.delete('/allocations/:id', requireAuth, requireRole([1, 2]), async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const allocId = Number(req.params.id);
    const [[alloc]] = await connection.query('SELECT * FROM cargo_allocation WHERE cargo_allocation_id = ?', [allocId]);
    if (!alloc) {
      await connection.rollback();
      return res.status(404).json({ error: 'Allocation not found' });
    }
    if (alloc.status === 'Loaded') {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot remove an allocation that is already Loaded.' });
    }

    await connection.query('DELETE FROM cargo_allocation WHERE cargo_allocation_id = ?', [allocId]);

    // Check if parent order still has other allocations
    const [[otherAllocs]] = await connection.query(
      `SELECT COUNT(*) AS cnt FROM cargo_allocation ca
       JOIN order_item oi ON ca.order_item_id = oi.order_item_id
       WHERE oi.order_id = (SELECT order_id FROM order_item WHERE order_item_id = ?)`,
      [alloc.order_item_id]
    );
    if (otherAllocs.cnt === 0) {
      await connection.query(
        `UPDATE \`order\` SET status = 'Placed'
         WHERE order_id = (SELECT order_id FROM order_item WHERE order_item_id = ?)`,
        [alloc.order_item_id]
      );
    }

    await connection.commit();
    res.json({ message: 'Allocation removed and returned to allotable inventory' });
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

      const operatorUserId = req.user?.user_id || req.user?.userId || null;
      await db.query(
        `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
         VALUES (?, 'Manifest fully loaded and locked', 'train_trip', ?, ?)`,
        [
          operatorUserId,
          tripId,
          `Trip #${tripId} all allocations Loaded. Manifest locked and parent orders transitioned to In Transit.`
        ]
      );
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
    const operatorUserId = req.user?.user_id || req.user?.userId || null;
    await connection.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Physical loading shortfall requeued', 'cargo_allocation', ?, ?)`,
      [
        operatorUserId,
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
