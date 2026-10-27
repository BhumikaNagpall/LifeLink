/* =====================================================
   LIFELINK - DONOR ROUTES
   Endpoints: /api/donors/*
   Enforces authentication, profile ownership, and privacy protections
   ===================================================== */

const express = require("express");
const router = express.Router();

const {
    getAllDonors,
    getDonorById,
    registerDonorWizard,
    updateAvailability,
    addDonationRecord,
    deleteDonor
} = require("../controllers/donor.controller");

const {
    authenticateToken,
    optionalAuth,
    requireRole
} = require("../middleware/auth");

// Public / Authenticated discovery
router.get("/", optionalAuth, getAllDonors);
router.get("/:id", optionalAuth, getDonorById);
router.post("/register-wizard", optionalAuth, registerDonorWizard);

// Protected Operations
router.patch("/:id/availability", authenticateToken, updateAvailability);
router.post("/:id/donations", authenticateToken, addDonationRecord);
router.delete("/:id", authenticateToken, deleteDonor);

module.exports = router;
