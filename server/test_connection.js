const db = require('./src/db');

async function testConnection() {
  console.log('Testing connection to Azure MySQL Database (via automated SSH Tunnel)...');
  try {
    const connection = await db.getConnection();
    console.log('✅ Successfully connected to Azure MySQL database!');

    const [info] = await connection.query('SELECT VERSION() AS version, DATABASE() AS current_db, NOW() AS server_time');
    console.log('\nAzure Server Info:');
    console.log(' - MySQL Version:', info[0].version);
    console.log(' - Current Database:', info[0].current_db);
    console.log(' - Server Time:', info[0].server_time);

    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\nExisting Tables in "${info[0].current_db}": (${tables.length} found)`);
    tables.forEach((row) => console.log(' -', Object.values(row)[0]));

    // Quick verification of core counts
    const [userCount] = await connection.query('SELECT COUNT(*) AS c FROM user');
    const [orderCount] = await connection.query('SELECT COUNT(*) AS c FROM `order`');
    const [tripCount] = await connection.query('SELECT COUNT(*) AS c FROM train_trip');
    const [schedCount] = await connection.query('SELECT COUNT(*) AS c FROM truck_schedule');

    console.log('\n📊 Live Record Counts:');
    console.log(' - Users:', userCount[0].c);
    console.log(' - Orders:', orderCount[0].c);
    console.log(' - Train Trips:', tripCount[0].c);
    console.log(' - Truck Schedules:', schedCount[0].c);

    connection.release();
    console.log('\n🎉 Azure MySQL Database connection and live schema fully verified for local testing!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    process.exit(1);
  }
}

testConnection();
