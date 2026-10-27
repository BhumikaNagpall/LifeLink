/* =====================================================
   LIFELINK - BLOOD REQUEST ROUTES
   Endpoints: /api/requests/*
   Enforces authentication, verified hospital access, and administrative deletion
   ===================================================== */

const express = require("express");
const router = express.Router();

const {
    createBloodRequest,
    getAllRequests,
    getRequestById,
    updateBloodRequest,
    cancelBloodRequest,
    fulfillBloodRequest,
    deleteBloodRequest
} = require("../controllers/request.controller");

const {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireVerifiedHospital
} = require("../middleware/auth");

// Public / Authenticated discovery
router.get("/", optionalAuth, getAllRequests);
router.get("/:id", optionalAuth, getRequestById);

// Protected Hospital Operations (Verified Hospitals & Admins only)
router.post(
    "/",
    authenticateToken,
    requireRole("hospital", "admin"),
    requireVerifiedHospital,
    createBloodRequest
);

router.patch(
    "/:id",
    authenticateToken,
    requireRole("hospital", "admin"),
    requireVerifiedHospital,
    updateBloodRequest
);

router.post(
    "/:id/cancel",
    authenticateToken,
    requireRole("hospital", "admin"),
    requireVerifiedHospital,
    cancelBloodRequest
);

router.post(
    "/:id/fulfill",
    authenticateToken,
    requireRole("hospital", "admin"),
    requireVerifiedHospital,
    fulfillBloodRequest
);

// Admin-Only Deletion
router.delete(
    "/:id",
    authenticateToken,
    requireRole("admin"),
    deleteBloodRequest
);

module.exports = router;
