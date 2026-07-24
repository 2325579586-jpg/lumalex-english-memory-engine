const { ensureSchema, getSql } = require("../_lib/db");
const { verifySyncAuth } = require("../_lib/auth");
const { SYNC_COLLECTIONS, getPayloadTimestamp, getSyncItemId, isCloudRelevantWord } = require("../_lib/sync");
const { handleOptions, readJsonBody, sendJson, sendServerError } = require("../_lib/http");

const MAX_ITEMS_PER_REQUEST = 50;
const MAX_ITEM_BYTES = 96 * 1024;

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);

  const payload = await readJsonBody(req, res, { maxBytes: 1024 * 1024 });
  if (!payload) return;
  const userId = String(payload.userId || "").trim();
  const syncToken = String(payload.syncToken || "").trim();
  const collections = payload.collections && typeof payload.collections === "object" && !Array.isArray(payload.collections)
    ? payload.collections
    : null;
  const replace = Boolean(payload.replace && payload.allowDestructiveReplace);

  if (!userId || userId.length > 160) return sendJson(res, 400, { error: "userId is invalid" }, req);
  if (!syncToken || syncToken.length > 128) return sendJson(res, 401, { error: "Unauthorized" }, req);
  if (!collections) return sendJson(res, 400, { error: "collections must be an object" }, req);

  const itemCount = Object.values(collections).reduce(
    (total, items) => total + (Array.isArray(items) ? items.length : 0),
    0,
  );
  if (itemCount > MAX_ITEMS_PER_REQUEST) {
    return sendJson(res, 413, { error: `A sync request can contain at most ${MAX_ITEMS_PER_REQUEST} items` }, req);
  }

  try {
    await ensureSchema();
    const sql = getSql();
    if (!(await verifySyncAuth(sql, userId, syncToken))) {
      return sendJson(res, 401, { error: "Unauthorized" }, req);
    }

    let saved = 0;
    let rejected = 0;

    for (const collection of Object.keys(collections)) {
      const items = Array.isArray(collections[collection]) ? collections[collection] : null;
      if (!SYNC_COLLECTIONS.includes(collection) || !items) {
        rejected += 1;
        continue;
      }

      const incomingIds = new Set(
        items
          .filter((item) => item && typeof item === "object" && !Array.isArray(item))
          .map((item) => getSyncItemId(collection, item))
          .filter(Boolean),
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
        if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
          rejected += 1;
          continue;
        }

        const item = { ...rawItem, userId };
        if (collection === "deletions") {
          const targetCollection = String(item.collection || "").trim();
          const targetItemId = String(item.itemId || "").trim();
          const deletedAt = Number(item.deletedAt || item.updatedAt || Date.now());
          if (
            !SYNC_COLLECTIONS.includes(targetCollection) ||
            targetCollection === "deletions" ||
            !targetItemId ||
            targetItemId.length > 200 ||
            !Number.isFinite(deletedAt)
          ) {
            rejected += 1;
            continue;
          }

          await sql`
            DELETE FROM cloud_sync_records
            WHERE user_id = ${userId}
              AND collection = ${targetCollection}
              AND item_id = ${targetItemId}
              AND updated_at <= ${new Date(deletedAt).toISOString()}
          `;
          item.id = `${targetCollection}:${targetItemId}`;
          item.deletedAt = deletedAt;
          item.updatedAt = deletedAt;
        } else if (collection === "settings") {
          item.id = userId;
        }

        if (collection === "words" && !isCloudRelevantWord(item)) continue;
        const itemId = getSyncItemId(collection, item);
        if (!itemId) {
          rejected += 1;
          continue;
        }

        const itemUpdatedAt = getPayloadTimestamp(item);
        const payloadJson = JSON.stringify(item);
        if (Buffer.byteLength(payloadJson, "utf8") > MAX_ITEM_BYTES) {
          rejected += 1;
          continue;
        }

        const deletionId = `${collection}:${itemId}`;
        const rows = await sql`
          INSERT INTO cloud_sync_records (user_id, collection, item_id, payload_json, updated_at)
          SELECT ${userId}, ${collection}, ${itemId}, ${payloadJson}, ${itemUpdatedAt.toISOString()}
          WHERE ${collection} = 'deletions'
             OR NOT EXISTS (
               SELECT 1
               FROM cloud_sync_records deletion
               WHERE deletion.user_id = ${userId}
                 AND deletion.collection = 'deletions'
                 AND deletion.item_id = ${deletionId}
                 AND deletion.updated_at >= ${itemUpdatedAt.toISOString()}
             )
          ON CONFLICT (user_id, collection, item_id)
          DO UPDATE SET payload_json = EXCLUDED.payload_json, updated_at = EXCLUDED.updated_at
          WHERE cloud_sync_records.updated_at <= EXCLUDED.updated_at
          RETURNING id
        `;
        if (rows.length) saved += 1;
      }
    }

    return sendJson(res, 200, { ok: true, saved, rejected, syncedAt: Date.now() }, req);
  } catch (error) {
    return sendServerError(req, res, error, "sync/push", "云同步写入失败，请稍后重试。");
  }
};
