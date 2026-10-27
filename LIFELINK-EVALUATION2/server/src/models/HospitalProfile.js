/* =====================================================
   LIFELINK - HOSPITAL PROFILE MODEL
   Represents institutional healthcare providers & blood banks
   ===================================================== */

const mongoose = require("mongoose");

const hospitalProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        institutionName: {
            type: String,
            required: [true, "Institution name is required"],
            trim: true
        },
        registrationNumber: {
            type: String,
            required: [true, "Institutional registration or license number is required"],
            trim: true
        },
        hospitalType: {
            type: String,
            enum: ["General Hospital", "Blood Bank", "Trauma Center", "Specialty Clinic"],
            default: "General Hospital"
        },
        contactPhone: {
            type: String,
            required: [true, "Contact phone is required"],
            trim: true
        },
        officialEmail: {
            type: String,
            required: [true, "Official email is required"],
            trim: true,
            lowercase: true
        },
        zone: {
            type: String,
            required: [true, "Hospital zone is required"],
            enum: ["Zone A", "Zone B", "Zone C", "Zone D"],
            index: true
        },
        address: {
            type: String,
            required: [true, "Hospital address is required"],
            trim: true
        },
        verificationStatus: {
            type: String,
            enum: {
                values: ["unverified_demo", "authorized_institution"],
                message: "Verification status must be 'unverified_demo' or 'authorized_institution'"
            },
            default: "unverified_demo",
            index: true
        },
        verifiedByAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        isDemoAccount: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const HospitalProfile = mongoose.model("HospitalProfile", hospitalProfileSchema);

module.exports = HospitalProfile;
