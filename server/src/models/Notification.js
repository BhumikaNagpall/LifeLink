/* =====================================================
   LIFELINK - NOTIFICATION MODEL
   In-app database-backed notification system
   ===================================================== */

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: [
                "invitation_new",
                "invitation_response",
                "request_status",
                "deadline_escalation",
                "admin_verification",
                "general"
            ],
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        referenceId: {
            type: String,
            default: ""
        },
        link: {
            type: String,
            default: ""
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true
        },
        readAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
