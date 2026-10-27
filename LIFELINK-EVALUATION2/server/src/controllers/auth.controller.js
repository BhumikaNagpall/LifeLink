/* =====================================================
   LIFELINK - AUTHENTICATION CONTROLLER
   Handles registration, login, profile retrieval, and session verification
   ===================================================== */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DonorProfile = require("../models/DonorProfile");
const HospitalProfile = require("../models/HospitalProfile");
const RevokedToken = require("../models/RevokedToken");
const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const {
            name,
            email,
            password,
            role = "donor",
            // Donor profile details (optional during initial sign up)
            phone,
            bloodGroup,
            age,
            weight,
            height,
            zone,
            // Hospital profile details (required if role is hospital)
            institutionName,
            registrationNumber,
            hospitalType,
            contactPhone,
            address
        } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        // Normalize and validate role
        let targetRole = "donor";
        if (role === "hospital" || role === "hospital_staff") {
            targetRole = "hospital";
        } else if (role === "donor") {
            targetRole = "donor";
        } else if (role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator accounts cannot be created via standard self-registration."
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Invalid account role '${role}'. Supported roles are 'donor' and 'hospital'.`
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check for existing user
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email address already exists."
            });
        }

        // Create base User
        const user = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: password,
            role: targetRole
        });

        await user.save();

        let linkedProfile = null;

        // Wrap linked profile creation in safe rollback to prevent orphaned User records
        try {
            // If registering as a Donor, create corresponding DonorProfile
            if (user.role === "donor") {
                const donorId = "DNR-" + Date.now();
                const donorProfile = new DonorProfile({
                    user: user._id,
                    donorId: donorId,
                    name: user.name,
                    phone: phone ? String(phone).trim() : "Not provided",
                    bloodGroup: bloodGroup || "O+",
                    bloodType: bloodGroup || "O+",
                    age: age ? Number(age) : 25,
                    weight: weight ? Number(weight) : 60,
                    height: height ? String(height) : "",
                    zone: zone || "Zone A",
                    declaredAvailability: "available",
                    firstTime: "no",
                    healthy: true,
                    medicalCondition: false,
                    medication: "no",
                    medicationDetails: null
                });

                await donorProfile.save();
                user.donorProfile = donorProfile._id;
                await user.save();
                linkedProfile = donorProfile;
            }

            // If registering as a Hospital, create corresponding HospitalProfile
            if (user.role === "hospital") {
                const effectiveInstitution = institutionName
                    ? institutionName.trim()
                    : (name.includes("Hospital") || name.includes("Clinic") ? name.trim() : `${name.trim()} Medical Facility`);
                const effectiveReg = registrationNumber ? registrationNumber.trim() : "REG-PENDING-" + Date.now();
                const effectivePhone = contactPhone ? contactPhone.trim() : (phone ? String(phone).trim() : "+91 22 2000 0000");
                const effectiveZone = zone || "Zone A";
                const effectiveAddress = address ? address.trim() : "Address Pending Verification";

                const hospitalProfile = new HospitalProfile({
                    user: user._id,
                    institutionName: effectiveInstitution,
                    registrationNumber: effectiveReg,
                    hospitalType: hospitalType || "General Hospital",
                    contactPhone: effectivePhone,
                    officialEmail: normalizedEmail,
                    zone: effectiveZone,
                    address: effectiveAddress,
                    verificationStatus: "unverified_demo", // Explicit verification workflow
                    isDemoAccount: true
                });

                await hospitalProfile.save();
                user.hospitalProfile = hospitalProfile._id;
                await user.save();
                linkedProfile = hospitalProfile;
            }
        } catch (profileError) {
            // Safe cleanup of base user on profile failure
            await User.findByIdAndDelete(user._id);
            logger.error(`Profile creation failed during registration. Cleaned up user record ${user._id}: ${profileError.message}`);
            throw profileError;
        }

        const token = user.generateAuthToken();

        logger.info(`New user registered: ${user.email} with role '${user.role}'`);

        return res.status(201).json({
            success: true,
            message: "Account registered successfully.",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            profile: linkedProfile
        });

    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        next(error);
    }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide both email and password."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Query user and explicitly select password field
        const user = await User.findOne({ email: normalizedEmail })
            .select("+password")
            .populate("donorProfile")
            .populate("hospitalProfile");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "This account has been deactivated. Please contact an administrator."
            });
        }

        // Update last login timestamp
        user.lastLogin = new Date();
        await user.save();

        const token = user.generateAuthToken();

        logger.info(`User logged in: ${user.email} (${user.role})`);

        return res.status(200).json({
            success: true,
            message: "Authentication successful.",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin
            },
            profile: user.donorProfile || user.hospitalProfile || null
        });

    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        next(error);
    }
};

// GET /api/auth/me
// const getMe = async (req, res) => {
//     return res.status(200).json({
//         success: true,
//         user: {
//             id: req.user._id,
//             name: req.user.name,
//             email: req.user.email,
//             role: req.user.role,
//             createdAt: req.user.createdAt,
//             lastLogin: req.user.lastLogin
//         },
//         profile: req.user.donorProfile || req.user.hospitalProfile || null
//     });
// };


 // GET /api/auth/me
const getMe = async (req, res) => {
    const user = req.user;
    let profile = null;

    if (user.role === "hospital") {
        profile = await HospitalProfile.findOne({ user: user._id });
    } else if (user.role === "donor") {
        profile = await DonorProfile.findOne({ user: user._id });
    }

    return res.status(200).json({
        success: true,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        },
        profile
    });
};


// PATCH /api/auth/me/profile
// Allows authenticated users to update their own permitted profile fields
const updateMyProfile = async (req, res, next) => {
    try {
        const user = req.user;
        const {
            name,
            phone,
            weight,
            height,
            zone,
            declaredAvailability,
            institutionName,
            contactPhone,
            address
        } = req.body;

        // User name update
        if (name && name.trim()) {
            user.name = name.trim();
            await user.save();
        }

        let updatedProfile = null;

        if (user.role === "donor" && user.donorProfile) {
            const donor = await DonorProfile.findById(user.donorProfile._id || user.donorProfile);
            if (donor) {
                if (name && name.trim()) donor.name = name.trim();
                if (phone) donor.phone = String(phone).trim();
                if (weight && !isNaN(Number(weight))) donor.weight = Number(weight);
                if (height) donor.height = String(height).trim();
                if (zone && ["Zone A", "Zone B", "Zone C", "Zone D"].includes(zone)) donor.zone = zone;
                if (declaredAvailability && ["available", "temporarily_unavailable", "paused", "unconfirmed"].includes(declaredAvailability)) {
                    donor.declaredAvailability = declaredAvailability;
                }
                await donor.save();
                updatedProfile = donor;
            }
        } else if (user.role === "hospital" && user.hospitalProfile) {
            const hospital = await HospitalProfile.findById(user.hospitalProfile._id || user.hospitalProfile);
            if (hospital) {
                if (institutionName && institutionName.trim()) hospital.institutionName = institutionName.trim();
                if (contactPhone) hospital.contactPhone = String(contactPhone).trim();
                if (address) hospital.address = String(address).trim();
                if (zone && ["Zone A", "Zone B", "Zone C", "Zone D"].includes(zone)) hospital.zone = zone;
                await hospital.save();
                updatedProfile = hospital;
            }
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            profile: updatedProfile || user.donorProfile || user.hospitalProfile || null
        });

    } catch (error) {
        logger.error(`Error in updateMyProfile: ${error.message}`);
        next(error);
    }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
    try {
        const token = req.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
        if (token) {
            const decoded = req.tokenDecoded || jwt.decode(token);
            const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
            await RevokedToken.findOneAndUpdate(
                { token },
                { token, user: req.user?._id, expiresAt },
                { upsert: true }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });
    } catch (err) {
        logger.error(`Error during token revocation on logout: ${err.message}`);
        next(err);
    }
};

// POST /api/auth/forgot-password
// Generates high-entropy reset token and saves with 1-hour expiry
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail, isActive: true });

        // Safe response to prevent account enumeration
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account associated with that email exists, password recovery instructions have been dispatched."
            });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Audit Trail
        await AuditLog.create({
            action: "PASSWORD_RESET_REQUESTED",
            performedBy: user._id,
            performerEmail: user.email,
            userRole: user.role,
            targetEntity: "User",
            targetId: user._id.toString(),
            details: {
                email: user.email,
                expiresIn: "1 hour"
            }
        });

        logger.info(`Password reset token generated for ${user.email}`);

        // In non-production or testing environments, surface resetToken for automation
        const isNonProd = process.env.NODE_ENV !== "production";

        return res.status(200).json({
            success: true,
            message: "If an account associated with that email exists, password recovery instructions have been dispatched.",
            ...(isNonProd ? { resetToken, expiresAt: user.resetPasswordExpires } : {})
        });

    } catch (error) {
        logger.error(`Error in forgotPassword: ${error.message}`);
        next(error);
    }
};

// POST /api/auth/reset-password
// Validates token, hashes new password with bcrypt, clears reset state
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Both reset token and new password are required."
            });
        }

        if (String(newPassword).length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long."
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
            isActive: true
        }).select("+password +resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Password reset token is invalid or has expired."
            });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Audit Trail
        await AuditLog.create({
            action: "PASSWORD_RESET_COMPLETED",
            performedBy: user._id,
            performerEmail: user.email,
            userRole: user.role,
            targetEntity: "User",
            targetId: user._id.toString(),
            details: {
                email: user.email
            }
        });

        logger.info(`Password successfully reset for ${user.email}`);

        return res.status(200).json({
            success: true,
            message: "Password has been successfully reset. You may now log in with your new credentials."
        });

    } catch (error) {
        logger.error(`Error in resetPassword: ${error.message}`);
        next(error);
    }
};

// PATCH /api/auth/users/:id/status
// Admin-only account suspension / reactivation
const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isActive, reason = "" } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "The 'isActive' field must be a boolean (true or false)."
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Prevent admin from deactivating themselves
        if (req.user && req.user._id.toString() === user._id.toString() && !isActive) {
            return res.status(400).json({
                success: false,
                message: "Administrators cannot suspend their own account."
            });
        }

        user.isActive = isActive;
        user.statusReason = reason.trim();
        user.statusChangedAt = new Date();
        user.statusChangedBy = req.user ? req.user._id : null;
        await user.save();

        // Audit Trail
        await AuditLog.create({
            action: isActive ? "ACCOUNT_REACTIVATED" : "ACCOUNT_SUSPENDED",
            performedBy: req.user ? req.user._id : null,
            performerEmail: req.user ? req.user.email : "system_admin",
            userRole: "admin",
            targetEntity: "User",
            targetId: user._id.toString(),
            details: {
                targetEmail: user.email,
                targetRole: user.role,
                isActive,
                reason: reason.trim()
            }
        });

        logger.info(`User ${user.email} status updated to isActive=${isActive} by admin`);

        return res.status(200).json({
            success: true,
            message: `User account ${isActive ? "activated" : "suspended"} successfully.`,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                statusReason: user.statusReason
            }
        });

    } catch (error) {
        logger.error(`Error in updateUserStatus: ${error.message}`);
        next(error);
    }
};

// GET /api/auth/users
// Admin-only user directory listing
const listUsers = async (req, res, next) => {
    try {
        const { role, isActive, limit = 50, page = 1 } = req.query;

        const query = {};
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === "true";

        const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));

        const users = await User.find(query)
            .select("-password -resetPasswordToken -resetPasswordExpires")
            .populate("donorProfile", "donorId bloodGroup zone declaredAvailability")
            .populate("hospitalProfile", "institutionName registrationNumber verificationStatus zone")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Math.min(100, Number(limit)));

        const total = await User.countDocuments(query);

        return res.status(200).json({
            success: true,
            total,
            count: users.length,
            users
        });

    } catch (error) {
        logger.error(`Error in listUsers: ${error.message}`);
        next(error);
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateMyProfile,
    logout,
    forgotPassword,
    resetPassword,
    updateUserStatus,
    listUsers
};
