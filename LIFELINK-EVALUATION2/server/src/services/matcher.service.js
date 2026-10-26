/* =====================================================
   LIFELINK - SMART MATCHER SERVICE
   Implements safety-first algorithmic donor matching,
   component compatibility, distance ranking, and explainability.
   ===================================================== */

const DonorProfile = require("../models/DonorProfile");
const DonationRecord = require("../models/DonationRecord");

// Red Blood Cells & Whole Blood Compatibility Matrix
// Key = Donor Blood Group, Value = Compatible Recipient Blood Groups
const RBC_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"]
};

// Plasma Compatibility Matrix (Reverse of RBC)
// Key = Donor Blood Group, Value = Compatible Recipient Blood Groups
const PLASMA_COMPATIBILITY = {
    "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
    "AB-": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A+", "A-", "O+", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B+", "B-", "O+", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"]
};

// Zone Proximity Distance Matrix (0 = same zone, 1 = adjacent, 2 = moderate, 3 = farther)
const ZONE_DISTANCE = {
    "Zone A": { "Zone A": 0, "Zone B": 1, "Zone C": 2, "Zone D": 3 },
    "Zone B": { "Zone A": 1, "Zone B": 0, "Zone C": 1, "Zone D": 2 },
    "Zone C": { "Zone A": 2, "Zone B": 1, "Zone C": 0, "Zone D": 1 },
    "Zone D": { "Zone A": 3, "Zone B": 2, "Zone C": 1, "Zone D": 0 }
};

const getZoneDistance = (donorZone, requestZone) => {
    if (ZONE_DISTANCE[donorZone] && ZONE_DISTANCE[donorZone][requestZone] !== undefined) {
        return ZONE_DISTANCE[donorZone][requestZone];
    }
    return 3;
};

// Check biological compatibility based on component
const checkCompatibility = (donorBlood, recipientBlood, component = "Whole Blood") => {
    if (!donorBlood || !recipientBlood) return false;

    if (component === "Plasma") {
        const recipients = PLASMA_COMPATIBILITY[donorBlood] || [];
        return recipients.includes(recipientBlood);
    }

    // Default to Whole Blood / RBC / Platelets
    const recipients = RBC_COMPATIBILITY[donorBlood] || [];
    return recipients.includes(recipientBlood);
};

// Medical Disclaimer
const CLINICAL_DISCLAIMER =
    "Potential Donor Matches — Subject to Verification. " +
    "Algorithmic matching provides coordination support only and does not establish clinical compatibility, " +
    "crossmatch clearance, or transfusion suitability. Qualified blood-bank staff must determine medical eligibility.";

/**
 * Execute Safety-First Smart Matching
 * @param {Object} criteria - Request criteria
 * @returns {Promise<Object>} Results with ranked matches and disclaimer
 */
const findMatches = async (criteria) => {
    const {
        requiredBloodGroup,
        requiredComponent = "Whole Blood",
        zone: requestZone = "Zone A",
        urgency = "Normal",
        patientName = "Patient in Need",
        requestedUnits = 1
    } = criteria;

    // Retrieve all donors from database
    const allDonors = await DonorProfile.find({}).sort({ createdAt: -1 });

    const results = [];

    for (const donor of allDonors) {
        // --- 1. HARD SAFETY FILTERS (Failure strictly excludes candidate) ---

        // Hard Filter A: Blood Compatibility
        const isCompatible = checkCompatibility(donor.bloodGroup, requiredBloodGroup, requiredComponent);
        if (!isCompatible) {
            continue;
        }

        // Hard Filter B: Declared Availability
        if (donor.declaredAvailability !== "available") {
            continue;
        }

        // Hard Filter C: Medical Cooldown Rule (90 days)
        if (donor.cooldownDaysRemaining > 0) {
            continue;
        }

        // Hard Filter D: Age & Weight Safety
        if (donor.age < 18 || donor.age > 75 || donor.weight < 45) {
            continue;
        }

        // Hard Filter E: Self-Reported Health Flags
        if (donor.healthy === false || donor.medicalCondition === true) {
            continue;
        }

        // --- 2. MULTI-FACTOR RANKING FOR QUALIFIED DONORS (Max 100 Points) ---
        let score = 0;
        const reasons = [];

        // Factor A: Blood Compatibility Specificity (Up to 50 pts)
        const isExactMatch = donor.bloodGroup === requiredBloodGroup;
        if (isExactMatch) {
            score += 50;
            reasons.push(`Exact blood group match (${donor.bloodGroup} → ${requiredBloodGroup})`);
        } else {
            score += 45;
            reasons.push(`Compatible biological match for ${requiredComponent} (${donor.bloodGroup} → ${requiredBloodGroup})`);
        }

        // Factor B: Confirmed Availability & Clean Cooldown (25 pts)
        score += 25;
        reasons.push("Declared available with 90-day donation cooldown satisfied");

        // Factor C: Geographic Proximity (Up to 20 pts)
        const distance = getZoneDistance(donor.zone, requestZone);
        if (distance === 0) {
            score += 20;
            reasons.push(`Immediate local zone match (${donor.zone})`);
        } else if (distance === 1) {
            score += 15;
            reasons.push(`Adjacent zone proximity (${donor.zone})`);
        } else if (distance === 2) {
            score += 8;
            reasons.push(`Moderate transit distance (${donor.zone})`);
        } else {
            score += 2;
            reasons.push(`Extended zone coverage (${donor.zone})`);
        }

        // Factor D: Urgency Priority Alignment (Up to 5 pts)
        if (urgency === "Emergency") {
            score += 5;
            reasons.push("Emergency priority coordination boost");
        } else if (urgency === "Urgent") {
            score += 3;
            reasons.push("Urgent priority coordination boost");
        } else {
            score += 1;
            reasons.push("Standard coordination schedule");
        }

        results.push({
            donor: {
                id: donor.donorId,
                _id: donor._id,
                name: donor.name,
                // Mask phone for privacy in match results
                phoneMasked: donor.phone ? donor.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2") : "Protected",
                bloodGroup: donor.bloodGroup,
                bloodType: donor.bloodGroup,
                zone: donor.zone,
                age: donor.age,
                weight: donor.weight,
                declaredAvailability: donor.declaredAvailability,
                cooldown: donor.cooldownDaysRemaining,
                eligible: true
            },
            score,
            distance,
            isExactMatch,
            reasons
        });
    }

    // Sort Descending by Calculated Score
    results.sort((a, b) => b.score - a.score);

    return {
        disclaimer: CLINICAL_DISCLAIMER,
        requestDetails: {
            patientName,
            requiredBloodGroup,
            requiredComponent,
            requestedUnits,
            zone: requestZone,
            urgency
        },
        matchedCount: results.length,
        matches: results
    };
};

module.exports = {
    findMatches,
    checkCompatibility,
    getZoneDistance,
    CLINICAL_DISCLAIMER
};
