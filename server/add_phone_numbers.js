const db = require('./src/db');

async function run() {
  try {
    console.log('Adding phone column to user table...');
    try {
      await db.query('ALTER TABLE `user` ADD COLUMN phone VARCHAR(20) NULL;');
      console.log('Column added successfully.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log('Column phone already exists.');
      } else {
         console.log('ALTER error:', e.message);
      }
    }

    console.log('Populating dummy phone numbers for all users...');
    const [users] = await db.query('SELECT user_id FROM `user` WHERE phone IS NULL');
    if (users && users.length > 0) {
      for (let i = 0; i < users.length; i++) {
         const dummyPhone = `+1555${Math.floor(100000 + Math.random() * 900000)}`;
         await db.query('UPDATE `user` SET phone = ? WHERE user_id = ?', [dummyPhone, users[i].user_id]);
      }
      console.log(`Updated ${users.length} users with dummy phone numbers.`);
    } else {
      console.log('No users found without a phone number.');
    }

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    process.exit(0);
  }
}

run();
