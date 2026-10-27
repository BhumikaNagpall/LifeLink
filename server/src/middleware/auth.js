/* =====================================================
   LIFELINK - AUTHENTICATION & AUTHORIZATION MIDDLEWARE
   Enforces secure token verification and role-based access
   ===================================================== */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");

// Centralized JWT Secret Resolver with Production Safeguard
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("FATAL: JWT_SECRET environment variable is missing in production.");
        }
        return "lifelink_dev_secret_key_2026_super_secure_node_jwt";
    }
    return secret;
};

// Middleware to authenticate JWT Bearer token (Strict)
const authenticateToken = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please provide a valid Bearer token."
            });
        }

        // Check if token was explicitly revoked on logout
        const isRevoked = await RevokedToken.exists({ token });
        if (isRevoked) {
            return res.status(401).json({
                success: false,
                message: "Session has been terminated. This token has been revoked."
            });
        }

        const decoded = jwt.verify(token, getJwtSecret());

        const user = await User.findById(decoded.id)
            .populate("donorProfile")
            .populate("hospitalProfile");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User session is no longer valid. Please log in again."
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "This account has been deactivated. Please contact support."
            });
        }

        req.token = token;
        req.tokenDecoded = decoded;
        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please log in again."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid authentication token."
        });
    }
};

// Middleware for optional authentication (populates req.user if valid token provided)
const optionalAuth = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        if (token) {
            const isRevoked = await RevokedToken.exists({ token });
            if (!isRevoked) {
                const decoded = jwt.verify(token, getJwtSecret());

                const user = await User.findById(decoded.id)
                    .populate("donorProfile")
                    .populate("hospitalProfile");

                if (user && user.isActive) {
                    req.token = token;
                    req.tokenDecoded = decoded;
                    req.user = user;
                }
            }
        }
        next();
    } catch (error) {
        // Silently continue as unauthenticated guest
        req.user = null;
        next();
    }
};

// Middleware to authorize specific user roles (e.g. 'hospital', 'admin')
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Access requires one of the following roles: [${roles.join(", ")}]. Your role is '${req.user.role}'.`
            });
        }

        next();
    };
};

// Middleware to ensure hospital is an authorized institution (not unverified demo)
const requireVerifiedHospital = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    // Admins bypass hospital verification check
    if (req.user.role === "admin") {
        return next();
    }

    if (req.user.role !== "hospital") {
        return res.status(403).json({
            success: false,
            message: "Access restricted to hospital accounts."
        });
    }

    if (!req.user.hospitalProfile) {
        return res.status(400).json({
            success: false,
            message: "Hospital profile is missing for this account."
        });
    }

    if (req.user.hospitalProfile.verificationStatus !== "authorized_institution") {
        return res.status(403).json({
            success: false,
            message: "Institutional verification required. Your hospital account is currently unverified."
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireVerifiedHospital,
    getJwtSecret
};
