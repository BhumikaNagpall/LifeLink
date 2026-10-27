/* =====================================================
   MODALS - MODAL INITIALIZATION
   ===================================================== */

/* =====================================================
   DOM REFERENCES
   ===================================================== */

const donationModal =
    document.getElementById("donationModal");

const donorProfileModal =
    document.getElementById("donorProfileModal");

const requestModal =
    document.getElementById("requestModal");

const matchExplanationModal =
    document.getElementById("matchExplanationModal");


/* =====================================================
   MODAL INITIALIZATION
   ===================================================== */

function initializeModals() {

    [
        donorProfileModal,
        donationModal,
        requestModal,
        matchExplanationModal
    ]
        .filter(Boolean)
        .forEach(
            modal => {

                modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            modal
                        ) {

                            modal.classList.remove(
                                "show"
                            );

                        }

                    }
                );

            }
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                document
                    .querySelectorAll(
                        ".modal.show"
                    )
                    .forEach(
                        modal =>
                            modal.classList.remove(
                                "show"
                            )
                    );

            }

        }
    );

}
