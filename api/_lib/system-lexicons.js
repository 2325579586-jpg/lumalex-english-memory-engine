const fs = require("node:fs");
const path = require("node:path");
const { ensureSchema, getSql } = require("./db");

const SYSTEM_LEXICONS = [
  {
    id: "system-graduate",
    key: "graduate",
    slug: "graduate",
    name: { en: "Graduate Exam", zh: "考研词汇" },
    description: {
      en: "Preparation lexicon for postgraduate entrance exam reading and writing.",
      zh: "面向考研阅读与写作的系统词库。",
    },
    scope: "system",
  },
  {
    id: "system-cet4",
    key: "cet4",
    slug: "cet4",
    name: { en: "CET-4", zh: "四级词汇" },
    description: {
      en: "Core college English words for CET-4 preparation.",
      zh: "面向大学英语四级的核心词汇。",
    },
    scope: "system",
  },
  {
    id: "system-cet6",
    key: "cet6",
    slug: "cet6",
    name: { en: "CET-6", zh: "六级词汇" },
    description: {
      en: "Higher-frequency exam words for CET-6 review and retention.",
      zh: "面向大学英语六级的高频词汇。",
    },
    scope: "system",
  },
  {
    id: "system-ielts",
    key: "ielts",
    slug: "ielts",
    name: { en: "IELTS", zh: "雅思词汇" },
    description: {
      en: "Useful words and phrases for IELTS speaking and writing.",
      zh: "用于雅思口语与写作训练的词汇与短语。",
    },
    scope: "system",
  },
];

const SYSTEM_ITEMS_PATHS = {
  "system-cet4": path.join(process.cwd(), "backend", "system_lexicon_data", "cet4.json"),
  "system-cet6": path.join(process.cwd(), "backend", "system_lexicon_data", "cet6.json"),
};

const itemCache = new Map();
let seedPromise = null;

function readItemsFromFile(id) {
  if (itemCache.has(id)) return itemCache.get(id);
  const filePath = SYSTEM_ITEMS_PATHS[id];
  if (!filePath || !fs.existsSync(filePath)) {
    itemCache.set(id, []);
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const items = Array.isArray(parsed) ? parsed : [];
  itemCache.set(id, items);
  return items;
}

async function ensureSystemLexiconsSeeded() {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    await ensureSchema();
    const sql = getSql();

    for (const lexicon of SYSTEM_LEXICONS) {
      await sql`
        INSERT INTO system_lexicons (
          id, lexicon_key, slug, name_en, name_zh, description_en, description_zh, scope, updated_at
        )
        VALUES (
          ${lexicon.id},
          ${lexicon.key},
          ${lexicon.slug},
          ${lexicon.name.en},
          ${lexicon.name.zh},
          ${lexicon.description.en},
          ${lexicon.description.zh},
          ${lexicon.scope},
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          lexicon_key = EXCLUDED.lexicon_key,
          slug = EXCLUDED.slug,
          name_en = EXCLUDED.name_en,
          name_zh = EXCLUDED.name_zh,
          description_en = EXCLUDED.description_en,
          description_zh = EXCLUDED.description_zh,
          scope = EXCLUDED.scope,
          updated_at = NOW()
      `;

    }
  })();

  return seedPromise;
}

async function getLexicons() {
  await ensureSystemLexiconsSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT
      lex.id,
      lex.lexicon_key,
      lex.slug,
      lex.name_en,
      lex.name_zh,
      lex.description_en,
      lex.description_zh,
      lex.scope,
      COUNT(items.id)::int AS item_count
    FROM system_lexicons lex
    LEFT JOIN system_lexicon_items items ON items.lexicon_id = lex.id
    GROUP BY
      lex.id,
      lex.lexicon_key,
      lex.slug,
      lex.name_en,
      lex.name_zh,
      lex.description_en,
      lex.description_zh,
      lex.scope
    ORDER BY lex.id ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    key: row.lexicon_key,
    slug: row.slug,
    name: { en: row.name_en, zh: row.name_zh },
    description: { en: row.description_en, zh: row.description_zh },
    scope: row.scope,
    itemCount: Math.max(row.item_count || 0, readItemsFromFile(row.id).length),
  }));
}

async function getLexicon(id) {
  const lexicons = await getLexicons();
  return lexicons.find((item) => item.id === id) || null;
}

async function getLexiconItems(id) {
  await ensureSystemLexiconsSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT payload_json
    FROM system_lexicon_items
    WHERE lexicon_id = ${id}
    ORDER BY item_index ASC
  `;

  const parsedRows = rows
    .map((row) => {
      try {
        return JSON.parse(row.payload_json);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (parsedRows.length > 0) {
    return parsedRows;
  }

  return readItemsFromFile(id);
}

module.exports = {
  ensureSystemLexiconsSeeded,
  getLexicons,
  getLexicon,
  getLexiconItems,
};
