# Kandypack Supply Chain Management System

![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL%208-4479A1?logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED?logo=docker&logoColor=white)

Kandypack is a web-based supply chain management system for Kandypack, a
mid-sized FMCG manufacturer in Kandy, Sri Lanka. It replaces disconnected
spreadsheet-based tracking with one operational platform for customer orders,
rail freight, regional-store receiving, truck dispatch, last-mile delivery,
staff rostering, notifications, inventory, and management reporting.

The system models the complete distribution journey:

```text
Customer order
    -> route and delivery-stop selection
    -> rail-trip cargo allocation
    -> regional-store receipt and discrepancy handling
    -> truck, driver, and assistant roster
    -> last-mile delivery execution
    -> operational reports and notifications
```

## Contents

- [Capabilities](#capabilities)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Local development](#local-development)
- [Database design](#database-design)
- [Docker deployment](#docker-deployment)
- [Team contributions](#team-contributions)
- [Engineering conventions](#engineering-conventions)
- [Project status and known design decisions](#project-status-and-known-design-decisions)

## Capabilities

### Authentication and administration

- Customer registration and login with password hashing and JWT-based sessions.
- Role-based access for administrators, dispatchers, regional store managers,
  drivers, assistants, and customers.
- Admin user management, activation/deactivation, and audit logging.
- City and other master-data management.

### Customer order placement

- Product catalog with unit prices and space-consumption rates.
- Customer order creation with item quantities and delivery address.
- Seven-day lead-time validation.
- City, route, and ordered route-stop selection.
- Customer order history and order-status visibility.

### Rail freight and regional stores

- Train and train-trip schedule management.
- Capacity-aware cargo allocation per order item.
- Loading-status tracking and support for splitting an order across trips.
- Store shipment receipt confirmation.
- Expected-versus-received quantity reconciliation and discrepancy notes.
- Store inventory ledger and daily dispatch preparation.

### Truck rostering and last-mile delivery

- Weekly truck, driver, and assistant roster scheduling.
- Conflict checks for truck, crew, route, working hours, and rest periods.
- Pickup confirmation and run-status tracking.
- Ordered delivery stops for each route.
- Delivery outcomes for each allocation: `Delivered`, `Failed`, or `Attempted`.
- Run completion and actual-hours logging.

### Notifications, inventory, and reporting

- In-application notifications with read/acknowledge support.
- Head-office inventory tracking.
- Exportable operational reports for sales, orders, rail cargo, store receipt,
  truck utilization, delivery performance, and staff hours.
- Dashboard views for role-specific operational information.

## Technology stack

| Layer            | Technology                                               |
| ---------------- | -------------------------------------------------------- |
| Frontend         | React 19, Vite, React Router, Axios, Bootstrap, Chart.js |
| Backend          | Node.js, Express 5                                       |
| Authentication   | bcrypt password hashing, JSON Web Tokens                 |
| Database         | MySQL 8                                                  |
| Notifications    | Database-backed notifications, Nodemailer integration    |
| Scheduling       | node-cron                                                |
| Reporting/export | Chart.js, jsPDF, jsPDF AutoTable, SheetJS                |
| Web serving      | Nginx for the production frontend image                  |
| Local deployment | Docker and Docker Compose                                |

## Repository structure

```text
kandypack-scms/
├── client/                      # React/Vite frontend
│   ├── src/components/          # Shared layouts and route protection
│   ├── src/pages/               # Role-specific screens
│   ├── Dockerfile               # Build and serve frontend with Nginx
│   └── nginx.conf               # SPA fallback and /api reverse proxy
├── server/                      # Express backend API
│   ├── src/routes/              # API route modules
│   ├── src/db.js                # MySQL connection pool
│   ├── src/index.js             # API entry point
│   └── Dockerfile               # Production API image
├── db/                          # Schema, procedures, triggers, indexes, and seed data
│   ├── 01_users_schema.sql
│   ├── 02_orders_schema.sql
│   ├── 03_rail_store_schema.sql
│   ├── 04_roster_delivery_schema.sql
│   ├── 05_notifications_schema.sql
│   ├── 06_inventory_schema.sql
│   ├── 07_advanced_sql.sql
│   └── init.sql                 # Ordered database initializer used by Compose
├── docker-compose.yml           # MySQL, API, and frontend services
├── .env.example                 # Root environment template
└── README.md
```

## Local development

### Prerequisites

- Git
- Node.js 20 or a current LTS release
- Docker Desktop with the Compose plugin
- MySQL 8 and MySQL Workbench (optional when using Docker)

### Option 1: Run the complete stack with Docker (recommended)

1. Clone the repository:

   ```bash
   git clone https://github.com/sachithravithanage/kandypack-scms.git
   cd kandypack-scms
   ```

2. Create the local environment file:

   ```bash
   copy .env.example .env
   ```

   Set a unique `DB_PASSWORD` and a long random `JWT_SECRET`. Keep `.env`
   local and never commit it.

3. Build and start all services:

   ```bash
   docker compose up --build
   ```

4. Open the application at [http://localhost](http://localhost). The Compose
   configuration exposes MySQL and the API on localhost only; browser API
   requests are routed through Nginx at `/api`.

5. Check service health and logs:

   ```bash
   docker compose ps
   docker compose logs --tail=100 db server client
   ```

6. Stop the stack when finished:

   ```bash
   docker compose down
   ```

   Add `-v` only when you intentionally want to remove the persisted
   `db_data` volume and recreate the database from `db/init.sql`.

### Option 2: Run the client and API separately

Start the API:

```bash
cd server
npm install
copy .env.example .env
npm run dev
```

Start the frontend in a second terminal:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

For a separate local API, set `VITE_API_URL=http://localhost:5000` in
`client/.env`. The API listens on port `5000` by default and the Vite
development server normally listens on port `5173`.

### Useful commands

| Purpose                           | Command                        |
| --------------------------------- | ------------------------------ |
| Start API with hot reload         | `cd server && npm run dev`     |
| Start API normally                | `cd server && npm start`       |
| Start Vite development server     | `cd client && npm run dev`     |
| Build frontend                    | `cd client && npm run build`   |
| Lint frontend                     | `cd client && npm run lint`    |
| Preview production frontend build | `cd client && npm run preview` |

## Database design

The database is initialized in dependency order. The primary ownership areas
are:

| Schema                      | Tables                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Users and master data       | `role`, `user`, `employee`, `city`, `audit_log`                                                        |
| Orders                      | `product`, `route`, `route_stop`, `customer`, `order`, `order_item`                                    |
| Rail and stores             | `train`, `train_trip`, `store`, `cargo_allocation`, `store_inventory`                                  |
| Rostering and delivery      | `driver`, `assistant`, `truck`, `truck_schedule`, `truck_allocation`, `roster_log`, `system_parameter` |
| Notifications and inventory | `notification`, `main_inventory`                                                                       |

Additional SQL files provide stored procedures, indexes, validation triggers,
seed data, views, constraints, and window-function reporting. Run
`db/init.sql` for the complete ordered setup used by Docker Compose.

## Docker deployment

The production Compose stack contains:

- **`db`** — MySQL 8 with a health check and persistent `db_data` volume.
- **`server`** — Express API on internal port `5000`.
- **`client`** — Vite production build served by Nginx on port `80`.

For an Azure Linux VM or another Docker-capable host:

```bash
git clone https://github.com/sachithravithanage/kandypack-scms.git
cd kandypack-scms
cp .env.example .env
# Edit .env with deployment-only secrets.
docker compose up -d --build
docker compose ps
```

Expose HTTP/HTTPS at the host or reverse proxy level, but do not expose MySQL
to the public internet. Production secrets must be supplied through the host
environment and must not be stored in Git.

## Team contributions

Kandypack was developed by **Group 18**. The member assignments below document
the complete contribution areas defined in the project guide. Names are listed
in the same A-to-E order used by the team’s contributor list.

### Member A — Vithanage V.B.S. (240690D)

**Role:** Auth, user management, master data, inventory, DevOps, and integration
lead. **Branch:** `feature/auth`

- Designed and implemented the shared identity foundation: `role`, `user`,
  `employee`, and `city`.
- Implemented customer registration/login support, bcrypt password hashing,
  JWT authentication, authorization middleware, and account lifecycle rules.
- Built the administrator user-management API and screens, including
  activation/deactivation and role assignment.
- Implemented `audit_log` and the audit trail for sensitive administrative
  operations.
- Added the head-office `main_inventory` schema, API, stock-management screen,
  and inventory controls.
- Established the shared Express backend structure and database connection
  conventions used by the other feature areas.
- Led repository integration, branch coordination, environment configuration,
  Dockerfiles, Docker Compose, database initialization, and deployment
  readiness.

**Owned tables:** `role`, `user`, `employee`, `city`, `audit_log`,
`main_inventory`.

### Member B — Jayawardhana J.A.R.P. (240297E)

**Role:** Customer order placement and route-stop management. **Branch:**
`feature/order-placement`

- Designed and implemented the product catalog and pricing data.
- Implemented routes and ordered `route_stop` records so an order resolves to
  a specific delivery stop rather than an unstructured coverage area.
- Built customer profile and customer-address handling.
- Implemented order creation, order items, quantity/value calculations, and
  order validation.
- Enforced the seven-day lead-time rule and route/stop lookup behavior.
- Built the customer order-history view and new-order form with product
  selection, city filtering, delivery-stop selection, and exact delivery
  address capture.
- Supplied the order and route data contracts required by rail scheduling,
  store receipt, delivery execution, and reporting.

**Owned tables:** `product`, `route`, `route_stop`, `customer`, `order`,
`order_item`.

### Member C — Kumarasinghe K.H.A.C.P. (240368A)

**Role:** Rail scheduling, cargo allocation, and regional-store receipt.
**Branch:** `feature/rail-store`

- Designed and implemented train, train-trip, and store master data.
- Built capacity-aware rail scheduling and cargo allocation per order item.
- Supported order splitting across multiple train trips.
- Implemented train loading status and dispatcher workflows.
- Built store shipment receipt processing with expected/received quantities,
  discrepancy flags, and discrepancy notes.
- Implemented the append-only store inventory receipt ledger.
- Built the administration train-schedule, dispatcher loading, shipment receipt,
  and store daily-dispatch screens.
- Added the route/store relationship required for consistent regional
  fulfillment.

**Owned tables:** `train`, `train_trip`, `store`, `cargo_allocation`,
`store_inventory`.

### Member D — Nanayakkara N.S. (240449A)

**Role:** Fleet rostering and last-mile delivery execution. **Branch:**
`feature/roster-delivery`

- Implemented driver, assistant, and truck master data.
- Built weekly truck and crew roster scheduling.
- Added validation for truck/crew conflicts, working-hour limits, and required
  rest periods.
- Implemented `truck_schedule`, including pickup confirmation and run status.
- Implemented per-order `truck_allocation` linked to real route stops.
- Built delivery execution for `Delivered`, `Failed`, and `Attempted` outcomes.
- Added the run-completion workflow and actual-hours logging through
  `roster_log`.
- Built the roster scheduling, driver run, pickup confirmation, stop-detail,
  and delivery-status interfaces.
- Added delivery and roster data required for utilization and staff-hours
  reporting.

**Owned tables:** `driver`, `assistant`, `truck`, `truck_schedule`,
`truck_allocation`, `roster_log`, `system_parameter`.

### Member E — Rajapaksha W.T.D. (240539B)

**Role:** Reporting, notifications, and containerization support. **Branch:**
`feature/reporting-notifications`

- Designed and implemented the `notification` table and notification API.
- Added notification creation, user notification listing, and acknowledge/read
  behavior for operational events.
- Built reporting endpoints and management report views covering sales,
  orders, cargo, truck utilization, delivery performance, and staff hours.
- Implemented dashboard visualizations and export workflows using PDF and
  spreadsheet formats.
- Added role-aware notification and reporting access behavior.
- Supported integration testing across the order, rail, store, roster, and
  delivery modules.
- Assisted Member A with Docker image configuration, Compose integration,
  database initialization, health checks, and deployment verification.

**Owned table:** `notification`.

## Engineering conventions

- Use feature branches and pull requests rather than committing directly to
  `main`.
- Use the existing commit style, for example:
  `feat: add order placement form UI`.
- Keep secrets in local `.env` files; commit only `.env.example` templates.
- Apply schema files in dependency order. Shared user/master tables must be
  available before dependent feature tables.
- Validate API input and return explicit HTTP errors; do not silently accept
  invalid orders, allocations, or delivery updates.
- Run the relevant frontend lint/build checks before opening a pull request.

## Project status and known design decisions

- `route_stop` replaces the earlier single free-text route coverage area.
- `order.route_id` and `order.route_stop_id` are required at order placement;
  an order without a valid route stop is rejected rather than stored as an
  unroutable order.
- Cargo is allocated per order item, which allows one order to be split across
  train trips.
- Store receipt discrepancies are recorded directly on `cargo_allocation`.
- `truck_allocation` represents delivery work for a real route stop.
- Planned hours are checked against `truck_schedule` when rosters are created;
  `roster_log` records actual hours after a run is completed.
- The `Attempted` delivery outcome is supported because it is required by the
  delivery requirements.

These decisions keep the implemented schema, user flows, and operational
requirements aligned. Any change to them should update the relevant SQL,
backend validation, frontend behavior, and documentation together.
