/* =====================================================
   LIFELINK - DATABASE RESTORATION UTILITY
   Restores collections from a structured JSON backup snapshot
   Usage: npm run db:restore [optional-backup-directory-name]
   ===================================================== */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifelink";

async function performRestore(targetDirName) {
    console.log("==========================================");
    console.log("  LifeLink Database Restore Utility");
    console.log("==========================================");

    try {
        const backupsBaseDir = path.resolve(__dirname, "../../backups");
        if (!fs.existsSync(backupsBaseDir)) {
            throw new Error(`Backups directory not found at: ${backupsBaseDir}`);
        }

        let selectedDir = null;
        if (targetDirName) {
            selectedDir = path.join(backupsBaseDir, targetDirName);
        } else {
            // Find latest backup directory
            const dirs = fs.readdirSync(backupsBaseDir)
                .filter(d => d.startsWith("backup-") && fs.statSync(path.join(backupsBaseDir, d)).isDirectory())
                .sort()
                .reverse();

            if (dirs.length === 0) {
                throw new Error("No backup directories found in server/backups.");
            }
            selectedDir = path.join(backupsBaseDir, dirs[0]);
        }

        if (!fs.existsSync(selectedDir)) {
            throw new Error(`Target backup directory does not exist: ${selectedDir}`);
        }

        console.log(`Using backup snapshot: ${selectedDir}`);

        const manifestPath = path.join(selectedDir, "manifest.json");
        if (!fs.existsSync(manifestPath)) {
            throw new Error("Snapshot manifest.json missing from backup folder.");
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        console.log(`Snapshot Date: ${manifest.createdAt}, Collections: ${manifest.totalCollections}`);

        const sanitizedUri = MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@");
        console.log(`Connecting to MongoDB at: ${sanitizedUri}...`);
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully.");

        for (const [colName, colMeta] of Object.entries(manifest.collections)) {
            const dataFile = path.join(selectedDir, colMeta.file);
            if (!fs.existsSync(dataFile)) {
                console.warn(`[WARN] Data file missing for collection '${colName}'. Skipping.`);
                continue;
            }

            const rawData = fs.readFileSync(dataFile, "utf8");
            const documents = JSON.parse(rawData);

            if (documents.length === 0) {
                console.log(`[RESTORE] ${colName}: 0 records to restore.`);
                continue;
            }

            const collection = mongoose.connection.db.collection(colName);

            // Upsert documents by _id to preserve relationships
            let restoredCount = 0;
            for (const doc of documents) {
                if (doc._id) {
                    const id = typeof doc._id === "string" ? new mongoose.Types.ObjectId(doc._id) : doc._id;
                    const docToInsert = { ...doc, _id: id };
                    await collection.replaceOne({ _id: id }, docToInsert, { upsert: true });
                    restoredCount++;
                }
            }

            console.log(`[RESTORE] Restored ${colName}: ${restoredCount} records.`);
        }

        console.log("------------------------------------------");
        console.log("Database restoration completed successfully!");
        console.log("==========================================");

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Restoration failed with error:", error.message);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

if (require.main === module) {
    const target = process.argv[2] || null;
    performRestore(target);
}

module.exports = { performRestore };
