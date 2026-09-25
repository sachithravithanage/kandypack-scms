# Kandypack Project — Complete Team Guide
### React + Node/Express + MySQL, Dockerized, Deployed Free
### Team of 5 — Full Step-by-Step Instructions (Absolute Beginner Friendly)
### v2 — Updated to match the team's final ER diagram and agreed schema changes

---

## HOW TO USE THIS DOCUMENT

1. **Everyone reads Part 1 first** (Sections 0–4). This is shared setup that applies to the whole team, and it explains basics like "how to open a terminal" that every member's individual steps rely on.
2. **Then each person reads only their own section in Part 2** — but skim the others so you understand how your work connects.
3. **Read Part 4 at the end** — it explains every change the team made to the original ER diagram and SRS, and why. This matters if you're ever unsure why the database looks different from the original planning documents.
4. Every step below assumes you are starting from **zero knowledge** of the tool being used. Follow the clicks and commands exactly, in order. Don't skip the "commit" instructions — they are real steps, not extra credit.
5. Anywhere you see a code block like this:
   ```
   some command or code
   ```
   it means: type or paste that exact text where instructed.

---

# PART 1 — SHARED SETUP & OVERALL WORKFLOW

## Section 0: Tools Everyone Needs to Install (Do This First, Individually)

Every team member does this once, on their own laptop, before anything else.

### 0.1 Install Git
1. Go to https://git-scm.com/downloads in your browser.
2. Download the installer for your operating system (Windows/Mac/Linux) and run it.
3. During install, accept all default options (just keep clicking "Next" / "Install").

### 0.2 Install Node.js
1. Go to https://nodejs.org.
2. Download the **LTS** version (the button usually says "LTS — Recommended for most users").
3. Run the installer, accept the defaults.

### 0.3 Install MySQL
1. Go to https://dev.mysql.com/downloads/installer/ (Windows) or use Homebrew on Mac (`brew install mysql`) or your Linux package manager (`sudo apt install mysql-server`).
2. During Windows install, when it asks you to set a **root password**, choose something simple you'll remember for local development (e.g. `root1234`) and **write it down** — you'll need it constantly.
3. Also install **MySQL Workbench** (a visual tool for looking at your database) — it's usually offered in the same installer, or download separately from https://dev.mysql.com/downloads/workbench/.

### 0.4 Install VS Code
1. Go to https://code.visualstudio.com.
2. Download and install it for your OS.
3. Open VS Code once after installing, just to confirm it launches.

### 0.5 Install Docker Desktop
1. Go to https://www.docker.com/products/docker-desktop.
2. Download and install for your OS.
3. Open Docker Desktop once after installing. On first launch it may ask you to enable virtualization or restart your computer — do so if asked.

### 0.6 Install Postman
1. Go to https://www.postman.com/downloads.
2. Download and install. You can skip creating an account (use "Skip and go to the app" if offered) or make a free one.

### 0.7 Create a GitHub account
1. Go to https://github.com and click **Sign up** if you don't already have an account.
2. Remember your username — your teammates will need it to add you to the project.

### 0.8 Verify everything is installed correctly

You now need to open a **terminal**. This is a text window where you type commands instead of clicking. Here's how to open one:

- **Inside VS Code (recommended — use this for the whole project):** Open VS Code, then go to the top menu **Terminal → New Terminal** (or press `` Ctrl+` `` on Windows/Linux, `` Cmd+` `` on Mac). A panel opens at the bottom of the screen — that's your terminal.
- Alternatively, on Windows you can search for "Command Prompt" or "PowerShell" in the Start menu; on Mac, search for "Terminal" in Spotlight; on Linux, use your system's Terminal app.

**We will use the VS Code terminal for everything in this guide from now on**, since it keeps your code editor and command line in one place.

In the terminal, type each of these commands one at a time, pressing **Enter** after each:
```
git --version
node --version
npm --version
mysql --version
docker --version
```
After each command, you should see a version number printed (e.g. `git version 2.43.0`). If instead you see something like "command not found" or "not recognized," that tool did not install correctly — go back and reinstall it, then close and reopen VS Code before trying again.

---

## Section 1: GitHub Repository Setup

**One member (we'll call them the Team Lead — suggested: Member A) does Steps 1–4 below. Everyone else does Step 5.**

### Step 1: Create the repository (Team Lead only)
1. Open your web browser, go to https://github.com, and make sure you're logged in.
2. Click the **+** icon in the top-right corner → **New repository**.
3. Under "Repository name," type `kandypack-scms`.
4. Choose **Private** (recommended) or **Public**, depending on your course's requirement.
5. Check the box **"Add a README file."**
6. Click the **".gitignore template"** dropdown and choose **Node**.
7. Click the green **Create repository** button.

### Step 2: Add all team members as collaborators (Team Lead only)
1. On your new repository's page, click **Settings** (top menu of the repo, not your account settings).
2. In the left sidebar, click **Collaborators**.
3. Click **Add people**, and type each teammate's GitHub username or the email they used to sign up. Repeat for all 4 teammates.
4. Each teammate will get an email or GitHub notification — they must click **Accept invitation**.

### Step 3: Set up the folder structure (Team Lead only)

1. Open VS Code.
2. Open a terminal (`` Ctrl+` ``).
3. Decide where on your computer you want the project folder to live, e.g. your Desktop. Navigate there in the terminal:
   ```
   cd Desktop
   ```
4. Copy your repository's URL: go back to your browser, on the repo page click the green **Code** button, and copy the HTTPS URL (looks like `https://github.com/yourname/kandypack-scms.git`).
5. In the VS Code terminal, type (paste your actual URL):
   ```
   git clone https://github.com/yourname/kandypack-scms.git
   ```
   Press Enter. This downloads the empty repository into a new folder called `kandypack-scms` on your Desktop.
6. Open that folder in VS Code: go to **File → Open Folder**, browse to Desktop, select `kandypack-scms`, click **Select Folder** / **Open**.
7. Open a new terminal inside this folder (`` Ctrl+` ``) — it should already be pointed at the `kandypack-scms` folder (you can confirm by typing `pwd` and pressing Enter — it should print the folder path).
8. Now create the folder structure. Type each line, pressing Enter after each:
   ```
   mkdir client
   mkdir server
   mkdir db
   mkdir docs
   ```
9. Create two empty files. In the terminal:
   ```
   touch docker-compose.yml
   touch .env.example
   ```
   (On Windows, if `touch` doesn't work, instead right-click inside the VS Code Explorer panel on the left → **New File** → type the filename exactly → press Enter.)
10. Open the `README.md` file that already exists (click it in the VS Code Explorer sidebar on the left) and replace its contents with a short project description, for example:
    ```markdown
    # Kandypack Rail and Road-based Supply Chain Distribution System

    A web application for FMCG distributor Kandypack, covering order placement,
    rail cargo scheduling, store receipt, truck/driver rostering, last-mile
    delivery tracking, and reporting.

    Tech stack: React, Node.js/Express, MySQL, Docker.
    ```
11. Save the file (`Ctrl+S` / `Cmd+S`).
12. Now save your work to GitHub. In the terminal:
    ```
    git add .
    git commit -m "chore: initial project folder structure"
    git push origin main
    ```
13. Go back to your browser and refresh the GitHub repo page — you should now see the `client`, `server`, `db`, `docs` folders listed.

### Step 4: Protect the main branch (Team Lead only, recommended)
1. On GitHub, go to **Settings → Branches**.
2. Click **Add branch protection rule** (or "Add rule").
3. Under "Branch name pattern," type `main`.
4. Check **"Require a pull request before merging."**
5. Click **Create** (or **Save changes**).

This means nobody can push code directly to `main` — everyone must work on their own branch and merge through a reviewed Pull Request, which protects the whole team's work.

### Step 5: Everyone else clones the repo

Each of the other 4 members does this once:
1. Open VS Code.
2. Open a terminal (`` Ctrl+` ``).
3. Navigate to where you want the project, e.g.:
   ```
   cd Desktop
   ```
4. Get the repo URL from GitHub (green **Code** button → copy the HTTPS link) and run:
   ```
   git clone https://github.com/<team-lead-username>/kandypack-scms.git
   ```
5. Open the folder in VS Code: **File → Open Folder** → select `kandypack-scms`.

You're now ready to move to your own section in Part 2.

---

## Section 2: Branching & Commit Rules (Everyone Follows This)

### Creating your own branch
Every member works on their own branch, never directly on `main`. Open a terminal inside your `kandypack-scms` folder in VS Code and run (replace the branch name with your own — see Part 2 for your exact branch name):
```
git checkout -b feature/<your-feature-name>
```
Example: `git checkout -b feature/auth`

### Commit message format
Every commit message should follow this pattern:
```
<type>: <short description>
```
Where `<type>` is:
- `feat` — a new feature
- `fix` — a bug fix
- `db` — database schema change
- `chore` — setup/config, non-feature work
- `docs` — documentation
- `test` — tests

**Commit after every small working piece**, not just once at the end of the day. Each step in Part 2 below tells you exactly when and what to commit.

### The commit cycle (you'll repeat this constantly)
1. Save your file(s) in VS Code (`Ctrl+S`).
2. In the terminal:
   ```
   git add .
   git commit -m "feat: your description here"
   git push origin feature/<your-branch-name>
   ```
   The first time you push a new branch, Git may show you a longer command to copy (something with `--set-upstream`) — just copy and run exactly what it shows you.

### Staying up to date with your teammates
Before starting work each day:
```
git checkout main
git pull origin main
git checkout feature/<your-branch-name>
git merge main
```

### Opening a Pull Request (when your feature is complete)
1. Push your branch (see above).
2. Go to your repo on GitHub — you'll usually see a yellow banner "Compare & pull request" for your recently pushed branch. Click it. (If not, click the **Pull requests** tab → **New pull request**, and choose your branch.)
3. Add a short title and description of what you built.
4. Click **Create pull request**.
5. Ask a teammate to review it (comment "Reviewed, looks good" or leave feedback).
6. Once approved, click **Merge pull request**, then **Confirm merge**.

---

## Section 3: Overall Project Workflow (All Phases, Parallel Work Marked)

```
PHASE 0 — Setup                              [Everyone, together, Day 1]
   └─ Sections 0–2 above (tools, repo, branching)

PHASE 1 — Design                             [Whole team meets together first]
   ├─ Agree on the final ER diagram (see Part 4 for the agreed final version)
   ├─ Agree on the REST API contract (endpoint names, request/response shapes)
   └─ Agree on the page list / navigation for each role's UI

PHASE 2 — Core Build                         [PARALLEL — the bulk of the project]
   ├─ Member A: Auth + User Management + City/Role master data + Inventory (DB + API + UI) + repo/Docker admin
   ├─ Member B: Order Placement (DB + API + UI) — push base tables FIRST
   ├─ Member C: Rail Scheduling + Store Receipt (DB + API + UI)
   ├─ Member D: Roster Scheduling + Delivery Execution (DB + API + UI)
   └─ Member E: Reporting + Notifications (DB + API + UI)

PHASE 3 — Integration                        [SEQUENTIAL — needs Phase 2 mostly done]
   ├─ Merge everyone's branches into main
   ├─ Run the full app end-to-end locally
   └─ Fix integration bugs together

PHASE 4 — Containerization                   [Member A + Member E lead, others assist]
PHASE 5 — Deployment                         [Member A + Member E lead]
PHASE 6 — Testing & Polish                   [PARALLEL — everyone tests their own feature]
PHASE 7 — Documentation & Submission          [PARALLEL — everyone documents their part]
```

---

## Section 4: Task Division Summary Table

| Member | Primary SRS Features | Branch Name | Database Tables Owned |
|---|---|---|---|
| **A** | 4.7 User Management & Auth + City/Role master data + HQ Inventory + repo/Docker/deploy admin | `feature/auth` | `role`, `user`, `employee`, `city`, `audit_log`, `main_inventory` |
| **B** | 4.1 Customer Order Placement | `feature/order-placement` | `customer`, `order`, `order_item`, `product`, `route`, `route_stop` |
| **C** | 4.2 Rail Scheduling + 4.3 Store Receipt | `feature/rail-store` | `train`, `train_trip`, `cargo_allocation`, `store`, `store_inventory` |
| **D** | 4.4 Roster Scheduling + 4.5 Delivery Execution | `feature/roster-delivery` | `driver`, `assistant`, `truck`, `truck_schedule`, `truck_allocation`, `roster_log`, `system_parameter` |
| **E** | 4.6 Reporting + 4.8 Notifications + Containerization support | `feature/reporting-notifications` | `notification` |

**Important dependencies (build order matters):**
1. **Member A** pushes `role`, `user`, `employee`, and `city` **first** (Day 1–2) — almost every other table depends on one of these.
2. **Member B** pushes `product`, `route`, `route_stop`, `customer`, `order`, `order_item` **next** (Day 2–3) — Members C, D, E depend on these.
3. Everyone else can then build in parallel.

See **Part 4** at the end of this guide for the full list of changes made to the team's original ER diagram, and why.

---

# PART 2 — INDIVIDUAL MEMBER GUIDES

Each guide below assumes you have already completed **Part 1** (tools installed, repo cloned, folder open in VS Code).

---

## MEMBER A — Auth, User Management, Master Data, Inventory & DevOps Lead

**Your features:** REQ-USR-01 to REQ-USR-05 (SRS Section 4.7), plus the `city` reference table and `main_inventory` (team-added feature, see Part 4). You also lead containerization/deployment later (Part 3).

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Open a terminal (`` Ctrl+` ``).
3. Create your branch:
   ```
   git checkout -b feature/auth
   ```

### A1. Design your database tables (do this first — everyone depends on this)

1. Open **MySQL Workbench** (a separate application from VS Code — find it in your Start Menu/Applications folder and open it).
2. Click on your local connection (usually named "Local instance MySQL80" or similar) and enter your root password from Section 0.3 when prompted.
3. Once connected, open a new query tab (blank-page-with-"+" icon, or **File → New Query Tab**).
4. Type this SQL to create your database:
   ```sql
   CREATE DATABASE IF NOT EXISTS kandypack;
   USE kandypack;
   ```
5. Run it: click the yellow lightning-bolt icon (Execute), or press `Ctrl+Enter`.
6. Now create the `role`, `user`, and `city` tables. **Note:** the team deliberately kept `role` as its own lookup table rather than a plain text field on `user` — this is a documented improvement over the earlier draft ERD, for referential integrity (see Part 4).
   ```sql
   CREATE TABLE role (
     role_id INT AUTO_INCREMENT PRIMARY KEY,
     role_name VARCHAR(50) NOT NULL UNIQUE
   );

   INSERT INTO role (role_name) VALUES
     ('Administrator'), ('Dispatcher'), ('Regional Store Manager'),
     ('Driver'), ('Assistant'), ('Customer');

   CREATE TABLE user (
     user_id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     email VARCHAR(150) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NOT NULL,
     role_id INT NOT NULL,
     is_active BOOLEAN DEFAULT TRUE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (role_id) REFERENCES role(role_id)
   );

   CREATE TABLE employee (
     user_id INT PRIMARY KEY,
     FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
   );

   CREATE TABLE city (
     city_id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(100) NOT NULL UNIQUE
   );

   INSERT INTO city (name) VALUES
     ('Colombo'), ('Negombo'), ('Galle'), ('Matara'), ('Jaffna'), ('Trincomalee');

   CREATE TABLE audit_log (
     log_id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT,
     action VARCHAR(255) NOT NULL,
     table_affected VARCHAR(100),
     record_id INT,
     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
     details TEXT,
     FOREIGN KEY (user_id) REFERENCES user(user_id)
   );
   ```
   **Note on `employee`:** this table exists purely as a shared "is this user also staff" marker that `driver` and `assistant` (Member D's tables) both hang off — it holds no columns of its own beyond `user_id`, since the person's name already lives on `user` and there's no reason to duplicate it. Member D's tables reference this one, so it needs to exist before theirs does — that's why it's built here, in Member A's section, not Member D's.
7. Run it (`Ctrl+Enter`).
8. Check it worked: in the left "Navigator" panel, right-click "Schemas" → **Refresh All**, then expand `kandypack → Tables` — you should see `role`, `user`, `employee`, `city`, `audit_log` listed.
9. Save this SQL into your project. In **VS Code**, right-click the `db` folder → **New File** → name it `01_users_schema.sql`. Paste the same SQL from steps 4 and 6 above. Save (`Ctrl+S`).
10. Commit your work:
    ```
    git add .
    git commit -m "db: add role, user, employee, city, audit_log tables"
    git push origin feature/auth
    ```
    (The first push may ask you to run an extra `--set-upstream` command — copy and run whatever it shows you.)
11. **Tell your team** in your group chat that `role`, `user`, `employee`, and `city` are pushed, and ask whoever's leading merges to bring this into `main` quickly so others can build their foreign keys against it.

### A2. Set up the Express backend project

1. In the VS Code terminal, move into the server folder:
   ```
   cd server
   ```
2. Initialize a Node project:
   ```
   npm init -y
   ```
   This creates a `package.json` file — you'll see it appear in the `server` folder in the Explorer sidebar.
3. Install the packages you need:
   ```
   npm install express mysql2 dotenv bcrypt jsonwebtoken cors
   npm install --save-dev nodemon
   ```
   Wait for it to finish (it may take a minute).
4. In the Explorer sidebar, right-click the `server` folder → **New Folder** → name it `src`. Inside `src`, right-click → **New File** → name it `index.js`.
5. Paste this into `server/src/index.js`:
   ```javascript
   const express = require('express');
   const cors = require('cors');
   require('dotenv').config();

   const app = express();
   app.use(cors());
   app.use(express.json());

   app.get('/', (req, res) => {
     res.send('Kandypack API is running.');
   });

   const PORT = process.env.PORT || 5000;
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```
   Save (`Ctrl+S`).
6. Open `server/package.json` (click it in the sidebar). Find the `"scripts"` section and replace it with:
   ```json
   "scripts": {
     "dev": "nodemon src/index.js",
     "start": "node src/index.js"
   }
   ```
   Save.
7. In the Explorer sidebar, right-click the `server` folder → **New File** → name it `.env`. Paste:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_root_password
   DB_NAME=kandypack
   JWT_SECRET=some_long_random_secret_text
   ```
   (Use your real MySQL root password from Section 0.3.) Save.
8. Create another file named `.env.example` in `server` (same steps), and paste the same content but with fake values, e.g.:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=kandypack
   JWT_SECRET=your_secret_here
   ```
   This file **is** committed to GitHub so teammates know what variables they need, without exposing your real password.
9. Make sure `.env` is ignored by Git so your real password never gets uploaded. Open the `.gitignore` file at the project root (it was created automatically when you made the repo with the Node template). Confirm it contains a line with `.env` — if not, add a new line `.env` and `node_modules/`. Save.
10. Test your server. In the terminal (make sure you're inside the `server` folder — check with `pwd`):
    ```
    npm run dev
    ```
    You should see `Server running on port 5000` printed. Open your web browser and go to `http://localhost:5000` — you should see the text "Kandypack API is running." Go back to VS Code and press `Ctrl+C` in the terminal to stop the server when you're done checking.
11. Commit:
    ```
    git add .
    git commit -m "chore: initialize Express server"
    git push origin feature/auth
    ```

### A3. Build the Auth API

1. In the Explorer sidebar, right-click `server/src` → **New Folder** → name it `routes`. Inside it, **New File** → name it `auth.js`.
2. Also create `server/src/db.js` — this will hold your database connection. Paste:
   ```javascript
   const mysql = require('mysql2/promise');
   require('dotenv').config();

   const pool = mysql.createPool({
     host: process.env.DB_HOST,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
   });

   module.exports = pool;
   ```
   Save.
3. In `server/src/routes/auth.js`, paste this starter code:
   ```javascript
   const express = require('express');
   const bcrypt = require('bcrypt');
   const jwt = require('jsonwebtoken');
   const db = require('../db');

   const router = express.Router();

   // Customer self-registration
   // IMPORTANT: this must create BOTH a `user` row and a matching `customer` row in the
   // same transaction — `customer.user_id` is not auto-generated, it must be the exact
   // same ID as the `user` row just created. Every other feature (orders, etc.) looks up
   // `customer` by this ID, so a registration that only inserts into `user` leaves a
   // "ghost" account that can never place an order.
   router.post('/register', async (req, res) => {
     const connection = await db.getConnection();
     try {
       await connection.beginTransaction();
       const { name, email, password, phone, address, cityId } = req.body;
       const password_hash = await bcrypt.hash(password, 10);

       // role_id 6 = Customer, based on the INSERT order in A1
       const [userResult] = await connection.query(
         'INSERT INTO user (name, email, password_hash, role_id) VALUES (?, ?, ?, 6)',
         [name, email, password_hash]
       );
       const newUserId = userResult.insertId;

       await connection.query(
         'INSERT INTO customer (user_id, phone, address, city_id) VALUES (?, ?, ?, ?)',
         [newUserId, phone, address, cityId]
       );

       await connection.commit();
       res.status(201).json({ message: 'Registered successfully', userId: newUserId });
     } catch (err) {
       await connection.rollback();
       res.status(400).json({ error: err.message });
     } finally {
       connection.release();
     }
   });

   // Login
   router.post('/login', async (req, res) => {
     try {
       const { email, password } = req.body;
       const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
       if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

       const user = rows[0];
       const match = await bcrypt.compare(password, user.password_hash);
       if (!match) return res.status(401).json({ error: 'Invalid email or password' });

       const token = jwt.sign(
         { userId: user.user_id, roleId: user.role_id },
         process.env.JWT_SECRET,
         { expiresIn: '8h' }
       );
       res.json({ token, user: { id: user.user_id, name: user.name, roleId: user.role_id } });
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });

   module.exports = router;
   ```
   Save.
4. Now wire this into your main server file. Open `server/src/index.js` again and edit it to look like this:
   ```javascript
   const express = require('express');
   const cors = require('cors');
   require('dotenv').config();
   const authRoutes = require('./routes/auth');

   const app = express();
   app.use(cors());
   app.use(express.json());

   app.use('/api/auth', authRoutes);

   app.get('/', (req, res) => {
     res.send('Kandypack API is running.');
   });

   const PORT = process.env.PORT || 5000;
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```
   Save.
5. Test it. In the terminal (inside `server` folder):
   ```
   npm run dev
   ```
6. Open **Postman**. Click **New → HTTP Request** (or the "+" tab).
   - Set the method dropdown to **POST**.
   - Enter the URL: `http://localhost:5000/api/auth/register`.
   - Click the **Body** tab, choose **raw**, and from the dropdown on the right choose **JSON**.
   - Paste:
     ```json
     {
       "name": "Test User",
       "email": "test@example.com",
       "password": "password123",
       "phone": "0771234567",
       "address": "45 Galle Road, Colombo 3",
       "cityId": 1
     }
     ```
   - Click **Send**. You should get back a `201` status and a JSON response with a `userId`. Then check MySQL Workbench and confirm a matching row was created in **both** `user` and `customer` with the same ID — if you only see the `user` row, something went wrong with the transaction.
7. Test login the same way: new request, POST to `http://localhost:5000/api/auth/login`, JSON body:
   ```json
   {
     "email": "test@example.com",
     "password": "password123"
   }
   ```
   You should get back a `token`.
8. Now create the two middleware functions. Create a new file `server/src/middleware/auth.js` (right-click `src` → New Folder → `middleware`, then New File → `auth.js` inside it). Paste:
   ```javascript
   const jwt = require('jsonwebtoken');

   function requireAuth(req, res, next) {
     const header = req.headers.authorization;
     if (!header) return res.status(401).json({ error: 'No token provided' });
     const token = header.split(' ')[1];
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.user = decoded;
       next();
     } catch (err) {
       res.status(401).json({ error: 'Invalid or expired token' });
     }
   }

   function requireRole(allowedRoleIds) {
     return (req, res, next) => {
       if (!allowedRoleIds.includes(req.user.roleId)) {
         return res.status(403).json({ error: 'Not authorized for this action' });
       }
       next();
     };
   }

   module.exports = { requireAuth, requireRole };
   ```
   Save.
9. Commit after each working piece, e.g.:
   ```
   git add .
   git commit -m "feat: add register and login endpoints with JWT"
   git push origin feature/auth
   ```

### A4. Build the User Management API (Admin-only)

1. Open `server/src/routes/auth.js` again, or create a new file `server/src/routes/users.js` for this (recommended, to keep things organized). Right-click `routes` folder → New File → `users.js`.
2. Paste this starter code, then fill in the remaining endpoints yourself following the same pattern:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const { requireAuth, requireRole } = require('../middleware/auth');

   const router = express.Router();

   // GET all users — Admin only (role_id 1)
   router.get('/', requireAuth, requireRole([1]), async (req, res) => {
     const [rows] = await db.query('SELECT user_id, name, email, role_id, is_active FROM user');
     res.json(rows);
   });

   // Admin creates a Dispatcher/Store Manager/Driver/Assistant account — REQ-USR-03
   // IMPORTANT: role_id 4 (Driver) and 5 (Assistant) need extra rows created in the same
   // transaction — Member D's `truck_schedule` table has foreign keys into `driver` and
   // `assistant`, which themselves reference `employee`, and nothing else in the project
   // ever creates those rows. Skipping this step means Member D can never actually assign
   // this person to a roster, even though their login works fine.
   router.post('/', requireAuth, requireRole([1]), async (req, res) => {
     const connection = await db.getConnection();
     try {
       await connection.beginTransaction();
       const { name, email, password, roleId, licenseNumber } = req.body;
       const bcrypt = require('bcrypt');
       const password_hash = await bcrypt.hash(password, 10);

       const [userResult] = await connection.query(
         'INSERT INTO user (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
         [name, email, password_hash, roleId]
       );
       const newUserId = userResult.insertId;

       if (roleId === 4 || roleId === 5) { // Driver or Assistant
         // `employee` has no columns beyond user_id — the person's name already lives on
         // `user`, so there's nothing else to insert here.
         await connection.query('INSERT INTO employee (user_id) VALUES (?)', [newUserId]);
         if (roleId === 4) {
           // license_number is required in the schema — the request must include it for a Driver
           await connection.query('INSERT INTO driver (user_id, license_number) VALUES (?, ?)', [newUserId, licenseNumber]);
         } else {
           await connection.query('INSERT INTO assistant (user_id) VALUES (?)', [newUserId]);
         }
       }

       await connection.query(
         'INSERT INTO audit_log (user_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)',
         [req.user.userId, 'Created user account', 'user', newUserId, `role_id ${roleId}`]
       );

       await connection.commit();
       res.status(201).json({ userId: newUserId });
     } catch (err) {
       await connection.rollback();
       res.status(400).json({ error: err.message });
     } finally {
       connection.release();
     }
   });

   module.exports = router;
   ```
3. Register it in `server/src/index.js`, adding near your other route:
   ```javascript
   const userRoutes = require('./routes/users');
   app.use('/api/users', userRoutes);
   ```
4. Add the remaining endpoints (`PUT /:id`, `PUT /:id/deactivate`) yourself, following the same style as the examples above — each one should also insert a row into `audit_log` recording what happened.
5. Test each endpoint in Postman (remember to add an **Authorization** header: in Postman, go to the **Authorization** tab of your request, select **Bearer Token**, and paste the token you got from logging in).
6. Commit:
   ```
   git add .
   git commit -m "feat: add admin user management endpoints"
   git push origin feature/auth
   ```

### A5. Build the HQ Inventory table and API (team-added feature — see Part 4)

**What this is:** the team decided to add HQ-level stock tracking, so an order can be checked and rejected if Kandypack doesn't have enough stock, and stock rises when the Admin records new manufactured quantities. This goes beyond the original SRS scope (Section 1.4.2 explicitly excludes general inventory management) — the team is deliberately extending scope here, and this should be noted as a documented decision (see Part 4).

1. In MySQL Workbench, run (this needs Member B's `product` table to already exist — check with them or `git pull origin main` first):
   ```sql
   USE kandypack;

   CREATE TABLE main_inventory (
     inventory_id INT AUTO_INCREMENT PRIMARY KEY,
     product_id INT NOT NULL UNIQUE,
     quantity_in_stock INT NOT NULL DEFAULT 0,
     FOREIGN KEY (product_id) REFERENCES product(product_id)
   );
   ```
2. Save this into `db/06_inventory_schema.sql` in VS Code, and commit:
   ```
   git add .
   git commit -m "db: add main_inventory table (team-added scope beyond SRS 1.4.2)"
   git push origin feature/auth
   ```
3. Create `server/src/routes/inventory.js`:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const { requireAuth, requireRole } = require('../middleware/auth');
   const router = express.Router();

   // Admin restocks a product (e.g. after a manufacturing run)
   router.put('/:productId/restock', requireAuth, requireRole([1]), async (req, res) => {
     const { quantityAdded } = req.body;
     await db.query(
       `INSERT INTO main_inventory (product_id, quantity_in_stock) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE quantity_in_stock = quantity_in_stock + ?`,
       [req.params.productId, quantityAdded, quantityAdded]
     );
     res.json({ message: 'Stock updated' });
   });

   // View current stock levels (used by Admin dashboard and by Member B's order-placement check)
   router.get('/', async (req, res) => {
     const [rows] = await db.query(
       `SELECT mi.product_id, p.name, mi.quantity_in_stock
        FROM main_inventory mi JOIN product p ON mi.product_id = p.product_id`
     );
     res.json(rows);
   });

   module.exports = router;
   ```
4. Register it: `app.use('/api/inventory', require('./routes/inventory'));`
5. Commit: `git commit -m "feat: add HQ inventory restock and listing endpoints"`
6. **Tell Member B** this exists — their order placement and cancellation endpoints need to check and update `main_inventory` (see Member B's section B2 below, which already includes this).

### A6. Build the React frontend for Auth

1. In the VS Code terminal, go back to the project root and into the `client` folder:
   ```
   cd ..
   cd client
   ```
2. Create the React app:
   ```
   npm create vite@latest . -- --template react
   ```
   If it asks "current directory is not empty, remove existing files and continue?" type `y` and press Enter (this is fine since the folder is otherwise empty).
3. Install dependencies:
   ```
   npm install
   npm install bootstrap react-router-dom axios
   ```
4. Test the base app works. Still inside `client`:
   ```
   npm run dev
   ```
   It will print a local URL like `http://localhost:5173`. Open it in your browser — you should see the default Vite+React starter page. Go back to VS Code and press `Ctrl+C` to stop it.
5. Open `client/src/main.jsx` and add the Bootstrap CSS import at the very top:
   ```javascript
   import 'bootstrap/dist/css/bootstrap.min.css';
   ```
   Save.
6. Create your pages folder: right-click `client/src` → New Folder → `pages`. Inside it, New File → `Login.jsx`. Paste:
   ```jsx
   import { useState } from 'react';
   import axios from 'axios';
   import { useNavigate } from 'react-router-dom';

   function Login() {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [error, setError] = useState('');
     const navigate = useNavigate();

     const handleSubmit = async (e) => {
       e.preventDefault();
       try {
         const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
         localStorage.setItem('token', res.data.token);
         navigate('/dashboard');
       } catch (err) {
         setError(err.response?.data?.error || 'Login failed');
       }
     };

     return (
       <div className="container mt-5" style={{ maxWidth: '400px' }}>
         <h2>Sign in to your account</h2>
         <form onSubmit={handleSubmit}>
           <div className="mb-3">
             <label>Email address</label>
             <input type="email" className="form-control" value={email}
               onChange={(e) => setEmail(e.target.value)} required />
           </div>
           <div className="mb-3">
             <label>Password</label>
             <input type="password" className="form-control" value={password}
               onChange={(e) => setPassword(e.target.value)} required />
           </div>
           {error && <p className="text-danger">{error}</p>}
           <button type="submit" className="btn btn-primary w-100">Log In</button>
         </form>
       </div>
     );
   }

   export default Login;
   ```
   Save.
7. Create `client/src/pages/Register.jsx` following the same pattern, but posting to `/api/auth/register` with `name`, `email`, `password`, `phone`, `address`, and `cityId` fields (matching Figure 2 in the SRS — name, email, password, phone number, and delivery address are all collected at registration time, since the backend now needs all of them to create the matching `customer` row in one step).
8. Wire up routing. Open `client/src/App.jsx` and replace its contents:
   ```jsx
   import { BrowserRouter, Routes, Route } from 'react-router-dom';
   import Login from './pages/Login';
   import Register from './pages/Register';

   function App() {
     return (
       <BrowserRouter>
         <Routes>
           <Route path="/" element={<Login />} />
           <Route path="/register" element={<Register />} />
         </Routes>
       </BrowserRouter>
     );
   }

   export default App;
   ```
   Save.
9. Test it: `npm run dev`, open the printed URL, confirm you can see the login page and (using the Register page) create a new account, then log in with it.
10. Commit:
    ```
    git add .
    git commit -m "feat: add login and registration pages"
    git push origin feature/auth
    ```

### A7. Build the Admin User Management and Inventory screens
1. Create `client/src/pages/AdminUsers.jsx`. Build a table that fetches from `GET /api/users` (using `axios`, sending the saved token from `localStorage` as an `Authorization: Bearer <token>` header) and displays Name, Email, Role, Status columns with Edit/Deactivate buttons.
2. Create `client/src/pages/AdminInventory.jsx` — a table fetching `GET /api/inventory`, with a "Restock" button per row that opens a small form calling `PUT /api/inventory/:productId/restock`.
3. Add routes for both in `App.jsx`.
4. Commit: `git commit -m "feat: add admin user management and inventory UI"`

### A8. Open your Pull Request
Once A1–A7 work end-to-end locally, push your branch and open a Pull Request on GitHub as described in Section 2. Get it reviewed, then merge into `main`.

### A9. Later — lead Containerization & Deployment
Once everyone's features are merged (Phase 3 done), go to **Part 3** at the end of this guide.

---

## MEMBER B — Customer Order Placement

**Your features:** REQ-ORD-01 to REQ-ORD-07 (SRS Section 4.1). You own tables everyone else depends on — **complete B1 first, Day 2–3, after Member A's `role`/`user`/`city` tables are on `main`.**

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Pull the latest code so you have Member A's `role`, `user`, `employee`, and `city` tables:
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/order-placement
   ```

### B1. Design your database tables

**Important design note for this version:** instead of one vague "coverage area" description per route, each route is now broken into individual **stops** (`route_stop`) with their own order along the route. An order is now matched to one specific stop, not just a route in general — and it stores its own free-text `delivery_address`, separate from the customer's saved profile address, since a customer might ship to somewhere other than their own address.

1. Open **MySQL Workbench**, connect to your local server (enter your root password).
2. Open a new query tab (blank-page-with-"+" icon, or **File → New Query Tab**).
3. If Member A's tables aren't in your local database yet, open `db/01_users_schema.sql` in VS Code, copy its contents, paste into Workbench, and run it first.
4. Type and run this SQL:
   ```sql
   USE kandypack;

   CREATE TABLE product (
     product_id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(150) NOT NULL UNIQUE,
     unit_price DECIMAL(8,2) NOT NULL,
     space_consumption_rate DECIMAL(6,2) NOT NULL
   );

   CREATE TABLE route (
     route_id INT PRIMARY KEY,
     store_id INT NOT NULL,
     name VARCHAR(150) NOT NULL UNIQUE,
     max_delivery_time_minutes INT NOT NULL,
     service_days VARCHAR(200) NOT NULL
   );
   -- Note: route_id is NOT auto-increment here — the team assigns route codes manually.
   -- Note: the FOREIGN KEY on store_id is added later once Member C's `store` table exists
   -- (see the ALTER TABLE at the end of Member C's C1). Because store_id is NOT NULL, you
   -- cannot insert any actual route rows (even test/seed data) until store exists — that's
   -- expected, just wait until Phase 3 seeding to add real rows.

   CREATE TABLE route_stop (
     route_stop_id INT AUTO_INCREMENT PRIMARY KEY,
     route_id INT NOT NULL,
     stop_name VARCHAR(100) NOT NULL,
     stop_order INT NOT NULL,
     approx_distance_km DECIMAL(5,2) NULL,
     UNIQUE (route_id, stop_order),
     FOREIGN KEY (route_id) REFERENCES route(route_id) ON DELETE CASCADE
   );

   CREATE TABLE customer (
     user_id INT PRIMARY KEY,
     phone VARCHAR(20) NOT NULL UNIQUE,
     address VARCHAR(200) NOT NULL,
     city_id INT,
     FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
     FOREIGN KEY (city_id) REFERENCES city(city_id)
   );

   CREATE TABLE `order` (
     order_id INT AUTO_INCREMENT PRIMARY KEY,
     customer_id INT NOT NULL,
     route_id INT NOT NULL,
     route_stop_id INT NOT NULL,
     delivery_address VARCHAR(255) NOT NULL,
     order_date DATE NOT NULL,
     requested_delivery_date DATE NOT NULL,
     status VARCHAR(30) NOT NULL DEFAULT 'Placed',
     total_value DECIMAL(11,2) NOT NULL,
     total_volume DECIMAL(10,2) NOT NULL,
     FOREIGN KEY (customer_id) REFERENCES customer(user_id),
     FOREIGN KEY (route_id) REFERENCES route(route_id),
     FOREIGN KEY (route_stop_id) REFERENCES route_stop(route_stop_id)
   );

   CREATE TABLE order_item (
     order_item_id INT AUTO_INCREMENT PRIMARY KEY,
     order_id INT NOT NULL,
     product_id INT NOT NULL,
     quantity INT NOT NULL,
     status VARCHAR(30) DEFAULT 'Pending',
     FOREIGN KEY (order_id) REFERENCES `order`(order_id) ON DELETE CASCADE,
     FOREIGN KEY (product_id) REFERENCES product(product_id)
   );
   ```
   Run it (`Ctrl+Enter`). Notes on this version:
   - `order` is a reserved word in MySQL, so it's wrapped in backticks — copy exactly as shown.
   - `customer.user_id` is the primary key **and** a foreign key to `user` — there's no separate `customer_id`. A customer's ID always matches their login account's ID.
   - `order_item.status` tracks the customer-facing delivery status of each individual item (Pending / Out for Delivery / Delivered — see Part 4 for what sets this automatically).
   - **`order.route_id` and `order.route_stop_id` are `NOT NULL`** — unlike an earlier draft of this schema, an order cannot be saved without a matched route and stop. This is a deliberate team decision to require a valid stop at placement time rather than storing an "Unroutable" order with no route at all — see Part 4 for the trade-off this makes against the SRS's literal wording of REQ-ORD-03, and make sure your team has actually agreed to this before relying on it.
5. Confirm the tables appeared: right-click "Schemas" in the left panel → Refresh All → expand `kandypack → Tables`.
6. Save this SQL into your project. In VS Code, right-click the `db` folder → New File → `02_orders_schema.sql`. Paste the same SQL (including the `USE kandypack;` line). Save.
7. Commit and push immediately:
   ```
   git add .
   git commit -m "db: add product, route, route_stop, customer, order, order_item tables"
   git push origin feature/order-placement
   ```
8. **Tell your team** (group chat) that this is pushed, so Members C and D can build their foreign keys against it. Agree as a team whether to merge this into `main` early via a quick Pull Request so everyone can pull it easily.

### B2. Set up your backend routes file

1. If `server/node_modules` doesn't exist yet on your machine (i.e., Member A hasn't merged their setup yet, or you're working before that), set up the server yourself first following Member A's Section A2 steps 1–3 (npm init, install packages, create `src/index.js` and `src/db.js`). If Member A has already merged their setup into `main` and you've pulled it, skip to step 2.
2. In VS Code, right-click `server/src/routes` → New File → `orders.js`.
3. Paste this starter code. Notice it now checks and reserves stock in `main_inventory` (Member A's table) as part of the same transaction that creates the order — this prevents two customers from both being told "yes we have stock" for the last few units at the same time:
   ```javascript
   const express = require('express');
   const db = require('../db');

   const router = express.Router();

   // Place a new order
   router.post('/', async (req, res) => {
     const connection = await db.getConnection();
     try {
       await connection.beginTransaction();

       // routeStopId is chosen by the customer from a dropdown of stops (see B4's
       // GET /api/routes/stops endpoint below) — the schema requires a specific route AND
       // stop up front, so there's no automatic address-matching step here (the SRS notes
       // route geometry/address-matching is out of scope for V1.0 — see Part 4).
       const { customerId, routeStopId, deliveryAddress, deliveryDate, items } = req.body;

       // Check 7-day lead time — REQ-ORD-02
       const today = new Date();
       const requested = new Date(deliveryDate);
       const diffDays = (requested - today) / (1000 * 60 * 60 * 24);
       if (diffDays < 7) {
         await connection.rollback();
         return res.status(400).json({ error: 'Delivery date must be at least 7 days from today.' });
       }

       const [customerRows] = await connection.query('SELECT user_id FROM customer WHERE user_id = ?', [customerId]);
       if (customerRows.length === 0) {
         await connection.rollback();
         return res.status(404).json({ error: 'Customer not found' });
       }

       // Look up the route via the chosen stop — route_id and route_stop_id are both
       // NOT NULL on `order`, so a valid stop selection is required to place an order at
       // all (see the note on this in B1 — this order can't be saved as "Unroutable").
       const [stopRows] = await connection.query('SELECT route_id FROM route_stop WHERE route_stop_id = ?', [routeStopId]);
       if (stopRows.length === 0) {
         await connection.rollback();
         return res.status(400).json({ error: 'Please select a valid delivery stop.' });
       }
       const routeId = stopRows[0].route_id;

       // Check and reserve HQ stock for each item — team-added inventory feature (see Part 4)
       let totalValue = 0;
       let totalVolume = 0;
       for (const item of items) {
         const [stockRows] = await connection.query(
           'SELECT quantity_in_stock FROM main_inventory WHERE product_id = ? FOR UPDATE',
           [item.productId]
         );
         if (stockRows.length === 0 || stockRows[0].quantity_in_stock < item.quantity) {
           await connection.rollback();
           return res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
         }

         const [productRows] = await connection.query('SELECT * FROM product WHERE product_id = ?', [item.productId]);
         const product = productRows[0];
         totalValue += product.unit_price * item.quantity;
         totalVolume += product.space_consumption_rate * item.quantity;
       }

       // Create the order — REQ-ORD-01, REQ-ORD-04
       const [orderResult] = await connection.query(
         `INSERT INTO \`order\` (customer_id, route_id, route_stop_id, delivery_address, order_date, requested_delivery_date, total_value, total_volume, status)
          VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, 'Placed')`,
         [customerId, routeId, routeStopId, deliveryAddress, deliveryDate, totalValue, totalVolume]
       );
       const orderId = orderResult.insertId;

       for (const item of items) {
         await connection.query(
           'INSERT INTO order_item (order_id, product_id, quantity, status) VALUES (?, ?, ?, ?)',
           [orderId, item.productId, item.quantity, 'Pending']
         );
         await connection.query(
           'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?',
           [item.quantity, item.productId]
         );
       }

       await connection.commit();
       res.status(201).json({ message: 'Order placed', orderId });
     } catch (err) {
       await connection.rollback();
       res.status(400).json({ error: err.message });
     } finally {
       connection.release();
     }
   });

   // Get order history for a customer — REQ-ORD-05
   router.get('/customer/:customerId', async (req, res) => {
     const [rows] = await db.query('SELECT * FROM `order` WHERE customer_id = ?', [req.params.customerId]);
     res.json(rows);
   });

   // Cancel an order — only while status is 'Placed' — REQ-ORD-06
   // Must return reserved stock to main_inventory, otherwise stock leaks every time an order is cancelled.
   router.delete('/:id', async (req, res) => {
     const connection = await db.getConnection();
     try {
       await connection.beginTransaction();
       const [orderRows] = await connection.query('SELECT status FROM `order` WHERE order_id = ? FOR UPDATE', [req.params.id]);
       if (orderRows.length === 0 || orderRows[0].status !== 'Placed') {
         await connection.rollback();
         return res.status(400).json({ error: 'Order can only be cancelled while status is Placed.' });
       }

       const [items] = await connection.query('SELECT product_id, quantity FROM order_item WHERE order_id = ?', [req.params.id]);
       for (const item of items) {
         await connection.query(
           'UPDATE main_inventory SET quantity_in_stock = quantity_in_stock + ? WHERE product_id = ?',
           [item.quantity, item.product_id]
         );
       }

       await connection.query("UPDATE `order` SET status = 'Cancelled' WHERE order_id = ?", [req.params.id]);
       await connection.commit();
       res.json({ message: 'Order cancelled and stock restored' });
     } catch (err) {
       await connection.rollback();
       res.status(400).json({ error: err.message });
     } finally {
       connection.release();
     }
   });

   module.exports = router;
   ```
   Save.
4. Register the route in `server/src/index.js`:
   ```javascript
   const orderRoutes = require('./routes/orders');
   app.use('/api/orders', orderRoutes);
   ```
5. Start the server (`cd server`, then `npm run dev`) and test in **Postman**:
   - You'll need at least one row in `product`, `main_inventory` (with stock > 0), `city`, `user`+`customer`, and `store`+`route`+`route_stop` first — insert test rows via MySQL Workbench if needed (remember `route` and `route_stop` can't be created until Member C's `store` table exists, so coordinate with them if you're testing before that's merged).
   - New request → POST → `http://localhost:5000/api/orders` → Body → raw → JSON:
     ```json
     {
       "customerId": 1,
       "routeStopId": 1,
       "deliveryAddress": "45 Galle Road, Colombo 3",
       "deliveryDate": "2026-09-20",
       "items": [
         { "productId": 1, "quantity": 5 }
       ]
     }
     ```
   - Click Send, confirm you get a `201` response with an `orderId`. Then check in MySQL Workbench that `main_inventory.quantity_in_stock` for that product actually decreased by 5, and that the new `order` row has the right `route_id`/`route_stop_id`/`delivery_address`.
   - Try sending a `routeStopId` that doesn't exist, and confirm you get a `400` error ("Please select a valid delivery stop") instead of a crash.
   - Try placing an order for more than the available stock, and confirm you get a `400` error instead.
6. Add the remaining endpoint yourself, following this same pattern: `PUT /api/orders/:id` (edit, only if status is "Placed"), `PUT /api/orders/:id/confirm-receipt` (REQ-ORD-07).
7. Commit after each endpoint works:
   ```
   git add .
   git commit -m "feat: add order placement endpoint with stock check and lead-time validation"
   git push origin feature/order-placement
   ```

### B3. Build the product catalog and route-stop lookup endpoints
1. Create `server/src/routes/products.js`:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   router.get('/', async (req, res) => {
     const [rows] = await db.query('SELECT * FROM product');
     res.json(rows);
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/products', require('./routes/products'));` in `index.js`.
3. Create `server/src/routes/routes.js` (yes, a file named `routes.js` inside your `routes` folder — a little confusing, but it's for the `route`/`route_stop` tables, not a generic name):
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // List stops for a city — feeds the order form's delivery-address dropdown, joining
   // through route -> store -> city since route_stop itself has no city_id of its own.
   router.get('/stops', async (req, res) => {
     const { cityId } = req.query;
     const [rows] = await db.query(
       `SELECT rs.route_stop_id, rs.stop_name, r.route_id, r.name AS route_name
        FROM route_stop rs
        JOIN route r ON rs.route_id = r.route_id
        JOIN store s ON r.store_id = s.store_id
        WHERE s.city_id = ?
        ORDER BY r.route_id, rs.stop_order`,
       [cityId]
     );
     res.json(rows);
   });

   module.exports = router;
   ```
4. Register it: `app.use('/api/routes', require('./routes/routes'));` in `index.js`.
5. Test in Postman: `GET http://localhost:5000/api/routes/stops?cityId=1` should return a list of stops (once Member C's `store` table exists and you have test `route`/`route_stop` rows).
6. Commit: `git commit -m "feat: add product listing and route-stop lookup endpoints"`

### B4. Build the frontend order screens
1. In `client/src/pages`, create `MyOrders.jsx` — fetch `GET /api/orders/customer/:id` with axios, display a card per order (matches Figure 13: order ID, items summary, status badge, value).
2. Create `NewOrder.jsx` — fetch `GET /api/products` to populate a searchable list with "+ Add" buttons, a date picker that shows a warning if the chosen date is less than 7 days out (matches Figure 14), and:
   - A city dropdown, which on change fetches `GET /api/routes/stops?cityId=...` and populates a second "Delivery Stop" dropdown from the result.
   - A free-text "Delivery Address" field (`delivery_address`) for the exact address within that stop's area, since the stop only narrows down the general drop-off point.
3. Add both routes to `client/src/App.jsx`.
4. Commit after each screen: `git commit -m "feat: add order placement form UI with route-stop selection"`

### B5. Open your Pull Request
Push your branch, open a PR on GitHub, get it reviewed, merge into `main`.

---

## MEMBER C — Rail Scheduling & Store Receipt

**Your features:** REQ-RAIL-01 to REQ-RAIL-07 (Section 4.2) and REQ-STORE-01 to REQ-STORE-05 (Section 4.3).

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Pull the latest code so you have Member A's and Member B's tables:
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/rail-store
   ```

### C1. Design your database tables

**Important design notes for this feature (see Part 4 for full reasoning):**
- Cargo is allocated **per order item**, not per whole order — this makes REQ-RAIL-03's "split an order across trips" cleanly possible, since different items in the same order might need to go on different trips.
- Discrepancy tracking (REQ-STORE-02) lives directly on `cargo_allocation`, since that row already represents "what the manifest says should be here" — adding `received_quantity` and a flag to the same row is simpler than a separate table.
- `store_inventory` is an append-only receipt ledger for each store — every row is one confirmed shipment, and a store's current total stock is the sum of its rows (see the note after the schema below).
- **⚠️ Three columns below (`train_trip.arrival_datetime`, `cargo_allocation.status`, `cargo_allocation.received_quantity`) are NOT in the team's originally tested `03_rail_store_schema.sql`.** They're added here because REQ-RAIL-01 (arrival time), REQ-RAIL-06 (loading status), and REQ-STORE-02 (discrepancy detection) literally cannot be implemented without them — this isn't a style preference, the code in C2/C3 below won't run without these columns existing. **If your team already has a `kandypack` database built from the original tested file, you need to actually run the `ALTER TABLE` statements in step 3 below against it** — don't just assume they're already there.

1. Open **MySQL Workbench**, connect, open a new query tab.
2. Run:
   ```sql
   USE kandypack;

   CREATE TABLE train (
     train_id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(100) NOT NULL
   );

   CREATE TABLE train_trip (
     trip_id INT AUTO_INCREMENT PRIMARY KEY,
     train_id INT NOT NULL,
     destination_city_id INT NOT NULL,
     departure_datetime DATETIME NOT NULL,
     arrival_datetime DATETIME NOT NULL,
     total_capacity DECIMAL(10,2) NOT NULL,
     status VARCHAR(30) DEFAULT 'Scheduled',
     FOREIGN KEY (train_id) REFERENCES train(train_id),
     FOREIGN KEY (destination_city_id) REFERENCES city(city_id)
   );

   CREATE TABLE store (
     store_id INT AUTO_INCREMENT PRIMARY KEY,
     city_id INT NOT NULL,
     name VARCHAR(150) NOT NULL,
     address VARCHAR(255),
     FOREIGN KEY (city_id) REFERENCES city(city_id)
   );

   CREATE TABLE cargo_allocation (
     cargo_allocation_id INT AUTO_INCREMENT PRIMARY KEY,
     order_item_id INT NOT NULL,
     trip_id INT NOT NULL,
     allocated_quantity INT NOT NULL,
     status VARCHAR(30) DEFAULT 'Not Loaded',
     received_quantity INT,
     discrepancy_flag BOOLEAN DEFAULT FALSE,
     discrepancy_note TEXT,
     FOREIGN KEY (order_item_id) REFERENCES order_item(order_item_id),
     FOREIGN KEY (trip_id) REFERENCES train_trip(trip_id)
   );

   CREATE TABLE store_inventory (
     store_inventory_id INT AUTO_INCREMENT PRIMARY KEY,
     store_id INT NOT NULL,
     product_id INT NOT NULL,
     cargo_allocation_id INT NOT NULL UNIQUE,
     quantity_on_hand INT NOT NULL DEFAULT 0,
     FOREIGN KEY (store_id) REFERENCES store(store_id),
     FOREIGN KEY (product_id) REFERENCES product(product_id),
     FOREIGN KEY (cargo_allocation_id) REFERENCES cargo_allocation(cargo_allocation_id)
   );
   ```
   **Note the `UNIQUE` on `cargo_allocation_id`:** this table is an append-only receipt log — one row per shipment actually received, not a single running-total row per product that gets incremented. Each row represents "this specific allocation arrived, and here's how much." The `UNIQUE` constraint stops the same shipment from being recorded twice by accident. To find a store's **current total stock** of a product, you sum across all its rows:
   ```sql
   SELECT SUM(quantity_on_hand) AS current_stock
   FROM store_inventory WHERE store_id = ? AND product_id = ?;
   ```
   Run it. Refresh the schema panel to confirm the tables were created.
3. Now that `store` exists, run this to finally add Member B's pending foreign key:
   ```sql
   ALTER TABLE route ADD FOREIGN KEY (store_id) REFERENCES store(store_id);
   ```
   **If you're building this database fresh**, the `CREATE TABLE` statements above already include the three flagged columns, so you're done — skip to step 4.
   **If you already ran the team's original tested `03_rail_store_schema.sql`** (the one without those three columns) and have real data in it, run this instead of recreating the tables from scratch:
   ```sql
   ALTER TABLE train_trip ADD COLUMN arrival_datetime DATETIME NOT NULL AFTER departure_datetime;
   ALTER TABLE cargo_allocation ADD COLUMN status VARCHAR(30) DEFAULT 'Not Loaded' AFTER allocated_quantity;
   ALTER TABLE cargo_allocation ADD COLUMN received_quantity INT AFTER status;
   ```
   (If `train_trip` already has rows with no arrival time to backfill, temporarily drop the `NOT NULL` on `arrival_datetime`, fill in real values, then re-add it with a second `ALTER TABLE ... MODIFY`.)
4. In VS Code, create `db/03_rail_store_schema.sql` and paste all the SQL above (including the `ALTER TABLE` line from step 3). Save.
5. Commit:
   ```
   git add .
   git commit -m "db: add train, train_trip, store, cargo_allocation, store_inventory tables"
   git push origin feature/rail-store
   ```

### C2. Build the Rail Scheduling API

1. In VS Code, right-click `server/src/routes` → New File → `rail.js`.
2. Paste this starter code — notice allocation now works **per order item**, looping through an order's items rather than treating the whole order as one unit:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // Admin defines a new trip
   router.post('/train-trips', async (req, res) => {
     try {
       const { trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity } = req.body;
       const [result] = await db.query(
         'INSERT INTO train_trip (train_id, destination_city_id, departure_datetime, arrival_datetime, total_capacity) VALUES (?, ?, ?, ?, ?)',
         [trainId, destinationCityId, departureDatetime, arrivalDatetime, totalCapacity]
       );
       res.status(201).json({ tripId: result.insertId });
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });

   // List trips
   router.get('/train-trips', async (req, res) => {
     const [rows] = await db.query(
       `SELECT tt.*, c.name AS destination_city, t.name AS train_name
        FROM train_trip tt
        JOIN city c ON tt.destination_city_id = c.city_id
        JOIN train t ON tt.train_id = t.train_id
        ORDER BY tt.departure_datetime`
     );
     res.json(rows);
   });

   // Allocate ONE order item's quantity to a trip — uses a transaction to prevent overbooking
   router.post('/train-trips/:id/allocate', async (req, res) => {
     const connection = await db.getConnection();
     try {
       await connection.beginTransaction();

       const { orderItemId, quantity } = req.body;
       const tripId = req.params.id;

       // Lock the trip row so no other request can allocate at the same time
       const [tripRows] = await connection.query(
         'SELECT * FROM train_trip WHERE trip_id = ? FOR UPDATE',
         [tripId]
       );
       const trip = tripRows[0];

       const [allocatedRows] = await connection.query(
         'SELECT COALESCE(SUM(allocated_quantity), 0) AS used FROM cargo_allocation WHERE trip_id = ?',
         [tripId]
       );
       const usedCapacity = allocatedRows[0].used;
       const remaining = trip.total_capacity - usedCapacity;

       if (quantity > remaining) {
         await connection.rollback();
         return res.status(400).json({ error: `Not enough capacity. Only ${remaining} remaining.`, remaining });
       }

       await connection.query(
         'INSERT INTO cargo_allocation (order_item_id, trip_id, allocated_quantity) VALUES (?, ?, ?)',
         [orderItemId, tripId, quantity]
       );

       // Move the parent order from Placed to Scheduled now that at least one of its
       // items has been allocated to a trip — REQ-ORD-05. Only moves it forward, never
       // backward, in case some items were already further along.
       await connection.query(
         `UPDATE \`order\` SET status = 'Scheduled'
          WHERE order_id = (SELECT order_id FROM order_item WHERE order_item_id = ?)
          AND status = 'Placed'`,
         [orderItemId]
       );

       await connection.commit();
       res.status(201).json({ message: 'Allocated successfully' });
     } catch (err) {
       await connection.rollback();
       res.status(400).json({ error: err.message });
     } finally {
       connection.release();
     }
   });

   // Dispatcher updates loading status for an order item's allocation on a trip
   router.put('/allocations/:id/loading-status', async (req, res) => {
     const { status } = req.body; // 'Not Loaded' | 'Partially Loaded' | 'Loaded'
     await db.query('UPDATE cargo_allocation SET status = ? WHERE cargo_allocation_id = ?', [status, req.params.id]);

     // Also update the customer-facing order_item.status — REQ-DEL-05
     if (status === 'Loaded') {
       const [allocRow] = await db.query('SELECT order_item_id FROM cargo_allocation WHERE cargo_allocation_id = ?', [req.params.id]);
       await db.query("UPDATE order_item SET status = 'Out for Delivery' WHERE order_item_id = ?", [allocRow[0].order_item_id]);
     }

     // If every allocation on this trip is Loaded, mark the trip Loaded and move every
     // affected order to In Transit — REQ-ORD-05
     const [allocRow2] = await db.query('SELECT trip_id FROM cargo_allocation WHERE cargo_allocation_id = ?', [req.params.id]);
     const tripId = allocRow2[0].trip_id;
     const [remaining] = await db.query(
       "SELECT COUNT(*) AS cnt FROM cargo_allocation WHERE trip_id = ? AND status != 'Loaded'",
       [tripId]
     );
     if (remaining[0].cnt === 0) {
       await db.query("UPDATE train_trip SET status = 'Loaded' WHERE trip_id = ?", [tripId]);
       await db.query(
         `UPDATE \`order\` SET status = 'In Transit'
          WHERE order_id IN (
            SELECT oi.order_id FROM order_item oi
            JOIN cargo_allocation ca ON ca.order_item_id = oi.order_item_id
            WHERE ca.trip_id = ?
          ) AND status = 'Scheduled'`,
         [tripId]
       );
     }

     res.json({ message: 'Loading status updated' });
   });

   module.exports = router;
   ```
   Save.
3. Register it in `server/src/index.js`: `app.use('/api/rail', require('./routes/rail'));`
4. Test in Postman: create a trip, then try allocating more than its capacity in a row and confirm the second attempt is rejected once capacity runs out.
5. Commit after each working piece:
   ```
   git add .
   git commit -m "feat: add per-item train trip capacity allocation with transaction lock"
   git push origin feature/rail-store
   ```
6. Add the remaining overflow-handling logic (REQ-RAIL-05, REQ-RAIL-07) yourself: when an allocation is rejected for insufficient capacity, instead of just erroring, look up the next `train_trip` for the same `destination_city_id` with a later `departure_datetime` and allocate there automatically, logging that a delay occurred.

### C3. Build the Store Receipt API

1. Create `server/src/routes/store.js`. Paste and extend this starter — notice this now records the discrepancy fields on `cargo_allocation` itself, then increases `store_inventory.quantity_on_hand` for the received amount:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // Expected manifest for an arriving trip at a store — REQ-STORE-01
   router.get('/:storeId/incoming/:tripId', async (req, res) => {
     const [rows] = await db.query(
       `SELECT ca.cargo_allocation_id, ca.order_item_id, ca.allocated_quantity, oi.product_id
        FROM cargo_allocation ca
        JOIN order_item oi ON ca.order_item_id = oi.order_item_id
        WHERE ca.trip_id = ?`,
       [req.params.tripId]
     );
     res.json(rows);
   });

   // Store Manager records received quantities — REQ-STORE-02, REQ-STORE-03
   router.post('/:storeId/receive', async (req, res) => {
     const connection = await db.getConnection();
     try {
       await connection.beginTransaction();
       const { cargoAllocationId, productId, receivedQuantity, note } = req.body;

       const [allocRows] = await connection.query(
         'SELECT allocated_quantity FROM cargo_allocation WHERE cargo_allocation_id = ?',
         [cargoAllocationId]
       );
       const expected = allocRows[0].allocated_quantity;
       const discrepancy = receivedQuantity < expected;

       await connection.query(
         'UPDATE cargo_allocation SET received_quantity = ?, discrepancy_flag = ?, discrepancy_note = ? WHERE cargo_allocation_id = ?',
         [receivedQuantity, discrepancy, note || null, cargoAllocationId]
       );

       // Record one receipt row in the store's stock ledger — a plain INSERT, not an
       // update. store_inventory is append-only (see the note in C1): the UNIQUE
       // constraint on cargo_allocation_id stops this exact shipment being recorded twice,
       // but each new shipment always gets its own row rather than incrementing an existing one.
       await connection.query(
         `INSERT INTO store_inventory (store_id, product_id, cargo_allocation_id, quantity_on_hand)
          VALUES (?, ?, ?, ?)`,
         [req.params.storeId, productId, cargoAllocationId, receivedQuantity]
       );

       // Update the order_item's customer-facing status
       const [allocRow2] = await connection.query('SELECT order_item_id FROM cargo_allocation WHERE cargo_allocation_id = ?', [cargoAllocationId]);
       const newItemStatus = discrepancy ? 'Discrepant' : 'Out for Delivery';
       await connection.query('UPDATE order_item SET status = ? WHERE order_item_id = ?', [newItemStatus, allocRow2[0].order_item_id]);

       await connection.commit();
       res.status(201).json({ message: 'Receipt recorded', discrepancy });
       // TODO: if discrepancy is true, call Member E's createNotification() here to alert the Dispatcher/Admin — REQ-NOT-01
     } catch (err) {
       await connection.rollback();
       res.status(400).json({ error: err.message });
     } finally {
       connection.release();
     }
   });

   // Get a store's current stock on hand per product — sums the append-only ledger above
   router.get('/:storeId/stock', async (req, res) => {
     const [rows] = await db.query(
       `SELECT product_id, SUM(quantity_on_hand) AS current_stock
        FROM store_inventory WHERE store_id = ? GROUP BY product_id`,
       [req.params.storeId]
     );
     res.json(rows);
   });

   // Daily Dispatch — Store Manager assigns a received order onto one of today's truck
   // runs (SRS Section 3.1.4, "Daily Dispatch screen"). This is the endpoint that actually
   // creates a truck_allocation row — without it, Member D's delivery-execution API has
   // nothing to work with, since nothing else in the project creates one. The order's own
   // route_stop_id (chosen back when the order was placed — see Member B's B2) is reused
   // here, so the delivery goes to the same stop the customer's order already points to.
   router.post('/:storeId/dispatch', async (req, res) => {
     try {
       const { truckScheduleId, orderId } = req.body;
       const [orderRows] = await db.query('SELECT route_stop_id FROM `order` WHERE order_id = ?', [orderId]);
       if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });

       const [result] = await db.query(
         'INSERT INTO truck_allocation (truck_schedule_id, order_id, route_stop_id) VALUES (?, ?, ?)',
         [truckScheduleId, orderId, orderRows[0].route_stop_id]
       );
       res.status(201).json({ truckAllocationId: result.insertId });
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });

   // List today's truck runs and what's been dispatched on each, for this store's city
   router.get('/:storeId/dispatch/today', async (req, res) => {
     const [rows] = await db.query(
       `SELECT ts.truck_schedule_id, ts.route_id, ta.truck_allocation_id, ta.order_id, ta.delivery_status
        FROM truck_schedule ts
        LEFT JOIN truck_allocation ta ON ta.truck_schedule_id = ts.truck_schedule_id
        WHERE ts.scheduled_date = CURDATE()
        AND ts.route_id IN (SELECT route_id FROM route WHERE store_id = ?)`,
       [req.params.storeId]
     );
     res.json(rows);
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/stores', require('./routes/store'));`
3. Add the truck-suggestion endpoint yourself (`GET /:storeId/truck-suggestion`) — query the average number of orders per route over the last few weeks from the `order`/`route` tables, divide by an assumed average truck capacity (e.g. 20 orders), round up, minimum 1.
4. Commit: `git commit -m "feat: add store receipt reconciliation, stock ledger, and daily dispatch endpoints"`
5. **Coordinate with Member D:** the two new endpoints above (`/dispatch` and `/dispatch/today`) depend on Member D's `truck_schedule` and `truck_allocation` tables already existing. If you build this before Member D has pushed those tables, create them locally yourself first by running Member D's `db/04_roster_delivery_schema.sql` (ask them for it, or wait until it's merged to `main`).

### C4. Build the frontend screens
1. `client/src/pages/AdminTrainSchedule.jsx` — table of trips with an "Add Schedule" button/form (Figure 4).
2. `client/src/pages/DispatcherTrainLoading.jsx` — dropdown to select a trip, progress bar showing allocated capacity, list of order items with a status selector per item (Figure 7).
3. `client/src/pages/StoreShipmentReceipt.jsx` — dropdown to select an incoming trip, a table with Expected/Received quantity inputs and a Notes field per allocation line, showing a red "Discrepant" badge when received < expected (Figure 10).
4. `client/src/pages/StoreDailyDispatch.jsx` — today's truck runs for the manager's city (fetch `GET /api/stores/:storeId/dispatch/today`), with an "Assign Order" control per run that calls `POST /api/stores/:storeId/dispatch` to load a received order onto that run.
5. Add routes for each in `App.jsx`. Commit after each screen.

### C5. Open your Pull Request
Push, open PR, review, merge.

---

## MEMBER D — Roster Scheduling & Delivery Execution

**Your features:** REQ-SCHED-01 to REQ-SCHED-06 (Section 4.4) and REQ-DEL-01 to REQ-DEL-05 (Section 4.5).

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Pull the latest code (you need Member A's `user` table, Member B's `route`/`order` tables, and Member C's `store` table):
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/roster-delivery
   ```

### D1. Design your database tables

**Important design notes (see Part 4):**
- `employee` (just a `user_id` marker, no other columns) is built by Member A, in `01_users_schema.sql` — `driver` and `assistant` both reference it, so it needs to exist first. You don't create it here.
- The roster table is called `truck_schedule` (renamed from an earlier draft's `roster`), and now holds `pickup_confirmed_at` directly on itself — one pickup event per run, not per stop.
- Per-order delivery work is tracked in `truck_allocation` (renamed from an earlier draft's `delivery_stop`), linked to a specific `route_stop` (Member B's table) rather than just a loose sequence number.
- `roster_log` tracks **actual worked hours after a run happens** — one row per `truck_schedule`, filled in once the run is complete — not planned hours at the moment a roster is built. This is a deliberate shift from an earlier draft, and it changes how the weekly-hour cap (REQ-SCHED-04) gets checked: instead of summing `roster_log`, D2 below sums the **planned** hours directly from `truck_schedule` itself (`start_time`/`end_time` × week), since that's the only data available at the moment a new assignment is being considered — `roster_log` doesn't exist yet for a run that hasn't happened. `roster_log` then becomes the source for **actual** hours reporting (REQ-RPT-04), and gets written by a new "Complete Run" step in D3.
- **⚠️ `truck_allocation.delivery_status` below includes `'Attempted'` as a fourth ENUM option — the team's originally tested `04_roster_delivery_schema.sql` only has three (`'Pending'`, `'Delivered'`, `'Failed'`).** REQ-DEL-03 explicitly requires all three outcomes — Delivered, Failed, *and* Attempted — to be recordable, so this addition is required for that requirement to be satisfiable at all. **If you already built the database from the original tested file, run this against it:**
  ```sql
  ALTER TABLE truck_allocation MODIFY COLUMN delivery_status
    ENUM('Pending', 'Delivered', 'Failed', 'Attempted') NOT NULL DEFAULT 'Pending';
  ```

1. Open MySQL Workbench, connect, open a new query tab.
2. Run:
   ```sql
   USE kandypack;

   CREATE TABLE driver (
     user_id INT PRIMARY KEY,
     license_number VARCHAR(50) NOT NULL,
     FOREIGN KEY (user_id) REFERENCES employee(user_id) ON DELETE CASCADE
   );

   CREATE TABLE assistant (
     user_id INT PRIMARY KEY,
     FOREIGN KEY (user_id) REFERENCES employee(user_id) ON DELETE CASCADE
   );

   CREATE TABLE truck (
     truck_id INT AUTO_INCREMENT PRIMARY KEY,
     plate_number VARCHAR(20) NOT NULL UNIQUE,
     capacity DECIMAL(10,2) NOT NULL
   );

   CREATE TABLE truck_schedule (
     truck_schedule_id INT AUTO_INCREMENT PRIMARY KEY,
     route_id INT NOT NULL,
     truck_id INT NOT NULL,
     driver_id INT NOT NULL,
     assistant_id INT NOT NULL,
     scheduled_date DATE NOT NULL,
     start_time TIME NOT NULL,
     end_time TIME NOT NULL,
     status VARCHAR(30) DEFAULT 'Scheduled',
     pickup_confirmed_at DATETIME NULL,
     FOREIGN KEY (route_id) REFERENCES route(route_id),
     FOREIGN KEY (truck_id) REFERENCES truck(truck_id),
     FOREIGN KEY (driver_id) REFERENCES driver(user_id),
     FOREIGN KEY (assistant_id) REFERENCES assistant(user_id)
   );

   CREATE TABLE truck_allocation (
     truck_allocation_id INT AUTO_INCREMENT PRIMARY KEY,
     truck_schedule_id INT NOT NULL,
     order_id INT NOT NULL,
     route_stop_id INT NOT NULL,
     delivery_status ENUM('Pending', 'Delivered', 'Failed', 'Attempted') NOT NULL DEFAULT 'Pending',
     delivered_at DATETIME NULL,
     delivery_note TEXT NULL,
     FOREIGN KEY (truck_schedule_id) REFERENCES truck_schedule(truck_schedule_id) ON DELETE CASCADE,
     FOREIGN KEY (order_id) REFERENCES `order`(order_id),
     FOREIGN KEY (route_stop_id) REFERENCES route_stop(route_stop_id)
   );

   CREATE TABLE roster_log (
     roster_log_id INT AUTO_INCREMENT PRIMARY KEY,
     truck_schedule_id INT NOT NULL UNIQUE,
     actual_start_time DATETIME NOT NULL,
     actual_end_time DATETIME NOT NULL,
     actual_hours_worked DECIMAL(5,2) GENERATED ALWAYS AS (
       TIMESTAMPDIFF(MINUTE, actual_start_time, actual_end_time) / 60.0
     ) STORED,
     FOREIGN KEY (truck_schedule_id) REFERENCES truck_schedule(truck_schedule_id)
   );

   CREATE TABLE system_parameter (
     param_name VARCHAR(50) PRIMARY KEY,
     param_value VARCHAR(50) NOT NULL
   );
   INSERT INTO system_parameter VALUES ('driver_min_rest_hours', '2');
   ```
   Note `truck_allocation.route_stop_id` — this needs Member B's `route_stop` table to exist first (pull `main` before running this if you haven't already). Note also `actual_hours_worked` is a **generated column** — MySQL calculates and stores it automatically from the two timestamp columns; you never write to it directly, and it recalculates itself if the timestamps ever change.
   Run it, refresh the schema panel to confirm.
3. In VS Code, create `db/04_roster_delivery_schema.sql` and paste the same SQL. Save.
4. Commit:
   ```
   git add .
   git commit -m "db: add driver, assistant, truck, truck_schedule, truck_allocation, roster_log, system_parameter tables"
   git push origin feature/roster-delivery
   ```

### D2. Build the Roster Scheduling API

This is the most rule-heavy part of the project. Build and test **one rule at a time**.

1. Create `server/src/routes/roster.js`. Start with this skeleton and add checks one at a time, re-testing after each:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   router.post('/', async (req, res) => {
     try {
       const { routeId, truckId, driverId, assistantId, scheduledDate, startTime, endTime } = req.body;

       // RULE 1 — REQ-SCHED-06: roster must be created at least 7 days ahead
       const today = new Date();
       const runDateObj = new Date(scheduledDate);
       const diffDays = (runDateObj - today) / (1000 * 60 * 60 * 24);
       if (diffDays < 7) {
         return res.status(400).json({ error: 'Roster must be created at least 7 days before the run date.' });
       }

       // RULE 2 — REQ-SCHED-01: no double-booking of truck/driver/assistant on overlapping times same day
       const [overlaps] = await db.query(
         `SELECT * FROM truck_schedule WHERE scheduled_date = ?
          AND (truck_id = ? OR driver_id = ? OR assistant_id = ?)
          AND (start_time < ? AND end_time > ?)`,
         [scheduledDate, truckId, driverId, assistantId, endTime, startTime]
       );
       if (overlaps.length > 0) {
         return res.status(400).json({ error: 'Truck, driver, or assistant already booked for an overlapping time.' });
       }

       // RULE 3 — REQ-SCHED-02: driver needs a configurable rest gap since their last run that day
       const [paramRows] = await db.query("SELECT param_value FROM system_parameter WHERE param_name = 'driver_min_rest_hours'");
       const minRestHours = parseFloat(paramRows[0].param_value);
       const [driverRunsToday] = await db.query(
         'SELECT * FROM truck_schedule WHERE driver_id = ? AND scheduled_date = ?',
         [driverId, scheduledDate]
       );
       for (const run of driverRunsToday) {
         const gapHours = Math.abs(new Date(`${scheduledDate}T${startTime}`) - new Date(`${scheduledDate}T${run.end_time}`)) / 3600000;
         if (gapHours < minRestHours) {
           return res.status(400).json({ error: `Driver needs at least ${minRestHours} hours rest between runs.` });
         }
       }

       // RULE 4 — REQ-SCHED-04: weekly hour caps (40 driver, 60 assistant). Summed directly
       // from truck_schedule's planned start_time/end_time for the week, NOT from
       // roster_log — roster_log only gets a row once a run is actually completed (see
       // D3's "Complete Run" step), so it wouldn't have anything to sum yet for a future
       // week being planned right now. MySQL's YEARWEEK(date, 3) groups dates into
       // Monday-starting ISO weeks, which is what we use to mean "the same week."
       const [driverHoursRows] = await db.query(
         `SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)) / 60, 0) AS total
          FROM truck_schedule
          WHERE driver_id = ? AND YEARWEEK(scheduled_date, 3) = YEARWEEK(?, 3)`,
         [driverId, scheduledDate]
       );
       if (driverHoursRows[0].total >= 40) {
         return res.status(400).json({ error: 'Driver has reached the 40-hour weekly limit.' });
       }

       const [assistantHoursRows] = await db.query(
         `SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)) / 60, 0) AS total
          FROM truck_schedule
          WHERE assistant_id = ? AND YEARWEEK(scheduled_date, 3) = YEARWEEK(?, 3)`,
         [assistantId, scheduledDate]
       );
       if (assistantHoursRows[0].total >= 60) {
         return res.status(400).json({ error: 'Assistant has reached the 60-hour weekly limit.' });
       }

       // All checks passed — create the schedule entry. Note there's no roster_log insert
       // here — that table only gets written once the run actually finishes (D3).
       const [result] = await db.query(
         `INSERT INTO truck_schedule (route_id, truck_id, driver_id, assistant_id, scheduled_date, start_time, end_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
         [routeId, truckId, driverId, assistantId, scheduledDate, startTime, endTime]
       );
       const truckScheduleId = result.insertId;

       res.status(201).json({ truckScheduleId });
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/roster', require('./routes/roster'));`
3. Add RULE for REQ-SCHED-03 (assistant max 2 consecutive routes) yourself, following the same pattern as Rule 3 above — count the assistant's consecutive same-day assignments.
4. Add the override endpoint `PUT /api/roster/:id/override` — accepts a `justification` field in the body, and inserts a row into `audit_log` (Member A's table) recording who overrode what and why.
5. Test each rule separately in Postman: try to create two overlapping assignments for the same driver and confirm you get a `400` error with a clear message; then try a valid one and confirm it succeeds with a new `truck_schedule_id`.
6. Commit after each rule works:
   ```
   git add .
   git commit -m "feat: add truck_schedule creation with overlap and weekly-hour validation"
   git push origin feature/roster-delivery
   ```

### D3. Build the Delivery Execution API
1. Create `server/src/routes/delivery.js`. Paste and extend:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // Driver/Assistant's run for today — REQ-DEL-01
   router.get('/schedule/:truckScheduleId/today', async (req, res) => {
     const [scheduleRows] = await db.query('SELECT * FROM truck_schedule WHERE truck_schedule_id = ?', [req.params.truckScheduleId]);
     const [allocations] = await db.query(
       `SELECT ta.*, rs.stop_name, rs.stop_order
        FROM truck_allocation ta
        JOIN route_stop rs ON ta.route_stop_id = rs.route_stop_id
        WHERE ta.truck_schedule_id = ? ORDER BY rs.stop_order`,
       [req.params.truckScheduleId]
     );
     res.json({ schedule: scheduleRows[0], stops: allocations });
   });

   // Confirm pickup from store — REQ-DEL-02. Pickup now lives directly on truck_schedule
   // (one pickup per run, not one per stop) rather than on the old delivery_stop table.
   router.put('/schedule/:truckScheduleId/pickup', async (req, res) => {
     await db.query(
       'UPDATE truck_schedule SET pickup_confirmed_at = NOW() WHERE truck_schedule_id = ?',
       [req.params.truckScheduleId]
     );
     res.json({ message: 'Pickup confirmed' });
   });

   // Record a delivery outcome for one truck_allocation (one order, at one route_stop) — REQ-DEL-03
   router.put('/allocations/:allocationId', async (req, res) => {
     const { deliveryStatus, deliveryNote } = req.body; // 'Delivered' | 'Failed' | 'Attempted'

     // Block if pickup hasn't been confirmed yet — REQ-DEL-02. Pickup is checked on the
     // parent truck_schedule now, so this needs a join instead of reading a local column.
     const [allocRows] = await db.query(
       `SELECT ta.*, ts.pickup_confirmed_at FROM truck_allocation ta
        JOIN truck_schedule ts ON ta.truck_schedule_id = ts.truck_schedule_id
        WHERE ta.truck_allocation_id = ?`,
       [req.params.allocationId]
     );
     if (allocRows.length === 0) return res.status(404).json({ error: 'Allocation not found' });
     if (!allocRows[0].pickup_confirmed_at) {
       return res.status(400).json({ error: 'Pickup must be confirmed before recording deliveries.' });
     }

     await db.query(
       'UPDATE truck_allocation SET delivery_status = ?, delivery_note = ?, delivered_at = NOW() WHERE truck_allocation_id = ?',
       [deliveryStatus, deliveryNote || null, req.params.allocationId]
     );

     // Update the customer-facing order_item status for every item in this order — REQ-DEL-05
     if (deliveryStatus === 'Delivered') {
       await db.query("UPDATE order_item SET status = 'Delivered' WHERE order_id = ?", [allocRows[0].order_id]);
       await db.query("UPDATE `order` SET status = 'Delivered' WHERE order_id = ?", [allocRows[0].order_id]);
     }

     // REQ-DEL-04: if Failed, re-queue onto the next available truck_schedule on the same route
     if (deliveryStatus === 'Failed') {
       const [currentSchedule] = await db.query('SELECT route_id, scheduled_date FROM truck_schedule WHERE truck_schedule_id = ?', [allocRows[0].truck_schedule_id]);
       const [nextSchedule] = await db.query(
         `SELECT truck_schedule_id FROM truck_schedule
          WHERE route_id = ? AND scheduled_date > ?
          ORDER BY scheduled_date ASC LIMIT 1`,
         [currentSchedule[0].route_id, currentSchedule[0].scheduled_date]
       );
       if (nextSchedule.length > 0) {
         await db.query(
           'INSERT INTO truck_allocation (truck_schedule_id, order_id, route_stop_id, delivery_status) VALUES (?, ?, ?, ?)',
           [nextSchedule[0].truck_schedule_id, allocRows[0].order_id, allocRows[0].route_stop_id, 'Pending']
         );
       }
     }

     res.json({ message: 'Delivery status updated' });
   });

   // Complete a run — this is what writes to roster_log. Only allowed once every
   // allocation on the run has been resolved (nothing still 'Pending'), and uses
   // truck_schedule's pickup_confirmed_at as the start time, so the logged hours reflect
   // when the truck actually left, not just when it was scheduled to.
   router.put('/schedule/:truckScheduleId/complete', async (req, res) => {
     const [pending] = await db.query(
       "SELECT COUNT(*) AS cnt FROM truck_allocation WHERE truck_schedule_id = ? AND delivery_status = 'Pending'",
       [req.params.truckScheduleId]
     );
     if (pending[0].cnt > 0) {
       return res.status(400).json({ error: 'All stops must be resolved (Delivered/Failed/Attempted) before completing the run.' });
     }

     const [scheduleRows] = await db.query('SELECT pickup_confirmed_at FROM truck_schedule WHERE truck_schedule_id = ?', [req.params.truckScheduleId]);
     if (!scheduleRows[0].pickup_confirmed_at) {
       return res.status(400).json({ error: 'Cannot complete a run that never confirmed pickup.' });
     }

     await db.query(
       'INSERT INTO roster_log (truck_schedule_id, actual_start_time, actual_end_time) VALUES (?, ?, NOW())',
       [req.params.truckScheduleId, scheduleRows[0].pickup_confirmed_at]
     );
     await db.query("UPDATE truck_schedule SET status = 'Completed' WHERE truck_schedule_id = ?", [req.params.truckScheduleId]);

     res.json({ message: 'Run completed and logged' });
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/delivery', require('./routes/delivery'));`
3. Test in Postman: confirm pickup, mark every allocation for that run Delivered/Failed/Attempted, then call the `/complete` endpoint and confirm a new `roster_log` row appears with a calculated `actual_hours_worked`. Try calling `/complete` while an allocation is still `Pending` and confirm it's rejected.
4. Commit: `git commit -m "feat: add delivery execution endpoints, auto re-queue on failure, and run-completion logging"`

### D4. Build the frontend screens
1. `client/src/pages/RosterBuilder.jsx` — a grid (routes as rows, days as columns) with "+ Assign" buttons that open a small form (truck/driver/assistant dropdowns), showing red highlighting for any cell that returned a conflict error from the API (Figure 8).
2. `client/src/pages/DriverToday.jsx` — mobile-first single card showing the day's run with a big "Confirm Pickup & Start Run" button (Figure 11), and once every stop is resolved, a "Complete Run" button that calls the new `/complete` endpoint. Use CSS like `maxWidth: '400px', margin: '0 auto'` to keep it phone-sized even on desktop for testing.
3. `client/src/pages/DriverStopDetail.jsx` — list of allocations with Delivered/Failed/Attempted buttons per stop (Figure 12).
4. Add routes for each in `App.jsx`. Commit after each screen.

### D5. Open your Pull Request
Push, open PR, review, merge.

---

## MEMBER E — Reporting, Notifications & Containerization Support

**Your features:** REQ-RPT-01 to REQ-RPT-07 (Section 4.6) and REQ-NOT-01 to REQ-NOT-05 (Section 4.8). You also assist Member A with Part 3.

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Pull the latest code:
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/reporting-notifications
   ```

### E1. Design your database tables
1. Open MySQL Workbench, connect, open a new query tab.
2. Run:
   ```sql
   USE kandypack;

   CREATE TABLE notification (
     notification_id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     type VARCHAR(50),
     message TEXT NOT NULL,
     is_read BOOLEAN DEFAULT FALSE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
   );
   ```
   Run it, confirm it appears.
3. In VS Code, create `db/05_notifications_schema.sql`, paste the SQL, save.
4. Commit:
   ```
   git add .
   git commit -m "db: add notification table"
   git push origin feature/reporting-notifications
   ```

### E2. Build the Notification API (start this early, in parallel with your teammates)
1. Create `server/src/routes/notifications.js`. Paste:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // Create a notification — other route files will import and call this function directly
   async function createNotification(userId, type, message) {
     await db.query(
       'INSERT INTO notification (user_id, type, message) VALUES (?, ?, ?)',
       [userId, type, message]
     );
     console.log(`[Notification] To user ${userId}: ${message}`); // mock SMS/email for now
   }

   // List a user's notifications
   router.get('/:userId', async (req, res) => {
     const [rows] = await db.query(
       'SELECT * FROM notification WHERE user_id = ? ORDER BY created_at DESC',
       [req.params.userId]
     );
     res.json(rows);
   });

   // Acknowledge / mark read
   router.put('/:id/acknowledge', async (req, res) => {
     await db.query('UPDATE notification SET is_read = TRUE WHERE notification_id = ?', [req.params.id]);
     res.json({ message: 'Acknowledged' });
   });

   module.exports = { router, createNotification };
   ```
   Save.
2. Register it in `server/src/index.js`:
   ```javascript
   const { router: notificationRoutes } = require('./routes/notifications');
   app.use('/api/notifications', notificationRoutes);
   ```
3. Test in Postman: since there's no way to trigger a notification yet on its own, manually insert a test row via MySQL Workbench (`INSERT INTO notification (user_id, type, message) VALUES (1, 'test', 'Hello');`), then call `GET /api/notifications/1` and confirm it comes back.
4. Commit:
   ```
   git add .
   git commit -m "feat: add notification create/list/acknowledge endpoints"
   git push origin feature/reporting-notifications
   ```
5. Let Member C and Member D know they can `require('./notifications').createNotification` in their own route files to trigger alerts — e.g. Member C calls it when a shipment is discrepant (REQ-NOT-01), Member D calls it when a driver approaches their weekly-hour limit (REQ-NOT-02, checking the same `truck_schedule` weekly sum D2's Rule 4 uses, since `roster_log` only has hours for runs that already happened, not upcoming ones).

### E3. Build the Reporting API
**Do this once Members B, C, and D have merged their tables into `main`** (Phase 3), since your reports query across all of them. Pull the latest first:
```
git checkout main
git pull origin main
git checkout feature/reporting-notifications
git merge main
```
1. Create `server/src/routes/reports.js`. Start with one report, test it, then copy the pattern for the rest:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const { requireAuth } = require('../middleware/auth');
   const router = express.Router();

   // Quarterly sales report — REQ-RPT-01
   router.get('/sales', requireAuth, async (req, res) => {
     const { quarterStart, quarterEnd } = req.query;
     const [rows] = await db.query(
       `SELECT SUM(total_value) AS totalValue, SUM(total_volume) AS totalVolume, COUNT(*) AS orderCount
        FROM \`order\` WHERE order_date BETWEEN ? AND ?`,
       [quarterStart, quarterEnd]
     );
     res.json(rows[0]);
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/reports', require('./routes/reports'));`
3. Add the remaining six reports yourself, following the same pattern — each is one SQL query with `GROUP BY`/`JOIN` as needed:
   - `GET /top-products` — join `order_item` + `product`, `GROUP BY product_id`, `ORDER BY SUM(quantity) DESC`
   - `GET /city-breakdown` — join `order` + `route`, `GROUP BY` city (via `route.store_id → store.city_id`)
   - `GET /staff-hours` — two figures worth showing side by side: **planned** hours (sum `TIMESTAMPDIFF(MINUTE, start_time, end_time)` from `truck_schedule`, grouped by driver/assistant and week — the same calculation D2's Rule 4 uses) vs. **actual** hours (join `truck_schedule` to `roster_log` and sum `actual_hours_worked` for completed runs). Flag rows where planned hours exceed 40 (driver) or 60 (assistant).
   - `GET /truck-utilization` — join `truck_schedule` + `truck`, `GROUP BY truck_id`
   - `GET /customer/:id` — all orders for one customer with their `order_item.status` history
4. For CSV export, add this small helper at the top of `reports.js` and call it from any report route when `req.query.format === 'csv'`:
   ```javascript
   function toCsv(rows) {
     if (rows.length === 0) return '';
     const headers = Object.keys(rows[0]);
     const csvRows = rows.map(row => headers.map(h => row[h]).join(','));
     return [headers.join(','), ...csvRows].join('\n');
   }
   ```
5. Commit after each report:
   ```
   git add .
   git commit -m "feat: add quarterly sales report endpoint"
   git push origin feature/reporting-notifications
   ```

### E4. Build the frontend screens
1. In `client`, install a charting library:
   ```
   cd client
   npm install recharts
   ```
2. Create `client/src/pages/Reports.jsx` — tabs for each report (Figure 5), date-range/city/route filter inputs, an "Export CSV" button (link to the endpoint with `?format=csv`), and a `recharts` `<LineChart>` or `<BarChart>` for the sales trend.
3. Create `client/src/components/NotificationBell.jsx` — a small dropdown showing unread notifications, used inside Admin/Dispatcher/Store Manager dashboard pages.
4. Commit after each screen:
   ```
   git add .
   git commit -m "feat: add report overview dashboard with charts"
   ```

### E5. Open your Pull Request
Push, open PR, review, merge.

### E6. Then — assist with Containerization & Deployment
Move to **Part 3** below and work alongside Member A.

---

# PART 3 — CONTAINERIZATION & DEPLOYMENT
### (Members A and E lead this together, once Phase 3 — full integration — is complete and stable on `main`)

## Section 5: Containerization Steps

Both A and E should start by making sure their own local copy is fully up to date:
```
git checkout main
git pull origin main
git checkout -b feature/docker-deploy
```

### Step 1: Write the backend Dockerfile
1. In VS Code, right-click the `server` folder → **New File** → name it exactly `Dockerfile` (no file extension).
2. Paste:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 5000
   CMD ["node", "src/index.js"]
   ```
   Save.
3. Commit: `git commit -m "chore: add backend Dockerfile"`

### Step 2: Write the frontend Dockerfile
1. Right-click the `client` folder → New File → `Dockerfile`.
2. Paste:
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
   (If your team used Create React App instead of Vite, change `/app/dist` to `/app/build`.) Save.
3. Commit: `git commit -m "chore: add frontend Dockerfile"`

### Step 3: Combine all schema files into one init script
1. Open each file in `db/` in this order — this order matters, since later files reference earlier ones with foreign keys:
   - `01_users_schema.sql` (role, user, employee, city, audit_log)
   - `02_orders_schema.sql` (product, route, route_stop, customer, order, order_item)
   - `03_rail_store_schema.sql` (train, train_trip, store, cargo_allocation, store_inventory)
   - `04_roster_delivery_schema.sql` (driver, assistant, truck, truck_schedule, truck_allocation, roster_log, system_parameter)
   - `05_notifications_schema.sql` (notification)
   - `06_inventory_schema.sql` (main_inventory)
2. Create a new file `db/init.sql` and paste them all in, in the order above (minus repeated `CREATE DATABASE`/`USE` lines — keep just one pair at the very top):
   ```sql
   CREATE DATABASE IF NOT EXISTS kandypack;
   USE kandypack;

   -- (paste 01_users_schema.sql content here)
   -- (paste 02_orders_schema.sql content here)
   -- (paste 03_rail_store_schema.sql content here)
   -- (paste 04_roster_delivery_schema.sql content here)
   -- (paste 05_notifications_schema.sql content here)
   -- (paste 06_inventory_schema.sql content here)
   ```
3. Add seed/test data at the bottom of `init.sql` — the SRS requires at least 40 orders, 10 routes, and a valid train schedule. Insert enough sample rows into `city`, `route`, `product`, `main_inventory`, `store`, `train`/`train_trip`, `user`/`customer`, and `order`/`order_item` to reach these minimums. This can be tedious by hand — write simple `INSERT` statements, or a small one-off Node script that generates and prints INSERT statements for you.
4. Save. Commit:
   ```
   git add .
   git commit -m "db: combine schema and seed data into init.sql"
   ```

### Step 4: Write docker-compose.yml
1. Open the `docker-compose.yml` file at the project root (created back in Section 1, Step 3).
2. Paste:
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
   Save.
3. Open the `.env` file at the project root (create it if it doesn't already exist there — right-click project root in Explorer → New File → `.env`). Paste real values:
   ```
   DB_ROOT_PASSWORD=your_mysql_root_password
   JWT_SECRET=some_long_random_secret_text
   ```
   Save. Confirm `.env` is listed in your root `.gitignore` file so it's never committed.
4. Update `.env.example` at the project root with placeholder values (this one **is** committed).
5. Commit:
   ```
   git add .
   git commit -m "chore: add docker-compose.yml for local multi-container setup"
   ```

### Step 5: Test it
1. Make sure **Docker Desktop** is open and running (check for its icon in your system tray/menu bar — it should say "Docker Desktop is running").
2. In the VS Code terminal, from the project root:
   ```
   docker compose up --build
   ```
3. Wait for all three services to start (you'll see logs from `db`, `server`, and `client` interleaved in the terminal).
4. Open your browser to `http://localhost:3000` — the whole app should load, backed by the containerized backend and database.
5. If the backend can't connect to the database, double check `DB_HOST: db` is set (not `localhost`) — inside Docker, services reach each other by their service name, not `localhost`.
6. To stop everything, go back to the terminal and press `Ctrl+C`, then run `docker compose down`.
7. Commit once it works:
   ```
   git add .
   git commit -m "chore: verified full stack runs via docker compose"
   git push origin feature/docker-deploy
   ```
8. Open a Pull Request, get it reviewed, merge into `main`.

---

## Section 6: Deployment Steps (Free Tier)

### Recommended free-tier combination (verify current availability before committing, as free tiers change):
- **Database:** a free managed MySQL instance (check current options at time of deployment — e.g. Aiven, Railway's MySQL add-on, or similar).
- **Backend:** Render (free Web Service tier).
- **Frontend:** Render Static Site, or Vercel/Netlify.

### Step 1: Deploy the database
1. Sign up for your chosen free MySQL provider.
2. Create a new MySQL instance/database from their dashboard.
3. Find their "connect" or "SQL console" option and run the contents of your `db/init.sql` against it (either paste it into their web SQL console, or connect MySQL Workbench to their remote host using the connection details they give you, then run the file there).
4. Write down the host, port, username, password, and database name they give you — you'll need these next.

### Step 2: Deploy the backend
1. Push your final code to GitHub `main`.
2. Go to https://render.com, sign up/log in (you can sign up with your GitHub account directly).
3. Click **New → Web Service**.
4. Connect your GitHub account if prompted, then select your `kandypack-scms` repository.
5. Under "Root Directory," type `server`.
6. Set **Build Command** to `npm install`.
7. Set **Start Command** to `node src/index.js`.
8. Scroll to **Environment Variables**, and add: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` — using the values from Step 1 (and a JWT secret of your choosing).
9. Click **Create Web Service**. Wait for the build/deploy to finish (watch the logs).
10. Once live, Render gives you a public URL like `https://kandypack-api.onrender.com`. Test it by visiting that URL in your browser — you should see "Kandypack API is running."

### Step 3: Deploy the frontend
1. In VS Code, open `client/src` and find where your axios calls use `http://localhost:5000`. Replace these with an environment variable instead. Create `client/.env` with:
   ```
   VITE_API_URL=https://kandypack-api.onrender.com
   ```
   Then in your code, use `import.meta.env.VITE_API_URL` instead of hardcoding `http://localhost:5000` in each axios call.
2. Save, commit: `git commit -m "chore: use deployed API URL in production build"`, push, and merge into `main` via PR as usual.
3. Go back to Render (or use Vercel/Netlify if you prefer): **New → Static Site**.
4. Select your repo, set "Root Directory" to `client`.
5. Set **Build Command** to `npm run build`.
6. Set **Publish Directory** to `dist` (or `build` if using Create React App).
7. Click **Create Static Site**. Wait for deployment, then open the public URL it gives you.

### Step 4: Final checks
1. Open the live frontend URL in your browser.
2. Register a new customer account, log in, place a real order.
3. Walk through as many role workflows as you can using test accounts (you can create Admin/Dispatcher/etc. accounts by inserting rows directly via your database provider's SQL console, since only Admins can normally create them).
4. Confirm frontend → backend → database all communicate correctly in the live, deployed environment.
5. Commit: `git commit -m "docs: add deployment URLs to README"` after updating your `README.md` with the live links.

---

## Section 7: Final Checklist Before Submission

- [ ] All 5 members' features merged into `main`
- [ ] `docker compose up` runs the full app locally with no errors
- [ ] Database seeded with 40+ orders, 10+ routes, valid train schedule (SRS Section 6)
- [ ] Each REQ-xxx-xx requirement in the SRS has been tested at least once
- [ ] App is deployed and publicly reachable
- [ ] README updated with setup instructions and live URL
- [ ] Each member has a reasonably even number of commits (check via GitHub's **Insights → Contributors** tab)
- [ ] Part 4 (ER diagram and SRS changes) has been added as an appendix to your final submitted SRS document

---

# PART 4 — CHANGES MADE TO THE ER DIAGRAM AND SRS

This section documents every change the team made to the original ER diagram (`Group_18_ER_final.pdf`) and the original SRS v1.0, and why. **Add a version of this section to your final SRS document as an appendix** (e.g. "Appendix E: Schema Revisions") so your evaluators can see these were deliberate, reasoned decisions rather than inconsistencies or mistakes.

## 4.1 Typo fix

| Change | Reason |
|---|---|
| Table `order_id` renamed to `` `order` `` | The table was accidentally named after its own primary key column. All other tables correctly reference a table called `order`; this was a copy-paste slip, not a design choice. |

## 4.2 Deliberate deviations from the original ER diagram (kept as improvements)

| Change | Original diagram had | Team decided | Reason |
|---|---|---|---|
| `role` as a separate table | `user.role` as a plain `string` column | `role` table (`role_id`, `role_name`) with `user.role_id` as a foreign key | Prevents typos/inconsistent role names (e.g. `"customer"` vs `"Customer"`) breaking permission checks; cheaper integer comparisons in code; easier to extend with role metadata later. |

## 4.3 Additions the ER diagram was missing (required for the SRS to actually work)

| Addition | Why it was needed |
|---|---|
| `city` table | Referenced by `customer.city_id`, `store.city_id`, and `train_trip.destination_city_id` in the diagram, but the `city` table itself was never drawn. Without it, none of those foreign keys could exist. |
| `delivery_stop` table | Nothing in the original diagram represented a driver/assistant's assigned stop list, pickup confirmation, or per-stop delivery outcome (Delivered/Failed/Attempted) — all required by REQ-DEL-01 through REQ-DEL-05. This table was added, linked to `truck_schedule` and `order`. |
| `discrepancy_flag`, `received_quantity`, `discrepancy_note` columns on `cargo_allocation` | REQ-STORE-02 requires the system to detect and flag when received quantity is less than the manifest quantity. The original `cargo_allocation` only had `allocated_quantity`, with no way to record what was actually received or flag a mismatch. |

## 4.4 Structural clarifications (same intent as the diagram, restructured for practicality)

| Change | Reason |
|---|---|
| `cargo_allocation.order_item_id` (references `order_item`) instead of an order-level reference | Cargo needs to be allocated **per line item**, not per whole order, because REQ-RAIL-03 requires splitting a single order across multiple train trips when one trip lacks capacity — different items in the same order may need to travel on different trips. |
| `store_inventory` redefined as an **append-only stock-receipt ledger** (`store_id`, `product_id`, `cargo_allocation_id` UNIQUE, `quantity_on_hand`) — one row per shipment received, not one row per product that gets incremented | Keeps "how much stock does this store currently have" separate from "was this specific shipment discrepant" (which now lives on `cargo_allocation`). A store's current stock is computed with `SUM(quantity_on_hand) GROUP BY product_id` rather than stored as a single mutable number — see 4.7 below for why this changed from an earlier draft. |
| `employee` base table (name only) + `driver`/`assistant` referencing it | Avoids duplicating the same person's name across two nearly identical tables; both roles share the same underlying person record. Deliberately holds **no hours column** — see 4.7. |
| `roster_log` table for weekly hours (instead of a running-counter column on `employee`) | A running counter has to be manually reset every week, offers no history, and risks disagreeing with any other place hours might get tracked. `roster_log` stores one row per assignment per week, so weekly totals are computed with `SUM(...) WHERE week_start_date = ...`, and REQ-RPT-04 (reporting on staff hours) has a single, auditable data source. |
| `roster` renamed to `truck_schedule`; `run_date` renamed to `scheduled_date` | Naming consistency with the team's final agreed diagram. |
| `order_item.status` clarified as **customer-facing, system-derived** status (Pending / Out for Delivery / Delivered), distinct from `cargo_allocation.status` (Dispatcher's internal loading progress) and `delivery_stop.outcome` (Driver's internal per-stop result) | Three different audiences needed three different views of "what's happening to this item," at three different points in its journey. `order_item.status` is what the customer and Store Manager see; the other two are internal working states. This directly satisfies REQ-DEL-05. This field should never be edited by hand — the rail-allocation code and delivery-execution code update it automatically as the real underlying events happen. |

## 4.5 Scope addition beyond the original SRS (requires SRS amendment)

| Addition | SRS conflict | Team's reasoning |
|---|---|---|
| `main_inventory` table (HQ-level stock tracking) with stock-check-and-reserve on order placement, and an Admin restock endpoint | SRS Section 1.4.2 explicitly lists "warehouse/inventory management beyond store-level receipt reconciliation" as **out of scope for Version 1.0** | The team decided this was necessary so the system can reject an order it cannot actually fulfil, and so an Admin can record newly manufactured stock. This is a genuine scope expansion beyond what the SRS originally promised. |

**Action needed:** add a short amendment to SRS Section 1.4.2 (or a new subsection) stating something like:

> *"Team Decision (post-v1.0 planning): basic HQ-level inventory tracking has been added beyond the original Version 1.0 scope, to support stock-eligibility checks at order placement and stock replenishment by the Administrator. This is a deliberate, minimal exception to the general warehouse/inventory exclusion stated above, and does not include full warehouse management (e.g. stock locations, batch/lot tracking, or supplier management), which remain out of scope."*

Also consider adding two new functional requirements to Section 4.1 or a new Section 4.9 to formally document this feature, e.g.:

- **REQ-INV-01**: The system shall reject an order at placement if the requested quantity of any product exceeds the currently available stock in `main_inventory`.
- **REQ-INV-02**: The system shall allow the Administrator to increase a product's stock level to reflect newly manufactured quantities.
- **REQ-INV-03**: The system shall return reserved stock to `main_inventory` when an order is cancelled while in "Placed" status.

## 4.7 Conflicts found and fixed during implementation review

After the schema above was first drafted across Parts 2's member sections, a full pass was done tracing every table against the actual API code that reads and writes it. This caught several bugs that wouldn't have been obvious from the ER diagram alone — they only show up once you follow a full user action (e.g. "a customer registers") through every table it touches. All are already fixed in Part 2 above; this table exists so the team understands what changed and why, in case anyone already built against an earlier draft.

| # | Problem found | Where | Fix applied |
|---|---|---|---|
| 1 | Customer registration only inserted into `user`, never into `customer`. Every order-placement call needs a matching `customer` row, so registered accounts couldn't actually place orders. | Member A, `POST /api/auth/register` | Registration now inserts into `user` and `customer` together in one transaction, using the same `user_id` for both. The registration form must now also collect phone, address, and city (as Figure 2 in the SRS already shows). |
| 2 | `store_inventory`'s stock update used `INSERT ... ON DUPLICATE KEY UPDATE`, but the table had no `UNIQUE` constraint besides its own auto-increment ID — which is always unique on every insert. The "duplicate" case could never actually trigger, so every shipment received would silently insert a brand-new row instead of increasing existing stock, and a store's "current stock" query would have been wrong. | Member C, `store_inventory` schema + `POST /:storeId/receive` | Redesigned `store_inventory` as an **append-only receipt ledger**: `cargo_allocation_id` is now `NOT NULL UNIQUE` (one row per shipment, duplicates blocked), the code does a plain `INSERT` (no more `ON DUPLICATE KEY`), and "current stock" is now a `SUM(...) GROUP BY product_id` query instead of a single mutable number. |
| 3 | Nothing anywhere in the project ever created a `delivery_stop` row. Member D's whole delivery-execution API assumed stops already existed, but no endpoint — in Member C's or Member D's code — actually put one there. The SRS's "Daily Dispatch" screen (Store Manager assigns received orders onto a truck run) was described in Section 3.1.4 but never actually built. | Member C, `store.js` | Added `POST /:storeId/dispatch` (creates a `delivery_stop`, linking a `truck_schedule` to an `order`) and `GET /:storeId/dispatch/today` (lists today's runs and what's assigned to each), plus a matching `StoreDailyDispatch.jsx` frontend screen. |
| 4 | `order.status` never advanced past `'Placed'` on its own — nothing set it to `'Scheduled'` or `'In Transit'`, even though REQ-ORD-05 requires the full Placed → Scheduled → In Transit → Delivered → Closed lifecycle. | Member C, rail allocation and loading-status endpoints | Allocating an item to a trip now advances its order to `'Scheduled'`; marking a trip fully `'Loaded'` now advances every order on that trip to `'In Transit'`. Both only ever move status forward, never backward. |
| 5 | `employee.weekly_hours_used` was left in the schema as a column, even though `roster_log` was separately designed to be the real source of truth for hours worked. Two places claiming to track the same fact will eventually disagree — whichever one nobody remembers to update becomes silently wrong. | Member D, `employee` table | Removed the column entirely. `employee` now holds only `user_id` and `name`; all hour totals are computed by summing `roster_log`, with nowhere else for a stray number to drift out of sync. |
| 6 | When an Admin creates a Driver or Assistant account, nothing created the matching `employee`/`driver`/`assistant` rows those roles need — meaning the person could log in, but could never actually be assigned to a `truck_schedule`, since the foreign keys would have nothing to point to. | Member A, `POST /api/users` | Account creation now inserts into `employee` (and `driver` or `assistant`, depending on the chosen role) in the same transaction as the `user` row, whenever an Admin creates a Driver or Assistant account. |
| 7 | `order.route_id` was `NOT NULL`, but REQ-ORD-03 requires the system to accept an order whose delivery address matches no known route, flagging it `'Unroutable'` for manual review instead of rejecting it. As written, that state was impossible to save. The order-placement endpoint also never actually matched a route at all — it just trusted whatever `routeId` the client sent, with no real matching logic behind it. | Member B, `order` schema + `POST /api/orders` | *(Superseded by the team's tested schema — see 4.9 below, item 7'. `route_id` ended up staying `NOT NULL` by team decision, with a different trade-off against REQ-ORD-03 than the fix originally applied here.)* |

**A general note for the team, not tied to a specific bug:** MySQL `DECIMAL` columns (`unit_price`, `total_value`, hours, capacities, etc.) come back from `mysql2` as JavaScript **strings**, not numbers, by default. The code throughout this guide happens to work correctly because it only ever multiplies, subtracts, or compares those values against a number (all of which force JavaScript to convert the string automatically) — but if anyone later writes something like `total += someDecimalValue` where `total` starts as a string, or uses `+` to combine two DECIMAL values directly, it will silently concatenate text instead of adding numbers (e.g. `"12.50" + "7.50"` becomes `"12.507.50"`, not `20`). Safest habit: wrap any DECIMAL value in `parseFloat(...)` the moment you read it out of a query result, before doing arithmetic on it.

## 4.9 Changes to match the team's tested schema

The team ran and tested an actual version of the schema, which differed from everything earlier in this document in several real ways — not just naming. This guide has been rewritten to match that tested schema, with two categories of change: table/column **restructuring** that matches the tested files exactly (4.9.1), and a small number of columns the guide adds **on top of** the tested files because specific SRS requirements can't be implemented without them (4.9.2) — these are not yet in your actual database and need to be added.

### 4.9.1 Restructuring that matches the tested schema exactly

| # | What changed | Reason / impact |
|---|---|---|
| 1 | `employee` moved from Member D's tables to Member A's, and lost its `name` column (now just `user_id`) | `user.name` already holds the name — no reason to store it twice. Since `driver`/`assistant` (Member D) both reference `employee`, and `employee` references `user` (Member A), it made more sense to build it alongside the other identity tables in `01_users_schema.sql` rather than in Member D's file. |
| 2 | New `route_stop` table (Member B) — a route is now a sequence of individual named stops, not one vague `coverage_area` description | Lets an order point at one specific stop, not just "somewhere on this route" — which is what makes REQ-DEL-01's "ordered stop list" for a driver's run actually meaningful. `route.coverage_area` was removed since `route_stop` replaces what it was trying to describe. |
| 3 | `order` gained `route_stop_id` (which stop it delivers to) and `delivery_address` (free-text address stored on the order itself, not reused from `customer.address`) | A customer can ship to somewhere other than their own saved address, and needs to pick a specific stop, not just a route. |
| 4 | `order.route_id`/`route_stop_id` are `NOT NULL` — **not** nullable as an earlier revision of this guide had them | The team's tested schema requires every order to resolve to a real stop at placement time. This is a **direct trade-off against REQ-ORD-03's literal wording** ("if no route covers the address, the order shall be flagged 'Unroutable' ... rather than silently rejected") — under this schema, an order with no valid stop selection is rejected with a `400` error instead of being saved as `Unroutable`. This isn't necessarily wrong (rejecting immediately is simpler and arguably more honest to the customer than silently accepting an order nobody can currently deliver), but it is a deviation from the SRS as written. **Recommend the team either formally amends REQ-ORD-03 to describe this rejection behavior, or revisits making these columns nullable if the literal "accept and flag" behavior is required for grading.** |
| 5 | `delivery_stop` renamed to `truck_allocation`, gained `route_stop_id` (replacing the old free-standing `stop_sequence` number), and its outcome column renamed from `outcome` to `delivery_status` | Ties each delivery directly to a real stop on the route instead of an arbitrary sequence number. |
| 6 | `pickup_confirmed_at` moved from the delivery-stop table onto `truck_schedule` itself | One pickup event covers the whole run, not one per delivery — storing it once on the schedule avoids the same timestamp being redundantly repeated (and potentially disagreeing with itself) across every allocation on that run. |
| 7 | `roster_log` redesigned entirely: now records **actual** worked hours (`actual_start_time`, `actual_end_time`, and a `GENERATED`/computed `actual_hours_worked`), one row per completed `truck_schedule`, instead of **planned** hours written at roster-creation time | This is a real shift in what the table means — from "hours we intend to schedule" to "hours that actually happened." It has two consequences, both handled in this guide: (a) the weekly 40/60-hour cap check (REQ-SCHED-04, D2 Rule 4) now sums `truck_schedule`'s planned `start_time`/`end_time` directly instead of `roster_log`, since `roster_log` has nothing to sum for a future week that hasn't run yet; (b) a new "Complete Run" endpoint (D3) was added, since nothing previously existed to actually write a `roster_log` row — it fires once every stop on a run is resolved, logging the pickup time as the start and the completion moment as the end. |

### 4.9.2 Additions beyond the tested schema (not yet in your database — need to be added)

These four columns exist in the guide's code but **do not exist** in the team's originally tested SQL files. Unlike everything in 4.9.1, these aren't restructuring choices — the corresponding SRS requirement genuinely cannot be met without them. If your team already built a database from the original tested files, you need to actually run the `ALTER TABLE` statements referenced below against it; they won't appear just because this guide describes them.

| # | Column added | Missing from | SRS requirement that needs it | Migration |
|---|---|---|---|---|
| 8 | `train_trip.arrival_datetime` | `03_rail_store_schema.sql` | REQ-RAIL-01 requires the Admin to define both a departure **and** arrival time for a trip; the tested table only had departure. | See the `ALTER TABLE train_trip ADD COLUMN arrival_datetime ...` statement in C1, step 3. |
| 9 | `cargo_allocation.status` | `03_rail_store_schema.sql` | REQ-RAIL-06 requires the Dispatcher to record Not Loaded / Partially Loaded / Loaded per allocation; the tested table had no column to store this at all. | See the `ALTER TABLE cargo_allocation ADD COLUMN status ...` statement in C1, step 3. |
| 10 | `cargo_allocation.received_quantity` | `03_rail_store_schema.sql` | REQ-STORE-02 requires comparing received quantity against the manifest to detect a discrepancy; the tested table had `discrepancy_flag` but nothing to compare it against. | See the `ALTER TABLE cargo_allocation ADD COLUMN received_quantity ...` statement in C1, step 3. |
| 11 | `truck_allocation.delivery_status` includes `'Attempted'` | `04_roster_delivery_schema.sql` (ENUM only had `'Pending'`, `'Delivered'`, `'Failed'`) | REQ-DEL-03 explicitly requires all three outcomes — Delivered, Failed, **and** Attempted — to be recordable. | See the `ALTER TABLE truck_allocation MODIFY COLUMN delivery_status ...` statement in D1. |

## 4.10 Summary table for your ERD redraw

If you're updating the ER diagram file itself (not just this guide), here is the complete list of tables to draw, grouped by owner:

| Owner | Tables |
|---|---|
| Member A | `role`, `user`, `employee`, `city`, `audit_log`, `main_inventory` |
| Member B | `product`, `route`, `route_stop`, `customer`, `order`, `order_item` |
| Member C | `train`, `train_trip`, `store`, `cargo_allocation`, `store_inventory` |
| Member D | `driver`, `assistant`, `truck`, `truck_schedule`, `truck_allocation`, `roster_log`, `system_parameter` |
| Member E | `notification` |

This matches exactly what's built in Part 2 of this guide — if your final ERD diagram matches this table list and the field definitions in each member's Section "1" (A1, B1, C1, D1, E1), your diagram and your actual database are in sync.
