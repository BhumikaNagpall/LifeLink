/* =====================================================
   LIFELINK - HEALTH CHECK CONTROLLER
   Provides real-time system and database health status
   ===================================================== */

const mongoose = require("mongoose");

const getHealthStatus = (req, res) => {
    const dbStateMap = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    };

    const dbState = mongoose.connection.readyState;
    const isDbConnected = dbState === 1;

    const healthData = {
        success: true,
        service: "LifeLink Backend API",
        version: "2.0.0",
        status: isDbConnected ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
            status: dbStateMap[dbState] || "unknown",
            connected: isDbConnected,
            host: isDbConnected ? mongoose.connection.host : null,
            name: isDbConnected ? mongoose.connection.name : null
        },
        environment: process.env.NODE_ENV || "development"
    };

    const httpStatus = isDbConnected ? 200 : 503;
    res.status(httpStatus).json(healthData);
};

module.exports = {
    getHealthStatus
};
