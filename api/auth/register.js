const { ensureSchema, getSql } = require("../_lib/db");
const { handleOptions, readJsonBody, sendJson } = require("../_lib/http");
const { buildSession, hashPassword, normalizeUsername } = require("../_lib/auth");
const crypto = require("node:crypto");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const payload = await readJsonBody(req);
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");

  if (username.length < 3) return sendJson(res, 400, { error: "账号至少需要 3 个字符。" });
  if (password.trim().length < 6) return sendJson(res, 400, { error: "密码至少需要 6 个字符。" });

  try {
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`SELECT id FROM users WHERE username_normalized = ${username} LIMIT 1`;
    if (existing.length) return sendJson(res, 409, { error: "这个账号已经存在，请直接登录。" });

    const userId = `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const passwordHash = hashPassword(password);
    const rows = await sql`
      INSERT INTO users (id, username, username_normalized, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${username}, ${passwordHash}, NOW(), NOW())
      RETURNING id, username, password_hash
    `;
    return sendJson(res, 201, { session: buildSession(rows[0]) });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Register failed" });
  }
};
