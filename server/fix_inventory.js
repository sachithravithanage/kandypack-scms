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
    
    console.log("Adding dummy products to main_inventory...");
    await conn.query(`INSERT IGNORE INTO main_inventory (product_id, quantity_in_stock) VALUES (101, 5000), (102, 5000), (103, 5000), (104, 5000)`);
    
    console.log("Done adding inventory.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
