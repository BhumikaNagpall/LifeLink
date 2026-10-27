/* =====================================================
   LIFELINK - AUTHENTICATION ROUTES
   Endpoints: /api/auth/*
   ===================================================== */

const express = require("express");
const router = express.Router();

const {
    register,
    login,
    getMe,
    updateMyProfile,
    logout,
    forgotPassword,
    resetPassword,
    updateUserStatus,
    listUsers
} = require("../controllers/auth.controller");

const {
    authenticateToken,
    requireRole
} = require("../middleware/auth");

const { authLimiter } = require("../middleware/rateLimiter");

// Public authentication flows (rate-limited against brute-force attacks)
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// Authenticated session routes
router.get("/me", authenticateToken, getMe);
router.patch("/me/profile", authenticateToken, updateMyProfile);
router.post("/logout", authenticateToken, logout);

// Administrative governance routes
router.get("/users", authenticateToken, requireRole("admin"), listUsers);
router.patch("/users/:id/status", authenticateToken, requireRole("admin"), updateUserStatus);

module.exports = router;
