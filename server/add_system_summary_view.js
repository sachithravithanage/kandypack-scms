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
    
    console.log("Creating View: vw_complete_system_summary (Detailed Log)...");
    await conn.query(`DROP VIEW IF EXISTS vw_complete_system_summary`);
    await conn.query(`
      CREATE VIEW vw_complete_system_summary AS
      SELECT 
        ta.truck_allocation_id,
        o.order_id,
        uc.name AS customer_name,
        ta.delivery_status AS status,
        ta.delivered_at,
        t.plate_number AS truck_plate,
        ud.name AS driver_name,
        ua.name AS assistant_name
      FROM truck_allocation ta
      JOIN \`order\` o ON ta.order_id = o.order_id
      JOIN \`user\` uc ON o.customer_id = uc.user_id
      JOIN truck_schedule ts ON ta.truck_schedule_id = ts.truck_schedule_id
      JOIN truck t ON ts.truck_id = t.truck_id
      LEFT JOIN employee ed ON ts.driver_id = ed.user_id
      LEFT JOIN \`user\` ud ON ed.user_id = ud.user_id
      LEFT JOIN employee ea ON ts.assistant_id = ea.user_id
      LEFT JOIN \`user\` ua ON ea.user_id = ua.user_id
    `);

    console.log("Detailed vw_complete_system_summary successfully applied!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
