const db = require('./src/db');

async function run() {
  try {
    console.log('Adding notification_preferences column to user table...');
    try {
      await db.query("ALTER TABLE `user` ADD COLUMN notification_preferences VARCHAR(255) NOT NULL DEFAULT '{\"sms\":true,\"email\":true,\"inApp\":true}';");
      console.log('Column notification_preferences added successfully.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log('Column notification_preferences already exists.');
      } else {
         console.log('ALTER error:', e.message);
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    process.exit(0);
  }
}

run();
