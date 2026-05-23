const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const TenantUser = require("../models/TenantUser");
const DriveFile = require("../models/DriveFile");
const ExportJob = require("../models/ExportJob");
const { fetchQueue, uploadQueue } = require("../queues/adminQueues");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Safety-net TTLs — primary invalidation is change-based (done by worker)
const GQL_USERS_TTL   = 3600; // 1 hour fallback
const GQL_FILES_TTL   = 3600; // 1 hour fallback

function gqlUsersKey(adminId)          { return `admin:${adminId}:gql:tenantUsers`; }
function gqlUserFilesKey(adminId, uid) { return `admin:${adminId}:gql:userFiles:${uid}`; }

function signToken(adminId) {
  return jwt.sign({ adminId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function formatAdmin(a) {
  return {
    id: a._id.toString(),
    email: a.email,
    displayName: a.displayName,
    organization: a.organization || "",
    clientId: a.clientId,
    tenantId: a.tenantId,
    createdAt: a.createdAt?.toISOString() || null,
  };
}

function requireAuth(context) {
  if (!context.adminId) throw new Error("Unauthorized");
  return context.adminId;
}

const resolvers = {
  Query: {
    me: async (_p, _a, context) => {
      if (!context.adminId) return null;
      const admin = await Admin.findById(context.adminId).lean();
      return admin ? formatAdmin(admin) : null;
    },

    tenantUsers: async (_p, _a, context) => {
      const adminId = requireAuth(context);
      const cacheKey = gqlUsersKey(adminId);

      // Redis read-through cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[Redis] HIT ${cacheKey}`);
        return JSON.parse(cached);
      }

      console.log(`[Redis] MISS ${cacheKey} — querying MongoDB`);
      const users = await TenantUser.find({ adminId }).sort({ displayName: 1 }).lean();
      const counts = await DriveFile.aggregate([
        { $match: { adminId: mongoose.Types.ObjectId.createFromHexString(adminId.toString()) } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]);
      const countMap = {};
      for (const c of counts) countMap[c._id] = c.count;
      const result = users.map((u) => ({ ...u, fileCount: countMap[u.azureId] || 0 }));

      if (result.length > 0) {
        await redis.set(cacheKey, JSON.stringify(result), "EX", GQL_USERS_TTL);
        console.log(`[Redis] Cached ${result.length} users for admin ${adminId}`);
      }
      return result;
    },

    tenantUserFiles: async (_p, { userId }, context) => {
      const adminId = requireAuth(context);
      const cacheKey = gqlUserFilesKey(adminId, userId);

      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`[Redis] HIT ${cacheKey}`);
        return JSON.parse(cached);
      }

      console.log(`[Redis] MISS ${cacheKey} — querying MongoDB`);
      const files = await DriveFile.find({ userId, adminId }).sort({ name: 1 }).lean();
      const result = files.map((f) => ({ ...f, id: f._id.toString() }));

      if (result.length > 0) {
        await redis.set(cacheKey, JSON.stringify(result), "EX", GQL_FILES_TTL);
      }
      return result;
    },

    adminJobs: async (_p, _a, context) => {
      const adminId = requireAuth(context);
      const jobs = await ExportJob.find({ adminId }).sort({ createdAt: -1 }).limit(50).lean();
      return jobs.map((j) => ({
        ...j,
        id: j._id,
        startedAt: j.startedAt?.toISOString() || null,
        completedAt: j.completedAt?.toISOString() || null,
        createdAt: j.createdAt?.toISOString() || null,
      }));
    },

    adminJob: async (_p, { jobId }, context) => {
      const adminId = requireAuth(context);
      const j = await ExportJob.findOne({ _id: jobId, adminId }).lean();
      if (!j) return null;
      return {
        ...j,
        id: j._id,
        startedAt: j.startedAt?.toISOString() || null,
        completedAt: j.completedAt?.toISOString() || null,
        createdAt: j.createdAt?.toISOString() || null,
      };
    },
  },

  Mutation: {
    register: async (_p, { input }) => {
      const existing = await Admin.findOne({ email: input.email.toLowerCase() });
      if (existing) throw new Error("Email already registered");
      const admin = await Admin.create(input);
      return { token: signToken(admin._id), admin: formatAdmin(admin) };
    },

    login: async (_p, { email, password }) => {
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) throw new Error("Invalid email or password");
      const valid = await admin.verifyPassword(password);
      if (!valid) throw new Error("Invalid email or password");
      return { token: signToken(admin._id), admin: formatAdmin(admin) };
    },

    startFetchJob: async (_p, _a, context) => {
      const adminId = requireAuth(context);
      const admin = await Admin.findById(adminId).lean();
      const jobId = uuidv4();
      await ExportJob.create({
        _id: jobId,
        type: "fetch",
        status: "queued",
        triggeredBy: admin.email,
        adminDisplayName: admin.displayName,
        adminId,
      });
      await fetchQueue.add("fetch-tenant-data", { jobId, adminId: adminId.toString() });
      return { jobId, message: "Fetch job queued" };
    },

    startUploadJob: async (_p, _a, context) => {
      const adminId = requireAuth(context);
      const admin = await Admin.findById(adminId).lean();
      const jobId = uuidv4();
      await ExportJob.create({
        _id: jobId,
        type: "upload",
        status: "queued",
        triggeredBy: admin.email,
        adminDisplayName: admin.displayName,
        adminId,
      });
      await uploadQueue.add("upload-to-s3", { jobId, adminId: adminId.toString() });
      return { jobId, message: "Upload job queued" };
    },

    invalidateCache: async (_p, _a, context) => {
      const adminId = requireAuth(context);
      const keys = await redis.keys(`admin:${adminId}:*`);
      if (keys.length > 0) await redis.del(...keys);
      console.log(`[Redis] Cleared ${keys.length} key(s) for admin ${adminId}`);
      return true;
    },
  },
};

module.exports = resolvers;
