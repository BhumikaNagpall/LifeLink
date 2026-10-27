/* =====================================================
   LIFELINK - MATCHER ROUTES
   Endpoints: /api/matcher/*
   Protects algorithmic donor matching with verified institutional authorization
   ===================================================== */

const express = require("express");
const router = express.Router();

const {
    findMatchesHandler,
    findMatchesForExistingRequest
} = require("../controllers/matcher.controller");

const {
    authenticateToken,
    requireRole,
    requireVerifiedHospital
} = require("../middleware/auth");

// Algorithmic Matching (Verified Hospital staff and Admins only)
router.post(
    "/find-matches",
    authenticateToken,
    requireRole("hospital", "admin"),
    requireVerifiedHospital,
    findMatchesHandler
);

router.get(
    "/request/:requestId",
    authenticateToken,
    requireRole("hospital", "admin"),
    requireVerifiedHospital,
    findMatchesForExistingRequest
);

module.exports = router;
