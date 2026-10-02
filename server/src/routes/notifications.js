const express = require('express');
const db = require('../db');
const router = express.Router();

async function createNotification(userId, type, message) {
  await db.query(
    'INSERT INTO notification (user_id, type, message) VALUES (?, ?, ?)',
    [userId, type, message]
  );
  console.log(`[Notification Alert] User ${userId} [${type}]: ${message}`);
}

// GET /api/notifications/:userId - Fetch all notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notification WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/acknowledge - Mark notification as read
router.put('/:id/acknowledge', async (req, res) => {
  try {
    await db.query('UPDATE notification SET is_read = TRUE WHERE notification_id = ?', [req.params.id]);
    res.json({ message: 'Notification acknowledged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, createNotification };