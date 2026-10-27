/* =====================================================
   LIFELINK - ROOT API ROUTER
   Aggregates all /api modular route handlers
   ===================================================== */

const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const donorRoutes = require("./donor.routes");
const requestRoutes = require("./request.routes");
const hospitalRoutes = require("./hospital.routes");
const matcherRoutes = require("./matcher.routes");
const invitationRoutes = require("./invitation.routes");
const notificationRoutes = require("./notification.routes");

// API Mount Points
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/donors", donorRoutes);
router.use("/requests", requestRoutes);
router.use("/hospital", hospitalRoutes);
router.use("/matcher", matcherRoutes);
router.use("/invitations", invitationRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
