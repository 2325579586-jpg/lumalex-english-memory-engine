const { ensureSchema, getSql } = require("../_lib/db");
const { revokeSession } = require("../_lib/auth");
const { handleOptions, readJsonBody, sendJson, sendServerError } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);
  const payload = await readJsonBody(req, res, { maxBytes: 8 * 1024 });
  if (!payload) return;
  const userId = String(payload.userId || "").trim();
  const syncToken = String(payload.syncToken || "").trim();
  if (!userId || !syncToken) return sendJson(res, 200, { ok: true }, req);

  try {
    await ensureSchema();
    await revokeSession(getSql(), userId, syncToken);
    return sendJson(res, 200, { ok: true }, req);
  } catch (error) {
    return sendServerError(req, res, error, "auth/logout", "退出登录失败，请稍后重试。");
  }
};
