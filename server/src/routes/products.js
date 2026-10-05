const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM product');
    res.json(rows);
});

module.exports = router;