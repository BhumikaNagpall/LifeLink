/* =====================================================
   LIFELINK - ADMINISTRATIVE CONSOLE CONTROLLER
   Manages hospital verification, system audits, and governance
   ===================================================== */

async function loadAdminData() {
    await Promise.all([
        loadAdminStats(),
        loadAdminHospitals(),
        loadAdminAuditLogs()
    ]);
}

async function loadAdminStats() {
    try {
        const token = window.api ? api.getToken() : null;
        const response = await fetch("/api/hospital/dashboard-stats", {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const data = await response.json();

        if (data.success && data.metrics) {
            const m = data.metrics;
            const elPending = document.getElementById("adminPendingHospitalsCount");
            const elVerified = document.getElementById("adminVerifiedHospitalsCount");
            const elRequests = document.getElementById("adminTotalRequestsCount");

            if (elPending) elPending.textContent = m.pendingHospitals || 0;
            if (elVerified) elVerified.textContent = m.verifiedHospitals || 0;
            if (elRequests) elRequests.textContent = m.totalRequests || 0;
        }
    } catch (e) {
        console.warn("Could not load admin stats", e);
    }
}

async function loadAdminHospitals() {
    const container = document.getElementById("adminHospitalListContainer");
    if (!container) return;

    try {
        const token = window.api ? api.getToken() : null;
        if (!token) {
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--red-primary);">Admin authentication required.</div>`;
            return;
        }

        const response = await fetch("/api/hospital/list", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">${data.message || "Failed to load hospitals."}</div>`;
            return;
        }

        if (!data.hospitals || data.hospitals.length === 0) {
            container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">No hospital registrations on record.</div>`;
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                        <th style="padding: 10px 14px;">Facility Name</th>
                        <th style="padding: 10px 14px;">Registration #</th>
                        <th style="padding: 10px 14px;">Zone</th>
                        <th style="padding: 10px 14px;">Official Contact</th>
                        <th style="padding: 10px 14px;">Status</th>
                        <th style="padding: 10px 14px; text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.hospitals.forEach(h => {
            const isVerified = h.verificationStatus === "authorized_institution";
            const badgeBg = isVerified ? "rgba(45, 125, 70, 0.12)" : "rgba(204, 122, 0, 0.12)";
            const badgeColor = isVerified ? "var(--emerald)" : "var(--amber)";
            const badgeText = isVerified ? "Authorized Institution" : "Pending Verification";

            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px 14px; font-weight: 700; color: var(--text-primary);">${h.institutionName}</td>
                    <td style="padding: 12px 14px; font-family: monospace; color: var(--text-muted);">${h.registrationNumber || "N/A"}</td>
                    <td style="padding: 12px 14px;">${h.zone}</td>
                    <td style="padding: 12px 14px;">${h.contactPhone || h.officialEmail || "N/A"}</td>
                    <td style="padding: 12px 14px;">
                        <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;">
                            ${badgeText}
                        </span>
                    </td>
                    <td style="padding: 12px 14px; text-align: right;">
                        ${isVerified
                            ? `<button onclick="setHospitalStatus('${h._id}', 'unverified_demo')" style="padding: 6px 12px; font-size: 11px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: white; cursor: pointer; color: var(--amber);">Revoke Authorization</button>`
                            : `<button onclick="setHospitalStatus('${h._id}', 'authorized_institution')" style="padding: 6px 12px; font-size: 11px; border: none; border-radius: var(--radius-sm); background: var(--gradient-red); color: white; cursor: pointer; font-weight: 700;">Authorize Hospital</button>`
                        }
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        console.error("Error loading hospitals for admin:", e);
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--red-primary);">Error loading hospital records.</div>`;
    }
}

async function setHospitalStatus(hospitalId, newStatus) {
    const confirmMsg = newStatus === "authorized_institution"
        ? "Authorize this medical institution to create blood broadcasts and coordinate emergency donors?"
        : "Revoke institutional authorization for this facility?";

    if (!confirm(confirmMsg)) return;

    try {
        const token = window.api ? api.getToken() : null;
        const response = await fetch(`/api/hospital/${hospitalId}/verify`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ status: newStatus, notes: "Administrative review via control panel" })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            alert(`Hospital status successfully updated to '${newStatus}'.`);
            loadAdminData();
        } else {
            alert(`Failed to update status: ${data.message || "Unknown error"}`);
        }
    } catch (e) {
        console.error("Failed to update hospital status:", e);
        alert("An error occurred while updating status.");
    }
}

async function loadAdminAuditLogs() {
    const container = document.getElementById("adminAuditLogContainer");
    if (!container) return;

    try {
        const token = window.api ? api.getToken() : null;
        if (!token) return;

        const response = await fetch("/api/hospital/audit-logs", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">${data.message || "Could not retrieve audit logs."}</div>`;
            return;
        }

        if (!data.logs || data.logs.length === 0) {
            container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">No audit events recorded yet.</div>`;
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                        <th style="padding: 10px 12px;">Timestamp</th>
                        <th style="padding: 10px 12px;">Action Event</th>
                        <th style="padding: 10px 12px;">Initiated By</th>
                        <th style="padding: 10px 12px;">Target Entity</th>
                        <th style="padding: 10px 12px;">Details</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.logs.slice(0, 50).forEach(log => {
            const timeStr = new Date(log.timestamp).toLocaleString();
            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px 12px; color: var(--text-muted); font-family: monospace;">${timeStr}</td>
                    <td style="padding: 10px 12px; font-weight: 700; color: var(--red-primary);">${log.action}</td>
                    <td style="padding: 10px 12px;">${log.performerEmail || "System"} <span style="font-size: 10px; color: var(--text-muted);">(${log.userRole || "automated"})</span></td>
                    <td style="padding: 10px 12px; font-family: monospace;">${log.targetEntity} / ${log.targetId || "Global"}</td>
                    <td style="padding: 10px 12px; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${JSON.stringify(log.details || {})}
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        console.error("Error loading audit logs:", e);
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--red-primary);">Failed to load audit trail.</div>`;
    }
}

window.loadAdminData = loadAdminData;
window.loadAdminHospitals = loadAdminHospitals;
window.loadAdminAuditLogs = loadAdminAuditLogs;
window.setHospitalStatus = setHospitalStatus;
