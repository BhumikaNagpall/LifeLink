/* =====================================================
   LIFELINK - MODAL UTILITIES
   Initializes backdrop click dismissals and escape key handling
   ===================================================== */

const donationModal = document.getElementById("donationModal");
const donorProfileModal = document.getElementById("donorProfileModal");
const requestModal = document.getElementById("requestModal");
const matchExplanationModal = document.getElementById("matchExplanationModal");

function initializeModals() {
    // Bind backdrop click to close any modal in the application
    const allModals = document.querySelectorAll(".modal");
    allModals.forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.classList.remove("show");
            }
        });
    });

    // Dismiss active modals on pressing Escape
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            document.querySelectorAll(".modal.show").forEach(modal => {
                modal.classList.remove("show");
            });
        }
    });
}

// Window bindings
window.initializeModals = initializeModals;
