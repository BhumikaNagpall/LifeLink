/* =====================================================
   LIFELINK - HARDENED CENTRALIZED ERROR HANDLER
   Sanitizes error outputs to prevent data & stack leakage
   while maintaining detailed internal audit logging.
   ===================================================== */

const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || "Internal Server Error";
    let errors = err.errors || undefined;

    // Handle Mongoose Bad ObjectId / CastError
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid format for resource identifier '${err.path}'.`;
    }

    // Handle Mongoose Duplicate Key Error (E11000)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `An entry with this ${field} already exists.`;
    }

    // Handle Mongoose Schema Validation Errors
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation failed for submitted data.";
        errors = Object.values(err.errors || {}).map(e => ({
            field: e.path,
            message: e.message
        }));
    }

    // Log complete internal error with stack trace for engineering observability
    logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${err.message}${err.stack ? `\n${err.stack}` : ""}`);

    // In production, sanitize 500-level messages so database internals are never exposed
    const isProduction = process.env.NODE_ENV === "production";
    const publicMessage = (statusCode >= 500 && isProduction)
        ? "An internal server error occurred. Please contact system support."
        : message;

    res.status(statusCode).json({
        success: false,
        message: publicMessage,
        ...(errors ? { errors } : {}),
        stack: isProduction ? undefined : err.stack
    });
};

module.exports = errorHandler;
