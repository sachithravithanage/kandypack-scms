const cron = require('node-cron');
const db = require('./db');
const { createNotification } = require('./routes/notifications');

// End-of-Day Summary Email at 6:00 PM every day (0 18 * * *)
cron.schedule('0 18 * * *', async () => {
  console.log('[CRON] Running End-of-Day Summary Email Job...');
  try {
    const connection = await db.getConnection();
    try {
      // Query successful deliveries for today
      // Assuming delivered_at is a datetime or timestamp
      const [deliveries] = await connection.query(
        "SELECT COUNT(*) as count FROM truck_allocation WHERE delivery_status = 'Delivered' AND DATE(delivered_at) = CURDATE()"
      );
      const totalDeliveries = deliveries[0].count;

      // Find administrators
      const [admins] = await connection.query("SELECT user_id FROM `user` WHERE role_id = 1 AND is_active = 1");
      
      if (admins.length > 0) {
        for (const admin of admins) {
          await createNotification(admin.user_id, 'Daily Summary', `Total successful deliveries today: ${totalDeliveries}`);
        }
      } else {
        console.log('[CRON] No active administrators found to notify.');
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[CRON] Error running End-of-Day Summary Email Job:', error);
  }
});
