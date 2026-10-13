const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { ensureAzureTunnel } = require('./tunnel');

let tunnelPromise = null;
function getTunnelPromise() {
  if (process.env.DB_SSH_TUNNEL === 'true') {
    if (!tunnelPromise) {
      tunnelPromise = ensureAzureTunnel().catch((err) => {
        console.warn('[DB] Azure tunnel warning:', err.message);
        return false;
      });
    }
    return tunnelPromise;
  }
  return Promise.resolve(true);
}

// Start tunnel immediately in background on module load
getTunnelPromise();

async function ensureReady() {
  if (process.env.DB_SSH_TUNNEL === 'true') {
    await getTunnelPromise();
  }
}

let pool = null;

const poolConfig = {
  host: process.env.DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 4000,
  user: process.env.DB_USER || '3RMV7RtvWn5FFds.root',
  password: process.env.DB_PASSWORD || 'CA1C4000fIE7agjV',
  database: process.env.DB_NAME || 'kandypack',
  connectTimeout: 25000,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  }
};

pool = mysql.createPool(poolConfig);

// In-Memory Seed Store (Dual-Mode Fallback when Cloud DB is unreachable)
const defaultPasswordHash = '$2b$10$374Bl.tHpkS2hhlC.2wbNebqy7YMV3f/u6ayVmCI3VVEdHurSIa2O'; // password123

const mockDb = {
  users: [
    { user_id: 1, name: 'Nimal Perera', email: 'admin@kandypack.local', phone: '0711111111', role_id: 1, role: 'Administrator', is_active: 1, password_hash: defaultPasswordHash },
    { user_id: 2, name: 'Kavinda Fernando', email: 'dispatcher@kandypack.local', phone: '0712222222', role_id: 2, role: 'Dispatcher', is_active: 1, password_hash: defaultPasswordHash },
    { user_id: 3, name: 'Suneth Silva', email: 'manager@kandypack.local', phone: '0713333333', role_id: 3, role: 'Regional Store Manager', is_active: 1, password_hash: defaultPasswordHash },
    { user_id: 4, name: 'Kamal Gunaratne', email: 'kamal.driver@kandypack.lk', phone: '0715555555', role_id: 4, role: 'Driver', is_active: 1, password_hash: defaultPasswordHash },
    { user_id: 5, name: 'Bandara Weerakoon', email: 'bandara.asst@kandypack.lk', phone: '0717777777', role_id: 5, role: 'Assistant', is_active: 1, password_hash: defaultPasswordHash },
    { user_id: 6, name: 'Ajith Kumara', email: 'ajith.driver@kandypack.lk', phone: '0716666666', role_id: 4, role: 'Driver', is_active: 1, password_hash: defaultPasswordHash },
    { user_id: 7, name: 'Chinthaka Dias', email: 'chinthaka.asst@kandypack.lk', phone: '0718888888', role_id: 5, role: 'Assistant', is_active: 1, email_verified: true, password_hash: defaultPasswordHash },
    { user_id: 8, name: 'Bandara Assistant', email: 'assistant@kandypack.local', phone: '0717777778', role_id: 5, role: 'Assistant', is_active: 1, password_hash: defaultPasswordHash },
    { user_id: 9, name: 'Waruni Rathnayake', email: 'waruni.rathnayake@kandypack.lk', phone: '0703504806', role_id: 6, role: 'Customer', is_active: 1, email_verified: true, password_hash: defaultPasswordHash },
    { user_id: 999, name: 'Dilshan Wickramasinghe', email: 'dilshan.wickramasinghe@kandypack.lk', phone: '0772345678', role_id: 6, role: 'Customer', is_active: 1, email_verified: true, password_hash: defaultPasswordHash }
  ],
  customers: [
    { user_id: 9, phone: '0703504806', address: '42 Flower Road, Colombo 07', city_id: 1 },
    { user_id: 999, phone: '0772345678', address: '45 Galle Road, Colombo 03', city_id: 1 }
  ],
  drivers: [
    { user_id: 4, license_number: 'DL-78234' },
    { user_id: 6, license_number: 'DL-90112' }
  ],
  assistants: [
    { user_id: 5 },
    { user_id: 7 },
    { user_id: 8 }
  ],
  products: [
    { product_id: 101, name: 'Kandypack Milk Powder 400g', price: 850.00, unit_price: 850.00, volume: 1.20, space_consumption_rate: 1.20 },
    { product_id: 102, name: 'Kandypack Tea Leaves 200g', price: 450.00, unit_price: 450.00, volume: 0.50, space_consumption_rate: 0.50 },
    { product_id: 103, name: 'Kandypack Chocolate Biscuits', price: 220.00, unit_price: 220.00, volume: 0.80, space_consumption_rate: 0.80 },
    { product_id: 104, name: 'Kandypack Sugar 1kg', price: 300.00, unit_price: 300.00, volume: 1.00, space_consumption_rate: 1.00 },
    { product_id: 105, name: 'Kandypack Roasted Coffee 200g', price: 650.00, unit_price: 650.00, volume: 0.40, space_consumption_rate: 0.40 },
    { product_id: 106, name: 'Kandypack Dhal 1kg', price: 320.00, unit_price: 320.00, volume: 0.90, space_consumption_rate: 0.90 },
    { product_id: 107, name: 'Kandypack Coconut Milk 400ml', price: 380.00, unit_price: 380.00, volume: 0.50, space_consumption_rate: 0.50 },
    { product_id: 108, name: 'Kandypack White Basmati Rice 5kg', price: 1850.00, unit_price: 1850.00, volume: 3.50, space_consumption_rate: 3.50 }
  ],
  inventory: [
    { product_id: 101, quantity_in_stock: 4990 },
    { product_id: 102, quantity_in_stock: 4994 },
    { product_id: 103, quantity_in_stock: 4996 },
    { product_id: 104, quantity_in_stock: 4997 },
    { product_id: 105, quantity_in_stock: 45 },
    { product_id: 106, quantity_in_stock: 18 },
    { product_id: 107, quantity_in_stock: 0 },
    { product_id: 108, quantity_in_stock: 0 }
  ],
  trucks: [
    { truck_id: 1, plate_number: 'WP-CAB-1234', capacity: 50.00 },
    { truck_id: 2, plate_number: 'WP-CAD-5678', capacity: 40.00 },
    { truck_id: 3, plate_number: 'SP-CAF-9012', capacity: 60.00 }
  ],
  stores: [
    { store_id: 1, city_id: 1, name: 'Colombo Regional Store', address: '100 Baseline Road, Colombo 09', city_name: 'Colombo' },
    { store_id: 2, city_id: 3, name: 'Galle Regional Store', address: '45 Matara Road, Galle', city_name: 'Galle' },
    { store_id: 3, city_id: 2, name: 'Negombo Regional Store', address: '15 Beach Road, Negombo', city_name: 'Negombo' },
    { store_id: 4, city_id: 4, name: 'Matara Regional Store', address: '22 Station Road, Matara', city_name: 'Matara' },
    { store_id: 5, city_id: 5, name: 'Jaffna Regional Store', address: '5 Temple Road, Jaffna', city_name: 'Jaffna' },
    { store_id: 6, city_id: 6, name: 'Trincomalee Regional Store', address: '88 Inner Harbour Road, Trincomalee', city_name: 'Trincomalee' }
  ],
  routes: [
    { route_id: 1, store_id: 1, name: 'Colombo Metro North', max_delivery_time_minutes: 240, store_name: 'Colombo Regional Store', city_name: 'Colombo' },
    { route_id: 2, store_id: 1, name: 'Colombo Metro South', max_delivery_time_minutes: 300, store_name: 'Colombo Regional Store', city_name: 'Colombo' },
    { route_id: 3, store_id: 3, name: 'Negombo Coastal Express', max_delivery_time_minutes: 180, store_name: 'Negombo Regional Store', city_name: 'Negombo' },
    { route_id: 4, store_id: 3, name: 'Negombo Airport & Industrial Zone', max_delivery_time_minutes: 210, store_name: 'Negombo Regional Store', city_name: 'Negombo' },
    { route_id: 5, store_id: 2, name: 'Galle Coastal & Heritage Route', max_delivery_time_minutes: 240, store_name: 'Galle Regional Store', city_name: 'Galle' },
    { route_id: 6, store_id: 2, name: 'Galle Inland & Medical Corridor', max_delivery_time_minutes: 270, store_name: 'Galle Regional Store', city_name: 'Galle' },
    { route_id: 7, store_id: 4, name: 'Matara Urban Commercial Route', max_delivery_time_minutes: 210, store_name: 'Matara Regional Store', city_name: 'Matara' },
    { route_id: 8, store_id: 4, name: 'Matara Southern Coast & Weligama', max_delivery_time_minutes: 260, store_name: 'Matara Regional Store', city_name: 'Matara' },
    { route_id: 9, store_id: 5, name: 'Jaffna Peninsula Central Route', max_delivery_time_minutes: 300, store_name: 'Jaffna Regional Store', city_name: 'Jaffna' },
    { route_id: 10, store_id: 5, name: 'Jaffna Northern Coastal Express', max_delivery_time_minutes: 360, store_name: 'Jaffna Regional Store', city_name: 'Jaffna' },
    { route_id: 11, store_id: 6, name: 'Trincomalee Harbour & City Route', max_delivery_time_minutes: 240, store_name: 'Trincomalee Regional Store', city_name: 'Trincomalee' },
    { route_id: 12, store_id: 6, name: 'Trincomalee Coastal Tourism Route', max_delivery_time_minutes: 300, store_name: 'Trincomalee Regional Store', city_name: 'Trincomalee' }
  ],
  system_parameters: [
    { param_name: 'driver_min_rest_hours', param_value: '2' }
  ],
  schedules: [
    {
      truck_schedule_id: 1,
      route_id: 1,
      truck_id: 1,
      driver_id: 4,
      assistant_id: 5,
      scheduled_date: '2026-10-14',
      start_time: '08:00:00',
      end_time: '12:00:00',
      status: 'In Progress',
      pickup_confirmed_at: '2026-10-14T02:45:00.000Z'
    },
    {
      truck_schedule_id: 2,
      route_id: 2,
      truck_id: 2,
      driver_id: 6,
      assistant_id: 7,
      scheduled_date: '2026-10-14',
      start_time: '13:00:00',
      end_time: '18:00:00',
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
      stop_name: 'Colombo 07 - Cinnamon Gardens',
      stop_order: 1,
      delivery_address: '42 Flower Road, Colombo 07',
      total_volume: 4.50,
      order_status: 'Delivered',
      customer_name: 'Waruni Rathnayake',
      customer_phone: '0703504806',
      delivery_status: 'Delivered',
      delivered_at: '2026-10-14T03:40:00.000Z',
      delivery_note: 'Handed directly to recipient. Signed on glass.'
    },
    {
      truck_allocation_id: 2,
      truck_schedule_id: 1,
      order_id: 102,
      route_stop_id: 2,
      stop_name: 'Colombo 03 - Kollupitiya Junction',
      stop_order: 2,
      delivery_address: '45 Galle Road, Colombo 03',
      total_volume: 6.20,
      order_status: 'In Transit',
      customer_name: 'Dilshan Wickramasinghe',
      customer_phone: '0772345678',
      delivery_status: 'Attempted',
      delivered_at: '2026-10-14T04:55:00.000Z',
      delivery_note: 'Customer gate locked. Unanswered phone call.'
    },
    {
      truck_allocation_id: 3,
      truck_schedule_id: 1,
      order_id: 103,
      route_stop_id: 3,
      stop_name: 'Ratmalana Airport Bypass',
      stop_order: 3,
      delivery_address: '88 Baseline Road, Colombo 09',
      total_volume: 5.80,
      order_status: 'In Transit',
      customer_name: 'Waruni Rathnayake',
      customer_phone: '0703504806',
      delivery_status: 'Pending',
      delivered_at: null,
      delivery_note: null
    }
  ],
  orders: [
    { order_id: 101, customer_id: 9, delivery_address: '42 Flower Road, Colombo 07', total_volume: 4.50, status: 'Delivered' },
    { order_id: 102, customer_id: 999, delivery_address: '45 Galle Road, Colombo 03', total_volume: 6.20, status: 'In Transit' },
    { order_id: 103, customer_id: 9, delivery_address: '88 Baseline Road, Colombo 09', total_volume: 5.80, status: 'In Transit' }
  ],
  route_stops: [
    { route_stop_id: 1, route_id: 1, stop_name: 'Colombo 07 - Cinnamon Gardens', stop_order: 1 },
    { route_stop_id: 2, route_id: 1, stop_name: 'Colombo 03 - Kollupitiya Junction', stop_order: 2 },
    { route_stop_id: 101, route_id: 1, stop_name: 'Colombo 10 - Maradana Commercial Hub', stop_order: 3 },
    { route_stop_id: 102, route_id: 1, stop_name: 'Colombo 01 - Fort Central Station', stop_order: 4 },
    { route_stop_id: 4, route_id: 2, stop_name: 'Dehiwala Junction Central', stop_order: 1 },
    { route_stop_id: 5, route_id: 2, stop_name: 'Mount Lavinia Hotel Stop', stop_order: 2 },
    { route_stop_id: 3, route_id: 2, stop_name: 'Ratmalana Airport Bypass', stop_order: 3 },
    { route_stop_id: 103, route_id: 2, stop_name: 'Moratuwa Town Crossroad', stop_order: 4 },
    { route_stop_id: 201, route_id: 3, stop_name: 'Negombo Town Bus Stand', stop_order: 1 },
    { route_stop_id: 202, route_id: 3, stop_name: 'Kochchikade Central Market', stop_order: 2 },
    { route_stop_id: 203, route_id: 3, stop_name: 'Porutota Beach Promenade', stop_order: 3 },
    { route_stop_id: 204, route_id: 3, stop_name: 'Waikkal Bridge Terminal', stop_order: 4 },
    { route_stop_id: 205, route_id: 4, stop_name: 'Katunayake FTZ Gate 1', stop_order: 1 },
    { route_stop_id: 206, route_id: 4, stop_name: 'Bandaranaike Airport Cargo Bay', stop_order: 2 },
    { route_stop_id: 207, route_id: 4, stop_name: 'Seeduwa Junction Marketplace', stop_order: 3 },
    { route_stop_id: 208, route_id: 4, stop_name: 'Ja-Ela Express Interchange', stop_order: 4 },
    { route_stop_id: 301, route_id: 5, stop_name: 'Galle Fort Main Gate', stop_order: 1 },
    { route_stop_id: 302, route_id: 5, stop_name: 'Unawatuna Beach Junction', stop_order: 2 },
    { route_stop_id: 303, route_id: 5, stop_name: 'Talpe Coastal Bypass', stop_order: 3 },
    { route_stop_id: 304, route_id: 5, stop_name: 'Koggala Export Processing Zone', stop_order: 4 },
    { route_stop_id: 305, route_id: 6, stop_name: 'Karapitiya Teaching Hospital Square', stop_order: 1 },
    { route_stop_id: 306, route_id: 6, stop_name: 'Labuduwa Agricultural Complex', stop_order: 2 },
    { route_stop_id: 307, route_id: 6, stop_name: 'Baddegama Road Industrial Park', stop_order: 3 },
    { route_stop_id: 308, route_id: 6, stop_name: 'Hikkaduwa Tourism Hub', stop_order: 4 },
    { route_stop_id: 401, route_id: 7, stop_name: 'Matara Fort & Bus Terminal', stop_order: 1 },
    { route_stop_id: 402, route_id: 7, stop_name: 'Nupe Junction Trade Hub', stop_order: 2 },
    { route_stop_id: 403, route_id: 7, stop_name: 'Uyanwatta Stadium Road', stop_order: 3 },
    { route_stop_id: 404, route_id: 7, stop_name: 'Rahula Crossroad Commercial Area', stop_order: 4 },
    { route_stop_id: 405, route_id: 8, stop_name: 'Mirissa Harbour Road', stop_order: 1 },
    { route_stop_id: 406, route_id: 8, stop_name: 'Weligama Bay Central Market', stop_order: 2 },
    { route_stop_id: 407, route_id: 8, stop_name: 'Dondra Head Lighthouse Halt', stop_order: 3 },
    { route_stop_id: 408, route_id: 8, stop_name: 'Akuressa Inland Trade Station', stop_order: 4 },
    { route_stop_id: 501, route_id: 9, stop_name: 'Jaffna Town Clock Tower Square', stop_order: 1 },
    { route_stop_id: 502, route_id: 9, stop_name: 'Nallur Kandaswamy Kovil Approach', stop_order: 2 },
    { route_stop_id: 503, route_id: 9, stop_name: 'Kopay Junction Agricultural Center', stop_order: 3 },
    { route_stop_id: 504, route_id: 9, stop_name: 'Chavakachcheri Market Hub', stop_order: 4 },
    { route_stop_id: 505, route_id: 10, stop_name: 'Chunnakam Commercial Market', stop_order: 1 },
    { route_stop_id: 506, route_id: 10, stop_name: 'Tellippalai Hospital Halt', stop_order: 2 },
    { route_stop_id: 507, route_id: 10, stop_name: 'Kankesanthurai (KKS) Harbour Port', stop_order: 3 },
    { route_stop_id: 508, route_id: 10, stop_name: 'Point Pedro Fishery Terminal', stop_order: 4 },
    { route_stop_id: 601, route_id: 11, stop_name: 'Trincomalee Inner Harbour Wharf', stop_order: 1 },
    { route_stop_id: 602, route_id: 11, stop_name: 'Fort Frederick / Koneswaram Road', stop_order: 2 },
    { route_stop_id: 603, route_id: 11, stop_name: 'China Bay Industrial Zone', stop_order: 3 },
    { route_stop_id: 604, route_id: 11, stop_name: 'Kinniya Bridge Main Terminal', stop_order: 4 },
    { route_stop_id: 605, route_id: 12, stop_name: 'Uppuveli Beach Commercial Strip', stop_order: 1 },
    { route_stop_id: 606, route_id: 12, stop_name: 'Nilaveli Tourism Beach Road', stop_order: 2 },
    { route_stop_id: 607, route_id: 12, stop_name: 'Kuchchaveli Bypass Halt', stop_order: 3 },
    { route_stop_id: 608, route_id: 12, stop_name: 'Kantale Agricultural Depot', stop_order: 4 }
  ],
  audit_logs: [],
  roster_logs: []
};

// Helper: In-memory fallback query executor
function executeMockQuery(sql, params = []) {
  const s = sql.trim().toUpperCase();

  // 0. User login lookup: SELECT u.*, r.role_name AS role FROM user u JOIN role r ... WHERE u.email IN (?) / email = ?
  if (s.includes('WHERE U.EMAIL') || s.includes('WHERE EMAIL') || s.includes('FROM USER WHERE EMAIL = ?')) {
    const rawEmails = Array.isArray(params[0]) ? params[0] : [params[0]];
    const emails = rawEmails.map(e => String(e).toLowerCase());
    const matches = mockDb.users.filter(u => emails.includes(u.email.toLowerCase()));
    return [matches];
  }

  // Delivery Stops for New Order Form (JOIN ROUTE_STOP, ROUTE, STORE)
  if (s.includes('FROM ROUTE_STOP RS') && s.includes('JOIN ROUTE R')) {
    const cityId = params[0];
    const stops = mockDb.route_stops.filter(rs => {
      const r = mockDb.routes.find(route => route.route_id === rs.route_id);
      if (!r) return false;
      const st = mockDb.stores.find(store => store.store_id === r.store_id);
      return st && String(st.city_id) === String(cityId);
    }).map(rs => {
      const r = mockDb.routes.find(route => route.route_id === rs.route_id);
      return {
        route_stop_id: rs.route_stop_id,
        stop_name: rs.stop_name,
        route_id: r.route_id,
        route_name: r.name
      };
    });
    return [stops];
  }

  // Profile lookup: SELECT u.user_id, u.name ... FROM user u LEFT JOIN customer c ON u.user_id = c.user_id WHERE u.user_id = ?
  if (s.includes('FROM USER U') && s.includes('LEFT JOIN CUSTOMER C') && s.includes('WHERE U.USER_ID = ?')) {
    const userId = params[0];
    const user = mockDb.users.find(u => String(u.user_id) === String(userId));
    if (!user) return [[]];
    
    let result = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      phone: null,
      address: null,
      city_id: null
    };

    if (user.role_id === 6) {
      const cust = mockDb.customers.find(c => String(c.user_id) === String(userId));
      if (cust) {
        result.phone = cust.phone;
        result.address = cust.address;
        result.city_id = cust.city_id;
      }
    }
    return [[result]];
  }

  // Update Profile - User base record
  if (s.startsWith('UPDATE USER SET NAME = COALESCE')) {
    const [name, userId] = params;
    const user = mockDb.users.find(u => String(u.user_id) === String(userId));
    if (user && name) user.name = name;
    return [{ affectedRows: 1 }];
  }

  // Update Profile - Customer details
  if (s.startsWith('UPDATE CUSTOMER SET PHONE = COALESCE')) {
    const [phone, address, cityId, userId] = params;
    let cust = mockDb.customers.find(c => String(c.user_id) === String(userId));
    if (!cust) {
      cust = { user_id: Number(userId), phone: null, address: null, city_id: null };
      mockDb.customers.push(cust);
    }
    if (phone) cust.phone = phone;
    if (address) cust.address = address;
    if (cityId) cust.city_id = Number(cityId);
    return [{ affectedRows: 1 }];
  }

  // Inventory: GET /api/inventory
  if (s.includes('FROM MAIN_INVENTORY MI JOIN PRODUCT P')) {
    const results = mockDb.inventory.map(inv => {
      const prod = mockDb.products.find(p => p.product_id === inv.product_id);
      return {
        product_id: inv.product_id,
        name: prod ? prod.name : 'Unknown Product',
        quantity_in_stock: inv.quantity_in_stock
      };
    });
    return [results];
  }

  // Inventory: PUT /api/inventory/:id/restock
  if (s.includes('INSERT INTO MAIN_INVENTORY (PRODUCT_ID, QUANTITY_IN_STOCK)')) {
    const [productId, quantityAdded, quantityAddedUpdate] = params;
    const inv = mockDb.inventory.find(i => String(i.product_id) === String(productId));
    if (inv) {
      inv.quantity_in_stock += Number(quantityAddedUpdate);
    } else {
      mockDb.inventory.push({ product_id: Number(productId), quantity_in_stock: Number(quantityAdded) });
    }
    return [{ affectedRows: 1 }];
  }

  // Order Placement Mock: fn_days_until_delivery
  if (s.includes('FN_DAYS_UNTIL_DELIVERY')) {
    const deliveryDate = params[0];
    const today = new Date();
    today.setHours(0,0,0,0);
    const chosen = new Date(deliveryDate);
    const diffDays = Math.ceil((chosen.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return [[{ days: diffDays }]];
  }

  // Order Placement Mock: Validate customer
  if (s.includes('SELECT USER_ID FROM CUSTOMER WHERE USER_ID = ?')) {
    return [[{ user_id: params[0] }]];
  }

  // Order Placement Mock: Validate route stop
  if (s.includes('SELECT ROUTE_ID FROM ROUTE_STOP WHERE ROUTE_STOP_ID = ?')) {
    const stop = mockDb.route_stops.find(rs => String(rs.route_stop_id) === String(params[0]));
    return [[stop || { route_id: 1 }]];
  }

  // Order Placement Mock: Insert order
  if (s.startsWith('INSERT INTO `ORDER`') || s.startsWith('INSERT INTO ORDER ')) {
    const orderId = mockDb.orders.length + 101;
    mockDb.orders.push({ order_id: orderId, customer_id: params[0], delivery_address: params[3], total_volume: 5.0, status: 'Placed' });
    return [{ insertId: orderId, affectedRows: 1 }];
  }

  // Order Placement Mock: Insert order item
  if (s.startsWith('INSERT INTO ORDER_ITEM')) {
    return [{ affectedRows: 1 }];
  }

  // Order Placement Mock: Update inventory
  if (s.includes('UPDATE MAIN_INVENTORY SET QUANTITY_IN_STOCK = QUANTITY_IN_STOCK - ?')) {
    const [qty, pid, checkQty] = params;
    const inv = mockDb.inventory.find(i => String(i.product_id) === String(pid));
    if (inv && inv.quantity_in_stock >= Number(checkQty)) {
      inv.quantity_in_stock -= Number(qty);
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // Order Placement Mock: Recalculate totals
  if (s.includes('CALL SP_RECALC_ORDER_TOTALS')) {
    return [[]]; // SPs usually return arrays of result sets
  }

  // Dashboard: Total orders (reports/sales)
  if (s.includes('AS TOTAL_ORDERS') && s.includes('FROM `ORDER`')) {
    return [[{ period: '2026-10', total_orders: 1450, total_revenue: 2500000, total_volume: 120 }]];
  }

  // Dashboard: In-transit trips (reports/truck-utilization)
  if (s.includes('TOTAL_TRIPS_ASSIGNED') && s.includes('FROM TRUCK')) {
    return [[
      { truck_id: 1, plate_number: 'WP-CAB-1234', capacity: 50.00, total_trips_assigned: 12, total_stops_serviced: 45 },
      { truck_id: 2, plate_number: 'WP-CAD-5678', capacity: 40.00, total_trips_assigned: 8, total_stops_serviced: 22 }
    ]];
  }

  // Dashboard / AppLayout: Notifications
  if (s.includes('FROM NOTIFICATION WHERE USER_ID = ?')) {
    return [[
      { notification_id: 1, user_id: params[0], message: 'System maintenance scheduled for tonight.', is_read: 0, created_at: new Date() },
      { notification_id: 2, user_id: params[0], message: 'New order #1042 assigned to your region.', is_read: 1, created_at: new Date() }
    ]];
  }

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

  // 4b. Query with UDF fn_get_driver_weekly_hours (CS3043 Advanced SQL)
  if (s.includes('FN_GET_DRIVER_WEEKLY_HOURS')) {
    const list = mockDb.drivers.map(d => {
      const u = mockDb.users.find(x => x.user_id === d.user_id) || {};
      const driverHours = (mockDb.roster_logs || []).filter(rl => {
        const sch = mockDb.schedules.find(s => s.truck_schedule_id === rl.truck_schedule_id);
        return sch && sch.driver_id === d.user_id;
      }).reduce((sum, rl) => sum + (Number(rl.actual_hours_worked) || 0), 0);

      return {
        driver_id: d.user_id,
        driver_name: u.name || 'Kamal Gunaratne',
        license_number: d.license_number,
        hours_worked_this_week: parseFloat(driverHours.toFixed(2))
      };
    });
    return [list];
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

  // 15. SELECT truck_schedule_id, status, pickup_confirmed_at FROM truck_schedule WHERE truck_schedule_id = ?
  if (s.includes('FROM TRUCK_SCHEDULE WHERE TRUCK_SCHEDULE_ID = ?')) {
    const id = params[0];
    const match = mockDb.schedules.filter(ts => String(ts.truck_schedule_id) === String(id));
    return [match];
  }

  // 16. Single schedule detail for delivery execution
  if (s.includes('FROM TRUCK_SCHEDULE TS') && s.includes('WHERE TS.TRUCK_SCHEDULE_ID = ?')) {
    const id = params[0];
    const ts = mockDb.schedules.find(x => String(x.truck_schedule_id) === String(id));
    if (!ts) return [[]];
    const r = mockDb.routes.find(x => String(x.route_id) === String(ts.route_id)) || {};
    const tk = mockDb.trucks.find(x => String(x.truck_id) === String(ts.truck_id)) || {};
    const ud = mockDb.users.find(x => String(x.user_id) === String(ts.driver_id)) || {};
    const ua = mockDb.users.find(x => String(x.user_id) === String(ts.assistant_id)) || {};
    return [[{
      truck_schedule_id: ts.truck_schedule_id,
      route_id: ts.route_id,
      route_name: r.name || 'Route',
      max_delivery_time_minutes: r.max_delivery_time_minutes || 240,
      truck_id: ts.truck_id,
      plate_number: tk.plate_number || 'WP-CAB-1234',
      truck_capacity: tk.capacity || 50,
      driver_id: ts.driver_id,
      driver_name: ud.name || 'Kamal Gunaratne',
      assistant_id: ts.assistant_id,
      assistant_name: ua.name || 'Bandara Weerakoon',
      scheduled_date: ts.scheduled_date,
      start_time: ts.start_time,
      end_time: ts.end_time,
      status: ts.status,
      pickup_confirmed_at: ts.pickup_confirmed_at
    }]];
  }

  // 17b. Stop sequence check query in mockDb
  if (s.includes('FROM TRUCK_ALLOCATION TA') && (s.includes('RS.STOP_ORDER <') || s.includes('STOP_ORDER <'))) {
    const [currentRouteStopId, scheduleId, allocationId] = params;
    const currentStop = mockDb.route_stops.find(x => String(x.route_stop_id) === String(currentRouteStopId));
    if (!currentStop) return [[]];
    
    const prior = mockDb.allocations.filter(a => {
      if (String(a.truck_schedule_id) !== String(scheduleId)) return false;
      if (String(a.truck_allocation_id) === String(allocationId)) return false;
      if (a.delivery_status !== 'Pending') return false;
      const rs = mockDb.route_stops.find(x => String(x.route_stop_id) === String(a.route_stop_id));
      return rs && rs.stop_order < currentStop.stop_order;
    });

    if (prior.length === 0) return [[]];
    const firstPrior = prior[0];
    const rs = mockDb.route_stops.find(x => String(x.route_stop_id) === String(firstPrior.route_stop_id)) || {};
    return [[{
      truck_allocation_id: firstPrior.truck_allocation_id,
      stop_name: rs.stop_name || 'Prior Stop',
      stop_order: rs.stop_order || 1
    }]];
  }

  // 17. Delivery stops / allocations for a schedule (REQ-DEL-01)
  if (s.includes('FROM TRUCK_ALLOCATION TA') && s.includes('TA.TRUCK_SCHEDULE_ID = ?')) {
    const scheduleId = params[0];
    const allocs = mockDb.allocations.filter(a => String(a.truck_schedule_id) === String(scheduleId));
    const list = allocs.map(a => {
      const o = mockDb.orders.find(x => String(x.order_id) === String(a.order_id)) || {};
      const u = mockDb.users.find(x => String(x.user_id) === String(o.customer_id)) || {};
      const rs = mockDb.route_stops.find(x => String(x.route_stop_id) === String(a.route_stop_id)) || {};
      return {
        truck_allocation_id: a.truck_allocation_id,
        truck_schedule_id: a.truck_schedule_id,
        order_id: a.order_id,
        route_stop_id: a.route_stop_id,
        stop_name: rs.stop_name || 'Delivery Stop',
        stop_order: rs.stop_order || 1,
        delivery_address: o.delivery_address || 'Address',
        total_volume: o.total_volume || 5.0,
        order_status: o.status || 'In Transit',
        customer_name: u.name || 'Valued Customer',
        customer_phone: u.phone || '0771234567',
        delivery_status: a.delivery_status || 'Pending',
        delivered_at: a.delivered_at,
        delivery_note: a.delivery_note
      };
    });
    return [list];
  }

  // 18. Store pickup confirmation (REQ-DEL-02)
  if (s.includes('UPDATE TRUCK_SCHEDULE SET PICKUP_CONFIRMED_AT = NOW()')) {
    const scheduleId = params[params.length - 1];
    const sch = mockDb.schedules.find(x => String(x.truck_schedule_id) === String(scheduleId));
    if (sch) {
      sch.pickup_confirmed_at = new Date().toISOString();
      sch.status = 'In Progress';
    }
    return [{ affectedRows: 1 }];
  }

  // 19. Get single allocation with schedule info (REQ-DEL-03 guard check)
  if (s.includes('FROM TRUCK_ALLOCATION TA') && s.includes('TA.TRUCK_ALLOCATION_ID = ?')) {
    const allocId = params[0];
    const alloc = mockDb.allocations.find(x => String(x.truck_allocation_id) === String(allocId));
    if (!alloc) return [[]];
    const sch = mockDb.schedules.find(x => String(x.truck_schedule_id) === String(alloc.truck_schedule_id)) || {};
    return [[{
      ...alloc,
      pickup_confirmed_at: sch.pickup_confirmed_at,
      route_id: sch.route_id,
      scheduled_date: sch.scheduled_date,
      schedule_status: sch.status
    }]];
  }

  // 19c. Count remaining pending stops in mockDb
  if (s.includes('COUNT(*)') && s.includes('FROM TRUCK_ALLOCATION') && s.includes('DELIVERY_STATUS =')) {
    const scheduleId = params[0];
    const count = mockDb.allocations.filter(a => String(a.truck_schedule_id) === String(scheduleId) && a.delivery_status === 'Pending').length;
    return [[{ count, cnt: count }]];
  }

  // 20. Record delivery outcome (REQ-DEL-03)
  if (s.startsWith('UPDATE TRUCK_ALLOCATION SET DELIVERY_STATUS')) {
    const [status, note, allocId] = params;
    const alloc = mockDb.allocations.find(x => String(x.truck_allocation_id) === String(allocId));
    if (alloc) {
      alloc.delivery_status = status;
      alloc.delivery_note = note;
      alloc.delivered_at = new Date().toISOString();
    }
    return [{ affectedRows: 1 }];
  }

  // 21. Update order status upon delivery (REQ-DEL-05)
  if (s.includes('UPDATE `ORDER` SET STATUS = "DELIVERED"') || s.includes('UPDATE ORDER SET STATUS = "DELIVERED"')) {
    const orderId = params[0];
    const ord = mockDb.orders.find(x => String(x.order_id) === String(orderId));
    if (ord) ord.status = 'Delivered';
    return [{ affectedRows: 1 }];
  }
  if (s.includes('UPDATE ORDER_ITEM SET STATUS = "DELIVERED"')) {
    return [{ affectedRows: 1 }];
  }

  // 22. Find next available run on route for failed re-queue (REQ-DEL-04)
  if (s.includes('FROM TRUCK_SCHEDULE') && s.includes('ROUTE_ID = ? AND SCHEDULED_DATE > ?')) {
    const [routeId, curDate] = params;
    const match = mockDb.schedules.filter(ts =>
      String(ts.route_id) === String(routeId) &&
      ts.scheduled_date > curDate &&
      ts.status === 'Scheduled'
    ).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    return [match.slice(0, 1)];
  }

  // 23. Insert into truck_allocation (re-queue)
  if (s.startsWith('INSERT INTO TRUCK_ALLOCATION')) {
    const [truck_schedule_id, order_id, route_stop_id, delivery_status] = params;
    const newId = mockDb.allocations.length + 1;
    mockDb.allocations.push({
      truck_allocation_id: newId,
      truck_schedule_id,
      order_id,
      route_stop_id,
      delivery_status: delivery_status || 'Pending',
      delivered_at: null,
      delivery_note: null
    });
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 23b. Check pending allocations before completing run (Guide line 1853-1859)
  if (s.includes('COUNT(*) AS CNT FROM TRUCK_ALLOCATION WHERE TRUCK_SCHEDULE_ID = ? AND DELIVERY_STATUS = "PENDING"')) {
    const scheduleId = params[0];
    const pendingCount = mockDb.allocations.filter(
      a => String(a.truck_schedule_id) === String(scheduleId) && a.delivery_status === 'Pending'
    ).length;
    return [[{ cnt: pendingCount }]];
  }

  // 24. Complete truck schedule run & record roster_log
  if (s.includes('UPDATE TRUCK_SCHEDULE SET STATUS = "COMPLETED"')) {
    const scheduleId = params[0];
    const sch = mockDb.schedules.find(x => String(x.truck_schedule_id) === String(scheduleId));
    if (sch) sch.status = 'Completed';
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('INSERT INTO ROSTER_LOG')) {
    const [truck_schedule_id, actual_start_time, actual_end_time] = params;
    const newLogId = mockDb.roster_logs.length + 1;
    const diffHours = (new Date(actual_end_time) - new Date(actual_start_time)) / 3600000;
    mockDb.roster_logs.push({
      roster_log_id: newLogId,
      truck_schedule_id,
      actual_start_time,
      actual_end_time,
      actual_hours_worked: Math.max(1, isNaN(diffHours) ? 4.0 : diffHours)
    });
    return [{ insertId: newLogId, affectedRows: 1 }];
  }

  // 25. Driver runs list (GET /api/delivery/driver-runs via View v_driver_assigned_runs)
  if (s.includes('FROM V_DRIVER_ASSIGNED_RUNS') || (s.includes('LEFT JOIN TRUCK_ALLOCATION TA') && s.includes('FROM TRUCK_SCHEDULE TS'))) {
    let schedules = mockDb.schedules;
    if (s.includes('DRIVER_ID = ? OR ASSISTANT_ID = ?') && params.length >= 2) {
      const uId = params[0];
      schedules = schedules.filter(ts => String(ts.driver_id) === String(uId) || String(ts.assistant_id) === String(uId));
    }
    if (s.includes('SCHEDULED_DATE = ?')) {
      const d = params[params.length - 1];
      schedules = schedules.filter(ts => ts.scheduled_date === d);
    }
    const list = schedules.map(ts => {
      const r = mockDb.routes.find(x => String(x.route_id) === String(ts.route_id)) || {};
      const tk = mockDb.trucks.find(x => String(x.truck_id) === String(ts.truck_id)) || {};
      const ud = mockDb.users.find(x => String(x.user_id) === String(ts.driver_id)) || {};
      const ua = mockDb.users.find(x => String(x.user_id) === String(ts.assistant_id)) || {};
      const allocs = mockDb.allocations.filter(a => String(a.truck_schedule_id) === String(ts.truck_schedule_id));
      return {
        truck_schedule_id: ts.truck_schedule_id,
        route_id: ts.route_id,
        route_name: r.name || 'Route',
        truck_id: ts.truck_id,
        plate_number: tk.plate_number || 'WP-CAB-1234',
        driver_id: ts.driver_id,
        driver_name: ud.name || 'Kamal Gunaratne',
        assistant_id: ts.assistant_id,
        assistant_name: ua.name || 'Bandara Weerakoon',
        scheduled_date: ts.scheduled_date,
        start_time: ts.start_time,
        end_time: ts.end_time,
        status: ts.status,
        pickup_confirmed_at: ts.pickup_confirmed_at,
        total_stops: allocs.length,
        delivered_stops: allocs.filter(a => a.delivery_status === 'Delivered').length,
        failed_stops: allocs.filter(a => a.delivery_status === 'Failed').length,
        attempted_stops: allocs.filter(a => a.delivery_status === 'Attempted').length,
        pending_stops: allocs.filter(a => a.delivery_status === 'Pending').length
      };
    });
    return [list];
  }

  // 26. DELETE FROM truck_schedule / truck_allocation
  if (s.startsWith('DELETE FROM TRUCK_SCHEDULE')) {
    const id = params[0];
    mockDb.schedules = mockDb.schedules.filter(ts => String(ts.truck_schedule_id) !== String(id));
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('DELETE FROM TRUCK_ALLOCATION')) {
    return [{ affectedRows: 1 }];
  }

  // 27. Member B: Lead-time & order placement mock queries
  if (s.includes('DATEDIFF') || s.includes('FN_DAYS_UNTIL_DELIVERY')) {
    const targetDate = new Date(params[0]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const days = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
    return [[{ days }]];
  }

  if (s.includes('FROM CUSTOMER WHERE USER_ID = ?')) {
    const uid = params[0];
    const match = mockDb.customers.filter(c => String(c.user_id) === String(uid));
    return [match.length > 0 ? match : [{ user_id: Number(uid) }]];
  }

  if (s.includes('FROM ROUTE_STOP WHERE ROUTE_STOP_ID = ?')) {
    const stopId = params[0];
    const rs = mockDb.route_stops.find(x => String(x.route_stop_id) === String(stopId));
    return [rs ? [{ route_id: rs.route_id }] : [{ route_id: 1 }]];
  }

  if (s.includes('FROM MAIN_INVENTORY WHERE PRODUCT_ID = ?')) {
    const pid = params[0];
    const inv = mockDb.inventory.find(x => String(x.product_id) === String(pid));
    return [inv ? [{ quantity_in_stock: inv.quantity_in_stock }] : [{ quantity_in_stock: 500 }]];
  }

  if (s.includes('FROM PRODUCT WHERE PRODUCT_ID = ?')) {
    const pid = params[0];
    const p = mockDb.products.find(x => String(x.product_id) === String(pid));
    return [p ? [{ unit_price: p.price || 500, space_consumption_rate: p.volume || 1.0, ...p }] : [{ unit_price: 500, space_consumption_rate: 1.0 }]];
  }

  if (s.includes('INSERT INTO `ORDER`') || s.includes('INSERT INTO ORDER')) {
    const [customer_id, route_id, route_stop_id, delivery_address, deliveryDate, total_value, total_volume] = params;
    const newId = 1000 + mockDb.orders.length + 1;
    mockDb.orders.push({
      order_id: newId,
      customer_id: Number(customer_id),
      route_id: Number(route_id),
      route_stop_id: Number(route_stop_id),
      delivery_address,
      order_date: new Date().toISOString().slice(0, 10),
      requested_delivery_date: deliveryDate,
      total_value: Number(total_value) || 0,
      total_volume: Number(total_volume) || 0,
      status: 'Placed'
    });
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (s.includes('INSERT INTO ORDER_ITEM')) {
    return [{ insertId: 1, affectedRows: 1 }];
  }

  if (s.includes('UPDATE MAIN_INVENTORY SET QUANTITY_IN_STOCK = QUANTITY_IN_STOCK - ?')) {
    const [qty, pid] = params;
    const inv = mockDb.inventory.find(x => String(x.product_id) === String(pid));
    if (inv) inv.quantity_in_stock = Math.max(0, inv.quantity_in_stock - Number(qty));
    return [{ affectedRows: 1 }];
  }

  if (s.includes('UPDATE `ORDER` O SET TOTAL_VALUE') || s.includes('UPDATE ORDER O SET TOTAL_VALUE')) {
    return [{ affectedRows: 1 }];
  }

  if (s.includes('FROM `ORDER` O') && s.includes('WHERE O.CUSTOMER_ID = ?')) {
    const custId = params[0];
    const list = mockDb.orders.filter(o => String(o.customer_id) === String(custId)).map(o => {
      const r = mockDb.routes.find(x => String(x.route_id) === String(o.route_id)) || {};
      const rs = mockDb.route_stops.find(x => String(x.route_stop_id) === String(o.route_stop_id)) || {};
      return {
        ...o,
        route_name: r.name || 'Colombo Central Route',
        stop_name: rs.stop_name || 'Delivery Stop'
      };
    });
    return [list];
  }

  if (s.includes('FROM `ORDER` WHERE ORDER_ID = ?') || s.includes('FROM ORDER WHERE ORDER_ID = ?')) {
    const oid = params[0];
    const match = mockDb.orders.filter(o => String(o.order_id) === String(oid));
    return [match];
  }

  if (s.includes("SET STATUS = 'CANCELLED'")) {
    const oid = params[0];
    const ord = mockDb.orders.find(o => String(o.order_id) === String(oid));
    if (ord) ord.status = 'Cancelled';
    return [{ affectedRows: 1 }];
  }

  if (s.includes("SET STATUS = 'CLOSED'")) {
    const oid = params[0];
    const ord = mockDb.orders.find(o => String(o.order_id) === String(oid));
    if (ord) ord.status = 'Closed';
    return [{ affectedRows: 1 }];
  }

  if (s.includes('SET DELIVERY_ADDRESS = ?')) {
    const [addr, date, oid] = params;
    const ord = mockDb.orders.find(o => String(o.order_id) === String(oid));
    if (ord) {
      ord.delivery_address = addr;
      ord.requested_delivery_date = date;
    }
    return [{ affectedRows: 1 }];
  }

  return [[]];
}

const dbExport = {
  query: async (sql, params = []) => {
    await ensureReady();
    try {
      return await pool.query(sql, params);
    } catch (err) {
      console.warn(`[DB Query Fallback] ${err.message}`);
      return executeMockQuery(sql, params);
    }
  },
  execute: async (sql, params) => {
    await ensureReady();
    try {
      return await pool.query(sql, params);
    } catch (err) {
      console.warn(`[DB Execute Fallback] ${err.message}`);
      return executeMockQuery(sql, params);
    }
  },
  getConnection: async () => {
    await ensureReady();
    try {
      return await pool.getConnection();
    } catch (err) {
      console.warn(`[DB Connection Fallback] ${err.message}`);
      return {
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        query: async (sql, params = []) => executeMockQuery(sql, params),
        release: () => {}
      };
    }
  },
  pool,
  ensureReady,
  executeMockQuery
};

module.exports = new Proxy(dbExport, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    if (pool && typeof pool[prop] === 'function') {
      return async (...args) => {
        await ensureReady();
        return pool[prop](...args);
      };
    }
    return pool ? pool[prop] : undefined;
  }
});
