const axios = require("axios");
const { ClientSecretCredential } = require("@azure/identity");

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function getAccessToken({ clientId, clientSecret, tenantId }) {
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const token = await credential.getToken("https://graph.microsoft.com/.default");
  return token.token;
}

async function listAllTenantUsers(creds) {
  const token = await getAccessToken(creds);
  const headers = { Authorization: `Bearer ${token}` };
  const users = [];
  let url = `${GRAPH_BASE}/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled&$top=100`;

  while (url) {
    const res = await axios.get(url, { headers });
    for (const u of res.data.value) {
      users.push({
        azureId: u.id,
        displayName: u.displayName,
        email: u.mail || u.userPrincipalName,
        userPrincipalName: u.userPrincipalName,
        jobTitle: u.jobTitle || null,
        department: u.department || null,
        accountEnabled: u.accountEnabled,
      });
    }
    url = res.data["@odata.nextLink"] || null;
  }

  return users;
}

async function listUserFiles(creds, userId, itemId = "root", basePath = "") {
  const token = await getAccessToken(creds);
  const headers = { Authorization: `Bearer ${token}` };
  const url =
    itemId === "root"
      ? `${GRAPH_BASE}/users/${userId}/drive/root/children`
      : `${GRAPH_BASE}/users/${userId}/drive/items/${itemId}/children`;

  const allFiles = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await axios.get(nextUrl, {
      headers,
      params: nextUrl === url ? { $top: 200 } : undefined,
    });

    const { value, "@odata.nextLink": nextLink } = res.data;

    for (const item of value) {
      if (item.folder) {
        const folderPath = basePath ? `${basePath}/${item.name}` : item.name;
        const subFiles = await listUserFiles(creds, userId, item.id, folderPath);
        allFiles.push(...subFiles);
      } else if (item.file) {
        allFiles.push({
          graphItemId: item.id,
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

async function getAppFileStream(creds, userId, fileId) {
  const token = await getAccessToken(creds);
  const res = await axios.get(
    `${GRAPH_BASE}/users/${userId}/drive/items/${fileId}/content`,
    { headers: { Authorization: `Bearer ${token}` }, responseType: "stream" }
  );
  return res.data;
}

module.exports = { listAllTenantUsers, listUserFiles, getAppFileStream };
