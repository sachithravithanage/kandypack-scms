const express = require("express");
const db = require("../db");
const router = express.Router();

// Public (no login needed) because the registration page uses it before anyone has an account
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT city_id, name FROM city ORDER BY name",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
