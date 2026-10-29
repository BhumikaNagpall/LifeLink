/* =====================================================
   LIFELINK - INVITATION CONTROLLER
   Manages donor outreach, response tracking, inbox, and coordination
   ===================================================== */

const Invitation = require("../models/Invitation");
const BloodRequest = require("../models/BloodRequest");
const DonorProfile = require("../models/DonorProfile");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

// POST /api/invitations/send
// Protected: Verified Hospital or Admin only
const sendInvitation = async (req, res, next) => {
    try {
        const { requestId, donorId, matchScore = 0, matchReasons = [] } = req.body;

        if (!requestId || !donorId) {
            return res.status(400).json({
                success: false,
                message: "Both requestId and donorId are required to send an invitation."
            });
        }

        // Find blood request
        const bloodRequest = await BloodRequest.findOne({
            $or: [{ requestId }, ...(requestId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: requestId }] : [])]
        });

        if (!bloodRequest) {
            return res.status(404).json({
                success: false,
                message: "Blood request not found."
            });
        }

        // Enforce ownership: Hospital must own request unless admin
        if (req.user && req.user.role !== "admin" && bloodRequest.requester && bloodRequest.requester.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You cannot dispatch invitations for requests belonging to another healthcare facility."
            });
        }

        if (bloodRequest.status === "fulfilled" || bloodRequest.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: `Cannot send invitations for a request that is already ${bloodRequest.status}.`
            });
        }

        // Find donor profile
        const donor = await DonorProfile.findOne({
            $or: [{ donorId }, ...(donorId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: donorId }] : [])]
        });

        if (!donor) {
            return res.status(404).json({
                success: false,
                message: "Donor profile not found."
            });
        }

        // Prevent duplicate active invitations for the same donor and request
        const existingInvitation = await Invitation.findOne({
            bloodRequest: bloodRequest._id,
            donorProfile: donor._id,
            status: { $in: ["pending", "accepted"] }
        });

        if (existingInvitation) {
            return res.status(409).json({
                success: false,
                message: `An active invitation has already been dispatched to ${donor.name} for this request (Status: ${existingInvitation.status}).`,
                invitation: existingInvitation
            });
        }

        const invitationId = "INV-" + Date.now();

        const invitation = new Invitation({
            invitationId,
            bloodRequest: bloodRequest._id,
            donorProfile: donor._id,
            donorUser: donor.user,
            hospitalProfile: bloodRequest.hospitalProfile,
            status: "pending",
            matchScore: Number(matchScore) || 0,
            matchReasons: Array.isArray(matchReasons) ? matchReasons : [],
            invitedAt: new Date()
        });

        await invitation.save();

        // Advance request status from 'open' to 'coordinating'
        if (bloodRequest.status === "open") {
            bloodRequest.status = "coordinating";
            await bloodRequest.save();
        }

        // Create Database Notification for the donor
        if (donor.user) {
            await Notification.create({
                recipient: donor.user,
                type: "invitation_new",
                title: `Urgent Donation Invitation: ${bloodRequest.requiredBloodGroup}`,
                message: `${bloodRequest.hospitalName} has invited you to donate for an urgent request in ${bloodRequest.zone}.`,
                referenceId: invitation.invitationId,
                link: "#donors"
            });
        }

        // Audit Log entry
        await AuditLog.create({
            action: "DONOR_INVITATION_SENT",
            performedBy: req.user ? req.user._id : bloodRequest.requester,
            performerEmail: req.user ? req.user.email : "hospital_ops@lifelink.internal",
            userRole: req.user ? req.user.role : "hospital",
            targetEntity: "Invitation",
            targetId: invitationId,
            details: {
                requestId: bloodRequest.requestId,
                donorId: donor.donorId,
                donorName: donor.name,
                matchScore
            }
        });

        logger.info(`Invitation ${invitationId} sent to donor ${donor.donorId} for request ${bloodRequest.requestId} by ${req.user ? req.user.email : "hospital"}`);

        return res.status(201).json({
            success: true,
            message: `Invitation successfully dispatched to ${donor.name}.`,
            invitation: {
                id: invitation.invitationId,
                invitationId: invitation.invitationId,
                requestId: bloodRequest.requestId,
                donorId: donor.donorId,
                donorName: donor.name,
                status: invitation.status,
                matchScore: invitation.matchScore,
                invitedAt: invitation.invitedAt
            }
        });

    } catch (error) {
        logger.error(`Error in sendInvitation: ${error.message}`);
        next(error);
    }
};

// GET /api/invitations/request/:requestId
// Protected: Hospital who owns the request or Admin
const getInvitationsForRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;

        const bloodRequest = await BloodRequest.findOne({
            $or: [{ requestId }, ...(requestId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: requestId }] : [])]
        });

        if (!bloodRequest) {
            return res.status(404).json({
                success: false,
                message: "Blood request not found."
            });
        }

        // Enforce ownership
        if (req.user && req.user.role !== "admin" && bloodRequest.requester && bloodRequest.requester.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to view invitations for requests from other institutions."
            });
        }

        const invitations = await Invitation.find({ bloodRequest: bloodRequest._id })
            .populate("donorProfile", "donorId name bloodGroup zone phone declaredAvailability")
            .sort({ invitedAt: -1 });

        return res.status(200).json({
            success: true,
            requestId: bloodRequest.requestId,
            count: invitations.length,
            invitations: invitations.map(inv => ({
                id: inv.invitationId,
                invitationId: inv.invitationId,
                donor: inv.donorProfile,
                status: inv.status,
                matchScore: inv.matchScore,
                matchReasons: inv.matchReasons,
                invitedAt: inv.invitedAt,
                respondedAt: inv.respondedAt,
                responseNote: inv.responseNote
            }))
        });

    } catch (error) {
        logger.error(`Error in getInvitationsForRequest: ${error.message}`);
        next(error);
    }
};

// GET /api/invitations/inbox
// Protected: Only authenticated donor sees their own invitations
const getDonorInbox = async (req, res, next) => {
    try {
        let query = {};

        if (req.user) {
            if (req.user.role === "donor") {
                // Strict isolation: Donor can ONLY view their own invitations
                let profileId = req.user.donorProfile ? (req.user.donorProfile._id || req.user.donorProfile) : null;
                if (!profileId) {
                    const dp = await DonorProfile.findOne({ user: req.user._id });
                    if (dp) profileId = dp._id;
                }
                if (profileId) {
                    query = { $or: [{ donorProfile: profileId }, { donorUser: req.user._id }] };
                } else {
                    query = { donorUser: req.user._id };
                }
            } else if (req.user.role === "admin") {
                if (!req.query.donorId) {
                    return res.status(400).json({
                        success: false,
                        message: "Administrative inbox query requires an explicit 'donorId' parameter to prevent bulk data exposure."
                    });
                }
                const donor = await DonorProfile.findOne({
                    $or: [{ donorId: req.query.donorId }, ...(req.query.donorId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: req.query.donorId }] : [])]
                });
                if (!donor) {
                    return res.status(404).json({
                        success: false,
                        message: `Donor profile not found for donorId: ${req.query.donorId}`
                    });
                }
                query = { $or: [{ donorProfile: donor._id }, { donorUser: donor.user }] };
            } else if (req.user.role === "hospital") {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: Donor coordination inbox is restricted to volunteer donor accounts."
                });
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: Access restricted."
                });
            }
        } else {
            return res.status(401).json({
                success: false,
                message: "Authentication required to access donor inbox."
            });
        }

        const invitations = await Invitation.find(query)
            .populate("bloodRequest")
            .populate("hospitalProfile", "institutionName contactPhone zone address")
            .sort({ invitedAt: -1 });

        return res.status(200).json({
            success: true,
            count: invitations.length,
            invitations: invitations.map(inv => {
                const reqDoc = inv.bloodRequest || {};
                const hosp = inv.hospitalProfile || {};
                return {
                    id: inv.invitationId,
                    invitationId: inv.invitationId,
                    status: inv.status,
                    invitedAt: inv.invitedAt,
                    respondedAt: inv.respondedAt,
                    responseNote: inv.responseNote,
                    matchScore: inv.matchScore,
                    matchReasons: inv.matchReasons,
                    request: {
                        requestId: reqDoc.requestId || "REQ-UNKNOWN",
                        patientName: reqDoc.patientName,
                        requiredBloodGroup: reqDoc.requiredBloodGroup,
                        requiredComponent: reqDoc.requiredComponent || "Whole Blood",
                        requestedUnits: reqDoc.requestedUnits || 1,
                        urgency: reqDoc.urgency || "Normal",
                        zone: reqDoc.zone || "Zone A",
                        requiredByDate: reqDoc.requiredByDate,
                        hospitalName: reqDoc.hospitalName || hosp.institutionName || "Partner Hospital",
                        hospitalAddress: hosp.address || reqDoc.location
                    }
                };
            })
        });

    } catch (error) {
        logger.error(`Error in getDonorInbox: ${error.message}`);
        next(error);
    }
};

// PATCH /api/invitations/:id/respond
// Protected: Only the invited donor or admin
const respondToInvitation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note = "" } = req.body;

        if (!["accepted", "declined"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Response status must be either 'accepted' or 'declined'."
            });
        }

        const invitation = await Invitation.findOne({
            $or: [{ invitationId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        }).populate("bloodRequest").populate("donorProfile");

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found."
            });
        }

        // Enforce ownership: Donor must be the invite recipient
        if (req.user && req.user.role !== "admin") {
            const isTargetUser = invitation.donorUser && invitation.donorUser.toString() === req.user._id.toString();
            const isTargetProfile = req.user.donorProfile && invitation.donorProfile && invitation.donorProfile._id.toString() === req.user.donorProfile._id.toString();
            if (!isTargetUser && !isTargetProfile) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: You are not authorized to respond to invitations sent to another donor."
                });
            }
        }

        if (invitation.status === "cancelled" || invitation.status === "expired") {
            return res.status(400).json({
                success: false,
                message: `Cannot respond to an invitation that is already ${invitation.status}.`
            });
        }

        const previousStatus = invitation.status;
        invitation.status = status;
        invitation.respondedAt = new Date();
        invitation.responseNote = note.trim();

        await invitation.save();

        // Notification for Hospital Staff
        if (invitation.bloodRequest && invitation.bloodRequest.requester) {
            await Notification.create({
                recipient: invitation.bloodRequest.requester,
                type: "invitation_response",
                title: `Invitation Response: ${invitation.donorProfile?.name || "Donor"} ${status}`,
                message: `Donor responded '${status}' to request ${invitation.bloodRequest.requestId}.${note ? ` Note: "${note}"` : ""}`,
                referenceId: invitation.invitationId,
                link: "#requests"
            });
        }

        // Audit Log
        await AuditLog.create({
            action: `DONOR_INVITATION_${status.toUpperCase()}`,
            performedBy: req.user ? req.user._id : invitation.donorUser,
            performerEmail: req.user ? req.user.email : "donor@lifelink.internal",
            userRole: "donor",
            targetEntity: "Invitation",
            targetId: invitation.invitationId,
            details: {
                requestId: invitation.bloodRequest?.requestId,
                donorId: invitation.donorProfile?.donorId,
                previousStatus,
                newStatus: status,
                note
            }
        });

        logger.info(`Donor ${invitation.donorProfile?.donorId} responded '${status}' to invitation ${invitation.invitationId} by ${req.user ? req.user.email : "donor"}`);

        return res.status(200).json({
            success: true,
            message: `Invitation successfully ${status}. Your response has been synchronized with the healthcare facility.`,
            invitation: {
                id: invitation.invitationId,
                status: invitation.status,
                respondedAt: invitation.respondedAt,
                responseNote: invitation.responseNote
            }
        });

    } catch (error) {
        logger.error(`Error in respondToInvitation: ${error.message}`);
        next(error);
    }
};

module.exports = {
    sendInvitation,
    getInvitationsForRequest,
    getDonorInbox,
    respondToInvitation
};
