/* =====================================================
   WIZARD - REGISTRATION WIZARD
   ===================================================== */

/* =====================================================
   DONOR REGISTRATION WIZARD
   ===================================================== */

function initializeWizard() {

    const donorForm = document.getElementById("donorForm");
    if (!donorForm) return;

    donorForm.addEventListener("submit", handleDonorRegistration);

    // ===== ADD THIS CODE =====
    // Listen for changes on "Have you donated before?" question
    document.querySelectorAll('input[name="donatedBefore"]').forEach(radio => {
        radio.addEventListener("change", function() {
            toggleDonationDateQuestion(this.value);
        });
    });
    // ==========================

    updateWizardUI();
}

/* =====================================================
   TOGGLE DONATION DATE QUESTION
   ===================================================== */

function toggleDonationDateQuestion(value) {
    const question7 = document.querySelector('.wizard-step[data-step="7"]');
    const progressBar = document.getElementById("wizardProgressBar");
    const stepLabel = document.getElementById("wizardStepLabel");
    const stepPercent = document.getElementById("wizardStepPercent");

    if (value === "no") {
        // Hide Question 7
        if (question7) {
            question7.style.display = "none";
            question7.classList.remove("active");
        }
        
        // Update progress to skip question 7
        // The total steps effectively become 9 (skip question 7)
        const effectiveStep = currentWizardStep > 7 ? currentWizardStep - 1 : currentWizardStep;
        const totalEffectiveSteps = 9; // 10 - 1 (skipped question)
        const progress = (effectiveStep / totalEffectiveSteps) * 100;
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (stepLabel) stepLabel.textContent = `Question ${effectiveStep} of ${totalEffectiveSteps}`;
        if (stepPercent) stepPercent.textContent = `${Math.round(progress)}% Completed`;

    } else {
        // Show Question 7
        if (question7) {
            question7.style.display = "";
        }
        
        // Reset progress to normal
        const progress = (currentWizardStep / totalWizardSteps) * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (stepLabel) stepLabel.textContent = `Question ${currentWizardStep} of ${totalWizardSteps}`;
        if (stepPercent) stepPercent.textContent = `${Math.round(progress)}% Completed`;
    }
}


/* =====================================================
   QUESTION 2 - HEALTH INITIALIZATION
   ===================================================== */

function initializeHealthQuestion() {

    document
        .querySelectorAll(
            'input[name="healthy"]'
        )
        .forEach(
            radio => {

                radio.addEventListener(
                    "change",
                    function () {

                        handleHealthyChoice(
                            this.value
                        );

                    }
                );

            }
        );

}


/* =====================================================
   GET REGISTRATION STOPPED SCREEN
   ===================================================== */

function getRegistrationStoppedScreen() {

    return (
        document.getElementById(
            "registrationStopped"
        ) ||
        document.getElementById(
            "registrationStoppedScreen"
        )
    );

}


/* =====================================================
   QUESTION 2 - HEALTH CHOICE
   ===================================================== */

function handleHealthyChoice(value) {

    const stoppedScreen =
        getRegistrationStoppedScreen();

    const wizardActions =
        document.querySelector(
            ".wizard-actions"
        );


    /* ---------------------------------------------
       USER SELECTED NO
       --------------------------------------------- */

    if (value === "no") {

        registrationStoppedForHealth = true;


        /*
         * Hide all normal questions
         */

        document
            .querySelectorAll(
                ".wizard-step"
            )
            .forEach(
                step => {

                    step.classList.remove(
                        "active"
                    );

                }
            );


        /*
         * Show paused screen
         */

        if (stoppedScreen) {

            stoppedScreen.classList.remove(
                "is-hidden"
            );

            stoppedScreen.classList.add(
                "active"
            );

        }


        /*
         * Hide normal navigation
         */

        if (wizardActions) {

            wizardActions.classList.add(
                "is-hidden"
            );

            wizardActions.style.display =
                "none";

        }


        /*
         * Hide normal next / previous / submit
         */

        document
            .getElementById(
                "prevStepBtn"
            )
            ?.classList.add(
                "is-hidden"
            );

        document
            .getElementById(
                "nextStepBtn"
            )
            ?.classList.add(
                "is-hidden"
            );

        document
            .getElementById(
                "wizardSubmitBtn"
            )
            ?.classList.add(
                "is-hidden"
            );


        /*
         * Update header
         */

        const label =
            document.getElementById(
                "wizardStepLabel"
            );

        if (label) {

            label.textContent =
                "Registration Paused";

        }


        const percent =
            document.getElementById(
                "wizardStepPercent"
            );

        if (percent) {

            percent.textContent =
                "Registration Paused";

        }


        const progressBar =
            document.getElementById(
                "wizardProgressBar"
            );

        if (progressBar) {

            progressBar.style.width =
                "20%";

        }


        return;

    }


    /* ---------------------------------------------
       USER SELECTED YES
       --------------------------------------------- */

    registrationStoppedForHealth = false;


    /*
     * Hide paused screen
     */

    if (stoppedScreen) {

        stoppedScreen.classList.remove(
            "active"
        );

        stoppedScreen.classList.add(
            "is-hidden"
        );

    }


    /*
     * Show wizard actions again
     */

    if (wizardActions) {

        wizardActions.classList.remove(
            "is-hidden"
        );

        wizardActions.style.display =
            "";

    }


    /*
     * Keep user on Question 2.
     *
     * They can press Next normally.
     */

    currentWizardStep = 2;

    updateWizardUI();

}


/* =====================================================
   WIZARD NEXT BUTTON
   ===================================================== */

function wizardNext() {

    if (registrationStoppedForHealth) {
        return;
    }

    if (!validateWizardStep(currentWizardStep)) {
        return;
    }

    // ===== UPDATE THIS SECTION =====
    // QUESTION 2 - Health check
    if (currentWizardStep === 2 && getRadioValue("healthy") === "no") {
        showRegistrationStopped();
        return;
    }

    // QUESTION 6 - If user says "No" to donation, skip Question 7
    if (currentWizardStep === 6) {
        const donatedBefore = getRadioValue("donatedBefore");
        if (donatedBefore === "no") {
            // Skip Question 7 - go directly to Question 8
            currentWizardStep = 8;
            updateWizardUI();
            return;
        }
    }
    // ===============================

    // QUESTION 9 - Medication
    if (currentWizardStep === 9 && getRadioValue("medication") === "yes") {
        showMedicationDetails();
        return;
    }

    // Normal next question
    if (currentWizardStep < totalWizardSteps) {
        currentWizardStep++;
        updateWizardUI();
    }
}


/* =====================================================
   SHOW REGISTRATION STOPPED
   ===================================================== */

function showRegistrationStopped() {

    registrationStoppedForHealth = true;

    const stoppedScreen =
        getRegistrationStoppedScreen();

    const wizardActions =
        document.querySelector(
            ".wizard-actions"
        );


    document
        .querySelectorAll(
            ".wizard-step"
        )
        .forEach(
            step => {

                step.classList.remove(
                    "active"
                );

            }
        );


    if (stoppedScreen) {

        stoppedScreen.classList.remove(
            "is-hidden"
        );

        stoppedScreen.classList.add(
            "active"
        );

    }


    if (wizardActions) {

        wizardActions.classList.add(
            "is-hidden"
        );

        wizardActions.style.display =
            "none";

    }


    document
        .getElementById(
            "prevStepBtn"
        )
        ?.classList.add(
            "is-hidden"
        );


    document
        .getElementById(
            "nextStepBtn"
        )
        ?.classList.add(
            "is-hidden"
        );


    document
        .getElementById(
            "wizardSubmitBtn"
        )
        ?.classList.add(
            "is-hidden"
        );


    const progressBar =
        document.getElementById(
            "wizardProgressBar"
        );


    if (progressBar) {

        progressBar.style.width =
            "20%";

    }


    const label =
        document.getElementById(
            "wizardStepLabel"
        );


    if (label) {

        label.textContent =
            "Registration Paused";

    }


    const percent =
        document.getElementById(
            "wizardStepPercent"
        );


    if (percent) {

        percent.textContent =
            "Registration Paused";

    }

}


/* =====================================================
   CONTINUE REGISTRATION FROM STOPPED
   ===================================================== */

function continueRegistrationFromStopped() {

    registrationStoppedForHealth = false;


    const stoppedScreen =
        getRegistrationStoppedScreen();

    const wizardActions =
        document.querySelector(
            ".wizard-actions"
        );


    /*
     * Hide paused screen.
     */

    if (stoppedScreen) {

        stoppedScreen.classList.remove(
            "active"
        );

        stoppedScreen.classList.add(
            "is-hidden"
        );

    }


    /*
     * Show wizard actions.
     */

    if (wizardActions) {

        wizardActions.classList.remove(
            "is-hidden"
        );

        wizardActions.style.display =
            "";

    }


    /*
     * Go back to Question 2.
     */

    currentWizardStep = 2;


    /*
     * Clear previous Yes/No selection.
     */

    document
        .querySelectorAll(
            'input[name="healthy"]'
        )
        .forEach(
            radio => {

                radio.checked = false;

            }
        );


    /*
     * Show navigation.
     */

    document
        .getElementById(
            "prevStepBtn"
        )
        ?.classList.remove(
            "is-hidden"
        );


    document
        .getElementById(
            "nextStepBtn"
        )
        ?.classList.remove(
            "is-hidden"
        );


    document
        .getElementById(
            "wizardSubmitBtn"
        )
        ?.classList.add(
            "is-hidden"
        );


    updateWizardUI();

    clearWizardMessage();


    /*
     * Scroll to Question 2.
     */

    const questionTwo =
        document.querySelector(
            '.wizard-step[data-step="2"]'
        );


    if (questionTwo) {

        questionTwo.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =====================================================
   GO TO DASHBOARD FROM REGISTRATION
   ===================================================== */

function goToDashboardFromRegistration() {

    registrationStoppedForHealth = false;

    medicationDetailsOpen = false;

    resetDonorWizard();

    showPage("dashboard");

}


/* =====================================================
   SHOW MEDICATION DETAILS
   ===================================================== */

function showMedicationDetails() {

    medicationDetailsOpen = true;


    document
        .querySelectorAll(
            ".wizard-step"
        )
        .forEach(
            step => {

                step.classList.remove(
                    "active"
                );

            }
        );


    const medicationStep =
        document.getElementById(
            "medicationDetailsStep"
        );


    if (medicationStep) {

        medicationStep.classList.add(
            "active"
        );

    }


    /*
     * Show Previous button.
     */

    document
        .getElementById(
            "prevStepBtn"
        )
        ?.classList.remove(
            "is-hidden"
        );


    /*
     * Hide Next and Submit.
     */

    document
        .getElementById(
            "nextStepBtn"
        )
        ?.classList.add(
            "is-hidden"
        );


    document
        .getElementById(
            "wizardSubmitBtn"
        )
        ?.classList.add(
            "is-hidden"
        );


    const label =
        document.getElementById(
            "wizardStepLabel"
        );


    if (label) {

        label.textContent =
            "Medication Information";

    }


    const percent =
        document.getElementById(
            "wizardStepPercent"
        );


    if (percent) {

        percent.textContent =
            "Medication Details";

    }


    const progressBar =
        document.getElementById(
            "wizardProgressBar"
        );


    if (progressBar) {

        progressBar.style.width =
            "90%";

    }

}


/* =====================================================
   CONTINUE FROM MEDICATION DETAILS
   ===================================================== */

function continueFromMedicationDetails() {

    const medicationName =
        document
            .getElementById(
                "medicationName"
            )
            ?.value
            .trim() || "";

    const medicationPurpose =
        document
            .getElementById(
                "medicationPurpose"
            )
            ?.value
            .trim() || "";

    const medicationDosage =
        document
            .getElementById(
                "medicationDosage"
            )
            ?.value
            .trim() || "";

    const medicationDuration =
        document
            .getElementById(
                "medicationDuration"
            )
            ?.value
            .trim() || "";


    if (
        !medicationName ||
        !medicationPurpose ||
        !medicationDosage ||
        !medicationDuration
    ) {

        showWizardMessage(
            "Please complete all required medication details.",
            "error"
        );

        return;

    }


    clearWizardMessage();

    medicationDetailsOpen = false;

    currentWizardStep = 10;

    updateWizardUI();

}


/* =====================================================
   WIZARD BACK BUTTON
   ===================================================== */

function wizardBack() {

    if (medicationDetailsOpen) {
        medicationDetailsOpen = false;
        currentWizardStep = 9;
        updateWizardUI();
        return;
    }

    if (registrationStoppedForHealth) {
        return;
    }

    if (currentWizardStep > 1 && currentWizardStep <= totalWizardSteps) {
        currentWizardStep--;
        
        // ===== ADD THIS CODE =====
        // If going back from Question 8, check if Question 7 should be shown
        if (currentWizardStep === 8) {
            const donatedBefore = getRadioValue("donatedBefore");
            if (donatedBefore === "no") {
                // Skip Question 7, go to Question 6
                currentWizardStep = 6;
            }
        }
        // ========================
        
        updateWizardUI();
    }
}

/* =====================================================
   UPDATE WIZARD UI
   ===================================================== */


/* =====================================================
   UPDATE WIZARD UI
   ===================================================== */

function updateWizardUI() {

    /*
     * If medication screen is open,
     * don't allow normal question rendering.
     */

    if (medicationDetailsOpen) {
        return;
    }

    /*
     * If registration is paused,
     * don't show normal questions.
     */

    if (registrationStoppedForHealth) {
        return;
    }

    // ===== ADD THIS CODE =====
    // Check if Question 7 should be visible based on Question 6 answer
    const donatedBefore = getRadioValue("donatedBefore");
    const question7 = document.querySelector('.wizard-step[data-step="7"]');
    
    if (donatedBefore === "no" && question7) {
        question7.style.display = "none";
        question7.classList.remove("active");
    } else if (question7) {
        question7.style.display = "";
    }
    // ==========================

    document
        .querySelectorAll(".wizard-step")
        .forEach(step => {

            const stepNumber = Number(step.dataset.step);

            // Skip Question 7 if user said "No" to donating before
            if (donatedBefore === "no" && stepNumber === 7) {
                return; // Skip this step
            }

            step.classList.toggle("active", stepNumber === currentWizardStep);
        });

    // Calculate progress - adjust for skipped Question 7
    let effectiveStep = currentWizardStep;
    let totalEffectiveSteps = totalWizardSteps;

    if (donatedBefore === "no") {
        // Question 7 is skipped, so adjust
        if (currentWizardStep > 7) {
            effectiveStep = currentWizardStep - 1;
        }
        totalEffectiveSteps = totalWizardSteps - 1; // 9 steps instead of 10
    }

    const progress = (effectiveStep / totalEffectiveSteps) * 100;

    const progressBar = document.getElementById("wizardProgressBar");
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }

    const label = document.getElementById("wizardStepLabel");
    if (label) {
        label.textContent = `Question ${effectiveStep} of ${totalEffectiveSteps}`;
    }

    const percent = document.getElementById("wizardStepPercent");
    if (percent) {
        percent.textContent = `${Math.round(progress)}% Completed`;
    }

    const prevBtn = document.getElementById("prevStepBtn");
    const nextBtn = document.getElementById("nextStepBtn");
    const submitBtn = document.getElementById("wizardSubmitBtn");

    /*
     * Previous button.
     */

    if (currentWizardStep === 1) {
        prevBtn?.classList.add("is-hidden");
    } else {
        prevBtn?.classList.remove("is-hidden");
    }

    /*
     * Check if current step is the last visible step
     */
    let lastVisibleStep = totalWizardSteps;
    if (donatedBefore === "no") {
        lastVisibleStep = totalWizardSteps - 1; // Skip Question 7
    }

    if (currentWizardStep === lastVisibleStep) {
        nextBtn?.classList.add("is-hidden");
        submitBtn?.classList.remove("is-hidden");
    } else {
        nextBtn?.classList.remove("is-hidden");
        submitBtn?.classList.add("is-hidden");
    }

}

/* =====================================================
   WIZARD VALIDATION
   ===================================================== */

function validateWizardStep(step) {

    clearWizardMessage();


    if (step === 1) {

        return validateRequiredRadio(
            "firstTime",
            "Please answer Question 1."
        );

    }


    if (step === 2) {

        return validateRequiredRadio(
            "healthy",
            "Please answer Question 2."
        );

    }


    if (step === 3) {

        const height =
            document.getElementById(
                "donorHeight"
            )?.value;

        const weight =
            document.getElementById(
                "donorWeight"
            )?.value;


        if (!height || !weight) {

            showWizardMessage(
                "Please enter both height and weight.",
                "error"
            );

            return false;

        }


        if (Number(weight) < 45) {

            showWizardMessage(
                "Donor weight must be at least 45 kg.",
                "error"
            );

            return false;

        }


        return true;

    }


    if (step === 4) {

        const age =
            Number(
                document.getElementById(
                    "donorAge"
                )?.value
            );


        if (!age) {

            showWizardMessage(
                "Please enter your age.",
                "error"
            );

            return false;

        }


        if (
            age < 18 ||
            age > 75
        ) {

            showWizardMessage(
                "Age must be between 18 and 75.",
                "error"
            );

            return false;

        }


        return true;

    }


    if (step === 5) {

        return validateRequiredRadio(
            "bloodGroup",
            "Please select your blood group."
        );

    }


    if (step === 6) {

        return validateRequiredRadio(
            "donatedBefore",
            "Please answer whether you have donated before."
        );

    }


    if (step === 7) {

        const donatedBefore =
            getRadioValue(
                "donatedBefore"
            );

        const date =
            document.getElementById(
                "lastDonation"
            )?.value;


        if (
            donatedBefore === "yes" &&
            !date
        ) {

            showWizardMessage(
                "Please provide your last donation date.",
                "error"
            );

            return false;

        }


        if (date) {

            const donationDate =
                new Date(date);

            const today =
                new Date();


            donationDate.setHours(
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
                donationDate > today
            ) {

                showWizardMessage(
                    "Last donation date cannot be in the future.",
                    "error"
                );

                return false;

            }

        }


        return true;

    }


    if (step === 8) {

        return validateRequiredRadio(
            "medicalCondition",
            "Please answer the medical condition question."
        );

    }


    if (step === 9) {

        return validateRequiredRadio(
            "medication",
            "Please answer the medication question."
        );

    }


    if (step === 10) {

        const name =
            document.getElementById(
                "donorName"
            )?.value.trim();

        const phone =
            document.getElementById(
                "donorPhone"
            )?.value.trim();

        const zone =
            document.getElementById(
                "donorZone"
            )?.value;

        const consent =
            document.getElementById(
                "donorConsent"
            )?.checked;


        if (
            !name ||
            !phone ||
            !zone
        ) {

            showWizardMessage(
                "Please complete all required profile fields.",
                "error"
            );

            return false;

        }


        if (!consent) {

            showWizardMessage(
                "Please accept the donor consent before continuing.",
                "error"
            );

            return false;

        }


        return true;

    }


    return true;

}


function validateRequiredRadio(
    name,
    message
) {

    const value =
        getRadioValue(name);


    if (!value) {

        showWizardMessage(
            message,
            "error"
        );

        return false;

    }


    return true;

}


function getRadioValue(name) {

    const selected =
        document.querySelector(
            `input[name="${name}"]:checked`
        );


    return selected
        ? selected.value
        : "";

}


/* =====================================================
   WIZARD MESSAGES
   ===================================================== */

function showWizardMessage(
    message,
    type = "error"
) {

    const element =
        document.getElementById(
            "message"
        );


    if (!element) return;


    element.textContent =
        message;

    element.className =
        `wizard-message ${type}`;

}


function clearWizardMessage() {

    const element =
        document.getElementById(
            "message"
        );


    if (!element) return;


    element.textContent =
        "";

    element.className =
        "wizard-message";

}


/* =====================================================
   DONOR REGISTRATION
   ===================================================== */

function handleDonorRegistration(event) {

    event.preventDefault();


    if (
        !validateWizardStep(
            totalWizardSteps
        )
    ) {

        return;

    }


    const firstTime =
        getRadioValue(
            "firstTime"
        );

    const healthy =
        getRadioValue(
            "healthy"
        );

    const bloodGroup =
        getRadioValue(
            "bloodGroup"
        );

    const donatedBefore =
        getRadioValue(
            "donatedBefore"
        );

    const medicalCondition =
        getRadioValue(
            "medicalCondition"
        );

    const medication =
        getRadioValue(
            "medication"
        );


    const donor = {

        id:
            "DNR-" +
            Date.now(),

        name:
            document
                .getElementById(
                    "donorName"
                )
                .value
                .trim(),

        phone:
            document
                .getElementById(
                    "donorPhone"
                )
                .value
                .trim(),

        bloodType:
            bloodGroup,

        bloodGroup:
            bloodGroup,

        age:
            Number(
                document
                    .getElementById(
                        "donorAge"
                    )
                    .value
            ),

        height:
            document
                .getElementById(
                    "donorHeight"
                )
                .value,

        weight:
            Number(
                document
                    .getElementById(
                        "donorWeight"
                    )
                    .value
            ),

        zone:
            document
                .getElementById(
                    "donorZone"
                )
                .value,

        firstTime:
            firstTime,

        healthy:
            healthy,

        donatedBefore:
            donatedBefore,

        medicalCondition:
            medicalCondition,

        medication:
            medication,

        lastDonation:
            donatedBefore === "yes"
                ? document
                    .getElementById(
                        "lastDonation"
                    )
                    .value
                : null,

        donationHistory:
            [],

        registeredAt:
            new Date().toISOString()

    };


    if (donor.lastDonation) {

        donor.donationHistory.push({

            date:
                donor.lastDonation,

            type:
                "Whole Blood",

            status:
                "Completed"

        });

    }


    donors.push(donor);

    saveDonors();


    showWizardMessage(
        "✓ Donor registration completed successfully!",
        "success"
    );


    updateDashboard();

    displayAllDonors();


    setTimeout(
        () => {

            resetDonorWizard();

            showPage("donors");

        },
        1000
    );

}


/* =====================================================
   RESET WIZARD
   ===================================================== */

function resetDonorWizard() {

    const form =
        document.getElementById(
            "donorForm"
        );


    if (form) {

        form.reset();

    }


    registrationStoppedForHealth = false;

    medicationDetailsOpen = false;

    currentWizardStep = 1;


    /*
     * Hide registration paused screen.
     */

    const stoppedScreen =
        getRegistrationStoppedScreen();


    if (stoppedScreen) {

        stoppedScreen.classList.remove(
            "active"
        );

        stoppedScreen.classList.add(
            "is-hidden"
        );

    }


    /*
     * Restore wizard actions.
     */

    const wizardActions =
        document.querySelector(
            ".wizard-actions"
        );


    if (wizardActions) {

        wizardActions.classList.remove(
            "is-hidden"
        );

        wizardActions.style.display =
            "";

    }


    /*
     * Clear medication fields.
     */

    [
        "medicationName",
        "medicationPurpose",
        "medicationDosage",
        "medicationDuration"
    ]
        .forEach(
            id => {

                const element =
                    document.getElementById(id);

                if (element) {

                    element.value = "";

                }

            }
        );


    updateWizardUI();

    clearWizardMessage();

}