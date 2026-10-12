const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 4000,
  user: process.env.DB_USER || '3RMV7RtvWn5FFds.root',
  password: process.env.DB_PASSWORD || 'CA1C4000fIE7agjV',
  database: process.env.DB_NAME || 'kandypack',
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
};

async function run() {
  try {
    const conn = await mysql.createConnection(poolConfig);
    
    console.log("Injecting fake historical orders for August and September 2026...");

    // Find a valid customer_id
    const [users] = await conn.query("SELECT user_id FROM customer LIMIT 1");
    if (users.length === 0) {
      console.log("No customers found. Cannot insert orders.");
      process.exit(1);
    }
    const customerId = users[0].user_id;

    const fakeOrders = [
      // AUGUST 2026
      { order_date: '2026-08-05 10:00:00', total_value: 25000, expected: '2026-08-10' },
      { order_date: '2026-08-12 11:30:00', total_value: 35000, expected: '2026-08-15' },
      { order_date: '2026-08-18 09:15:00', total_value: 12000, expected: '2026-08-20' },
      { order_date: '2026-08-22 14:00:00', total_value: 45000, expected: '2026-08-25' },
      { order_date: '2026-08-29 16:45:00', total_value: 28000, expected: '2026-09-02' },
      
      // SEPTEMBER 2026
      { order_date: '2026-09-03 08:30:00', total_value: 55000, expected: '2026-09-08' },
      { order_date: '2026-09-07 10:20:00', total_value: 42000, expected: '2026-09-12' },
      { order_date: '2026-09-14 13:10:00', total_value: 61000, expected: '2026-09-18' },
      { order_date: '2026-09-16 11:00:00', total_value: 18000, expected: '2026-09-20' },
      { order_date: '2026-09-20 09:45:00', total_value: 39000, expected: '2026-09-25' },
      { order_date: '2026-09-23 15:30:00', total_value: 22000, expected: '2026-09-28' },
      { order_date: '2026-09-28 12:15:00', total_value: 54000, expected: '2026-10-02' }
    ];

    for (const order of fakeOrders) {
      await conn.query(`
        INSERT INTO \`order\` (customer_id, route_id, route_stop_id, delivery_address, order_date, requested_delivery_date, total_volume, total_value, status)
        VALUES (?, 1, 1, 'Fake Address', ?, ?, 50.00, ?, 'Delivered')
      `, [customerId, order.order_date, order.expected, order.total_value]);
    }

    console.log("Successfully injected fake data!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
