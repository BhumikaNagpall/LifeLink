/* =====================================================
   NAVIGATION - PAGE NAVIGATION
   ===================================================== */

/* =====================================================
   NAVIGATION
   ===================================================== */

function initializeNavigation() {

    const navButtons =
        document.querySelectorAll(
            ".nav-btn"
        );


    navButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    showPage(page);

                }
            );

        }
    );

}


function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(
            page =>
                page.classList.remove(
                    "active-page"
                )
        );


    const target =
        document.getElementById(
            pageId
        );


    if (target) {

        target.classList.add(
            "active-page"
        );

    }


    document
        .querySelectorAll(".nav-btn")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page === pageId
                );

            }
        );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    if (pageId === "dashboard") {

        updateDashboard();

    }


    if (pageId === "donors") {

        displayAllDonors();

    }


    if (pageId === "requests") {

        displayRequests();

    }


    if (pageId === "contact") {

        displayMessages();

    }

}