const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const railRoutes = require("./routes/rail");
const storeRoutes = require("./routes/store");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rail", railRoutes);
app.use("/api/stores", storeRoutes);

app.get("/", (req, res) => {
  res.send("Kandypack API is running.");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
