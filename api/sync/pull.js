const { ensureSchema, getSql } = require("../_lib/db");
const { verifySyncAuth } = require("../_lib/auth");
const { emptyCollections, isCloudRelevantWord, SYNC_COLLECTIONS } = require("../_lib/sync");
const { handleOptions, readJsonBody, sendJson, sendServerError } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);

  const payload = await readJsonBody(req, res, { maxBytes: 32 * 1024 });
  if (!payload) return;
  const userId = String(payload.userId || "").trim();
  const syncToken = String(payload.syncToken || "").trim();
  const since = Number(payload.since || 0);
  const limit = Math.min(Math.max(Number(payload.limit || 800), 1), 1000);
  const cursor = String(payload.cursor || "");
  const [cursorTimeRaw, cursorIdRaw] = cursor.split(":");
  const cursorTime = Number(cursorTimeRaw || 0);
  const cursorId = Number(cursorIdRaw || 0);
  if (!userId || userId.length > 160) return sendJson(res, 400, { error: "userId is invalid" }, req);
  if (!syncToken || syncToken.length > 128) return sendJson(res, 401, { error: "Unauthorized" }, req);
  if (cursor && !/^\d+:\d+$/.test(cursor)) return sendJson(res, 400, { error: "cursor is invalid" }, req);

  try {
    await ensureSchema();
    const sql = getSql();
    if (!(await verifySyncAuth(sql, userId, syncToken))) {
      return sendJson(res, 401, { error: "Unauthorized" }, req);
    }

    const sinceDate = Number.isFinite(since) && since > 0 ? new Date(since) : null;
    const cursorDate = Number.isFinite(cursorTime) && cursorTime > 0 ? new Date(cursorTime) : null;
    const pageLimit = limit + 1;
    let rows;

    if (sinceDate && cursorDate && Number.isFinite(cursorId) && cursorId > 0) {
      rows = await sql`
        SELECT id, collection, payload_json, updated_at
        FROM cloud_sync_records
        WHERE user_id = ${userId}
          AND updated_at >= ${sinceDate.toISOString()}
          AND (updated_at > ${cursorDate.toISOString()} OR (updated_at = ${cursorDate.toISOString()} AND id > ${cursorId}))
        ORDER BY updated_at ASC, id ASC
        LIMIT ${pageLimit}
      `;
    } else if (sinceDate) {
      rows = await sql`
        SELECT id, collection, payload_json, updated_at
        FROM cloud_sync_records
        WHERE user_id = ${userId} AND updated_at >= ${sinceDate.toISOString()}
        ORDER BY updated_at ASC, id ASC
        LIMIT ${pageLimit}
      `;
    } else if (cursorDate && Number.isFinite(cursorId) && cursorId > 0) {
      rows = await sql`
        SELECT id, collection, payload_json, updated_at
        FROM cloud_sync_records
        WHERE user_id = ${userId}
          AND (updated_at > ${cursorDate.toISOString()} OR (updated_at = ${cursorDate.toISOString()} AND id > ${cursorId}))
        ORDER BY updated_at ASC, id ASC
        LIMIT ${pageLimit}
      `;
    } else {
      rows = await sql`
        SELECT id, collection, payload_json, updated_at
        FROM cloud_sync_records
        WHERE user_id = ${userId}
        ORDER BY updated_at ASC, id ASC
        LIMIT ${pageLimit}
      `;
    }

    const collections = emptyCollections();
    const pageRows = rows.slice(0, limit);
    for (const row of pageRows) {
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

    const last = pageRows[pageRows.length - 1];
    const nextCursor = rows.length > limit && last ? `${new Date(last.updated_at).getTime()}:${last.id}` : undefined;
    return sendJson(res, 200, { collections, cursor: nextCursor, hasMore: Boolean(nextCursor), syncedAt: Date.now() }, req);
  } catch (error) {
    return sendServerError(req, res, error, "sync/pull", "云同步读取失败，请稍后重试。");
  }
};
