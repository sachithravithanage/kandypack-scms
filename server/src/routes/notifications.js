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

// POST /api/notifications/report-incident - Driver logs in-route incident (notifies Dispatchers & Admins)
router.post('/report-incident', async (req, res) => {
  try {
    const { userId, truckScheduleId, type, message } = req.body;
    
    // Find all dispatchers (role_id = 2) and admins (role_id = 1)
    const [recipients] = await db.query(
      'SELECT user_id FROM `user` WHERE role_id IN (1, 2) AND is_active = 1'
    );

    if (recipients && recipients.length > 0) {
      for (const rec of recipients) {
        await createNotification(
          rec.user_id,
          type || 'Incident',
          message || `Incident reported on Schedule #${truckScheduleId}`
        );
      }
    }

    res.json({ message: 'Incident reported successfully to dispatchers and admins.' });
  } catch (err) {
    console.error('Error reporting incident:', err);
    res.status(500).json({ error: err.message || 'Failed to report incident.' });
  }
});

module.exports = { router, createNotification };