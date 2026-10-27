/* =====================================================
   DASHBOARD - DASHBOARD UPDATES & STATS
   ===================================================== */

function updateDashboard() {
    // --- Basic Stats ---
    const totalDonors = document.getElementById("totalDonors");
    const eligibleDonors = document.getElementById("eligibleDonors");
    const totalRequests = document.getElementById("totalRequests");
    const emergencyRequests = document.getElementById("emergencyRequests");
    const searchingRequests = document.getElementById("searchingRequests");
    const activeRequestCount = document.getElementById("activeRequestCount");

    // Update donor counts
    if (totalDonors) totalDonors.textContent = donors.length;
    
    // Count eligible donors using filter
    const eligible = donors.filter(isDonorEligible).length;
    if (eligibleDonors) eligibleDonors.textContent = eligible;

    // Update request counts
    if (totalRequests) totalRequests.textContent = requests.length;

    // Count emergency requests using filter
    const emergency = requests.filter(request => request.urgency === "Emergency").length;
    if (emergencyRequests) emergencyRequests.textContent = emergency;

    // Count searching requests using filter
    const searching = requests.filter(request => request.status === "Searching" || !request.status).length;
    if (searchingRequests) searchingRequests.textContent = searching;

    // Update active request badge
    if (activeRequestCount) activeRequestCount.textContent = requests.length;

    // --- Enhanced Stats ---
    // Total donations using reduce
    const totalDonations = donors.reduce((sum, donor) => {
        return sum + (donor.donationHistory?.length || 0);
    }, 0);
    const totalDonationsElement = document.getElementById("totalDonations");
    if (totalDonationsElement) totalDonationsElement.textContent = totalDonations;

    // Blood group coverage using filter and some
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const availableGroups = bloodGroups.filter(group => 
        donors.some(donor => donor.bloodType === group)
    );
    const bloodGroupCoverageElement = document.getElementById("bloodGroupCoverage");
    if (bloodGroupCoverageElement) {
        bloodGroupCoverageElement.textContent = `${availableGroups.length}/8`;
    }

    // --- Render Components ---
    renderBloodGroupDistribution();
    renderZoneStatistics();
    renderDashboardRequests();
    renderBloodGroupOverview();
    renderRoleDashboardBanner();
}

/* =====================================================
   BLOOD GROUP DISTRIBUTION
   ===================================================== */

function renderBloodGroupDistribution() {
    const container = document.getElementById("bloodGroupDistribution");
    if (!container) return;

    if (donors.length === 0) {
        container.innerHTML = `<div class="empty-state">No donors registered yet</div>`;
        return;
    }

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    
    // Using map to create data array
    const distributionData = bloodGroups.map(group => ({
        group: group,
        count: donors.filter(d => d.bloodType === group).length,
        percentage: donors.length > 0 ? (donors.filter(d => d.bloodType === group).length / donors.length * 100) : 0
    }));

    // Sort by count
    distributionData.sort((a, b) => b.count - a.count);

    // Render using forEach
    let html = '';
    distributionData.forEach(data => {
        const barWidth = Math.min(data.percentage * 2, 100);
        html += `
            <div class="blood-group-item">
                <div class="blood-group-label">
                    <span>
                        <strong>${data.group}</strong>
                        ${data.count > 0 ? ' ✅' : ' ❌'}
                    </span>
                    <span>${data.count} donors (${data.percentage.toFixed(1)}%)</span>
                </div>
                <div class="blood-group-track">
                    <div class="blood-group-fill" style="--bar-width:${barWidth}%;"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* =====================================================
   ZONE STATISTICS
   ===================================================== */

function renderZoneStatistics() {
    const container = document.getElementById("zoneStatistics");
    if (!container) return;

    // Using reduce to count donors by zone
    const zoneStats = donors.reduce((acc, donor) => {
        const zone = donor.zone || 'Unknown';
        acc[zone] = (acc[zone] || 0) + 1;
        return acc;
    }, {});

    const zoneArray = Object.entries(zoneStats);
    
    if (zoneArray.length === 0) {
        container.innerHTML = '<div class="empty-state">No zone data available</div>';
        return;
    }

    // Sort by count
    zoneArray.sort((a, b) => b[1] - a[1]);

    const total = donors.length;
    let html = '';
    
    zoneArray.forEach(([zone, count]) => {
        const percentage = total > 0 ? (count / total * 100) : 0;
        html += `
            <div class="blood-group-item">
                <div class="blood-group-label">
                    <span>📍 ${zone}</span>
                    <span>${count} donors (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="blood-group-track">
                    <div class="blood-group-fill" style="--bar-width:${percentage}%;"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* =====================================================
   DASHBOARD REQUESTS
   ===================================================== */

function renderDashboardRequests() {
    const container = document.getElementById("dashboardRequests");
    if (!container) return;

    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No active blood requests.
            </div>
        `;
        return;
    }

    const sorted = [...requests]
        .sort(compareRequestPriority)
        .slice(0, 5);

    container.innerHTML = sorted.map(request => `
        <div class="dashboard-request-item" style="display:flex;justify-content:space-between;align-items:center;">
            <div onclick="runMatchForRequest('${escapeHTML(request.id)}')" style="flex:1;cursor:pointer;">
                <strong>${escapeHTML(request.patientName)}</strong>
                <p>
                    ${escapeHTML(request.requiredBloodType || request.bloodType || "-")}
                    ·
                    ${escapeHTML(request.zone)}
                    ·
                    ${escapeHTML(request.urgency)}
                </p>
            </div>
            <button class="small-btn" onclick="event.stopPropagation(); deleteRequest('${escapeHTML(request.id)}')" 
                    style="padding:4px 10px; font-size:10px; background:rgba(204,0,0,0.08); border-color:rgba(204,0,0,0.15); color:var(--red-primary);">
                ✕
            </button>
        </div>
    `).join("");
}

/* =====================================================
   BLOOD GROUP OVERVIEW
   ===================================================== */

function renderBloodGroupOverview() {
    const container = document.getElementById("bloodGroupOverview");
    if (!container) return;

    const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const counts = {};

    groups.forEach(group => {
        counts[group] = donors.filter(donor => donor.bloodType === group).length;
    });

    const max = Math.max(1, ...Object.values(counts));

    container.innerHTML = groups.map(group => {
        const percentage = (counts[group] / max) * 100;
        return `
            <div class="blood-group-item">
                <div class="blood-group-label">
                    <span>${group}</span>
                    <span>${counts[group]}</span>
                </div>
                <div class="blood-group-track">
                    <div class="blood-group-fill" style="--bar-width:${percentage}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

// --- Backend Dashboard Metrics Sync ---
async function syncHospitalMetrics() {
    if (window.api && typeof window.api.getHospitalStats === "function") {
        try {
            const res = await window.api.getHospitalStats();
            if (res && res.success && res.metrics) {
                const m = res.metrics;
                const totalRequests = document.getElementById("totalRequests");
                const emergencyRequests = document.getElementById("emergencyRequests");
                const searchingRequests = document.getElementById("searchingRequests");
                const activeRequestCount = document.getElementById("activeRequestCount");

                if (totalRequests) totalRequests.textContent = m.totalRequests;
                if (emergencyRequests) emergencyRequests.textContent = m.emergencyRequests;
                if (searchingRequests) searchingRequests.textContent = m.openRequests + m.coordinatingRequests;
                if (activeRequestCount) activeRequestCount.textContent = m.openRequests;
            }
        } catch (e) {
            console.warn("Could not sync live hospital metrics:", e.message);
        }
    }
}
window.syncHospitalMetrics = syncHospitalMetrics;


/* =====================================================
   ROLE-SPECIFIC DASHBOARD BANNER
   Renders custom guidance for Donors, Hospitals, and Admins
   ===================================================== */

async function renderRoleDashboardBanner() {
    const container = document.getElementById("roleDashboardBanner");
    if (!container) return;

    const user = window.api ? api.getUser() : null;
    if (!user) {
        container.style.display = "none";
        container.innerHTML = "";
        return;
    }

    if (user.role === "donor") {
        const profile = user.profile || {};
        const bloodGroup = profile.bloodGroup || profile.bloodType || "O+";
        const availability = profile.declaredAvailability || "available";
        const isPaused = availability === "paused";
        const zone = profile.zone || "Zone A";

        container.style.display = "block";
        container.innerHTML = `
            <div class="role-banner-card donor-portal-banner">
                <div class="banner-left">
                    <div class="banner-icon-badge">🩸</div>
                    <div class="banner-details">
                        <h3>
                            Volunteer Donor Hub
                            <span class="banner-pill pill-red">${bloodGroup}</span>
                            <span class="banner-pill ${isPaused ? 'pill-amber' : 'pill-green'}">${isPaused ? 'Status: Paused' : 'Status: Ready to Donate'}</span>
                        </h3>
                        <p>Registered in <strong>${zone}</strong>. Your availability is self-reported and directly influences automated matching algorithms.</p>
                    </div>
                </div>
                <div class="banner-actions">
                    <button class="banner-btn ${isPaused ? 'banner-btn-primary' : 'banner-btn-secondary'}" onclick="toggleDonorAvailability('${profile.donorId || profile._id || ''}', '${isPaused ? 'available' : 'paused'}')">
                        ${isPaused ? '▶️ Resume Availability' : '⏸️ Pause Availability'}
                    </button>
                    <button class="banner-btn banner-btn-secondary" onclick="openDonorInboxModal()">
                        📬 View Invitation Inbox
                    </button>
                </div>
            </div>
        `;
    } else if (user.role === "hospital" || user.role === "hospital_staff") {
        const profile = user.profile || {};
        const isVerified = profile.verificationStatus === "authorized_institution";
        const institutionName = profile.institutionName || user.name || "Medical Facility";

        container.style.display = "block";
        if (isVerified) {
            container.innerHTML = `
                <div class="role-banner-card hospital-authorized-banner">
                    <div class="banner-left">
                        <div class="banner-icon-badge">🏥</div>
                        <div class="banner-details">
                            <h3>
                                ${institutionName}
                                <span class="banner-pill pill-green">Authorized Facility</span>
                            </h3>
                            <p>Official medical clearance active. You have full privileges to broadcast urgent requests, dispatch invitations, and fulfill donations.</p>
                        </div>
                    </div>
                    <div class="banner-actions">
                        <button class="banner-btn banner-btn-primary" onclick="showPage('requests')">
                            ➕ Urgent Blood Request
                        </button>
                        <button class="banner-btn banner-btn-secondary" onclick="showPage('find')">
                            🔎 Smart Donor Matcher
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="role-banner-card hospital-pending-banner">
                    <div class="banner-left">
                        <div class="banner-icon-badge">⚠️</div>
                        <div class="banner-details">
                            <h3>
                                ${institutionName}
                                <span class="banner-pill pill-amber">Verification Pending</span>
                            </h3>
                            <p>Your hospital account is awaiting administrative authorization. Emergency request creation and direct outreach are locked until approved.</p>
                        </div>
                    </div>
                    <div class="banner-actions">
                        <button class="banner-btn banner-btn-secondary" onclick="showPage('contact')">
                            💬 Contact Admin Support
                        </button>
                    </div>
                </div>
            `;
        }
    } else if (user.role === "admin") {
        container.style.display = "block";
        container.innerHTML = `
            <div class="role-banner-card hospital-authorized-banner">
                <div class="banner-left">
                    <div class="banner-icon-badge">🛡️</div>
                    <div class="banner-details">
                        <h3>
                            System Administration Console
                            <span class="banner-pill pill-green">Administrator</span>
                        </h3>
                        <p>Authorized to verify medical institutions, oversee system audit trails, and manage governance policies.</p>
                    </div>
                </div>
                <div class="banner-actions">
                    <button class="banner-btn banner-btn-primary" onclick="showPage('admin')">
                        🛡️ Open Governance Console
                    </button>
                </div>
            </div>
        `;
    } else {
        container.style.display = "none";
        container.innerHTML = "";
    }
}

async function toggleDonorAvailability(donorId, newStatus) {
    if (!window.api || !api.getToken()) {
        if (typeof showToast === "function") showToast("Please log in to change availability.", "warning");
        return;
    }

    try {
        const user = api.getUser();
        const effectiveId = donorId || (user && user.profile && (user.profile.donorId || user.profile._id));
        if (!effectiveId) {
            if (typeof showToast === "function") showToast("Donor profile identifier not found.", "error");
            return;
        }

        const res = await api.request(`/api/donors/${effectiveId}/availability`, {
            method: "PATCH",
            body: JSON.stringify({ availability: newStatus })
        });

        if (res && res.success) {
            if (user && user.profile) {
                user.profile.declaredAvailability = newStatus;
                api.setUser(user);
            }
            if (typeof showToast === "function") {
                showToast(`Availability updated to ${newStatus}.`, "success");
            }
            renderRoleDashboardBanner();
        }
    } catch (e) {
        console.error("Availability toggle error:", e);
        if (typeof showToast === "function") showToast(e.message || "Failed to update availability.", "error");
    }
}

window.renderRoleDashboardBanner = renderRoleDashboardBanner;
window.toggleDonorAvailability = toggleDonorAvailability;
