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
    
    console.log("Creating fn_days_until_delivery...");
    await conn.query(`DROP FUNCTION IF EXISTS fn_days_until_delivery;`);
    await conn.query(`CREATE FUNCTION fn_days_until_delivery (p_from DATE, p_requested DATE) RETURNS INT DETERMINISTIC BEGIN RETURN DATEDIFF(p_requested, p_from); END`);

    console.log("Creating fn_order_total_value...");
    await conn.query(`DROP FUNCTION IF EXISTS fn_order_total_value;`);
    await conn.query(`CREATE FUNCTION fn_order_total_value (p_order_id INT) RETURNS DECIMAL(11,2) READS SQL DATA BEGIN DECLARE v_total DECIMAL(11,2); SELECT COALESCE(SUM(oi.quantity * p.unit_price), 0) INTO v_total FROM order_item oi JOIN product p ON p.product_id = oi.product_id WHERE oi.order_id = p_order_id; RETURN v_total; END`);

    console.log("Creating fn_order_total_volume...");
    await conn.query(`DROP FUNCTION IF EXISTS fn_order_total_volume;`);
    await conn.query(`CREATE FUNCTION fn_order_total_volume (p_order_id INT) RETURNS DECIMAL(10,2) READS SQL DATA BEGIN DECLARE v_total DECIMAL(10,2); SELECT COALESCE(SUM(oi.quantity * p.space_consumption_rate), 0) INTO v_total FROM order_item oi JOIN product p ON p.product_id = oi.product_id WHERE oi.order_id = p_order_id; RETURN v_total; END`);

    console.log("Creating sp_recalc_order_totals...");
    await conn.query(`DROP PROCEDURE IF EXISTS sp_recalc_order_totals;`);
    await conn.query(`CREATE PROCEDURE sp_recalc_order_totals (IN p_order_id INT) BEGIN UPDATE \`order\` SET total_value = fn_order_total_value(p_order_id), total_volume = fn_order_total_volume(p_order_id) WHERE order_id = p_order_id; END`);

    console.log("Done adding missing database functions.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
