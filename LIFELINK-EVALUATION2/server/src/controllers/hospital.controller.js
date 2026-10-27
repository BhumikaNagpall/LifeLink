/* =====================================================
   LIFELINK - HOSPITAL CONSOLE CONTROLLER
   Manages institutional dashboard statistics, verifications, and audit logs
   ===================================================== */

const BloodRequest = require("../models/BloodRequest");
const Invitation = require("../models/Invitation");
const HospitalProfile = require("../models/HospitalProfile");
const DonorProfile = require("../models/DonorProfile");
const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

// GET /api/hospital/dashboard-stats
// All dashboard figures calculated dynamically from actual MongoDB records
const getHospitalDashboardStats = async (req, res, next) => {
    try {
        let hospitalId = null;

        // If authenticated hospital, scope to their own facility
        if (req.user && req.user.role === "hospital" && req.user.hospitalProfile) {
            hospitalId = req.user.hospitalProfile._id;
        } else if (req.query.hospitalId && req.user && req.user.role === "admin") {
            hospitalId = req.query.hospitalId;
        }

        const requestFilter = hospitalId ? { hospitalProfile: hospitalId } : {};
        const invitationFilter = hospitalId ? { hospitalProfile: hospitalId } : {};

        // Aggregate Request Counts
        const totalRequests = await BloodRequest.countDocuments(requestFilter);
        const openRequests = await BloodRequest.countDocuments({ ...requestFilter, status: "open" });
        const coordinatingRequests = await BloodRequest.countDocuments({ ...requestFilter, status: "coordinating" });
        const urgentRequests = await BloodRequest.countDocuments({
            ...requestFilter,
            urgency: { $in: ["Emergency", "Urgent"] }
        });
        const emergencyRequests = await BloodRequest.countDocuments({
            ...requestFilter,
            urgency: "Emergency"
        });
        const fulfilledRequests = await BloodRequest.countDocuments({
            ...requestFilter,
            status: "fulfilled",
            "outcomeVerification.verified": true
        });
        const cancelledRequests = await BloodRequest.countDocuments({ ...requestFilter, status: "cancelled" });

        // Aggregate Invitation and Response Counts
        const invitationsSent = await Invitation.countDocuments(invitationFilter);
        const responsesAccepted = await Invitation.countDocuments({ ...invitationFilter, status: "accepted" });
        const responsesDeclined = await Invitation.countDocuments({ ...invitationFilter, status: "declined" });
        const invitationsPending = await Invitation.countDocuments({ ...invitationFilter, status: "pending" });
        const totalResponsesReceived = responsesAccepted + responsesDeclined;

        // Calculate Average Response Time (in minutes) for answered invitations
        const answeredInvitations = await Invitation.find({
            ...invitationFilter,
            status: { $in: ["accepted", "declined"] },
            respondedAt: { $ne: null }
        }).select("invitedAt respondedAt");

        let averageResponseTimeMinutes = null;
        if (answeredInvitations.length > 0) {
            const totalDurationMs = answeredInvitations.reduce((acc, inv) => {
                const duration = new Date(inv.respondedAt) - new Date(inv.invitedAt);
                return acc + (duration > 0 ? duration : 0);
            }, 0);
            averageResponseTimeMinutes = Math.round(totalDurationMs / answeredInvitations.length / 60000);
        }

        // Active donors metric
        const totalDonors = await DonorProfile.countDocuments({});
        const availableDonors = await DonorProfile.countDocuments({ declaredAvailability: "available" });

        // Admin metrics
        let pendingHospitals = 0;
        let verifiedHospitals = 0;
        if (req.user && req.user.role === "admin") {
            pendingHospitals = await HospitalProfile.countDocuments({ verificationStatus: "unverified_demo" });
            verifiedHospitals = await HospitalProfile.countDocuments({ verificationStatus: "authorized_institution" });
        }

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics: {
                openRequests,
                coordinatingRequests,
                urgentRequests,
                emergencyRequests,
                totalRequests,
                invitationsSent,
                responsesAccepted,
                responsesDeclined,
                totalResponsesReceived,
                invitationsPending,
                fulfilledRequests,
                cancelledRequests,
                averageResponseTimeMinutes,
                totalDonors,
                availableDonors,
                pendingHospitals,
                verifiedHospitals
            }
        });

    } catch (error) {
        logger.error(`Error in getHospitalDashboardStats: ${error.message}`);
        next(error);
    }
};

// GET /api/hospital/list
// Admin view to inspect all hospitals & pending approvals
const getAllHospitals = async (req, res, next) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) {
            query.verificationStatus = status;
        }

        const hospitals = await HospitalProfile.find(query)
            .populate("user", "name email role createdAt")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: hospitals.length,
            hospitals
        });
    } catch (error) {
        logger.error(`Error in getAllHospitals: ${error.message}`);
        next(error);
    }
};

// GET /api/hospital/profile/:id
const getHospitalProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const profile = await HospitalProfile.findById(id).populate("user", "name email role");

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Hospital profile not found."
            });
        }

        return res.status(200).json({
            success: true,
            profile
        });
    } catch (error) {
        logger.error(`Error in getHospitalProfile: ${error.message}`);
        next(error);
    }
};

// PATCH /api/hospital/:id/verify
// Administrator action to approve/verify hospital accounts
const updateHospitalVerification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const allowedStatuses = ["unverified_demo", "authorized_institution"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: [${allowedStatuses.join(", ")}]`
            });
        }

        const hospital = await HospitalProfile.findById(id);
        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital profile not found."
            });
        }

        const previousStatus = hospital.verificationStatus;
        hospital.verificationStatus = status;
        hospital.verifiedAt = status === "authorized_institution" ? new Date() : null;
        hospital.verifiedByAdmin = req.user ? req.user._id : null;
        hospital.isDemoAccount = status === "unverified_demo";

        await hospital.save();

        // Audit Log entry
        await AuditLog.create({
            action: "HOSPITAL_VERIFICATION_STATUS_CHANGED",
            performedBy: req.user ? req.user._id : hospital.user,
            performerEmail: req.user ? req.user.email : "system@lifelink.internal",
            userRole: req.user ? req.user.role : "admin",
            targetEntity: "HospitalProfile",
            targetId: hospital._id.toString(),
            details: {
                institutionName: hospital.institutionName,
                previousStatus,
                newStatus: status,
                notes: notes || ""
            }
        });

        logger.info(`Hospital ${hospital.institutionName} verification updated to '${status}' by ${req.user ? req.user.email : "admin"}`);

        return res.status(200).json({
            success: true,
            message: `Institutional verification status updated to '${status}'.`,
            hospital
        });

    } catch (error) {
        logger.error(`Error in updateHospitalVerification: ${error.message}`);
        next(error);
    }
};

// GET /api/hospital/audit-logs
// Scoped to authorized staff or admin
const getAuditLogs = async (req, res, next) => {
    try {
        const query = {};

        // If hospital staff, scope logs to their own user ID
        if (req.user.role === "hospital") {
            query.performedBy = req.user._id;
        }

        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .limit(100);

        return res.status(200).json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error) {
        logger.error(`Error in getAuditLogs: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getHospitalDashboardStats,
    getAllHospitals,
    getHospitalProfile,
    updateHospitalVerification,
    getAuditLogs
};
