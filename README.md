# Kandypack Rail and Road-based Supply Chain Distribution System

## Overview

The Kandypack system is a centralized, database-driven logistics platform designed for Kandypack, a mid-sized FMCG manufacturer based in Kandy, Sri Lanka. It replaces legacy Excel-based tracking with a unified web application covering the complete distribution pipeline. The system coordinates primary long-haul transport via the national railway network and manages last-mile truck delivery from regional store facilities to final customer destinations.

## Key Features

- **Order Management:** Customers can place orders, validate the 7-day lead time, and track their order status from placement to delivery.
- **Rail Cargo Scheduling:** Logistics Dispatchers can allocate bulk orders to scheduled train trips based on fixed cargo capacities and product space-consumption rates.
- **Regional Store Operations:** Store Managers can reconcile arriving train manifests, report discrepancies, and oversee daily truck loading.
- **Fleet & Crew Rostering:** Dispatchers can build weekly rosters for trucks, drivers, and assistants while the system automatically enforces working-hour limits and rest-break rules.
- **Last-Mile Execution:** Drivers and Assistants utilize a mobile-optimized interface to confirm pickups, record delivery stop outcomes, and report issues.
- **Analytics & Reporting:** System Administrators have access to exportable management reports covering sales, truck utilization, and staff working hours.

## Technology Stack

| Layer                | Technology                      |
| :------------------- | :------------------------------ |
| **Frontend**         | React (Vite / Create React App) |
| **Backend API**      | Node.js with Express            |
| **Database**         | MySQL Community Server          |
| **Containerization** | Docker & Docker Compose         |

## Project Structure

The repository is organized into the following primary directories:

- `client/` — Contains the frontend React application code and UI components.
- `server/` — Contains the Node/Express backend logic, API routes, and database connection settings.
- `db/` — Contains database schema definitions, initialization scripts (`init.sql`), and sample seed data.
- `docs/` — Contains project documentation, including the Software Requirements Specification (SRS).

### SQL concepts demonstrated

The database initializer also includes `db/07_advanced_sql.sql`, which adds
join-backed views, composite indexes, `CHECK` constraints, transaction-safe
stored routines, validation triggers, and window-function reporting. These are
additive database features: the existing API routes and user flows continue to
use the same tables and endpoints.

## Getting Started (Local Development)

### Prerequisites

Ensure the following tools are installed on your local machine:

- Git
- Node.js (LTS version)
- Docker Desktop
- MySQL Community Server & MySQL Workbench

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/](https://github.com/)<your-org-or-username>/kandypack-scms.git
    cd kandypack-scms
    ```
2.  **Environment Variables:**
    - Copy the root `.env.example` to `.env`.
    - Set a strong `DB_PASSWORD` and `JWT_SECRET`. Never commit `.env`.
3.  **Run with Docker Compose:**
    - The project uses a multi-container Docker setup that initializes the MySQL database, Node backend, and React frontend simultaneously. Run the following command in the project root:

    ```bash
    docker compose up --build
    ```

    - Once the containers are running, the application will be accessible via your web browser at `http://localhost`.
    - The database and API ports are bound to localhost only. The browser reaches the API through nginx at `/api`.

### Azure VM deployment

The same Compose stack can run on an Azure Linux VM with Docker Engine and the
Compose plugin installed.

1. Clone the repository on the VM.
2. Copy `.env.example` to `.env` and replace the placeholder values with unique
   secrets. Keep this file only on the VM.
3. Start the stack:

   ```bash
   docker compose up -d --build
   ```

4. Check service health and logs:

   ```bash
   docker compose ps
   docker compose logs --tail=100 db server client
   ```

5. Open `http://<VM-public-IP>/`. Only expose TCP 80 (and later 443) in the
   Azure Network Security Group. Do not expose MySQL publicly.

## Team Contributors

This project was developed by Group 18:

- Jayawardhana J.A.R.P. (240297E)
- Kumarasinghe K.H.A.C.P. (240368A)
- Nanayakkara N.S. (240449A)
- Rajapaksha W.T.D. (240539B)
- Vithanage V.B.S. (240690D)
