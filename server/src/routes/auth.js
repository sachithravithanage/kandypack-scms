const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

// Customer self-registration
// IMPORTANT: this must create BOTH a `user` row and a matching `customer` row in the
// same transaction — `customer.user_id` is not auto-generated, it must be the exact
// same ID as the `user` row just created. Every other feature (orders, etc.) looks up
// `customer` by this ID, so a registration that only inserts into `user` leaves a
// "ghost" account that can never place an order.
router.post("/register", async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { name, email, password, phone, address, cityId } = req.body;
    const password_hash = await bcrypt.hash(password, 10);

    // role_id 6 = Customer, based on the INSERT order in A1
    const [userResult] = await connection.query(
      "INSERT INTO `user` (name, email, password_hash, role_id) VALUES (?, ?, ?, 6)",
      [name, email, password_hash],
    );
    const newUserId = userResult.insertId;

    await connection.query(
      "INSERT INTO customer (user_id, phone, address, city_id) VALUES (?, ?, ?, ?)",
      [newUserId, phone, address, cityId],
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

    const token = jwt.sign(
      { userId: user.user_id, roleId: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    res.json({
      token,
      user: { id: user.user_id, name: user.name, roleId: user.role_id },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
