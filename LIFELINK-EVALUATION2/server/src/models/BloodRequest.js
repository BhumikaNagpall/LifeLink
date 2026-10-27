/* =====================================================
   LIFELINK - BLOOD REQUEST MODEL
   Represents clinical blood coordination requests
   ===================================================== */

const mongoose = require("mongoose");

const outcomeVerificationSchema = new mongoose.Schema(
    {
        verified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        verifiedAt: { type: Date, default: null },
        unitsReceived: { type: Number, default: 0 },
        clinicalNotes: { type: String, default: "" }
    },
    { _id: false }
);

const bloodRequestSchema = new mongoose.Schema(
    {
        requestId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        hospitalProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HospitalProfile",
            required: true
        },
        hospitalName: {
            type: String,
            required: [true, "Hospital or facility name is required"],
            trim: true
        },
        patientName: {
            type: String,
            required: [true, "Patient reference or name is required"],
            trim: true
        },
        requiredBloodGroup: {
            type: String,
            required: [true, "Blood group is required"],
            enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
            index: true
        },
        requiredComponent: {
            type: String,
            enum: ["Whole Blood", "Red Blood Cells", "Platelets", "Plasma"],
            default: "Whole Blood"
        },
        requestedUnits: {
            type: Number,
            required: [true, "Requested quantity in units is required"],
            min: [1, "Quantity must be at least 1 unit"],
            max: [20, "Quantity cannot exceed 20 units per single request"],
            default: 1
        },
        zone: {
            type: String,
            required: [true, "Target zone is required"],
            enum: ["Zone A", "Zone B", "Zone C", "Zone D"],
            index: true
        },
        location: {
            type: String,
            default: ""
        },
        urgency: {
            type: String,
            enum: ["Emergency", "Urgent", "Normal"],
            default: "Normal",
            index: true
        },
        requiredByDate: {
            type: Date,
            required: [true, "Required-by deadline is required"]
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        status: {
            type: String,
            enum: ["open", "coordinating", "fulfilled", "cancelled", "expired"],
            default: "open",
            index: true
        },
        outcomeVerification: {
            type: outcomeVerificationSchema,
            default: () => ({})
        }
    },
    {
        timestamps: true
    }
);

// Virtual property for backward compatibility with frontend
bloodRequestSchema.virtual("bloodType").get(function () {
    return this.requiredBloodGroup;
});

const BloodRequest = mongoose.model("BloodRequest", bloodRequestSchema);

module.exports = BloodRequest;
