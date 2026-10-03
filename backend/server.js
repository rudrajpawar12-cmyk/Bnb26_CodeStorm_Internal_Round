/**
 * Quorum Backend Server
 * Express REST API powering multi-builder software release verification.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const verificationRoutes = require("./routes/verification");

const app = express();

// Security and utility middleware
app.use(cors());
app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root Healthcheck & Information
app.get("/", (req, res) => {
  res.json({
    platform: "QUORUM",
    tagline: "Don't Trust the Binary. Trust the Builders.",
    status: "online",
    version: "1.0.0",
    docs: "/api/system-status",
  });
});

// Mount Verification API Routes
app.use("/api", verificationRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint '${req.originalUrl}' not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "Internal server error occurred.",
    message: err.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  QUORUM Verification Engine Online`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`==================================================\n`);
});