const BASE = 'http://localhost:5000/api';

async function login(email, password = 'Password123!') {
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Login failed for ${email}:`, data);
      return null;
    }
    return { token: data.token, user: data.user };
  } catch (err) {
    console.error(`Network error on login for ${email}:`, err.message);
    return null;
  }
}

async function testRBAC() {
  console.log('--- Testing Comprehensive Role-Based Access Control ---');

  const admin = await login('admin@kandypack.lk');
  const dispatcher = await login('dispatcher@kandypack.lk');
  const storeMgr = await login('suneth.cmb@kandypack.lk');
  const driver = await login('kamal.driver@kandypack.lk');
  const customer = await login('waruni@gmail.com');

  let passed = 0;
  let failed = 0;

  async function check(name, requestFn, expectedStatus) {
    try {
      const res = await requestFn();
      if (res.status === expectedStatus) {
        console.log(`  PASS: ${name} -> Got ${res.status}`);
        passed++;
      } else {
        const body = await res.text();
        console.error(`  FAIL: ${name} -> Expected ${expectedStatus}, got ${res.status} (${body})`);
        failed++;
      }
    } catch (err) {
      console.error(`  FAIL: ${name} -> Request failed:`, err.message);
      failed++;
    }
  }

  const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

  console.log('\n--- Test 1: User Management (Admin Only - Role 1) ---');
  await check('Admin can get /users', () => fetch(`${BASE}/users`, { headers: authHeader(admin.token) }), 200);
  await check('Dispatcher BLOCKED from /users', () => fetch(`${BASE}/users`, { headers: authHeader(dispatcher.token) }), 403);
  await check('Store Manager BLOCKED from /users', () => fetch(`${BASE}/users`, { headers: authHeader(storeMgr.token) }), 403);
  await check('Driver BLOCKED from /users', () => fetch(`${BASE}/users`, { headers: authHeader(driver.token) }), 403);
  await check('Customer BLOCKED from /users', () => fetch(`${BASE}/users`, { headers: authHeader(customer.token) }), 403);

  console.log('\n--- Test 2: Inventory Management (Admin Only - Role 1) ---');
  await check('Admin can get /inventory', () => fetch(`${BASE}/inventory`, { headers: authHeader(admin.token) }), 200);
  await check('Dispatcher BLOCKED from /inventory', () => fetch(`${BASE}/inventory`, { headers: authHeader(dispatcher.token) }), 403);
  await check('Customer BLOCKED from /inventory', () => fetch(`${BASE}/inventory`, { headers: authHeader(customer.token) }), 403);

  console.log('\n--- Test 3: Rail Operations (Admin & Dispatcher - Roles 1, 2) ---');
  await check('Admin can get /rail/trains', () => fetch(`${BASE}/rail/trains`, { headers: authHeader(admin.token) }), 200);
  await check('Dispatcher can get /rail/trains', () => fetch(`${BASE}/rail/trains`, { headers: authHeader(dispatcher.token) }), 200);
  await check('Driver BLOCKED from /rail/trains', () => fetch(`${BASE}/rail/trains`, { headers: authHeader(driver.token) }), 403);
  await check('Customer BLOCKED from /rail/trains', () => fetch(`${BASE}/rail/trains`, { headers: authHeader(customer.token) }), 403);

  console.log('\n--- Test 4: Roster Scheduling (Admin & Dispatcher - Roles 1, 2) ---');
  await check('Admin can get /roster', () => fetch(`${BASE}/roster`, { headers: authHeader(admin.token) }), 200);
  await check('Dispatcher can get /roster', () => fetch(`${BASE}/roster`, { headers: authHeader(dispatcher.token) }), 200);
  await check('Driver BLOCKED from /roster creation', () => fetch(`${BASE}/roster`, {
    method: 'POST',
    headers: { ...authHeader(driver.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeId: 1 })
  }), 403);
  await check('Customer BLOCKED from /roster', () => fetch(`${BASE}/roster`, {
    method: 'POST',
    headers: { ...authHeader(customer.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeId: 1 })
  }), 403);

  console.log('\n--- Test 5: Store Operations (Roles 1 & 3) ---');
  await check('Store Manager can view incoming trips', () => fetch(`${BASE}/stores/1/incoming-trips`, { headers: authHeader(storeMgr.token) }), 200);
  await check('Customer BLOCKED from store incoming trips', () => fetch(`${BASE}/stores/1/incoming-trips`, { headers: authHeader(customer.token) }), 403);

  console.log('\n--- Test 6: Delivery Runs Access ---');
  await check('Driver can get /delivery/driver-runs', () => fetch(`${BASE}/delivery/driver-runs`, { headers: authHeader(driver.token) }), 200);
  await check('Customer BLOCKED from /delivery/driver-runs', () => fetch(`${BASE}/delivery/driver-runs`, { headers: authHeader(customer.token) }), 403);

  console.log('\n--- Test 7: Customer Order Isolation ---');
  const custId = customer.user.id || customer.user.userId;
  await check(`Customer can view own orders (/orders/customer/${custId})`, () => fetch(`${BASE}/orders/customer/${custId}`, { headers: authHeader(customer.token) }), 200);
  await check('Customer BLOCKED from viewing other customer orders (/orders/customer/999)', () => fetch(`${BASE}/orders/customer/999`, { headers: authHeader(customer.token) }), 403);
  await check('Driver BLOCKED from viewing customer orders', () => fetch(`${BASE}/orders/customer/${custId}`, { headers: authHeader(driver.token) }), 403);

  console.log('\n--- Test 8: Reports Access (Admin & Dispatcher Only - Roles 1, 2) ---');
  await check('Admin can get /reports/sales', () => fetch(`${BASE}/reports/sales`, { headers: authHeader(admin.token) }), 200);
  await check('Dispatcher can get /reports/sales', () => fetch(`${BASE}/reports/sales`, { headers: authHeader(dispatcher.token) }), 200);
  await check('Store Manager BLOCKED from /reports/sales', () => fetch(`${BASE}/reports/sales`, { headers: authHeader(storeMgr.token) }), 403);
  await check('Customer BLOCKED from /reports/sales', () => fetch(`${BASE}/reports/sales`, { headers: authHeader(customer.token) }), 403);
  await check('Driver BLOCKED from /reports/sales', () => fetch(`${BASE}/reports/sales`, { headers: authHeader(driver.token) }), 403);
  await check('Dispatcher BLOCKED from /reports/system-summary (Admin only)', () => fetch(`${BASE}/reports/system-summary`, { headers: authHeader(dispatcher.token) }), 403);

  console.log(`\n======================================================`);
  console.log(`Full RBAC Suite: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);
}

testRBAC();
