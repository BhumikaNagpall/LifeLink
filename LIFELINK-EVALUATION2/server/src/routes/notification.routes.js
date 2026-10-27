/* =====================================================
   LIFELINK - NOTIFICATION & ESCALATION ROUTES
   Endpoints: /api/notifications/*
   ===================================================== */

const express = require("express");
const router = express.Router();

const {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    checkDeadlinesAndEscalate
} = require("../controllers/notification.controller");

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");

router.get("/", authenticateToken, getUserNotifications);
router.patch("/:id/read", authenticateToken, markNotificationRead);
router.patch("/mark-all-read", authenticateToken, markAllNotificationsRead);
router.post("/check-escalation", authenticateToken, requireRole("hospital", "admin"), checkDeadlinesAndEscalate);

module.exports = router;
