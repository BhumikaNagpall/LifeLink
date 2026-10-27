/* =====================================================
   LIFELINK - HEALTH ROUTES
   Endpoint: /api/health
   ===================================================== */

const express = require("express");
const router = express.Router();
const { getHealthStatus } = require("../controllers/health.controller");

router.get("/", getHealthStatus);

module.exports = router;
