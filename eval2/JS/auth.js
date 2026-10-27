/* =====================================================
   LIFELINK - AUTHENTICATION MODULE
   Manages REST API login, registration, JWT sessions,
   and dynamic navbar authentication status.
   ===================================================== */

// Global auth state
let currentAuthMode = "login";

// DOM References
function getAuthElements() {
    return {
        authGate: document.getElementById("authGate"),
        authForm: document.getElementById("authForm"),
        authTitle: document.getElementById("authTitle"),
        authSubtitle: document.getElementById("authSubtitle"),
        authName: document.getElementById("authName"),
        authRole: document.getElementById("authRole"),
        authEmail: document.getElementById("authEmail"),
        authPassword: document.getElementById("authPassword"),
        authSubmitBtn: document.getElementById("authSubmitBtn"),
        authToggleBtn: document.getElementById("authToggleBtn"),
        authForgotBtn: document.getElementById("authForgotBtn"),
        authMessage: document.getElementById("authMessage"),
        navLoginBtn: document.getElementById("navLoginBtn"),
        navUserBadge: document.getElementById("navUserBadge"),
        navUserName: document.getElementById("navUserName"),
        navUserRole: document.getElementById("navUserRole")
    };
}

/* =====================================================
   INITIALIZATION
   ===================================================== */

function initializeAuthentication() {
    const el = getAuthElements();

    if (el.authForm) {
        el.authForm.addEventListener("submit", handleAuthentication);
    }

    if (el.authToggleBtn) {
        el.authToggleBtn.addEventListener("click", toggleAuthMode);
    }

    if (el.authForgotBtn) {
        el.authForgotBtn.addEventListener("click", toggleForgotMode);
    }

    // Dismiss modal on clicking outside the card
    if (el.authGate) {
        el.authGate.addEventListener("click", (e) => {
            if (e.target === el.authGate) {
                closeAuthModal();
            }
        });
    }

    // Dismiss modal on pressing Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeAuthModal();
        }
    });

    // Render current auth state in navbar
    renderAuthNavbar();
}

/* =====================================================
   MODAL CONTROLS
   ===================================================== */

function openAuthModal() {
    const el = getAuthElements();
    if (el.authGate) {
        el.authGate.classList.remove("is-hidden");
        clearAuthMessage();
    }
}

function closeAuthModal() {
    const el = getAuthElements();
    if (el.authGate) {
        el.authGate.classList.add("is-hidden");
        clearAuthMessage();
    }
}

// Legacy aliases
function showAuthGate() { openAuthModal(); }
function hideAuthGate() { closeAuthModal(); }

/* =====================================================
   MODE TOGGLE (LOGIN <-> SIGNUP)
   ===================================================== */

function toggleAuthMode() {
    const el = getAuthElements();
    const nameField = document.querySelector(".auth-name-field");
    const roleField = document.querySelector(".auth-role-field");
    const passwordField = el.authPassword ? el.authPassword.closest(".auth-field") : null;

    if (passwordField) passwordField.style.display = "block";
    if (el.authPassword) el.authPassword.required = true;
    if (el.authForgotBtn) el.authForgotBtn.style.display = "inline-block";

    if (currentAuthMode === "login" || currentAuthMode === "forgot") {
        currentAuthMode = "signup";

        if (el.authTitle) el.authTitle.textContent = "Create an Account";
        if (el.authSubtitle) el.authSubtitle.textContent = "Join the LifeLink healthcare donor network.";
        if (el.authSubmitBtn) el.authSubmitBtn.textContent = "Create Account";
        if (el.authToggleBtn) el.authToggleBtn.textContent = "Already have an account? Sign In";

        if (nameField) nameField.classList.remove("is-hidden");
        if (roleField) roleField.classList.remove("is-hidden");
        if (el.authName) el.authName.required = true;
    } else {
        currentAuthMode = "login";

        if (el.authTitle) el.authTitle.textContent = "Welcome Back";
        if (el.authSubtitle) el.authSubtitle.textContent = "Login to access the LifeLink blood donation network.";
        if (el.authSubmitBtn) el.authSubmitBtn.textContent = "Login";
        if (el.authToggleBtn) el.authToggleBtn.textContent = "New user? Create an account";

        if (nameField) nameField.classList.add("is-hidden");
        if (roleField) roleField.classList.add("is-hidden");
        if (el.authName) el.authName.required = false;
    }

    clearAuthMessage();
}

function toggleForgotMode() {
    const el = getAuthElements();
    const nameField = document.querySelector(".auth-name-field");
    const roleField = document.querySelector(".auth-role-field");
    const passwordField = el.authPassword ? el.authPassword.closest(".auth-field") : null;

    if (currentAuthMode !== "forgot") {
        currentAuthMode = "forgot";
        if (el.authTitle) el.authTitle.textContent = "Account Recovery";
        if (el.authSubtitle) el.authSubtitle.textContent = "Enter your registered email address to receive password reset instructions.";
        if (el.authSubmitBtn) el.authSubmitBtn.textContent = "Send Recovery Token";
        if (el.authToggleBtn) el.authToggleBtn.textContent = "Back to Login";
        if (nameField) nameField.classList.add("is-hidden");
        if (roleField) roleField.classList.add("is-hidden");
        if (passwordField) passwordField.style.display = "none";
        if (el.authPassword) el.authPassword.required = false;
        if (el.authForgotBtn) el.authForgotBtn.style.display = "none";
    } else {
        toggleAuthMode();
    }
    clearAuthMessage();
}

/* =====================================================
   QUICK DEMO CREDENTIAL FILLER
   ===================================================== */

function quickFillDemo(type) {
    const el = getAuthElements();
    if (!el.authEmail || !el.authPassword) return;

    // Reset to login mode if currently in signup
    if (currentAuthMode === "signup") {
        toggleAuthMode();
    }

    if (type === "hospital") {
        el.authEmail.value = "hospital@citycare.org";
        el.authPassword.value = "HospitalSecurePass123!";
        setAuthMessage("Filled Authorized Hospital Partner (Dr. Radhika Nair). Click Login.", "success");
    } else if (type === "janedoe" || type === "doctor") {
        el.authEmail.value = "jane.doe@citycare.org";
        el.authPassword.value = "JaneDoeSecure123!";
        setAuthMessage("Filled Medical Officer (Dr. Jane Doe). Click Login.", "success");
    } else if (type === "donor") {
        el.authEmail.value = "aarav.donor@example.com";
        el.authPassword.value = "DonorSecurePass123!";
        setAuthMessage("Filled Volunteer Donor (Aarav Sharma - O-). Click Login.", "success");
    } else if (type === "admin") {
        el.authEmail.value = "admin@lifelink.internal";
        el.authPassword.value = "AdminSecurePass123!";
        setAuthMessage("Filled Platform Admin (Dr. Alok Verma). Click Login.", "success");
    }
}

/* =====================================================
   AUTHENTICATION HANDLER (REST API)
   ===================================================== */

async function handleAuthentication(event) {
    event.preventDefault();
    clearAuthMessage();

    const el = getAuthElements();
    const email = el.authEmail?.value.trim().toLowerCase() || "";
    const password = el.authPassword?.value.trim() || "";

    if (currentAuthMode === "forgot") {
        if (!email) {
            setAuthMessage("Please enter your registered email address.", "error");
            return;
        }
    } else if (!email || !password) {
        setAuthMessage("Please enter email and password.", "error");
        return;
    }

    const submitBtn = el.authSubmitBtn;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = currentAuthMode === "login"
            ? "Logging in..."
            : (currentAuthMode === "forgot" ? "Processing..." : "Creating account...");
    }

    try {
        if (currentAuthMode === "forgot") {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to process recovery request.");
            }

            if (data.resetToken) {
                setAuthMessage(`Demo Token Generated: ${data.resetToken}`, "info");
            } else {
                setAuthMessage(data.message || "Recovery instructions sent.", "success");
            }
            return;
        }
        if (currentAuthMode === "signup") {
            const name = el.authName?.value.trim() || "";
            const role = el.authRole?.value || "donor";

            if (!name) {
                setAuthMessage("Please enter your full name.", "error");
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Create Account"; }
                return;
            }

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            // Save JWT and user session
            if (window.api) {
                api.setToken(data.token);
                const userSession = Object.assign({}, data.user, { profile: data.profile || null });
                api.setUser(userSession);
            }

            setAuthMessage(`Account created! Welcome, ${data.user.name}.`, "success");
            renderAuthNavbar();

            setTimeout(() => {
                closeAuthModal();
            }, 700);

        } else {
            // Login mode
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Invalid email or password");
            }

            // Save JWT and user session
            if (window.api) {
                api.setToken(data.token);
                const userSession = Object.assign({}, data.user, { profile: data.profile || null });
                api.setUser(userSession);
            }

            setAuthMessage(`Welcome back, ${data.user.name}!`, "success");
            renderAuthNavbar();

            // Refresh dashboard or other views if applicable
            if (typeof updateDashboard === "function") {
                updateDashboard();
            }

            setTimeout(() => {
                closeAuthModal();
                if (typeof showPage === "function") {
                    if (data.user && data.user.role === "admin") {
                        showPage("admin");
                    } else if (data.user) {
                        showPage("dashboard");
                    }
                }
            }, 600);
        }
    } catch (error) {
        console.error("Auth error:", error);
        setAuthMessage(error.message || "Authentication failed. Please try again.", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = currentAuthMode === "login" ? "Login" : "Create Account";
        }
    }
}

/* =====================================================
   LOGOUT & CONFIRMATION HANDLERS
   ===================================================== */

let isLoggingOut = false;

function handleLogout() {
    openLogoutConfirmation();
}

function openLogoutConfirmation() {
    const modal = document.getElementById("logoutConfirmModal");
    if (modal) {
        modal.classList.add("show");
    } else {
        if (confirm("Are you sure you want to log out of LifeLink?")) {
            confirmLogout();
        }
    }
}

function closeLogoutModal() {
    const modal = document.getElementById("logoutConfirmModal");
    if (modal) {
        modal.classList.remove("show");
    }
}

async function confirmLogout() {
    if (isLoggingOut) return;
    isLoggingOut = true;

    const confirmBtn = document.getElementById("logoutConfirmBtn");
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Logging out...";
    }

    try {
        if (window.api && typeof api.post === "function") {
            await api.post("/api/auth/logout").catch(() => {});
        }
    } finally {
        if (window.api) {
            api.clearToken();
        }
        closeLogoutModal();
        renderAuthNavbar();

        if (typeof showPage === "function") {
            showPage("landing");
        }

        if (typeof showToast === "function") {
            showToast("Logged out successfully.", "info");
        }

        isLoggingOut = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Log out";
        }
    }
}

/* =====================================================
   HOSPITAL STAFF ACCESS ROUTER
   ===================================================== */

async function handleHospitalStaffAccess() {
    const user = window.api ? api.getUser() : null;
    const token = window.api ? api.getToken() : null;

    if (!user || !token) {
        if (typeof openAuthModal === "function") {
            openAuthModal();
            const roleSelect = document.getElementById("authRole");
            if (roleSelect) roleSelect.value = "hospital";
            setAuthMessage("Please sign in with your healthcare facility credentials to access the Hospital Console.", "info");
        }
        return;
    }

    if (user.role === "hospital") {
        // Authoritative validation with backend
        try {
            if (window.api && typeof api.getMe === "function") {
                const res = await api.getMe();
                if (!res || !res.success) {
                    throw new Error("Session invalid");
                }
            }
            if (typeof showPage === "function") {
                showPage("dashboard");
            }
            if (typeof showToast === "function") {
                showToast(`Welcome back, ${user.name || "Hospital Staff"}.`, "info");
            }
        } catch (err) {
            console.warn("Session expired on hospital access:", err.message);
            if (window.api) api.clearToken();
            renderAuthNavbar();
            if (typeof openAuthModal === "function") {
                openAuthModal();
                setAuthMessage("Your session has expired. Please log in again to continue.", "error");
            }
        }
    } else if (user.role === "admin") {
        if (typeof showPage === "function") {
            showPage("admin");
        }
        if (typeof showToast === "function") {
            showToast("Routing to Administration Console.", "info");
        }
    } else if (user.role === "donor") {
        if (typeof showToast === "function") {
            showToast("You are signed in as a Volunteer Donor. Hospital Staff Access requires healthcare facility credentials.", "warning");
        } else {
            alert("You are currently signed in as a Volunteer Donor. Hospital Staff Access requires healthcare facility credentials. Please log out and sign in with your hospital staff account.");
        }
    } else {
        if (typeof openAuthModal === "function") {
            openAuthModal();
        }
    }
}

/* =====================================================
   NAVBAR AUTH STATUS RENDERER
   ===================================================== */

function renderAuthNavbar() {
    const el = getAuthElements();
    const user = window.api ? api.getUser() : null;
    const token = window.api ? api.getToken() : null;
    const navAdminBtn = document.getElementById("navAdminBtn");
    const inboxNavBtn = document.getElementById("inboxNavBtn");

    if (user && token) {
        // Logged in
        if (el.navLoginBtn) el.navLoginBtn.classList.add("is-hidden");
        if (el.navUserBadge) el.navUserBadge.classList.remove("is-hidden");
        if (el.navUserName) el.navUserName.textContent = user.name || "User";
        if (el.navUserRole) {
            const roleLabel = (user.role || "user").replace("_", " ").toUpperCase();
            el.navUserRole.textContent = roleLabel;
        }

        if (navAdminBtn) {
            navAdminBtn.style.display = user.role === "admin" ? "inline-flex" : "none";
        }
        if (inboxNavBtn) {
            inboxNavBtn.style.display = user.role === "donor" ? "inline-flex" : "none";
        }
    } else {
        // Guest mode
        if (el.navLoginBtn) el.navLoginBtn.classList.remove("is-hidden");
        if (el.navUserBadge) el.navUserBadge.classList.add("is-hidden");
        if (navAdminBtn) navAdminBtn.style.display = "none";
        if (inboxNavBtn) inboxNavBtn.style.display = "none";
    }
}

/* =====================================================
   UI MESSAGE HELPERS
   ===================================================== */

function setAuthMessage(message, type) {
    const el = getAuthElements();
    if (!el.authMessage) return;

    el.authMessage.textContent = message;
    el.authMessage.className = "auth-message " + type;
}

function clearAuthMessage() {
    const el = getAuthElements();
    if (!el.authMessage) return;

    el.authMessage.textContent = "";
    el.authMessage.className = "auth-message";
}

// Expose functions globally for HTML inline handlers
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.quickFillDemo = quickFillDemo;
window.handleLogout = handleLogout;
window.openLogoutConfirmation = openLogoutConfirmation;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.handleHospitalStaffAccess = handleHospitalStaffAccess;
window.renderAuthNavbar = renderAuthNavbar;
window.toggleForgotMode = toggleForgotMode;
window.initializeAuthentication = initializeAuthentication;
