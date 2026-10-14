'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

/**
 * REQ-DEL-01: Driver & Assistant Daily Run View
 * Retrieves the truck schedule and the ordered delivery stops for a given run.
 */
router.get('/schedule/:truckScheduleId/today', requireAuth, requireRole([1, 2, 4, 5]), async (req, res) => {
  try {
    const scheduleId = Number(req.params.truckScheduleId);

    // 1. Fetch truck schedule details with route, truck, and driver info
    const [scheduleRows] = await db.query(
      `SELECT ts.truck_schedule_id,
              ts.route_id,
              r.name AS route_name,
              r.max_delivery_time_minutes,
              ts.truck_id,
              tk.plate_number,
              tk.capacity AS truck_capacity,
              ts.driver_id,
              ud.name AS driver_name,
              ts.assistant_id,
              ua.name AS assistant_name,
              ts.scheduled_date,
              ts.start_time,
              ts.end_time,
              ts.status,
              ts.pickup_confirmed_at
       FROM truck_schedule ts
       JOIN route r ON ts.route_id = r.route_id
       JOIN truck tk ON ts.truck_id = tk.truck_id
       JOIN user ud ON ts.driver_id = ud.user_id
       JOIN user ua ON ts.assistant_id = ua.user_id
       WHERE ts.truck_schedule_id = ?`,
      [scheduleId]
    );

    if (!scheduleRows || scheduleRows.length === 0) {
      return res.status(404).json({ error: `Truck schedule #${scheduleId} not found.` });
    }

    const schedule = scheduleRows[0];
    const roleId = req.user?.role_id || req.user?.roleId;
    const currentUserId = req.user?.user_id || req.user?.userId;

    // Strict access control: Drivers (4) and Assistants (5) can ONLY view schedules they are assigned to
    if ((roleId === 4 || roleId === 5) && schedule.driver_id !== currentUserId && schedule.assistant_id !== currentUserId) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to this delivery run.' });
    }

    // 2. Fetch all allocations/stops for this run ordered by stop_order ASC
    const [allocations] = await db.query(
      `SELECT ta.truck_allocation_id,
              ta.truck_schedule_id,
              ta.order_id,
              ta.route_stop_id,
              rs.stop_name,
              rs.stop_order,
              o.delivery_address,
              o.total_volume,
              o.status AS order_status,
              u.name AS customer_name,
              c.phone AS customer_phone,
              ta.delivery_status,
              ta.delivered_at,
              ta.delivery_note
       FROM truck_allocation ta
       JOIN \`order\` o ON ta.order_id = o.order_id
       JOIN user u ON o.customer_id = u.user_id
       LEFT JOIN customer c ON o.customer_id = c.user_id
       JOIN route_stop rs ON ta.route_stop_id = rs.route_stop_id
       WHERE ta.truck_schedule_id = ?
       ORDER BY rs.stop_order ASC`,
      [scheduleId]
    );

    res.json({
      schedule: scheduleRows[0],
      stops: allocations || []
    });
  } catch (err) {
    console.error('Error fetching today delivery run:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve delivery run.' });
  }
});

/**
 * REQ-DEL-02: Store Dispatch & Pickup Confirmation
 * The driver/assistant confirms pickup of loaded goods from the store before departure.
 */
router.put('/schedule/:truckScheduleId/pickup', requireAuth, requireRole([1, 2, 4, 5]), async (req, res) => {
  try {
    const scheduleId = Number(req.params.truckScheduleId);

    // Verify schedule exists and fetch driver/assistant IDs
    const [scheduleRows] = await db.query(
      'SELECT truck_schedule_id, status, driver_id, assistant_id, pickup_confirmed_at FROM truck_schedule WHERE truck_schedule_id = ?',
      [scheduleId]
    );

    if (!scheduleRows || scheduleRows.length === 0) {
      return res.status(404).json({ error: `Truck schedule #${scheduleId} not found.` });
    }

    const roleId = req.user?.role_id || req.user?.roleId;
    const currentUserId = req.user?.user_id || req.user?.userId;
    if ((roleId === 4 || roleId === 5) && scheduleRows[0].driver_id !== currentUserId && scheduleRows[0].assistant_id !== currentUserId) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to this delivery run.' });
    }

    if (scheduleRows[0].pickup_confirmed_at) {
      return res.status(400).json({ error: 'Pickup has already been confirmed for this run.' });
    }

    const now = new Date();
    await db.query(
      'UPDATE truck_schedule SET pickup_confirmed_at = NOW(), status = "In Progress" WHERE truck_schedule_id = ?',
      [scheduleId]
    );

    const operatorUserId = req.user?.user_id || req.user?.userId || null;
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Confirmed store pickup', 'truck_schedule', ?, ?)`,
      [
        operatorUserId,
        scheduleId,
        `run #${scheduleId} pickup confirmed from store. Status changed to In Progress.`
      ]
    );

    res.json({
      message: 'Pickup confirmed from store. Delivery run is now In Progress.',
      truckScheduleId: scheduleId,
      status: 'In Progress',
      pickupConfirmedAt: now
    });
  } catch (err) {
    console.error('Error confirming store pickup:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm pickup.' });
  }
});

/**
 * REQ-DEL-03, REQ-DEL-04, REQ-DEL-05: Record Delivery Outcome per Stop
 * - Validates that store pickup has been confirmed (REQ-DEL-02 guard).
 * - Updates stop outcome ('Delivered' or 'Failed') and delivery note (REQ-DEL-03).
 * - On 'Delivered': Advances `order` and `order_item` status to 'Delivered' (REQ-DEL-05).
 * - On 'Failed': Automatically re-queues order to next scheduled run on same route (REQ-DEL-04).
 */
router.put('/allocations/:allocationId', requireAuth, requireRole([1, 2, 4, 5]), async (req, res) => {
  try {
    const allocationId = Number(req.params.allocationId);
    const { deliveryStatus, note } = req.body;

    if (!deliveryStatus || !['Delivered', 'Failed', 'Attempted'].includes(deliveryStatus)) {
      return res.status(400).json({ error: 'deliveryStatus must be "Delivered", "Failed", or "Attempted".' });
    }

    // 1. Fetch allocation and verify store pickup confirmation + staff authorization
    const [allocRows] = await db.query(
      `SELECT ta.*, ts.driver_id, ts.assistant_id, ts.pickup_confirmed_at, ts.route_id, ts.scheduled_date, ts.status AS schedule_status, o.customer_id
       FROM truck_allocation ta
       JOIN truck_schedule ts ON ta.truck_schedule_id = ts.truck_schedule_id
       JOIN \`order\` o ON ta.order_id = o.order_id
       WHERE ta.truck_allocation_id = ?`,
      [allocationId]
    );

    if (!allocRows || allocRows.length === 0) {
      return res.status(404).json({ error: `Truck allocation #${allocationId} not found.` });
    }

    const alloc = allocRows[0];
    const roleId = req.user?.role_id || req.user?.roleId;
    const currentUserId = req.user?.user_id || req.user?.userId;

    if ((roleId === 4 || roleId === 5) && alloc.driver_id !== currentUserId && alloc.assistant_id !== currentUserId) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to this delivery run.' });
    }

    // Role Guard: Only assigned driver/assistant or Admin can record delivery outcomes
    if (req.user.roleId !== 1 &&
        req.user.userId !== alloc.driver_id &&
        req.user.userId !== alloc.assistant_id) {
      return res.status(403).json({ error: 'You are not authorized to update stops for this run.' });
    }

    // REQ-DEL-02 Enforcement: Cannot record deliveries before store pickup
    if (!alloc.pickup_confirmed_at) {
      return res.status(400).json({
        error: 'Store pickup must be confirmed before recording deliveries.'
      });
    }

    // Stop Sequence Check: Check if there is an earlier stop still Pending
    const [priorPendingStops] = await db.query(
      `SELECT ta.truck_allocation_id, rs.stop_name, rs.stop_order
       FROM truck_allocation ta
       JOIN route_stop rs ON ta.route_stop_id = rs.route_stop_id
       JOIN route_stop current_rs ON current_rs.route_stop_id = ?
       WHERE ta.truck_schedule_id = ?
         AND ta.truck_allocation_id != ?
         AND rs.stop_order < current_rs.stop_order
         AND ta.delivery_status = 'Pending'
       ORDER BY rs.stop_order ASC LIMIT 1`,
      [alloc.route_stop_id, alloc.truck_schedule_id, allocationId]
    );

    if (priorPendingStops && priorPendingStops.length > 0) {
      return res.status(400).json({
        error: `Please complete earlier stop #${priorPendingStops[0].stop_order} (${priorPendingStops[0].stop_name}) first to maintain the delivery sequence.`
      });
    }

    // 2. Update truck allocation record with delivery note / proof
    await db.query(
      'UPDATE truck_allocation SET delivery_status = ?, delivery_note = ?, delivered_at = NOW() WHERE truck_allocation_id = ?',
      [deliveryStatus, note || null, allocationId]
    );

    const operatorUserId = req.user?.user_id || req.user?.userId || 1;
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Recorded delivery outcome', 'truck_allocation', ?, ?)`,
      [operatorUserId, allocationId, `Status: ${deliveryStatus}, Order #${alloc.order_id}, Note: ${note || 'None'}`]
    );

    let reallocatedScheduleId = null;

    // 3. REQ-DEL-05: If Delivered, update order and order items to 'Delivered'
    if (deliveryStatus === 'Delivered') {
      //await db.query('UPDATE `order` SET status = "Delivered" WHERE order_id = ?', [alloc.order_id]);
      await db.query('UPDATE `order` SET status = "Delivered", delivered_at = NOW() WHERE order_id = ?', [alloc.order_id]);
      await db.query('UPDATE order_item SET status = "Delivered" WHERE order_id = ?', [alloc.order_id]);
      
      // Notify customer
      await createNotification(alloc.customer_id, 'Delivery', `Your order #${alloc.order_id} has been delivered successfully!`);
    }

    // 4. REQ-DEL-04: If Failed, automatically re-queue onto next available scheduled run on the same route
    if (deliveryStatus === 'Failed') {
      const [nextRuns] = await db.query(
        `SELECT truck_schedule_id, scheduled_date
         FROM truck_schedule
         WHERE route_id = ? AND scheduled_date > ? AND status = "Scheduled"
         ORDER BY scheduled_date ASC LIMIT 1`,
        [alloc.route_id, alloc.scheduled_date]
      );

      if (nextRuns && nextRuns.length > 0) {
        reallocatedScheduleId = nextRuns[0].truck_schedule_id;
        await db.query(
          'INSERT INTO truck_allocation (truck_schedule_id, order_id, route_stop_id, delivery_status) VALUES (?, ?, ?, "Pending")',
          [reallocatedScheduleId, alloc.order_id, alloc.route_stop_id]
        );
        console.log(`[Re-queue REQ-DEL-04] Order #${alloc.order_id} failed and re-queued to schedule #${reallocatedScheduleId} on ${nextRuns[0].scheduled_date}`);
        
        await createNotification(alloc.customer_id, 'Delivery Alert', `Delivery for order #${alloc.order_id} failed: ${note || 'Reason logged'}. It has been rescheduled to ${nextRuns[0].scheduled_date}.`);
      } else {
        console.warn(`[Re-queue REQ-DEL-04] Order #${alloc.order_id} failed, but no future Scheduled runs found on route #${alloc.route_id}. Flagged for Dispatcher review.`);
        
        await createNotification(alloc.customer_id, 'Delivery Alert', `Delivery for order #${alloc.order_id} failed: ${note || 'Reason logged'}. Our dispatcher will contact you soon.`);
      }
    }

    // 5. REQ-DEL-03: If Attempted, record attempt without re-queuing immediately (retained on current manifest with note)
    if (deliveryStatus === 'Attempted') {
      await createNotification(
        alloc.customer_id,
        'Delivery Attempted',
        `A delivery attempt was made for order #${alloc.order_id}: ${note || 'Delivery attempted but could not be completed'}.`
      );
    }

    // Check remaining stops to notify if run is ready to complete
    const [remainingPending] = await db.query(
      'SELECT COUNT(*) as count FROM truck_allocation WHERE truck_schedule_id = ? AND delivery_status = "Pending"',
      [alloc.truck_schedule_id]
    );
    const pendingCount = remainingPending[0]?.count || 0;

    res.json({
      message: 'Delivery outcome recorded successfully.',
      allocationId,
      deliveryStatus,
      deliveredAt: new Date(),
      reallocatedScheduleId,
      remainingStops: pendingCount,
      allStopsFinished: pendingCount === 0
    });
  } catch (err) {
    console.error('Error updating delivery outcome:', err);
    res.status(500).json({ error: err.message || 'Failed to update delivery outcome.' });
  }
});

/**
 * REQ-DEL-01 & REQ-SCHED-04: Complete Run & Log Actual Working Hours
 * Marks the truck run as Completed and inserts into roster_log for actual hour tracking.
 */
router.put('/schedule/:truckScheduleId/complete', requireAuth, requireRole([1, 2, 4, 5]), async (req, res) => {
  try {
    const scheduleId = Number(req.params.truckScheduleId);
    let { actualStartTime, actualEndTime } = req.body;

    const [scheduleRows] = await db.query(
      'SELECT truck_schedule_id, scheduled_date, start_time, end_time, status, driver_id, assistant_id, pickup_confirmed_at FROM truck_schedule WHERE truck_schedule_id = ?',
      [scheduleId]
    );

    if (!scheduleRows || scheduleRows.length === 0) {
      return res.status(404).json({ error: `Truck schedule #${scheduleId} not found.` });
    }

    const schedule = scheduleRows[0];
    const roleId = req.user?.role_id || req.user?.roleId;
    const currentUserId = req.user?.user_id || req.user?.userId;
    if ((roleId === 4 || roleId === 5) && schedule.driver_id !== currentUserId && schedule.assistant_id !== currentUserId) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to this delivery run.' });
    }

    // Role Guard: Only assigned driver/assistant or Admin can complete the run
    if (req.user.roleId !== 1 &&
        req.user.userId !== schedule.driver_id &&
        req.user.userId !== schedule.assistant_id) {
      return res.status(403).json({ error: 'You are not authorized to complete this run.' });
    }

    // Cannot complete a run that never confirmed pickup
    if (!schedule.pickup_confirmed_at) {
      return res.status(400).json({ error: 'Cannot complete a run that never confirmed pickup from the store.' });
    }

    // All stops must be resolved before completing the run (Guide line 1853-1859)
    const [pendingRows] = await db.query(
      'SELECT COUNT(*) AS cnt FROM truck_allocation WHERE truck_schedule_id = ? AND delivery_status = "Pending"',
      [scheduleId]
    );
    if (pendingRows && pendingRows[0]?.cnt > 0) {
      return res.status(400).json({
        error: `All stops must be resolved (Delivered, Failed, or Attempted) before completing the run. ${pendingRows[0].cnt} stop(s) still pending.`
      });
    }

    // Fallbacks if timestamps not provided in payload
    if (!actualStartTime) {
      if (schedule.pickup_confirmed_at) {
        actualStartTime = schedule.pickup_confirmed_at instanceof Date
          ? schedule.pickup_confirmed_at.toISOString().slice(0, 19).replace('T', ' ')
          : String(schedule.pickup_confirmed_at).replace('T', ' ').slice(0, 19);
      } else {
        const dateStr = schedule.scheduled_date instanceof Date
          ? schedule.scheduled_date.toISOString().slice(0, 10)
          : String(schedule.scheduled_date).slice(0, 10);
        actualStartTime = `${dateStr} ${schedule.start_time || '08:00:00'}`;
      }
    } else if (actualStartTime instanceof Date) {
      actualStartTime = actualStartTime.toISOString().slice(0, 19).replace('T', ' ');
    } else if (typeof actualStartTime === 'string') {
      actualStartTime = actualStartTime.replace('T', ' ').slice(0, 19);
    }

    if (!actualEndTime) {
      actualEndTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else if (actualEndTime instanceof Date) {
      actualEndTime = actualEndTime.toISOString().slice(0, 19).replace('T', ' ');
    } else if (typeof actualEndTime === 'string') {
      actualEndTime = actualEndTime.replace('T', ' ').slice(0, 19);
    }

    // 1. Mark schedule Completed
    await db.query(
      'UPDATE truck_schedule SET status = "Completed" WHERE truck_schedule_id = ?',
      [scheduleId]
    );

    // 2. Insert into roster_log (actual_hours_worked is computed via STORED GENERATED column)
    await db.query(
      `INSERT INTO roster_log (truck_schedule_id, actual_start_time, actual_end_time)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE actual_start_time = VALUES(actual_start_time), actual_end_time = VALUES(actual_end_time)`,
      [scheduleId, actualStartTime, actualEndTime]
    );

    const operatorUserId = req.user?.user_id || req.user?.userId || 1;
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Completed truck delivery run', 'truck_schedule', ?, ?)`,
      [operatorUserId, scheduleId, `Status: Completed, Actual Hours: ${actualStartTime} to ${actualEndTime}`]
    );

    // 3. Notify dispatchers (role_id = 2) that this run has successfully concluded
    try {
      const [dispatchers] = await db.query('SELECT user_id FROM `user` WHERE role_id = 2');
      if (dispatchers && dispatchers.length > 0) {
        for (const disp of dispatchers) {
          await createNotification(
            disp.user_id,
            'Delivery',
            `Truck Run #${scheduleId} has completed all stops. Actual hours logged to roster log.`
          );
        }
      }
    } catch (notifErr) {
      console.warn('[Notification] Could not alert dispatchers of run completion:', notifErr.message);
    }

    res.json({
      message: 'Delivery run completed and hours logged into roster_log.',
      truckScheduleId: scheduleId,
      status: 'Completed',
      actualStartTime,
      actualEndTime
    });
  } catch (err) {
    console.error('Error completing delivery run:', err);
    res.status(500).json({ error: err.message || 'Failed to complete delivery run.' });
  }
});

/**
 * Active / Today's Run Finder for Drivers & Assistants
 * Queries Database VIEW \`v_driver_assigned_runs\` (CS3043 Intermediate SQL: Views)
 * Returns role-restricted runs assigned to a user or all runs for a date.
 */
router.get(['/driver-runs', '/assigned-runs'], requireAuth, async (req, res) => {
  try {
    const roleId = req.user?.role_id || req.user?.roleId;
    const currentUserId = req.user?.user_id || req.user?.userId;

    // Strict role guard: Delivery runs are only accessible to drivers and assistants
    if (roleId !== 4 && roleId !== 5) {
      return res.status(403).json({ error: 'Access denied: Delivery runs are only viewable by drivers and assistants.' });
    }

    const { date } = req.query;
    let sql = `SELECT * FROM v_driver_assigned_runs WHERE (driver_id = ? OR assistant_id = ?)`;
    const params = [currentUserId, currentUserId];

    if (date) {
      sql += ' AND scheduled_date = ?';
      params.push(date);
    }

    sql += ' ORDER BY scheduled_date DESC, start_time ASC';

    const [rows] = await db.query(sql, params);
    res.json(rows || []);
  } catch (err) {
    console.error('Error fetching driver runs:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve driver runs.' });
  }
});

module.exports = router;
