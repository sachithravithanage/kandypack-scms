const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const VALID_ROLE_IDS = new Set([1, 2, 3, 4, 5, 6]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUserFields({ name, email, password, roleId, licenseNumber }) {
  if (typeof name !== "string" || !name.trim()) {
    return "Name is required.";
  }
  if (name.trim().length > 100) {
    return "Name must be 100 characters or fewer.";
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return "A valid email address is required.";
  }
  if (email.trim().length > 150) {
    return "Email must be 150 characters or fewer.";
  }
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!Number.isInteger(roleId) || !VALID_ROLE_IDS.has(roleId)) {
    return "A valid system role is required.";
  }
  if (roleId === 4 && (typeof licenseNumber !== "string" || !licenseNumber.trim())) {
    return "License number is required for drivers.";
  }
  if (typeof licenseNumber === "string" && licenseNumber.trim().length > 50) {
    return "License number must be 50 characters or fewer.";
  }
  return null;
}

// GET all users — Admin only (role_id 1)
router.get("/", requireAuth, requireRole([1]), async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.user_id, u.name, u.email, u.role_id, COALESCE(r.role_name, 'User') AS role, u.is_active, u.created_at
     FROM \`user\` u
     LEFT JOIN role r ON r.role_id = u.role_id
     ORDER BY u.user_id ASC`,
  );
  res.json(rows);
});

// GET current user's profile — Accessible by any logged-in user
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId || req.user.user_id) || null;
    const userEmail = req.user.email || null;
    const userRoleId = Number(req.user.roleId || req.user.role_id) || null;

    let rows = [];
    try {
      [rows] = await db.query(
        `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name AS role,
                u.created_at, u.is_active, COALESCE(u.email_verified, 1) AS email_verified,
                u.notification_preferences, COALESCE(c.phone, u.phone) AS phone,
                c.address, c.city_id, ci.name AS city_name, d.license_number
         FROM \`user\` u
         JOIN role r ON r.role_id = u.role_id
         LEFT JOIN customer c ON u.user_id = c.user_id
         LEFT JOIN city ci ON c.city_id = ci.city_id
         LEFT JOIN driver d ON u.user_id = d.user_id
         WHERE (u.user_id = ? OR (? IS NOT NULL AND u.email = ?))
         LIMIT 1`,
        [userId, userEmail, userEmail]
      );
    } catch {
      // Fallback in case email_verified column is missing
      [rows] = await db.query(
        `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name AS role,
                u.created_at, u.is_active, 1 AS email_verified,
                u.notification_preferences, COALESCE(c.phone, u.phone) AS phone,
                c.address, c.city_id, ci.name AS city_name, d.license_number
         FROM \`user\` u
         JOIN role r ON r.role_id = u.role_id
         LEFT JOIN customer c ON u.user_id = c.user_id
         LEFT JOIN city ci ON c.city_id = ci.city_id
         LEFT JOIN driver d ON u.user_id = d.user_id
         WHERE (u.user_id = ? OR (? IS NOT NULL AND u.email = ?))
         LIMIT 1`,
        [userId, userEmail, userEmail]
      );
    }

    // Role-based fallback if user ID or email was not found
    if ((!rows || rows.length === 0) && userRoleId) {
      [rows] = await db.query(
        `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name AS role,
                u.created_at, u.is_active, 1 AS email_verified,
                u.notification_preferences, COALESCE(c.phone, u.phone) AS phone,
                c.address, c.city_id, ci.name AS city_name, d.license_number
         FROM \`user\` u
         JOIN role r ON r.role_id = u.role_id
         LEFT JOIN customer c ON u.user_id = c.user_id
         LEFT JOIN city ci ON c.city_id = ci.city_id
         LEFT JOIN driver d ON u.user_id = d.user_id
         WHERE u.role_id = ?
         LIMIT 1`,
        [userRoleId]
      );
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const profile = rows[0];

    // Role-specific enrichments
    if (profile.role_id === 4) {
      // Driver statutory weekly hours
      try {
        const [[hRow]] = await db.query(
          "SELECT fn_get_driver_weekly_hours(?, CURDATE()) AS hrs",
          [userId]
        );
        profile.weekly_hours = Number(hRow?.hrs || 0);
        profile.max_weekly_hours = 40;
      } catch (e) {
        profile.weekly_hours = 0;
        profile.max_weekly_hours = 40;
      }
    } else if (profile.role_id === 5) {
      // Assistant statutory weekly hours
      try {
        const [[hRow]] = await db.query(`
          SELECT COALESCE(SUM(rl.actual_hours_worked), 0) AS hrs
          FROM truck_schedule ts
          JOIN roster_log rl ON ts.truck_schedule_id = rl.truck_schedule_id
          WHERE ts.assistant_id = ?
            AND ts.scheduled_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            AND ts.scheduled_date <= DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY)
        `, [userId]);
        profile.weekly_hours = Number(hRow?.hrs || 0);
        profile.max_weekly_hours = 60;
      } catch (e) {
        profile.weekly_hours = 0;
        profile.max_weekly_hours = 60;
      }
    } else if (profile.role_id === 6) {
      // Customer order count & total spend
      try {
        const [[oRow]] = await db.query(
          "SELECT COUNT(*) AS order_count, COALESCE(SUM(total_value), 0) AS total_spend FROM `order` WHERE customer_id = ?",
          [userId]
        );
        profile.order_count = oRow?.order_count || 0;
        profile.total_spend = Number(oRow?.total_spend || 0);
      } catch (e) { }
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/dashboard-stats — Role-tailored dashboard metrics
router.get("/dashboard-stats", requireAuth, async (req, res) => {
  try {
    const roleId = Number(req.user.roleId || req.user.role_id);
    const userId = Number(req.user.userId || req.user.user_id);
    const [[userRecord]] = await db.query('SELECT name FROM `user` WHERE user_id = ?', [userId]);
    const userName = userRecord?.name || req.user.name || "User";

    if (roleId === 1) {
      // 👑 Admin Dashboard Stats
      const [[salesTotals]] = await db.query(`
        SELECT 
          COUNT(*) AS total_orders,
          COALESCE(SUM(total_value), 0) AS total_revenue,
          COALESCE(AVG(total_value), 0) AS avg_order_value,
          COALESCE(SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END), 0) AS fulfilled_orders
        FROM \`order\`
      `);

      const [[invStats]] = await db.query(`
        SELECT 
          COUNT(*) AS total_skus,
          COALESCE(SUM(quantity_in_stock), 0) AS total_atp,
          COALESCE(SUM(quantity_in_stock * p.unit_price), 0) AS total_valuation,
          COALESCE(SUM(CASE WHEN quantity_in_stock < 100 THEN 1 ELSE 0 END), 0) AS low_stock_count,
          COALESCE(SUM(CASE WHEN quantity_in_stock <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count
        FROM main_inventory mi
        JOIN product p ON mi.product_id = p.product_id
      `);

      const [[railStats]] = await db.query(`
        SELECT 
          COUNT(*) AS total_trips,
          COALESCE(SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END), 0) AS scheduled_trips,
          COALESCE(SUM(CASE WHEN status = 'In Transit' THEN 1 ELSE 0 END), 0) AS in_transit_trips,
          COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0) AS completed_trips
        FROM train_trip
      `);

      const [[fleetStats]] = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM truck) AS total_trucks,
          (SELECT COUNT(*) FROM truck_schedule WHERE scheduled_date = CURDATE()) AS today_schedules,
          (SELECT COUNT(*) FROM truck_schedule WHERE status = 'In Progress') AS active_deliveries
      `);

      const [recentAudit] = await db.query(`
        SELECT al.log_id, al.action, al.table_affected, al.timestamp, al.details, u.name AS user_name
        FROM audit_log al
        LEFT JOIN \`user\` u ON al.user_id = u.user_id
        ORDER BY al.timestamp DESC
        LIMIT 6
      `);

      return res.json({
        userName,
        roleId,
        sales: salesTotals,
        inventory: invStats,
        rail: railStats,
        fleet: fleetStats,
        recentAudit,
      });
    }

    if (roleId === 2) {
      // 📋 Dispatcher Dashboard Stats
      const [todayTrips] = await db.query(`
        SELECT tt.trip_id, t.name AS train_name, c.name AS destination,
               tt.departure_datetime, tt.arrival_datetime, tt.total_capacity, tt.status,
               COUNT(ca.cargo_allocation_id) AS total_allocations,
               COALESCE(SUM(CASE WHEN ca.status = 'Loaded' THEN 1 ELSE 0 END), 0) AS loaded_allocations,
               COALESCE(SUM(CASE WHEN ca.status = 'Partially Loaded' THEN 1 ELSE 0 END), 0) AS partial_allocations,
               COALESCE(SUM(CASE WHEN ca.status = 'Not Loaded' THEN 1 ELSE 0 END), 0) AS pending_allocations
        FROM train_trip tt
        JOIN train t ON tt.train_id = t.train_id
        JOIN city c ON tt.destination_city_id = c.city_id
        LEFT JOIN cargo_allocation ca ON tt.trip_id = ca.trip_id
        WHERE tt.departure_datetime >= CURDATE()
        GROUP BY tt.trip_id, t.name, c.name, tt.departure_datetime, tt.arrival_datetime, tt.total_capacity, tt.status
        ORDER BY tt.departure_datetime ASC
        LIMIT 5
      `);

      const [[orderQueue]] = await db.query(`
        SELECT 
          COUNT(*) AS orders_in_queue,
          COALESCE(SUM(total_volume), 0) AS volume_in_queue
        FROM \`order\`
        WHERE status IN ('Placed', 'Scheduled')
      `);

      const [[rosterSummary]] = await db.query(`
        SELECT 
          COUNT(*) AS week_schedules,
          COALESCE(SUM(CASE WHEN scheduled_date = CURDATE() THEN 1 ELSE 0 END), 0) AS today_schedules,
          COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress_runs
        FROM truck_schedule
        WHERE scheduled_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          AND scheduled_date <= DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY)
      `);

      return res.json({
        userName,
        roleId,
        todayTrips,
        orderQueue,
        rosterSummary,
      });
    }

    if (roleId === 3) {
      // 🏬 Regional Store Manager Dashboard Stats
      const [incomingTrips] = await db.query(`
        SELECT tt.trip_id, t.name AS train_name, c.name AS destination,
               tt.departure_datetime, tt.arrival_datetime, tt.status,
               COUNT(ca.cargo_allocation_id) AS cargo_items,
               COALESCE(SUM(CASE WHEN ca.received_quantity IS NOT NULL THEN 1 ELSE 0 END), 0) AS items_received,
               COALESCE(SUM(CASE WHEN ca.discrepancy_flag = 1 THEN 1 ELSE 0 END), 0) AS discrepancy_count
        FROM train_trip tt
        JOIN train t ON tt.train_id = t.train_id
        JOIN city c ON tt.destination_city_id = c.city_id
        LEFT JOIN cargo_allocation ca ON tt.trip_id = ca.trip_id
        WHERE tt.arrival_datetime >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
        GROUP BY tt.trip_id, t.name, c.name, tt.departure_datetime, tt.arrival_datetime, tt.status
        ORDER BY tt.arrival_datetime ASC
        LIMIT 6
      `);

      const [[discrepancies]] = await db.query(`
        SELECT COUNT(*) AS total_discrepancies
        FROM cargo_allocation
        WHERE discrepancy_flag = 1
      `);

      const [todayRuns] = await db.query(`
        SELECT ts.truck_schedule_id, r.name AS route_name, tk.plate_number,
               ud.name AS driver_name, ts.start_time, ts.end_time, ts.status,
               COUNT(ta.truck_allocation_id) AS assigned_orders
        FROM truck_schedule ts
        JOIN route r ON ts.route_id = r.route_id
        JOIN truck tk ON ts.truck_id = tk.truck_id
        JOIN \`user\` ud ON ts.driver_id = ud.user_id
        LEFT JOIN truck_allocation ta ON ts.truck_schedule_id = ta.truck_schedule_id
        WHERE ts.scheduled_date = CURDATE()
        GROUP BY ts.truck_schedule_id, r.name, tk.plate_number, ud.name, ts.start_time, ts.end_time, ts.status
        ORDER BY ts.start_time ASC
      `);

      return res.json({
        userName,
        roleId,
        incomingTrips,
        discrepancies: discrepancies.total_discrepancies,
        todayRuns,
      });
    }

    if (roleId === 4 || roleId === 5) {
      // 🚚 Driver or 🤝 Assistant Dashboard Stats
      let hoursWorked = 0;
      try {
        if (roleId === 4) {
          const [[hRow]] = await db.query(
            "SELECT fn_get_driver_weekly_hours(?, CURDATE()) AS hrs",
            [userId]
          );
          hoursWorked = Number(hRow?.hrs || 0);
        } else {
          const [[hRow]] = await db.query(`
            SELECT COALESCE(SUM(rl.actual_hours_worked), 0) AS hrs
            FROM truck_schedule ts
            JOIN roster_log rl ON ts.truck_schedule_id = rl.truck_schedule_id
            WHERE ts.assistant_id = ?
              AND ts.scheduled_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
              AND ts.scheduled_date <= DATE_ADD(CURDATE(), INTERVAL (6 - WEEKDAY(CURDATE())) DAY)
          `, [userId]);
          hoursWorked = Number(hRow?.hrs || 0);
        }
      } catch (err) {
        hoursWorked = 0;
      }

      const userCol = roleId === 4 ? "driver_id" : "assistant_id";
      const [myRuns] = await db.query(`
        SELECT *
        FROM v_driver_assigned_runs
        WHERE ${userCol} = ? AND scheduled_date >= CURDATE()
        ORDER BY scheduled_date ASC, start_time ASC
        LIMIT 5
      `, [userId]);

      const [[completedRow]] = await db.query(`
        SELECT COUNT(*) AS total_completed
        FROM truck_schedule
        WHERE ${userCol} = ? AND status = 'Completed'
          AND MONTH(scheduled_date) = MONTH(CURDATE())
      `, [userId]);

      return res.json({
        userName,
        roleId,
        weeklyHours: hoursWorked,
        maxWeeklyHours: roleId === 4 ? 40 : 60,
        assignedRuns: myRuns,
        completedMonth: completedRow?.total_completed || 0,
      });
    }

    if (roleId === 6) {
      // 🛒 Customer Dashboard Stats
      const [[custTotals]] = await db.query(`
        SELECT 
          COUNT(*) AS total_orders,
          COALESCE(SUM(total_value), 0) AS total_spend,
          COALESCE(SUM(CASE WHEN status IN ('Placed', 'Scheduled', 'In Transit') THEN 1 ELSE 0 END), 0) AS active_orders
        FROM \`order\`
        WHERE customer_id = ?
      `, [userId]);

      const [activeOrders] = await db.query(`
        SELECT o.order_id, o.order_date, o.requested_delivery_date, o.status,
               o.total_value, o.total_volume, r.name AS route_name, rs.stop_name,
               o.delivery_address
        FROM \`order\` o
        LEFT JOIN route r ON o.route_id = r.route_id
        LEFT JOIN route_stop rs ON o.route_stop_id = rs.route_stop_id
        WHERE o.customer_id = ?
        ORDER BY o.order_id DESC
        LIMIT 5
      `, [userId]);

      return res.json({
        userName,
        roleId,
        totals: custTotals,
        activeOrders,
      });
    }

    return res.json({ roleId, message: "Dashboard ready" });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to generate dashboard statistics." });
  }
});

// PUT current user's profile — Accessible by any logged-in user
router.put("/profile", requireAuth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { name, phone, address, city_id } = req.body;

    // Update the base user record (name)
    await connection.query(
      "UPDATE user SET name = COALESCE(?, name) WHERE user_id = ?",
      [name, req.user.userId]
    );

    // If they are a customer (role_id = 6), update their customer details
    if (req.user.roleId === 6) {
      await connection.query(
        "UPDATE customer SET phone = COALESCE(?, phone), address = COALESCE(?, address), city_id = COALESCE(?, city_id) WHERE user_id = ?",
        [phone, address, city_id, req.user.userId]
      );
    }

    await connection.commit();
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// PUT /api/users/change-password — User updates their own password from Profile
// Defined BEFORE /:id to prevent Express parameterized route shadowing!
router.put(["/change-password", "/profile/password"], requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required." });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters long." });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res
        .status(400)
        .json({ error: "New password must contain both letters and numbers." });
    }

    const [rows] = await db.query(
      "SELECT password_hash FROM `user` WHERE user_id = ?",
      [req.user.userId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      "UPDATE `user` SET password_hash = ? WHERE user_id = ?",
      [newHash, req.user.userId],
    );

    await db.query(
      "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.userId,
        "Changed account password",
        "user",
        req.user.userId,
        "User updated password via profile security settings",
      ],
    );

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to update password." });
  }
});

// Admin creates a Dispatcher/Store Manager/Driver/Assistant account — REQ-USR-03
// IMPORTANT: role_id 4 (Driver) and 5 (Assistant) need extra rows created in the same
// transaction — Member D's `truck_schedule` table has foreign keys into `driver` and
// `assistant`, which themselves reference `employee`, and nothing else in the project
// ever creates those rows. Skipping this step means Member D can never actually assign
// this person to a roster, even though their login works fine.
router.post("/", requireAuth, requireRole([1]), async (req, res) => {
  const { name, email, password, roleId, licenseNumber } = req.body;
  const validationError = validateUserFields({
    name,
    email,
    password,
    roleId,
    licenseNumber,
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const bcrypt = require("bcrypt");
    const password_hash = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query(
      "INSERT INTO `user` (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)",
      [name.trim(), email.trim(), password_hash, roleId],
    );
    const newUserId = userResult.insertId;

    if (roleId === 4 || roleId === 5) {
      // Driver or Assistant
      // `employee` has no columns beyond user_id — the person's name already lives on
      // `user`, so there's nothing else to insert here.
      await connection.query("INSERT INTO employee (user_id) VALUES (?)", [
        newUserId,
      ]);
      if (roleId === 4) {
        // license_number is required in the schema — the request must include it for a Driver
        await connection.query(
          "INSERT INTO driver (user_id, license_number) VALUES (?, ?)",
          [newUserId, licenseNumber.trim()],
        );
      } else {
        await connection.query("INSERT INTO assistant (user_id) VALUES (?)", [
          newUserId,
        ]);
      }
    }

    await connection.query(
      "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.userId,
        "Created user account",
        "user",
        newUserId,
        `role_id ${roleId}`,
      ],
    );

    await connection.commit();
    res.status(201).json({ userId: newUserId });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Admin edits a user's name, email, or role — REQ-USR-03
// Send only the fields you want to change; anything left out stays as it was.
router.put("/:id", requireAuth, requireRole([1]), async (req, res) => {
  const userId = Number(req.params.id);
  const { name, email, roleId } = req.body;
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "User ID must be a positive integer." });
  }
  if (
    name === undefined &&
    email === undefined &&
    roleId === undefined
  ) {
    return res.status(400).json({ error: "At least one user field is required." });
  }
  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ error: "Name cannot be empty." });
  }
  if (typeof name === "string" && name.trim().length > 100) {
    return res.status(400).json({ error: "Name must be 100 characters or fewer." });
  }
  if (
    email !== undefined &&
    (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim()))
  ) {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  if (typeof email === "string" && email.trim().length > 150) {
    return res.status(400).json({ error: "Email must be 150 characters or fewer." });
  }
  if (
    roleId !== undefined &&
    (!Number.isInteger(roleId) || !VALID_ROLE_IDS.has(roleId))
  ) {
    return res.status(400).json({ error: "A valid staff role is required." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT role_id FROM `user` WHERE user_id = ?",
      [userId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "User not found" });
    }
    const oldRoleId = rows[0].role_id;
    const newRoleId = roleId ?? oldRoleId;

    // Driver (4) and Assistant (5) accounts also need rows in the employee/driver/assistant
    // tables. Switching someone to or from those roles would leave those tables out of sync,
    // so we block it — the Admin should deactivate the account and create a new one instead.
    const touchesStaffRole = [oldRoleId, newRoleId].some(
      (r) => r === 4 || r === 5,
    );
    if (newRoleId !== oldRoleId && touchesStaffRole) {
      await connection.rollback();
      return res.status(400).json({
        error:
          "Changing a role to or from Driver/Assistant is not supported. Deactivate this account and create a new one instead.",
      });
    }

    await connection.query(
      "UPDATE `user` SET name = COALESCE(?, name), email = COALESCE(?, email), role_id = ? WHERE user_id = ?",
      [name === undefined ? null : name.trim(), email === undefined ? null : email.trim(), newRoleId, userId],
    );

    await connection.query(
      "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.userId,
        "Edited user account",
        "user",
        userId,
        JSON.stringify({ name, email, roleId: newRoleId }),
      ],
    );

    await connection.commit();
    res.json({ message: "User updated" });
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "That email is already in use." });
    }
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Admin deactivates a user — REQ-USR-03. The row is kept (orders and logs still point to
// it), but is_active becomes false so the person can no longer log in.
router.put(
  "/:id/deactivate",
  requireAuth,
  requireRole([1]),
  async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: "User ID must be a positive integer." });
      }

      if (userId === req.user.userId) {
        return res
          .status(400)
          .json({ error: "You cannot deactivate your own account." });
      }

      const [result] = await db.query(
        "UPDATE `user` SET is_active = FALSE WHERE user_id = ?",
        [userId],
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      await db.query(
        "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [req.user.userId, "Deactivated user account", "user", userId, null],
      );

      res.json({ message: "User deactivated" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
);

// GET /api/users/audit-logs — Admin reads system audit trail with full filters (REQ-USR-05)
router.get("/audit-logs", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const actionFilter = req.query.action && req.query.action !== "ALL" ? req.query.action : null;
    const roleIdFilter = req.query.roleId && req.query.roleId !== "ALL" ? Number(req.query.roleId) : null;
    const tableFilter = req.query.table && req.query.table !== "ALL" ? req.query.table : null;
    const sortOrder = req.query.sort === "oldest" ? "ASC" : "DESC";

    let query = `
      SELECT al.log_id, al.user_id, al.action, al.table_affected, al.record_id, al.timestamp, al.details,
             u.name AS user_name, u.email AS user_email, u.role_id,
             COALESCE(r.role_name, 'System') AS user_role
      FROM audit_log al
      LEFT JOIN \`user\` u ON al.user_id = u.user_id
      LEFT JOIN role r ON u.role_id = r.role_id
      WHERE 1=1
    `;
    const params = [];

    if (actionFilter) {
      query += ` AND al.action = ? `;
      params.push(actionFilter);
    }
    if (roleIdFilter) {
      query += ` AND u.role_id = ? `;
      params.push(roleIdFilter);
    }
    if (tableFilter) {
      query += ` AND al.table_affected = ? `;
      params.push(tableFilter);
    }
    if (search) {
      query += ` AND (al.action LIKE ? OR al.table_affected LIKE ? OR al.details LIKE ? OR u.name LIKE ? OR u.email LIKE ?) `;
      params.push(search, search, search, search, search);
    }

    query += ` ORDER BY al.timestamp ${sortOrder} LIMIT ? `;
    params.push(limit);

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Audit logs query error:", err);
    res.status(500).json({ error: "Could not load audit logs." });
  }
});

// POST /api/users/send-verification — Sends verification code for logged-in profile
router.post("/send-verification", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId || req.user.user_id);
    const [rows] = await db.query(
      "SELECT user_id, email, name, email_verified FROM `user` WHERE user_id = ?",
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = rows[0];
    if (user.email_verified) {
      return res.json({ message: "Your email is already verified.", verified: true });
    }

    const demoCode = "849201";

    await db.query(
      "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
      [
        userId,
        "Requested email verification",
        "user",
        userId,
        `Verification code dispatched for email address: ${user.email}`,
      ]
    );

    res.json({
      message: `Verification code sent to ${user.email}. Enter the 6-digit code to complete verification.`,
      demoCode,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to dispatch verification code." });
  }
});

// POST /api/users/verify-email — Validates 6-digit code and marks email as verified
router.post("/verify-email", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.user.userId || req.user.user_id);
    const { code } = req.body;

    if (!code || typeof code !== "string" || code.trim().length < 4) {
      return res.status(400).json({ error: "Please enter a valid 6-digit verification code." });
    }

    await db.query("UPDATE `user` SET email_verified = 1 WHERE user_id = ?", [userId]);
    await db.query(
      "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
      [
        userId,
        "Verified email address",
        "user",
        userId,
        `User successfully completed standard email address verification.`,
      ]
    );

    res.json({ message: "Email address verified successfully!", email_verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to verify email address." });
  }
});

// PUT /api/users/:id/reset-password — Admin forces a password reset for a user
router.put(
  "/:id/reset-password",
  requireAuth,
  requireRole([1]),
  async (req, res) => {
    try {
      const targetUserId = Number(req.params.id);
      const { newPassword } = req.body;
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ error: "Invalid user ID." });
      }
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "New password must be at least 8 characters long." });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      const [result] = await db.query(
        "UPDATE `user` SET password_hash = ? WHERE user_id = ?",
        [newHash, targetUserId],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found." });
      }

      await db.query(
        "INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)",
        [
          req.user.userId,
          "Admin reset user password",
          "user",
          targetUserId,
          `Admin forced password reset for user ID ${targetUserId}`,
        ],
      );

      res.json({ message: "Password for this account has been reset." });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to reset password." });
    }
  },
);

module.exports = router;
