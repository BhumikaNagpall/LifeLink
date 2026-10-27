/* =====================================================
   LIFELINK - DONOR INTEGRATION TEST SUITE
   Verifies registration wizard, age validation, query filters,
   token authorization, profile ownership, and deletion.
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

async function runDonorTests() {
    console.log("==========================================");
    console.log("  LifeLink Donor API Integration Tests");
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
    const donorEmail = `vikram_${uniqueSuffix}@donor.test`;
    const donorPass = "DonorSecret123!";

    // 1. Register donor via Wizard API (POST /api/donors/register-wizard)
    const wizardRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Vikram Malhotra " + uniqueSuffix,
        email: donorEmail,
        password: donorPass,
        phone: "9811223344",
        bloodGroup: "B+",
        age: 32,
        weight: 74,
        height: "178 cm",
        zone: "Zone A",
        firstTime: "no",
        healthy: true,
        medicalCondition: false,
        medication: "no",
        lastDonation: "2026-06-15",
        consent: true
    });
    assert(wizardRes.status === 201 && wizardRes.data.donor.id, "1. POST /api/donors/register-wizard succeeds (201)", JSON.stringify(wizardRes.data));
    const createdDonorId = wizardRes.data.donor.id;

    // Login to obtain donor's auth token
    const loginRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: donorEmail, password: donorPass });
    const donorToken = loginRes.data.token;

    // Register a second donor to test ownership isolation
    const otherEmail = `other_${uniqueSuffix}@donor.test`;
    const otherPass = "OtherPass123!";
    await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Other Donor " + uniqueSuffix,
        email: otherEmail,
        password: otherPass,
        phone: "9822334455",
        bloodGroup: "O+",
        age: 26,
        weight: 65,
        zone: "Zone B"
    });
    const otherLoginRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { email: otherEmail, password: otherPass });
    const otherToken = otherLoginRes.data.token;

    // 2. Validate Wizard Input: Age < 18 rejected
    const badAgeRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Too Young",
        phone: "9811223344",
        bloodGroup: "B+",
        age: 16,
        weight: 55,
        zone: "Zone A"
    });
    assert(badAgeRes.status === 400, "2. Underage donor registration blocked (400)", JSON.stringify(badAgeRes.data));

    // 3. Get Donor Directory (GET /api/donors)
    const listRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors", method: "GET"
    });
    assert(listRes.status === 200 && Array.isArray(listRes.data.donors) && listRes.data.donors.length > 0, "3. GET /api/donors returns active donors array", `Count: ${listRes.data.count}`);

    // 4. Filter by Blood Group (GET /api/donors?bloodGroup=B+)
    const filterRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors?bloodGroup=B%2B", method: "GET"
    });
    const allBPositive = filterRes.data.donors.every(d => d.bloodGroup === "B+");
    assert(filterRes.status === 200 && allBPositive, "4. Filter /api/donors?bloodGroup=B+ correctly filters results", `Count: ${filterRes.data.count}`);

    // 5. Privacy Protection: Phone number masked in public directory view
    const publicDonor = listRes.data.donors.find(d => d.id === createdDonorId);
    assert(publicDonor && publicDonor.phone.includes("****"), "5. Public directory masks donor telephone numbers for privacy", `Phone: ${publicDonor?.phone}`);

    // 6. Security Check: Unauthenticated availability update rejected (401)
    const unauthAvail = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/donors/${createdDonorId}/availability`, method: "PATCH",
        headers: { "Content-Type": "application/json" }
    }, { availability: "paused" });
    assert(unauthAvail.status === 401, "6. Unauthenticated availability update rejected (401)");

    // 7. Security Check: Modifying another donor's profile rejected (403)
    const forbiddenAvail = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/donors/${createdDonorId}/availability`, method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${otherToken}` }
    }, { availability: "paused" });
    assert(forbiddenAvail.status === 403, "7. Cross-user donor profile modification rejected (403)");

    // 8. Authorized Availability Update (200)
    const authAvail = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/donors/${createdDonorId}/availability`, method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${donorToken}` }
    }, { availability: "paused" });
    assert(authAvail.status === 200 && authAvail.data.declaredAvailability === "paused", "8. Authenticated donor updates availability to 'paused' (200)", JSON.stringify(authAvail.data));

    // 9. Record Donation (POST /api/donors/:id/donations)
    const donateRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/donors/${createdDonorId}/donations`, method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${donorToken}` }
    }, {
        donationDate: "2026-09-01",
        donationType: "Whole Blood",
        institutionName: "City Blood Center"
    });
    assert(donateRes.status === 201 && donateRes.data.donation.status === "self_reported", "9. Authenticated donor records donation history (201)", JSON.stringify(donateRes.data));

    // 10. Delete Profile (DELETE /api/donors/:id)
    const delRes = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/donors/${createdDonorId}`, method: "DELETE",
        headers: { "Authorization": `Bearer ${donorToken}` }
    });
    assert(delRes.status === 200 && delRes.data.success, "10. Authenticated donor deletes profile and records (200)", JSON.stringify(delRes.data));

    console.log("------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==========================================");

    if (failed > 0) process.exit(1);
}

runDonorTests().catch(err => {
    console.error("Donor test suite failed:", err);
    process.exit(1);
});
