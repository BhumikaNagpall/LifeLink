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
