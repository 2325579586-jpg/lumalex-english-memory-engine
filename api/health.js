const { ensureSchema, getSql } = require("./_lib/db");
const { handleOptions, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`SELECT 1`;
    return sendJson(res, 200, {
      ok: true,
      service: "world_app_api",
      database: "online",
      timestamp: Date.now(),
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Health check failed",
    });
  }
};
