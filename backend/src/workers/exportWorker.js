const { Worker } = require("bullmq");
const { Upload } = require("@aws-sdk/lib-storage");
const Redis = require("ioredis");
const s3Client = require("../config/s3");
const { listAllFiles, getFileStream } = require("../services/onedrive");

const STATUS_TTL = 60 * 60 * 24 * 7;
const CONCURRENCY = 3; // files uploaded in parallel at a time

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

async function setStatus(exportId, patch) {
  const key = `export:status:${exportId}`;
  const existing = await stateRedis.get(key);
  const current = existing ? JSON.parse(existing) : {};
  await stateRedis.set(
    key,
    JSON.stringify({ ...current, ...patch }),
    "EX",
    STATUS_TTL
  );
}

// Stream a single file from OneDrive directly into S3 (no full buffer in memory)
async function streamFileToS3(accessToken, file, userId, userEmail, exportId) {
  const stream = await getFileStream(accessToken, file.id);
  const pathSegment = file.path ? `${file.path}/` : "";
  const s3Key = `exports/${userId}/${pathSegment}${file.name}`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: stream,
      ContentType: file.mimeType,
      Metadata: {
        "original-name": encodeURIComponent(file.name),
        "user-email": userEmail,
        "export-id": exportId,
      },
    },
    queueSize: 4,           // parallel parts per file for multipart upload
    partSize: 5 * 1024 * 1024, // 5 MB per part
  });

  await upload.done();
  console.log(`[Worker] ✓ ${s3Key}`);
  return s3Key;
}

async function processExport(job) {
  const { accessToken, userId, userEmail, exportId, selectedFiles } = job.data;
  const isSelective = Array.isArray(selectedFiles) && selectedFiles.length > 0;

  console.log(
    `[Worker] Starting export ${exportId} for ${userEmail} — mode: ${isSelective ? "selected" : "all"}`
  );

  await setStatus(exportId, {
    status: "processing",
    startedAt: Date.now(),
    processedFiles: 0,
    failedFiles: 0,
    currentFile: null,
    error: null,
  });

  // Resolve file list
  let files;
  if (isSelective) {
    files = selectedFiles;
    console.log(`[Worker] ${files.length} selected file(s)`);
  } else {
    try {
      files = await listAllFiles(accessToken);
      console.log(`[Worker] Found ${files.length} file(s)`);
    } catch (err) {
      await setStatus(exportId, {
        status: "failed",
        error: `Failed to list OneDrive files: ${err.message}`,
        completedAt: Date.now(),
      });
      throw err;
    }
  }

  await setStatus(exportId, { totalFiles: files.length });

  if (files.length === 0) {
    await setStatus(exportId, { status: "completed", completedAt: Date.now() });
    return;
  }

  let processedFiles = 0;
  let failedFiles = 0;

  // Process in batches of CONCURRENCY — parallel within each batch
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map((file) => streamFileToS3(accessToken, file, userId, userEmail, exportId))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        processedFiles++;
      } else {
        failedFiles++;
        console.error(
          `[Worker] ✗ "${batch[j].name}": ${results[j].reason?.message}`
        );
      }
    }

    // Update progress after each batch
    const currentFile = batch[batch.length - 1]?.name ?? null;
    await setStatus(exportId, { processedFiles, failedFiles, currentFile });
    await job.updateProgress(
      Math.round(((processedFiles + failedFiles) / files.length) * 100)
    );
  }

  const finalStatus = failedFiles === files.length ? "failed" : "completed";
  await setStatus(exportId, {
    status: finalStatus,
    currentFile: null,
    completedAt: Date.now(),
    error: failedFiles > 0 ? `${failedFiles} file(s) failed to upload` : null,
  });

  console.log(`[Worker] Export ${exportId} done — ${processedFiles} ok, ${failedFiles} failed`);
}

const exportWorker = new Worker("onedrive-exports", processExport, {
  connection: workerConnection,
  concurrency: 2, // max parallel export jobs
});

exportWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

exportWorker.on("failed", async (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  if (job?.data?.exportId) {
    await setStatus(job.data.exportId, {
      status: "failed",
      error: err.message,
      completedAt: Date.now(),
    });
  }
});

module.exports = exportWorker;
