/* =====================================================
   LIFELINK - INVITATION MODEL
   Tracks donor outreach, response states, and timelines
   ===================================================== */

const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
    {
        invitationId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        bloodRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BloodRequest",
            required: true,
            index: true
        },
        donorProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DonorProfile",
            required: true,
            index: true
        },
        donorUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        hospitalProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HospitalProfile",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined", "expired", "cancelled"],
            default: "pending",
            index: true
        },
        matchScore: {
            type: Number,
            default: 0
        },
        matchReasons: {
            type: [String],
            default: []
        },
        invitedAt: {
            type: Date,
            default: Date.now
        },
        respondedAt: {
            type: Date,
            default: null
        },
        responseNote: {
            type: String,
            default: ""
        },
        reminderCount: {
            type: Number,
            default: 0
        },
        lastReminderAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Prevent sending duplicate active invitations for the same request and donor
invitationSchema.index({ bloodRequest: 1, donorProfile: 1 }, { unique: true });

const Invitation = mongoose.model("Invitation", invitationSchema);

module.exports = Invitation;
