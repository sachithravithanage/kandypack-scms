const express = require('express');
const db = require('../db');
const router = express.Router();

// List stops for a city — feeds the order form's delivery-address dropdown, joining
// through route -> store -> city since route_stop itself has no city_id of its own.
router.get('/stops', async (req, res) => {
    const { cityId } = req.query;
    const [rows] = await db.query(
    `SELECT rs.route_stop_id, rs.stop_name, r.route_id, r.name AS route_name
    FROM route_stop rs
    JOIN route r ON rs.route_id = r.route_id
    JOIN store s ON r.store_id = s.store_id
    WHERE s.city_id = ?
    ORDER BY r.route_id, rs.stop_order`,
    [cityId]
    );
    res.json(rows);
});

module.exports = router;