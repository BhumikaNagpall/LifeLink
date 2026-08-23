/* =====================================================
   MATCHER - SMART MATCHING ALGORITHM
   ===================================================== */

/* =====================================================
   SMART MATCHER
   ===================================================== */

function handleMatcherForm(event) {

    event.preventDefault();


    const patientName =
        document.getElementById(
            "patientName"
        )?.value.trim() || "";

    const bloodType =
        document.getElementById(
            "requiredBloodType"
        )?.value || "";

    const zone =
        document.getElementById(
            "requestZone"
        )?.value || "";

    const urgency =
        document.getElementById(
            "urgency"
        )?.value || "";

    const requestedUnits =
        Number(
            document.getElementById(
                "requestedUnits"
            )?.value
        );


    if (
        !patientName ||
        !bloodType ||
        !zone ||
        !urgency ||
        !requestedUnits
    ) {

        alert(
            "Please complete all matcher fields."
        );

        return;

    }


    const request = {

        id:
            "REQ-" +
            Date.now(),

        patientName:
            patientName,

        requiredBloodType:
            bloodType,

        bloodType:
            bloodType,

        zone:
            zone,

        urgency:
            urgency,

        requestedUnits:
            requestedUnits,

        status:
            "Searching",

        createdAt:
            new Date().toISOString()

    };


    requests.push(
        request
    );

    saveRequests();


    const matches =
        findMatchingDonors(
            request
        );


    currentMatchData =
        matches;


    renderMatchResults(
        request,
        matches
    );


    updateDashboard();

}


/* =====================================================
   FIND MATCHING DONORS
   ===================================================== */

function findMatchingDonors(request) {

    const results = [];


    donors.forEach(
        donor => {

            const compatible =
                isCompatible(
                    donor.bloodType,
                    request.requiredBloodType
                );


            if (!compatible) {

                return;

            }


            const eligible =
                isDonorEligible(
                    donor
                );


            const cooldown =
                getCooldownDaysRemaining(
                    donor
                );


            const distance =
                getZoneDistance(
                    donor.zone,
                    request.zone
                );


            let score = 0;

            const reasons = [];


            /*
             * Blood compatibility
             */

            if (compatible) {

                score += 50;

                reasons.push(
                    "Blood group compatible"
                );

            }


            /*
             * Eligibility
             */

            if (eligible) {

                score += 25;

                reasons.push(
                    "Currently eligible"
                );

            } else {

                reasons.push(
                    cooldown > 0
                        ? `Donation cooldown: ${cooldown} days`
                        : "Not currently eligible"
                );

            }


            /*
             * Location
             */

            if (distance === 0) {

                score += 20;

                reasons.push(
                    "Same zone"
                );

            } else if (distance === 1) {

                score += 15;

                reasons.push(
                    "Nearby zone"
                );

            } else if (distance === 2) {

                score += 8;

                reasons.push(
                    "Moderate zone distance"
                );

            } else {

                score += 2;

                reasons.push(
                    "Farther zone"
                );

            }


            /*
             * Urgency
             */

            if (
                request.urgency ===
                "Emergency"
            ) {

                score += 5;

                reasons.push(
                    "Emergency priority boost"
                );

            } else if (
                request.urgency ===
                "Urgent"
            ) {

                score += 3;

                reasons.push(
                    "Urgent priority boost"
                );

            }


            results.push({

                donor:
                    donor,

                score:
                    score,

                compatible:
                    compatible,

                eligible:
                    eligible,

                distance:
                    distance,

                cooldown:
                    cooldown,

                reasons:
                    reasons

            });

        }
    );


    results.sort(
        (a, b) =>
            b.score -
            a.score
    );


    return results;

}


/* =====================================================
   MATCH RESULTS
   ===================================================== */

function renderMatchResults(
    request,
    matches
) {

    const container =
        document.getElementById(
            "matchResults"
        );


    if (!container) return;


    if (
        matches.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <h3>
                    No compatible donors found
                </h3>

                <p>
                    Try another zone or check again later.
                </p>

            </div>

        `;

        return;

    }


    const eligibleMatches =
        matches.filter(
            match =>
                match.eligible
        );


    const best =
        matches[0];


    container.innerHTML = `

        <div class="results-heading">

            <div>

                <span class="page-label">
                    MATCH RESULTS
                </span>

                <h2>
                    ${matches.length}
                    Compatible Donor(s)
                </h2>

            </div>

            <span>
                Best Score:
                <strong>
                    ${best.score}
                </strong>
            </span>

        </div>


        ${
            eligibleMatches.length > 0
                ? `
                    <div class="fulfillment-banner">

                        <span>
                            ✓
                            ${eligibleMatches.length}
                            currently eligible donor(s)
                            found.
                        </span>

                        <span>
                            Request:
                            ${escapeHTML(
                                request.patientName
                            )}
                        </span>

                    </div>
                `
                : ""
        }


        ${
            matches
                .map(
                    (match, index) =>
                        createMatchCard(
                            match,
                            index
                        )
                )
                .join("")
        }

    `;

}


/* =====================================================
   MATCH CARD
   ===================================================== */

function createMatchCard(
    match,
    index
) {

    const donor =
        match.donor;


    const best =
        index === 0;


    return `

        <div
            class="
                match-result-card
                ${best ? "best-match" : ""}
            ">

            ${
                best
                    ? `
                        <span class="best-label">
                            🏆 BEST MATCH
                        </span>
                    `
                    : ""
            }


            <div class="donor-top">

                <div>

                    <div class="donor-avatar">
                        ${
                            donor.name
                                ? donor.name
                                    .charAt(0)
                                    .toUpperCase()
                                : "?"
                        }
                    </div>

                    <h3>
                        ${escapeHTML(
                            donor.name
                        )}
                    </h3>

                    <span class="donor-id">
                        ${escapeHTML(
                            donor.id
                        )}
                    </span>

                </div>


                <div>

                    <span class="blood-badge">
                        ${escapeHTML(
                            donor.bloodType
                        )}
                    </span>

                    <span class="match-score">
                        ${match.score}
                        pts
                    </span>

                </div>

            </div>


            <div class="donor-details">

                <p>
                    <span>
                        📍 Zone
                    </span>

                    <strong>
                        ${escapeHTML(
                            donor.zone
                        )}
                    </strong>
                </p>


                <p>
                    <span>
                        📏 Zone Distance
                    </span>

                    <strong>
                        ${match.distance}
                    </strong>
                </p>


                <p>
                    <span>
                        Eligibility
                    </span>

                    <strong>
                        ${
                            match.eligible
                                ? "Eligible"
                                : "Not Eligible"
                        }
                    </strong>
                </p>


                <p>
                    <span>
                        Cooldown
                    </span>

                    <strong>
                        ${
                            match.cooldown > 0
                                ? `${match.cooldown} days`
                                : "Clear"
                        }
                    </strong>
                </p>

            </div>


            <div class="match-card-actions">

                <button
                    class="small-btn match-explain-btn"
                    onclick="showMatchExplanation(${index})">

                    Why Matched?

                </button>


                <button
                    class="primary-btn match-contact-btn"
                    onclick="contactDonor('${escapeHTML(
                        donor.id
                    )}')">

                    Contact Donor

                </button>

            </div>

        </div>

    `;

}


/* =====================================================
   MATCH EXPLANATION
   ===================================================== */

function showMatchExplanation(index) {

    const match =
        currentMatchData[index];


    if (!match) return;


    currentExplanationData =
        match;


    const container =
        document.getElementById(
            "matchExplanationContent"
        );


    const score =
        document.getElementById(
            "explanationScore"
        );


    if (!container) return;


    container.innerHTML =
        match.reasons
            .map(
                (reason, index) => `

                    <div class="match-explanation-item">

                        <span>
                            ${index + 1}.
                            ${escapeHTML(
                                reason
                            )}
                        </span>

                        <strong>
                            ✓
                        </strong>

                    </div>

                `
            )
            .join("");


    if (score) {

        score.textContent =
            match.score;

    }


    matchExplanationModal?.classList.add(
        "show"
    );

}


function closeMatchExplanation() {

    matchExplanationModal?.classList.remove(
        "show"
    );

}


/* =====================================================
   RUN MATCH FOR REQUEST
   ===================================================== */

function runMatchForRequest(requestId) {

    const request =
        requests.find(
            item =>
                String(item.id) ===
                String(requestId)
        );


    if (!request) return;


    showPage("find");


    const patientName =
        document.getElementById(
            "patientName"
        );

    const bloodType =
        document.getElementById(
            "requiredBloodType"
        );

    const zone =
        document.getElementById(
            "requestZone"
        );

    const urgency =
        document.getElementById(
            "urgency"
        );

    const requestedUnits =
        document.getElementById(
            "requestedUnits"
        );


    if (patientName) {

        patientName.value =
            request.patientName;

    }


    if (bloodType) {

        bloodType.value =
            request.requiredBloodType ||
            request.bloodType;

    }


    if (zone) {

        zone.value =
            request.zone;

    }


    if (urgency) {

        urgency.value =
            request.urgency;

    }


    if (requestedUnits) {

        requestedUnits.value =
            request.requestedUnits ||
            1;

    }


    const matches =
        findMatchingDonors(
            request
        );


    currentMatchData =
        matches;


    renderMatchResults(
        request,
        matches
    );

}