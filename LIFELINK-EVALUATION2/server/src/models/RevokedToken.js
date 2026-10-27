/* =====================================================
   LIFELINK - REVOKED TOKEN MODEL
   Stores invalidated JWT tokens with automatic TTL expiration
   ===================================================== */

const mongoose = require("mongoose");

const revokedTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 } // MongoDB TTL index: automatically deletes expired documents
        }
    },
    {
        timestamps: true
    }
);

const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);

module.exports = RevokedToken;
