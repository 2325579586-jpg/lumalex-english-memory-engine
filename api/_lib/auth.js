const crypto = require("node:crypto");

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");
}

function buildSyncToken(user) {
  const payload = `${user.id}:${user.password_hash}`;
  const signature = crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  return `${user.id}.${signature}`;
}

function buildSession(user) {
  return {
    userId: user.id,
    username: user.username,
    syncToken: buildSyncToken(user),
    loggedInAt: Date.now(),
  };
}

async function verifySyncAuth(sql, userId, syncToken) {
  const rows = await sql`
    SELECT id, password_hash
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  if (!rows.length) return false;
  return buildSyncToken(rows[0]) === String(syncToken || "");
}

module.exports = {
  normalizeUsername,
  hashPassword,
  buildSession,
  verifySyncAuth,
};
