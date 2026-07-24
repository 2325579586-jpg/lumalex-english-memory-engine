const { ensureSchema, getSql } = require("../_lib/db");
const { handleOptions, readJsonBody, sendJson, sendServerError } = require("../_lib/http");
const {
  hashPassword,
  isLegacyPasswordHash,
  isValidUsername,
  issueSession,
  normalizeUsername,
  verifyPassword,
} = require("../_lib/auth");
const { checkRateLimit } = require("../_lib/rate-limit");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);
  if (!checkRateLimit(req, res, { key: "auth-login", max: 12, windowMs: 60_000 })) return;

  const payload = await readJsonBody(req, res, { maxBytes: 16 * 1024 });
  if (!payload) return;
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");
  if (!isValidUsername(username) || !password || password.length > 256) {
    return sendJson(res, 400, { error: "账号或密码格式不正确。", code: "INVALID_CREDENTIALS" }, req);
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, username, password_hash
      FROM users
      WHERE username_normalized = ${username}
      LIMIT 1
    `;

    if (!rows.length) {
      return sendJson(res, 404, { error: "账号不存在，请先注册。", code: "ACCOUNT_NOT_FOUND" }, req);
    }
    const user = rows[0];
    if (!(await verifyPassword(password, user.password_hash))) {
      return sendJson(res, 401, { error: "账号或密码错误。", code: "INVALID_CREDENTIALS" }, req);
    }

    if (isLegacyPasswordHash(user.password_hash)) {
      user.password_hash = await hashPassword(password);
      await sql`
        UPDATE users
        SET password_hash = ${user.password_hash}, updated_at = NOW()
        WHERE id = ${user.id}
      `;
    } else {
      await sql`UPDATE users SET updated_at = NOW() WHERE id = ${user.id}`;
    }
    return sendJson(res, 200, { session: await issueSession(sql, user) }, req);
  } catch (error) {
    return sendServerError(req, res, error, "auth/login", "登录失败，请稍后重试。");
  }
};
