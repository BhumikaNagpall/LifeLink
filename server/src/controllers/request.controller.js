/* =====================================================
   LIFELINK - BLOOD REQUEST CONTROLLER
   Manages blood coordination requests, validations, and outcome verifications
   ===================================================== */

const BloodRequest = require("../models/BloodRequest");
const HospitalProfile = require("../models/HospitalProfile");
const DonorProfile = require("../models/DonorProfile");
const DonationRecord = require("../models/DonationRecord");
const Invitation = require("../models/Invitation");
const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

// Helper to format request for client compatibility
const formatRequestForClient = (reqDoc, user = null) => {
    const doc = reqDoc.toObject ? reqDoc.toObject({ virtuals: true }) : reqDoc;

    // Check if user is authorized to see private patient details
    const isOwner = user && doc.requester && (user._id.toString() === doc.requester.toString() || user.role === "admin");
    const isHospitalStaff = user && (user.role === "hospital" || user.role === "admin");

    // Public privacy protection: mask full patient name if not the owning hospital or admin
    let displayPatientName = doc.patientName;
    if (!isOwner && !isHospitalStaff) {
        if (doc.patientName && doc.patientName.includes(" ")) {
            const parts = doc.patientName.split(" ");
            displayPatientName = `${parts[0]} ${parts[parts.length - 1][0]}.`;
        } else if (doc.patientName) {
            displayPatientName = `Patient (${doc.zone || "Urgent"})`;
        }
    }

    return {
        id: doc.requestId || doc._id.toString(),
        _id: doc._id,
        requestId: doc.requestId,
        patientName: displayPatientName,
        requiredBloodGroup: doc.requiredBloodGroup,
        bloodType: doc.requiredBloodGroup, // backward compatibility
        requiredComponent: doc.requiredComponent || "Whole Blood",
        requestedUnits: doc.requestedUnits || 1,
        hospitalName: doc.hospitalName,
        hospitalProfile: doc.hospitalProfile,
        zone: doc.zone,
        location: doc.location || doc.zone,
        urgency: doc.urgency,
        requiredByDate: doc.requiredByDate,
        description: isOwner || isHospitalStaff ? (doc.description || "") : "Emergency clinical blood need",
        status: doc.status || "open",
        outcomeVerification: doc.outcomeVerification || { verified: false },
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
    };
};

// POST /api/requests
// Protected: Authorized Hospitals & Admin only (No anonymous fallbacks)
const createBloodRequest = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to create blood requests."
            });
        }

        if (req.user.role !== "hospital" && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Blood requests can only be initiated by verified hospital staff or administrators."
            });
        }

        const {
            patientName,
            requiredBloodGroup,
            bloodType,
            requiredComponent = "Whole Blood",
            requestedUnits = 1,
            zone,
            location,
            urgency = "Normal",
            requiredByDate,
            description = "",
            hospitalName
        } = req.body;

        const bloodGroup = requiredBloodGroup || bloodType;

        // Validation
        if (!patientName || !bloodGroup || !zone) {
            return res.status(400).json({
                success: false,
                message: "Patient name, required blood group, and zone are required."
            });
        }

        const units = Number(requestedUnits);
        if (isNaN(units) || units < 1 || units > 20) {
            return res.status(400).json({
                success: false,
                message: "Requested units must be a valid number between 1 and 20."
            });
        }

        // Validate deadline
        let deadline = requiredByDate ? new Date(requiredByDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (isNaN(deadline.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid required-by date."
            });
        }

        // Resolve hospital info
        let requesterId = req.user._id;
        let hospitalProfileId = req.user.hospitalProfile?._id || null;
        let institutionTitle = hospitalName || req.user.hospitalProfile?.institutionName || "LifeLink Healthcare Facility";

        // If admin creating on behalf of a specific hospital, allow resolving hospitalProfile
        if (req.user.role === "admin" && !hospitalProfileId) {
            const firstHospital = await HospitalProfile.findOne({});
            if (firstHospital) {
                hospitalProfileId = firstHospital._id;
                institutionTitle = hospitalName || firstHospital.institutionName;
            }
        }

        const requestId = "REQ-" + Date.now();

        const bloodRequest = new BloodRequest({
            requestId,
            requester: requesterId,
            hospitalProfile: hospitalProfileId,
            hospitalName: institutionTitle,
            patientName: patientName.trim(),
            requiredBloodGroup: bloodGroup,
            requiredComponent,
            requestedUnits: units,
            zone,
            location: location || zone,
            urgency,
            requiredByDate: deadline,
            description: description.trim(),
            status: "open",
            outcomeVerification: {
                verified: false,
                unitsReceived: 0,
                clinicalNotes: ""
            }
        });

        await bloodRequest.save();

        // Audit Log
        await AuditLog.create({
            action: "BLOOD_REQUEST_CREATED",
            performedBy: requesterId,
            performerEmail: req.user.email,
            userRole: req.user.role,
            targetEntity: "BloodRequest",
            targetId: requestId,
            details: {
                patientName: bloodRequest.patientName,
                requiredBloodGroup: bloodRequest.requiredBloodGroup,
                units: bloodRequest.requestedUnits,
                urgency: bloodRequest.urgency,
                zone: bloodRequest.zone
            }
        });

        logger.info(`Blood request created: ${requestId} by ${req.user.email} (${bloodRequest.urgency})`);

        return res.status(201).json({
            success: true,
            message: "Blood request broadcast successfully.",
            request: formatRequestForClient(bloodRequest, req.user)
        });

    } catch (error) {
        logger.error(`Error in createBloodRequest: ${error.message}`);
        next(error);
    }
};

// GET /api/requests
// Public / Authenticated list with query filters
const getAllRequests = async (req, res, next) => {
    try {
        const { urgency, bloodGroup, status, zone, search, hospitalId } = req.query;

        const query = {};

        if (urgency && urgency !== "all") {
            query.urgency = urgency;
        }

        if (bloodGroup && bloodGroup !== "all") {
            query.requiredBloodGroup = bloodGroup;
        }

        if (status && status !== "all") {
            query.status = status;
        }

        if (zone && zone !== "all") {
            query.zone = zone;
        }

        if (hospitalId) {
            query.hospitalProfile = hospitalId;
        }

        if (search) {
            query.$or = [
                { patientName: { $regex: search.trim(), $options: "i" } },
                { requestId: { $regex: search.trim(), $options: "i" } },
                { hospitalName: { $regex: search.trim(), $options: "i" } }
            ];
        }

        const requests = await BloodRequest.find(query).sort({ createdAt: -1 });

        // Sort by Priority: Emergency > Urgent > Normal
        const priorityOrder = { Emergency: 3, Urgent: 2, Normal: 1 };
        requests.sort((a, b) => {
            const pDiff = (priorityOrder[b.urgency] || 0) - (priorityOrder[a.urgency] || 0);
            if (pDiff !== 0) return pDiff;
            return new Date(a.requiredByDate) - new Date(b.requiredByDate);
        });

        const formatted = requests.map(r => formatRequestForClient(r, req.user));

        return res.status(200).json({
            success: true,
            count: formatted.length,
            requests: formatted
        });

    } catch (error) {
        logger.error(`Error in getAllRequests: ${error.message}`);
        next(error);
    }
};

// GET /api/requests/:id
const getRequestById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const bloodRequest = await BloodRequest.findOne({
            $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        }).populate("hospitalProfile");

        if (!bloodRequest) {
            return res.status(404).json({
                success: false,
                message: "Blood request not found."
            });
        }

        // Only include linked invitations for the owning hospital or admin
        let invitations = [];
        const isAuthorized = req.user && (
            req.user.role === "admin" ||
            (bloodRequest.requester && req.user._id.toString() === bloodRequest.requester.toString())
        );

        if (isAuthorized) {
            invitations = await Invitation.find({ bloodRequest: bloodRequest._id })
                .populate("donorProfile", "donorId name bloodGroup zone phone declaredAvailability");
        }

        return res.status(200).json({
            success: true,
            request: formatRequestForClient(bloodRequest, req.user),
            invitations
        });

    } catch (error) {
        logger.error(`Error in getRequestById: ${error.message}`);
        next(error);
    }
};

// PATCH /api/requests/:id
// Protected: Only owning hospital or admin
const updateBloodRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { patientName, requestedUnits, urgency, requiredByDate, description, zone } = req.body;

        const bloodRequest = await BloodRequest.findOne({
            $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!bloodRequest) {
            return res.status(404).json({
                success: false,
                message: "Blood request not found."
            });
        }

        // Enforce ownership
        if (req.user.role !== "admin" && bloodRequest.requester && bloodRequest.requester.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to modify requests created by another hospital."
            });
        }

        if (bloodRequest.status === "fulfilled") {
            return res.status(400).json({
                success: false,
                message: "Cannot modify a blood request that has already been verified and fulfilled."
            });
        }

        if (patientName) bloodRequest.patientName = patientName.trim();
        if (requestedUnits) bloodRequest.requestedUnits = Number(requestedUnits);
        if (urgency) bloodRequest.urgency = urgency;
        if (requiredByDate) bloodRequest.requiredByDate = new Date(requiredByDate);
        if (description !== undefined) bloodRequest.description = description.trim();
        if (zone) bloodRequest.zone = zone;

        await bloodRequest.save();

        logger.info(`Blood request updated: ${bloodRequest.requestId} by ${req.user.email}`);

        return res.status(200).json({
            success: true,
            message: "Blood request updated successfully.",
            request: formatRequestForClient(bloodRequest, req.user)
        });

    } catch (error) {
        logger.error(`Error in updateBloodRequest: ${error.message}`);
        next(error);
    }
};

// POST /api/requests/:id/cancel
// Protected: Only owning hospital or admin
const cancelBloodRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const bloodRequest = await BloodRequest.findOne({
            $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!bloodRequest) {
            return res.status(404).json({
                success: false,
                message: "Blood request not found."
            });
        }

        // Enforce ownership
        if (req.user.role !== "admin" && bloodRequest.requester && bloodRequest.requester.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You cannot cancel blood requests belonging to another hospital."
            });
        }

        if (bloodRequest.status === "fulfilled") {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a blood request that has already been fulfilled."
            });
        }

        bloodRequest.status = "cancelled";
        await bloodRequest.save();

        // Cancel pending invitations
        await Invitation.updateMany(
            { bloodRequest: bloodRequest._id, status: "pending" },
            { status: "cancelled", responseNote: reason || "Request cancelled by hospital" }
        );

        // Audit Log
        await AuditLog.create({
            action: "BLOOD_REQUEST_CANCELLED",
            performedBy: req.user._id,
            performerEmail: req.user.email,
            userRole: req.user.role,
            targetEntity: "BloodRequest",
            targetId: bloodRequest.requestId,
            details: { reason: reason || "Hospital cancellation" }
        });

        logger.info(`Blood request cancelled: ${bloodRequest.requestId} by ${req.user.email}`);

        return res.status(200).json({
            success: true,
            message: "Blood request has been cancelled.",
            request: formatRequestForClient(bloodRequest, req.user)
        });

    } catch (error) {
        logger.error(`Error in cancelBloodRequest: ${error.message}`);
        next(error);
    }
};

// POST /api/requests/:id/fulfill
// Mandatory outcome verification step
// Protected: Authorized hospital or admin only
const fulfillBloodRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { donorId, unitsReceived = 1, clinicalNotes = "" } = req.body;

        const bloodRequest = await BloodRequest.findOne({
            $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!bloodRequest) {
            return res.status(404).json({
                success: false,
                message: "Blood request not found."
            });
        }

        // Enforce ownership
        if (req.user.role !== "admin" && bloodRequest.requester && bloodRequest.requester.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to fulfill requests created by another hospital."
            });
        }

        if (bloodRequest.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cannot fulfill a cancelled blood request."
            });
        }

        if (bloodRequest.status === "fulfilled") {
            return res.status(400).json({
                success: false,
                message: "This blood request has already been verified and fulfilled."
            });
        }

        // Record verification outcome
        bloodRequest.status = "fulfilled";
        bloodRequest.outcomeVerification = {
            verified: true,
            verifiedBy: req.user._id,
            verifiedAt: new Date(),
            unitsReceived: Number(unitsReceived),
            clinicalNotes: clinicalNotes.trim()
        };

        // If donorId is specified, record official donation and trigger recovery cooldown
        let linkedDonor = null;
        if (donorId) {
            linkedDonor = await DonorProfile.findOne({
                $or: [{ donorId: donorId }, ...(donorId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: donorId }] : [])]
            });

            if (linkedDonor) {
                // Create donation record
                const donationRecord = new DonationRecord({
                    donorProfile: linkedDonor._id,
                    donorUser: linkedDonor.user || req.user._id,
                    bloodRequest: bloodRequest._id,
                    donorId: linkedDonor.donorId,
                    donorName: linkedDonor.name,
                    hospitalProfile: bloodRequest.hospitalProfile,
                    hospitalName: bloodRequest.hospitalName,
                    bloodGroup: bloodRequest.requiredBloodGroup,
                    unitsDonated: Number(unitsReceived),
                    donationDate: new Date(),
                    status: "verified",
                    notes: clinicalNotes || "Fulfilled via LifeLink verified emergency coordination"
                });
                await donationRecord.save();

                // Update donor cooldown & totals
                linkedDonor.lastDonationDate = new Date();
                linkedDonor.totalDonations = (linkedDonor.totalDonations || 0) + Number(unitsReceived);
                linkedDonor.declaredAvailability = "temporarily_unavailable";
                await linkedDonor.save();

                bloodRequest.fulfilledByDonor = linkedDonor._id;
            }
        }

        await bloodRequest.save();

        // Audit Log
        await AuditLog.create({
            action: "BLOOD_REQUEST_FULFILLED_VERIFIED",
            performedBy: req.user._id,
            performerEmail: req.user.email,
            userRole: req.user.role,
            targetEntity: "BloodRequest",
            targetId: bloodRequest.requestId,
            details: {
                unitsReceived,
                clinicalNotes,
                patientName: bloodRequest.patientName,
                donorId: linkedDonor ? linkedDonor.donorId : "Unspecified"
            }
        });

        logger.info(`Blood request marked fulfilled with verification: ${bloodRequest.requestId} (${unitsReceived} units) by ${req.user.email}`);

        return res.status(200).json({
            success: true,
            message: "Request marked fulfilled following authorized outcome verification.",
            request: formatRequestForClient(bloodRequest, req.user)
        });

    } catch (error) {
        logger.error(`Error in fulfillBloodRequest: ${error.message}`);
        next(error);
    }
};

// DELETE /api/requests/:id
// Protected: Admin only
const deleteBloodRequest = async (req, res, next) => {
    try {
        const { id } = req.params;

        const bloodRequest = await BloodRequest.findOne({
            $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!bloodRequest) {
            return res.status(404).json({
                success: false,
                message: "Blood request not found."
            });
        }

        // Delete associated invitations
        await Invitation.deleteMany({ bloodRequest: bloodRequest._id });

        // Delete request document
        await BloodRequest.findByIdAndDelete(bloodRequest._id);

        // Audit Log
        await AuditLog.create({
            action: "BLOOD_REQUEST_DELETED_BY_ADMIN",
            performedBy: req.user._id,
            performerEmail: req.user.email,
            userRole: req.user.role,
            targetEntity: "BloodRequest",
            targetId: bloodRequest.requestId,
            details: { patientName: bloodRequest.patientName }
        });

        logger.info(`Blood request deleted: ${bloodRequest.requestId} by admin ${req.user.email}`);

        return res.status(200).json({
            success: true,
            message: `Blood request for '${bloodRequest.patientName}' deleted successfully.`
        });

    } catch (error) {
        logger.error(`Error in deleteBloodRequest: ${error.message}`);
        next(error);
    }
};

module.exports = {
    createBloodRequest,
    getAllRequests,
    getRequestById,
    updateBloodRequest,
    cancelBloodRequest,
    fulfillBloodRequest,
    deleteBloodRequest
};
