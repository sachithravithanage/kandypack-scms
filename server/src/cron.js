const cron = require('node-cron');
const nodemailer = require('nodemailer');
const db = require('./db');

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
      const [admins] = await connection.query("SELECT email FROM `user` WHERE role_id = 1 AND is_active = 1");
      
      if (admins.length > 0) {
        // Mock sending an email
        console.log(`\n================== EMAIL GATEWAY ==================`);
        console.log(`To: ${admins.map(a => a.email).join(', ')}`);
        console.log(`Subject: End-of-Day Summary`);
        console.log(`Body: Total successful deliveries today: ${totalDeliveries}`);
        console.log(`Status: Mock Email sent successfully.`);
        console.log(`=================================================\n`);
      } else {
        console.log('[CRON] No active administrators found to send email to.');
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[CRON] Error running End-of-Day Summary Email Job:', error);
  }
});
