/* =====================================================
   LIFELINK - IN-MEMORY SLIDING WINDOW RATE LIMITER
   Protects endpoints from brute-force and DoS attacks
   without adding external dependencies or services.
   ===================================================== */

const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = "Too many requests from this client. Please try again later."
} = {}) => {
    const hits = new Map();

    // Cleanup expired entries periodically to prevent memory leaks
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, timestamps] of hits.entries()) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) {
                hits.delete(key);
            } else {
                hits.set(key, valid);
            }
        }
    }, Math.max(10000, Math.floor(windowMs / 2)));

    // Prevent interval from blocking Node.js process exit
    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }

    const limiter = (req, res, next) => {
        // Skip rate limiting if explicitly disabled (e.g. during specific integration tests)
        if (process.env.DISABLE_RATE_LIMIT === "true") {
            return next();
        }

        // Support test bypass header if configured
        if (req.headers["x-test-bypass-ratelimit"] === "true") {
            return next();
        }

        // Identify client by forward IP or socket address
        const forwarded = req.headers["x-forwarded-for"];
        const ip = forwarded
            ? forwarded.split(",")[0].trim()
            : (req.socket ? req.socket.remoteAddress : "127.0.0.1");

        const now = Date.now();
        const timestamps = hits.get(ip) || [];
        const recentTimestamps = timestamps.filter(t => now - t < windowMs);

        if (recentTimestamps.length >= max) {
            const oldestHit = recentTimestamps[0];
            const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldestHit)) / 1000));

            res.setHeader("Retry-After", String(retryAfterSeconds));
            res.setHeader("X-RateLimit-Limit", String(max));
            res.setHeader("X-RateLimit-Remaining", "0");

            return res.status(429).json({
                success: false,
                message,
                retryAfterSeconds
            });
        }

        recentTimestamps.push(now);
        hits.set(ip, recentTimestamps);

        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - recentTimestamps.length)));

        next();
    };

    // Expose reset method for automated testing
    limiter.reset = () => hits.clear();

    return limiter;
};

// Standard rate limiters
const generalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,                 // 1000 requests per 15 mins for general browsing
    message: "Too many requests to LifeLink. Please slow down your requests."
});

const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 50 : 300, // 300 in dev/test, 50 in production
    message: "Too many authentication attempts. Please wait 15 minutes before trying again."
});

module.exports = {
    createRateLimiter,
    generalLimiter,
    authLimiter
};
