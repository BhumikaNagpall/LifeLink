/* =====================================================
   LIFELINK - NOTIFICATIONS & ESCALATION TEST SUITE
   Verifies in-app notification lifecycle, deadline monitoring,
   request expiry transitions, and emergency escalation alerts.
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

async function runNotificationAndEscalationTests() {
    console.log("==========================================");
    console.log("  LifeLink Notifications & Escalation Tests");
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

    // 0. Setup: Acquire Admin / Verified Hospital Token
    const adminLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: "admin@lifelink.internal",
        password: "AdminSecurePass123!"
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, "0. Setup: Admin session acquired for escalation tests", JSON.stringify(adminLogin.data));
    const authToken = adminLogin.data.token;
    const authHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
    };

    // 0a. Security: Assert unauthenticated access returns 401
    const unauthNotif = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/notifications", method: "GET"
    });
    assert(unauthNotif.status === 401, "0a. Security: GET /api/notifications rejects unauthenticated access with HTTP 401", `Status: ${unauthNotif.status}`);

    const unauthEscalate = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/notifications/check-escalation", method: "POST"
    });
    assert(unauthEscalate.status === 401, "0b. Security: POST /api/notifications/check-escalation rejects unauthenticated access with HTTP 401", `Status: ${unauthEscalate.status}`);

    // 0c. Security: Donor role cannot execute check-escalation (Requires hospital/admin)
    const donorLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: "aarav.donor@example.com",
        password: "DonorSecurePass123!"
    });
    if (donorLogin.status === 200 && donorLogin.data.token) {
        const donorEscalate = await makeRequest({
            hostname: "localhost", port: 5000, path: "/api/notifications/check-escalation", method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${donorLogin.data.token}`
            }
        });
        assert(donorEscalate.status === 403, "0c. Security: Donor role rejected from check-escalation with HTTP 403", `Status: ${donorEscalate.status}`);
    } else {
        assert(true, "0c. Security: Donor escalation role check (skipped, donor login unavailable)", "");
    }

    // 1. Initial Notifications Query (GET /api/notifications)
    const notifRes1 = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/notifications", method: "GET",
        headers: authHeaders
    });
    assert(notifRes1.status === 200 && Array.isArray(notifRes1.data.notifications), "1. GET /api/notifications retrieves notification list", `Count: ${notifRes1.data.notifications.length}`);

    // 2. Mark Single Notification Read (PATCH /api/notifications/:id/read)
    if (notifRes1.data.notifications.length > 0) {
        const testNotifId = notifRes1.data.notifications[0]._id;
        const readRes = await makeRequest({
            hostname: "localhost", port: 5000, path: `/api/notifications/${testNotifId}/read`, method: "PATCH",
            headers: authHeaders
        });
        assert(readRes.status === 200 && readRes.data.notification.isRead === true, "2. PATCH /api/notifications/:id/read marks notification as read", JSON.stringify(readRes.data));
    } else {
        assert(true, "2. Mark single notification read (skipped, list empty)", "");
    }

    // 3. Mark All Notifications Read (PATCH /api/notifications/mark-all-read)
    const markAllRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/notifications/mark-all-read", method: "PATCH",
        headers: authHeaders
    });
    assert(markAllRes.status === 200 && markAllRes.data.success, "3. PATCH /api/notifications/mark-all-read marks all as read", JSON.stringify(markAllRes.data));

    // 4. Overdue Request Expiry Workflow
    // Create request with past deadline
    const pastDate = new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
    const overdueReq = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: authHeaders
    }, {
        patientName: "Overdue Test Patient " + uniqueSuffix,
        requiredBloodGroup: "AB+",
        requiredByDate: pastDate,
        zone: "Zone C",
        urgency: "Normal"
    });
    assert(overdueReq.status === 201, "4. Setup: Created request with past deadline", JSON.stringify(overdueReq.data));
    const overdueRequestId = overdueReq.data.request.requestId;

    // Send an invitation for this overdue request
    const candidateDonor = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Overdue Donor " + uniqueSuffix,
        phone: "9988776655",
        bloodGroup: "AB+",
        age: 28,
        weight: 65,
        zone: "Zone C"
    });
    const donorId = candidateDonor.data.donor.id;

    const overdueInv = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/invitations/send", method: "POST",
        headers: authHeaders
    }, {
        requestId: overdueRequestId,
        donorId: donorId
    });
    assert(overdueInv.status === 201, "5. Setup: Dispatched invitation for overdue request", JSON.stringify(overdueInv.data));
    const pendingInvId = overdueInv.data.invitation.id;

    // 5. Run Escalation & Expiry Check (POST /api/notifications/check-escalation)
    const checkRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/notifications/check-escalation", method: "POST",
        headers: authHeaders
    });
    assert(
        checkRes.status === 200 && checkRes.data.expiredRequestsCount >= 1,
        "6. Escalation engine detects overdue request and transitions status to 'expired'",
        JSON.stringify(checkRes.data)
    );

    // 6. Verify Overdue Request Status is 'expired'
    const getExpiredReq = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${overdueRequestId}`, method: "GET",
        headers: authHeaders
    });
    assert(
        getExpiredReq.status === 200 && getExpiredReq.data.request.status === "expired",
        "7. Blood request is permanently marked 'expired'",
        `Status: ${getExpiredReq.data.request.status}`
    );

    // 7. Verify Pending Invitation was transitioned to 'expired'
    const getInvList = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/invitations/request/${overdueRequestId}`, method: "GET",
        headers: authHeaders
    });
    const expiredInv = getInvList.data.invitations.find(i => i.id === pendingInvId);
    assert(
        expiredInv && expiredInv.status === "expired",
        "8. Lingering pending invitations automatically expired past request deadline",
        JSON.stringify(expiredInv)
    );

    // 8. Approaching Deadline Escalation Alert Workflow
    // Create an emergency request due in 2 hours with no accepted responses
    const twoHoursFromNow = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const urgentApproachReq = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: authHeaders
    }, {
        patientName: "Escalation Patient " + uniqueSuffix,
        requiredBloodGroup: "O+",
        requiredByDate: twoHoursFromNow,
        zone: "Zone A",
        urgency: "Emergency"
    });
    assert(urgentApproachReq.status === 201, "9. Setup: Created request due within 2 hours", JSON.stringify(urgentApproachReq.data));
    const approachingRequestId = urgentApproachReq.data.request.requestId;

    // Trigger escalation evaluation
    const escalateCheckRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/notifications/check-escalation", method: "POST",
        headers: authHeaders
    });
    assert(
        escalateCheckRes.status === 200 && escalateCheckRes.data.escalatedRequestsCount >= 1,
        "10. Escalation engine flags unfulfilled request nearing deadline and triggers contingency alert",
        JSON.stringify(escalateCheckRes.data)
    );

    console.log("------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==========================================");

    if (failed > 0) process.exit(1);
}

runNotificationAndEscalationTests().catch(err => {
    console.error("Notification and escalation test suite failed:", err);
    process.exit(1);
});
