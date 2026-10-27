/* =====================================================
   WIZARD - REGISTRATION WIZARD
   ===================================================== */

function initializeWizard() {

    const donorForm = document.getElementById("donorForm");
    if (!donorForm) return;

    donorForm.addEventListener("submit", function(e) {
        handleDonorRegistration(e);
    });

    // Listen for changes on "Have you donated before?" question
    document.querySelectorAll('input[name="donatedBefore"]').forEach(radio => {
        radio.addEventListener("change", function() {
            toggleDonationDateQuestion(this.value);
        });
    });

    updateWizardUI();
}

function toggleDonationDateQuestion(value) {
    const question7 = document.querySelector('.wizard-step[data-step="7"]');
    const progressBar = document.getElementById("wizardProgressBar");
    const stepLabel = document.getElementById("wizardStepLabel");
    const stepPercent = document.getElementById("wizardStepPercent");

    if (value === "no") {
        if (question7) {
            question7.style.display = "none";
            question7.classList.remove("active");
        }
        
        const effectiveStep = currentWizardStep > 7 ? currentWizardStep - 1 : currentWizardStep;
        const totalEffectiveSteps = 9;
        const progress = (effectiveStep / totalEffectiveSteps) * 100;
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (stepLabel) stepLabel.textContent = `Question ${effectiveStep} of ${totalEffectiveSteps}`;
        if (stepPercent) stepPercent.textContent = `${Math.round(progress)}% Completed`;

    } else {
        if (question7) {
            question7.style.display = "";
        }
        
        const progress = (currentWizardStep / totalWizardSteps) * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (stepLabel) stepLabel.textContent = `Question ${currentWizardStep} of ${totalWizardSteps}`;
        if (stepPercent) stepPercent.textContent = `${Math.round(progress)}% Completed`;
    }
}

function initializeHealthQuestion() {
    document.querySelectorAll('input[name="healthy"]').forEach(radio => {
        radio.addEventListener("change", function() {
            handleHealthyChoice(this.value);
        });
    });
}

function getRegistrationStoppedScreen() {
    return (
        document.getElementById("registrationStopped") ||
        document.getElementById("registrationStoppedScreen")
    );
}

function handleHealthyChoice(value) {

    const stoppedScreen = getRegistrationStoppedScreen();
    const wizardActions = document.querySelector(".wizard-actions");

    if (value === "no") {
        registrationStoppedForHealth = true;

        document.querySelectorAll(".wizard-step").forEach(step => {
            step.classList.remove("active");
        });

        if (stoppedScreen) {
            stoppedScreen.classList.remove("is-hidden");
            stoppedScreen.classList.add("active");
        }

        if (wizardActions) {
            wizardActions.classList.add("is-hidden");
            wizardActions.style.display = "none";
        }

        document.getElementById("prevStepBtn")?.classList.add("is-hidden");
        document.getElementById("nextStepBtn")?.classList.add("is-hidden");
        document.getElementById("wizardSubmitBtn")?.classList.add("is-hidden");

        const label = document.getElementById("wizardStepLabel");
        if (label) label.textContent = "Registration Paused";

        const percent = document.getElementById("wizardStepPercent");
        if (percent) percent.textContent = "Registration Paused";

        const progressBar = document.getElementById("wizardProgressBar");
        if (progressBar) progressBar.style.width = "20%";

        return;
    }

    registrationStoppedForHealth = false;

    if (stoppedScreen) {
        stoppedScreen.classList.remove("active");
        stoppedScreen.classList.add("is-hidden");
    }

    if (wizardActions) {
        wizardActions.classList.remove("is-hidden");
        wizardActions.style.display = "";
    }

    currentWizardStep = 2;
    updateWizardUI();
}

function wizardNext() {

    if (registrationStoppedForHealth) {
        return;
    }

    if (!validateWizardStep(currentWizardStep)) {
        return;
    }

    if (currentWizardStep === 2 && getRadioValue("healthy") === "no") {
        showRegistrationStopped();
        return;
    }

    // ===== FIX: Skip Question 7 but keep all other steps =====
    if (currentWizardStep === 6) {
        const donatedBefore = getRadioValue("donatedBefore");
        if (donatedBefore === "no") {
            currentWizardStep = 8; // Skip to Question 8
            updateWizardUI();
            return;
        }
    }

    if (currentWizardStep === 9 && getRadioValue("medication") === "yes") {
        showMedicationDetails();
        return;
    }

    // ===== FIX: Always go to Question 10 =====
    if (currentWizardStep < totalWizardSteps) {
        currentWizardStep++;
        updateWizardUI();
    }
}
 

function showRegistrationStopped() {

    registrationStoppedForHealth = true;

    const stoppedScreen = getRegistrationStoppedScreen();
    const wizardActions = document.querySelector(".wizard-actions");

    document.querySelectorAll(".wizard-step").forEach(step => {
        step.classList.remove("active");
    });

    if (stoppedScreen) {
        stoppedScreen.classList.remove("is-hidden");
        stoppedScreen.classList.add("active");
    }

    if (wizardActions) {
        wizardActions.classList.add("is-hidden");
        wizardActions.style.display = "none";
    }

    document.getElementById("prevStepBtn")?.classList.add("is-hidden");
    document.getElementById("nextStepBtn")?.classList.add("is-hidden");
    document.getElementById("wizardSubmitBtn")?.classList.add("is-hidden");

    const progressBar = document.getElementById("wizardProgressBar");
    if (progressBar) progressBar.style.width = "20%";

    const label = document.getElementById("wizardStepLabel");
    if (label) label.textContent = "Registration Paused";

    const percent = document.getElementById("wizardStepPercent");
    if (percent) percent.textContent = "Registration Paused";
}

function continueRegistrationFromStopped() {

    registrationStoppedForHealth = false;

    const stoppedScreen = getRegistrationStoppedScreen();
    const wizardActions = document.querySelector(".wizard-actions");

    if (stoppedScreen) {
        stoppedScreen.classList.remove("active");
        stoppedScreen.classList.add("is-hidden");
    }

    if (wizardActions) {
        wizardActions.classList.remove("is-hidden");
        wizardActions.style.display = "";
    }

    currentWizardStep = 2;

    document.querySelectorAll('input[name="healthy"]').forEach(radio => {
        radio.checked = false;
    });

    document.getElementById("prevStepBtn")?.classList.remove("is-hidden");
    document.getElementById("nextStepBtn")?.classList.remove("is-hidden");
    document.getElementById("wizardSubmitBtn")?.classList.add("is-hidden");

    updateWizardUI();
    clearWizardMessage();

    const questionTwo = document.querySelector('.wizard-step[data-step="2"]');
    if (questionTwo) {
        questionTwo.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function goToDashboardFromRegistration() {
    registrationStoppedForHealth = false;
    medicationDetailsOpen = false;
    resetDonorWizard();
    showPage("dashboard");
}

function showMedicationDetails() {

    medicationDetailsOpen = true;

    document.querySelectorAll(".wizard-step").forEach(step => {
        step.classList.remove("active");
    });

    const medicationStep = document.getElementById("medicationDetailsStep");
    if (medicationStep) {
        medicationStep.classList.add("active");
    }

    document.getElementById("prevStepBtn")?.classList.remove("is-hidden");
    document.getElementById("nextStepBtn")?.classList.add("is-hidden");
    document.getElementById("wizardSubmitBtn")?.classList.add("is-hidden");

    const label = document.getElementById("wizardStepLabel");
    if (label) label.textContent = "Medication Information";

    const percent = document.getElementById("wizardStepPercent");
    if (percent) percent.textContent = "Medication Details";

    const progressBar = document.getElementById("wizardProgressBar");
    if (progressBar) progressBar.style.width = "90%";
}

function continueFromMedicationDetails() {

    const medicationName = document.getElementById("medicationName")?.value.trim() || "";
    const medicationPurpose = document.getElementById("medicationPurpose")?.value.trim() || "";
    const medicationDosage = document.getElementById("medicationDosage")?.value.trim() || "";
    const medicationDuration = document.getElementById("medicationDuration")?.value.trim() || "";

    if (!medicationName || !medicationPurpose || !medicationDosage || !medicationDuration) {
        showWizardMessage("Please complete all required medication details.", "error");
        return;
    }

    clearWizardMessage();
    medicationDetailsOpen = false;
    currentWizardStep = 10;
    updateWizardUI();
}

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
        
        // ===== FIX: If going back from Question 8, check if Question 7 should be shown =====
        if (currentWizardStep === 8) {
            const donatedBefore = getRadioValue("donatedBefore");
            if (donatedBefore === "no") {
                currentWizardStep = 6; // Skip Question 7, go to Question 6
            }
        }
        
        updateWizardUI();
    }
}

function updateWizardUI() {

    if (medicationDetailsOpen) {
        return;
    }

    if (registrationStoppedForHealth) {
        return;
    }

    const donatedBefore = getRadioValue("donatedBefore");
    const question7 = document.querySelector('.wizard-step[data-step="7"]');
    
    // ===== FIX: ONLY hide Question 7, nothing else =====
    if (donatedBefore === "no" && question7) {
        question7.style.display = "none";
        question7.classList.remove("active");
    } else if (question7) {
        question7.style.display = "";
    }

    document.querySelectorAll(".wizard-step").forEach(step => {
        const stepNumber = Number(step.dataset.step);

        if (donatedBefore === "no" && stepNumber === 7) {
            return; // Skip Question 7
        }

        step.classList.toggle("active", stepNumber === currentWizardStep);
    });

    // ===== FIX: Progress calculation =====
    let effectiveStep = currentWizardStep;
    let totalEffectiveSteps = totalWizardSteps;

    if (donatedBefore === "no") {
        if (currentWizardStep > 7) {
            effectiveStep = currentWizardStep - 1;
        }
        totalEffectiveSteps = totalWizardSteps - 1; // 9 steps total
    }

    if (effectiveStep > totalEffectiveSteps) {
        effectiveStep = totalEffectiveSteps;
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

    if (currentWizardStep === 1) {
        prevBtn?.classList.add("is-hidden");
    } else {
        prevBtn?.classList.remove("is-hidden");
    }

    // ===== FIX: Complete Registration ALWAYS on Question 10 =====
    if (currentWizardStep === totalWizardSteps) {
        nextBtn?.classList.add("is-hidden");
        submitBtn?.classList.remove("is-hidden");
    } else {
        nextBtn?.classList.remove("is-hidden");
        submitBtn?.classList.add("is-hidden");
    }
}

function validateWizardStep(step) {

    clearWizardMessage();

    const donatedBefore = getRadioValue("donatedBefore");
    const lastStep = donatedBefore === "no" ? totalWizardSteps - 1 : totalWizardSteps;

    if (step > lastStep) {
        return true;
    }

    if (step === 1) {
        return validateRequiredRadio("firstTime", "Please answer Question 1.");
    }

    if (step === 2) {
        return validateRequiredRadio("healthy", "Please answer Question 2.");
    }

    if (step === 3) {
        const height = document.getElementById("donorHeight")?.value;
        const weight = document.getElementById("donorWeight")?.value;

        if (!height || !weight) {
            showWizardMessage("Please enter both height and weight.", "error");
            return false;
        }

        if (Number(weight) < 45) {
            showWizardMessage("Donor weight must be at least 45 kg.", "error");
            return false;
        }

        return true;
    }

    if (step === 4) {
        const age = Number(document.getElementById("donorAge")?.value);

        if (!age) {
            showWizardMessage("Please enter your age.", "error");
            return false;
        }

        if (age < 18 || age > 75) {
            showWizardMessage("Age must be between 18 and 75.", "error");
            return false;
        }

        return true;
    }

    if (step === 5) {
        return validateRequiredRadio("bloodGroup", "Please select your blood group.");
    }

    if (step === 6) {
        return validateRequiredRadio("donatedBefore", "Please answer whether you have donated before.");
    }

    if (step === 7) {
        const donatedBefore = getRadioValue("donatedBefore");
        const date = document.getElementById("lastDonation")?.value;

        if (donatedBefore === "yes") {
            if (!date) {
                showWizardMessage("Please provide your last donation date.", "error");
                return false;
            }

            if (date) {
                const donationDate = new Date(date);
                const today = new Date();
                donationDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);

                if (donationDate > today) {
                    showWizardMessage("Last donation date cannot be in the future.", "error");
                    return false;
                }
            }
        }
        return true;
    }

    if (step === 8) {
        return validateRequiredRadio("medicalCondition", "Please answer the medical condition question.");
    }

    if (step === 9) {
        return validateRequiredRadio("medication", "Please answer the medication question.");
    }

    // ===== FIX: Always validate Question 10 =====
    if (step === 10) {
        const name = document.getElementById("donorName")?.value.trim();
        const phone = document.getElementById("donorPhone")?.value.trim();
        const zone = document.getElementById("donorZone")?.value;
        const consent = document.getElementById("donorConsent")?.checked;

        if (!name || !phone || !zone) {
            showWizardMessage("Please complete all required profile fields.", "error");
            return false;
        }

        if (!consent) {
            showWizardMessage("Please accept the donor consent before continuing.", "error");
            return false;
        }

        return true;
    }

    return true;
}

function validateRequiredRadio(name, message) {
    const value = getRadioValue(name);
    if (!value) {
        showWizardMessage(message, "error");
        return false;
    }
    return true;
}

function getRadioValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : "";
}

function showWizardMessage(message, type = "error") {
    const element = document.getElementById("message");
    if (!element) return;
    element.textContent = message;
    element.className = `wizard-message ${type}`;
}

function clearWizardMessage() {
    const element = document.getElementById("message");
    if (!element) return;
    element.textContent = "";
    element.className = "wizard-message";
}

function handleDonorRegistration(event) {

    if (event) {
        event.preventDefault();
    }

    const donatedBefore = getRadioValue("donatedBefore");
    
    // ===== FIX: Always validate Question 10 fields =====
    const name = document.getElementById("donorName")?.value.trim();
    const phone = document.getElementById("donorPhone")?.value.trim();
    const zone = document.getElementById("donorZone")?.value;
    const consent = document.getElementById("donorConsent")?.checked;

    if (!name || !phone || !zone) {
        showWizardMessage("Please complete all required profile fields.", "error");
        return;
    }

    if (!consent) {
        showWizardMessage("Please accept the donor consent before continuing.", "error");
        return;
    }

    const firstTime = getRadioValue("firstTime");
    const healthy = getRadioValue("healthy");
    const bloodGroup = getRadioValue("bloodGroup");
    const medicalCondition = getRadioValue("medicalCondition");
    const medication = getRadioValue("medication");

    const donor = {
        id: "DNR-" + Date.now(),
        name: name,
        phone: phone,
        bloodType: bloodGroup,
        bloodGroup: bloodGroup,
        age: Number(document.getElementById("donorAge").value),
        height: document.getElementById("donorHeight").value,
        weight: Number(document.getElementById("donorWeight").value),
        zone: zone,
        firstTime: firstTime,
        healthy: healthy,
        donatedBefore: donatedBefore,
        medicalCondition: medicalCondition,
        medication: medication,
        lastDonation: donatedBefore === "yes" ? document.getElementById("lastDonation").value : null,
        donationHistory: [],
        registeredAt: new Date().toISOString()
    };

    if (donor.lastDonation) {
        donor.donationHistory.push({
            date: donor.lastDonation,
            type: "Whole Blood",
            status: "Completed"
        });
    }

    donors.push(donor);
    saveDonors();

    showWizardMessage("✓ Donor registration completed successfully!", "success");

    updateDashboard();
    displayAllDonors();

    setTimeout(() => {
        resetDonorWizard();
        showPage("donors");
    }, 1000);
}

function resetDonorWizard() {

    const form = document.getElementById("donorForm");
    if (form) {
        form.reset();
    }

    registrationStoppedForHealth = false;
    medicationDetailsOpen = false;
    currentWizardStep = 1;

    const stoppedScreen = getRegistrationStoppedScreen();
    if (stoppedScreen) {
        stoppedScreen.classList.remove("active");
        stoppedScreen.classList.add("is-hidden");
    }

    const wizardActions = document.querySelector(".wizard-actions");
    if (wizardActions) {
        wizardActions.classList.remove("is-hidden");
        wizardActions.style.display = "";
    }

    ["medicationName", "medicationPurpose", "medicationDosage", "medicationDuration"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = "";
        }
    });

    updateWizardUI();
    clearWizardMessage();
}
