const axios = require("axios");

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function getUserInfo(accessToken) {
  const res = await axios.get(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

async function listAllFiles(accessToken, itemId = "root", basePath = "") {
  const url =
    itemId === "root"
      ? `${GRAPH_BASE}/me/drive/root/children`
      : `${GRAPH_BASE}/me/drive/items/${itemId}/children`;

  const allFiles = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await axios.get(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: nextUrl === url ? { $top: 200 } : undefined,
    });

    const { value, "@odata.nextLink": nextLink } = res.data;

    for (const item of value) {
      if (item.folder) {
        // Regular folder — recurse into it
        const folderPath = basePath ? `${basePath}/${item.name}` : item.name;
        const subFiles = await listAllFiles(accessToken, item.id, folderPath);
        allFiles.push(...subFiles);
      } else if (item.file) {
        // Only push actual files (items with file metadata)
        // Skips Personal Vault, remoteItems, packages, etc.
        allFiles.push({
          id: item.id,
          name: item.name,
          size: item.size || 0,
          path: basePath,
          mimeType: item.file.mimeType || "application/octet-stream",
          lastModified: item.lastModifiedDateTime,
        });
      }
    }

    nextUrl = nextLink || null;
  }

  return allFiles;
}

// Returns a readable stream — caller pipes it directly to S3 (no full buffer in memory)
async function getFileStream(accessToken, fileId) {
  const res = await axios.get(
    `${GRAPH_BASE}/me/drive/items/${fileId}/content`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "stream",
    }
  );
  return res.data;
}

module.exports = { getUserInfo, listAllFiles, getFileStream };
