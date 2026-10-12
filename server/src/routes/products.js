const express = require('express');
const db = require('../db');
const router = express.Router();

const SORT_OPTIONS = {
    name_asc: 'p.name ASC',
    price_asc: 'p.unit_price ASC, p.name ASC',
    price_desc: 'p.unit_price DESC, p.name ASC',
    stock_desc: 'quantity_in_stock DESC, p.name ASC',
};

const MAX_RESULTS = 100;

// Split user text into lower-case words (letters and digits only, max 5).
// Because only letters/digits survive, the words are safe to put inside a LIKE
// pattern: no %, _ or \ can get through.
function toWords(text) {
    return String(text)
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .slice(0, 5);
}

function parsePrice(value) {
    if (value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
}

// GET /api/products?q=baby cream&minPrice=100&maxPrice=500&sort=price_asc
// All parameters are optional; with none it returns the catalog as before.
//   q                   every typed word must appear somewhere in the name
//                       ("baby cr" matches "Pears Baby Cream"), case-insensitive
//   minPrice, maxPrice  price range      (uses idx_product_unit_price)
//   sort                name_asc | price_asc | price_desc | stock_desc
//   join main_inventory to provide real-time stock levels
router.get('/', async (req, res) => {
    try {
        const minPrice = parsePrice(req.query.minPrice);
        const maxPrice = parsePrice(req.query.maxPrice);
        if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
            return res.status(400).json({ error: 'minPrice and maxPrice must be non-negative numbers.' });
        }
        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            return res.status(400).json({ error: 'minPrice cannot be greater than maxPrice.' });
        }

        const orderBy = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.name_asc;
        const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
        const words = q ? toWords(q) : [];

        const where = [];
        const params = [];

        // One condition per word; all must match (AND).
        // LOWER() makes the match case-insensitive whatever the column collation is.
        for (const w of words) {
            where.push('LOWER(p.name) LIKE ?');
            params.push(`%${w}%`);
        }
        if (minPrice !== null) { where.push('p.unit_price >= ?'); params.push(minPrice); }
        if (maxPrice !== null) { where.push('p.unit_price <= ?'); params.push(maxPrice); }

        const sql =
            'SELECT p.product_id, p.name, p.unit_price, p.space_consumption_rate, ' +
            'COALESCE(mi.quantity_in_stock, 0) AS quantity_in_stock ' +
            'FROM product p ' +
            'LEFT JOIN main_inventory mi ON p.product_id = mi.product_id' +
            (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
            ` ORDER BY ${orderBy} LIMIT ${MAX_RESULTS}`;

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Product search error:', err);
        res.status(500).json({ error: 'Could not load products.' });
    }
});

module.exports = router;
