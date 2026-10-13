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
    await db.query(
      "UPDATE `user` SET name = 'Kamal Silva' WHERE (user_id = 5 OR email = 'assistant@kandypack.local') AND name IN ('Assistant', 'Delivery Assistant')"
    );
    await db.query(
      "UPDATE `user` SET name = 'Waruni Rathnayake', email = 'waruni.rathnayake@kandypack.lk' WHERE user_id = 9 OR email IN ('customer1@kandypack.local', 'waruni@gmail.com') OR name LIKE 'Sample Customer%'"
    );
    await db.query(
      "UPDATE `user` SET name = 'Dilshan Wickramasinghe', email = 'dilshan.wickramasinghe@kandypack.lk' WHERE user_id = 999 OR email = 'shop@test.com' OR name LIKE 'Test Shop%'"
    );
    console.log("[DB] Administrator, Dispatcher, Store Manager, Driver, Assistant & Customer real names and emails synchronized");
  } catch (err) {
    console.warn("[DB] Startup user sync note:", err.message);
  }
});
