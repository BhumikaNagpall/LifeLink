/* =====================================================
   LIFELINK - NAVIGATION & ROUTE GUARDS
   Enforces role-based views and safe transitions
   ===================================================== */

function initializeNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const page = button.dataset.page;
            if (page) {
                showPage(page);
            }
        });
    });

    // Default to landing page if no active user session, otherwise route appropriately
    const user = window.api ? api.getUser() : null;
    if (!user) {
        showPage("landing");
    } else if (user.role === "admin") {
        showPage("admin");
    } else {
        showPage("dashboard");
    }
}

function showPage(pageId) {
    const user = window.api ? api.getUser() : null;

    // --- FRONTEND ROUTE GUARDS ---
    if (pageId === "admin") {
        if (!user || user.role !== "admin") {
            if (typeof openAuthModal === "function") {
                openAuthModal();
                if (typeof setAuthMessage === "function") {
                    setAuthMessage("Administrator authentication required to access the control panel.", "error");
                }
            }
            return;
        }
    }

    if (pageId === "find") {
        if (!user || (user.role !== "hospital" && user.role !== "admin")) {
            if (typeof openAuthModal === "function") {
                openAuthModal();
                if (typeof setAuthMessage === "function") {
                    setAuthMessage("Healthcare facility staff credentials required to run the Smart Matcher.", "error");
                }
            }
            return;
        }
    }

    // Inbox is rendered as a modal overlay, not a standalone blankable page section
    if (pageId === "inbox") {
        if (typeof openDonorInboxModal === "function") {
            openDonorInboxModal();
        }
        return;
    }

    // Switch active page
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active-page");
    });

    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add("active-page");
    }

    // Update active nav button
    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.page === pageId);
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    // Page-specific trigger actions
    if (pageId === "landing") {
        loadLandingStats();
    } else if (pageId === "dashboard") {
        if (typeof updateDashboard === "function") updateDashboard();
    } else if (pageId === "donors") {
        if (typeof displayAllDonors === "function") displayAllDonors();
    } else if (pageId === "requests") {
        if (typeof displayRequests === "function") displayRequests();
    } else if (pageId === "admin") {
        if (typeof loadAdminData === "function") loadAdminData();
    } else if (pageId === "contact") {
        if (typeof displayMessages === "function") displayMessages();
    }
}

async function loadLandingStats() {
    try {
        const response = await fetch("/api/hospital/dashboard-stats");
        const data = await response.json();
        if (data.success && data.metrics) {
            const m = data.metrics;
            const elDonors = document.getElementById("landingStatActiveDonors");
            const elReqs = document.getElementById("landingStatRequests");

            if (elDonors && m.totalDonors !== undefined) {
                elDonors.textContent = `${m.totalDonors}+`;
            }
            if (elReqs && m.openRequests !== undefined) {
                elReqs.textContent = `${m.openRequests} Active`;
            }
        }
    } catch (e) {
        console.warn("Could not load landing stats", e);
    }
}

window.initializeNavigation = initializeNavigation;
window.showPage = showPage;
window.loadLandingStats = loadLandingStats;
