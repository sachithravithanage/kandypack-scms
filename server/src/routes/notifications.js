'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

async function createNotification(userId, type, message) {
  try {
    await db.query(
      'INSERT INTO notification (user_id, type, message) VALUES (?, ?, ?)',
      [userId, type, message]
    );
    console.log(`[Notification Alert] User ${userId} [${type}]: ${message}`);
  } catch (err) {
    console.error(`[Notification Error] Failed to create notification for User ${userId}:`, err);
  }
}

// GET /api/notifications/:userId - Fetch all notifications for a user
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.user_id;
    const requesterRoleId = req.user.roleId || req.user.role_id;
    if (requesterRoleId !== 1 && Number(req.params.userId) !== Number(requesterId)) {
      return res.status(403).json({ error: 'Not authorized to view these notifications.' });
    }

    const [rows] = await db.query(
      'SELECT * FROM notification WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notifications.' });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications read for the current user
router.put('/mark-all-read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.user_id;
    const [result] = await db.query(
      'UPDATE notification SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ message: 'All notifications marked as read.', updated: result.affectedRows });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: err.message || 'Failed to acknowledge notifications.' });
  }
});

// PUT /api/notifications/:id/acknowledge - Mark single notification as read
router.put('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.user_id;
    const requesterRoleId = req.user.roleId || req.user.role_id;
    let sql = 'UPDATE notification SET is_read = TRUE WHERE notification_id = ?';
    const params = [req.params.id];
    if (requesterRoleId !== 1) {
      sql += ' AND user_id = ?';
      params.push(requesterId);
    }

    const [result] = await db.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized.' });
    }
    res.json({ message: 'Notification acknowledged' });
  } catch (err) {
    console.error('Error acknowledging notification:', err);
    res.status(500).json({ error: err.message || 'Failed to acknowledge notification.' });
  }
});

// POST /api/notifications/report-incident - Driver logs in-route incident (notifies Dispatchers & Admins)
router.post('/report-incident', requireAuth, async (req, res) => {
  try {
    const reporterUserId = req.user.userId || req.user.user_id;
    const { truckScheduleId, type, message } = req.body;

    // Find all dispatchers (role_id = 2) and admins (role_id = 1)
    const [recipients] = await db.query(
      'SELECT user_id FROM `user` WHERE role_id IN (1, 2) AND is_active = 1'
    );

    const alertType = type || 'Incident';
    const alertMessage = message || `Incident reported on Schedule #${truckScheduleId}`;

    if (recipients && recipients.length > 0) {
      for (const rec of recipients) {
        await createNotification(rec.user_id, alertType, alertMessage);
      }
    }

    // Log incident report to audit_log
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_affected, record_id, details)
       VALUES (?, 'Reported incident', 'truck_schedule', ?, ?)`,
      [reporterUserId, truckScheduleId || null, `Type: ${alertType}, Message: ${alertMessage}`]
    );

    res.json({
      message: 'Incident reported successfully to dispatchers and admins.',
    });
  } catch (err) {
    console.error('Error reporting incident:', err);
    res.status(500).json({ error: err.message || 'Failed to report incident.' });
  }
});

module.exports = { router, createNotification };
