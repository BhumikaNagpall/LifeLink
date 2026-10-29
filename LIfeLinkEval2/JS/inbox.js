/* =====================================================
   LIFELINK - DONOR INVITATION INBOX
   Manages invitation viewing, acceptance, and decline actions
   ===================================================== */

function safeEscape(str) {
    if (typeof escapeHTML === "function") return escapeHTML(str);
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

function safeDate(d) {
    if (typeof formatDate === "function") return formatDate(d);
    if (!d) return "-";
    try {
        return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return String(d);
    }
}

async function openDonorInboxModal() {
    const user = window.api ? api.getUser() : null;
    const token = window.api ? api.getToken() : null;

    if (!user || !token) {
        if (typeof openAuthModal === "function") {
            openAuthModal();
            if (typeof setAuthMessage === "function") {
                setAuthMessage("Please log in with your volunteer donor account to access your invitation inbox.", "info");
            }
        } else {
            alert("Please log in with your volunteer donor account to access your invitation inbox.");
        }
        return;
    }

    if (user.role !== "donor" && user.role !== "admin") {
        if (typeof showToast === "function") {
            showToast("The Invitation Inbox is reserved for volunteer donors. Hospital staff manage requests and invitations from the Hospital Console.", "warning");
        } else {
            alert("The Invitation Inbox is reserved for volunteer donors. Hospital staff manage requests and invitations from the Hospital Console.");
        }
        return;
    }

    const modal = document.getElementById("donorInboxModal");
    if (!modal) return;

    modal.classList.add("show");
    await renderDonorInbox();
}

function closeDonorInboxModal() {
    const modal = document.getElementById("donorInboxModal");
    if (modal) {
        modal.classList.remove("show");
    }
}

async function renderDonorInbox() {
    const container = document.getElementById("donorInboxList");
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 28px; color: var(--text-muted, #666);">
            <div style="margin: 0 auto 10px auto; width: 28px; height: 28px; border: 3px solid rgba(204,0,0,0.2); border-top-color: var(--red-primary, #cc0000); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <span>Loading invitations...</span>
        </div>
    `;

    try {
        let invitations = [];
        if (window.api && typeof window.api.getDonorInbox === "function") {
            const res = await window.api.getDonorInbox();
            if (res && res.success && Array.isArray(res.invitations)) {
                invitations = res.invitations;
            } else if (res && res.message) {
                throw new Error(res.message);
            }
        }

        if (invitations.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 32px 16px;">
                    <span style="font-size: 32px; display: block; margin-bottom: 8px;">📭</span>
                    <h3 style="margin-bottom: 4px; font-weight: 600;">No Active Invitations</h3>
                    <p style="font-size: 13px; color: var(--text-muted, #777); max-width: 440px; margin: 0 auto;">
                        When healthcare facilities broadcast blood coordination requests matching your blood group, invitations will appear here.
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = invitations.map(inv => {
            const req = inv.request || {};
            const urgencyClass = (req.urgency || "Normal").toLowerCase();
            const isPending = inv.status === "pending";

            return `
                <div class="invitation-item" style="border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 16px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <span style="font-size: 11px; font-weight: 700; color: #6c757d; text-transform: uppercase;">
                                Ref: ${safeEscape(req.requestId)}
                            </span>
                            <h4 style="margin: 2px 0 4px 0; font-size: 16px; font-weight: 700;">
                                ${safeEscape(req.hospitalName || "Partner Hospital")}
                            </h4>
                            <span style="font-size: 12px; color: #495057;">
                                📍 ${safeEscape(req.zone || "Zone A")} · 🩸 Blood Group: <strong>${safeEscape(req.requiredBloodGroup || "O+")}</strong> (${safeEscape(req.requiredComponent || "Whole Blood")})
                            </span>
                        </div>
                        <span class="priority-badge priority-${urgencyClass}" style="font-size: 11px; padding: 3px 8px; border-radius: 4px;">
                            ${safeEscape(req.urgency || "Normal")}
                        </span>
                    </div>

                    <div style="margin: 8px 0; font-size: 12px; color: #6c757d;">
                        <span>📅 Invited: ${safeDate(inv.invitedAt)}</span>
                        ${req.requiredByDate ? `<span style="margin-left: 12px;">⏰ Needed By: ${safeDate(req.requiredByDate)}</span>` : ""}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.1);">
                        <div>
                            <span style="font-size: 12px;">Current Status:</span>
                            <strong style="margin-left: 4px; font-size: 12px; color: ${inv.status === 'accepted' ? '#198754' : inv.status === 'declined' ? '#dc3545' : '#0d6efd'};">
                                ${inv.status === 'accepted' ? '✓ Willing to Donate' : inv.status === 'declined' ? 'Declined' : 'Awaiting Your Response'}
                            </strong>
                        </div>

                        ${isPending ? `
                            <div style="display: flex; gap: 8px;">
                                <button onclick="respondToInboxInvitation('${safeEscape(inv.id)}', 'accepted')" 
                                        style="background: #198754; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                                    ✓ Accept
                                </button>
                                <button onclick="respondToInboxInvitation('${safeEscape(inv.id)}', 'declined')" 
                                        style="background: #dc3545; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                                    ✕ Decline
                                </button>
                            </div>
                        ` : `
                            <span style="font-size: 12px; color: #6c757d; font-style: italic;">
                                Responded on ${safeDate(inv.respondedAt)}
                            </span>
                        `}
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Error loading donor inbox:", err);
        const isAuthError = err.status === 401 || (err.message && err.message.toLowerCase().includes("auth"));
        const isForbidden = err.status === 403;

        if (isAuthError) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 24px 16px; text-align: center;">
                    <span style="font-size: 32px; display: block; margin-bottom: 8px;">🔒</span>
                    <h3 style="margin-bottom: 6px; font-weight: 600; color: #dc3545;">Authentication Required</h3>
                    <p style="font-size: 13px; color: var(--text-muted, #777); margin-bottom: 16px;">
                        Your session has expired or authentication is required to access your donor inbox.
                    </p>
                    <button class="btn btn-primary" onclick="closeDonorInboxModal(); openAuthModal();" style="padding: 8px 18px; border-radius: 6px; font-size: 13px; background: var(--gradient-red, #cc0000); color: white; border: none; cursor: pointer;">
                        Sign In Again
                    </button>
                </div>
            `;
        } else if (isForbidden) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 24px 16px; text-align: center;">
                    <span style="font-size: 32px; display: block; margin-bottom: 8px;">🚫</span>
                    <h3 style="margin-bottom: 6px; font-weight: 600; color: #dc3545;">Access Restricted</h3>
                    <p style="font-size: 13px; color: var(--text-muted, #777);">
                        The Invitation Inbox is reserved for volunteer blood donors. Hospital staff manage invitations from the Hospital Console.
                    </p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state" style="color: #dc3545; padding: 20px 16px; text-align: center;">
                    <span style="font-size: 28px; display: block; margin-bottom: 8px;">⚠️</span>
                    <p style="font-weight: 600; margin-bottom: 4px;">Unable to load invitations</p>
                    <p style="font-size: 12.5px; color: #666; margin-bottom: 12px;">${safeEscape(err.message || "Network error occurred")}</p>
                    <button class="btn btn-secondary" onclick="renderDonorInbox()" style="padding: 6px 14px; font-size: 12px; cursor: pointer; border: 1px solid var(--border-color); background: white;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

async function respondToInboxInvitation(invitationId, status) {
    if (!invitationId || !status) return;

    const actionText = status === "accepted" ? "accept this donation invitation" : "decline this invitation";
    const confirmed = confirm(`Are you sure you want to ${actionText}?`);
    if (!confirmed) return;

    try {
        if (window.api && typeof window.api.respondToInvitation === "function") {
            const res = await window.api.respondToInvitation(invitationId, status, "Responded via donor portal");
            if (res && res.success) {
                alert(`✓ You have ${status} this coordination invitation. Healthcare staff have been notified.`);
                await renderDonorInbox();
                if (typeof syncHospitalMetrics === "function") {
                    syncHospitalMetrics();
                }
                return;
            }
        }
    } catch (err) {
        alert("Error submitting response: " + err.message);
    }
}

// Window bindings
window.openDonorInboxModal = openDonorInboxModal;
window.closeDonorInboxModal = closeDonorInboxModal;
window.respondToInboxInvitation = respondToInboxInvitation;
