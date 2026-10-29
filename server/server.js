const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config(); // Fallback to root .env

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const dbStore = require("./services/dbStore");
const authRoutes = require("./routes/authRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const routeRoutes = require("./routes/routeRoutes");
const ambulanceRoutes = require("./routes/ambulanceRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// Configurable CORS for production & development
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["*"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json());

// API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/emergencies", emergencyRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/ai", aiRoutes);

// System Health Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: dbStore.isConnected() ? "MongoDB Cloud/Atlas" : "In-Memory Resilient Engine",
    version: "2.4.0-production",
    hospitalsLoaded: dbStore.getHospitals().length,
    ambulancesTracked: dbStore.getAmbulances().length
  });
});

// Production Static Client Serving
const clientDistPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback for client-side routing (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(clientDistPath, "index.html"));
    }
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: `API route ${req.method} ${req.path} not found` });
    }
    next();
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      message: "QuickPulse Emergency Response System API is active",
      aiEngine: "Online",
      databaseEngine: dbStore.isConnected() ? "MongoDB Cloud/Local" : "In-Memory Resilient Engine",
      note: "Client dist directory not detected. Run 'npm run build' to bundle the web client."
    });
  });
}

const PORT = process.env.PORT || 5000;

// Start HTTP Server
function startServer() {
  const serverInstance = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  QuickPulse Emergency Response System (AI-Powered) `);
    console.log(`  Server listening on port ${PORT}                  `);
    console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`  Engine Status: Ready for Emergency Operations      `);
    console.log(`====================================================`);
  });
  serverInstance.on("error", (err) => {
    console.error("HTTP Server Startup Error:", err.message);
  });
}

// Start HTTP Server immediately so port binds without container startup delay
startServer();

// Database Connection with graceful fallback
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/emergencyResponse";

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    dbStore.setMongoConnected(true);
    console.log("✓ MongoDB connected successfully");
  })
  .catch((error) => {
    dbStore.setMongoConnected(false);
    console.log(`ℹ Local MongoDB offline (${error.message}).`);
    console.log("✓ Seamlessly engaged In-Memory Emergency Data Engine with pre-seeded hospitals and ambulances.");
  });
