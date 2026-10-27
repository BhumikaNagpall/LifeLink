/* =====================================================
   LIFELINK - DONATION RECORD MODEL
   Distinguishes between self-reported and institutionally verified donations
   ===================================================== */

const mongoose = require("mongoose");

const donationRecordSchema = new mongoose.Schema(
    {
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
        donationDate: {
            type: Date,
            required: [true, "Donation date is required"]
        },
        donationType: {
            type: String,
            enum: ["Whole Blood", "Red Blood Cells", "Platelets", "Plasma"],
            default: "Whole Blood"
        },
        institutionName: {
            type: String,
            default: "LifeLink Coordination Center",
            trim: true
        },
        hospitalProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HospitalProfile",
            default: null
        },
        bloodRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BloodRequest",
            default: null
        },
        status: {
            type: String,
            enum: ["self_reported", "scheduled", "completed", "verified"],
            default: "self_reported",
            index: true
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        notes: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

const DonationRecord = mongoose.model("DonationRecord", donationRecordSchema);

module.exports = DonationRecord;
