const { ensureSchema, getSql } = require("../_lib/db");
const { handleOptions, readJsonBody, sendJson } = require("../_lib/http");
const { buildSession, hashPassword, normalizeUsername } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const payload = await readJsonBody(req);
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, username, password_hash
      FROM users
      WHERE username_normalized = ${username}
      LIMIT 1
    `;

    if (!rows.length) return sendJson(res, 404, { error: "账号不存在，请先注册。" });
    const user = rows[0];
    if (user.password_hash !== hashPassword(password)) {
      return sendJson(res, 401, { error: "密码错误，请重新输入。" });
    }

    await sql`UPDATE users SET updated_at = NOW() WHERE id = ${user.id}`;
    return sendJson(res, 200, { session: buildSession(user) });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Login failed" });
  }
};
