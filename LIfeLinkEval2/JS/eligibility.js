/* =====================================================
   ELIGIBILITY - DONOR ELIGIBILITY & COOLDOWN
   ===================================================== */

/* =====================================================
   DONOR ELIGIBILITY
   ===================================================== */

function getLastDonationDate(donor) {
    if (!donor) return null;

    if (donor.lastDonation) {
        return donor.lastDonation;
    }

    if (donor.lastDonationDate) {
        return donor.lastDonationDate;
    }

    if (
        Array.isArray(donor.donationHistory) &&
        donor.donationHistory.length > 0
    ) {
        const sorted = [...donor.donationHistory].sort(
            (a, b) => new Date(b.date || b.donationDate) - new Date(a.date || a.donationDate)
        );
        return sorted[0].date || sorted[0].donationDate;
    }

    return null;
}

function getCooldownDaysRemaining(donor) {
    const lastDonation = getLastDonationDate(donor);

    if (!lastDonation) {
        return 0;
    }

    const last = new Date(lastDonation);
    const today = new Date();

    last.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diff = Math.floor((today - last) / (1000 * 60 * 60 * 24));

    return Math.max(0, 90 - diff);
}

function isDonorEligible(donor) {
    if (!donor) return false;

    // Age bounds (18 to 75)
    const age = Number(donor.age);
    if (age < 18 || age > 75) {
        return false;
    }

    // Weight minimum 45 kg
    if (Number(donor.weight) < 45) {
        return false;
    }

    // General Health
    if (donor.healthy === false || donor.healthy === "no") {
        return false;
    }

    // Medical Conditions
    if (donor.medicalCondition === true || donor.medicalCondition === "yes") {
        return false;
    }

    // 90-day cooldown enforcement
    if (getCooldownDaysRemaining(donor) > 0) {
        return false;
    }

    // Declared availability check
    if (donor.declaredAvailability && donor.declaredAvailability !== "available") {
        return false;
    }

    return true;
}
