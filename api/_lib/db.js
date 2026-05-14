const { neon } = require("@neondatabase/serverless");

let sqlClient = null;
let schemaReadyPromise = null;

function getDatabaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!raw.trim()) {
    throw new Error("DATABASE_URL is not configured");
  }
  return raw.trim();
}

function getSql() {
  if (!sqlClient) {
    sqlClient = neon(getDatabaseUrl());
  }
  return sqlClient;
}

async function ensureSchema() {
  if (schemaReadyPromise) return schemaReadyPromise;

  const sql = getSql();
  schemaReadyPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        username_normalized TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cloud_sync_records (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        collection TEXT NOT NULL,
        item_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_cloud_sync_item UNIQUE(user_id, collection, item_id)
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cloud_sync_user_collection
      ON cloud_sync_records (user_id, collection, updated_at)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS system_lexicons (
        id TEXT PRIMARY KEY,
        lexicon_key TEXT NOT NULL,
        slug TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_zh TEXT NOT NULL,
        description_en TEXT NOT NULL,
        description_zh TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'system',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS system_lexicon_items (
        id TEXT PRIMARY KEY,
        lexicon_id TEXT NOT NULL,
        item_index INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_lexicon_items_lexicon
      ON system_lexicon_items (lexicon_id, item_index)
    `;
  })();

  return schemaReadyPromise;
}

module.exports = {
  getSql,
  ensureSchema,
};
