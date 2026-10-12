const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const VALID_ROLE_IDS = new Set([1, 2, 3, 4, 5]);
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
    return "A valid staff role is required.";
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
    `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name AS role, u.is_active, u.created_at
     FROM \`user\` u
     JOIN role r ON r.role_id = u.role_id
     ORDER BY u.user_id ASC`,
  );
  res.json(rows);
});

// GET current user's profile — Accessible by any logged-in user
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name AS role,
              u.notification_preferences, c.phone, c.address, c.city_id,
              ci.name AS city_name, d.license_number
       FROM \`user\` u
       JOIN role r ON r.role_id = u.role_id
       LEFT JOIN customer c ON u.user_id = c.user_id
       LEFT JOIN city ci ON c.city_id = ci.city_id
       LEFT JOIN driver d ON u.user_id = d.user_id
       WHERE u.user_id = ?`,
      [req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// GET /api/users/audit-logs — Admin reads system audit trail (REQ-USR-05)
router.get("/audit-logs", requireAuth, requireRole([1]), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const search = req.query.search ? `%${req.query.search}%` : null;

    let query = `
      SELECT al.log_id, al.user_id, al.action, al.table_affected, al.record_id, al.timestamp, al.details,
             u.name AS user_name, u.email AS user_email
      FROM audit_log al
      LEFT JOIN \`user\` u ON al.user_id = u.user_id
    `;
    const params = [];

    if (search) {
      query += ` WHERE al.action LIKE ? OR al.table_affected LIKE ? OR al.details LIKE ? OR u.name LIKE ? OR u.email LIKE ? `;
      params.push(search, search, search, search, search);
    }

    query += ` ORDER BY al.timestamp DESC LIMIT ? `;
    params.push(limit);

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Could not load audit logs." });
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
