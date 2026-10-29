/* =====================================================
   UTILS - UTILITY FUNCTIONS
   ===================================================== */

/* =====================================================
   UTILITY FUNCTIONS
   ===================================================== */

function formatDate(dateString) {

    if (!dateString) {

        return "-";

    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   GENERAL MESSAGE FUNCTION
   ===================================================== */

function showMessage(
    message,
    type = "success"
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


/* =====================================================
   EXPOSE FUNCTIONS FOR INLINE HTML
   ===================================================== */

/* =====================================================
   EXPOSE FUNCTIONS FOR INLINE HTML
   ===================================================== */

window.showPage =
    showPage;

window.wizardNext =
    wizardNext;

window.wizardBack =
    wizardBack;

window.returnToHealthQuestion =
    returnToHealthQuestion;

window.continueRegistrationFromStopped =
    continueRegistrationFromStopped;

window.goToDashboardFromRegistration =
    goToDashboardFromRegistration;

window.continueFromMedicationDetails =
    continueFromMedicationDetails;

window.openDonorProfile =
    openDonorProfile;

window.closeDonorProfile =
    closeDonorProfile;

window.addDonationFromProfile =
    addDonationFromProfile;

window.closeDonationModal =
    closeDonationModal;

window.openRequestModal =
    openRequestModal;

window.closeRequestModal =
    closeRequestModal;

window.runMatchForRequest =
    runMatchForRequest;

window.showMatchExplanation =
    showMatchExplanation;

window.closeMatchExplanation =
    closeMatchExplanation;

window.contactDonor =
    contactDonor;

window.contactProfileDonor =
    contactProfileDonor;

window.deleteProfileDonor =
    deleteProfileDonor;

window.handleHealthyChoice =
    handleHealthyChoice;

/* ADD THIS LINE ↓↓↓ */
window.deleteMessage =
    deleteMessage;

window.deleteRequest = 
    deleteRequest;