/* =====================================================
   LIFELINK - DONOR CONTROLLER
   Manages donor directory, registration wizard, availability, and history
   ===================================================== */

const DonorProfile = require("../models/DonorProfile");
const DonationRecord = require("../models/DonationRecord");
const User = require("../models/User");
const logger = require("../utils/logger");

// Helper to format donor document for frontend compatibility with privacy masking
const formatDonorForClient = (donor, donationHistory = [], reqUser = null) => {
    const doc = donor.toObject ? donor.toObject({ virtuals: true }) : donor;

    // Check if requester is permitted to see full phone number
    const isSelf = reqUser && donor.user && reqUser._id.toString() === donor.user.toString();
    const isStaffOrAdmin = reqUser && (reqUser.role === "hospital" || reqUser.role === "admin");

    let phoneToDisplay = doc.phone || "Not provided";
    if (!isSelf && !isStaffOrAdmin && phoneToDisplay !== "Not provided" && phoneToDisplay.length > 5) {
        phoneToDisplay = phoneToDisplay.slice(0, 3) + "****" + phoneToDisplay.slice(-3);
    }

    return {
        id: doc.donorId || doc._id.toString(),
        _id: doc._id,
        donorId: doc.donorId,
        name: doc.name,
        phone: phoneToDisplay,
        bloodGroup: doc.bloodGroup,
        bloodType: doc.bloodGroup,
        age: doc.age,
        weight: doc.weight,
        height: doc.height,
        zone: doc.zone,
        declaredAvailability: doc.declaredAvailability || "available",
        firstTime: doc.firstTime,
        healthy: doc.healthy,
        medicalCondition: doc.medicalCondition,
        medication: doc.medication,
        medicationDetails: doc.medicationDetails,
        lastDonation: doc.lastDonationDate,
        cooldown: doc.cooldownDaysRemaining || 0,
        eligible: doc.isEligible !== undefined ? doc.isEligible : true,
        donationHistory: donationHistory.map(d => ({
            id: d._id,
            date: d.donationDate,
            type: d.donationType,
            status: d.status,
            institutionName: d.institutionName
        })),
        createdAt: doc.createdAt
    };
};

// GET /api/donors
const getAllDonors = async (req, res, next) => {
    try {
        const { search, bloodGroup, zone, eligibility, availability } = req.query;

        const query = {};

        if (search) {
            query.name = { $regex: search.trim(), $options: "i" };
        }

        if (bloodGroup && bloodGroup !== "all") {
            query.bloodGroup = bloodGroup;
        }

        if (zone && zone !== "all") {
            query.zone = zone;
        }

        if (availability && availability !== "all") {
            query.declaredAvailability = availability;
        }

        const donors = await DonorProfile.find(query).sort({ createdAt: -1 });

        // Filter for eligibility if specified in query
        let results = donors;
        if (eligibility === "eligible") {
            results = results.filter(d => d.isEligible);
        } else if (eligibility === "cooldown") {
            results = results.filter(d => d.cooldownDaysRemaining > 0);
        }

        // Fetch recent donation histories in batch
        const donorIds = results.map(d => d._id);
        const allDonations = await DonationRecord.find({ donorProfile: { $in: donorIds } })
            .sort({ donationDate: -1 });

        const donationMap = {};
        allDonations.forEach(d => {
            const key = d.donorProfile.toString();
            if (!donationMap[key]) donationMap[key] = [];
            donationMap[key].push(d);
        });

        const formatted = results.map(donor => {
            const history = donationMap[donor._id.toString()] || [];
            return formatDonorForClient(donor, history, req.user);
        });

        return res.status(200).json({
            success: true,
            count: formatted.length,
            donors: formatted
        });

    } catch (error) {
        logger.error(`Error in getAllDonors: ${error.message}`);
        next(error);
    }
};

// GET /api/donors/:id
const getDonorById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Search by donorId or MongoDB _id
        const donor = await DonorProfile.findOne({
            $or: [{ donorId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!donor) {
            return res.status(404).json({
                success: false,
                message: "Donor profile not found."
            });
        }

        const history = await DonationRecord.find({ donorProfile: donor._id }).sort({ donationDate: -1 });

        return res.status(200).json({
            success: true,
            donor: formatDonorForClient(donor, history, req.user)
        });

    } catch (error) {
        logger.error(`Error in getDonorById: ${error.message}`);
        next(error);
    }
};

// POST /api/donors/register-wizard
const registerDonorWizard = async (req, res, next) => {
    try {
        const {
            name,
            phone,
            bloodGroup,
            bloodType,
            age,
            weight,
            height,
            zone,
            firstTime = "no",
            healthy = "yes",
            medicalCondition = "no",
            medication = "no",
            medicationDetails = null,
            lastDonation = "",
            declaredAvailability = "available",
            email,
            password
        } = req.body;

        const effectiveBloodGroup = bloodGroup || bloodType;

        if (!name || !effectiveBloodGroup || !zone) {
            return res.status(400).json({
                success: false,
                message: "Name, blood group, and zone are required."
            });
        }

        // Age check: must be >= 18
        const numAge = Number(age);
        if (isNaN(numAge) || numAge < 18 || numAge > 65) {
            return res.status(400).json({
                success: false,
                message: "Volunteer donors must be between 18 and 65 years of age."
            });
        }

        // Weight check: must be >= 50kg
        const numWeight = Number(weight);
        if (isNaN(numWeight) || numWeight < 50) {
            return res.status(400).json({
                success: false,
                message: "Donors must weigh at least 50 kg for blood donation safety."
            });
        }

        // Generate clean unique donor ID
        const donorId = "DNR-" + Date.now();

        // Create or link user account
        let userId = req.user ? req.user._id : null;
        if (!userId) {
            const userEmail = email ? email.trim().toLowerCase() : `donor_${Date.now()}_${Math.floor(Math.random() * 10000)}@lifelink.community`;
            const userPassword = password || "LifeLinkDonorPass123!";
            let user = await User.findOne({ email: userEmail });
            if (!user) {
                user = new User({
                    name: name.trim(),
                    email: userEmail,
                    password: userPassword,
                    role: "donor"
                });
                await user.save();
            }
            userId = user._id;
        }

        // Normalize medication
        const medString = (medication === "yes" || medication === true) ? "yes" : "no";

        // Normalize medicationDetails
        let medDetailsObj = null;
        if (typeof medicationDetails === "object" && medicationDetails !== null && Object.keys(medicationDetails).length > 0) {
            medDetailsObj = medicationDetails;
        } else if (typeof medicationDetails === "string" && medicationDetails.trim() && medicationDetails.trim() !== "none") {
            medDetailsObj = { name: medicationDetails.trim() };
        }

        // Normalize declaredAvailability
        const validAvail = ["available", "temporarily_unavailable", "paused", "unconfirmed"];
        const availability = validAvail.includes(declaredAvailability) ? declaredAvailability : "available";

        const donorProfile = new DonorProfile({
            user: userId,
            donorId,
            name: name.trim(),
            phone: phone ? String(phone).trim() : "Not provided",
            bloodGroup: effectiveBloodGroup,
            bloodType: effectiveBloodGroup,
            age: numAge,
            weight: numWeight,
            height: height ? String(height) : "",
            zone,
            firstTime: (firstTime === "yes" || firstTime === true) ? "yes" : "no",
            healthy: (healthy === "yes" || healthy === true),
            medicalCondition: (medicalCondition === "yes" || medicalCondition === true),
            medication: medString,
            medicationDetails: medDetailsObj,
            lastDonationDate: lastDonation ? new Date(lastDonation) : null,
            declaredAvailability: availability
        });

        await donorProfile.save();

        if (userId) {
            await User.findByIdAndUpdate(userId, { donorProfile: donorProfile._id });
        }

        // If historical donation date provided, seed record
        const historyRecords = [];
        if (lastDonation) {
            const histDate = new Date(lastDonation);
            if (!isNaN(histDate.getTime())) {
                const rec = new DonationRecord({
                    donorProfile: donorProfile._id,
                    donorUser: userId,
                    donationDate: histDate,
                    donationType: "Whole Blood",
                    institutionName: "Previous Community Blood Bank",
                    status: "self_reported"
                });
                await rec.save();
                historyRecords.push(rec);
            }
        }

        logger.info(`Donor registered via wizard: ${donorProfile.name} (${donorProfile.donorId})`);

        return res.status(201).json({
            success: true,
            message: "Donor registration completed successfully.",
            donor: formatDonorForClient(donorProfile, historyRecords, req.user)
        });

    } catch (error) {
        logger.error(`Error in registerDonorWizard: ${error.message}`);
        next(error);
    }
};

// PATCH /api/donors/:id/availability
// Protected: Donor themselves or admin
const updateAvailability = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { availability } = req.body;

        const validStates = ["available", "temporarily_unavailable", "paused", "unconfirmed"];
        if (!validStates.includes(availability)) {
            return res.status(400).json({
                success: false,
                message: `Invalid availability. Must be one of: [${validStates.join(", ")}]`
            });
        }

        const donor = await DonorProfile.findOne({
            $or: [{ donorId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!donor) {
            return res.status(404).json({
                success: false,
                message: "Donor profile not found."
            });
        }

        // Enforce ownership: Donor can only update own profile unless admin
        if (req.user && req.user.role !== "admin" && donor.user && donor.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to modify availability for another donor's profile."
            });
        }

        donor.declaredAvailability = availability;
        await donor.save();

        logger.info(`Availability updated for donor ${donor.donorId}: ${availability}`);

        return res.status(200).json({
            success: true,
            message: `Availability updated to '${availability}'.`,
            declaredAvailability: donor.declaredAvailability
        });

    } catch (error) {
        logger.error(`Error in updateAvailability: ${error.message}`);
        next(error);
    }
};

// POST /api/donors/:id/donations
// Protected: Hospital staff, Admin, or self-reported by donor
const addDonationRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { donationDate, donationType = "Whole Blood", institutionName, notes } = req.body;

        if (!donationDate) {
            return res.status(400).json({
                success: false,
                message: "Donation date is required."
            });
        }

        const donor = await DonorProfile.findOne({
            $or: [{ donorId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!donor) {
            return res.status(404).json({
                success: false,
                message: "Donor profile not found."
            });
        }

        const parsedDate = new Date(donationDate);
        if (parsedDate > new Date()) {
            return res.status(400).json({
                success: false,
                message: "Donation date cannot be in the future."
            });
        }

        // Determine verification status
        const isHospital = req.user && (req.user.role === "hospital" || req.user.role === "admin");
        const status = isHospital ? "verified" : "self_reported";

        const donation = new DonationRecord({
            donorProfile: donor._id,
            donorUser: donor.user,
            donationDate: parsedDate,
            donationType: donationType,
            institutionName: institutionName || (isHospital ? req.user.name : "Self-Reported"),
            status: status,
            verifiedBy: isHospital ? req.user._id : null,
            verifiedAt: isHospital ? new Date() : null,
            notes: notes || ""
        });

        await donation.save();

        // Update donor's last donation date if newer
        if (!donor.lastDonationDate || parsedDate > new Date(donor.lastDonationDate)) {
            donor.lastDonationDate = parsedDate;
            await donor.save();
        }

        logger.info(`Donation recorded for donor ${donor.donorId} (${status})`);

        const allDonations = await DonationRecord.find({ donorProfile: donor._id }).sort({ donationDate: -1 });

        return res.status(201).json({
            success: true,
            message: "Donation recorded successfully.",
            donation,
            donor: formatDonorForClient(donor, allDonations, req.user)
        });

    } catch (error) {
        logger.error(`Error in addDonationRecord: ${error.message}`);
        next(error);
    }
};

// DELETE /api/donors/:id
// Protected: Donor themselves or Admin
const deleteDonor = async (req, res, next) => {
    try {
        const { id } = req.params;

        const donor = await DonorProfile.findOne({
            $or: [{ donorId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
        });

        if (!donor) {
            return res.status(404).json({
                success: false,
                message: "Donor profile not found."
            });
        }

        // Enforce ownership
        if (req.user && req.user.role !== "admin" && donor.user && donor.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to delete another user's donor profile."
            });
        }

        // Delete associated donation records
        await DonationRecord.deleteMany({ donorProfile: donor._id });

        // Delete donor profile
        await DonorProfile.findByIdAndDelete(donor._id);

        logger.info(`Donor profile deleted: ${donor.donorId} (${donor.name})`);

        return res.status(200).json({
            success: true,
            message: `Donor profile for ${donor.name} has been deleted successfully.`
        });

    } catch (error) {
        logger.error(`Error in deleteDonor: ${error.message}`);
        next(error);
    }
};

module.exports = {
    getAllDonors,
    getDonorById,
    registerDonorWizard,
    updateAvailability,
    addDonationRecord,
    deleteDonor
};
