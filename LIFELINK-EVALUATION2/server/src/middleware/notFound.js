/* =====================================================
   LIFELINK - 404 NOT FOUND MIDDLEWARE
   ===================================================== */

const notFound = (req, res, next) => {
    const error = new Error(`Resource Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = notFound;
