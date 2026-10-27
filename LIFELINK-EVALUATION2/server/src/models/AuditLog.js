
/* =====================================================
   LIFELINK - AUDIT LOG MODEL
   Immutable audit log of high-value clinical & administrative actions
   ===================================================== */

const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            index: true
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        performerEmail: {
            type: String,
            default: ""
        },
        userRole: {
            type: String,
            required: true
        },
        targetEntity: {
            type: String,
            required: true
        },
        targetId: {
            type: String,
            required: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        ipAddress: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: { createdAt: "timestamp", updatedAt: false }
    }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
