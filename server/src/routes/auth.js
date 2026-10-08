const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration({ name, email, password, phone, address, cityId }) {
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
  if (typeof phone !== "string" || !phone.trim()) {
    return "Phone number is required.";
  }
  if (phone.trim().length > 20) {
    return "Phone number must be 20 characters or fewer.";
  }
  if (typeof address !== "string" || !address.trim()) {
    return "Address is required.";
  }
  if (address.trim().length > 200) {
    return "Address must be 200 characters or fewer.";
  }
  if (!Number.isInteger(cityId) || cityId <= 0) {
    return "A valid city is required.";
  }
  return null;
}

// Customer self-registration
// IMPORTANT: this must create BOTH a `user` row and a matching `customer` row in the
// same transaction — `customer.user_id` is not auto-generated, it must be the exact
// same ID as the `user` row just created. Every other feature (orders, etc.) looks up
// `customer` by this ID, so a registration that only inserts into `user` leaves a
// "ghost" account that can never place an order.
router.post("/register", async (req, res) => {
  const { name, email, password, phone, address, cityId } = req.body;
  const validationError = validateRegistration({
    name,
    email,
    password,
    phone,
    address,
    cityId,
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const password_hash = await bcrypt.hash(password, 10);

    const [[customerRole]] = await connection.query(
      "SELECT role_id FROM role WHERE role_name = ?",
      ["Customer"],
    );
    if (!customerRole) {
      await connection.rollback();
      return res.status(500).json({ error: "Customer role is not configured." });
    }

    const [[city]] = await connection.query(
      "SELECT city_id FROM city WHERE city_id = ?",
      [cityId],
    );
    if (!city) {
      await connection.rollback();
      return res.status(400).json({ error: "Selected city does not exist." });
    }

    const [userResult] = await connection.query(
      "INSERT INTO `user` (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)",
      [name.trim(), email.trim(), password_hash, customerRole.role_id],
    );
    const newUserId = userResult.insertId;

    await connection.query(
      "INSERT INTO customer (user_id, phone, address, city_id) VALUES (?, ?, ?, ?)",
      [newUserId, phone.trim(), address.trim(), cityId],
    );

    await connection.commit();
    res
      .status(201)
      .json({ message: "Registered successfully", userId: newUserId });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM `user` WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: "Invalid email or password" });

    if (!user.is_active) {
      return res
        .status(403)
        .json({
          error: "This account has been deactivated. Contact an administrator.",
        });
    }

    const jwtSecret = process.env.JWT_SECRET || "kandypack_scms_super_secret_jwt_key_2026";
    const token = jwt.sign(
      { userId: user.user_id, roleId: user.role_id },
      jwtSecret,
      { expiresIn: "8h" },
    );
    res.json({
      token,
      user: { id: user.user_id, name: user.name, roleId: user.role_id, role: user.role },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
