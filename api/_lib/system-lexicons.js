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
    id: "system-cet4-translation-phrases",
    key: "cet4-translation-phrases",
    slug: "cet4-translation-phrases",
    name: { en: "CET-4 Translation Phrases", zh: "四级翻译短语词库" },
    description: {
      en: "High-frequency CET-4 translation phrases collected from the provided image notes.",
      zh: "整理自图片资料的大学英语四级翻译常考短语和句型。",
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
  {
    id: "system-daily-life",
    key: "daily-life",
    slug: "daily-life",
    name: { en: "Daily Life Vocabulary", zh: "日常生活用词" },
    description: {
      en: "Everyday words and phrases for dates, months, fruits, vegetables, and daily conversation.",
      zh: "覆盖日期、月份、水果、蔬菜和日常口语表达的生活英语词库。",
    },
    scope: "system",
  },
];

const SYSTEM_ITEMS_PATHS = {
  "system-cet4": path.join(process.cwd(), "backend", "system_lexicon_data", "cet4.json"),
  "system-cet4-translation-phrases": path.join(
    process.cwd(),
    "backend",
    "system_lexicon_data",
    "cet4-translation-phrases.json",
  ),
  "system-cet6": path.join(process.cwd(), "backend", "system_lexicon_data", "cet6.json"),
  "system-daily-life": path.join(process.cwd(), "backend", "system_lexicon_data", "daily-life.json"),
};

const itemCache = new Map();
let seedPromise = null;

const CATEGORY_EN = {
  动作: "Actions",
  政治: "Politics",
  经济: "Economy",
  科技: "Technology",
  生活: "Life",
  环保: "Environment",
  地理: "Geography",
  文化: "Culture",
  "经济发展与改革": "Economic Development and Reform",
  "文化与传统": "Culture and Tradition",
  "社会与人民生活": "Society and People's Livelihood",
  "科技与创新": "Technology and Innovation",
  "环境与生态": "Environment and Ecology",
  "教育与人才": "Education and Talent",
  "政治与政策": "Politics and Policy",
  "旅游与地理": "Tourism and Geography",
  "健康与医疗": "Health and Medical Care",
  "行为与趋势": "Actions and Trends",
};

function normalizeSystemItems(parsed, lexiconId) {
  if (Array.isArray(parsed)) return parsed;

  const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
  const lexiconKey = parsed?.key || lexiconId.replace(/^system-/, "");
  const prefix = parsed?.id || lexiconId;

  return entries.map((entry, index) => {
    const [text, zh, categoryZh] = entry;
    const normalizedCategoryZh = String(categoryZh || "四级翻译").trim();

    return {
      id: `${prefix}-${String(index + 1).padStart(4, "0")}`,
      text: String(text || "").trim(),
      kind: "phrase",
      pos: "phrase",
      category: {
        en: CATEGORY_EN[normalizedCategoryZh] || "CET-4 Translation",
        zh: normalizedCategoryZh,
      },
      difficulty: { en: "CET-4 translation", zh: "四级翻译" },
      meaning: {
        en: String(text || "").trim(),
        zh: String(zh || "").trim(),
      },
      lexiconId,
      lexiconKey,
    };
  });
}

function readItemsFromFile(id) {
  if (itemCache.has(id)) return itemCache.get(id);
  const filePath = SYSTEM_ITEMS_PATHS[id];
  if (!filePath || !fs.existsSync(filePath)) {
    itemCache.set(id, []);
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const items = normalizeSystemItems(parsed, id);
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
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });

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
  normalizeSystemItems,
  ensureSystemLexiconsSeeded,
  getLexicons,
  getLexicon,
  getLexiconItems,
};
