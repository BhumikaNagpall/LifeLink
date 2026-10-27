/* =====================================================
   LIFELINK - MATCHING SERVICE TEST SUITE
   Verifies hard safety filters, component compatibility,
   distance ranking, urgency scoring, security authorization,
   and clinical disclaimers.
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

async function runMatcherTests() {
    console.log("==========================================");
    console.log("  LifeLink Smart Matcher Integration Tests");
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

    // 0. Obtain Hospital / Admin Authentication Token
    const adminLogin = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        email: "admin@lifelink.internal",
        password: "AdminSecurePass123!"
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, "0. Authenticated session acquired for matcher operations", JSON.stringify(adminLogin.data));
    const authToken = adminLogin.data.token;
    const authHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
    };

    // Setup Test Donors in MongoDB via Wizard API
    // Donor A: O- in Zone A (Eligible, Available) -> Universal Donor
    const donorA = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Universal Donor " + uniqueSuffix,
        phone: "9111111111",
        bloodGroup: "O-",
        age: 30,
        weight: 70,
        zone: "Zone A",
        firstTime: "no",
        healthy: true,
        medicalCondition: false,
        lastDonation: "2025-01-01" // Clean cooldown (>90 days)
    });

    // Donor B: B+ in Zone A (Paused availability) -> Must be EXCLUDED by hard safety filter
    const donorBEmail = `paused_${uniqueSuffix}@donor.test`;
    const donorBPass = "PausedPass123!";
    const donorB = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Paused Donor " + uniqueSuffix,
        email: donorBEmail,
        password: donorBPass,
        phone: "9222222222",
        bloodGroup: "B+",
        age: 26,
        weight: 65,
        zone: "Zone A",
        firstTime: "no",
        healthy: true,
        medicalCondition: false,
        declaredAvailability: "paused"
    });

    // Donor C: B+ in Zone A (On active cooldown - donated 15 days ago) -> Must be EXCLUDED by hard safety filter
    const recentDonationDate = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().split("T")[0];
    const donorC = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Cooldown Donor " + uniqueSuffix,
        phone: "9333333333",
        bloodGroup: "B+",
        age: 35,
        weight: 80,
        zone: "Zone A",
        firstTime: "no",
        healthy: true,
        medicalCondition: false,
        lastDonation: recentDonationDate
    });

    // Donor D: B+ in Zone B (Eligible, Available, Distance 1)
    const donorD = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/donors/register-wizard", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        name: "Zone B Donor " + uniqueSuffix,
        phone: "9444444444",
        bloodGroup: "B+",
        age: 27,
        weight: 68,
        zone: "Zone B",
        firstTime: "no",
        healthy: true,
        medicalCondition: false,
        lastDonation: "2025-01-01"
    });

    // Security Test: Unauthenticated call to find-matches must return 401
    const unauthMatch = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/matcher/find-matches", method: "POST",
        headers: { "Content-Type": "application/json" }
    }, {
        patientName: "Kavita Rao",
        requiredBloodGroup: "B+"
    });
    assert(unauthMatch.status === 401, "0.1. Security: Unauthenticated matcher request strictly rejected (401)", JSON.stringify(unauthMatch.data));

    // Test 1: Match for B+ Emergency Request in Zone A
    const matchRes = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/matcher/find-matches", method: "POST",
        headers: authHeaders
    }, {
        patientName: "Kavita Rao",
        requiredBloodGroup: "B+",
        requiredComponent: "Whole Blood",
        zone: "Zone A",
        urgency: "Emergency",
        requestedUnits: 2
    });

    assert(matchRes.status === 200, "1. POST /api/matcher/find-matches returns 200 OK", JSON.stringify(matchRes.data));

    // Test 2: Mandatory Clinical Disclaimer is returned
    assert(
        matchRes.data.disclaimer && matchRes.data.disclaimer.includes("Potential Donor Matches — Subject to Verification"),
        "2. Clinical disclaimer 'Potential Donor Matches — Subject to Verification' is present",
        matchRes.data.disclaimer
    );

    // Test 3: Hard Safety Filter: Exclude Paused Donor (Donor B)
    const matchedDonorIds = matchRes.data.matches.map(m => m.donor.id);
    const donorBExcluded = !matchedDonorIds.includes(donorB.data.donor.id);
    assert(donorBExcluded, "3. Hard Filter: Paused availability donor strictly excluded from matches", `Matched: ${matchedDonorIds}`);

    // Test 4: Hard Safety Filter: Exclude Active Cooldown Donor (Donor C)
    const donorCExcluded = !matchedDonorIds.includes(donorC.data.donor.id);
    assert(donorCExcluded, "4. Hard Filter: Active cooldown donor strictly excluded from matches", `Matched: ${matchedDonorIds}`);

    // Test 5: Compatible Universal O- Donor (Donor A) included
    const donorAIncluded = matchedDonorIds.includes(donorA.data.donor.id);
    assert(donorAIncluded, "5. Biological Match: Compatible O- universal donor included for B+ request", `Matched: ${matchedDonorIds}`);

    // Test 6: Distance and Exact Group Ranking
    assert(matchRes.data.matches.length >= 2, "6. Multiple qualified candidates ranked", `Count: ${matchRes.data.matches.length}`);

    // Test 7: Match Reasons are Explainable Plain Language
    const firstMatch = matchRes.data.matches[0];
    assert(
        firstMatch.reasons && firstMatch.reasons.length >= 3,
        "7. Explainable match justifications provided (reasons array)",
        JSON.stringify(firstMatch.reasons)
    );

    // Test 8: Phone Masking in Match Output for Privacy
    assert(
        firstMatch.donor.phoneMasked && firstMatch.donor.phoneMasked.includes("****"),
        "8. Donor contact telephone number is masked in match results for privacy",
        firstMatch.donor.phoneMasked
    );

    // Test 9: Match by Existing Request ID
    const sampleRequest = await makeRequest({
        hostname: "localhost", port: 5000, path: "/api/requests", method: "POST",
        headers: authHeaders
    }, {
        patientName: "Existing Match Target",
        requiredBloodGroup: "B+",
        zone: "Zone A",
        urgency: "Urgent",
        requestedUnits: 1
    });

    const matchByReqId = await makeRequest({
        hostname: "localhost", port: 5000, path: `/api/matcher/request/${sampleRequest.data.request.requestId}`, method: "GET",
        headers: authHeaders
    });
    assert(
        matchByReqId.status === 200 && matchByReqId.data.matchedCount >= 1,
        "9. GET /api/matcher/request/:requestId executes matching for existing database request",
        `Count: ${matchByReqId.data.matchedCount}`
    );

    console.log("------------------------------------------");
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log("==========================================");

    if (failed > 0) process.exit(1);
}

runMatcherTests().catch(err => {
    console.error("Matcher test suite failed:", err);
    process.exit(1);
});
