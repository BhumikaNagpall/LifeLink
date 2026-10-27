/* =====================================================
   LIFELINK - EXPRESS APPLICATION SETUP
   Configures middleware, static file serving, routes,
   and production security controls
   ===================================================== */

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const apiRoutes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiter");

const app = express();

// Security Headers with Helmet
app.use(
    helmet({
        contentSecurityPolicy: false, // Disabled for local development to allow fonts & inline handlers
        crossOriginEmbedderPolicy: false
    })
);

// CORS Configuration
const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
    : ["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:5000", "http://localhost:3000"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
            if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
                return callback(null, true);
            }
            return callback(new Error("CORS policy violation: Origin not allowed"), false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-test-bypass-ratelimit"]
    })
);

// Request Logging
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined"));
}

// Body Parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Serve frontend static assets from workspace root (for unified local hosting)
const rootDir = path.resolve(__dirname, "../../");
app.use(express.static(rootDir));

// Rate Limiting on API endpoints
app.use("/api", generalLimiter);

// Mount REST API
app.use("/api", apiRoutes);

// Root route fallback to index.html if requested directly
app.get("/", (req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
});

// 404 & Centralized Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
