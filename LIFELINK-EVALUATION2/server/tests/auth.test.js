/* =====================================================
   LIFELINK - AUTHENTICATION SUITE TESTS
   Verifies registration, password hashing, JWT, duplicate checks, and RBAC
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

async function runAuthTests() {
    console.log("==========================================");
    console.log("  LifeLink Auth & Model Integration Tests");
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

    // Test 1: Register Donor
    const regDonor = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Test Donor " + uniqueSuffix,
        email: `donor_${uniqueSuffix}@example.com`,
        password: "password123",
        role: "donor",
        phone: "9876543210",
        bloodGroup: "O+",
        age: 29,
        weight: 70,
        zone: "Zone A"
    });
    assert(regDonor.status === 201 && regDonor.data.token, "1. Register Donor returns 201 with token", JSON.stringify(regDonor.data));

    // Test 2: Prevent Admin Self-Registration
    const regAdmin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Unauthorized Admin",
        email: `admin_${uniqueSuffix}@example.com`,
        password: "password123",
        role: "admin"
    });
    assert(regAdmin.status === 403, "2. Self-registration as admin is rejected (403)", JSON.stringify(regAdmin.data));

    // Test 3: Register Hospital
    const regHospital = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Medical Officer",
        email: `hospital_${uniqueSuffix}@example.com`,
        password: "hospitalPass123",
        role: "hospital",
        institutionName: "Apollo Care Clinic " + uniqueSuffix,
        registrationNumber: "REG-HOSP-" + uniqueSuffix,
        hospitalType: "General Hospital",
        contactPhone: "+91 80 1234 5678",
        zone: "Zone B",
        address: "100 Health Way"
    });
    assert(regHospital.status === 201 && regHospital.data.profile.verificationStatus === "unverified_demo", "3. Register Hospital returns 201 with 'unverified_demo' status", JSON.stringify(regHospital.data));

    // Test 4: Duplicate Email Block
    const dupCheck = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Duplicate",
        email: `donor_${uniqueSuffix}@example.com`,
        password: "password123"
    });
    assert(dupCheck.status === 409, "4. Duplicate registration rejected (409)", JSON.stringify(dupCheck.data));

    // Test 5: Invalid Password
    const badLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: `donor_${uniqueSuffix}@example.com`,
        password: "wrongPassword"
    });
    assert(badLogin.status === 401, "5. Invalid password rejected with safe 401", JSON.stringify(badLogin.data));

    // Test 6: Valid Login
    const goodLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: `donor_${uniqueSuffix}@example.com`,
        password: "password123"
    });
    assert(goodLogin.status === 200 && goodLogin.data.token, "6. Valid login returns 200 with JWT token", JSON.stringify(goodLogin.data));
    const token = goodLogin.data.token;

    // Test 7: Protected Route with Valid Token
    const meWithToken = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/me", method: "GET",
        headers: { "Authorization": "Bearer " + token }
    });
    assert(meWithToken.status === 200 && meWithToken.data.user.role === "donor", "7. Protected /api/auth/me succeeds with Bearer token", JSON.stringify(meWithToken.data));

    // Test 8: Protected Route without Token
    const meNoToken = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/me", method: "GET"
    });
    assert(meNoToken.status === 401, "8. Protected route without token returns 401", JSON.stringify(meNoToken.data));

    // Test 9: Profile Update via PATCH /api/auth/me/profile
    const updateRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/me/profile", method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        }
    }, {
        name: "Updated Donor Name " + uniqueSuffix,
        weight: 74,
        phone: "9876543299"
    });
    assert(updateRes.status === 200 && updateRes.data.user.name === "Updated Donor Name " + uniqueSuffix, "9. Authenticated profile update succeeds via PATCH /api/auth/me/profile", JSON.stringify(updateRes.data));

    // Test 10: Unknown Role Rejection
    const badRoleReg = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/register", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Bad Role User",
        email: `badrole_${uniqueSuffix}@example.com`,
        password: "password123",
        role: "super_special_role"
    });
    assert(badRoleReg.status === 400, "10. Invalid registration role rejected with 400", JSON.stringify(badRoleReg.data));

    // Test 11: Dr. Jane Doe Medical Officer Login & Profile
    const janeLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: "jane.doe@citycare.org",
        password: "JaneDoeSecure123!"
    });
    assert(janeLogin.status === 200 && janeLogin.data.user.role === "hospital", "11. Dr. Jane Doe demo credentials authenticate successfully", JSON.stringify(janeLogin.data));

    if (janeLogin.data.token) {
        const janeMe = await makeRequest({
            hostname: "localhost", port: 5000, path: "/api/auth/me", method: "GET",
            headers: { "Authorization": "Bearer " + janeLogin.data.token }
        });
        assert(janeMe.status === 200 && janeMe.data.profile.verificationStatus === "authorized_institution", "12. Dr. Jane Doe profile contains verified institution authorization", JSON.stringify(janeMe.data));
    }

    // Test 13: Forged / Invalid JWT Token Rejection
    const forgedRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/me", method: "GET",
        headers: { "Authorization": "Bearer invalid.jwt.token.here" }
    });
    assert(forgedRes.status === 401, "13. Forged JWT token rejected with HTTP 401", JSON.stringify(forgedRes.data));

    // Test 14: Logout Endpoint (POST /api/auth/logout)
    const logoutRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/logout", method: "POST",
        headers: { "Authorization": "Bearer " + token }
    });
    assert(logoutRes.status === 200 && logoutRes.data.success, "14. Server logout endpoint responds with HTTP 200", JSON.stringify(logoutRes.data));

    console.log("------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==========================================");

    if (failed > 0) process.exit(1);
}

runAuthTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
