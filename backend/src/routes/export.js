const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { exportQueue } = require("../queues/exportQueue");
const { getUserInfo } = require("../services/onedrive");
const redis = require("../config/redis");

const STATUS_TTL = 60 * 60 * 24 * 7;

function getToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// POST /api/export/start
// Body (optional): { selectedFiles: [{ id, name, path, mimeType, size }] }
// If selectedFiles is omitted or empty → export all files
router.post("/start", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Missing access token" });

  const { selectedFiles } = req.body || {};
  const isSelective = Array.isArray(selectedFiles) && selectedFiles.length > 0;

  try {
    const user = await getUserInfo(token);
    const exportId = uuidv4();

    const initialStatus = {
      status: "pending",
      exportId,
      mode: isSelective ? "selected" : "all",
      userId: user.id,
      userEmail: user.mail || user.userPrincipalName,
      displayName: user.displayName,
      createdAt: Date.now(),
      totalFiles: isSelective ? selectedFiles.length : 0,
      processedFiles: 0,
      failedFiles: 0,
      currentFile: null,
      error: null,
    };

    await redis.set(
      `export:status:${exportId}`,
      JSON.stringify(initialStatus),
      "EX",
      STATUS_TTL
    );

    const job = await exportQueue.add(
      "export-onedrive",
      {
        accessToken: token,
        userId: user.id,
        userEmail: user.mail || user.userPrincipalName,
        exportId,
        selectedFiles: isSelective ? selectedFiles : null,
      },
      { jobId: exportId }
    );

    const modeLabel = isSelective ? `${selectedFiles.length} selected file(s)` : "all files";
    console.log(`[Export] Queued job ${job.id} for ${user.displayName} — ${modeLabel}`);
    res.json({ exportId, jobId: job.id, status: "pending", mode: initialStatus.mode });
  } catch (err) {
    console.error("[Export] Start error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/status/:exportId
router.get("/status/:exportId", async (req, res) => {
  const { exportId } = req.params;
  try {
    const raw = await redis.get(`export:status:${exportId}`);
    if (!raw) return res.status(404).json({ error: "Export not found" });
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/history
router.get("/history", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Missing access token" });

  try {
    const user = await getUserInfo(token);
    const keys = await redis.keys("export:status:*");

    const exports = [];
    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (data.userId === user.id) exports.push(data);
    }

    exports.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ exports: exports.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
