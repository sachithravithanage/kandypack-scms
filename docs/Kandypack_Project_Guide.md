# Kandypack Project — Complete Team Guide
### React + Node/Express + MySQL, Dockerized, Deployed Free
### Team of 5 — Full Step-by-Step Instructions (Beginner-Friendly)

---

## HOW TO USE THIS DOCUMENT

1. **Everyone reads Part 1 first** (Sections 0–4). This is the shared setup and workflow that applies to the whole team.
2. **Then each person reads only their own section in Part 2** (Member A, B, C, D, or E) — but skim the others too, so you understand what your teammates are building and how your work connects to theirs.
3. Follow the steps **in order**. Don't skip the "commit" steps — they are part of the instructions, not optional extras.
4. If a step says "wait for Member X," it means your work depends on theirs being pushed to GitHub first.

---

# PART 1 — SHARED SETUP & OVERALL WORKFLOW

## Section 0: Tools Everyone Needs to Install (Do This First, Individually)

Every team member installs these on their own laptop before anything else:

| Tool | Purpose | Link |
|---|---|---|
| **Git** | Version control | https://git-scm.com/downloads |
| **Node.js (LTS version)** | Runs React & Express | https://nodejs.org |
| **MySQL Community Server** + **MySQL Workbench** | Local database + GUI | https://dev.mysql.com/downloads |
| **VS Code** | Code editor | https://code.visualstudio.com |
| **Docker Desktop** | Containerization | https://www.docker.com/products/docker-desktop |
| **Postman** | Testing backend APIs | https://www.postman.com/downloads |
| **GitHub account** | Each member needs their own account | https://github.com |

**Verify installation** — open a terminal and run:
```bash
git --version
node --version
npm --version
mysql --version
docker --version
```
Each command should print a version number. If any command says "not found," reinstall that tool before continuing.

---

## Section 1: GitHub Repository Setup (One Person Does This, Rest Follow)

**One member (suggest: the Team Lead, "Member A" below) does Steps 1–4. Everyone else does Step 5 onward.**

### Step 1: Create the repository
1. Go to https://github.com → click **New repository**.
2. Name it `kandypack-scms` (or similar).
3. Set it to **Private** (recommended for a coursework project) or Public if your course requires it.
4. Check **"Add a README file"**.
5. Add a `.gitignore` template → choose **Node**.
6. Click **Create repository**.

### Step 2: Add all team members as collaborators
1. In the repo, go to **Settings → Collaborators → Add people**.
2. Enter each teammate's GitHub username or email. All 5 members must accept the invite (check email/GitHub notifications).

### Step 3: Set up the folder structure
On your own machine:
```bash
git clone https://github.com/<your-org-or-username>/kandypack-scms.git
cd kandypack-scms
mkdir client server db docs
touch docker-compose.yml .env.example
```
Create a `README.md` with a short project description (copy the purpose statement from your SRS Section 1.1).

Commit and push:
```bash
git add .
git commit -m "chore: initial project folder structure"
git push origin main
```

### Step 4: Protect the main branch (recommended)
1. Go to **Settings → Branches → Add branch protection rule**.
2. Branch name pattern: `main`.
3. Enable **"Require a pull request before merging"**.
4. This means nobody pushes directly to `main` — everyone works on their own branch and merges via Pull Request (PR). This prevents one person's mistake from breaking everyone else's work.

### Step 5: Everyone else clones the repo
Each of the other 4 members runs:
```bash
git clone https://github.com/<your-org-or-username>/kandypack-scms.git
cd kandypack-scms
```

---

## Section 2: Branching & Commit Rules (Everyone Follows This — All Project)

### Branch naming
Each member works on their **own feature branch**, never directly on `main`:
```
git checkout -b feature/<your-feature-name>
```
Examples: `feature/auth`, `feature/order-placement`, `feature/rail-scheduling`, `feature/roster-delivery`, `feature/reporting`.

### Commit message convention
Use this simple format for every commit:
```
<type>: <short description>
```
Where `<type>` is one of:
- `feat` — a new feature (e.g. `feat: add order placement API`)
- `fix` — a bug fix
- `db` — database schema/migration change
- `chore` — setup, config, non-code changes
- `docs` — documentation changes
- `test` — adding or fixing tests

**Commit often** — after every small working step, not just at the end of the day. This is stated explicitly in every step below so beginners know exactly when to commit.

### Daily workflow for every member
```bash
git checkout main
git pull origin main              # get latest changes from teammates
git checkout feature/<your-branch>
git merge main                    # bring your branch up to date
# ... do your work ...
git add .
git commit -m "feat: description of what you did"
git push origin feature/<your-branch>
```
When a feature is complete, open a **Pull Request** on GitHub (`feature/<your-branch>` → `main`), ask one teammate to review, then merge.

---

## Section 3: Overall Project Workflow (All Phases, With Parallel Work Marked)

This is the full roadmap. Phases marked **[PARALLEL]** mean multiple members work at the same time on independent pieces. Phases marked **[SEQUENTIAL]** need something finished first.

```
PHASE 0 — Setup                              [Everyone, together, Day 1]
   └─ Sections 0–2 above (tools, repo, branching)

PHASE 1 — Design                             [PARALLEL — but coordinate together first]
   ├─ Whole-team meeting: agree on final ER diagram (refine Appendix B of the SRS)
   ├─ Whole-team meeting: agree on REST API contract (endpoint names, request/response shapes)
   └─ Whole-team meeting: agree on page list / navigation for each role's UI

PHASE 2 — Core Build                         [PARALLEL — this is most of the project]
   ├─ Member A: Auth + User Management (DB + API + UI) + repo/Docker admin
   ├─ Member B: Order Placement (DB + API + UI)
   ├─ Member C: Rail Scheduling + Store Receipt (DB + API + UI)
   ├─ Member D: Roster Scheduling + Delivery Execution (DB + API + UI)
   └─ Member E: Reporting + Notifications (DB + API + UI)
   (Everyone builds against the shared schema and API contract agreed in Phase 1,
    working in their own branch, pushing regularly, opening small PRs.)

PHASE 3 — Integration                        [SEQUENTIAL — needs Phase 2 mostly done]
   ├─ Merge everyone's branches into main (resolve conflicts together)
   ├─ Run the full app end-to-end locally, test cross-feature flows
   │   (e.g., place an order → allocate to train → receive at store → roster → deliver)
   └─ Fix integration bugs

PHASE 4 — Containerization                   [Member A + Member E lead, others assist]
   ├─ Write Dockerfiles for client and server
   ├─ Write docker-compose.yml (client + server + MySQL)
   └─ Test the whole app running via `docker compose up`

PHASE 5 — Deployment                         [Member A + Member E lead]
   ├─ Choose free hosting platform(s)
   ├─ Deploy database
   ├─ Deploy backend
   ├─ Deploy frontend
   └─ Test the live deployed app

PHASE 6 — Testing & Polish                   [PARALLEL — everyone tests their own feature]
   ├─ Each member tests their own feature against the SRS requirements (REQ-xxx-xx)
   ├─ Fix bugs
   └─ Populate test data (40+ orders, 10 routes, valid train schedule — per SRS Section 6)

PHASE 7 — Documentation & Submission          [PARALLEL — everyone documents their part]
   ├─ Each member writes a short section of the final report/README for their feature
   └─ Team Lead compiles final submission
```

**Rule of thumb:** Phases 0, 1, 3, 4, 5 need the whole team together (or two people leading with others watching/helping). Phases 2, 6, 7 are where each person mostly works independently.

---

## Section 4: Task Division Summary Table

| Member | Primary SRS Features | Database Tables Owned | Layers Touched |
|---|---|---|---|
| **A** | 4.7 User Management & Auth + repo/Docker/deploy admin | `user`, `role`, `audit_log` | DB + Backend + Frontend + DevOps |
| **B** | 4.1 Customer Order Placement | `customer`, `order`, `order_item`, `product`, `route` | DB + Backend + Frontend |
| **C** | 4.2 Rail Scheduling + 4.3 Store Receipt | `train_trip`, `cargo_allocation`, `store`, `store_inventory` | DB + Backend + Frontend |
| **D** | 4.4 Roster Scheduling + 4.5 Delivery Execution | `truck`, `driver`, `assistant`, `roster`, `run`, `delivery_stop` | DB + Backend + Frontend |
| **E** | 4.6 Reporting + 4.8 Notifications + Containerization support | `notification` (+ reporting queries over other tables) | DB + Backend + Frontend + DevOps |

Each member designs, builds the API for, and builds the UI for their **own** feature — a full "vertical slice." This means everyone learns the full stack, and features can be built in parallel without blocking each other, since each person mostly touches their own tables.

**Shared dependency note:** Everyone's tables reference `customer`, `product`, and `route`, which Member B sets up early. Member B should push their base schema **first (Day 2–3)** so others can build foreign keys against it. Coordinate this in your first team meeting.

---

# PART 2 — INDIVIDUAL MEMBER GUIDES

---

## MEMBER A — Auth, User Management, Repo & DevOps Lead

**Your features:** REQ-USR-01 to REQ-USR-05 (Section 4.7 of the SRS) — login, registration, roles, permissions, audit logging. You also own the GitHub repo setup (already done in Section 1) and lead containerization/deployment later.

### A1. Design your database tables
1. Open MySQL Workbench, connect to your local MySQL server.
2. Create a database: `CREATE DATABASE kandypack;`
3. Design these tables (write the SQL yourself, using the SRS Appendix B ER diagram as your base):
   - `user` (user_id, name, email, password_hash, role, is_active, created_at)
   - `role` (role_id, role_name) — Administrator, Dispatcher, Regional Store Manager, Driver, Assistant, Customer
   - `audit_log` (log_id, user_id, action, table_affected, record_id, timestamp, details)
4. Save this as `db/01_users_schema.sql` in the repo.
5. **Commit:** `git commit -m "db: add user, role, audit_log tables"`

### A2. Set up the Express backend project
1. In `server/`, run:
   ```bash
   npm init -y
   npm install express mysql2 dotenv bcrypt jsonwebtoken cors
   npm install --save-dev nodemon
   ```
2. Create `server/src/index.js` with a basic Express server that starts on a port and prints "Server running."
3. Create `server/.env` (not committed — it's in `.gitignore`) with your local DB credentials.
4. Create `server/.env.example` (this **is** committed) showing which variables are needed, without real passwords.
5. Test locally: `npm run dev` (add a `"dev": "nodemon src/index.js"` script to `package.json` first).
6. **Commit:** `git commit -m "chore: initialize Express server"`

### A3. Build the Auth API
Build these endpoints in `server/src/routes/auth.js`:
- `POST /api/auth/register` — customer self-registration (name, email, password, address). Hash the password with bcrypt before saving (REQ-SEC: passwords must be hashed).
- `POST /api/auth/login` — check email + password, return a JWT token on success.
- `POST /api/auth/logout` — client-side token discard (simple for now).
- Middleware function `requireAuth` — checks the JWT token on protected routes.
- Middleware function `requireRole(roles)` — checks the logged-in user's role matches what's allowed (REQ-USR-04: Store Manager sees only their city; Customer sees only their own data).

Test every endpoint in Postman before moving on.
**Commit after each endpoint works:** e.g. `git commit -m "feat: add login endpoint with JWT"`

### A4. Build the User Management API (Admin-only)
- `GET /api/users` — list all users (Admin only)
- `POST /api/users` — Admin creates Dispatcher/Store Manager/Driver/Assistant accounts (REQ-USR-03)
- `PUT /api/users/:id` — edit a user
- `PUT /api/users/:id/deactivate` — deactivate a user
- Every action here should also write a row into `audit_log` (REQ-USR-05).

**Commit:** `git commit -m "feat: add admin user management endpoints"`

### A5. Build the React frontend for Auth
1. In `client/`, run: `npx create-vite@latest . -- --template react` (or `create-react-app .` if your course prefers CRA).
2. Install a UI library: `npm install bootstrap` (or Tailwind, per your team's choice).
3. Build these pages:
   - Login page (matches Figure 1 in the SRS)
   - Customer registration page (matches Figure 2)
   - A simple role-based redirect after login (Admin → `/admin/dashboard`, Customer → `/orders`, etc.)
4. Store the JWT token in browser memory/state (not localStorage, for simplicity and security in early versions).
5. **Commit:** `git commit -m "feat: add login and registration pages"`

### A6. Build the Admin User Management screen
- A table listing all users with Edit/Deactivate buttons, calling your Section A4 API.
- **Commit:** `git commit -m "feat: add admin user management UI"`

### A7. Open your Pull Request
Once A1–A6 work end-to-end locally (you can register, log in, and an Admin can manage users):
```bash
git push origin feature/auth
```
Open a PR on GitHub, ask a teammate to review, merge into `main`.

### A8. Later — lead Containerization & Deployment
Once everyone's features are merged (Phase 3 done), come back to **Part 3 of this guide** below — you and Member E lead Phases 4 and 5.

---

## MEMBER B — Customer Order Placement

**Your features:** REQ-ORD-01 to REQ-ORD-07 (Section 4.1). You also own the base `product`, `customer`, and `route` tables that everyone else depends on — **build and push these first.**

### B1. Design your database tables (do this early — Day 2–3 — others are waiting on this)
Design and write SQL for:
- `product` (product_id, name, unit_price, space_consumption_rate)
- `customer` (customer_id, user_id [FK to Member A's `user` table], phone, default_address)
- `route` (route_id, city, coverage_area_description, max_delivery_time)
- `order` (order_id, customer_id, order_date, requested_delivery_date, status, total_value, total_volume, route_id)
- `order_item` (order_item_id, order_id, product_id, quantity)

Save as `db/02_orders_schema.sql`.
**Commit immediately and push:** `git commit -m "db: add product, customer, route, order tables"` then `git push origin feature/order-placement`. Tell the team in your group chat that this is ready so others can build foreign keys against it.

### B2. Set up your backend routes file
In `server/src/routes/orders.js`, build:
- `POST /api/orders` — place an order. Must:
  - Validate the 7-day lead time (REQ-ORD-02)
  - Match delivery address to a route, or flag "Unroutable" (REQ-ORD-03)
  - Calculate total value and volume from item quantities × unit price / space rate (REQ-ORD-04)
- `GET /api/orders/:customerId` — order history for a customer (REQ-ORD-05)
- `PUT /api/orders/:id` — modify an order (only allowed while status = "Placed", REQ-ORD-06)
- `DELETE /api/orders/:id` — cancel an order (only while "Placed")
- `PUT /api/orders/:id/confirm-receipt` — customer confirms delivery (REQ-ORD-07)

Test each in Postman. **Commit after each endpoint:** e.g. `git commit -m "feat: add order placement endpoint with lead-time validation"`

### B3. Build the product catalog (small, shared reference data)
- `GET /api/products` — list all products (used by both the customer order form and the Admin catalog screen).
- **Commit:** `git commit -m "feat: add product listing endpoint"`

### B4. Build the frontend order screens
Using the SRS mockups as your guide:
- "My Orders" list screen (Figure 13) — shows status per order with a progress indicator.
- "New Order" placement form (Figure 14) — product search/add, delivery address dropdown, delivery date picker with inline 7-day validation message.
- "Confirm Receipt" button appears once an order's status is "Delivered."

**Commit after each screen:** e.g. `git commit -m "feat: add order placement form UI"`

### B5. Open your Pull Request
Push your branch, open a PR, get it reviewed, merge into `main`.

---

## MEMBER C — Rail Scheduling & Store Receipt

**Your features:** REQ-RAIL-01 to REQ-RAIL-07 (Section 4.2) and REQ-STORE-01 to REQ-STORE-05 (Section 4.3).

**Dependency:** Wait for Member B to push the `product` and `order`/`order_item` tables before you build your foreign keys (should be ready Day 2–3 — check with the team).

### C1. Design your database tables
- `train_trip` (trip_id, destination_city, departure_time, arrival_time, total_capacity, status)
- `cargo_allocation` (allocation_id, trip_id, order_id [FK], allocated_quantity, loading_status) — tracks Not Loaded/Partially Loaded/Loaded per order per trip
- `store` (store_id, city, address)
- `store_inventory` (inventory_id, store_id, order_id, expected_quantity, received_quantity, discrepancy_flag, note)

Save as `db/03_rail_store_schema.sql`.
**Commit:** `git commit -m "db: add train_trip, cargo_allocation, store, store_inventory tables"`

### C2. Build the Rail Scheduling API
In `server/src/routes/rail.js`:
- `POST /api/train-trips` — Admin defines a new trip (REQ-RAIL-01)
- `GET /api/train-trips` — list trips, filterable by destination/status
- `POST /api/train-trips/:id/allocate` — allocate an order's quantity to a trip; must check remaining capacity **inside a database transaction** to prevent overbooking under concurrent requests (REQ-RAIL-03, REQ-RAIL-04 — this is one of your ACID/transaction requirements from Section 6 of the SRS)
- `PUT /api/train-trips/:id/loading-status` — Dispatcher marks an order Not Loaded/Partially Loaded/Loaded (REQ-RAIL-06); when every order on a trip is Loaded, auto-update the trip's own status to "Loaded"
- Overflow handling: if a trip can't fit an order, automatically queue the remainder to the next available trip (REQ-RAIL-05, REQ-RAIL-07)

Test each endpoint carefully, including a case where you try to overbook a trip on purpose, to confirm your transaction logic blocks it.
**Commit after each working piece:** e.g. `git commit -m "feat: add train trip capacity allocation with transaction lock"`

### C3. Build the Store Receipt API
In `server/src/routes/store.js`:
- `GET /api/stores/:storeId/incoming/:tripId` — expected manifest for an arriving trip (REQ-STORE-01)
- `POST /api/stores/:storeId/receive` — Store Manager enters received quantities; flag "Discrepant" if received < expected (REQ-STORE-02); update order status (REQ-STORE-03)
- `GET /api/stores/:storeId/truck-suggestion` — compute suggested daily truck count per route as a rolling average of past orders ÷ average truck capacity, rounded up, minimum 1 (REQ-STORE-04)

**Commit:** `git commit -m "feat: add store receipt reconciliation endpoints"`

### C4. Build the frontend screens
- Admin: **Train Schedule Management** screen (Figure 4) — add/edit/deactivate trips.
- Dispatcher: **Train Loading** screen (Figure 7) — shows allocated capacity bar, per-order loading status controls.
- Store Manager: **Incoming Shipment Receipt** screen (Figure 10) — expected vs. received quantity entry with discrepancy flag.

**Commit after each screen:** e.g. `git commit -m "feat: add train loading dispatcher UI"`

### C5. Open your Pull Request
Push, open PR, review, merge.

---

## MEMBER D — Roster Scheduling & Delivery Execution

**Your features:** REQ-SCHED-01 to REQ-SCHED-06 (Section 4.4) and REQ-DEL-01 to REQ-DEL-05 (Section 4.5).

**Dependency:** You'll reference `route` (from Member B) and `store`/`store_inventory` (from Member C). Confirm those are pushed before you start your foreign keys.

### D1. Design your database tables
- `truck` (truck_id, plate_number, capacity)
- `driver` (driver_id, user_id [FK], license_number, weekly_hours_worked)
- `assistant` (assistant_id, user_id [FK], weekly_hours_worked)
- `roster` (roster_id, route_id, truck_id, driver_id, assistant_id, run_date, start_time, end_time, status)
- `run` (run_id, roster_id, store_id, pickup_confirmed_at)
- `delivery_stop` (stop_id, run_id, order_id, stop_sequence, outcome, note, delivered_at)

Save as `db/04_roster_delivery_schema.sql`.
**Commit:** `git commit -m "db: add truck, driver, assistant, roster, run, delivery_stop tables"`

### D2. Build the Roster Scheduling API
In `server/src/routes/roster.js`, this is the most rule-heavy part of the whole project — take it slowly and test each rule separately:
- `POST /api/roster` — create an assignment (truck + driver + assistant + route + date)
- Before saving, check **all** of these, inside a transaction:
  1. No truck/driver/assistant double-booked on overlapping times (REQ-SCHED-01)
  2. Driver has at least a 2-hour gap since their last run that day (REQ-SCHED-02) — store this "2 hours" as a config value in a small `system_parameter` table, not hard-coded, so it's adjustable later
  3. Assistant not assigned to more than 2 consecutive routes (REQ-SCHED-03)
  4. Driver's weekly hours ≤ 40, Assistant's weekly hours ≤ 60 (REQ-SCHED-04)
- `PUT /api/roster/:id/override` — Dispatcher can override a rule, but must supply a justification text, and this gets logged to `audit_log` (REQ-SCHED-05)
- Validate the roster is being created at least 7 days ahead of the run date (REQ-SCHED-06)

Test each rule on its own with Postman — e.g. deliberately try to double-book a driver and confirm the API rejects it with a clear error message.
**Commit after each rule works:** e.g. `git commit -m "feat: add roster overlap and weekly-hour validation"`

### D3. Build the Delivery Execution API
In `server/src/routes/delivery.js`:
- `GET /api/runs/:id/today` — Driver/Assistant's assigned run for the day: route, truck, partner, stop list (REQ-DEL-01)
- `PUT /api/runs/:id/pickup` — confirm pickup from store; block any stop update until this happens (REQ-DEL-02)
- `PUT /api/runs/:id/stops/:stopId` — record Delivered/Failed/Attempted with optional note (REQ-DEL-03)
- If a stop is marked Failed, automatically create a new `delivery_stop` row queued onto the next available run on that route (REQ-DEL-04)

**Commit:** `git commit -m "feat: add delivery execution endpoints with auto re-queue on failure"`

### D4. Build the frontend screens
- Dispatcher: **Weekly Roster Builder** (Figure 8) — grid layout, assign trucks/drivers/assistants per route per day, show inline conflict warnings in red.
- Driver/Assistant mobile view: **Today's Run** card (Figure 11) and **Stop Detail** screen (Figure 12) — big buttons, minimal text entry, mobile-first layout (use simple CSS media queries or a mobile-first framework).

**Commit after each screen:** e.g. `git commit -m "feat: add weekly roster builder UI"`

### D5. Open your Pull Request
Push, open PR, review, merge.

---

## MEMBER E — Reporting, Notifications & Containerization Support

**Your features:** REQ-RPT-01 to REQ-RPT-07 (Section 4.6) and REQ-NOT-01 to REQ-NOT-05 (Section 4.8). You also assist Member A with Phases 4–5 (containerization/deployment) once features are merged.

**Dependency:** Your reports query data from everyone else's tables, so build your report *queries* last — but you can build the notification system and its own table early, in parallel with everyone else.

### E1. Design your database tables
- `notification` (notification_id, user_id [FK], type, message, is_read, created_at)
- (No new tables needed for reporting — reports are just SQL queries across everyone else's tables.)

**Commit:** `git commit -m "db: add notification table"`

### E2. Build the Notification API (do this early, in parallel with others)
In `server/src/routes/notifications.js`:
- `POST /api/notifications` — internal helper function other routes can call to create a notification (e.g., Member C's discrepancy flag calls this, Member D's weekly-hour-limit-approaching check calls this)
- `GET /api/notifications/:userId` — list a user's notifications
- `PUT /api/notifications/:id/acknowledge` — mark as read (REQ-NOT-05)
- For SMS/email (REQ-NOT-04): for a student project, it's fine to **mock this** — just log "SMS would be sent to..." to the console instead of paying for Twilio, unless your course requires a real integration.

**Commit:** `git commit -m "feat: add notification create/list/acknowledge endpoints"`

### E3. Build the Reporting API (build this once other members' tables are merged into `main`, around Phase 3)
In `server/src/routes/reports.js`, build one endpoint per report, each accepting optional filters (quarter, city, route):
- `GET /api/reports/sales` — quarterly sales, total value & volume (REQ-RPT-01)
- `GET /api/reports/top-products` — most-ordered items by quantity and value (REQ-RPT-02)
- `GET /api/reports/city-breakdown` — city-wise and route-wise sales (REQ-RPT-03)
- `GET /api/reports/staff-hours` — driver/assistant hours, flag violations of the 40/60-hour limits (REQ-RPT-04)
- `GET /api/reports/truck-utilization` — trips per truck, idle time, capacity usage (REQ-RPT-05)
- `GET /api/reports/customer/:id` — one customer's full order history (REQ-RPT-06)
- Every report response should respect the requester's role/data scope (Admin sees all, Store Manager sees only their city, Customer sees only their own orders) — reuse Member A's `requireRole` middleware here (REQ-RPT-07)
- Add simple CSV export: format the JSON result as CSV text and set the response header to trigger a file download.

**Commit after each report:** e.g. `git commit -m "feat: add quarterly sales report endpoint"`

### E4. Build the frontend screens
- **Report Overview** screen (Figure 5) — tabs for each report type, date-range/city/route filters, Export CSV/PDF buttons, and a simple chart (use a library like `recharts` or `chart.js`).
- **Notifications panel** — a bell icon with a dropdown list, shown on every internal-role dashboard (Admin, Dispatcher, Store Manager).

**Commit after each screen:** e.g. `git commit -m "feat: add report overview dashboard with charts"`

### E5. Open your Pull Request
Push, open PR, review, merge.

### E6. Then — assist with Containerization & Deployment
Move to **Part 3** below, and work alongside Member A.

---

# PART 3 — CONTAINERIZATION & DEPLOYMENT
### (Members A and E lead this together, once Phase 3 — full integration — is complete and stable on `main`)

## Section 5: Containerization Steps

### Step 1: Write the backend Dockerfile
Create `server/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "src/index.js"]
```
**Commit:** `git commit -m "chore: add backend Dockerfile"`

### Step 2: Write the frontend Dockerfile (multi-stage build)
Create `client/Dockerfile`:
```dockerfile
# Stage 1: build the React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: serve it with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
(Use `/app/build` instead of `/app/dist` if you used Create React App instead of Vite.)
**Commit:** `git commit -m "chore: add frontend Dockerfile"`

### Step 3: Put your combined database schema in one init script
Combine all four `db/0X_*.sql` files (from Members A, B, C, D, E) into a single `db/init.sql`, in dependency order (tables with no foreign keys first — start with `product`, `route`, `role`, `user`, then everything that references them). Add your seed data here too (the 40+ test orders, 10 routes, and valid train schedule required by SRS Section 6).

**Commit:** `git commit -m "db: combine schema and seed data into init.sql"`

### Step 4: Write docker-compose.yml (project root)
```yaml
version: "3.8"
services:
  db:
    image: mysql:8
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: kandypack
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 10

  server:
    build: ./server
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      DB_HOST: db
      DB_USER: root
      DB_PASSWORD: ${DB_ROOT_PASSWORD}
      DB_NAME: kandypack
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "5000:5000"

  client:
    build: ./client
    restart: always
    depends_on:
      - server
    ports:
      - "3000:80"

volumes:
  db_data:
```
Create a `.env` file (not committed) at the project root with real values for `DB_ROOT_PASSWORD` and `JWT_SECRET`. Update `.env.example` (committed) to show the variable names only.

**Commit:** `git commit -m "chore: add docker-compose.yml for local multi-container setup"`

### Step 5: Test it
```bash
docker compose up --build
```
Visit `http://localhost:3000` — the whole app (frontend, backend, database) should now be running together. Fix any connection issues (usually: backend trying to connect to `localhost` instead of the service name `db` — that's why `DB_HOST: db` matters above).

**Commit once it works:** `git commit -m "chore: verified full stack runs via docker compose"`

---

## Section 6: Deployment Steps (Free Tier)

### Recommended free-tier combination for a student project:
- **Database:** A managed free MySQL instance (check current options — e.g. Aiven, Railway's MySQL add-on, or PlanetScale-compatible alternatives — free-tier availability changes often, so check what's currently offered before committing).
- **Backend (Express API):** Render (free tier, no credit card, sleeps after 15 min idle — fine for a coursework demo).
- **Frontend (React static build):** Render Static Site, or Vercel/Netlify (both have generous permanent free tiers for static sites).

### Step 1: Deploy the database
1. Create a free MySQL instance with your chosen provider.
2. Run your `db/init.sql` against it (most providers give you a connection string + let you run SQL via their dashboard or CLI).
3. Note down the host, port, username, password, and database name.

### Step 2: Deploy the backend
1. Push your final code to GitHub `main` (should already be done).
2. On Render: **New → Web Service** → connect your GitHub repo → select the `server` folder as the root directory.
3. Set the build command: `npm install`. Set the start command: `node src/index.js`.
4. Add environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`) matching your deployed database from Step 1.
5. Deploy. Note the public URL Render gives you (e.g. `https://kandypack-api.onrender.com`).

### Step 3: Deploy the frontend
1. In `client/src`, update your API base URL to point to the deployed backend URL from Step 2 (use an environment variable, e.g. `VITE_API_URL`, don't hardcode it).
2. Commit this change: `git commit -m "chore: use deployed API URL in production build"`.
3. On Render (or Vercel/Netlify): **New → Static Site** → connect the repo → root directory `client` → build command `npm run build` → publish directory `dist` (or `build` for CRA).
4. Deploy. You'll get a public URL for your live app.

### Step 4: Final checks
- Open the live frontend URL, register a customer, log in, place a real order, and walk through as many role workflows as you can, to confirm frontend → backend → database all talk to each other in the deployed environment.
- Share the live URL and login credentials with your course instructor as required.

**Commit:** `git commit -m "docs: add deployment URLs to README"`

---

## Section 7: Final Checklist Before Submission

- [ ] All 5 members' features merged into `main`
- [ ] `docker compose up` runs the full app with no errors
- [ ] Database seeded with 40+ orders, 10+ routes, valid train schedule (SRS Section 6)
- [ ] Each REQ-xxx-xx requirement in the SRS has been tested at least once
- [ ] App is deployed and publicly reachable
- [ ] README updated with setup instructions and live URL
- [ ] Each member has a reasonably even number of commits (check via GitHub's **Insights → Contributors** tab)
