/* =====================================================
   DONORS - CRUD, DISPLAY, SEARCH
   ===================================================== */

/* =====================================================
   DONOR SEARCH / FILTER
   ===================================================== */

function initializeFilters() {

    const donorSearch =
        document.getElementById(
            "donorSearch"
        );

    const bloodFilter =
        document.getElementById(
            "bloodFilter"
        );

    const zoneFilter =
        document.getElementById(
            "zoneFilter"
        );

    const eligibilityFilter =
        document.getElementById(
            "eligibilityFilter"
        );


    donorSearch?.addEventListener(
        "input",
        displayAllDonors
    );


    bloodFilter?.addEventListener(
        "change",
        displayAllDonors
    );


    zoneFilter?.addEventListener(
        "change",
        displayAllDonors
    );


    eligibilityFilter?.addEventListener(
        "change",
        displayAllDonors
    );


    document
        .querySelectorAll(
            ".request-filter"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".request-filter"
                            )
                            .forEach(
                                btn =>
                                    btn.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        currentRequestFilter =
                            button.dataset.filter;


                        displayRequests();

                    }
                );

            }
        );

}


function displayAllDonors() {

    const grid =
        document.getElementById(
            "donorsGrid"
        );


    if (!grid) return;


    const search =
        (
            document.getElementById(
                "donorSearch"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const blood =
        document.getElementById(
            "bloodFilter"
        )?.value || "";


    const zone =
        document.getElementById(
            "zoneFilter"
        )?.value || "";


    const eligibility =
        document.getElementById(
            "eligibilityFilter"
        )?.value || "";


    const filtered =
        donors.filter(
            donor => {

                const donorName =
                    String(
                        donor.name || ""
                    )
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    donorName.includes(
                        search
                    );


                const matchesBlood =
                    !blood ||
                    donor.bloodType === blood;


                const matchesZone =
                    !zone ||
                    donor.zone === zone;


                const eligible =
                    isDonorEligible(
                        donor
                    );


                const matchesEligibility =
                    !eligibility ||
                    (
                        eligibility === "eligible" &&
                        eligible
                    ) ||
                    (
                        eligibility === "cooldown" &&
                        !eligible
                    );


                return (
                    matchesSearch &&
                    matchesBlood &&
                    matchesZone &&
                    matchesEligibility
                );

            }
        );


    const count =
        document.getElementById(
            "donorResultCount"
        );


    if (count) {

        count.textContent =
            `${filtered.length} donor${
                filtered.length === 1
                    ? ""
                    : "s"
            }`;

    }


    if (
        filtered.length === 0
    ) {

        grid.innerHTML = `
            <div class="empty-state">
                No donors match your filters.
            </div>
        `;

        return;

    }


    grid.innerHTML =
        filtered
            .map(
                createDonorCard
            )
            .join("");

}


function createDonorCard(donor) {

    const eligible =
        isDonorEligible(
            donor
        );


    const cooldown =
        getCooldownDaysRemaining(
            donor
        );


    const initial =
        donor.name
            ? donor.name
                .charAt(0)
                .toUpperCase()
            : "?";


    return `

        <div
            class="donor-card"
            onclick="openDonorProfile('${escapeHTML(
                donor.id
            )}')">

            <div class="donor-top">

                <div>

                    <div class="donor-avatar">
                        ${initial}
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

                <span class="blood-badge">
                    ${escapeHTML(
                        donor.bloodType
                    )}
                </span>

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
                        🎂 Age
                    </span>

                    <strong>
                        ${donor.age}
                    </strong>
                </p>


                <p>
                    <span>
                        ⚖ Weight
                    </span>

                    <strong>
                        ${donor.weight} kg
                    </strong>
                </p>


                <p>
                    <span>
                        Status
                    </span>

                    <strong class="${
                        eligible
                            ? "match-compatible"
                            : ""
                    }">

                        ${
                            eligible
                                ? "Eligible"
                                : cooldown > 0
                                    ? `${cooldown} days cooldown`
                                    : "Not Eligible"
                        }

                    </strong>
                </p>

            </div>

        </div>

    `;

}