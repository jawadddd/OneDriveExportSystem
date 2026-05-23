const router = require("express").Router();
const { listAllFiles, getUserInfo } = require("../services/onedrive");
const redis = require("../config/redis");

function getToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// GET /api/files — list OneDrive files (cached 5 min per user)
router.get("/", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Missing access token" });

  try {
    const user = await getUserInfo(token);
    const cacheKey = `files:${user.id}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ files: JSON.parse(cached), cached: true, user });
    }

    const files = await listAllFiles(token);
    await redis.set(cacheKey, JSON.stringify(files), "EX", 300);

    res.json({ files, cached: false, user });
  } catch (err) {
    console.error("[Files] Error:", err.message);
    console.error("[Files] Graph response:", JSON.stringify(err.response?.data));
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message, details: err.response?.data });
  }
});

module.exports = router;
