const { Worker } = require("bullmq");
const { Upload } = require("@aws-sdk/lib-storage");
const Redis = require("ioredis");
const s3Client = require("../config/s3");
const { getAppFileStream } = require("../services/graphAdmin");
const Admin = require("../models/Admin");
const DriveFile = require("../models/DriveFile");
const ExportJob = require("../models/ExportJob");

const CONCURRENCY = 3;

const workerConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

function slugify(str) {
  return (str || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function updateJob(jobId, patch) {
  await ExportJob.findByIdAndUpdate(jobId, { $set: patch });
}

async function uploadFile(file, creds, adminSlug, jobId) {
  const stream = await getAppFileStream(creds, file.userId, file.graphItemId);
  const pathSegment = file.path ? `${file.path}/` : "";
  const s3Key = `exports/${adminSlug}/${slugify(file.userEmail)}/${pathSegment}${file.name}`;

  await DriveFile.findByIdAndUpdate(file._id, { uploadStatus: "uploading" });

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: stream,
      ContentType: file.mimeType,
      Metadata: {
        "original-name": encodeURIComponent(file.name),
        "user-email": file.userEmail || "",
        "export-job-id": jobId,
      },
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024,
  });

  await upload.done();
  await DriveFile.findByIdAndUpdate(file._id, {
    uploadStatus: "uploaded",
    s3Key,
    exportJobId: jobId,
  });

  console.log(`[UploadWorker] ✓ ${s3Key}`);
  return s3Key;
}

async function processUpload(job) {
  const { jobId, adminId } = job.data;

  const admin = await Admin.findById(adminId).lean();
  if (!admin) throw new Error(`Admin ${adminId} not found`);

  const creds = { clientId: admin.clientId, clientSecret: admin.clientSecret, tenantId: admin.tenantId };
  const adminSlug = slugify(admin.displayName || admin.email);

  console.log(`[UploadWorker] Starting upload job ${jobId} for ${admin.email}`);
  await updateJob(jobId, { status: "processing", startedAt: new Date() });

  const files = await DriveFile.find({ adminId, s3Key: null, uploadStatus: { $ne: "uploading" } }).lean();
  await updateJob(jobId, { totalFiles: files.length });

  if (files.length === 0) {
    await updateJob(jobId, { status: "completed", completedAt: new Date() });
    return;
  }

  let processedFiles = 0;
  let failedFiles = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map((file) => uploadFile(file, creds, adminSlug, jobId))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        processedFiles++;
      } else {
        failedFiles++;
        const errMsg = results[j].reason?.message || "unknown error";
        console.error(`[UploadWorker] ✗ "${batch[j].name}": ${errMsg}`);
        await DriveFile.findByIdAndUpdate(batch[j]._id, {
          uploadStatus: "failed",
          uploadError: errMsg,
        });
      }
    }

    const currentFile = batch[batch.length - 1]?.name ?? null;
    await updateJob(jobId, { processedFiles, failedFiles, currentFile });
    await job.updateProgress(
      Math.round(((processedFiles + failedFiles) / files.length) * 100)
    );
  }

  const finalStatus = failedFiles === files.length ? "failed" : "completed";
  await updateJob(jobId, {
    status: finalStatus,
    currentFile: null,
    completedAt: new Date(),
    error: failedFiles > 0 ? `${failedFiles} file(s) failed` : null,
  });

  console.log(`[UploadWorker] Done — ${processedFiles} ok, ${failedFiles} failed`);
}

const uploadWorker = new Worker("admin-upload", processUpload, {
  connection: workerConnection,
  concurrency: 1,
});

uploadWorker.on("failed", async (job, err) => {
  console.error(`[UploadWorker] Job ${job?.id} failed:`, err.message);
  if (job?.data?.jobId) {
    await updateJob(job.data.jobId, {
      status: "failed",
      error: err.message,
      completedAt: new Date(),
    });
  }
});

module.exports = uploadWorker;
