const express = require("express");
const cds = require("@sap/cds");
const cors = require("cors");
const path = require("path");

const router = express.Router();

// ✅ Your env endpoint
router.get("/rest/billing/env", (req, res) => {
  res.json({ env: process.env.DEPLOYMENT_ENV || "UNKNOWN" });
});

cds.on("bootstrap", (app) => {
  console.log("Environment Running:", process.env.DEPLOYMENT_ENV);

  // Enable CORS
  app.use(cors());

  // Health check
  app.get("/", (_, res) => {
    res.send("CAP backend is running 🚀");
  });

  // Static files
  app.use("/pdfs", express.static("pdfs"));
  // Serve logo and other app public assets from workspace `app/public`
  app.use("/logo", express.static(path.resolve(__dirname, "../../app/public")));

  // Attach env route
  app.use(router);

  // Optional pug templates
  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "pug");
});

module.exports = cds.server;
