const { ensureSchema, getSql } = require("./_lib/db");
const { handleOptions, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" }, req);

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`SELECT 1`;
    return sendJson(res, 200, {
      ok: true,
      service: "world_app_api",
      database: "online",
      timestamp: Date.now(),
    }, req);
  } catch (error) {
    console.error("[health] database check failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return sendJson(res, 503, {
      ok: false,
      error: "Service unavailable",
      code: "SERVICE_UNAVAILABLE",
    }, req);
  }
};
