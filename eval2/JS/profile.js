/* =====================================================
   PROFILE - DONOR PROFILE MODAL
   ===================================================== */

/* =====================================================
   DONOR PROFILE
   ===================================================== */

function openDonorProfile(donorId) {

    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(donorId)
        );


    if (!donor) return;


    activeProfileDonorId =
        donor.id;


    const name =
        document.getElementById(
            "profileName"
        );

    const id =
        document.getElementById(
            "profileId"
        );

    const blood =
        document.getElementById(
            "profileBloodType"
        );

    const age =
        document.getElementById(
            "profileAge"
        );

    const zone =
        document.getElementById(
            "profileZone"
        );

    const weight =
        document.getElementById(
            "profileWeight"
        );

    const height =
        document.getElementById(
            "profileHeight"
        );

    const phone =
        document.getElementById(
            "profilePhone"
        );


    if (name) {

        name.textContent =
            donor.name;

    }


    if (id) {

        id.textContent =
            donor.id;

    }


    if (blood) {

        blood.textContent =
            donor.bloodType;

    }


    if (age) {

        age.textContent =
            donor.age;

    }


    if (zone) {

        zone.textContent =
            donor.zone;

    }


    if (weight) {

        weight.textContent =
            `${donor.weight} kg`;

    }


    if (height) {

        height.textContent =
            donor.height;

    }


    if (phone) {

        phone.textContent =
            donor.phone;

    }


    updateProfileEligibility(
        donor
    );


    renderProfileDonationHistory(
        donor
    );


    donorProfileModal?.classList.add(
        "show"
    );

}


function updateProfileEligibility(
    donor
) {

    const badge =
        document.getElementById(
            "profileEligibilityBadge"
        );

    const countdown =
        document.getElementById(
            "profileEligibilityCountdown"
        );


    const eligible =
        isDonorEligible(
            donor
        );


    const cooldown =
        getCooldownDaysRemaining(
            donor
        );


    if (badge) {

        badge.textContent =
            eligible
                ? "Eligible"
                : "Not Eligible";


        badge.className =
            "status-badge " +
            (
                eligible
                    ? "status-eligible"
                    : "status-not-eligible"
            );

    }


    if (countdown) {

        if (cooldown > 0) {

            countdown.textContent =
                `Donation cooldown active. ${cooldown} day(s) remaining.`;

            countdown.className =
                "eligibility-countdown cooldown-active";

        } else {

            countdown.textContent =
                "✓ No active donation cooldown.";

            countdown.className =
                "eligibility-countdown cooldown-clear";

        }

    }

}


function renderProfileDonationHistory(
    donor
) {

    const container =
        document.getElementById(
            "profileDonationHistory"
        );


    if (!container) return;


    const history =
        Array.isArray(
            donor.donationHistory
        )
            ? [
                ...donor.donationHistory
            ]
            : [];


    history.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );


    if (
        history.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No donation logs found.
            </div>
        `;

        return;

    }


    container.innerHTML =
        history
            .map(
                item => `

                    <div class="donation-history-item">

                        <strong>
                            ${formatDate(
                                item.date
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.type ||
                                "Whole Blood"
                            )}
                        </span>

                        <span class="donation-completed">
                            ${escapeHTML(
                                item.status ||
                                "Completed"
                            )}
                        </span>

                    </div>

                `
            )
            .join("");

}


function closeDonorProfile() {

    donorProfileModal?.classList.remove(
        "show"
    );

    activeProfileDonorId =
        null;

}


function deleteProfileDonor() {

    if (
        !activeProfileDonorId
    ) {

        return;

    }


    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(activeProfileDonorId)
        );


    if (!donor) return;


    const confirmed =
        confirm(
            `Delete donor profile for ${donor.name}?`
        );


    if (!confirmed) return;


    donors =
        donors.filter(
            item =>
                String(item.id) !==
                String(activeProfileDonorId)
        );


    saveDonors();


    closeDonorProfile();

    displayAllDonors();

    updateDashboard();

}


function contactProfileDonor() {

    if (
        !activeProfileDonorId
    ) {

        return;

    }


    contactDonor(
        activeProfileDonorId
    );

}


/* =====================================================
   CONTACT DONOR
   ===================================================== */

function contactDonor(donorId) {

    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(donorId)
        );


    if (!donor) return;


    alert(
        `Contact Donor\n\nName: ${donor.name}\nPhone: ${donor.phone}\nBlood Group: ${donor.bloodType}`
    );

}


/* =====================================================
   DONATION MODAL
   ===================================================== */

function addDonationFromProfile() {

    if (
        !activeProfileDonorId
    ) {

        return;

    }


    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(activeProfileDonorId)
        );


    if (!donor) return;


    const donationDate =
        document.getElementById(
            "donationDate"
        );


    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    if (donationDate) {

        donationDate.value =
            today;

        donationDate.max =
            today;

    }


    donationModal?.classList.add(
        "show"
    );

}


function closeDonationModal() {

    donationModal?.classList.remove(
        "show"
    );

}


function handleDonationForm(event) {

    event.preventDefault();


    const donor =
        donors.find(
            item =>
                String(item.id) ===
                String(activeProfileDonorId)
        );


    if (!donor) return;


    const donationDate =
        document.getElementById(
            "donationDate"
        )?.value;

    const donationType =
        document.getElementById(
            "donationType"
        )?.value;


    if (
        !donationDate ||
        !donationType
    ) {

        return;

    }


    const selectedDate =
        new Date(
            donationDate
        );

    const today =
        new Date();


    selectedDate.setHours(
        0,
        0,
        0,
        0
    );

    today.setHours(
        0,
        0,
        0,
        0
    );


    if (
        selectedDate > today
    ) {

        alert(
            "Donation date cannot be in the future."
        );

        return;

    }


    if (
        !Array.isArray(
            donor.donationHistory
        )
    ) {

        donor.donationHistory =
            [];

    }


    donor.donationHistory.unshift({

        date:
            donationDate,

        type:
            donationType,

        status:
            "Completed"

    });


    if (
        donationType ===
        "Whole Blood"
    ) {

        donor.lastDonation =
            donationDate;

    }


    saveDonors();


    event.target.reset();

    closeDonationModal();


    openDonorProfile(
        donor.id
    );


    updateDashboard();

    displayAllDonors();

}

// --- Backend API Sync Extensions ---
const originalDeleteProfileDonor = deleteProfileDonor;
deleteProfileDonor = async function() {
    if (!activeProfileDonorId) return;
    const donor = donors.find(item => String(item.id) === String(activeProfileDonorId));
    if (!donor) return;

    const confirmed = confirm(`Delete donor profile for ${donor.name}?`);
    if (!confirmed) return;

    try {
        if (window.api && typeof window.api.deleteDonorProfile === "function") {
            await window.api.deleteDonorProfile(activeProfileDonorId);
        }
    } catch (e) {
        console.warn("Backend delete warning:", e.message);
    }

    donors = donors.filter(item => String(item.id) !== String(activeProfileDonorId));
    saveDonors();
    closeDonorProfile();
    displayAllDonors();
    updateDashboard();
};
window.deleteProfileDonor = deleteProfileDonor;

const originalHandleDonationForm = handleDonationForm;
handleDonationForm = async function(event) {
    event.preventDefault();
    const donor = donors.find(item => String(item.id) === String(activeProfileDonorId));
    if (!donor) return;

    const donationDate = document.getElementById("donationDate")?.value;
    const donationType = document.getElementById("donationType")?.value;

    if (!donationDate || !donationType) return;

    const selectedDate = new Date(donationDate);
    const today = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
        alert("Donation date cannot be in the future.");
        return;
    }

    try {
        if (window.api && typeof window.api.addDonationRecord === "function") {
            await window.api.addDonationRecord(activeProfileDonorId, {
                donationDate: donationDate,
                donationType: donationType
            });
        }
    } catch (e) {
        console.warn("Backend donation record warning:", e.message);
    }

    if (!Array.isArray(donor.donationHistory)) {
        donor.donationHistory = [];
    }

    donor.donationHistory.unshift({
        date: donationDate,
        type: donationType,
        status: "Completed"
    });

    if (donationType === "Whole Blood") {
        donor.lastDonation = donationDate;
        donor.lastDonationDate = donationDate;
    }

    saveDonors();
    event.target.reset();
    closeDonationModal();
    openDonorProfile(donor.id);
    updateDashboard();
    displayAllDonors();
};
window.handleDonationForm = handleDonationForm;

/* =====================================================
   AUTHENTICATED USER "MY PROFILE" MODAL LOGIC
   Supports Role-Specific Views for Donor, Hospital & Admin
   ===================================================== */

let currentAuthenticatedProfile = null;

async function openMyProfile() {
    const modal = document.getElementById("myProfileModal");
    if (!modal) return;

    if (!window.api || !window.api.getToken()) {
        if (typeof openAuthModal === "function") {
            openAuthModal();
        } else {
            alert("Please log in to view your profile.");
        }
        return;
    }

    modal.classList.add("show");

    const container = document.getElementById("myProfileFieldsContainer");
    const nameEl = document.getElementById("myProfileTitleName");
    const emailEl = document.getElementById("myProfileEmail");
    const roleBadgeEl = document.getElementById("myProfileRoleBadge");
    const avatarEl = document.getElementById("myProfileAvatar");
    const statusMsg = document.getElementById("myProfileStatusMsg");

    if (statusMsg) {
        statusMsg.style.display = "none";
        statusMsg.textContent = "";
    }

    if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted, #777);">Loading profile details...</div>`;
    }

    try {
        const response = await window.api.getMe();
        if (!response || !response.success || !response.user) {
            throw new Error(response?.message || "Failed to load authenticated profile.");
        }

        const user = response.user;
        const profile = response.profile || {};
        currentAuthenticatedProfile = { user, profile };

        // Update Header
        if (nameEl) nameEl.textContent = user.name || "Authenticated User";
        if (emailEl) emailEl.textContent = user.email || "";
        if (roleBadgeEl) roleBadgeEl.textContent = `${(user.role || "user").toUpperCase()} PROFILE`;

        if (avatarEl) {
            if (user.role === "hospital") {
                avatarEl.textContent = "🏥";
            } else if (user.role === "donor") {
                avatarEl.textContent = "🩸";
            } else if (user.role === "admin") {
                avatarEl.textContent = "🛡️";
            } else {
                avatarEl.textContent = "👤";
            }
        }

        // Render Role-Appropriate Fields
        if (!container) return;

        let fieldsHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                        Display / Staff Name
                    </label>
                    <input type="text" id="myProfileInputName" value="${escapeHTML(user.name || '')}" required
                           style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;" />
                </div>
                <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                        Login Email (Immutable)
                    </label>
                    <input type="email" value="${escapeHTML(user.email || '')}" disabled
                           style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px; background: #f4f5f7; cursor: not-allowed; color: #666;" />
                </div>
            </div>
        `;

        if (user.role === "hospital") {
            const isAuthorized = profile.verificationStatus === "authorized_institution";
            fieldsHTML += `
                <div style="padding: 10px 14px; background: ${isAuthorized ? 'rgba(25, 135, 84, 0.08)' : 'rgba(255, 193, 7, 0.12)'}; border-radius: 6px; border: 1px solid ${isAuthorized ? 'rgba(25, 135, 84, 0.25)' : 'rgba(255, 193, 7, 0.3)'}; margin: 2px 0;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${isAuthorized ? '#157347' : '#997404'};">
                        Institutional Authority Status
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: ${isAuthorized ? '#0f5132' : '#664d03'}; margin-top: 2px;">
                        ${isAuthorized ? '✅ Authorized Institution Partner (Verified for Clinical Blood Coordination)' : '⚠️ Unverified Demo Account (Pending Administrator Verification)'}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Institution / Hospital Name
                        </label>
                        <input type="text" id="myProfileInputInstitution" value="${escapeHTML(profile.institutionName || '')}" required
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Registration / License Number
                        </label>
                        <input type="text" value="${escapeHTML(profile.registrationNumber || 'N/A')}" disabled
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px; background: #f4f5f7; cursor: not-allowed; color: #666;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Hospital Contact Phone
                        </label>
                        <input type="tel" id="myProfileInputContactPhone" value="${escapeHTML(profile.contactPhone || '')}" required
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Dispatch Zone
                        </label>
                        <select id="myProfileInputZone" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;">
                            <option value="Zone A" ${profile.zone === "Zone A" ? "selected" : ""}>Zone A</option>
                            <option value="Zone B" ${profile.zone === "Zone B" ? "selected" : ""}>Zone B</option>
                            <option value="Zone C" ${profile.zone === "Zone C" ? "selected" : ""}>Zone C</option>
                            <option value="Zone D" ${profile.zone === "Zone D" ? "selected" : ""}>Zone D</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                        Facility Address
                    </label>
                    <input type="text" id="myProfileInputAddress" value="${escapeHTML(profile.address || '')}" required
                           style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;" />
                </div>
            `;
        } else if (user.role === "donor") {
            const avail = profile.declaredAvailability || "available";
            fieldsHTML += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Blood Group (Clinical Record)
                        </label>
                        <input type="text" value="${escapeHTML(profile.bloodGroup || 'N/A')}" disabled
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px; font-weight: 700; background: #f4f5f7; cursor: not-allowed; color: var(--red-primary, #cc0000);" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Contact Phone
                        </label>
                        <input type="tel" id="myProfileInputPhone" value="${escapeHTML(profile.phone || '')}" required
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Age (Years)
                        </label>
                        <input type="text" value="${escapeHTML(String(profile.age || 'N/A'))}" disabled
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px; background: #f4f5f7; cursor: not-allowed; color: #666;" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Weight (kg)
                        </label>
                        <input type="number" id="myProfileInputWeight" value="${profile.weight || ''}" min="45" max="200" required
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Height
                        </label>
                        <input type="text" id="myProfileInputHeight" value="${escapeHTML(profile.height || '')}" placeholder="175 cm"
                               style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Residential / Donation Zone
                        </label>
                        <select id="myProfileInputZone" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;">
                            <option value="Zone A" ${profile.zone === "Zone A" ? "selected" : ""}>Zone A</option>
                            <option value="Zone B" ${profile.zone === "Zone B" ? "selected" : ""}>Zone B</option>
                            <option value="Zone C" ${profile.zone === "Zone C" ? "selected" : ""}>Zone C</option>
                            <option value="Zone D" ${profile.zone === "Zone D" ? "selected" : ""}>Zone D</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #555; margin-bottom: 4px; text-transform: uppercase;">
                            Availability Status
                        </label>
                        <select id="myProfileInputAvailability" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #ccc); border-radius: 6px; font-size: 13px;">
                            <option value="available" ${avail === "available" ? "selected" : ""}>Available to Donate</option>
                            <option value="temporarily_unavailable" ${avail === "temporarily_unavailable" ? "selected" : ""}>Temporarily Unavailable</option>
                            <option value="paused" ${avail === "paused" ? "selected" : ""}>Paused (Do Not Contact)</option>
                        </select>
                    </div>
                </div>

                <div style="padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 6px; border: 1px solid var(--border-color, #eee); font-size: 12px; color: #555;">
                    📅 <strong>Last Donation Date:</strong> ${profile.lastDonationDate ? new Date(profile.lastDonationDate).toLocaleDateString() : 'No prior donations recorded'}
                    <span style="margin-left: 10px; color: var(--text-muted, #777);">(90-day biological recovery cooldown enforced)</span>
                </div>
            `;
        } else if (user.role === "admin") {
            fieldsHTML += `
                <div style="padding: 12px 14px; background: rgba(220, 53, 69, 0.08); border-left: 4px solid #dc3545; border-radius: 4px; font-size: 12.5px; color: #842029;">
                    🛡️ <strong>Platform Administrator Access:</strong> You possess unrestricted system-wide privileges to verify hospital partners, audit emergency escalations, monitor active blood requests, and review audit logs.
                </div>
            `;
        }

        container.innerHTML = fieldsHTML;

    } catch (err) {
        console.error("Failed to load user profile:", err);
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc3545;">Error loading profile: ${escapeHTML(err.message)}</div>`;
        }
    }
}

function closeMyProfileModal() {
    const modal = document.getElementById("myProfileModal");
    if (modal) {
        modal.classList.remove("show");
    }
}

async function handleMyProfileSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById("myProfileSaveBtn");
    const statusMsg = document.getElementById("myProfileStatusMsg");

    if (!currentAuthenticatedProfile || !currentAuthenticatedProfile.user) {
        return;
    }

    const user = currentAuthenticatedProfile.user;
    const nameInput = document.getElementById("myProfileInputName");

    const payload = {};
    if (nameInput && nameInput.value.trim()) {
        payload.name = nameInput.value.trim();
    }

    if (user.role === "hospital") {
        const instInput = document.getElementById("myProfileInputInstitution");
        const contactPhoneInput = document.getElementById("myProfileInputContactPhone");
        const zoneInput = document.getElementById("myProfileInputZone");
        const addressInput = document.getElementById("myProfileInputAddress");

        if (instInput) payload.institutionName = instInput.value.trim();
        if (contactPhoneInput) payload.contactPhone = contactPhoneInput.value.trim();
        if (zoneInput) payload.zone = zoneInput.value;
        if (addressInput) payload.address = addressInput.value.trim();
    } else if (user.role === "donor") {
        const phoneInput = document.getElementById("myProfileInputPhone");
        const weightInput = document.getElementById("myProfileInputWeight");
        const heightInput = document.getElementById("myProfileInputHeight");
        const zoneInput = document.getElementById("myProfileInputZone");
        const availInput = document.getElementById("myProfileInputAvailability");

        if (phoneInput) payload.phone = phoneInput.value.trim();
        if (weightInput) payload.weight = Number(weightInput.value);
        if (heightInput) payload.height = heightInput.value.trim();
        if (zoneInput) payload.zone = zoneInput.value;
        if (availInput) payload.declaredAvailability = availInput.value;
    }

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";
        }

        const res = await window.api.updateMyProfile(payload);
        if (!res || !res.success) {
            throw new Error(res?.message || "Failed to update profile.");
        }

        // Update local session if name updated
        if (payload.name) {
            const currentUser = window.api.getUser() || {};
            currentUser.name = payload.name;
            window.api.setUser(currentUser);
            const navUserName = document.getElementById("navUserName");
            if (navUserName) navUserName.textContent = payload.name;
        }

        if (statusMsg) {
            statusMsg.style.display = "block";
            statusMsg.style.color = "#198754";
            statusMsg.textContent = "✓ Profile updated successfully!";
        }

        setTimeout(() => {
            closeMyProfileModal();
        }, 1200);

    } catch (err) {
        console.error("Profile update error:", err);
        if (statusMsg) {
            statusMsg.style.display = "block";
            statusMsg.style.color = "#dc3545";
            statusMsg.textContent = `Update failed: ${err.message}`;
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
        }
    }
}

window.openMyProfile = openMyProfile;
window.closeMyProfileModal = closeMyProfileModal;
window.handleMyProfileSubmit = handleMyProfileSubmit;
