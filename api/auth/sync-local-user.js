const { ensureSchema, getSql } = require("../_lib/db");
const { handleOptions, readJsonBody, sendJson } = require("../_lib/http");
const { buildSession, normalizeUsername } = require("../_lib/auth");
const { getPayloadTimestamp, getSyncItemId } = require("../_lib/sync");
const crypto = require("node:crypto");

function remapUserScopedValue(value, fromUserId, toUserId) {
  if (typeof value !== "string") return value;
  if (value === fromUserId) return toUserId;
  const prefix = `${fromUserId}:`;
  return value.startsWith(prefix) ? `${toUserId}:${value.slice(prefix.length)}` : value;
}

function remapPayloadUser(payload, collection, fromUserId, toUserId) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload, userId: toUserId };

  if (typeof next.id === "string") next.id = remapUserScopedValue(next.id, fromUserId, toUserId);
  if (typeof next.itemId === "string") next.itemId = remapUserScopedValue(next.itemId, fromUserId, toUserId);
  if (typeof next.wordId === "string") next.wordId = remapUserScopedValue(next.wordId, fromUserId, toUserId);
  if (Array.isArray(next.wordIds)) {
    next.wordIds = next.wordIds.map((wordId) => remapUserScopedValue(wordId, fromUserId, toUserId));
  }
  if (collection === "settings") next.id = toUserId;

  return next;
}

async function mergeCloudSyncRecords(sql, fromUserId, toUserId) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return 0;

  const rows = await sql`
    SELECT collection, payload_json, updated_at
    FROM cloud_sync_records
    WHERE user_id = ${fromUserId}
  `;
  let migrated = 0;

  for (const row of rows) {
    let parsed;
    try {
      parsed = JSON.parse(row.payload_json);
    } catch {
      continue;
    }

    const item = remapPayloadUser(parsed, row.collection, fromUserId, toUserId);
    const itemId = getSyncItemId(row.collection, item);
    const payloadJson = JSON.stringify(item);
    const payloadUpdatedAt = getPayloadTimestamp(item);
    const sourceUpdatedAt = new Date(row.updated_at);
    const updatedAt = sourceUpdatedAt.getTime() > payloadUpdatedAt.getTime() ? sourceUpdatedAt : payloadUpdatedAt;

    await sql`
      INSERT INTO cloud_sync_records (user_id, collection, item_id, payload_json, updated_at)
      VALUES (${toUserId}, ${row.collection}, ${itemId}, ${payloadJson}, ${updatedAt.toISOString()})
      ON CONFLICT (user_id, collection, item_id)
      DO UPDATE SET
        payload_json = CASE
          WHEN cloud_sync_records.updated_at <= EXCLUDED.updated_at THEN EXCLUDED.payload_json
          ELSE cloud_sync_records.payload_json
        END,
        updated_at = CASE
          WHEN cloud_sync_records.updated_at <= EXCLUDED.updated_at THEN EXCLUDED.updated_at
          ELSE cloud_sync_records.updated_at
        END
    `;
    migrated += 1;
  }

  return migrated;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const payload = await readJsonBody(req);
  const username = normalizeUsername(payload.username);
  const passwordHash = String(payload.passwordHash || "").trim();
  const preferredUserId = String(payload.userId || "").trim();

  if (username.length < 3 || !passwordHash) {
    return sendJson(res, 400, { error: "username and passwordHash are required" });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`
      SELECT id, username, password_hash
      FROM users
      WHERE username_normalized = ${username}
      LIMIT 1
    `;

    if (existing.length) {
      const user = existing[0];
      if (user.password_hash !== passwordHash) {
        return sendJson(res, 409, { error: "账号已存在且密码不匹配，无法自动迁移。" });
      }
      const migratedRecords = await mergeCloudSyncRecords(sql, preferredUserId, user.id);
      return sendJson(res, 200, { session: buildSession(user), synced: false, migratedRecords });
    }

    const userId = preferredUserId || `user-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const rows = await sql`
      INSERT INTO users (id, username, username_normalized, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${username}, ${passwordHash}, NOW(), NOW())
      RETURNING id, username, password_hash
    `;
    return sendJson(res, 201, { session: buildSession(rows[0]), synced: true });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Sync failed" });
  }
};
