/* =====================================================
   AUTH - AUTHENTICATION
   ===================================================== */

/* =====================================================
   DOM REFERENCES
   ===================================================== */

const authGate =
    document.getElementById("authGate");

const authForm =
    document.getElementById("authForm");

const authTitle =
    document.getElementById("authTitle");

const authSubtitle =
    document.getElementById("authSubtitle");

const authName =
    document.getElementById("authName");

const authEmail =
    document.getElementById("authEmail");

const authPassword =
    document.getElementById("authPassword");

const authSubmitBtn =
    document.getElementById("authSubmitBtn");

const authToggleBtn =
    document.getElementById("authToggleBtn");

const authMessage =
    document.getElementById("authMessage");


/* =====================================================
   AUTHENTICATION
   ===================================================== */

function initializeAuthentication() {

    if (!authForm) return;

    // Ensure name field is hidden on login by default
    const nameField = document.querySelector(".auth-name-field");
    if (nameField) {
        nameField.classList.add("is-hidden");
    }

    authForm.addEventListener(
        "submit",
        handleAuthentication
    );

    if (authToggleBtn) {
        authToggleBtn.addEventListener(
            "click",
            toggleAuthMode
        );
    }

}


function toggleAuthMode() {

    const nameField = document.querySelector(".auth-name-field");

    if (authMode === "login") {

        authMode = "signup";

        if (authTitle) {
            authTitle.textContent = "Create your account";
        }

        if (authSubtitle) {
            authSubtitle.textContent = "Register locally to access BloodConnect.";
        }

        if (authSubmitBtn) {
            authSubmitBtn.textContent = "Create Account";
        }

        if (authToggleBtn) {
            authToggleBtn.textContent = "Already have an account? Login";
        }

        // Show the name field for signup
        if (nameField) {
            nameField.classList.remove("is-hidden");
        }

        if (authName) {
            authName.required = true;
        }

    } else {

        authMode = "login";

        if (authTitle) {
            authTitle.textContent = "Welcome back";
        }

        if (authSubtitle) {
            authSubtitle.textContent = "Login to access the BloodConnect donor network.";
        }

        if (authSubmitBtn) {
            authSubmitBtn.textContent = "Login";
        }

        if (authToggleBtn) {
            authToggleBtn.textContent = "New user? Create an account";
        }

        // Hide the name field for login
        if (nameField) {
            nameField.classList.add("is-hidden");
        }

        if (authName) {
            authName.required = false;
        }

    }

    clearAuthMessage();

}


function handleAuthentication(event) {

    event.preventDefault();

    clearAuthMessage();


    const email =
        authEmail?.value.trim().toLowerCase() || "";

    const password =
        authPassword?.value.trim() || "";


    if (!email || !password) {

        setAuthMessage(
            "Please enter email and password.",
            "error"
        );

        return;

    }


    if (authMode === "signup") {

        const name =
            authName?.value.trim() || "";


        if (!name) {

            setAuthMessage(
                "Please enter your full name.",
                "error"
            );

            return;

        }


        if (password.length < 6) {

            setAuthMessage(
                "Password must contain at least 6 characters.",
                "error"
            );

            return;

        }


        const existingUser =
            users.find(
                user =>
                    user.email === email
            );


        if (existingUser) {

            setAuthMessage(
                "An account with this email already exists.",
                "error"
            );

            return;

        }


        const newUser = {

            id:
                Date.now(),

            name:
                name,

            email:
                email,

            password:
                password,

            createdAt:
                new Date().toISOString()

        };


        users.push(newUser);

        saveUsers();

        createSession(newUser);


        setAuthMessage(
            "Account created successfully.",
            "success"
        );


        setTimeout(
            hideAuthGate,
            300
        );


    } else {

        const user =
            users.find(
                item =>
                    item.email === email &&
                    item.password === password
            );


        if (!user) {

            setAuthMessage(
                "Invalid email or password.",
                "error"
            );

            return;

        }


        createSession(user);

        hideAuthGate();

    }

}


function createSession(user) {

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({

            userId:
                user.id,

            name:
                user.name,

            email:
                user.email

        })
    );

}


function checkSession() {

    const session =
        localStorage.getItem(
            SESSION_KEY
        );


    if (session) {

        hideAuthGate();

    } else {

        showAuthGate();

    }

}


function showAuthGate() {

    if (authGate) {

        authGate.classList.remove(
            "is-hidden"
        );

    }

}


function hideAuthGate() {

    if (authGate) {

        authGate.classList.add(
            "is-hidden"
        );

    }

}


function setAuthMessage(
    message,
    type
) {

    if (!authMessage) return;

    authMessage.textContent =
        message;

    authMessage.className =
        "auth-message " + type;

}


function clearAuthMessage() {

    if (!authMessage) return;

    authMessage.textContent =
        "";

    authMessage.className =
        "auth-message";

}