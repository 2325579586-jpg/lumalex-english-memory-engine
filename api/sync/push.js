const { ensureSchema, getSql } = require("../_lib/db");
const { verifySyncAuth } = require("../_lib/auth");
const { SYNC_COLLECTIONS, getPayloadTimestamp, getSyncItemId, isCloudRelevantWord } = require("../_lib/sync");
const { handleOptions, readJsonBody, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const payload = await readJsonBody(req);
  const userId = String(payload.userId || "").trim();
  const syncToken = String(payload.syncToken || "").trim();
  const collections = payload.collections && typeof payload.collections === "object" ? payload.collections : null;
  const replace = Boolean(payload.replace && payload.allowDestructiveReplace);

  if (!userId) return sendJson(res, 400, { error: "userId is required" });
  if (!syncToken) return sendJson(res, 401, { error: "Unauthorized" });
  if (!collections) return sendJson(res, 400, { error: "collections must be an object" });

  try {
    await ensureSchema();
    const sql = getSql();
    if (!(await verifySyncAuth(sql, userId, syncToken))) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    let saved = 0;

    for (const collection of Object.keys(collections)) {
      const items = Array.isArray(collections[collection]) ? collections[collection] : null;
      if (!SYNC_COLLECTIONS.includes(collection) || !items) continue;

      const incomingIds = new Set(
        items
          .filter((item) => item && typeof item === "object")
          .map((item) => getSyncItemId(collection, item)),
      );

      if (replace) {
        const existing = await sql`
          SELECT item_id
          FROM cloud_sync_records
          WHERE user_id = ${userId} AND collection = ${collection}
        `;
        for (const row of existing) {
          if (!incomingIds.has(row.item_id)) {
            await sql`
              DELETE FROM cloud_sync_records
              WHERE user_id = ${userId} AND collection = ${collection} AND item_id = ${row.item_id}
            `;
          }
        }
      }

      for (const rawItem of items) {
        if (!rawItem || typeof rawItem !== "object") continue;
        const item = { ...rawItem, userId };
        if (collection === "deletions") {
          const targetCollection = String(item.collection || "").trim();
          const targetItemId = String(item.itemId || "").trim();
          const deletedAt = Number(item.deletedAt || item.updatedAt || Date.now());
          if (!SYNC_COLLECTIONS.includes(targetCollection) || targetCollection === "deletions" || !targetItemId) {
            continue;
          }

          const target = await sql`
            SELECT payload_json, updated_at
            FROM cloud_sync_records
            WHERE user_id = ${userId} AND collection = ${targetCollection} AND item_id = ${targetItemId}
            LIMIT 1
          `;
          if (target.length) {
            item.deletedPayload = target[0].payload_json;
          }
          if (!target.length || new Date(target[0].updated_at).getTime() <= deletedAt) {
            await sql`
              DELETE FROM cloud_sync_records
              WHERE user_id = ${userId} AND collection = ${targetCollection} AND item_id = ${targetItemId}
            `;
          }

          item.id = getSyncItemId("deletions", item);
          item.deletedAt = deletedAt;
          item.updatedAt = deletedAt;
        }
        if (collection === "settings") {
          item.id = userId;
        }
        if (collection === "words" && !isCloudRelevantWord(item)) {
          continue;
        }

        const itemId = getSyncItemId(collection, item);
        const itemUpdatedAt = getPayloadTimestamp(item);
        if (collection !== "deletions") {
          const deletionId = `${collection}:${itemId}`;
          const deletion = await sql`
            SELECT updated_at
            FROM cloud_sync_records
            WHERE user_id = ${userId} AND collection = 'deletions' AND item_id = ${deletionId}
            LIMIT 1
          `;
          if (deletion.length && new Date(deletion[0].updated_at).getTime() >= itemUpdatedAt.getTime()) {
            continue;
          }
        }
        const existing = await sql`
          SELECT updated_at
          FROM cloud_sync_records
          WHERE user_id = ${userId} AND collection = ${collection} AND item_id = ${itemId}
          LIMIT 1
        `;

        if (existing.length && new Date(existing[0].updated_at).getTime() > itemUpdatedAt.getTime()) {
          continue;
        }

        const payloadJson = JSON.stringify(item);
        await sql`
          INSERT INTO cloud_sync_records (user_id, collection, item_id, payload_json, updated_at)
          VALUES (${userId}, ${collection}, ${itemId}, ${payloadJson}, ${itemUpdatedAt.toISOString()})
          ON CONFLICT (user_id, collection, item_id)
          DO UPDATE SET payload_json = EXCLUDED.payload_json, updated_at = EXCLUDED.updated_at
        `;
        saved += 1;
      }
    }

    return sendJson(res, 200, { ok: true, saved, syncedAt: Date.now() });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Push failed" });
  }
};
