/* =====================================================
   LIFELINK - USER MODEL
   Manages credentials, authentication, core roles,
   secure password recovery, and account lifecycle
   ===================================================== */

const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"]
        },
        email: {
            type: String,
            required: [true, "Email address is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please provide a valid email address"
            ]
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters long"],
            select: false // Excluded from query results by default for security
        },
        role: {
            type: String,
            enum: {
                values: ["donor", "hospital", "admin"],
                message: "Role must be either 'donor', 'hospital', or 'admin'"
            },
            default: "donor"
        },
        donorProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DonorProfile",
            default: null
        },
        hospitalProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HospitalProfile",
            default: null
        },
        isActive: {
            type: Boolean,
            default: true
        },
        statusReason: {
            type: String,
            default: ""
        },
        statusChangedAt: {
            type: Date,
            default: null
        },
        statusChangedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        resetPasswordToken: {
            type: String,
            select: false,
            default: null
        },
        resetPasswordExpires: {
            type: Date,
            select: false,
            default: null
        },
        lastLogin: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT
userSchema.methods.generateAuthToken = function () {
    const payload = {
        id: this._id,
        role: this.role,
        email: this.email,
        name: this.name
    };

    const { getJwtSecret } = require("../middleware/auth");
    return jwt.sign(
        payload,
        getJwtSecret(),
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
};

// Instance method to generate secure password reset token
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    return resetToken;
};

// Ensure sensitive fields are never serialized to JSON responses
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
