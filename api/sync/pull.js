const { ensureSchema, getSql } = require("../_lib/db");
const { verifySyncAuth } = require("../_lib/auth");
const { emptyCollections, isCloudRelevantWord, SYNC_COLLECTIONS } = require("../_lib/sync");
const { handleOptions, readJsonBody, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const payload = await readJsonBody(req);
  const userId = String(payload.userId || "").trim();
  const syncToken = String(payload.syncToken || "").trim();
  if (!userId) return sendJson(res, 400, { error: "userId is required" });
  if (!syncToken) return sendJson(res, 401, { error: "Unauthorized" });

  try {
    await ensureSchema();
    const sql = getSql();
    if (!(await verifySyncAuth(sql, userId, syncToken))) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const rows = await sql`
      SELECT collection, payload_json
      FROM cloud_sync_records
      WHERE user_id = ${userId}
      ORDER BY updated_at ASC
    `;

    const collections = emptyCollections();
    for (const row of rows) {
      if (!SYNC_COLLECTIONS.includes(row.collection)) continue;
      try {
        const parsed = JSON.parse(row.payload_json);
        if (row.collection === "words" && !isCloudRelevantWord(parsed)) {
          continue;
        }
        if (parsed) collections[row.collection].push(parsed);
      } catch {
        continue;
      }
    }

    return sendJson(res, 200, { collections, syncedAt: Date.now() });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Pull failed" });
  }
};
