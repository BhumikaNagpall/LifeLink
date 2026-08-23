/* =====================================================
   ELIGIBILITY - DONOR ELIGIBILITY & COOLDOWN
   ===================================================== */

/* =====================================================
   DONOR ELIGIBILITY
   ===================================================== */

function getLastDonationDate(donor) {

    if (donor.lastDonation) {

        return donor.lastDonation;

    }


    if (
        Array.isArray(donor.donationHistory) &&
        donor.donationHistory.length > 0
    ) {

        const sorted =
            [...donor.donationHistory]
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                );


        return sorted[0].date;

    }


    return null;

}


function getCooldownDaysRemaining(donor) {

    const lastDonation =
        getLastDonationDate(donor);


    if (!lastDonation) {

        return 0;

    }


    const last =
        new Date(lastDonation);

    const today =
        new Date();


    last.setHours(0, 0, 0, 0);

    today.setHours(0, 0, 0, 0);


    const diff =
        Math.floor(
            (
                today - last
            ) /
            (
                1000 *
                60 *
                60 *
                24
            )
        );


    return Math.max(
        0,
        90 - diff
    );

}


function isDonorEligible(donor) {

    if (!donor) return false;


    if (Number(donor.age) < 18) {

        return false;

    }


    if (Number(donor.weight) < 45) {

        return false;

    }


    if (
        donor.healthy === false ||
        donor.healthy === "no"
    ) {

        return false;

    }


    if (
        donor.medicalCondition === true ||
        donor.medicalCondition === "yes"
    ) {

        return false;

    }


    if (
        getCooldownDaysRemaining(donor) > 0
    ) {

        return false;

    }


    return true;

}