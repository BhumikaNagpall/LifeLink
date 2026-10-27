/* =====================================================
   LIFELINK - DATABASE CONNECTION (MONGOOSE)
   Handles MongoDB connection lifecycle and events
   ===================================================== */

const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifelink";

    try {
        mongoose.connection.on("connected", () => {
            logger.info("MongoDB connected successfully.");
        });

        mongoose.connection.on("error", (err) => {
            logger.error(`MongoDB connection error: ${err.message}`);
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("MongoDB disconnected.");
        });

        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            autoIndex: true
        });

        logger.info(`Database Host: ${conn.connection.host}, DB Name: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        // Do not crash the process immediately in dev mode, so health check can report db status
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
    }
};

module.exports = connectDB;
