const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper: Calculate end time from start time (HH:MM:SS) and minutes duration
function computeEndTime(startTime, durationMins) {
  const parts = startTime.split(':').map(Number);
  const startMins = (parts[0] || 0) * 60 + (parts[1] || 0);
  const endTotalMins = startMins + durationMins;
  const endHours = Math.floor(endTotalMins / 60) % 24;
  const endRemainingMins = endTotalMins % 60;
  const endSecs = parts[2] || 0;
  return `${String(endHours).padStart(2, '0')}:${String(endRemainingMins).padStart(2, '0')}:${String(endSecs).padStart(2, '0')}`;
}

// GET /api/roster/metadata - Dropdowns for routes, trucks, staff, system parameters
router.get('/metadata', async (req, res) => {
  try {
    const [routes] = await db.query(`
      SELECT r.route_id, r.name AS route_name, r.max_delivery_time_minutes,
             s.store_id, s.name AS store_name, c.name AS city_name
      FROM route r
      JOIN store s ON r.store_id = s.store_id
      JOIN city c ON s.city_id = c.city_id
      ORDER BY r.name ASC
    `);

    const [trucks] = await db.query(`
      SELECT truck_id, plate_number, capacity
      FROM truck
      ORDER BY plate_number ASC
    `);

    const [drivers] = await db.query(`
      SELECT d.user_id, u.name, d.license_number, u.email, NULL AS phone
      FROM driver d
      JOIN \`user\` u ON d.user_id = u.user_id
      ORDER BY u.name ASC
    `);

    const [assistants] = await db.query(`
      SELECT a.user_id, u.name, u.email, NULL AS phone
      FROM assistant a
      JOIN \`user\` u ON a.user_id = u.user_id
      ORDER BY u.name ASC
    `);

    const [params] = await db.query('SELECT param_name, param_value FROM system_parameter');
    const paramMap = {};
    if (params && Array.isArray(params)) {
      params.forEach(p => { paramMap[p.param_name] = p.param_value; });
    }

    res.json({
      routes,
      trucks,
      drivers,
      assistants,
      systemParameters: paramMap
    });
  } catch (err) {
    console.error('Error in /api/roster/metadata:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/roster/driver-hours - Query driver weekly hours using UDF fn_get_driver_weekly_hours (CS3043 Advanced SQL: Slides 19–20)
router.get('/driver-hours', async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);
    const [rows] = await db.query(
      `SELECT d.user_id AS driver_id, u.name AS driver_name, d.license_number,
              fn_get_driver_weekly_hours(d.user_id, ?) AS hours_worked_this_week
       FROM driver d
       JOIN \`user\` u ON d.user_id = u.user_id
       ORDER BY u.name ASC`,
      [targetDate]
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Error in GET /api/roster/driver-hours:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/roster - List schedules with route, crew, truck, order count and capacity load
router.get('/', async (req, res) => {
  try {
    const { date, routeId, status } = req.query;
    let sql = `
      SELECT 
        ts.truck_schedule_id,
        ts.route_id,
        r.name AS route_name,
        r.max_delivery_time_minutes,
        s.name AS store_name,
        ts.truck_id,
        tk.plate_number,
        tk.capacity AS truck_capacity,
        ts.driver_id,
        ud.name AS driver_name,
        ts.assistant_id,
        ua.name AS assistant_name,
        DATE_FORMAT(ts.scheduled_date, '%Y-%m-%d') AS scheduled_date,
        ts.start_time,
        ts.end_time,
        ts.status,
        ts.pickup_confirmed_at,
        COUNT(DISTINCT ta.truck_allocation_id) AS total_orders,
        COUNT(DISTINCT ta.route_stop_id) AS total_stops,
        COALESCE(SUM(o.total_volume), 0) AS total_allocated_volume,
        rl.roster_log_id,
        rl.actual_start_time,
        rl.actual_end_time,
        rl.actual_hours_worked
      FROM truck_schedule ts
      JOIN route r ON ts.route_id = r.route_id
      JOIN store s ON r.store_id = s.store_id
      JOIN truck tk ON ts.truck_id = tk.truck_id
      JOIN \`user\` ud ON ts.driver_id = ud.user_id
      JOIN \`user\` ua ON ts.assistant_id = ua.user_id
      LEFT JOIN truck_allocation ta ON ts.truck_schedule_id = ta.truck_schedule_id
      LEFT JOIN \`order\` o ON ta.order_id = o.order_id
      LEFT JOIN roster_log rl ON ts.truck_schedule_id = rl.truck_schedule_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      sql += ' AND ts.scheduled_date = ?';
      params.push(date);
    }
    if (routeId) {
      sql += ' AND ts.route_id = ?';
      params.push(routeId);
    }
    if (status) {
      sql += ' AND ts.status = ?';
      params.push(status);
    }

    sql += `
      GROUP BY 
        ts.truck_schedule_id,
        ts.route_id,
        r.name,
        r.max_delivery_time_minutes,
        s.name,
        ts.truck_id,
        tk.plate_number,
        tk.capacity,
        ts.driver_id,
        ud.name,
        ts.assistant_id,
        ua.name,
        ts.scheduled_date,
        ts.start_time,
        ts.end_time,
        ts.status,
        ts.pickup_confirmed_at,
        rl.roster_log_id,
        rl.actual_start_time,
        rl.actual_end_time,
        rl.actual_hours_worked
      ORDER BY ts.scheduled_date DESC, ts.start_time ASC
    `;


    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error in GET /api/roster:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/roster - Create a truck schedule with all 6 business rule checks (REQ-SCHED-01 to 06)
router.post('/', requireAuth, requireRole([1, 2]), async (req, res) => {
  try {
    const actorUserId = req.user ? (req.user.userId || req.user.user_id) : 1;
    const {
      routeId,
      truckId,
      driverId,
      assistantId,
      scheduledDate,
      startTime,
      overrideJustification
    } = req.body;

    if (!routeId || !truckId || !driverId || !assistantId || !scheduledDate || !startTime) {
      return res.status(400).json({
        error: 'All fields (routeId, truckId, driverId, assistantId, scheduledDate, startTime) are required.'
      });
    }

    // Compute derived end_time based on route's max delivery duration
    const [routeRows] = await db.query(
      'SELECT max_delivery_time_minutes FROM route WHERE route_id = ?',
      [routeId]
    );
    if (routeRows.length === 0) {
      return res.status(404).json({ error: 'Selected route not found.' });
    }

    const durationMins = routeRows[0].max_delivery_time_minutes;
    const endTime = req.body.endTime || computeEndTime(startTime, durationMins);

    const violations = [];

    // =========================================================================
    // RULE 1 — REQ-SCHED-06: Roster must be created at least 7 days ahead
    // =========================================================================
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const schedDateParts = scheduledDate.split('-').map(Number);
    const schedMidnight = new Date(schedDateParts[0], schedDateParts[1] - 1, schedDateParts[2]);
    const diffDays = Math.round((schedMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      violations.push({
        code: 'REQ-SCHED-06',
        rule: '7-Day Advance Notice',
        message: `Roster must be created at least 7 days before the run date. Selected date is ${diffDays} day(s) from today.`
      });
    }

    // =========================================================================
    // RULE 2 — REQ-SCHED-01: No double-booking of truck/driver/assistant on overlapping times same day
    // =========================================================================
    const [overlaps] = await db.query(
      `SELECT ts.truck_schedule_id, ts.truck_id, ts.driver_id, ts.assistant_id,
              ts.start_time, ts.end_time, r.name AS route_name
       FROM truck_schedule ts
       JOIN route r ON ts.route_id = r.route_id
       WHERE ts.scheduled_date = ?
         AND ts.status != 'Cancelled'
         AND (ts.truck_id = ? OR ts.driver_id = ? OR ts.assistant_id = ?)
         AND (ts.start_time < ? AND ts.end_time > ?)`,
      [scheduledDate, truckId, driverId, assistantId, endTime, startTime]
    );

    if (overlaps.length > 0) {
      const o = overlaps[0];
      let reason = 'Resource already booked in an overlapping time window.';
      if (String(o.truck_id) === String(truckId)) {
        reason = `Truck is already assigned to run #${o.truck_schedule_id} (${o.route_name}, ${o.start_time}-${o.end_time}).`;
      } else if (String(o.driver_id) === String(driverId)) {
        reason = `Driver is already assigned to run #${o.truck_schedule_id} (${o.route_name}, ${o.start_time}-${o.end_time}).`;
      } else if (String(o.assistant_id) === String(assistantId)) {
        reason = `Assistant is already assigned to run #${o.truck_schedule_id} (${o.route_name}, ${o.start_time}-${o.end_time}).`;
      }

      violations.push({
        code: 'REQ-SCHED-01',
        rule: 'No Double-Booking',
        message: reason
      });
    }

    // =========================================================================
    // RULE 3 — REQ-SCHED-02: Driver needs configurable rest gap since last run that day
    // =========================================================================
    let minRestHours = 2;
    try {
      const [paramRows] = await db.query(
        "SELECT param_value FROM system_parameter WHERE param_name = 'driver_min_rest_hours'"
      );
      if (paramRows.length > 0) minRestHours = parseFloat(paramRows[0].param_value);
    } catch (e) {}

    const [driverRunsToday] = await db.query(
      `SELECT * FROM truck_schedule 
       WHERE driver_id = ? AND scheduled_date = ? AND status != 'Cancelled'`,
      [driverId, scheduledDate]
    );

    for (const run of driverRunsToday) {
      const newStart = new Date(`${scheduledDate}T${startTime}`);
      const prevEnd = new Date(`${scheduledDate}T${run.end_time}`);
      const gapHours = Math.abs(newStart - prevEnd) / 3600000;
      if (gapHours < minRestHours) {
        violations.push({
          code: 'REQ-SCHED-02',
          rule: 'Driver Minimum Rest Gap',
          message: `Driver needs at least ${minRestHours} hours rest between runs on the same day. Gap to run #${run.truck_schedule_id} is only ${gapHours.toFixed(1)}h.`
        });
        break;
      }
    }

    // =========================================================================
    // RULE 4 — REQ-SCHED-04: Weekly hour caps (40 driver, 60 assistant)
    // Planned hours summed directly from truck_schedule for the ISO week
    // =========================================================================
    const [driverHoursRows] = await db.query(
      `SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)) / 60, 0) AS total
       FROM truck_schedule
       WHERE driver_id = ? AND YEARWEEK(scheduled_date, 3) = YEARWEEK(?, 3) AND status != 'Cancelled'`,
      [driverId, scheduledDate]
    );
    const driverCurrentHours = parseFloat(driverHoursRows[0].total || 0);
    const runHours = durationMins / 60.0;
    if (driverCurrentHours + runHours > 40) {
      violations.push({
        code: 'REQ-SCHED-04',
        rule: 'Driver 40h Weekly Cap',
        message: `Driver has ${driverCurrentHours.toFixed(1)}h scheduled this week. Adding ${runHours.toFixed(1)}h exceeds the 40-hour weekly cap.`
      });
    }

    const [assistantHoursRows] = await db.query(
      `SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)) / 60, 0) AS total
       FROM truck_schedule
       WHERE assistant_id = ? AND YEARWEEK(scheduled_date, 3) = YEARWEEK(?, 3) AND status != 'Cancelled'`,
      [assistantId, scheduledDate]
    );
    const assistantCurrentHours = parseFloat(assistantHoursRows[0].total || 0);
    if (assistantCurrentHours + runHours > 60) {
      violations.push({
        code: 'REQ-SCHED-04',
        rule: 'Assistant 60h Weekly Cap',
        message: `Assistant has ${assistantCurrentHours.toFixed(1)}h scheduled this week. Adding ${runHours.toFixed(1)}h exceeds the 60-hour weekly cap.`
      });
    }

    // =========================================================================
    // RULE 5 — REQ-SCHED-03: Assistant max 2 consecutive routes on the same day
    // =========================================================================
    const [assistantRunsToday] = await db.query(
      `SELECT COUNT(*) AS total FROM truck_schedule
       WHERE assistant_id = ? AND scheduled_date = ? AND status != 'Cancelled'`,
      [assistantId, scheduledDate]
    );
    if (assistantRunsToday[0].total >= 2) {
      violations.push({
        code: 'REQ-SCHED-03',
        rule: 'Assistant Max Routes',
        message: `Assistant is already assigned to ${assistantRunsToday[0].total} routes on this day (maximum allowed is 2).`
      });
    }

    // =========================================================================
    // RULE 6 / OVERRIDE — REQ-SCHED-05: Dispatcher override handling
    // =========================================================================
    if (violations.length > 0) {
      if (!overrideJustification || overrideJustification.trim().length === 0) {
        return res.status(400).json({
          error: 'Scheduling constraint violation.',
          violations,
          canOverride: true
        });
      }
    }

    // All rules passed or overridden with mandatory justification
    const [result] = await db.query(
      `INSERT INTO truck_schedule (route_id, truck_id, driver_id, assistant_id, scheduled_date, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [routeId, truckId, driverId, assistantId, scheduledDate, startTime, endTime]
    );

    const newScheduleId = result.insertId;

    // Log Dispatcher Override to audit_log (REQ-SCHED-05)
    if (violations.length > 0 && overrideJustification) {
      const violationSummary = violations.map(v => `[${v.code}: ${v.message}]`).join('; ');
      const auditDetails = `Justification: "${overrideJustification}". Overrode: ${violationSummary}`;

      try {
        await db.query(
          `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
           VALUES (?, 'ROSTER_OVERRIDE', 'truck_schedule', ?, ?)`,
          [actorUserId, newScheduleId, auditDetails]
        );
      } catch (auditErr) {
        console.error('Audit log insert error:', auditErr);
      }
    }

    res.status(201).json({
      truckScheduleId: newScheduleId,
      endTime,
      overridden: violations.length > 0,
      violationsCount: violations.length
    });
  } catch (err) {
    console.error('Error in POST /api/roster:', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/roster/:id/override - Dispatcher Override standalone endpoint (REQ-SCHED-05)
router.put('/:id/override', requireAuth, requireRole([1, 2]), async (req, res) => {
  try {
    const actorUserId = req.user ? (req.user.userId || req.user.user_id) : 1;
    const { justification } = req.body;
    if (!justification || justification.trim().length === 0) {
      return res.status(400).json({ error: 'Override justification is mandatory.' });
    }

    await db.query(
      'INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)',
      [actorUserId, 'ROSTER_OVERRIDE', 'truck_schedule', req.params.id, justification]
    );

    res.json({ message: 'Roster override logged and applied to audit log.' });
  } catch (err) {
    console.error('Error in PUT /api/roster/:id/override:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/roster/:id - Cancel/remove a scheduled truck run
router.delete('/:id', requireAuth, requireRole([1, 2]), async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const [existing] = await db.query(
      'SELECT status, pickup_confirmed_at FROM truck_schedule WHERE truck_schedule_id = ?',
      [scheduleId]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Schedule not found.' });

    if (existing[0].status === 'Completed' || existing[0].pickup_confirmed_at) {
      return res.status(400).json({ error: 'Cannot delete a run that is already in progress or completed.' });
    }

    await db.query('DELETE FROM truck_allocation WHERE truck_schedule_id = ?', [scheduleId]);
    await db.query('DELETE FROM truck_schedule WHERE truck_schedule_id = ?', [scheduleId]);

    res.json({ message: `Truck schedule #${scheduleId} deleted successfully.` });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
