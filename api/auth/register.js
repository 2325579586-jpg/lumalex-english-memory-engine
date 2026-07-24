const crypto = require("node:crypto");
const { ensureSchema, getSql } = require("../_lib/db");
const { handleOptions, readJsonBody, sendJson, sendServerError } = require("../_lib/http");
const { hashPassword, isValidUsername, issueSession, normalizeUsername } = require("../_lib/auth");
const { checkRateLimit } = require("../_lib/rate-limit");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);
  if (!checkRateLimit(req, res, { key: "auth-register", max: 5, windowMs: 5 * 60_000 })) return;

  const payload = await readJsonBody(req, res, { maxBytes: 16 * 1024 });
  if (!payload) return;
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");

  if (!isValidUsername(username)) {
    return sendJson(res, 400, { error: "账号需为 3–64 个不含空格的字符。", code: "INVALID_USERNAME" }, req);
  }
  if (password.length < 8 || password.length > 256) {
    return sendJson(res, 400, { error: "密码需为 8–256 个字符。", code: "INVALID_PASSWORD" }, req);
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`SELECT id FROM users WHERE username_normalized = ${username} LIMIT 1`;
    if (existing.length) {
      return sendJson(res, 409, { error: "这个账号已经存在，请直接登录。", code: "ACCOUNT_EXISTS" }, req);
    }

    const userId = `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const passwordHash = await hashPassword(password);
    const rows = await sql`
      INSERT INTO users (id, username, username_normalized, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${username}, ${passwordHash}, NOW(), NOW())
      RETURNING id, username, password_hash
    `;
    return sendJson(res, 201, { session: await issueSession(sql, rows[0]) }, req);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "23505") {
      return sendJson(res, 409, { error: "这个账号已经存在，请直接登录。", code: "ACCOUNT_EXISTS" }, req);
    }
    return sendServerError(req, res, error, "auth/register", "注册失败，请稍后重试。");
  }
};
