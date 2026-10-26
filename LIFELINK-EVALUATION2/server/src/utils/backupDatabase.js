/* =====================================================
   LIFELINK - DATABASE BACKUP UTILITY
   Creates structured JSON snapshots of all application collections
   with integrity manifests, record counts, and timestamps.
   Usage: npm run db:backup
   ===================================================== */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifelink";

async function performBackup() {
    console.log("==========================================");
    console.log("  LifeLink Database Backup Utility");
    console.log("==========================================");

    try {
        const sanitizedUri = MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@");
        console.log(`Connecting to MongoDB at: ${sanitizedUri}...`);
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully.");

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupDir = path.resolve(__dirname, "../../backups", `backup-${timestamp}`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name).filter(name => !name.startsWith("system."));

        const manifest = {
            version: "2.0.0",
            createdAt: new Date().toISOString(),
            databaseName: mongoose.connection.name,
            totalCollections: collectionNames.length,
            collections: {}
        };

        for (const name of collectionNames) {
            const data = await mongoose.connection.db.collection(name).find({}).toArray();

            // Strip reset tokens from backups for security while preserving bcrypt password hashes
            const backupData = name === "users"
                ? data.map(doc => {
                    const copy = { ...doc };
                    delete copy.resetPasswordToken;
                    delete copy.resetPasswordExpires;
                    return copy;
                })
                : data;

            const filePath = path.join(backupDir, `${name}.json`);
            fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf8");

            manifest.collections[name] = {
                count: backupData.length,
                file: `${name}.json`
            };

            console.log(`[BACKUP] Exported ${name}: ${backupData.length} records -> ${name}.json`);
        }

        // Save manifest
        fs.writeFileSync(
            path.join(backupDir, "manifest.json"),
            JSON.stringify(manifest, null, 2),
            "utf8"
        );

        console.log("------------------------------------------");
        console.log(`Backup completed successfully!`);
        console.log(`Location: ${backupDir}`);
        console.log("==========================================");

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Backup failed with error:", error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

if (require.main === module) {
    performBackup();
}

module.exports = { performBackup };
