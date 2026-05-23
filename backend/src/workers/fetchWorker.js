const { Worker } = require("bullmq");
const Redis = require("ioredis");
const { listAllTenantUsers, listUserFiles } = require("../services/graphAdmin");
const Admin = require("../models/Admin");
const TenantUser = require("../models/TenantUser");
const DriveFile = require("../models/DriveFile");
const ExportJob = require("../models/ExportJob");

const GRAPH_USERS_TTL = 300;  // Graph API call cache — 5 min
const GRAPH_FILES_TTL = 300;

const workerConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

const stateRedis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

async function updateJob(jobId, patch) {
  await ExportJob.findByIdAndUpdate(jobId, { $set: patch });
}

// Returns true if the two user objects differ on meaningful fields
function userChanged(prev, next) {
  if (!prev) return true; // new record
  return (
    prev.displayName !== next.displayName ||
    prev.email !== next.email ||
    prev.accountEnabled !== next.accountEnabled ||
    prev.jobTitle !== next.jobTitle ||
    prev.department !== next.department
  );
}

// Returns true if the two file objects differ on meaningful fields
function fileChanged(prev, next) {
  if (!prev) return true; // new record
  return (
    prev.name !== next.name ||
    prev.size !== next.size ||
    prev.path !== next.path ||
    String(prev.lastModified) !== String(next.lastModified)
  );
}

async function processFetch(job) {
  const { jobId, adminId } = job.data;

  const admin = await Admin.findById(adminId).lean();
  if (!admin) throw new Error(`Admin ${adminId} not found`);

  const creds = { clientId: admin.clientId, clientSecret: admin.clientSecret, tenantId: admin.tenantId };
  console.log(`[FetchWorker] Starting fetch job ${jobId} for ${admin.email}`);

  await updateJob(jobId, { status: "processing", startedAt: new Date() });

  // ── Step 1: Fetch tenant users (Graph API cache) ──────────────────────────
  let users;
  const graphUsersCacheKey = `admin:${adminId}:graphUsers`;
  const cachedUsers = await stateRedis.get(graphUsersCacheKey);

  if (cachedUsers) {
    users = JSON.parse(cachedUsers);
    console.log(`[FetchWorker] Graph users from cache: ${users.length}`);
  } else {
    users = await listAllTenantUsers(creds);
    await stateRedis.set(graphUsersCacheKey, JSON.stringify(users), "EX", GRAPH_USERS_TTL);
    console.log(`[FetchWorker] Fetched ${users.length} users from Graph API`);
  }

  await updateJob(jobId, { totalUsers: users.length });

  // ── Step 2: Upsert users — track what actually changed ───────────────────
  let anyUserChanged = false;
  const usersWithFileCounts = new Set(); // userIds where file count may change

  for (const u of users) {
    const prev = await TenantUser.findOne({ azureId: u.azureId, adminId }).lean();
    await TenantUser.findOneAndUpdate(
      { azureId: u.azureId, adminId },
      { ...u, adminId, fetchedAt: new Date() },
      { upsert: true }
    );
    if (userChanged(prev, u)) {
      anyUserChanged = true;
      console.log(`[FetchWorker] User changed: ${u.email}`);
    }
  }

  // ── Step 3: Fetch + upsert files per user — track changed users ──────────
  let totalFiles = 0;
  let processedUsers = 0;
  const usersWithChangedFiles = new Set(); // azureIds whose file data changed

  for (const user of users) {
    await updateJob(jobId, { currentUser: user.email || user.userPrincipalName, processedUsers });

    try {
      // Graph API file list cache (avoids re-hitting Graph on repeat runs)
      const graphFilesCacheKey = `admin:${adminId}:graphFiles:${user.azureId}`;
      let files;
      const cachedFiles = await stateRedis.get(graphFilesCacheKey);

      if (cachedFiles) {
        files = JSON.parse(cachedFiles);
      } else {
        files = await listUserFiles(creds, user.azureId);
        await stateRedis.set(graphFilesCacheKey, JSON.stringify(files), "EX", GRAPH_FILES_TTL);
      }

      for (const f of files) {
        const prev = await DriveFile.findOne({ graphItemId: f.graphItemId, userId: user.azureId, adminId }).lean();
        await DriveFile.findOneAndUpdate(
          { graphItemId: f.graphItemId, userId: user.azureId, adminId },
          { ...f, userId: user.azureId, userEmail: user.email || user.userPrincipalName, fetchJobId: jobId, adminId },
          { upsert: true }
        );
        if (fileChanged(prev, f)) {
          usersWithChangedFiles.add(user.azureId);
        }
      }

      // File count changed (new files added) → users table cache must refresh too
      const dbCount = await DriveFile.countDocuments({ userId: user.azureId, adminId });
      if (dbCount !== files.length) usersWithFileCounts.add(user.azureId);

      totalFiles += files.length;
    } catch (err) {
      console.error(`[FetchWorker] Failed for ${user.email}: ${err.message}`);
    }

    processedUsers++;
    await updateJob(jobId, { processedUsers, totalFiles });
    await job.updateProgress(Math.round((processedUsers / users.length) * 100));
  }

  await updateJob(jobId, {
    status: "completed",
    currentUser: null,
    processedUsers,
    totalFiles,
    completedAt: new Date(),
  });

  // ── Step 4: Selective cache invalidation ─────────────────────────────────
  const needsUsersRefresh = anyUserChanged || usersWithChangedFiles.size > 0 || usersWithFileCounts.size > 0;

  if (needsUsersRefresh) {
    await stateRedis.del(`admin:${adminId}:gql:tenantUsers`);
    console.log(`[FetchWorker] Invalidated tenantUsers cache (${usersWithChangedFiles.size} user(s) had file changes, userChanged=${anyUserChanged})`);
  } else {
    console.log(`[FetchWorker] No changes detected — tenantUsers cache kept intact`);
  }

  // Invalidate per-user file caches only for users whose files changed
  for (const azureId of usersWithChangedFiles) {
    await stateRedis.del(`admin:${adminId}:gql:userFiles:${azureId}`);
    console.log(`[FetchWorker] Invalidated file cache for user ${azureId}`);
  }

  console.log(`[FetchWorker] Done — ${processedUsers} users, ${totalFiles} files`);
}

const fetchWorker = new Worker("admin-fetch", processFetch, {
  connection: workerConnection,
  concurrency: 1,
});

fetchWorker.on("failed", async (job, err) => {
  console.error(`[FetchWorker] Job ${job?.id} failed:`, err.message);
  if (job?.data?.jobId) {
    await updateJob(job.data.jobId, {
      status: "failed",
      error: err.message,
      completedAt: new Date(),
    });
  }
});

module.exports = fetchWorker;
