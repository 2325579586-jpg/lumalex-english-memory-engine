import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceZipExtractDir = process.argv[2];
const outputDir = process.argv[3] || path.resolve("frontend/public/dictionary");

if (!sourceZipExtractDir) {
  throw new Error("Usage: node scripts/import-dict.mjs <extracted DICT directory> [output directory]");
}

const decoder = new TextDecoder("gb18030");
const cjkPattern = /[\u3400-\u9fff]/;
const posPattern =
  /\b(indef art|comb form|modal v|aux v|abbr|symb|pref|pron|prep|conj|det|art|interj|adv|adj|n|v)\b/i;

const skipMeaningFragments = new Set([
  "参看",
  "用法",
  "口",
  "俚",
  "正式",
  "非正式",
  "作定语",
  "通常作表语",
  "复数",
  "单数",
  "英",
  "美",
  "音",
  "习语",
]);

function normalizeWord(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[，。；:：]+$/g, "")
    .toLowerCase();
}

function displayWord(value) {
  return value.trim().replace(/\s+/g, " ").replace(/[，。；:：]+$/g, "");
}

function isDefinitionStart(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("/") ||
    /^(n|v|adj|adv|abbr|pref|comb form|symb|pron|prep|conj|det|art|interj)\b/i.test(trimmed)
  );
}

function isHeadwordLine(line, nextLine) {
  if (!line || /^\s/.test(line)) return false;
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 72) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("(") || trimmed.startsWith("[") || trimmed.startsWith("*")) return false;
  if (/^(note on usage|cf |=>|usage\b)/i.test(trimmed)) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  if (!/^[A-Za-z][A-Za-z0-9'.,/&() -]*$/.test(trimmed)) return false;
  return isDefinitionStart(nextLine || "");
}

function cleanMeaningFragment(fragment) {
  return fragment
    .replace(/[()（）[\]【】]/g, "")
    .replace(/\s+/g, "")
    .replace(/^[,，;；:：.。*、]+|[,，;；:：.。*、]+$/g, "")
    .trim();
}

function extractMeanings(body) {
  const withoutPronunciation = body.replace(/\/[^/\n]{1,120}\//g, " ");
  const withoutExamples = withoutPronunciation
    .replace(/:[\s\S]*?(?=(?:\s{2,}\d+\s)|$)/g, " ")
    .replace(/\*[\s\S]*?(?=(?:\s{2,}\d+\s)|$)/g, " ");

  function collectFragments(text) {
    return text
    .split(/[\n:*]|(?:\s{2,})/)
    .flatMap((part) => part.split(/[.;!?]/))
    .flatMap((part) => part.match(/[\u3400-\u9fff][\u3400-\u9fffA-Za-z0-9（）()、，,；;·\- ]{0,60}/g) || [])
    .map(cleanMeaningFragment)
    .filter((item) => item.length >= 2 && item.length <= 42)
    .filter((item) => cjkPattern.test(item))
    .filter((item) => !skipMeaningFragments.has(item))
    .filter((item) => !/^参看/.test(item) && !/用法$/.test(item));
  }

  const seen = new Set();
  const unique = [];
  const preferredFragments = collectFragments(withoutExamples);
  const fallbackFragments = preferredFragments.length ? [] : collectFragments(withoutPronunciation);
  for (const fragment of [...preferredFragments, ...fallbackFragments]) {
    if (seen.has(fragment)) continue;
    seen.add(fragment);
    unique.push(fragment);
    if (unique.length >= 6) break;
  }
  return unique;
}

function extractPhonetic(body) {
  const match = body.match(/\/([^/\n]{1,90})\//);
  return match ? `/${match[1].trim()}/` : "";
}

function extractPartOfSpeech(body) {
  const withoutPronunciation = body.replace(/^\/[^/\n]{1,120}\//, " ");
  const match = withoutPronunciation.match(posPattern);
  if (!match) return "";
  const value = match[1].toLowerCase();
  const normalized = {
    "indef art": "art.",
    "comb form": "comb.",
    "modal v": "modal v.",
    "aux v": "aux v.",
    abbr: "abbr.",
    symb: "symb.",
    pref: "pref.",
    pron: "pron.",
    prep: "prep.",
    conj: "conj.",
    det: "det.",
    art: "art.",
    interj: "interj.",
    adv: "adv.",
    adj: "adj.",
    n: "n.",
    v: "v.",
  };
  return normalized[value] || value;
}

function entryFromRaw(headword, body) {
  const term = displayWord(headword);
  const key = normalizeWord(term);
  if (!key) return null;
  const meanings = extractMeanings(body);
  if (!meanings.length) return null;
  const partOfSpeech = extractPartOfSpeech(body);
  return {
    key,
    value: {
      word: term,
      phonetic: extractPhonetic(body),
      partOfSpeech,
      meaning: meanings.slice(0, 4).join("；"),
      commonMeanings: meanings.slice(0, 4),
      examMeanings: meanings.slice(0, 3).map((meaning) => `${partOfSpeech} ${meaning}`.trim()),
    },
  };
}

function parseEntries(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const entries = [];
  let currentHeadword = "";
  let currentBody = [];

  function flush() {
    if (!currentHeadword || !currentBody.length) return;
    const entry = entryFromRaw(currentHeadword, currentBody.join("\n"));
    if (entry) entries.push(entry);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] || "";
    if (isHeadwordLine(line, nextLine)) {
      flush();
      currentHeadword = line.trim();
      currentBody = [];
    } else if (currentHeadword) {
      currentBody.push(line);
    }
  }
  flush();
  return entries;
}

async function listTextFiles(dir) {
  const result = [];
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      result.push(...(await listTextFiles(fullPath)));
    } else if (item.isFile() && item.name.toLowerCase().endsWith(".txt")) {
      result.push(fullPath);
    }
  }
  return result;
}

function shardName(key) {
  const first = key[0] || "";
  return /^[a-z]$/.test(first) ? first : "misc";
}

const files = await listTextFiles(sourceZipExtractDir);
const dictionary = new Map();
const duplicates = [];

for (const file of files) {
  const buffer = await readFile(file);
  const text = decoder.decode(buffer);
  for (const entry of parseEntries(text)) {
    if (dictionary.has(entry.key)) {
      const existing = dictionary.get(entry.key);
      const mergedMeanings = Array.from(new Set([...existing.commonMeanings, ...entry.value.commonMeanings])).slice(0, 6);
      dictionary.set(entry.key, {
        ...existing,
        phonetic: existing.phonetic || entry.value.phonetic,
        partOfSpeech: existing.partOfSpeech || entry.value.partOfSpeech,
        meaning: mergedMeanings.slice(0, 4).join("；"),
        commonMeanings: mergedMeanings.slice(0, 4),
        examMeanings: mergedMeanings.slice(0, 3).map((meaning) => `${existing.partOfSpeech || entry.value.partOfSpeech} ${meaning}`.trim()),
      });
      duplicates.push(entry.key);
    } else {
      dictionary.set(entry.key, entry.value);
    }
  }
}

const shards = new Map();
for (const [key, value] of dictionary) {
  const name = shardName(key);
  const shard = shards.get(name) || {};
  shard[key] = value;
  shards.set(name, shard);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const index = {
  generatedAt: new Date().toISOString(),
  source: "DICT.zip",
  encoding: "gb18030",
  files: files.length,
  entries: dictionary.size,
  shards: {},
};

for (const [name, shard] of Array.from(shards.entries()).sort(([a], [b]) => a.localeCompare(b))) {
  const ordered = Object.fromEntries(Object.entries(shard).sort(([a], [b]) => a.localeCompare(b)));
  index.shards[name] = Object.keys(ordered).length;
  await writeFile(path.join(outputDir, `${name}.json`), JSON.stringify(ordered), "utf8");
}

const samples = ["land", "container", "optimize", "reduce", "moderately", "abandon", "concentrate"]
  .map((key) => [key, dictionary.get(key)])
  .filter(([, value]) => value);

await writeFile(path.join(outputDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
await writeFile(
  path.join(outputDir, "import-report.json"),
  JSON.stringify(
    {
      ...index,
      duplicateHeadwords: new Set(duplicates).size,
      samples: Object.fromEntries(samples),
    },
    null,
    2,
  ),
  "utf8",
);

console.log(JSON.stringify({ entries: dictionary.size, files: files.length, outputDir, shards: index.shards, samples: Object.fromEntries(samples) }, null, 2));
