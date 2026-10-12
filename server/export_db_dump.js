const fs = require('fs');
const path = require('path');
const db = require('./src/db');

async function exportDatabase() {
  console.log('Connecting to TiDB Cloud and dumping data...');

  const tables = [
    'role', 'city', 'user', 'employee', 'driver', 'assistant', 'customer',
    'product', 'main_inventory', 'store', 'route', 'route_stop',
    'train', 'train_trip', 'cargo_allocation', 'store_inventory',
    'order', 'order_item', 'truck', 'system_parameter',
    'truck_schedule', 'truck_allocation', 'roster_log', 'notification', 'audit_log'
  ];

  let sql = '-- ================================================================\n';
  sql += '-- Kandypack SCMS Full Database Dump\n';
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += '-- ================================================================\n\n';
  sql += 'USE kandypack;\n';
  sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';
  sql += '-- Ensure all schema alterations exist\n';
  sql += 'ALTER TABLE `order` ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL;\n\n';

  let totalRows = 0;

  for (const table of tables) {
    try {
      const [rows] = await db.query(`SELECT * FROM \`${table}\``);
      if (!rows || rows.length === 0) continue;

      totalRows += rows.length;
      sql += `-- ------------------------------------------------------------\n`;
      sql += `-- Table: \`${table}\` (${rows.length} rows)\n`;
      sql += `-- ------------------------------------------------------------\n`;

      const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');

      for (const row of rows) {
        const vals = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) {
            const pad = (n) => String(n).padStart(2, '0');
            const d = `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`;
            return `'${d}'`;
          }
          if (typeof v === 'boolean') return v ? 1 : 0;
          if (typeof v === 'object') {
            return "'" + JSON.stringify(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
          }
          return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
        }).join(', ');

        sql += `INSERT IGNORE INTO \`${table}\` (${cols}) VALUES (${vals});\n`;
      }
      sql += '\n';
      console.log(`  ✓ Exported ${rows.length} rows from \`${table}\``);
    } catch (err) {
      console.warn(`  ⚠ Error reading \`${table}\`:`, err.message);
    }
  }

  sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';

  const outPath = path.resolve(__dirname, '../db/kandypack_full_seed.sql');
  fs.writeFileSync(outPath, sql, 'utf-8');

  console.log(`\nExport complete! Total rows: ${totalRows}`);
  console.log(`Saved dump to: ${outPath}`);
  process.exit(0);
}

exportDatabase().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
