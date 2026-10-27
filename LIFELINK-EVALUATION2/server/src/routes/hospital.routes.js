/* =====================================================
   LIFELINK - HOSPITAL CONSOLE ROUTES
   Endpoints: /api/hospital/*
   Secures hospital dashboard, facility verification, and audit logs
   ===================================================== */

const express = require("express");
const router = express.Router();

const {
    getHospitalDashboardStats,
    getAllHospitals,
    getHospitalProfile,
    updateHospitalVerification,
    getAuditLogs
} = require("../controllers/hospital.controller");

const {
    authenticateToken,
    optionalAuth,
    requireRole
} = require("../middleware/auth");

// Dashboard stats (Public summary or authenticated scoped metrics)
router.get("/dashboard-stats", optionalAuth, getHospitalDashboardStats);

// List hospitals (Admin only - for verification approvals)
router.get("/list", authenticateToken, requireRole("admin"), getAllHospitals);

// Hospital profile
router.get("/profile/:id", optionalAuth, getHospitalProfile);

// Hospital verification (Strictly Admin only)
router.patch("/:id/verify", authenticateToken, requireRole("admin"), updateHospitalVerification);

// Audit logs (Staff sees own logs, Admin sees all)
router.get("/audit-logs", authenticateToken, requireRole("hospital", "admin"), getAuditLogs);

module.exports = router;
