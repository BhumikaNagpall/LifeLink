/* =====================================================
   REQUESTS - CRUD, DISPLAY, FILTER
   ===================================================== */

/* =====================================================
   REQUEST FORMS
   ===================================================== */

function initializeForms() {

    const requestForm =
        document.getElementById(
            "requestForm"
        );


    requestForm?.addEventListener(
        "submit",
        handleMatcherForm
    );


    const modalRequestForm =
        document.getElementById(
            "modalRequestForm"
        );


    modalRequestForm?.addEventListener(
        "submit",
        handleModalRequest
    );


    const donationForm =
        document.getElementById(
            "donationForm"
        );


    donationForm?.addEventListener(
        "submit",
        handleDonationForm
    );


    const contactForm =
        document.getElementById(
            "contactForm"
        );


    contactForm?.addEventListener(
        "submit",
        handleContactForm
    );

}


function compareRequestPriority(
    a,
    b
) {

    const priority = {

        "Emergency": 3,
        "Urgent": 2,
        "Normal": 1

    };


    return (
        (priority[b.urgency] || 0) -
        (priority[a.urgency] || 0)
    );

}


function displayRequests() {

    const container =
        document.getElementById(
            "requestsList"
        );


    if (!container) return;


    let filtered =
        [...requests];


    if (
        currentRequestFilter !==
        "all"
    ) {

        filtered =
            filtered.filter(
                request =>
                    request.urgency ===
                    currentRequestFilter
            );

    }


    filtered.sort(
        compareRequestPriority
    );


    if (
        filtered.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No blood requests found.
            </div>
        `;

        return;

    }


    container.innerHTML =
        filtered
            .map(
                createRequestCard
            )
            .join("");

}

function createRequestCard(request) {

    const urgency = request.urgency || "Normal";
    const urgencyClass = urgency.toLowerCase();
    const blood = request.requiredBloodType || request.bloodType || "-";

    return `
        <div class="request-card" id="request-${escapeHTML(request.id)}">
            <div class="request-main">
                <div class="request-icon ${urgencyClass}">
                    ${urgency === "Emergency" ? "🚨" : urgency === "Urgent" ? "🔴" : "🟢"}
                </div>
                <div>
                    <h3>${escapeHTML(request.patientName)}</h3>
                    <p>Blood Group: <strong>${escapeHTML(blood)}</strong></p>
                    <span class="priority-badge priority-${urgencyClass}">${escapeHTML(urgency)}</span>
                </div>
            </div>
            <div>
                <div class="request-zone-label">📍 ${escapeHTML(request.zone)}</div>
                <div class="request-zone-label">🩸 ${request.requestedUnits || 1} unit(s)</div>
                <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                    <button class="small-btn" onclick="runMatchForRequest('${escapeHTML(request.id)}')">
                        🔍 Find Donors
                    </button>
                    <button class="danger-btn" onclick="deleteRequest('${escapeHTML(request.id)}')" style="padding: 7px 14px; font-size: 11px;">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

/* =====================================================
   DELETE REQUEST
   ===================================================== */

function deleteRequest(requestId) {
    if (!requestId) return;

    // Find the request
    const request = requests.find(item => String(item.id) === String(requestId));
    if (!request) return;

    // Confirm deletion
    const confirmed = confirm(
        `Delete blood request for "${request.patientName}"?\n\n` +
        `Blood Group: ${request.requiredBloodType || request.bloodType || "-"}\n` +
        `Zone: ${request.zone}\n` +
        `Priority: ${request.urgency}\n\n` +
        `This action cannot be undone!`
    );

    if (!confirmed) return;

    // Remove from requests array
    requests = requests.filter(item => String(item.id) !== String(requestId));

    // Save to localStorage
    saveRequests();

    // Update UI
    displayRequests();
    updateDashboard();

    // Show success message
    const container = document.getElementById("requestsList");
    if (container) {
        const msg = document.createElement("div");
        msg.style.cssText = `
            padding: 12px 16px;
            background: var(--emerald-light);
            border: 2px solid rgba(45, 125, 70, 0.15);
            border-radius: var(--radius-md);
            color: var(--emerald);
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 12px;
        `;
        msg.textContent = `✅ Request for "${request.patientName}" deleted successfully!`;
        container.prepend(msg);
        
        setTimeout(() => {
            if (msg.parentNode) msg.remove();
        }, 3000);
    }
}


/* =====================================================
   REQUEST MODAL
   ===================================================== */

function openRequestModal() {

    requestModal?.classList.add(
        "show"
    );

}


function closeRequestModal() {

    requestModal?.classList.remove(
        "show"
    );

}


function handleModalRequest(event) {

    event.preventDefault();


    const patientName =
        document.getElementById(
            "modalPatientName"
        )?.value.trim() || "";

    const bloodType =
        document.getElementById(
            "modalBloodType"
        )?.value || "";

    const zone =
        document.getElementById(
            "modalZone"
        )?.value || "";

    const urgency =
        document.getElementById(
            "modalUrgency"
        )?.value || "";


    if (
        !patientName ||
        !bloodType ||
        !zone ||
        !urgency
    ) {

        return;

    }


    const request = {

        id:
            "REQ-" +
            Date.now(),

        patientName:
            patientName,

        requiredBloodType:
            bloodType,

        bloodType:
            bloodType,

        zone:
            zone,

        urgency:
            urgency,

        requestedUnits:
            1,

        status:
            "Searching",

        createdAt:
            new Date().toISOString()

    };


    requests.push(
        request
    );

    saveRequests();


    event.target.reset();

    closeRequestModal();

    displayRequests();

    updateDashboard();

}
