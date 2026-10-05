const express = require("express");
const cors = require("cors");
require("dotenv").config();

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


const app = express();
app.use(cors());
app.use(express.json());

// Base Health Check
app.get("/", (req, res) => {
  res.send("Kandypack API is running.");
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


// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
