const mongoose = require("mongoose");

let isConnected = false;

async function connectMongo() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
  console.log("[MongoDB] Connected");
  await dropStaleIndexes();
}

async function dropStaleIndexes() {
  try {
    const db = mongoose.connection.db;

    // Drop old global-unique azureId index — replaced by compound (azureId + adminId)
    const tenantUsers = db.collection("tenantusers");
    const indexes = await tenantUsers.indexes();
    const stale = indexes.find((idx) => idx.name === "azureId_1");
    if (stale) {
      await tenantUsers.dropIndex("azureId_1");
      console.log("[MongoDB] Dropped stale index: tenantusers.azureId_1");
    }

    // Same cleanup for drivefiles if old compound index exists without adminId
    const driveFiles = db.collection("drivefiles");
    const dfIndexes = await driveFiles.indexes();
    const staleDF = dfIndexes.find((idx) => idx.name === "graphItemId_1_userId_1");
    if (staleDF) {
      await driveFiles.dropIndex("graphItemId_1_userId_1");
      console.log("[MongoDB] Dropped stale index: drivefiles.graphItemId_1_userId_1");
    }
  } catch (err) {
    console.warn("[MongoDB] Index cleanup warning:", err.message);
  }
}

module.exports = { connectMongo };
