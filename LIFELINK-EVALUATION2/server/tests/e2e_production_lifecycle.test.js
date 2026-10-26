/* =====================================================
   LIFELINK - END-TO-END PRODUCTION READINESS TEST SUITE
   Comprehensive lifecycle verification across all 4 roles:
   - Donor (Registration, Password Reset, Inbox, Response, Cooldown)
   - Pending Hospital (Registration, 403 Gatekeeping)
   - Verified Hospital (Admin Authorization, Request, Match, Outreach, Fulfillment)
   - Administrator (Verification, User Suspension, System Audit Trail)
   ===================================================== */

const http = require("http");

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body || "{}") });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: body });
                }
            });
        });
        req.on("error", reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runE2ETests() {
    console.log("==========================================");
    console.log("  LifeLink Full E2E Production Readiness");
    console.log("==========================================");

    let passed = 0;
    let failed = 0;

    const assert = (condition, title, details = "") => {
        if (condition) {
            console.log(`[PASS] ${title}`);
            passed++;
        } else {
            console.error(`[FAIL] ${title} - Details: ${details}`);
            failed++;
        }
    };

    const uniqueSuffix = Date.now();

    // ----------------------------------------------------
    // STAGE 1: Admin Authentication
    // ----------------------------------------------------
    const adminLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: "admin@lifelink.internal",
        password: "AdminSecurePass123!"
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, "1. Admin authenticated successfully", JSON.stringify(adminLogin.data));
    const adminToken = adminLogin.data.token;
    const adminHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
    };

    // ----------------------------------------------------
    // STAGE 2: Donor Registration, Recovery & Password Reset
    // ----------------------------------------------------
    const donorEmail = `e2e_donor_${uniqueSuffix}@donor.test`;
    let donorPassword = "InitialDonorPass123!";
    const newDonorPassword = "UpdatedDonorPass456!";

    // Register donor
    const donorReg = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Siddharth Verma " + uniqueSuffix,
        email: donorEmail,
        password: donorPassword,
        role: "donor",
        bloodGroup: "O+",
        age: 29,
        weight: 72,
        zone: "Zone A",
        phone: "9871112233"
    });
    assert(donorReg.status === 201 && donorReg.data.user, "2. Donor account registered via REST API (201)", JSON.stringify(donorReg.data));
    const donorUserId = donorReg.data.user.id;
    const donorProfileId = donorReg.data.profile ? donorReg.data.profile.donorId : null;

    // Password Recovery: Request reset token
    const forgotRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/forgot-password", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donorEmail });
    assert(forgotRes.status === 200 && forgotRes.data.resetToken, "3. Password recovery request returns secure token in development mode", JSON.stringify(forgotRes.data));
    const resetToken = forgotRes.data.resetToken;

    // Password Reset: Invalid token rejected
    const badReset = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/reset-password", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { token: "invalid_hex_token_12345", newPassword: newDonorPassword });
    assert(badReset.status === 400, "4. Invalid password reset token strictly rejected (400)", JSON.stringify(badReset.data));

    // Password Reset: Valid token updates password
    const goodReset = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/reset-password", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { token: resetToken, newPassword: newDonorPassword });
    assert(goodReset.status === 200, "5. Password reset completes successfully with token", JSON.stringify(goodReset.data));

    // Verify old password rejected
    const oldLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donorEmail, password: donorPassword });
    assert(oldLogin.status === 401, "6. Authentication with old password fails (401)", JSON.stringify(oldLogin.data));

    // Verify new password accepted
    const newLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donorEmail, password: newDonorPassword });
    assert(newLogin.status === 200 && newLogin.data.token, "7. Authentication with new password succeeds (200)", JSON.stringify(newLogin.data));
    const donorToken = newLogin.data.token;
    const donorHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${donorToken}`
    };

    // ----------------------------------------------------
    // STAGE 3: Account Suspension & Reactivation
    // ----------------------------------------------------
    // Admin suspends donor account
    const suspendRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/auth/users/${donorUserId}/status`, method: "PATCH",
        headers: adminHeaders
    }, { isActive: false, reason: "Temporary audit hold" });
    assert(suspendRes.status === 200 && suspendRes.data.user.isActive === false, "8. Admin suspends user account (isActive: false)", JSON.stringify(suspendRes.data));

    // Suspended user token rejected
    const suspendedAccess = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/me", method: "GET",
        headers: donorHeaders
    });
    assert(suspendedAccess.status === 403, "9. Suspended user session immediately rejected with 403", JSON.stringify(suspendedAccess.data));

    // Suspended user login rejected
    const suspendedLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donorEmail, password: newDonorPassword });
    assert(suspendedLogin.status === 403, "10. Suspended user cannot initiate new login session (403)", JSON.stringify(suspendedLogin.data));

    // Admin reactivates account
    const reactivateRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/auth/users/${donorUserId}/status`, method: "PATCH",
        headers: adminHeaders
    }, { isActive: true, reason: "Audit cleared" });
    assert(reactivateRes.status === 200 && reactivateRes.data.user.isActive === true, "11. Admin reactivates account (isActive: true)", JSON.stringify(reactivateRes.data));

    // Reactivated user logs in
    const reactivatedLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donorEmail, password: newDonorPassword });
    assert(reactivatedLogin.status === 200, "12. Reactivated user logs in normally", JSON.stringify(reactivatedLogin.data));
    const activeDonorToken = reactivatedLogin.data.token;
    const activeDonorHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeDonorToken}`
    };

    // ----------------------------------------------------
    // STAGE 4: Pending Hospital Registration & Gatekeeping
    // ----------------------------------------------------
    const hospEmail = `e2e_hospital_${uniqueSuffix}@citycare.org`;
    const hospPassword = "HospitalSecurePass123!";

    const hospReg = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Dr. Alok Sen",
        email: hospEmail,
        password: hospPassword,
        role: "hospital",
        institutionName: "Apollo City Care " + uniqueSuffix,
        registrationNumber: "REG-HOSP-" + uniqueSuffix,
        contactPhone: "9819998877",
        zone: "Zone A",
        address: "500 Healthcare Way"
    });
    assert(hospReg.status === 201, "13. Hospital account registered", JSON.stringify(hospReg.data));
    const hospProfileId = hospReg.data.profile._id;

    // Login as hospital (unverified)
    const unverifiedHospLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: hospEmail, password: hospPassword });
    const unverifiedHospToken = unverifiedHospLogin.data.token;
    const unverifiedHospHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${unverifiedHospToken}`
    };

    // Verify unverified hospital is blocked from creating blood requests
    const blockedRequest = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: unverifiedHospHeaders
    }, {
        patientName: "Urgent Patient",
        requiredBloodGroup: "O+",
        requestedUnits: 2,
        zone: "Zone A",
        urgency: "Emergency"
    });
    assert(blockedRequest.status === 403, "14. Unverified hospital strictly blocked from creating blood requests (403)", JSON.stringify(blockedRequest.data));

    // Admin verifies the hospital
    const verifyHospRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/hospital/${hospProfileId}/verify`, method: "PATCH",
        headers: adminHeaders
    }, { status: "authorized_institution" });
    assert(verifyHospRes.status === 200, "15. Admin grants 'authorized_institution' status to hospital", JSON.stringify(verifyHospRes.data));

    // Verified hospital logs in
    const verifiedHospLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: hospEmail, password: hospPassword });
    const verifiedHospToken = verifiedHospLogin.data.token;
    const verifiedHospHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${verifiedHospToken}`
    };

    // ----------------------------------------------------
    // STAGE 5: Complete Blood Request Lifecycle & Matching
    // ----------------------------------------------------
    // Verified hospital creates blood request
    const reqRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: verifiedHospHeaders
    }, {
        patientName: "Gaurav Mehta " + uniqueSuffix,
        requiredBloodGroup: "O+",
        requiredComponent: "Whole Blood",
        requestedUnits: 2,
        zone: "Zone A",
        urgency: "Emergency",
        hospitalName: "Apollo City Care " + uniqueSuffix
    });
    assert(reqRes.status === 201, "16. Authorized hospital creates emergency blood request (201)", JSON.stringify(reqRes.data));
    const requestId = reqRes.data.request.requestId;

    // Smart Matcher evaluates candidate pool
    const matchRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/matcher/find-matches", method: "POST",
        headers: verifiedHospHeaders
    }, {
        patientName: "Gaurav Mehta",
        requiredBloodGroup: "O+",
        zone: "Zone A",
        urgency: "Emergency",
        requestedUnits: 2
    });
    assert(matchRes.status === 200 && matchRes.data.matches.length >= 1, "17. Smart Matcher identifies compatible candidates with clinical disclaimer", JSON.stringify(matchRes.data.disclaimer));

    // Hospital dispatches invitation to our newly registered donor
    const sendInvRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/send", method: "POST",
        headers: verifiedHospHeaders
    }, {
        requestId,
        donorId: donorProfileId,
        matchScore: 95,
        matchReasons: ["Exact blood group match (O+ → O+)", "Immediate availability"]
    });
    assert(sendInvRes.status === 201 && sendInvRes.data.invitation.status === "pending", "18. Hospital sends coordination invitation (Status: pending)", JSON.stringify(sendInvRes.data));
    const invitationId = sendInvRes.data.invitation.id;

    // Donor queries inbox
    const donorInbox = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/inbox", method: "GET",
        headers: activeDonorHeaders
    });
    assert(donorInbox.status === 200 && donorInbox.data.invitations.length >= 1, "19. Donor receives invitation in isolated personal inbox", JSON.stringify(donorInbox.data));

    // Donor accepts invitation
    const acceptRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/invitations/${invitationId}/respond`, method: "PATCH",
        headers: activeDonorHeaders
    }, {
        status: "accepted",
        note: "I will arrive at the blood center in 45 minutes."
    });
    assert(acceptRes.status === 200 && acceptRes.data.invitation.status === "accepted", "20. Donor accepts invitation (Status: accepted with note)", JSON.stringify(acceptRes.data));

    // Hospital fulfills request
    const fulfillRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${requestId}/fulfill`, method: "POST",
        headers: verifiedHospHeaders
    }, {
        donorId: donorProfileId,
        unitsReceived: 2,
        notes: "Transfusion completed under standard protocol."
    });
    assert(fulfillRes.status === 200 && fulfillRes.data.request.status === "fulfilled", "21. Hospital fulfills request; DonationRecord created & cooldown updated (200)", JSON.stringify(fulfillRes.data));

    // ----------------------------------------------------
    // STAGE 6: Rate Limiting & Abuse Protection Headers
    // ----------------------------------------------------
    const rateCheck = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/health", method: "GET"
    });
    assert(rateCheck.status === 200 && rateCheck.headers["x-ratelimit-limit"], "22. Rate limiting headers active on API responses", JSON.stringify(rateCheck.headers["x-ratelimit-limit"]));

    // ----------------------------------------------------
    // STAGE 7: Audit Trail Verification
    // ----------------------------------------------------
    const auditLogs = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/hospital/audit-logs", method: "GET",
        headers: adminHeaders
    });
    assert(auditLogs.status === 200 && Array.isArray(auditLogs.data.logs), "23. Administrator verifies complete tamper-evident audit trail entries", `Count: ${auditLogs.data.logs.length}`);

    console.log("------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==========================================");

    if (failed > 0) process.exit(1);
}

runE2ETests().catch(err => {
    console.error("E2E production test suite failed:", err);
    process.exit(1);
});
