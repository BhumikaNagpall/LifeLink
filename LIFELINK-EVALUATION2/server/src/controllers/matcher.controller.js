/* =====================================================
   LIFELINK - MATCHER CONTROLLER
   Exposes algorithmic matching endpoints with clinical disclaimers
   ===================================================== */

const matcherService = require("../services/matcher.service");
const BloodRequest = require("../models/BloodRequest");
const logger = require("../utils/logger");

// POST /api/matcher/find-matches
const findMatchesHandler = async (req, res, next) => {
    try {
        const {
            patientName = "Patient in Need",
            requiredBloodGroup,
            bloodType,
            requiredComponent = "Whole Blood",
            zone = "Zone A",
            urgency = "Normal",
            requestedUnits = 1
        } = req.body;

        const bloodGroup = requiredBloodGroup || bloodType;

        if (!bloodGroup) {
            return res.status(400).json({
                success: false,
                message: "Required blood group is mandatory for donor matching."
            });
        }

        const matchResults = await matcherService.findMatches({
            patientName,
            requiredBloodGroup: bloodGroup,
            requiredComponent,
            zone,
            urgency,
            requestedUnits: Number(requestedUnits) || 1
        });

        logger.info(`Matching executed for ${bloodGroup} in ${zone} (${urgency}) - Found ${matchResults.matchedCount} potential donors`);

        return res.status(200).json({
            success: true,
            ...matchResults
        });

    } catch (error) {
        logger.error(`Error in findMatchesHandler: ${error.message}`);
        next(error);
    }
};

// GET /api/matcher/request/:requestId
const findMatchesForExistingRequest = async (req, res, next) => {
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

        const matchResults = await matcherService.findMatches({
            patientName: bloodRequest.patientName,
            requiredBloodGroup: bloodRequest.requiredBloodGroup,
            requiredComponent: bloodRequest.requiredComponent,
            zone: bloodRequest.zone,
            urgency: bloodRequest.urgency,
            requestedUnits: bloodRequest.requestedUnits
        });

        return res.status(200).json({
            success: true,
            requestId: bloodRequest.requestId,
            ...matchResults
        });

    } catch (error) {
        logger.error(`Error in findMatchesForExistingRequest: ${error.message}`);
        next(error);
    }
};

module.exports = {
    findMatchesHandler,
    findMatchesForExistingRequest
};
