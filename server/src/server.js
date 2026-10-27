/* =====================================================
   LIFELINK - SERVER BOOTSTRAP ENTRYPOINT
   Starts the HTTP server and initializes MongoDB
   ===================================================== */

const path = require("path");
const dotenv = require("dotenv");

// Load .env from root directory or server directory
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        logger.info("Initializing LifeLink backend server...");

        // Production Security Checks
        if (process.env.NODE_ENV === "production") {
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
                logger.error("FATAL: Production deployment requires a secure, high-entropy JWT_SECRET (minimum 32 characters).");
                process.exit(1);
            }
        }

        // Connect to MongoDB
        await connectDB();

        // Start listening
        const server = app.listen(PORT, () => {
            logger.info(`LifeLink Backend API is running on port ${PORT}`);
            logger.info(`Health check available at: http://localhost:${PORT}/api/health`);
            logger.info(`Frontend served at: http://localhost:${PORT}`);
        });

        // Graceful Shutdown
        const shutdown = async (signal) => {
            logger.warn(`Received ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                const mongoose = require("mongoose");
                try {
                    await mongoose.connection.close();
                    logger.info("MongoDB connection closed.");
                } catch (err) {
                    logger.error(`Error closing MongoDB: ${err.message}`);
                }
                process.exit(0);
            });

            // Force close if graceful shutdown takes too long
            setTimeout(() => {
                logger.error("Forced process shutdown after timeout.");
                process.exit(1);
            }, 10000);
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));

    } catch (error) {
        logger.error(`Critical startup failure: ${error.message}`);
        process.exit(1);
    }
};

startServer();
