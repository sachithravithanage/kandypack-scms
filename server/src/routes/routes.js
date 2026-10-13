const express = require('express');
const db = require('../db');
const router = express.Router();

// List all routes with store and city information
router.get('/', async (_req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.route_id, r.store_id, r.name, r.max_delivery_time_minutes, r.service_days,
                   s.name AS store_name, c.name AS city_name
            FROM route r
            JOIN store s ON r.store_id = s.store_id
            JOIN city c ON s.city_id = c.city_id
            ORDER BY r.name
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching routes:', err);
        res.status(500).json({ error: 'Failed to fetch routes.' });
    }
});

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