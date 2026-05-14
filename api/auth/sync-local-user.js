const { ensureSchema, getSql } = require("../_lib/db");
const { handleOptions, readJsonBody, sendJson } = require("../_lib/http");
const { buildSession, normalizeUsername } = require("../_lib/auth");
const crypto = require("node:crypto");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const payload = await readJsonBody(req);
  const username = normalizeUsername(payload.username);
  const passwordHash = String(payload.passwordHash || "").trim();
  const preferredUserId = String(payload.userId || "").trim();

  if (username.length < 3 || !passwordHash) {
    return sendJson(res, 400, { error: "username and passwordHash are required" });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`
      SELECT id, username, password_hash
      FROM users
      WHERE username_normalized = ${username}
      LIMIT 1
    `;

    if (existing.length) {
      const user = existing[0];
      if (user.password_hash !== passwordHash) {
        return sendJson(res, 409, { error: "账号已存在且密码不匹配，无法自动迁移。" });
      }
      return sendJson(res, 200, { session: buildSession(user), synced: false });
    }

    const userId = preferredUserId || `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const rows = await sql`
      INSERT INTO users (id, username, username_normalized, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${username}, ${passwordHash}, NOW(), NOW())
      RETURNING id, username
    `;
    return sendJson(res, 201, { session: buildSession(rows[0]), synced: true });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Sync failed" });
  }
};
