/* =====================================================
   LIFELINK - HOSPITAL CONSOLE & REQUESTS TEST SUITE
   Verifies blood requests, institutional verification guards,
   outcome verification, cross-tenant isolation, and audit logs.
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

async function runHospitalAndRequestTests() {
    console.log("==========================================");
    console.log("  LifeLink Hospital Console & Request Tests");
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

    // 1. Initial Dashboard Stats
    const statsRes1 = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/hospital/dashboard-stats", method: "GET"
    });
    assert(statsRes1.status === 200 && statsRes1.data.metrics, "1. GET /api/hospital/dashboard-stats returns database-calculated metrics", JSON.stringify(statsRes1.data.metrics));

    // Setup: Register Hospital A
    const hospAEmail = `trauma_center_${uniqueSuffix}@hosp.test`;
    const hospPass = "HospitalPass123!";
    const regHospARes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Dr. Arvind Rao",
        email: hospAEmail,
        password: hospPass,
        role: "hospital",
        institutionName: "Memorial Trauma Center " + uniqueSuffix,
        registrationNumber: "REG-HOSP-" + uniqueSuffix,
        contactPhone: "9876543210",
        zone: "Zone B",
        address: "742 Evergreen Road, Zone B"
    });
    const hospitalProfileId = regHospARes.data.profile?._id;
    const hospAToken = regHospARes.data.token;

    // Setup: Admin Login
    let adminToken;
    const adminLoginRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: "admin@lifelink.internal", password: "AdminSecurePass123!" });
    adminToken = adminLoginRes.data?.token;

    if (!adminToken) {
        // Fallback: try alternate admin email
        const altLogin = await makeRequest({
            hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { email: "admin@lifelink.org", password: "Admin123!" });
        adminToken = altLogin.data?.token;
    }

    // 2. Security Check: Unauthenticated request creation rejected (401)
    const unauthCreate = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        patientName: "Anonymous Patient",
        requiredBloodGroup: "O-",
        zone: "Zone B"
    });
    assert(unauthCreate.status === 401, "2. Unauthenticated request creation rejected with 401", JSON.stringify(unauthCreate.data));

    // 3. Security Check: Unverified hospital cannot create blood requests (403)
    const unverifiedCreate = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hospAToken}` }
    }, {
        patientName: "Arjun Verma " + uniqueSuffix,
        requiredBloodGroup: "O-",
        requestedUnits: 2,
        zone: "Zone B",
        urgency: "Emergency"
    });
    assert(unverifiedCreate.status === 403, "3. Unverified hospital rejected from creating blood requests (403)", JSON.stringify(unverifiedCreate.data));

    // 4. Admin Approves Hospital (PATCH /api/hospital/:id/verify)
    const verifyHospitalRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/hospital/${hospitalProfileId}/verify`, method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` }
    }, {
        status: "authorized_institution",
        notes: "Verified state healthcare accreditation documents."
    });
    assert(
        verifyHospitalRes.status === 200 &&
        verifyHospitalRes.data.hospital.verificationStatus === "authorized_institution",
        "4. Administrator authorizes hospital facility account (200)",
        JSON.stringify(verifyHospitalRes.data)
    );

    // Refresh Hospital A token by logging in again after authorization
    const hospALogin2 = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: hospAEmail, password: hospPass });
    const verifiedHospAToken = hospALogin2.data.token;

    // 5. Authorized Hospital Creates Emergency Blood Request
    const createReq = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${verifiedHospAToken}` }
    }, {
        patientName: "Arjun Verma " + uniqueSuffix,
        requiredBloodGroup: "O-",
        requiredComponent: "Red Blood Cells",
        requestedUnits: 2,
        zone: "Zone B",
        urgency: "Emergency",
        requiredByDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        description: "Urgent trauma surgery transfusion required.",
        hospitalName: "Memorial Trauma Center"
    });
    assert(createReq.status === 201 && createReq.data.request.requestId, "5. Authorized hospital creates emergency request (201)", JSON.stringify(createReq.data));
    const createdRequestId = createReq.data.request.requestId;

    // 6. Reject Invalid Quantity (> 20 units)
    const badUnitsReq = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${verifiedHospAToken}` }
    }, {
        patientName: "Invalid Units",
        requiredBloodGroup: "O+",
        requestedUnits: 50,
        zone: "Zone A"
    });
    assert(badUnitsReq.status === 400, "6. Reject invalid blood unit quantity > 20 (400)", JSON.stringify(badUnitsReq.data));

    // 7. Retrieve All Requests (GET /api/requests)
    const listRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "GET"
    });
    assert(listRes.status === 200 && Array.isArray(listRes.data.requests) && listRes.data.requests.length > 0, "7. GET /api/requests returns active requests list", `Count: ${listRes.data.count}`);

    // 8. Register Hospital B to test cross-tenant isolation
    const hospBEmail = `city_clinic_${uniqueSuffix}@hosp.test`;
    const regHospBRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Dr. Sneha Patel",
        email: hospBEmail,
        password: hospPass,
        role: "hospital",
        institutionName: "City Clinic " + uniqueSuffix,
        registrationNumber: "REG-HOSP-B-" + uniqueSuffix,
        contactPhone: "9876543222",
        zone: "Zone A",
        address: "12 Main Street, Zone A"
    });
    const hospBToken = regHospBRes.data.token;

    // 9. Security Check: Hospital B cannot modify Hospital A's request (403)
    const crossUpdateRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${createdRequestId}`, method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hospBToken}` }
    }, { requestedUnits: 5 });
    assert(crossUpdateRes.status === 403, "9. Cross-hospital request modification rejected (403)");

    // 10. Update Request by Owner Hospital A (200)
    const updateRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${createdRequestId}`, method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${verifiedHospAToken}` }
    }, {
        description: "Updated notes: Surgery scheduled for 09:00 AM.",
        requestedUnits: 3
    });
    assert(updateRes.status === 200 && updateRes.data.request.requestedUnits === 3, "10. Owning hospital updates request fields (200)", JSON.stringify(updateRes.data));

    // 11. Fulfill Request with Mandatory Outcome Verification (POST /api/requests/:id/fulfill)
    const fulfillRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${createdRequestId}/fulfill`, method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${verifiedHospAToken}` }
    }, {
        unitsReceived: 3,
        clinicalNotes: "Crossmatch completed, 3 units transfused successfully without adverse reaction."
    });
    assert(
        fulfillRes.status === 200 &&
        fulfillRes.data.request.status === "fulfilled" &&
        fulfillRes.data.request.outcomeVerification.verified === true,
        "11. POST /api/requests/:id/fulfill marks fulfilled with verified outcome (200)",
        JSON.stringify(fulfillRes.data)
    );

    // 12. Security Check: Non-admin cannot delete requests (403)
    const nonAdminDel = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${createdRequestId}`, method: "DELETE",
        headers: { "Authorization": `Bearer ${verifiedHospAToken}` }
    });
    assert(nonAdminDel.status === 403, "12. Non-admin request deletion rejected (403)");

    // 13. Audit Logs Verification (GET /api/hospital/audit-logs)
    const auditRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/hospital/audit-logs", method: "GET",
        headers: { "Authorization": `Bearer ${verifiedHospAToken}` }
    });
    assert(
        auditRes.status === 200 &&
        Array.isArray(auditRes.data.logs) &&
        auditRes.data.logs.some(l => l.action.includes("BLOOD_REQUEST")),
        "13. GET /api/hospital/audit-logs returns scoped audit trail entries",
        `Count: ${auditRes.data.count}`
    );

    // 14. Admin Deletes Request (200)
    const adminDel = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/requests/${createdRequestId}`, method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` }
    });
    assert(adminDel.status === 200 && adminDel.data.success, "14. Admin deletes blood request (200)");

    console.log("------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==========================================");

    if (failed > 0) process.exit(1);
}

runHospitalAndRequestTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
