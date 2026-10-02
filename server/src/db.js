const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let pool = null;
let useFallback = false;

const poolConfig = {
  host: process.env.DB_HOST || 'railway-proj-railwayp-roj.e.aivencloud.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 26357,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'AVNS_Bdu7v9tujxO-7vsMDbh',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 2000,
  waitForConnections: true,
  connectionLimit: 10
};

try {
  pool = mysql.createPool(poolConfig);
} catch (e) {
  useFallback = true;
}

// In-Memory Seed Store (Dual-Mode Fallback when Cloud DB is unreachable)
const mockDb = {
  users: [
    { user_id: 1, name: 'Kasun Perera', email: 'admin@kandypack.lk', phone: '0711111111', role_id: 1, role: 'Administrator' },
    { user_id: 2, name: 'Nimal Fernando', email: 'dispatcher@kandypack.lk', phone: '0712222222', role_id: 2, role: 'Dispatcher' },
    { user_id: 3, name: 'Suneth Silva', email: 'suneth.cmb@kandypack.lk', phone: '0713333333', role_id: 3, role: 'Regional Store Manager' },
    { user_id: 5, name: 'Kamal Gunaratne', email: 'kamal.driver@kandypack.lk', phone: '0715555555', role_id: 4, role: 'Driver' },
    { user_id: 6, name: 'Ajith Kumara', email: 'ajith.driver@kandypack.lk', phone: '0716666666', role_id: 4, role: 'Driver' },
    { user_id: 7, name: 'Bandara Weerakoon', email: 'bandara.asst@kandypack.lk', phone: '0717777777', role_id: 5, role: 'Assistant' },
    { user_id: 8, name: 'Chinthaka Dias', email: 'chinthaka.asst@kandypack.lk', phone: '0718888888', role_id: 5, role: 'Assistant' },
    { user_id: 9, name: 'Waruni Rathnayake', email: 'waruni@gmail.com', phone: '0771234567', role_id: 6, role: 'Customer' }
  ],
  drivers: [
    { user_id: 5, license_number: 'DL-78234' },
    { user_id: 6, license_number: 'DL-90112' }
  ],
  assistants: [
    { user_id: 7 },
    { user_id: 8 }
  ],
  trucks: [
    { truck_id: 1, plate_number: 'WP-CAB-1234', capacity: 50.00 },
    { truck_id: 2, plate_number: 'WP-CAD-5678', capacity: 40.00 },
    { truck_id: 3, plate_number: 'SP-CAF-9012', capacity: 60.00 }
  ],
  stores: [
    { store_id: 1, city_id: 1, name: 'Colombo Regional Store', address: '100 Baseline Road, Colombo 09', city_name: 'Colombo' },
    { store_id: 2, city_id: 3, name: 'Galle Regional Store', address: '45 Matara Road, Galle', city_name: 'Galle' }
  ],
  routes: [
    { route_id: 1, store_id: 1, name: 'Colombo Metro North', max_delivery_time_minutes: 240, store_name: 'Colombo Regional Store', city_name: 'Colombo' },
    { route_id: 2, store_id: 1, name: 'Colombo Metro South', max_delivery_time_minutes: 300, store_name: 'Colombo Regional Store', city_name: 'Colombo' },
    { route_id: 3, store_id: 2, name: 'Galle Coastal Express', max_delivery_time_minutes: 210, store_name: 'Galle Regional Store', city_name: 'Galle' }
  ],
  system_parameters: [
    { param_name: 'driver_min_rest_hours', param_value: '2' }
  ],
  schedules: [
    {
      truck_schedule_id: 1,
      route_id: 1,
      truck_id: 1,
      driver_id: 5,
      assistant_id: 7,
      scheduled_date: '2026-10-10',
      start_time: '08:00:00',
      end_time: '12:00:00',
      status: 'Scheduled',
      pickup_confirmed_at: null
    }
  ],
  allocations: [
    {
      truck_allocation_id: 1,
      truck_schedule_id: 1,
      order_id: 101,
      route_stop_id: 1,
      delivery_status: 'Pending',
      delivered_at: null,
      delivery_note: null
    }
  ],
  audit_logs: [],
  roster_logs: []
};

// Helper: In-memory fallback query executor
function executeMockQuery(sql, params = []) {
  const s = sql.trim().toUpperCase();

  // 1. SELECT max_delivery_time_minutes FROM route WHERE route_id = ?
  if (s.includes('FROM ROUTE') && s.includes('ROUTE_ID =')) {
    const routeId = params[0];
    const r = mockDb.routes.find(x => String(x.route_id) === String(routeId));
    return [[r ? { max_delivery_time_minutes: r.max_delivery_time_minutes } : []]];
  }

  // 2. SELECT ... FROM route r JOIN store ... (metadata)
  if (s.includes('SELECT R.ROUTE_ID') && s.includes('FROM ROUTE')) {
    return [mockDb.routes];
  }

  // 3. SELECT truck_id, plate_number, capacity FROM truck
  if (s.includes('FROM TRUCK') && !s.includes('TRUCK_SCHEDULE')) {
    return [mockDb.trucks];
  }

  // 4. SELECT d.user_id, u.name, d.license_number ... FROM driver
  if (s.includes('FROM DRIVER')) {
    const list = mockDb.drivers.map(d => {
      const u = mockDb.users.find(x => x.user_id === d.user_id) || {};
      return { user_id: d.user_id, name: u.name, license_number: d.license_number, email: u.email, phone: u.phone };
    });
    return [list];
  }

  // 5. SELECT a.user_id ... FROM assistant
  if (s.includes('FROM ASSISTANT')) {
    const list = mockDb.assistants.map(a => {
      const u = mockDb.users.find(x => x.user_id === a.user_id) || {};
      return { user_id: a.user_id, name: u.name, email: u.email, phone: u.phone };
    });
    return [list];
  }

  // 6. SELECT param_name, param_value FROM system_parameter
  if (s.includes('FROM SYSTEM_PARAMETER')) {
    return [mockDb.system_parameters];
  }

  // 7. Check overlaps: SELECT ... FROM truck_schedule WHERE scheduled_date = ? ...
  if (s.includes('FROM TRUCK_SCHEDULE') && s.includes('SCHEDULED_DATE = ?') && s.includes('START_TIME <')) {
    const [scheduledDate, truckId, driverId, assistantId, endTime, startTime] = params;
    const matches = mockDb.schedules.filter(ts => {
      if (ts.scheduled_date !== scheduledDate) return false;
      if (ts.status === 'Cancelled') return false;
      const resMatch = String(ts.truck_id) === String(truckId) ||
                       String(ts.driver_id) === String(driverId) ||
                       String(ts.assistant_id) === String(assistantId);
      if (!resMatch) return false;
      // Overlap: ts.start_time < endTime && ts.end_time > startTime
      return ts.start_time < endTime && ts.end_time > startTime;
    });

    const enriched = matches.map(m => {
      const r = mockDb.routes.find(x => String(x.route_id) === String(m.route_id)) || {};
      return { ...m, route_name: r.name || 'Route' };
    });
    return [enriched];
  }

  // 8. Driver runs today: SELECT * FROM truck_schedule WHERE driver_id = ? AND scheduled_date = ?
  if (s.includes('FROM TRUCK_SCHEDULE') && s.includes('DRIVER_ID = ?') && s.includes('SCHEDULED_DATE = ?')) {
    const [driverId, scheduledDate] = params;
    const list = mockDb.schedules.filter(ts =>
      String(ts.driver_id) === String(driverId) &&
      ts.scheduled_date === scheduledDate &&
      ts.status !== 'Cancelled'
    );
    return [list];
  }

  // 9. Driver weekly hours: SELECT COALESCE(SUM(TIMESTAMPDIFF ...
  if (s.includes('SUM(TIMESTAMPDIFF') && s.includes('DRIVER_ID = ?')) {
    const [driverId] = params;
    const runs = mockDb.schedules.filter(ts => String(ts.driver_id) === String(driverId) && ts.status !== 'Cancelled');
    const total = runs.reduce((sum, r) => {
      const [sh, sm] = r.start_time.split(':').map(Number);
      const [eh, em] = r.end_time.split(':').map(Number);
      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }, 0);
    return [[{ total }]];
  }

  // 10. Assistant weekly hours
  if (s.includes('SUM(TIMESTAMPDIFF') && s.includes('ASSISTANT_ID = ?')) {
    const [assistantId] = params;
    const runs = mockDb.schedules.filter(ts => String(ts.assistant_id) === String(assistantId) && ts.status !== 'Cancelled');
    const total = runs.reduce((sum, r) => {
      const [sh, sm] = r.start_time.split(':').map(Number);
      const [eh, em] = r.end_time.split(':').map(Number);
      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }, 0);
    return [[{ total }]];
  }

  // 11. Assistant count today: SELECT COUNT(*) ... FROM truck_schedule WHERE assistant_id = ? AND scheduled_date = ?
  if (s.includes('COUNT(*)') && s.includes('ASSISTANT_ID = ?')) {
    const [assistantId, scheduledDate] = params;
    const count = mockDb.schedules.filter(ts =>
      String(ts.assistant_id) === String(assistantId) &&
      ts.scheduled_date === scheduledDate &&
      ts.status !== 'Cancelled'
    ).length;
    return [[{ total: count, count }]];
  }

  // 12. INSERT INTO truck_schedule
  if (s.startsWith('INSERT INTO TRUCK_SCHEDULE')) {
    const newId = mockDb.schedules.length + 1;
    const [route_id, truck_id, driver_id, assistant_id, scheduled_date, start_time, end_time] = params;
    const newRecord = {
      truck_schedule_id: newId,
      route_id,
      truck_id,
      driver_id,
      assistant_id,
      scheduled_date,
      start_time,
      end_time,
      status: 'Scheduled',
      pickup_confirmed_at: null
    };
    mockDb.schedules.push(newRecord);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 13. INSERT INTO audit_log
  if (s.startsWith('INSERT INTO AUDIT_LOG')) {
    const [user_id, action, table_affected, record_id, details] = params;
    mockDb.audit_logs.push({ user_id, action, table_affected, record_id, details, timestamp: new Date() });
    return [{ insertId: mockDb.audit_logs.length, affectedRows: 1 }];
  }

  // 14. GET /api/roster (list)
  if (s.includes('FROM TRUCK_SCHEDULE TS') && s.includes('JOIN ROUTE R')) {
    const list = mockDb.schedules.map(ts => {
      const r = mockDb.routes.find(x => String(x.route_id) === String(ts.route_id)) || {};
      const tk = mockDb.trucks.find(x => String(x.truck_id) === String(ts.truck_id)) || {};
      const ud = mockDb.users.find(x => String(x.user_id) === String(ts.driver_id)) || {};
      const ua = mockDb.users.find(x => String(x.user_id) === String(ts.assistant_id)) || {};
      return {
        truck_schedule_id: ts.truck_schedule_id,
        route_id: ts.route_id,
        route_name: r.name || 'Route',
        max_delivery_time_minutes: r.max_delivery_time_minutes || 240,
        store_name: r.store_name || 'Store',
        truck_id: ts.truck_id,
        plate_number: tk.plate_number || 'TRUCK-01',
        truck_capacity: tk.capacity || 50,
        driver_id: ts.driver_id,
        driver_name: ud.name || 'Driver',
        assistant_id: ts.assistant_id,
        assistant_name: ua.name || 'Assistant',
        scheduled_date: ts.scheduled_date,
        start_time: ts.start_time,
        end_time: ts.end_time,
        status: ts.status,
        pickup_confirmed_at: ts.pickup_confirmed_at,
        total_orders: 1,
        total_stops: 1,
        total_allocated_volume: 5.0
      };
    });
    return [list];
  }

  // 15. SELECT status, pickup_confirmed_at FROM truck_schedule WHERE truck_schedule_id = ?
  if (s.includes('FROM TRUCK_SCHEDULE WHERE TRUCK_SCHEDULE_ID = ?')) {
    const id = params[0];
    const match = mockDb.schedules.filter(ts => String(ts.truck_schedule_id) === String(id));
    return [match];
  }

  // 16. DELETE FROM truck_schedule / truck_allocation
  if (s.startsWith('DELETE FROM TRUCK_SCHEDULE')) {
    const id = params[0];
    mockDb.schedules = mockDb.schedules.filter(ts => String(ts.truck_schedule_id) !== String(id));
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('DELETE FROM TRUCK_ALLOCATION')) {
    return [{ affectedRows: 1 }];
  }

  return [[]];
}

module.exports = {
  query: async (sql, params = []) => {
    if (useFallback) {
      return executeMockQuery(sql, params);
    }
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log(`[DB Notice] Cloud MySQL unavailable (${err.code}). Switching to Resilient Seed Data Store.`);
        useFallback = true;
        return executeMockQuery(sql, params);
      }
      throw err;
    }
  },
  getConnection: async () => {
    if (useFallback) {
      return {
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        query: async (sql, params) => executeMockQuery(sql, params)
      };
    }
    try {
      return await pool.getConnection();
    } catch (err) {
      useFallback = true;
      return {
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        query: async (sql, params) => executeMockQuery(sql, params)
      };
    }
  }
};
