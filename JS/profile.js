/* =====================================================
   PROFILE - DONOR PROFILE MODAL
   ===================================================== */

/* =====================================================
   DONOR PROFILE
   ===================================================== */

function openDonorProfile(donorId) {

    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(donorId)
        );


    if (!donor) return;


    activeProfileDonorId =
        donor.id;


    const name =
        document.getElementById(
            "profileName"
        );

    const id =
        document.getElementById(
            "profileId"
        );

    const blood =
        document.getElementById(
            "profileBloodType"
        );

    const age =
        document.getElementById(
            "profileAge"
        );

    const zone =
        document.getElementById(
            "profileZone"
        );

    const weight =
        document.getElementById(
            "profileWeight"
        );

    const height =
        document.getElementById(
            "profileHeight"
        );

    const phone =
        document.getElementById(
            "profilePhone"
        );


    if (name) {

        name.textContent =
            donor.name;

    }


    if (id) {

        id.textContent =
            donor.id;

    }


    if (blood) {

        blood.textContent =
            donor.bloodType;

    }


    if (age) {

        age.textContent =
            donor.age;

    }


    if (zone) {

        zone.textContent =
            donor.zone;

    }


    if (weight) {

        weight.textContent =
            `${donor.weight} kg`;

    }


    if (height) {

        height.textContent =
            donor.height;

    }


    if (phone) {

        phone.textContent =
            donor.phone;

    }


    updateProfileEligibility(
        donor
    );


    renderProfileDonationHistory(
        donor
    );


    donorProfileModal?.classList.add(
        "show"
    );

}


function updateProfileEligibility(
    donor
) {

    const badge =
        document.getElementById(
            "profileEligibilityBadge"
        );

    const countdown =
        document.getElementById(
            "profileEligibilityCountdown"
        );


    const eligible =
        isDonorEligible(
            donor
        );


    const cooldown =
        getCooldownDaysRemaining(
            donor
        );


    if (badge) {

        badge.textContent =
            eligible
                ? "Eligible"
                : "Not Eligible";


        badge.className =
            "status-badge " +
            (
                eligible
                    ? "status-eligible"
                    : "status-not-eligible"
            );

    }


    if (countdown) {

        if (cooldown > 0) {

            countdown.textContent =
                `Donation cooldown active. ${cooldown} day(s) remaining.`;

            countdown.className =
                "eligibility-countdown cooldown-active";

        } else {

            countdown.textContent =
                "✓ No active donation cooldown.";

            countdown.className =
                "eligibility-countdown cooldown-clear";

        }

    }

}


function renderProfileDonationHistory(
    donor
) {

    const container =
        document.getElementById(
            "profileDonationHistory"
        );


    if (!container) return;


    const history =
        Array.isArray(
            donor.donationHistory
        )
            ? [
                ...donor.donationHistory
            ]
            : [];


    history.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );


    if (
        history.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No donation logs found.
            </div>
        `;

        return;

    }


    container.innerHTML =
        history
            .map(
                item => `

                    <div class="donation-history-item">

                        <strong>
                            ${formatDate(
                                item.date
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.type ||
                                "Whole Blood"
                            )}
                        </span>

                        <span class="donation-completed">
                            ${escapeHTML(
                                item.status ||
                                "Completed"
                            )}
                        </span>

                    </div>

                `
            )
            .join("");

}


function closeDonorProfile() {

    donorProfileModal?.classList.remove(
        "show"
    );

    activeProfileDonorId =
        null;

}


function deleteProfileDonor() {

    if (
        !activeProfileDonorId
    ) {

        return;

    }


    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(activeProfileDonorId)
        );


    if (!donor) return;


    const confirmed =
        confirm(
            `Delete donor profile for ${donor.name}?`
        );


    if (!confirmed) return;


    donors =
        donors.filter(
            item =>
                String(item.id) !==
                String(activeProfileDonorId)
        );


    saveDonors();


    closeDonorProfile();

    displayAllDonors();

    updateDashboard();

}


function contactProfileDonor() {

    if (
        !activeProfileDonorId
    ) {

        return;

    }


    contactDonor(
        activeProfileDonorId
    );

}


/* =====================================================
   CONTACT DONOR
   ===================================================== */

function contactDonor(donorId) {

    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(donorId)
        );


    if (!donor) return;


    alert(
        `Contact Donor\n\nName: ${donor.name}\nPhone: ${donor.phone}\nBlood Group: ${donor.bloodType}`
    );

}


/* =====================================================
   DONATION MODAL
   ===================================================== */

function addDonationFromProfile() {

    if (
        !activeProfileDonorId
    ) {

        return;

    }


    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(activeProfileDonorId)
        );


    if (!donor) return;


    const donationDate =
        document.getElementById(
            "donationDate"
        );


    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    if (donationDate) {

        donationDate.value =
            today;

        donationDate.max =
            today;

    }


    donationModal?.classList.add(
        "show"
    );

}


function closeDonationModal() {

    donationModal?.classList.remove(
        "show"
    );

}


function handleDonationForm(event) {

    event.preventDefault();


    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(activeProfileDonorId)
        );


    if (!donor) return;


    const donationDate =
        document.getElementById(
            "donationDate"
        )?.value;

    const donationType =
        document.getElementById(
            "donationType"
        )?.value;


    if (
        !donationDate ||
        !donationType
    ) {

        return;

    }


    const selectedDate =
        new Date(
            donationDate
        );

    const today =
        new Date();


    selectedDate.setHours(
        0,
        0,
        0,
        0
    );

    today.setHours(
        0,
        0,
        0,
        0
    );


    if (
        selectedDate > today
    ) {

        alert(
            "Donation date cannot be in the future."
        );

        return;

    }


    if (
        !Array.isArray(
            donor.donationHistory
        )
    ) {

        donor.donationHistory =
            [];

    }


    donor.donationHistory.unshift({

        date:
            donationDate,

        type:
            donationType,

        status:
            "Completed"

    });


    if (
        donationType ===
        "Whole Blood"
    ) {

        donor.lastDonation =
            donationDate;

    }


    saveDonors();


    event.target.reset();

    closeDonationModal();


    openDonorProfile(
        donor.id
    );


    updateDashboard();

    displayAllDonors();

}