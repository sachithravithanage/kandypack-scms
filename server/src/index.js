const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
// KandyPack SCMS Server

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured before starting the server.");
}

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const inventoryRoutes = require("./routes/inventory");
const cityRoutes = require("./routes/cities");
const rosterRoutes = require("./routes/roster");
const deliveryRoutes = require("./routes/delivery");
const railRoutes = require("./routes/rail");
const storeRoutes = require("./routes/store");
const { router: notificationRoutes } = require("./routes/notifications");
const reportRoutes = require("./routes/reports");
const orderRoutes = require("./routes/orders");
const productsRouter = require("./routes/products");
const routesRouter = require("./routes/routes");

const app = express();
// Strip stale HSTS rules so client browsers do not force HTTPS on plain HTTP deployments
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=0");
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: "deny" },
    hsts: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "*"],
        upgradeInsecureRequests: null,
      },
    },
  })
);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Kandypack API is running.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    network: "Rail & Fleet Network Live",
    timestamp: new Date().toISOString(),
  });
});

// Route Modules
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/roster", rosterRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/rail", railRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productsRouter);
app.use("/api/routes", routesRouter);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

require("./cron");

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const db = require("./db");
    try {
      await db.query("ALTER TABLE `user` ADD COLUMN email_verified BOOLEAN DEFAULT TRUE");
    } catch (_) {}
    await db.query(
      "UPDATE `user` SET name = 'Nimal Perera' WHERE (user_id = 1 OR email = 'admin@kandypack.local') AND name IN ('System Administrator', 'Administrator')"
    );
    await db.query(
      "UPDATE `user` SET name = 'Kavinda Fernando' WHERE (user_id = 2 OR email = 'dispatcher@kandypack.local') AND name IN ('Dispatch Controller', 'Dispatcher')"
    );
    await db.query(
      "UPDATE `user` SET name = 'Suneth Silva' WHERE (user_id = 3 OR email = 'manager@kandypack.local') AND name IN ('Colombo Store Manager', 'Store Manager', 'Regional Store Manager')"
    );
    await db.query(
      "UPDATE `user` SET name = 'Sunil Jayawardena' WHERE (user_id = 4 OR email = 'driver@kandypack.local') AND name IN ('Driver', 'Commercial Driver')"
    );

    // Synchronize Assistants (Role 5)
    await db.query(
      "UPDATE `user` SET name = 'Kamal Silva', email = 'kamal.silva@kandypack.lk', role_id = 5 WHERE user_id = 5 OR email = 'assistant@kandypack.local'"
    );
    await db.query(
      "UPDATE `user` SET name = 'Bandara Weerakoon', email = 'bandara.asst@kandypack.lk', role_id = 5 WHERE user_id = 7 OR email = 'bandara.asst@kandypack.lk'"
    );
    await db.query(
      "UPDATE `user` SET name = 'Chinthaka Dias', email = 'chinthaka.asst@kandypack.lk', role_id = 5 WHERE user_id = 8 OR email = 'chinthaka.asst@kandypack.lk'"
    );

    // CRITICAL: Purge any non-assistants from the assistant table
    await db.query(
      "DELETE FROM assistant WHERE user_id IN (SELECT user_id FROM `user` WHERE role_id != 5)"
    );

    // Ensure valid assistants exist in employee and assistant tables
    await db.query("INSERT IGNORE INTO employee (user_id) VALUES (5), (7), (8)");
    await db.query("INSERT IGNORE INTO assistant (user_id) VALUES (5), (7), (8)");

    // Seed New Verified Customers (Role 6)
    const defaultPasswordHash = "$2b$10$8YbzSmXtzLPkGNKmzR1TWuyI5QGO/958PvY5lGVBGjKH1BTpMbY/e"; // password123
    const newCustomers = [
      { name: 'Waruni Rathnayake', email: 'waruni.rathnayake@kandypack.lk', phone: '+94771234501', address: '15 Temple Road, Colombo 03', city_id: 1 },
      { name: 'Dilshan Wickramasinghe', email: 'dilshan.wickramasinghe@kandypack.lk', phone: '+94771234502', address: '44 Galle Road, Mount Lavinia', city_id: 1 },
      { name: 'Saman Kumara', email: 'saman.kumara@kandypack.lk', phone: '+94771234503', address: '78 Kandy Road, Negombo', city_id: 2 },
      { name: 'Anura Jayasinghe', email: 'anura.jayasinghe@kandypack.lk', phone: '+94771234504', address: '12 Fort Cross Street, Galle', city_id: 3 },
      { name: 'Nirosha Perera', email: 'nirosha.perera@kandypack.lk', phone: '+94771234505', address: '29 Beach Way, Matara', city_id: 4 },
      { name: 'Kavindi Dissanayake', email: 'kavindi.dissanayake@kandypack.lk', phone: '+94771234506', address: '101 Hospital Road, Jaffna', city_id: 5 },
      { name: 'Tharindu Wijesinghe', email: 'tharindu.wijesinghe@kandypack.lk', phone: '+94771234507', address: '56 Harbour View, Trincomalee', city_id: 6 }
    ];

    for (const c of newCustomers) {
      const [existing] = await db.query("SELECT user_id FROM `user` WHERE email = ?", [c.email]);
      let uid;
      if (existing.length === 0) {
        const [ins] = await db.query(
          "INSERT INTO `user` (name, email, password_hash, role_id, phone, is_active) VALUES (?, ?, ?, 6, ?, 1)",
          [c.name, c.email, defaultPasswordHash, c.phone]
        );
        uid = ins.insertId;
      } else {
        uid = existing[0].user_id;
        await db.query(
          "UPDATE `user` SET name = ?, role_id = 6, phone = ?, is_active = 1 WHERE user_id = ?",
          [c.name, c.phone, uid]
        );
      }
      await db.query(
        "INSERT INTO customer (user_id, phone, address, city_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE phone = VALUES(phone), address = VALUES(address), city_id = VALUES(city_id)",
        [uid, c.phone, c.address, c.city_id]
      );
    }

    console.log("[DB] Assistants cleaned up, real names restored, and new customers synchronized successfully");
  } catch (err) {
    console.warn("[DB] Startup user sync note:", err.message);
  }
});
