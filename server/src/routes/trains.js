'use strict';
const express = require('express');
const db      = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/trains ───────────────────────────────────────────
// List all trains. Any authenticated user.
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM train ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/trains ─────────────────────────────────────────
// Create a train. Administrator only (REQ-RAIL-01).
router.post('/', requireAuth, requireRole([1]), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const [result] = await db.query('INSERT INTO train (name) VALUES (?)', [name]);
    res.status(201).json({ trainId: result.insertId, name });
  } catch (err) { next(err); }
});

// ── PUT /api/trains/:id ──────────────────────────────────────
// Update a train's name. Administrator only.
router.put('/:id', requireAuth, requireRole([1]), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const [result] = await db.query(
      'UPDATE train SET name = ? WHERE train_id = ?',
      [name, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Train not found' });
    res.json({ trainId: Number(req.params.id), name });
  } catch (err) { next(err); }
});

module.exports = router;
