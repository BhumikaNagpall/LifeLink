/* =====================================================
   LIFELINK - DONOR PROFILE MODEL
   Captures demographic, health eligibility, and availability state
   ===================================================== */

const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true },
        purpose: { type: String, trim: true },
        dosage: { type: String, trim: true },
        duration: { type: String, trim: true }
    },
    { _id: false }
);

const donorProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        donorId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: [true, "Donor name is required"],
            trim: true
        },
        phone: {
            type: String,
            required: [true, "Contact telephone is required"],
            trim: true
        },
        bloodGroup: {
            type: String,
            required: [true, "Blood group is required"],
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
            index: true
        },
        bloodType: {
            type: String, // Mirror for frontend backward compatibility
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
        },
        age: {
            type: Number,
            required: [true, "Age is required"],
            min: [18, "Donor must be at least 18 years old"],
            max: [75, "Donor cannot exceed 75 years old"]
        },
        weight: {
            type: Number,
            required: [true, "Weight is required"],
            min: [45, "Donor weight must be at least 45 kg"]
        },
        height: {
            type: String,
            default: ""
        },
        zone: {
            type: String,
            required: [true, "Zone location is required"],
            enum: ["Zone A", "Zone B", "Zone C", "Zone D"],
            index: true
        },
        declaredAvailability: {
            type: String,
            enum: {
                values: ["available", "temporarily_unavailable", "paused", "unconfirmed"],
                message: "Availability must be 'available', 'temporarily_unavailable', 'paused', or 'unconfirmed'"
            },
            default: "available",
            index: true
        },
        firstTime: {
            type: String,
            enum: ["yes", "no"],
            default: "no"
        },
        healthy: {
            type: Boolean,
            default: true
        },
        medicalCondition: {
            type: Boolean,
            default: false
        },
        medication: {
            type: String,
            enum: ["yes", "no"],
            default: "no"
        },
        medicationDetails: {
            type: medicationSchema,
            default: null
        },
        lastDonationDate: {
            type: Date,
            default: null
        },
        profileVerificationStatus: {
            type: String,
            enum: ["self_reported", "verified_donor"],
            default: "self_reported"
        },
        consentGiven: {
            type: Boolean,
            default: true
        },
        consentGivenAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Synchronize bloodType with bloodGroup on save
donorProfileSchema.pre("save", function (next) {
    if (this.bloodGroup) {
        this.bloodType = this.bloodGroup;
    }
    next();
});

// Virtual property: cooldownDaysRemaining
donorProfileSchema.virtual("cooldownDaysRemaining").get(function () {
    if (!this.lastDonationDate) return 0;
    const last = new Date(this.lastDonationDate);
    const today = new Date();
    last.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    return Math.max(0, 90 - diffDays);
});

// Virtual property: isEligible (preliminary coordination check)
donorProfileSchema.virtual("isEligible").get(function () {
    if (this.age < 18 || this.age > 75) return false;
    if (this.weight < 45) return false;
    if (this.healthy === false) return false;
    if (this.medicalCondition === true) return false;
    if (this.declaredAvailability !== "available") return false;
    if (this.cooldownDaysRemaining > 0) return false;
    return true;
});

const DonorProfile = mongoose.model("DonorProfile", donorProfileSchema);

module.exports = DonorProfile;
