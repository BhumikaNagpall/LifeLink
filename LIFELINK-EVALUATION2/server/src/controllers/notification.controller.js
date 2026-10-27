/* =====================================================
   LIFELINK - NOTIFICATION & ESCALATION CONTROLLER
   Manages in-app notifications, deadline monitoring, and escalation alerts
   ===================================================== */

const Notification = require("../models/Notification");
const BloodRequest = require("../models/BloodRequest");
const Invitation = require("../models/Invitation");
const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

// GET /api/notifications
const getUserNotifications = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to access notifications."
            });
        }

        const userId = req.user._id;

        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        return res.status(200).json({
            success: true,
            unreadCount,
            notifications
        });

    } catch (error) {
        logger.error(`Error in getUserNotifications: ${error.message}`);
        next(error);
    }
};

// PATCH /api/notifications/:id/read
const markNotificationRead = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        // Strict authorization: Only the intended recipient or a platform admin may mark it as read
        if (notification.recipient.toString() !== userId.toString() && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. You cannot modify notifications belonging to other accounts."
            });
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        return res.status(200).json({
            success: true,
            notification
        });

    } catch (error) {
        logger.error(`Error in markNotificationRead: ${error.message}`);
        next(error);
    }
};

// PATCH /api/notifications/mark-all-read
const markAllNotificationsRead = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userId = req.user._id;

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read."
        });

    } catch (error) {
        logger.error(`Error in markAllNotificationsRead: ${error.message}`);
        next(error);
    }
};

// POST /api/notifications/check-escalation
// Evaluates deadlines, pending responses, and marks expired requests
const checkDeadlinesAndEscalate = async (req, res, next) => {
    try {
        const now = new Date();
        const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        let expiredCount = 0;
        let escalatedCount = 0;

        // 1. Scan for requests past deadline that are still open/coordinating
        const overdueRequests = await BloodRequest.find({
            status: { $in: ["open", "coordinating"] },
            requiredByDate: { $lt: now }
        });

        for (const request of overdueRequests) {
            request.status = "expired";
            await request.save();
            expiredCount++;

            // Expire any lingering pending invitations
            await Invitation.updateMany(
                { bloodRequest: request._id, status: "pending" },
                { status: "expired", responseNote: "Request required-by deadline has expired" }
            );

            // Notify requester
            await Notification.create({
                recipient: request.requester,
                type: "request_status",
                title: `Request Expired: ${request.requestId}`,
                message: `Request for ${request.patientName} (${request.requiredBloodGroup}) expired past its deadline. Please follow institutional contingency procurement protocols.`,
                referenceId: request.requestId,
                link: "#requests"
            });

            // Audit Log
            await AuditLog.create({
                action: "BLOOD_REQUEST_EXPIRED",
                performedBy: request.requester,
                performerEmail: "system_scheduler@lifelink.internal",
                userRole: "system",
                targetEntity: "BloodRequest",
                targetId: request.requestId,
                details: {
                    requiredByDate: request.requiredByDate,
                    expiredAt: now
                }
            });

            logger.warn(`Blood request ${request.requestId} marked expired past deadline.`);
        }

        // 2. Scan for active requests approaching deadline (< 4 hours) with zero accepted donors
        const approachingRequests = await BloodRequest.find({
            status: { $in: ["open", "coordinating"] },
            requiredByDate: { $gt: now, $lte: fourHoursFromNow }
        });

        for (const request of approachingRequests) {
            const acceptedInvitationsCount = await Invitation.countDocuments({
                bloodRequest: request._id,
                status: "accepted"
            });

            // If zero donors have accepted and deadline is under 4 hours, escalate!
            if (acceptedInvitationsCount === 0) {
                // Check if escalation notification already sent recently
                const existingAlert = await Notification.findOne({
                    recipient: request.requester,
                    type: "deadline_escalation",
                    referenceId: request.requestId,
                    createdAt: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } // within last 2 hours
                });

                if (!existingAlert) {
                    await Notification.create({
                        recipient: request.requester,
                        type: "deadline_escalation",
                        title: `⚠️ Urgent Escalation Alert: ${request.requestId}`,
                        message: `Request for ${request.patientName} (${request.requiredBloodGroup}) is due within 4 hours with no accepted donor responses. Please activate institutional backup protocol.`,
                        referenceId: request.requestId,
                        link: "#requests"
                    });
                    escalatedCount++;

                    logger.warn(`Escalation alert triggered for urgent request ${request.requestId}`);
                }
            }
        }

        return res.status(200).json({
            success: true,
            timestamp: now.toISOString(),
            expiredRequestsCount: expiredCount,
            escalatedRequestsCount: escalatedCount,
            message: `Evaluated deadlines: ${expiredCount} requests expired, ${escalatedCount} escalation alerts dispatched.`
        });

    } catch (error) {
        logger.error(`Error in checkDeadlinesAndEscalate: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    checkDeadlinesAndEscalate
};
