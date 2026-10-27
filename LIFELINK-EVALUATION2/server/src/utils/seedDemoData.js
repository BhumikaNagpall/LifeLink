/* =====================================================
   LIFELINK - SYNTHETIC DEMONSTRATION SEED SCRIPT
   Populates clearly labeled synthetic healthcare scenarios
   for hospital and blood-bank partner demonstrations.
   ===================================================== */

const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const User = require("../models/User");
const DonorProfile = require("../models/DonorProfile");
const HospitalProfile = require("../models/HospitalProfile");
const BloodRequest = require("../models/BloodRequest");
const Invitation = require("../models/Invitation");
const DonationRecord = require("../models/DonationRecord");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

const seedDatabase = async () => {
    try {
        if (process.env.NODE_ENV === "production") {
            logger.error("FATAL: Synthetic demo seeding is strictly prohibited in production to prevent data loss.");
            process.exit(1);
        }

        const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifelink";
        const sanitizedURI = mongoURI.replace(/\/\/[^@]+@/, "//***:***@");
        logger.info(`Connecting to database for demo seeding: ${sanitizedURI}`);
        await mongoose.connect(mongoURI);

        logger.info("Purging existing demonstration records...");
        await Promise.all([
            User.deleteMany({}),
            DonorProfile.deleteMany({}),
            HospitalProfile.deleteMany({}),
            BloodRequest.deleteMany({}),
            Invitation.deleteMany({}),
            DonationRecord.deleteMany({}),
            Notification.deleteMany({}),
            AuditLog.deleteMany({})
        ]);

        logger.info("Seeding synthetic users and institutional accounts...");

        // 1. Platform Administrator
        const adminUser = new User({
            name: "Dr. Alok Verma [System Admin]",
            email: "admin@lifelink.internal",
            password: "AdminSecurePass123!",
            role: "admin",
            isActive: true
        });
        await adminUser.save();

        // 2. Authorized Hospital Partner
        const hospitalUser = new User({
            name: "Dr. Radhika Nair [Authorized Partner]",
            email: "hospital@citycare.org",
            password: "HospitalSecurePass123!",
            role: "hospital",
            isActive: true
        });
        await hospitalUser.save();

        const authorizedHospital = new HospitalProfile({
            user: hospitalUser._id,
            institutionName: "City Care Hospital & Blood Bank [Demo Partner]",
            registrationNumber: "REG-MH-HOSP-2024-998",
            hospitalType: "General Hospital",
            contactPhone: "+91 22 2890 1234",
            officialEmail: "hospital@citycare.org",
            zone: "Zone A",
            address: "Plot 104, Medical Enclave, Sector 12",
            verificationStatus: "authorized_institution",
            verifiedByAdmin: adminUser._id,
            verifiedAt: new Date(),
            isDemoAccount: false
        });
        await authorizedHospital.save();
        hospitalUser.hospitalProfile = authorizedHospital._id;
        await hospitalUser.save();

        // 3. Authorized Hospital Medical Officer (Dr. Jane Doe)
        const janeDoeUser = new User({
            name: "Dr. Jane Doe [Medical Officer]",
            email: "jane.doe@citycare.org",
            password: "JaneDoeSecure123!",
            role: "hospital",
            isActive: true
        });
        await janeDoeUser.save();

        const janeDoeProfile = new HospitalProfile({
            user: janeDoeUser._id,
            institutionName: "City Care Hospital & Blood Bank [Demo Partner]",
            registrationNumber: "REG-MH-HOSP-2024-998-MO",
            hospitalType: "General Hospital",
            contactPhone: "+91 22 2890 1235",
            officialEmail: "jane.doe@citycare.org",
            zone: "Zone A",
            address: "Plot 104, Medical Enclave, Sector 12",
            verificationStatus: "authorized_institution",
            verifiedByAdmin: adminUser._id,
            verifiedAt: new Date(),
            isDemoAccount: false
        });
        await janeDoeProfile.save();
        janeDoeUser.hospitalProfile = janeDoeProfile._id;
        await janeDoeUser.save();

        // 4. Unverified Demo Clinic
        const demoClinicUser = new User({
            name: "Staff Officer [Demo Clinic]",
            email: "clinic@metrocare.org",
            password: "ClinicSecurePass123!",
            role: "hospital",
            isActive: true
        });
        await demoClinicUser.save();

        const unverifiedHospital = new HospitalProfile({
            user: demoClinicUser._id,
            institutionName: "Metro Trauma Care [Unverified Demo]",
            registrationNumber: "PENDING-LIC-2026-004",
            hospitalType: "Trauma Center",
            contactPhone: "+91 22 2770 5678",
            officialEmail: "clinic@metrocare.org",
            zone: "Zone B",
            address: "Highway Junction 4",
            verificationStatus: "unverified_demo",
            isDemoAccount: true
        });
        await unverifiedHospital.save();
        demoClinicUser.hospitalProfile = unverifiedHospital._id;
        await demoClinicUser.save();

        logger.info("Seeding synthetic donor profiles with varied clinical attributes...");

        // Donors Data
        const donorDataList = [
            {
                name: "Aarav Sharma [Synthetic]",
                email: "aarav.donor@example.com",
                bloodGroup: "O-",
                age: 29,
                weight: 72,
                height: "178 cm",
                zone: "Zone A",
                phone: "+91 98201 11223",
                availability: "available",
                lastDonation: "2025-06-10" // > 90 days ago, clean cooldown
            },
            {
                name: "Priya Patel [Synthetic]",
                email: "priya.donor@example.com",
                bloodGroup: "A+",
                age: 25,
                weight: 56,
                height: "165 cm",
                zone: "Zone A",
                phone: "+91 98202 22334",
                availability: "available",
                lastDonation: "2025-08-15"
            },
            {
                name: "Vikram Malhotra [Synthetic]",
                email: "vikram.donor@example.com",
                bloodGroup: "B+",
                age: 34,
                weight: 78,
                height: "182 cm",
                zone: "Zone B",
                phone: "+91 98203 33445",
                availability: "available",
                lastDonation: "2025-04-20"
            },
            {
                name: "Neha Kulkarni [Synthetic]",
                email: "neha.donor@example.com",
                bloodGroup: "O+",
                age: 24,
                weight: 52,
                height: "160 cm",
                zone: "Zone C",
                phone: "+91 98204 44556",
                availability: "paused", // Paused state
                lastDonation: "2025-07-01"
            },
            {
                name: "Rohan Verma [Synthetic]",
                email: "rohan.donor@example.com",
                bloodGroup: "AB+",
                age: 38,
                weight: 84,
                height: "175 cm",
                zone: "Zone D",
                phone: "+91 98205 55667",
                availability: "available",
                lastDonation: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString() // 25 days ago -> Active Cooldown!
            },
            {
                name: "Meera Iyer [Synthetic]",
                email: "meera.donor@example.com",
                bloodGroup: "B-",
                age: 27,
                weight: 60,
                height: "168 cm",
                zone: "Zone A",
                phone: "+91 98206 66778",
                availability: "available",
                lastDonation: "2025-09-01"
            }
        ];

        const createdDonors = [];
        for (let i = 0; i < donorDataList.length; i++) {
            const d = donorDataList[i];
            const donorUser = new User({
                name: d.name,
                email: d.email,
                password: "DonorSecurePass123!",
                role: "donor",
                isActive: true
            });
            await donorUser.save();

            const donorProfile = new DonorProfile({
                user: donorUser._id,
                donorId: `DNR-2026-00${i + 1}`,
                name: d.name,
                phone: d.phone,
                bloodGroup: d.bloodGroup,
                bloodType: d.bloodGroup,
                age: d.age,
                weight: d.weight,
                height: d.height,
                zone: d.zone,
                declaredAvailability: d.availability,
                firstTime: "no",
                healthy: true,
                medicalCondition: false,
                lastDonationDate: new Date(d.lastDonation),
                profileVerificationStatus: i % 2 === 0 ? "verified_donor" : "self_reported",
                consentGiven: true
            });
            await donorProfile.save();
            donorUser.donorProfile = donorProfile._id;
            await donorUser.save();

            // Create past donation history record
            await DonationRecord.create({
                donorProfile: donorProfile._id,
                donorUser: donorUser._id,
                donationDate: new Date(d.lastDonation),
                donationType: "Whole Blood",
                institutionName: "Regional Blood Coordination Center",
                status: "verified"
            });

            createdDonors.push(donorProfile);
        }

        logger.info("Seeding synthetic clinical blood coordination requests...");

        // Request 1: Active Emergency Request (Coordinating)
        const req1 = new BloodRequest({
            requestId: "REQ-2026-EMERGENCY-01",
            requester: hospitalUser._id,
            hospitalProfile: authorizedHospital._id,
            hospitalName: authorizedHospital.institutionName,
            patientName: "Kavita Sen [Synthetic Patient]",
            requiredBloodGroup: "O-",
            requiredComponent: "Red Blood Cells",
            requestedUnits: 2,
            zone: "Zone A",
            location: "Zone A, Trauma OT-2",
            urgency: "Emergency",
            requiredByDate: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours from now
            description: "Critical emergency trauma surgery. Universal O- supply needed immediately.",
            status: "coordinating"
        });
        await req1.save();

        // Request 2: Urgent Request (Open)
        const req2 = new BloodRequest({
            requestId: "REQ-2026-URGENT-02",
            requester: hospitalUser._id,
            hospitalProfile: authorizedHospital._id,
            hospitalName: authorizedHospital.institutionName,
            patientName: "Rajesh Gupta [Synthetic Patient]",
            requiredBloodGroup: "A+",
            requiredComponent: "Whole Blood",
            requestedUnits: 1,
            zone: "Zone A",
            location: "Zone A, Ward 4B",
            urgency: "Urgent",
            requiredByDate: new Date(Date.now() + 48 * 3600 * 1000),
            description: "Scheduled hip replacement surgery scheduled for tomorrow.",
            status: "open"
        });
        await req2.save();

        // Request 3: Normal Request (Open)
        const req3 = new BloodRequest({
            requestId: "REQ-2026-NORMAL-03",
            requester: hospitalUser._id,
            hospitalProfile: authorizedHospital._id,
            hospitalName: authorizedHospital.institutionName,
            patientName: "Sunita Rao [Synthetic Patient]",
            requiredBloodGroup: "B+",
            requiredComponent: "Whole Blood",
            requestedUnits: 1,
            zone: "Zone B",
            location: "Zone B, Outpatient Dialysis",
            urgency: "Normal",
            requiredByDate: new Date(Date.now() + 72 * 3600 * 1000),
            description: "Routine scheduled therapeutic transfusion.",
            status: "open"
        });
        await req3.save();

        // Request 4: Fulfilled Request with Verified Outcome
        const req4 = new BloodRequest({
            requestId: "REQ-2026-FULFILLED-04",
            requester: hospitalUser._id,
            hospitalProfile: authorizedHospital._id,
            hospitalName: authorizedHospital.institutionName,
            patientName: "Amitabh Das [Synthetic Patient]",
            requiredBloodGroup: "O+",
            requiredComponent: "Whole Blood",
            requestedUnits: 2,
            zone: "Zone A",
            location: "Zone A, Surgical ICU",
            urgency: "Emergency",
            requiredByDate: new Date(Date.now() - 12 * 3600 * 1000),
            description: "Cardiac bypass emergency transfusion.",
            status: "fulfilled",
            outcomeVerification: {
                verified: true,
                verifiedBy: hospitalUser._id,
                verifiedAt: new Date(Date.now() - 8 * 3600 * 1000),
                unitsReceived: 2,
                clinicalNotes: "Crossmatch completed without agglutination. Transfusion completed safely."
            }
        });
        await req4.save();

        // Request 5: Expired Request Past Deadline
        const req5 = new BloodRequest({
            requestId: "REQ-2026-EXPIRED-05",
            requester: hospitalUser._id,
            hospitalProfile: authorizedHospital._id,
            hospitalName: authorizedHospital.institutionName,
            patientName: "Suresh Mehta [Synthetic Patient]",
            requiredBloodGroup: "AB+",
            requiredComponent: "Platelets",
            requestedUnits: 1,
            zone: "Zone D",
            urgency: "Normal",
            requiredByDate: new Date(Date.now() - 36 * 3600 * 1000), // 36 hours ago
            description: "Oncology platelet support.",
            status: "expired"
        });
        await req5.save();

        logger.info("Seeding realistic invitation scenarios (Accepted, Declined, Pending)...");

        // Invitation 1: Accepted by Aarav Sharma for Emergency Request
        const inv1 = new Invitation({
            invitationId: "INV-2026-001",
            bloodRequest: req1._id,
            donorProfile: createdDonors[0]._id, // Aarav (O-)
            donorUser: createdDonors[0].user,
            hospitalProfile: authorizedHospital._id,
            status: "accepted",
            matchScore: 95,
            matchReasons: ["Universal donor compatibility (O- → O-)", "Immediate Zone A proximity", "Emergency priority boost"],
            invitedAt: new Date(Date.now() - 3 * 3600 * 1000),
            respondedAt: new Date(Date.now() - 2 * 3600 * 1000),
            responseNote: "Willing to arrive at City Care Hospital OT reception by 11:30 AM."
        });
        await inv1.save();

        // Invitation 2: Pending response from Meera Iyer for Emergency Request
        const inv2 = new Invitation({
            invitationId: "INV-2026-002",
            bloodRequest: req1._id,
            donorProfile: createdDonors[5]._id, // Meera (B-)
            donorUser: createdDonors[5].user,
            hospitalProfile: authorizedHospital._id,
            status: "pending",
            matchScore: 85,
            matchReasons: ["Compatible biological candidate", "Zone A coverage"],
            invitedAt: new Date(Date.now() - 1 * 3600 * 1000)
        });
        await inv2.save();

        // Invitation 3: Declined by Vikram Malhotra for Request 3
        const inv3 = new Invitation({
            invitationId: "INV-2026-003",
            bloodRequest: req3._id,
            donorProfile: createdDonors[2]._id, // Vikram (B+)
            donorUser: createdDonors[2].user,
            hospitalProfile: authorizedHospital._id,
            status: "declined",
            matchScore: 95,
            matchReasons: ["Exact blood group match (B+ → B+)", "Zone B proximity"],
            invitedAt: new Date(Date.now() - 10 * 3600 * 1000),
            respondedAt: new Date(Date.now() - 6 * 3600 * 1000),
            responseNote: "Currently travelling out of station. Will be available next week."
        });
        await inv3.save();

        logger.info("Seeding audit logs and in-app notifications...");

        // Audit Logs
        await AuditLog.create([
            {
                action: "BLOOD_REQUEST_CREATED",
                performedBy: hospitalUser._id,
                performerEmail: hospitalUser.email,
                userRole: "hospital",
                targetEntity: "BloodRequest",
                targetId: req1.requestId,
                details: { urgency: "Emergency", requiredBloodGroup: "O-", units: 2 }
            },
            {
                action: "DONOR_INVITATION_ACCEPTED",
                performedBy: createdDonors[0].user,
                performerEmail: "aarav.donor@example.com",
                userRole: "donor",
                targetEntity: "Invitation",
                targetId: inv1.invitationId,
                details: { requestId: req1.requestId, note: inv1.responseNote }
            },
            {
                action: "BLOOD_REQUEST_FULFILLED_VERIFIED",
                performedBy: hospitalUser._id,
                performerEmail: hospitalUser.email,
                userRole: "hospital",
                targetEntity: "BloodRequest",
                targetId: req4.requestId,
                details: { unitsReceived: 2, clinicalNotes: req4.outcomeVerification.clinicalNotes }
            }
        ]);

        // Notifications
        await Notification.create([
            {
                recipient: hospitalUser._id,
                type: "invitation_response",
                title: "Invitation Accepted: Aarav Sharma [Synthetic]",
                message: "Donor accepted invitation for REQ-2026-EMERGENCY-01. Note: 'Willing to arrive at City Care Hospital OT reception by 11:30 AM.'",
                referenceId: inv1.invitationId,
                link: "#requests"
            },
            {
                recipient: createdDonors[0].user,
                type: "invitation_new",
                title: "Urgent Coordination Invitation: O- Red Blood Cells",
                message: "City Care Hospital & Blood Bank invited you to donate for an urgent request in Zone A.",
                referenceId: inv1.invitationId,
                link: "#inbox"
            }
        ]);

        logger.info("=================================================");
        logger.info("  Synthetic Demonstration Data Seeded Successfully!");
        logger.info("=================================================");
        logger.info("Demo Accounts Ready for Testing:");
        logger.info("1. Hospital (Authorized):  hospital@citycare.org    / HospitalSecurePass123!");
        logger.info("2. Hospital MO (Jane Doe): jane.doe@citycare.org    / JaneDoeSecure123!");
        logger.info("3. Hospital (Unverified):  clinic@metrocare.org     / ClinicSecurePass123!");
        logger.info("4. Admin User:             admin@lifelink.internal  / AdminSecurePass123!");
        logger.info("5. Donor (Universal O-):   aarav.donor@example.com  / DonorSecurePass123!");
        logger.info("6. Donor (Active A+):      priya.donor@example.com  / DonorSecurePass123!");
        logger.info("=================================================");

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        logger.error(`Seed script failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
};

seedDatabase();
