/* =====================================================
   LIFELINK - INVITATION ROUTES
   Endpoints: /api/invitations/*
   Enforces verified hospital dispatch and donor-only inbox isolation
   ===================================================== */

const express = require("express");
const router = express.Router();

const {
    sendInvitation,
    getInvitationsForRequest,
    getDonorInbox,
    respondToInvitation
} = require("../controllers/invitation.controller");

const {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireVerifiedHospital
} = require("../middleware/auth");

// Dispatch invitation (Verified Hospital or Admin only)
router.post(
    "/send",
    authenticateToken,
    requireRole("hospital", "admin"),
    requireVerifiedHospital,
    sendInvitation
);

// View invitations for a request (Owning Hospital or Admin)
router.get(
    "/request/:requestId",
    authenticateToken,
    requireRole("hospital", "admin"),
    getInvitationsForRequest
);

// Donor Coordination Inbox (Donor gets own invitations, or admin with param)
router.get(
    "/inbox",
    authenticateToken,
    requireRole("donor", "admin"),
    getDonorInbox
);

// Respond to invitation (Invited Donor or Admin only)
router.patch(
    "/:id/respond",
    authenticateToken,
    requireRole("donor", "admin"),
    respondToInvitation
);

module.exports = router;
