# Kandypack Project — Complete Team Guide
### React + Node/Express + MySQL, Dockerized, Deployed Free
### Team of 5 — Full Step-by-Step Instructions (Absolute Beginner Friendly)

---

## HOW TO USE THIS DOCUMENT

1. **Everyone reads Part 1 first** (Sections 0–4). This is shared setup that applies to the whole team, and it explains basics like "how to open a terminal" that every member's individual steps rely on.
2. **Then each person reads only their own section in Part 2** — but skim the others so you understand how your work connects.
3. Every step below assumes you are starting from **zero knowledge** of the tool being used. Follow the clicks and commands exactly, in order. Don't skip the "commit" instructions — they are real steps, not extra credit.
4. Anywhere you see a code block like this:
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
   ├─ Agree on the final ER diagram (refine Appendix B of the SRS)
   ├─ Agree on the REST API contract (endpoint names, request/response shapes)
   └─ Agree on the page list / navigation for each role's UI

PHASE 2 — Core Build                         [PARALLEL — the bulk of the project]
   ├─ Member A: Auth + User Management (DB + API + UI) + repo/Docker admin
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
| **A** | 4.7 User Management & Auth + repo/Docker/deploy admin | `feature/auth` | `user`, `role`, `audit_log` |
| **B** | 4.1 Customer Order Placement | `feature/order-placement` | `customer`, `order`, `order_item`, `product`, `route` |
| **C** | 4.2 Rail Scheduling + 4.3 Store Receipt | `feature/rail-store` | `train_trip`, `cargo_allocation`, `store`, `store_inventory` |
| **D** | 4.4 Roster Scheduling + 4.5 Delivery Execution | `feature/roster-delivery` | `truck`, `driver`, `assistant`, `roster`, `run`, `delivery_stop` |
| **E** | 4.6 Reporting + 4.8 Notifications + Containerization support | `feature/reporting-notifications` | `notification` |

**Important dependency:** Member B's tables (`product`, `customer`, `route`) are referenced by everyone else. Member B should complete and push Step B1 **first, on Day 2–3**, and tell the team in your group chat once it's on GitHub.

---

# PART 2 — INDIVIDUAL MEMBER GUIDES

Each guide below assumes you have already completed **Part 1** (tools installed, repo cloned, folder open in VS Code).

---

## MEMBER A — Auth, User Management, Repo & DevOps Lead

**Your features:** REQ-USR-01 to REQ-USR-05 (SRS Section 4.7). You also lead containerization/deployment later (Part 3).

### Before you start
1. Open VS Code, open the `kandypack-scms` folder (**File → Open Folder**, if not already open).
2. Open a terminal (`` Ctrl+` ``).
3. Create your branch:
   ```
   git checkout -b feature/auth
   ```

### A1. Design your database tables

1. Open **MySQL Workbench** (a separate application from VS Code — find it in your Start Menu/Applications folder and open it).
2. Click on your local connection (usually named "Local instance MySQL80" or similar) and enter your root password from Section 0.3 when prompted.
3. Once connected, you'll see a large text area (a "SQL tab" or "query tab"). Click the icon that looks like a blank page with a "+" (or go to **File → New Query Tab**) if one isn't already open.
4. Type this SQL to create your database:
   ```sql
   CREATE DATABASE IF NOT EXISTS kandypack;
   USE kandypack;
   ```
5. Run it: click the yellow lightning-bolt icon (Execute), or press `Ctrl+Enter`.
6. Now type your table definitions in the same query tab:
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
7. Select all of that text and run it (`Ctrl+Enter` or the lightning-bolt icon).
8. Check it worked: in the left "Navigator" panel, right-click "Schemas" → **Refresh All**, then expand `kandypack → Tables` — you should see `role`, `user`, `audit_log` listed.

9. Now save this SQL as a file in your project. Go back to **VS Code**. In the Explorer sidebar on the left, right-click the `db` folder → **New File** → name it `01_users_schema.sql`. Paste in the same SQL from step 6 above (plus the `CREATE DATABASE`/`USE` lines from step 4). Save (`Ctrl+S`).

10. Commit your work. In the VS Code terminal:
    ```
    git add .
    git commit -m "db: add user, role, audit_log tables"
    git push origin feature/auth
    ```
    (The first push may ask you to run an extra `--set-upstream` command — copy and run whatever it shows you.)

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
   router.post('/register', async (req, res) => {
     try {
       const { name, email, password } = req.body;
       const password_hash = await bcrypt.hash(password, 10);
       // role_id 6 = Customer, based on the INSERT order in A1
       const [result] = await db.query(
         'INSERT INTO user (name, email, password_hash, role_id) VALUES (?, ?, ?, 6)',
         [name, email, password_hash]
       );
       res.status(201).json({ message: 'Registered successfully', userId: result.insertId });
     } catch (err) {
       res.status(400).json({ error: err.message });
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
       "password": "password123"
     }
     ```
   - Click **Send**. You should get back a `201` status and a JSON response with a `userId`.
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

   module.exports = router;
   ```
3. Register it in `server/src/index.js`, adding near your other route:
   ```javascript
   const userRoutes = require('./routes/users');
   app.use('/api/users', userRoutes);
   ```
4. Add the remaining endpoints (`POST /`, `PUT /:id`, `PUT /:id/deactivate`) yourself, following the same style as the `GET /` example — each one should also insert a row into `audit_log` recording what happened.
5. Test each endpoint in Postman (remember to add an **Authorization** header: in Postman, go to the **Authorization** tab of your request, type select **Bearer Token**, and paste the token you got from logging in).
6. Commit:
   ```
   git add .
   git commit -m "feat: add admin user management endpoints"
   git push origin feature/auth
   ```

### A5. Build the React frontend for Auth

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
7. Create `client/src/pages/Register.jsx` following the same pattern, but posting to `/api/auth/register` with `name`, `email`, `password` fields (matching Figure 2 in the SRS).
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

### A6. Build the Admin User Management screen
1. Create `client/src/pages/AdminUsers.jsx`. Build a table that fetches from `GET /api/users` (using `axios`, sending the saved token from `localStorage` as an `Authorization: Bearer <token>` header) and displays Name, Email, Role, Status columns with Edit/Deactivate buttons.
2. Add a route for it in `App.jsx`: `<Route path="/admin/users" element={<AdminUsers />} />`.
3. Commit: `git commit -m "feat: add admin user management UI"`

### A7. Open your Pull Request
Once A1–A6 work end-to-end locally, push your branch and open a Pull Request on GitHub as described in Section 2. Get it reviewed, then merge into `main`.

### A8. Later — lead Containerization & Deployment
Once everyone's features are merged (Phase 3 done), go to **Part 3** at the end of this guide.

---

## MEMBER B — Customer Order Placement

**Your features:** REQ-ORD-01 to REQ-ORD-07 (SRS Section 4.1). You own tables everyone else depends on — **complete B1 first, Day 2–3.**

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Open a terminal (`` Ctrl+` ``).
3. Create your branch:
   ```
   git checkout -b feature/order-placement
   ```

### B1. Design your database tables (do this first — others are waiting)

1. Open **MySQL Workbench**, connect to your local server (enter your root password).
2. Open a new query tab (blank-page-with-"+" icon, or **File → New Query Tab**).
3. First, get Member A's tables if they've pushed already: in VS Code terminal, run `git pull origin main` to check for updates, then in MySQL Workbench run the contents of `db/01_users_schema.sql` if it exists (open the file in VS Code, copy its contents, paste into Workbench, run it) so your foreign keys have something to reference. If Member A hasn't pushed yet, coordinate with them first, or use plain `INT` columns for now and add the foreign key constraint later.
4. Type and run this SQL:
   ```sql
   USE kandypack;

   CREATE TABLE product (
     product_id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(150) NOT NULL,
     unit_price DECIMAL(10,2) NOT NULL,
     space_consumption_rate DECIMAL(6,2) NOT NULL
   );

   CREATE TABLE route (
     route_id INT AUTO_INCREMENT PRIMARY KEY,
     city VARCHAR(100) NOT NULL,
     coverage_area_description TEXT,
     max_delivery_time_hours INT
   );

   CREATE TABLE customer (
     customer_id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     phone VARCHAR(20),
     default_address VARCHAR(255),
     FOREIGN KEY (user_id) REFERENCES user(user_id)
   );

   CREATE TABLE `order` (
     order_id INT AUTO_INCREMENT PRIMARY KEY,
     customer_id INT NOT NULL,
     order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
     requested_delivery_date DATE NOT NULL,
     status VARCHAR(30) DEFAULT 'Placed',
     total_value DECIMAL(10,2),
     total_volume DECIMAL(10,2),
     route_id INT,
     FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
     FOREIGN KEY (route_id) REFERENCES route(route_id)
   );

   CREATE TABLE order_item (
     order_item_id INT AUTO_INCREMENT PRIMARY KEY,
     order_id INT NOT NULL,
     product_id INT NOT NULL,
     quantity INT NOT NULL,
     FOREIGN KEY (order_id) REFERENCES `order`(order_id),
     FOREIGN KEY (product_id) REFERENCES product(product_id)
   );
   ```
   Run it (`Ctrl+Enter`). Note: `order` is a reserved word in MySQL, which is why it's wrapped in backticks — copy it exactly as shown.
5. Confirm the tables appeared: right-click "Schemas" in the left panel → Refresh All → expand `kandypack → Tables`.
6. Save this SQL into your project. In VS Code, right-click the `db` folder → New File → `02_orders_schema.sql`. Paste the same SQL (including the `USE kandypack;` line). Save.
7. Commit and push immediately:
   ```
   git add .
   git commit -m "db: add product, customer, route, order tables"
   git push origin feature/order-placement
   ```
8. **Tell your team** (group chat) that this is pushed, so Members C and D can build their foreign keys against it. They'll need to merge your branch or pull your specific file — agree as a team whether to merge this into `main` early (recommended) via a quick Pull Request so everyone can pull it easily.

### B2. Set up your backend routes file

1. If `server/node_modules` doesn't exist yet on your machine (i.e., Member A hasn't merged their setup yet, or you're working before that), set up the server yourself first following Member A's Section A2 steps 1–3 (npm init, install packages, create `src/index.js` and `src/db.js`). If Member A has already merged their setup into `main` and you've pulled it, skip to step 2.
2. In VS Code, right-click `server/src/routes` → New File → `orders.js`.
3. Paste this starter code:
   ```javascript
   const express = require('express');
   const db = require('../db');

   const router = express.Router();

   // Place a new order
   router.post('/', async (req, res) => {
     try {
       const { customerId, deliveryDate, items } = req.body; // items: [{ productId, quantity }]

       // Check 7-day lead time
       const today = new Date();
       const requested = new Date(deliveryDate);
       const diffDays = (requested - today) / (1000 * 60 * 60 * 24);
       if (diffDays < 7) {
         return res.status(400).json({ error: 'Delivery date must be at least 7 days from today.' });
       }

       // Look up the customer's address to match a route (simplified — refine this with your team's address/route matching logic)
       const [customerRows] = await db.query('SELECT * FROM customer WHERE customer_id = ?', [customerId]);
       if (customerRows.length === 0) return res.status(404).json({ error: 'Customer not found' });

       // Calculate total value and volume
       let totalValue = 0;
       let totalVolume = 0;
       for (const item of items) {
         const [productRows] = await db.query('SELECT * FROM product WHERE product_id = ?', [item.productId]);
         const product = productRows[0];
         totalValue += product.unit_price * item.quantity;
         totalVolume += product.space_consumption_rate * item.quantity;
       }

       const [orderResult] = await db.query(
         'INSERT INTO `order` (customer_id, requested_delivery_date, total_value, total_volume, status) VALUES (?, ?, ?, ?, ?)',
         [customerId, deliveryDate, totalValue, totalVolume, 'Placed']
       );
       const orderId = orderResult.insertId;

       for (const item of items) {
         await db.query(
           'INSERT INTO order_item (order_id, product_id, quantity) VALUES (?, ?, ?)',
           [orderId, item.productId, item.quantity]
         );
       }

       res.status(201).json({ message: 'Order placed', orderId });
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });

   // Get order history for a customer
   router.get('/customer/:customerId', async (req, res) => {
     const [rows] = await db.query('SELECT * FROM `order` WHERE customer_id = ?', [req.params.customerId]);
     res.json(rows);
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
   - New request → POST → `http://localhost:5000/api/orders` → Body → raw → JSON:
     ```json
     {
       "customerId": 1,
       "deliveryDate": "2026-09-20",
       "items": [
         { "productId": 1, "quantity": 5 }
       ]
     }
     ```
   - Click Send, confirm you get a `201` response. (You'll need at least one row in `product` and `customer` first — insert test rows via MySQL Workbench if needed.)
6. Add the remaining endpoints yourself, following this same pattern: `PUT /api/orders/:id` (edit, only if status is "Placed"), `DELETE /api/orders/:id` (cancel, only if "Placed"), `PUT /api/orders/:id/confirm-receipt`.
7. Commit after each endpoint works:
   ```
   git add .
   git commit -m "feat: add order placement endpoint with lead-time validation"
   git push origin feature/order-placement
   ```

### B3. Build the product catalog endpoint
1. Add to `orders.js` or create `server/src/routes/products.js`:
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
3. Commit: `git commit -m "feat: add product listing endpoint"`

### B4. Build the frontend order screens
1. In `client/src/pages`, create `MyOrders.jsx` — fetch `GET /api/orders/customer/:id` with axios, display a card per order (matches Figure 13: order ID, items summary, status badge, value).
2. Create `NewOrder.jsx` — fetch `GET /api/products` to populate a searchable list with "+ Add" buttons, a delivery address field, and a date picker that shows a warning if the chosen date is less than 7 days out (matches Figure 14).
3. Add both routes to `client/src/App.jsx`.
4. Commit after each screen: `git commit -m "feat: add order placement form UI"`

### B5. Open your Pull Request
Push your branch, open a PR on GitHub, get it reviewed, merge into `main`.

---

## MEMBER C — Rail Scheduling & Store Receipt

**Your features:** REQ-RAIL-01 to REQ-RAIL-07 (Section 4.2) and REQ-STORE-01 to REQ-STORE-05 (Section 4.3).

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Pull the latest code so you have Member B's tables:
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/rail-store
   ```
3. If Member B's `product`/`order` tables aren't in `main` yet, coordinate with them directly and pull their branch, or wait — check with the team before proceeding.

### C1. Design your database tables
1. Open **MySQL Workbench**, connect, open a new query tab.
2. Run:
   ```sql
   USE kandypack;

   CREATE TABLE train_trip (
     trip_id INT AUTO_INCREMENT PRIMARY KEY,
     destination_city VARCHAR(100) NOT NULL,
     departure_time DATETIME NOT NULL,
     arrival_time DATETIME NOT NULL,
     total_capacity DECIMAL(10,2) NOT NULL,
     status VARCHAR(30) DEFAULT 'Scheduled'
   );

   CREATE TABLE cargo_allocation (
     allocation_id INT AUTO_INCREMENT PRIMARY KEY,
     trip_id INT NOT NULL,
     order_id INT NOT NULL,
     allocated_quantity DECIMAL(10,2) NOT NULL,
     loading_status VARCHAR(30) DEFAULT 'Not Loaded',
     FOREIGN KEY (trip_id) REFERENCES train_trip(trip_id),
     FOREIGN KEY (order_id) REFERENCES `order`(order_id)
   );

   CREATE TABLE store (
     store_id INT AUTO_INCREMENT PRIMARY KEY,
     city VARCHAR(100) NOT NULL,
     address VARCHAR(255)
   );

   CREATE TABLE store_inventory (
     inventory_id INT AUTO_INCREMENT PRIMARY KEY,
     store_id INT NOT NULL,
     order_id INT NOT NULL,
     expected_quantity DECIMAL(10,2),
     received_quantity DECIMAL(10,2),
     discrepancy_flag BOOLEAN DEFAULT FALSE,
     note TEXT,
     FOREIGN KEY (store_id) REFERENCES store(store_id),
     FOREIGN KEY (order_id) REFERENCES `order`(order_id)
   );
   ```
   Run it. Refresh the schema panel to confirm the tables were created.
3. In VS Code, create `db/03_rail_store_schema.sql` (right-click `db` → New File) and paste the same SQL. Save.
4. Commit:
   ```
   git add .
   git commit -m "db: add train_trip, cargo_allocation, store, store_inventory tables"
   git push origin feature/rail-store
   ```

### C2. Build the Rail Scheduling API
1. In VS Code, right-click `server/src/routes` → New File → `rail.js`.
2. Paste this starter code:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // Admin defines a new trip
   router.post('/train-trips', async (req, res) => {
     try {
       const { destinationCity, departureTime, arrivalTime, totalCapacity } = req.body;
       const [result] = await db.query(
         'INSERT INTO train_trip (destination_city, departure_time, arrival_time, total_capacity) VALUES (?, ?, ?, ?)',
         [destinationCity, departureTime, arrivalTime, totalCapacity]
       );
       res.status(201).json({ tripId: result.insertId });
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });

   // List trips
   router.get('/train-trips', async (req, res) => {
     const [rows] = await db.query('SELECT * FROM train_trip ORDER BY departure_time');
     res.json(rows);
   });

   // Allocate an order to a trip — uses a transaction to prevent overbooking
   router.post('/train-trips/:id/allocate', async (req, res) => {
     const connection = await db.getConnection();
     try {
       await connection.beginTransaction();

       const { orderId, quantity } = req.body;
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
         return res.status(400).json({ error: `Not enough capacity. Only ${remaining} remaining.` });
       }

       await connection.query(
         'INSERT INTO cargo_allocation (trip_id, order_id, allocated_quantity) VALUES (?, ?, ?)',
         [tripId, orderId, quantity]
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

   // Dispatcher updates loading status for an order on a trip
   router.put('/allocations/:id/loading-status', async (req, res) => {
     const { status } = req.body; // 'Not Loaded' | 'Partially Loaded' | 'Loaded'
     await db.query('UPDATE cargo_allocation SET loading_status = ? WHERE allocation_id = ?', [status, req.params.id]);

     // If every allocation on this trip is Loaded, mark the trip Loaded too
     const [allocRow] = await db.query('SELECT trip_id FROM cargo_allocation WHERE allocation_id = ?', [req.params.id]);
     const tripId = allocRow[0].trip_id;
     const [remaining] = await db.query(
       "SELECT COUNT(*) AS cnt FROM cargo_allocation WHERE trip_id = ? AND loading_status != 'Loaded'",
       [tripId]
     );
     if (remaining[0].cnt === 0) {
       await db.query("UPDATE train_trip SET status = 'Loaded' WHERE trip_id = ?", [tripId]);
     }

     res.json({ message: 'Loading status updated' });
   });

   module.exports = router;
   ```
   Save.
3. Register it in `server/src/index.js`: `app.use('/api/rail', require('./routes/rail'));`
4. Important: your `db.js` file (created by Member A, or by you if not yet merged) needs a `getConnection` method available — since you're using `mysql2/promise` with a pool as shown in Member A's A2 setup, `db.getConnection()` already works out of the box. No changes needed there.
5. Test in Postman: create a trip, then try allocating more than its capacity twice in a row and confirm the second attempt is rejected once capacity runs out.
6. Commit after each working piece:
   ```
   git add .
   git commit -m "feat: add train trip capacity allocation with transaction lock"
   git push origin feature/rail-store
   ```
7. Add the remaining overflow-handling logic (REQ-RAIL-05, REQ-RAIL-07) yourself: when an allocation is rejected for insufficient capacity, instead of just erroring, look up the next `train_trip` for the same destination city with a later `departure_time` and allocate there automatically, logging that a delay occurred.

### C3. Build the Store Receipt API
1. Create `server/src/routes/store.js`. Paste and extend this starter:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // Expected manifest for an arriving trip at a store
   router.get('/:storeId/incoming/:tripId', async (req, res) => {
     const [rows] = await db.query(
       `SELECT ca.allocation_id, ca.order_id, ca.allocated_quantity
        FROM cargo_allocation ca WHERE ca.trip_id = ?`,
       [req.params.tripId]
     );
     res.json(rows);
   });

   // Store Manager records received quantities
   router.post('/:storeId/receive', async (req, res) => {
     const { orderId, expectedQuantity, receivedQuantity, note } = req.body;
     const discrepancy = receivedQuantity < expectedQuantity;
     await db.query(
       `INSERT INTO store_inventory (store_id, order_id, expected_quantity, received_quantity, discrepancy_flag, note)
        VALUES (?, ?, ?, ?, ?, ?)`,
       [req.params.storeId, orderId, expectedQuantity, receivedQuantity, discrepancy, note || null]
     );
     const newStatus = discrepancy ? 'Discrepant' : 'Scheduled';
     await db.query('UPDATE `order` SET status = ? WHERE order_id = ?', [newStatus, orderId]);
     res.status(201).json({ message: 'Receipt recorded', discrepancy });
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/stores', require('./routes/store'));`
3. Add the truck-suggestion endpoint yourself (`GET /:storeId/truck-suggestion`) — query the average number of orders per route over the last few weeks from the `order`/`route` tables, divide by an assumed average truck capacity (e.g. 20 orders), round up, minimum 1.
4. Commit: `git commit -m "feat: add store receipt reconciliation endpoints"`

### C4. Build the frontend screens
1. `client/src/pages/AdminTrainSchedule.jsx` — table of trips with an "Add Schedule" button/form (Figure 4).
2. `client/src/pages/DispatcherTrainLoading.jsx` — dropdown to select a trip, progress bar showing allocated capacity, list of orders with a status selector per order (Figure 7).
3. `client/src/pages/StoreShipmentReceipt.jsx` — dropdown to select an incoming trip, a table with Expected/Received quantity inputs and a Notes field per order line (Figure 10).
4. Add routes for each in `App.jsx`. Commit after each screen.

### C5. Open your Pull Request
Push, open PR, review, merge.

---

## MEMBER D — Roster Scheduling & Delivery Execution

**Your features:** REQ-SCHED-01 to REQ-SCHED-06 (Section 4.4) and REQ-DEL-01 to REQ-DEL-05 (Section 4.5).

### Before you start
1. Open VS Code, open the `kandypack-scms` folder.
2. Pull the latest code (you need Member B's `route` table and Member C's `store` table):
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/roster-delivery
   ```

### D1. Design your database tables
1. Open MySQL Workbench, connect, open a new query tab.
2. Run:
   ```sql
   USE kandypack;

   CREATE TABLE truck (
     truck_id INT AUTO_INCREMENT PRIMARY KEY,
     plate_number VARCHAR(20) NOT NULL UNIQUE,
     capacity DECIMAL(10,2)
   );

   CREATE TABLE driver (
     driver_id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     license_number VARCHAR(50),
     weekly_hours_worked DECIMAL(5,2) DEFAULT 0,
     FOREIGN KEY (user_id) REFERENCES user(user_id)
   );

   CREATE TABLE assistant (
     assistant_id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     weekly_hours_worked DECIMAL(5,2) DEFAULT 0,
     FOREIGN KEY (user_id) REFERENCES user(user_id)
   );

   CREATE TABLE roster (
     roster_id INT AUTO_INCREMENT PRIMARY KEY,
     route_id INT NOT NULL,
     truck_id INT NOT NULL,
     driver_id INT NOT NULL,
     assistant_id INT NOT NULL,
     run_date DATE NOT NULL,
     start_time TIME NOT NULL,
     end_time TIME NOT NULL,
     status VARCHAR(30) DEFAULT 'Scheduled',
     FOREIGN KEY (route_id) REFERENCES route(route_id),
     FOREIGN KEY (truck_id) REFERENCES truck(truck_id),
     FOREIGN KEY (driver_id) REFERENCES driver(driver_id),
     FOREIGN KEY (assistant_id) REFERENCES assistant(assistant_id)
   );

   CREATE TABLE run (
     run_id INT AUTO_INCREMENT PRIMARY KEY,
     roster_id INT NOT NULL,
     store_id INT NOT NULL,
     pickup_confirmed_at DATETIME,
     FOREIGN KEY (roster_id) REFERENCES roster(roster_id),
     FOREIGN KEY (store_id) REFERENCES store(store_id)
   );

   CREATE TABLE delivery_stop (
     stop_id INT AUTO_INCREMENT PRIMARY KEY,
     run_id INT NOT NULL,
     order_id INT NOT NULL,
     stop_sequence INT,
     outcome VARCHAR(30) DEFAULT 'Pending',
     note TEXT,
     delivered_at DATETIME,
     FOREIGN KEY (run_id) REFERENCES run(run_id),
     FOREIGN KEY (order_id) REFERENCES `order`(order_id)
   );

   CREATE TABLE system_parameter (
     param_name VARCHAR(50) PRIMARY KEY,
     param_value VARCHAR(50)
   );
   INSERT INTO system_parameter VALUES ('driver_min_rest_hours', '2');
   ```
   Run it, refresh the schema panel to confirm.
3. In VS Code, create `db/04_roster_delivery_schema.sql` and paste the same SQL. Save.
4. Commit:
   ```
   git add .
   git commit -m "db: add truck, driver, assistant, roster, run, delivery_stop tables"
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
       const { routeId, truckId, driverId, assistantId, runDate, startTime, endTime } = req.body;

       // RULE 1 — REQ-SCHED-06: roster must be created at least 7 days ahead
       const today = new Date();
       const runDateObj = new Date(runDate);
       const diffDays = (runDateObj - today) / (1000 * 60 * 60 * 24);
       if (diffDays < 7) {
         return res.status(400).json({ error: 'Roster must be created at least 7 days before the run date.' });
       }

       // RULE 2 — REQ-SCHED-01: no double-booking of truck/driver/assistant on overlapping times same day
       const [overlaps] = await db.query(
         `SELECT * FROM roster WHERE run_date = ?
          AND (truck_id = ? OR driver_id = ? OR assistant_id = ?)
          AND (start_time < ? AND end_time > ?)`,
         [runDate, truckId, driverId, assistantId, endTime, startTime]
       );
       if (overlaps.length > 0) {
         return res.status(400).json({ error: 'Truck, driver, or assistant already booked for an overlapping time.' });
       }

       // RULE 3 — REQ-SCHED-02: driver needs a 2-hour gap since their last run that day
       const [paramRows] = await db.query("SELECT param_value FROM system_parameter WHERE param_name = 'driver_min_rest_hours'");
       const minRestHours = parseFloat(paramRows[0].param_value);
       const [driverRunsToday] = await db.query(
         'SELECT * FROM roster WHERE driver_id = ? AND run_date = ?',
         [driverId, runDate]
       );
       for (const run of driverRunsToday) {
         const gapHours = Math.abs(new Date(`${runDate}T${startTime}`) - new Date(`${runDate}T${run.end_time}`)) / 3600000;
         if (gapHours < minRestHours) {
           return res.status(400).json({ error: `Driver needs at least ${minRestHours} hours rest between runs.` });
         }
       }

       // RULE 4 — REQ-SCHED-04: weekly hour caps (40 driver, 60 assistant) — simplified check
       const [driverRow] = await db.query('SELECT weekly_hours_worked FROM driver WHERE driver_id = ?', [driverId]);
       if (driverRow[0].weekly_hours_worked >= 40) {
         return res.status(400).json({ error: 'Driver has reached the 40-hour weekly limit.' });
       }
       const [assistantRow] = await db.query('SELECT weekly_hours_worked FROM assistant WHERE assistant_id = ?', [assistantId]);
       if (assistantRow[0].weekly_hours_worked >= 60) {
         return res.status(400).json({ error: 'Assistant has reached the 60-hour weekly limit.' });
       }

       // All checks passed — create the roster entry
       const [result] = await db.query(
         `INSERT INTO roster (route_id, truck_id, driver_id, assistant_id, run_date, start_time, end_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
         [routeId, truckId, driverId, assistantId, runDate, startTime, endTime]
       );
       res.status(201).json({ rosterId: result.insertId });
     } catch (err) {
       res.status(400).json({ error: err.message });
     }
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/roster', require('./routes/roster'));`
3. Add RULE for REQ-SCHED-03 (assistant max 2 consecutive routes) yourself, following the same pattern as Rule 3 above — count the assistant's consecutive same-day assignments.
4. Add the override endpoint `PUT /api/roster/:id/override` — accepts a `justification` field in the body, and inserts a row into `audit_log` (reuse Member A's table) recording who overrode what and why.
5. Test each rule separately in Postman: try to create two overlapping assignments for the same driver and confirm you get a `400` error with a clear message; then try a valid one and confirm it succeeds.
6. Commit after each rule works:
   ```
   git add .
   git commit -m "feat: add roster overlap and weekly-hour validation"
   git push origin feature/roster-delivery
   ```

### D3. Build the Delivery Execution API
1. Create `server/src/routes/delivery.js`. Paste and extend:
   ```javascript
   const express = require('express');
   const db = require('../db');
   const router = express.Router();

   // Driver/Assistant's run for today
   router.get('/runs/:id/today', async (req, res) => {
     const [runRows] = await db.query('SELECT * FROM run WHERE run_id = ?', [req.params.id]);
     const [stops] = await db.query('SELECT * FROM delivery_stop WHERE run_id = ? ORDER BY stop_sequence', [req.params.id]);
     res.json({ run: runRows[0], stops });
   });

   // Confirm pickup from store
   router.put('/runs/:id/pickup', async (req, res) => {
     await db.query('UPDATE run SET pickup_confirmed_at = NOW() WHERE run_id = ?', [req.params.id]);
     res.json({ message: 'Pickup confirmed' });
   });

   // Record a stop outcome
   router.put('/runs/:runId/stops/:stopId', async (req, res) => {
     const { outcome, note } = req.body; // 'Delivered' | 'Failed' | 'Attempted'

     // Block if pickup hasn't been confirmed yet — REQ-DEL-02
     const [runRows] = await db.query('SELECT pickup_confirmed_at FROM run WHERE run_id = ?', [req.params.runId]);
     if (!runRows[0].pickup_confirmed_at) {
       return res.status(400).json({ error: 'Pickup must be confirmed before recording deliveries.' });
     }

     await db.query(
       'UPDATE delivery_stop SET outcome = ?, note = ?, delivered_at = NOW() WHERE stop_id = ?',
       [outcome, note || null, req.params.stopId]
     );

     // REQ-DEL-04: if Failed, re-queue onto the next available run on the same route
     if (outcome === 'Failed') {
       const [stopRows] = await db.query('SELECT order_id FROM delivery_stop WHERE stop_id = ?', [req.params.stopId]);
       // TODO: look up the next run for this route and insert a new delivery_stop row for it
     }

     res.json({ message: 'Stop updated' });
   });

   module.exports = router;
   ```
2. Register it: `app.use('/api/delivery', require('./routes/delivery'));`
3. Fill in the `TODO` for the re-queue logic yourself, following the pattern Member C used for train trip overflow.
4. Commit: `git commit -m "feat: add delivery execution endpoints with auto re-queue on failure"`

### D4. Build the frontend screens
1. `client/src/pages/RosterBuilder.jsx` — a grid (routes as rows, days as columns) with "+ Assign" buttons that open a small form (truck/driver/assistant dropdowns), showing red highlighting for any cell that returned a conflict error from the API (Figure 8).
2. `client/src/pages/DriverToday.jsx` — mobile-first single card showing the day's run with a big "Confirm Pickup & Start Run" button (Figure 11). Use CSS like `maxWidth: '400px', margin: '0 auto'` to keep it phone-sized even on desktop for testing.
3. `client/src/pages/DriverStopDetail.jsx` — list of stops with Delivered/Failed/Report Issue buttons per stop (Figure 12).
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
     FOREIGN KEY (user_id) REFERENCES user(user_id)
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
5. Let Member C and Member D know they can `require('./notifications').createNotification` in their own route files to trigger alerts — e.g. Member C calls it when a shipment is discrepant (REQ-NOT-01), Member D calls it when a driver approaches their weekly-hour limit (REQ-NOT-02).

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
   const { requireAuth, requireRole } = require('../middleware/auth');
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
   - `GET /city-breakdown` — join `order` + `route`, `GROUP BY city`
   - `GET /staff-hours` — from `driver`/`assistant`, flag rows where `weekly_hours_worked` > 40 or 60
   - `GET /truck-utilization` — join `roster` + `truck`, `GROUP BY truck_id`
   - `GET /customer/:id` — all orders for one customer with their status history
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
1. Open each file in `db/` (`01_users_schema.sql`, `02_orders_schema.sql`, `03_rail_store_schema.sql`, `04_roster_delivery_schema.sql`, `05_notifications_schema.sql`) and copy their contents in order.
2. Create a new file `db/init.sql` and paste them all in, in this order (tables with no foreign keys first):
   ```sql
   CREATE DATABASE IF NOT EXISTS kandypack;
   USE kandypack;

   -- (paste 01_users_schema.sql content here, minus its own CREATE DATABASE/USE lines)
   -- (paste 02_orders_schema.sql content here)
   -- (paste 03_rail_store_schema.sql content here)
   -- (paste 04_roster_delivery_schema.sql content here)
   -- (paste 05_notifications_schema.sql content here)
   ```
3. Add seed/test data at the bottom of `init.sql` — the SRS requires at least 40 orders, 10 routes, and a valid train schedule. Insert enough sample rows into `route`, `product`, `store`, `train_trip`, `customer`/`user`, and `order`/`order_item` to reach these minimums. This can be tedious by hand — write simple `INSERT` statements, or a small one-off Node script that generates and prints INSERT statements for you.
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
