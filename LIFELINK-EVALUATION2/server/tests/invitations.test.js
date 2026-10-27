/* =====================================================
   LIFELINK - INVITATION & INBOX TEST SUITE
   Verifies donor outreach, duplicate prevention, donor inbox,
   security authorization, cross-user isolation, Accept/Decline actions,
   and hospital synchronization.
   ===================================================== */

const http = require("http");

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body || "{}") });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on("error", reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runInvitationTests() {
    console.log("==========================================");
    console.log("  LifeLink Invitation & Inbox Tests");
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

    // 0. Setup Accounts: Admin, Verified Hospital, Unverified Hospital, Donor 1, Donor 2
    // Admin login
    const adminLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: "admin@lifelink.internal",
        password: "AdminSecurePass123!"
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, "0. Setup: Admin session acquired", JSON.stringify(adminLogin.data));
    const adminToken = adminLogin.data.token;

    // Register Hospital A (to be verified)
    const hospEmail = `hosp_inv_${uniqueSuffix}@metro.org`;
    const hospPass = "HospitalPass123!";
    const hospReg = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Dr. Invitations Admin",
        institutionName: "Metro General Hospital " + uniqueSuffix,
        email: hospEmail,
        password: hospPass,
        role: "hospital",
        registrationNumber: "REG-LIC-" + uniqueSuffix,
        contactPhone: "9812345678",
        zone: "Zone A",
        address: "100 Medical Center Blvd"
    });
    const hospProfileId = hospReg.data.profile._id;

    // Register Hospital B (remains UNVERIFIED)
    const unverifiedEmail = `unverified_${uniqueSuffix}@metro.org`;
    const unverifiedPass = "UnverifiedPass123!";
    const unverifiedReg = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Dr. Unverified Staff",
        institutionName: "Unverified Clinic " + uniqueSuffix,
        email: unverifiedEmail,
        password: unverifiedPass,
        role: "hospital",
        registrationNumber: "UNV-REG-" + uniqueSuffix,
        contactPhone: "9899999999",
        zone: "Zone A",
        address: "50 Suspicious Ave"
    });
    const unverifiedToken = unverifiedReg.data.token;

    // Verify Hospital A via Admin
    const verifyRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/hospital/${hospProfileId}/verify`, method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminToken}`
        }
    }, { status: "authorized_institution" });
    assert(verifyRes.status === 200, "0.1. Setup: Admin verified hospital account", JSON.stringify(verifyRes.data));

    // Login as verified hospital to obtain token
    const verifiedLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: hospEmail, password: hospPass });
    const hospToken = verifiedLogin.data.token;
    const hospHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${hospToken}`
    };

    // 1. Create a Blood Request with Verified Hospital
    const reqRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: hospHeaders
    }, {
        patientName: "Deepak Rawat " + uniqueSuffix,
        requiredBloodGroup: "A+",
        requiredComponent: "Whole Blood",
        requestedUnits: 2,
        zone: "Zone A",
        urgency: "Urgent",
        hospitalName: "Metro General Hospital " + uniqueSuffix
    });
    assert(reqRes.status === 201, "1. Setup: Blood request created by verified hospital", JSON.stringify(reqRes.data));
    const requestId = reqRes.data.request.requestId;

    // 2. Register Candidate Donor 1 with credentials
    const donor1Email = `ananya_${uniqueSuffix}@donor.test`;
    const donor1Pass = "AnanyaPass123!";
    const donorRes1 = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Ananya Deshmukh " + uniqueSuffix,
        email: donor1Email,
        password: donor1Pass,
        phone: "9822334455",
        bloodGroup: "A+",
        age: 26,
        weight: 62,
        zone: "Zone A",
        firstTime: "no",
        healthy: true,
        medicalCondition: false,
        lastDonation: "2025-06-01"
    });
    assert(donorRes1.status === 201, "2. Setup: Candidate donor 1 registered", JSON.stringify(donorRes1.data));
    const donorId1 = donorRes1.data.donor.id;

    const donor1Login = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donor1Email, password: donor1Pass });
    const donor1Token = donor1Login.data.token;
    const donor1Headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${donor1Token}`
    };

    // Security Test: Unauthenticated call to /api/invitations/send -> 401
    const unauthSend = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/send", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { requestId, donorId: donorId1 });
    assert(unauthSend.status === 401, "2.1. Security: Unauthenticated invitation dispatch rejected (401)", JSON.stringify(unauthSend.data));

    // Security Test: Unverified hospital call to /api/invitations/send -> 403
    const unverifiedSend = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/send", method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${unverifiedToken}`
        }
    }, { requestId, donorId: donorId1 });
    assert(unverifiedSend.status === 403, "2.2. Security: Unverified hospital invitation dispatch rejected (403)", JSON.stringify(unverifiedSend.data));

    // 3. Send Invitation by Verified Hospital (POST /api/invitations/send)
    const sendRes1 = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/send", method: "POST",
        headers: hospHeaders
    }, {
        requestId: requestId,
        donorId: donorId1,
        matchScore: 95,
        matchReasons: ["Exact blood group match (A+ → A+)", "Local Zone A proximity"]
    });
    assert(
        sendRes1.status === 201 && sendRes1.data.invitation && sendRes1.data.invitation.status === "pending",
        "3. POST /api/invitations/send successfully dispatches invitation (Status: pending)",
        JSON.stringify(sendRes1.data)
    );
    const invitationId1 = sendRes1.data.invitation.id;

    // 4. Verify Request Status transitioned to 'coordinating'
    const getReqRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${requestId}`, method: "GET",
        headers: hospHeaders
    });
    assert(
        getReqRes.status === 200 && getReqRes.data.request.status === "coordinating",
        "4. Blood request status automatically transitions to 'coordinating'",
        `Status: ${getReqRes.data.request.status}`
    );

    // 5. Duplicate Invitation Block (POST /api/invitations/send duplicate -> 409)
    const dupSendRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/send", method: "POST",
        headers: hospHeaders
    }, {
        requestId: requestId,
        donorId: donorId1
    });
    assert(
        dupSendRes.status === 409,
        "5. Prevent sending duplicate active invitation to same donor (409 Conflict)",
        JSON.stringify(dupSendRes.data)
    );

    // 6. View Invitations for Request (GET /api/invitations/request/:requestId)
    const listReqInvRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/invitations/request/${requestId}`, method: "GET",
        headers: hospHeaders
    });
    assert(
        listReqInvRes.status === 200 && listReqInvRes.data.count >= 1,
        "6. Hospital staff can track active invitations for the request",
        `Count: ${listReqInvRes.data.count}`
    );

    // 7. Register Second Donor & Test Cross-Donor Security
    const donor2Email = `rohan_${uniqueSuffix}@donor.test`;
    const donor2Pass = "RohanPass123!";
    const donorRes2 = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Rohan Kulkarni " + uniqueSuffix,
        email: donor2Email,
        password: donor2Pass,
        phone: "9833445566",
        bloodGroup: "A+",
        age: 31,
        weight: 75,
        zone: "Zone A"
    });
    const donorId2 = donorRes2.data.donor.id;

    const donor2Login = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donor2Email, password: donor2Pass });
    const donor2Token = donor2Login.data.token;
    const donor2Headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${donor2Token}`
    };

    // Security Test: Donor 2 cannot respond to Donor 1's invitation -> 403 Forbidden
    const hijackRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/invitations/${invitationId1}/respond`, method: "PATCH",
        headers: donor2Headers
    }, {
        status: "accepted"
    });
    assert(hijackRes.status === 403, "7. Security: Donor 2 forbidden from responding to Donor 1's invitation (403)", JSON.stringify(hijackRes.data));

    // 7.1 Security: Unauthenticated inbox request rejected with 401
    const unauthInbox = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/inbox", method: "GET"
    });
    assert(unauthInbox.status === 401, "7.1 Security: Unauthenticated inbox request rejected with HTTP 401", `Status: ${unauthInbox.status}`);

    // 7.2 Security: Hospital account forbidden from accessing donor inbox with 403
    const hospInbox = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/inbox", method: "GET",
        headers: hospHeaders
    });
    assert(hospInbox.status === 403, "7.2 Security: Hospital account forbidden from donor inbox with HTTP 403", `Status: ${hospInbox.status}`);

    // 8. Donor 1 Inbox Query (GET /api/invitations/inbox)
    const inboxRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/inbox", method: "GET",
        headers: donor1Headers
    });
    assert(
        inboxRes.status === 200 && inboxRes.data.invitations.length >= 1,
        "8. Donor 1 Inbox displays incoming coordination invitation with request details",
        JSON.stringify(inboxRes.data)
    );

    // 9. Donor 1 Accepts Invitation (PATCH /api/invitations/:id/respond -> accepted)
    const acceptRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/invitations/${invitationId1}/respond`, method: "PATCH",
        headers: donor1Headers
    }, {
        status: "accepted",
        note: "Available to visit the hospital tomorrow morning."
    });
    assert(
        acceptRes.status === 200 && acceptRes.data.invitation.status === "accepted",
        "9. Donor 1 accepts invitation (Status: accepted with donor note)",
        JSON.stringify(acceptRes.data)
    );

    // 10. Send Invitation to Donor 2 and Donor 2 Declines
    const sendRes2 = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/send", method: "POST",
        headers: hospHeaders
    }, {
        requestId: requestId,
        donorId: donorId2
    });
    const invitationId2 = sendRes2.data.invitation.id;

    const declineRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/invitations/${invitationId2}/respond`, method: "PATCH",
        headers: donor2Headers
    }, {
        status: "declined",
        note: "Currently out of city on business."
    });
    assert(
        declineRes.status === 200 && declineRes.data.invitation.status === "declined",
        "10. Donor 2 declines invitation (Status: declined without penalty)",
        JSON.stringify(declineRes.data)
    );

    // 11. Verify Hospital Dashboard Metrics Sync
    const statsRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/hospital/dashboard-stats", method: "GET",
        headers: hospHeaders
    });
    assert(
        statsRes.status === 200 &&
        statsRes.data.metrics.invitationsSent >= 2 &&
        statsRes.data.metrics.responsesAccepted >= 1 &&
        statsRes.data.metrics.responsesDeclined >= 1,
        "11. Hospital dashboard metrics accurately reflect invitations and donor responses",
        JSON.stringify(statsRes.data.metrics)
    );

    console.log("------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==========================================");

    if (failed > 0) process.exit(1);
}

runInvitationTests().catch(err => {
    console.error("Invitation test suite failed:", err);
    process.exit(1);
});
