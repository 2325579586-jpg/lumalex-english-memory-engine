const fs = require("node:fs");
const path = require("node:path");
const { ensureSchema, getSql } = require("../api/_lib/db");
const { normalizeSystemItems } = require("../api/_lib/system-lexicons");

function loadSystemItems(fileName, lexiconId) {
  const filePath = path.join(process.cwd(), "backend", "system_lexicon_data", fileName);
  return normalizeSystemItems(JSON.parse(fs.readFileSync(filePath, "utf8")), lexiconId);
}

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
    items: [],
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
    items: loadSystemItems("cet4.json", "system-cet4"),
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
    items: loadSystemItems("cet4-translation-phrases.json", "system-cet4-translation-phrases"),
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
    items: loadSystemItems("cet6.json", "system-cet6"),
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
    items: [],
  },
];

async function main() {
  await ensureSchema();
  const sql = getSql();

  for (const lexicon of SYSTEM_LEXICONS) {
    await sql.transaction([
      sql`
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
      `,
      sql`DELETE FROM system_lexicon_items WHERE lexicon_id = ${lexicon.id}`,
    ]);

    const chunkSize = 200;
    for (let start = 0; start < lexicon.items.length; start += chunkSize) {
      const chunk = lexicon.items.slice(start, start + chunkSize);
      await sql.transaction(
        chunk.map((item, index) => sql`
          INSERT INTO system_lexicon_items (id, lexicon_id, item_index, payload_json, updated_at)
          VALUES (${item.id}, ${lexicon.id}, ${start + index}, ${JSON.stringify(item)}, NOW())
        `),
      );
      process.stdout.write(`Seeded ${lexicon.id}: ${Math.min(start + chunk.length, lexicon.items.length)}/${lexicon.items.length}\n`);
    }
  }

  const summary = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM system_lexicons) AS lexicons,
      (SELECT COUNT(*)::int FROM system_lexicon_items) AS items,
      (SELECT COUNT(*)::int FROM system_lexicon_items WHERE lexicon_id = 'system-cet4') AS cet4_items,
      (SELECT COUNT(*)::int FROM system_lexicon_items WHERE lexicon_id = 'system-cet4-translation-phrases') AS cet4_translation_phrase_items,
      (SELECT COUNT(*)::int FROM system_lexicon_items WHERE lexicon_id = 'system-cet6') AS cet6_items
  `;

  console.log(JSON.stringify(summary[0], null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
