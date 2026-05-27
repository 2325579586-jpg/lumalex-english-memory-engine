import { basicDictionary } from "@/data/basic-dictionary";
import { db } from "@/lib/db";
import { requestAutoEnrich } from "@/services/add-words-service";
import { getAuthSession } from "@/services/auth-session";
import { readStorage, writeStorage } from "@/services/storage";
import type { WordItem } from "@/types/domain";

export type DictionaryEntry = {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  commonMeanings: string[];
  examMeanings: string[];
  example?: string;
  exampleTranslation?: string;
  source: "local_dictionary" | "basic_dictionary" | "cache" | "ai" | "fallback";
};

type LookupOptions = {
  allowAi?: boolean;
  forceAi?: boolean;
  preferLocal?: boolean;
};

const CACHE_KEY = "dictionary_lookup_cache";
const generatedDictionaryCache = new Map<string, Promise<Record<string, Omit<DictionaryEntry, "source">>>>();
const SHARD_TIMEOUT_MS = 1800;
const LOCAL_LOOKUP_TIMEOUT_MS = 450;
const AI_LOOKUP_TIMEOUT_MS = 4500;

const fastRelatedDictionary: Record<string, Omit<DictionaryEntry, "source">> = {
  possible: {
    word: "possible",
    phonetic: "/ˈpɑːsəbl/",
    partOfSpeech: "adj.",
    meaning: "可能的；可行的；合理的",
    commonMeanings: ["可能的", "可行的", "合理的"],
    examMeanings: ["adj. 可能的；可行的", "adj. 合理的"],
    example: "It is possible to finish the task today.",
    exampleTranslation: "今天完成这个任务是可能的。",
  },
  impossible: {
    word: "impossible",
    phonetic: "/ɪmˈpɑːsəbl/",
    partOfSpeech: "adj.",
    meaning: "不可能的；办不到的",
    commonMeanings: ["不可能的", "办不到的"],
    examMeanings: ["adj. 不可能的；办不到的"],
  },
  feasible: {
    word: "feasible",
    phonetic: "/ˈfiːzəbl/",
    partOfSpeech: "adj.",
    meaning: "可行的；可能的；行得通的",
    commonMeanings: ["可行的", "可能的", "行得通的"],
    examMeanings: ["adj. 可行的；可能的"],
  },
  likely: {
    word: "likely",
    phonetic: "/ˈlaɪkli/",
    partOfSpeech: "adj. / adv.",
    meaning: "可能的；有希望的；大概",
    commonMeanings: ["可能的", "有希望的", "大概"],
    examMeanings: ["adj. 可能的", "adv. 大概"],
  },
  probable: {
    word: "probable",
    phonetic: "/ˈprɑːbəbl/",
    partOfSpeech: "adj.",
    meaning: "很可能的；大概会发生的",
    commonMeanings: ["很可能的", "大概会发生的"],
    examMeanings: ["adj. 很可能的"],
  },
  potential: {
    word: "potential",
    phonetic: "/pəˈtenʃl/",
    partOfSpeech: "adj. / n.",
    meaning: "潜在的；可能的；潜力",
    commonMeanings: ["潜在的", "可能的", "潜力"],
    examMeanings: ["adj. 潜在的；可能的", "n. 潜力"],
  },
  viable: {
    word: "viable",
    phonetic: "/ˈvaɪəbl/",
    partOfSpeech: "adj.",
    meaning: "可行的；能成功的；能存活的",
    commonMeanings: ["可行的", "能成功的", "能存活的"],
    examMeanings: ["adj. 可行的；能成功的"],
  },
  practical: {
    word: "practical",
    phonetic: "/ˈpræktɪkl/",
    partOfSpeech: "adj.",
    meaning: "实际的；实用的；可行的",
    commonMeanings: ["实际的", "实用的", "可行的"],
    examMeanings: ["adj. 实际的；实用的"],
  },
  capable: {
    word: "capable",
    phonetic: "/ˈkeɪpəbl/",
    partOfSpeech: "adj.",
    meaning: "有能力的；能够的",
    commonMeanings: ["有能力的", "能够的"],
    examMeanings: ["adj. 有能力的；能够的"],
  },
  enable: {
    word: "enable",
    phonetic: "/ɪˈneɪbl/",
    partOfSpeech: "v.",
    meaning: "使能够；使成为可能",
    commonMeanings: ["使能够", "使成为可能"],
    examMeanings: ["v. 使能够；使成为可能"],
  },
  ability: {
    word: "ability",
    phonetic: "/əˈbɪləti/",
    partOfSpeech: "n.",
    meaning: "能力；才能",
    commonMeanings: ["能力", "才能"],
    examMeanings: ["n. 能力；才能"],
  },
  unable: {
    word: "unable",
    phonetic: "/ʌnˈeɪbl/",
    partOfSpeech: "adj.",
    meaning: "不能的；无法做到的",
    commonMeanings: ["不能的", "无法做到的"],
    examMeanings: ["adj. 不能的；无法做到的"],
  },
  complete: {
    word: "complete",
    phonetic: "/kəmˈpliːt/",
    partOfSpeech: "v. / adj.",
    meaning: "完成；完整的；完全的",
    commonMeanings: ["完成", "完整的", "完全的"],
    examMeanings: ["v. 完成", "adj. 完整的；完全的"],
  },
  project: {
    word: "project",
    phonetic: "/ˈprɑːdʒekt/",
    partOfSpeech: "n. / v.",
    meaning: "项目；计划；投射；预计",
    commonMeanings: ["项目", "计划", "投射", "预计"],
    examMeanings: ["n. 项目；计划", "v. 投射；预计"],
  },
  imbibe: {
    word: "imbibe",
    phonetic: "/ɪmˈbaɪb/",
    partOfSpeech: "v.",
    meaning: "喝；饮；吸收；接受",
    commonMeanings: ["喝", "饮", "吸收", "接受"],
    examMeanings: ["v. 喝；饮", "v. 吸收；接受某种思想或信息"],
  },
  consume: {
    word: "consume",
    phonetic: "/kənˈsuːm/",
    partOfSpeech: "v.",
    meaning: "消耗；消费；吃；喝",
    commonMeanings: ["消耗", "消费", "吃", "喝"],
    examMeanings: ["v. 消耗；消费", "v. 吃；喝"],
  },
  ingest: {
    word: "ingest",
    phonetic: "/ɪnˈdʒest/",
    partOfSpeech: "v.",
    meaning: "摄取；吞下；吸收",
    commonMeanings: ["摄取", "吞下", "吸收"],
    examMeanings: ["v. 摄取；吞下"],
  },
  absorb: {
    word: "absorb",
    phonetic: "/əbˈzɔːrb/",
    partOfSpeech: "v.",
    meaning: "吸收；理解；使全神贯注",
    commonMeanings: ["吸收", "理解", "使全神贯注"],
    examMeanings: ["v. 吸收；理解"],
  },
  swallow: {
    word: "swallow",
    phonetic: "/ˈswɑːloʊ/",
    partOfSpeech: "v. / n.",
    meaning: "吞下；咽下；忍受；燕子",
    commonMeanings: ["吞下", "咽下", "忍受", "燕子"],
    examMeanings: ["v. 吞下；咽下", "v. 忍受"],
  },
};

function normalizeWord(word: string) {
  return word.trim().toLowerCase();
}

function isUsefulEntry(entry: DictionaryEntry | null | undefined): entry is DictionaryEntry {
  return Boolean(
    entry?.meaning?.trim() &&
      entry.meaning !== "暂无释义" &&
      entry.meaning !== "点击查看释义" &&
      !entry.meaning.includes("暂未找到释义") &&
      !entry.meaning.includes("正在查询"),
  );
}

function splitMeaning(value: string) {
  return value
    .split(/[;；,，。]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function normalizePartOfSpeech(value: string) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "";
  const parts = clean
    .replace(/part\s*of\s*speech:?/gi, "")
    .split(/[\/,，;；|]+/)
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((item) => {
      if (["noun", "n"].includes(item)) return "n.";
      if (["verb", "v", "vi", "vt"].includes(item)) return item === "vi" || item === "vt" ? `${item}.` : "v.";
      if (["adjective", "adj"].includes(item)) return "adj.";
      if (["adverb", "adv"].includes(item)) return "adv.";
      if (["phrase", "phr"].includes(item)) return "phr.";
      if (["prep", "preposition"].includes(item)) return "prep.";
      if (["conj", "conjunction"].includes(item)) return "conj.";
      return item.length <= 5 ? `${item}.`.replace(/\.\.+$/, ".") : "";
    })
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 3).join(" / ");
}

function normalizePhonetic(value: string) {
  const clean = String(value || "")
    .replace(/[\[\]]/g, "")
    .trim();
  if (!clean) return "";
  const compact = clean.replace(/\s+/g, "");
  const invalid =
    compact.length > 34 ||
    /[,;；，]/.test(compact) ||
    /[\u4e00-\u9fff]/.test(compact) ||
    /[A-Za-z]{3,}/.test(compact.replace(/ˈ|ˌ/g, ""));
  if (invalid) return "";
  return compact.startsWith("/") ? compact : `/${compact}/`;
}

function fixCommonDefinitionGlue(value: string) {
  return String(value || "")
    .replace(/drink\s*sth\.?\s*,?\s*esp\.?\s*alcohol/gi, "喝；饮，尤指酒")
    .replace(/drinksth,?\s*esp\.?\s*alcohol/gi, "喝；饮，尤指酒")
    .replace(/espalcohol/gi, "尤指酒")
    .replace(/take\s*in\s*or\s*absorb\s*sth\.?/gi, "吸收；接受")
    .replace(/takeinorabsorbsth/gi, "吸收；接受")
    .replace(/eat\s*or\s*drink\s*sth\.?/gi, "吃；喝")
    .replace(/eatordrinksth/gi, "吃；喝")
    .replace(/take\s*sth\.?\s*in/gi, "摄取；吸收")
    .replace(/takesthin/gi, "摄取；吸收")
    .replace(/\bsth\b\.?/gi, "某物")
    .replace(/\bsb\b\.?/gi, "某人")
    .replace(/\besp\.?\b/gi, "尤其")
    .replace(/\bfig\.?\b/gi, "比喻")
    .replace(/\blit\.?\b/gi, "书面")
    .replace(/\s+/g, " ")
    .trim();
}

function keepReadableChinese(value: string) {
  const fixed = fixCommonDefinitionGlue(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/\b[a-z][a-z'-]{3,}\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*([；，。;,.])\s*/g, "$1")
    .trim();
  const chunks = fixed
    .split(/[；;。]+/)
    .map((item) => item.trim().replace(/^[,，、\s]+|[,，、\s]+$/g, ""))
    .filter((item) => /[\u4e00-\u9fff]/.test(item))
    .map((item) => item.replace(/^(文或谑|文|谑|比喻|书面|尤指)[:：]?/, "").trim())
    .filter(Boolean);
  return Array.from(new Set(chunks)).slice(0, 5).join("；");
}

function normalizeMeaning(value: string) {
  const readable = keepReadableChinese(value);
  if (readable) return readable;
  const cjkParts = String(value || "").match(/[\u4e00-\u9fff][\u4e00-\u9fff、，；;。\s]{0,28}/g) || [];
  const cleaned = cjkParts.map((item) => item.trim().replace(/[，。；;]+$/g, "")).filter(Boolean);
  return Array.from(new Set(cleaned)).slice(0, 4).join("；");
}

function normalizeMeaningList(items: string[], fallback: string, withPos = "") {
  const source = items.length ? items : splitMeaning(fallback);
  const normalized = source
    .map((item) => normalizeMeaning(item))
    .filter(Boolean)
    .flatMap((item) => splitMeaning(item));
  const unique = Array.from(new Set(normalized)).slice(0, 4);
  if (!withPos) return unique;
  return unique.slice(0, 3).map((item) => `${withPos} ${item}`.trim());
}

function normalizeEntry(entry: DictionaryEntry, requestedWord?: string): DictionaryEntry {
  const word = (requestedWord || entry.word || "").trim();
  const partOfSpeech = normalizePartOfSpeech(entry.partOfSpeech);
  const meaning = normalizeMeaning(entry.meaning) || entry.meaning.trim();
  const cleanMeaning = /[\u4e00-\u9fff]/.test(meaning) ? meaning : "";
  const commonMeanings = normalizeMeaningList(entry.commonMeanings || [], cleanMeaning);
  const examMeanings = normalizeMeaningList(entry.examMeanings || [], cleanMeaning, partOfSpeech);
  return {
    ...entry,
    word: word || entry.word,
    phonetic: normalizePhonetic(entry.phonetic),
    partOfSpeech,
    meaning: cleanMeaning || "暂未找到释义，可使用 AI 生成解释",
    commonMeanings,
    examMeanings,
  };
}

function readCache() {
  return readStorage<Record<string, DictionaryEntry>>(CACHE_KEY, {});
}

function writeCacheEntry(word: string, entry: DictionaryEntry) {
  const cache = readCache();
  const normalizedEntry = normalizeEntry(entry, word);
  const next = {
    ...cache,
    [normalizeWord(word)]: { ...normalizedEntry, source: entry.source === "cache" ? "cache" : entry.source },
  };
  writeStorage(CACHE_KEY, next);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => window.clearTimeout(timer));
  });
}

function wordItemToEntry(item: WordItem): DictionaryEntry {
  const meaning = item.meanings.filter(Boolean).join("；") || "暂无释义";
  const commonMeanings = item.meanings.length ? item.meanings.slice(0, 4) : splitMeaning(meaning);
  return normalizeEntry({
    word: item.term,
    phonetic: item.phonetic || "",
    partOfSpeech: item.partOfSpeech || "",
    meaning,
    commonMeanings,
    examMeanings: item.meanings.length ? item.meanings.slice(0, 3).map((itemMeaning) => `${item.partOfSpeech || ""} ${itemMeaning}`.trim()) : [],
    example: item.example,
    exampleTranslation: item.exampleTranslation,
    source: "local_dictionary",
  });
}

async function lookupLocalWord(word: string): Promise<DictionaryEntry | null> {
  const normalized = normalizeWord(word);
  const session = getAuthSession();
  const matches = await db.words.where("normalizedTerm").equals(normalized).toArray();
  const currentUserMatch = session ? matches.find((item) => item.userId === session.userId && item.meanings.length) : undefined;
  const anyUsefulMatch = matches.find((item) => item.meanings.length);
  const item = currentUserMatch || anyUsefulMatch;
  return item ? wordItemToEntry(item) : null;
}

function dictionaryShardName(word: string) {
  const first = normalizeWord(word)[0] || "";
  return /^[a-z]$/.test(first) ? first : "misc";
}

async function fetchDictionaryShard(shard: string): Promise<Record<string, Omit<DictionaryEntry, "source">>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SHARD_TIMEOUT_MS);
  try {
    const response = await fetch(`/dictionary/${shard}.json`, { signal: controller.signal });
    if (!response.ok) return {};
    return (await response.json()) as Record<string, Omit<DictionaryEntry, "source">>;
  } catch {
    generatedDictionaryCache.delete(shard);
    return {};
  } finally {
    window.clearTimeout(timer);
  }
}

async function loadGeneratedDictionaryShard(shard: string): Promise<Record<string, Omit<DictionaryEntry, "source">>> {
  if (!generatedDictionaryCache.has(shard)) {
    generatedDictionaryCache.set(shard, fetchDictionaryShard(shard));
  }
  return generatedDictionaryCache.get(shard) || Promise.resolve({});
}

function lookupEmbeddedDictionary(word: string): DictionaryEntry | null {
  const normalized = normalizeWord(word);
  const entry = fastRelatedDictionary[normalized] || basicDictionary[normalized];
  return entry ? normalizeEntry({ ...entry, source: "basic_dictionary" }, word) : null;
}

function getLookupCandidates(word: string) {
  const normalized = normalizeWord(word).replace(/^[^a-z]+|[^a-z]+$/g, "");
  const candidates = [normalized];
  if (normalized.endsWith("ies") && normalized.length > 4) candidates.push(`${normalized.slice(0, -3)}y`);
  if (normalized.endsWith("ves") && normalized.length > 4) candidates.push(`${normalized.slice(0, -3)}f`);
  if (normalized.endsWith("ied") && normalized.length > 4) candidates.push(`${normalized.slice(0, -3)}y`);
  if (normalized.endsWith("ing") && normalized.length > 5) {
    candidates.push(normalized.slice(0, -3));
    candidates.push(`${normalized.slice(0, -3)}e`);
    const base = normalized.slice(0, -3);
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) candidates.push(base.slice(0, -1));
  }
  if (normalized.endsWith("ed") && normalized.length > 4) {
    candidates.push(normalized.slice(0, -2));
    candidates.push(`${normalized.slice(0, -1)}`);
    const base = normalized.slice(0, -2);
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) candidates.push(base.slice(0, -1));
  }
  if (normalized.endsWith("ly") && normalized.length > 4) candidates.push(normalized.slice(0, -2));
  if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 3) candidates.push(normalized.slice(0, -1));
  return Array.from(new Set(candidates.filter(Boolean)));
}

function adaptEntryToRequestedWord(entry: DictionaryEntry, requestedWord: string): DictionaryEntry {
  const clean = requestedWord.trim();
  if (!clean || normalizeWord(entry.word) === normalizeWord(clean)) return normalizeEntry(entry);
  return normalizeEntry({
    ...entry,
    word: clean,
    meaning: entry.meaning,
    source: entry.source,
  });
}

async function lookupGeneratedDictionary(word: string): Promise<DictionaryEntry | null> {
  const shard = await loadGeneratedDictionaryShard(dictionaryShardName(word));
  const generatedEntry = shard[normalizeWord(word)];
  return generatedEntry ? normalizeEntry({ ...generatedEntry, source: "basic_dictionary" }, word) : null;
}

function lookupCache(word: string): DictionaryEntry | null {
  const entry = readCache()[normalizeWord(word)];
  return entry ? normalizeEntry({ ...entry, source: "cache" }, word) : null;
}

async function lookupAi(word: string): Promise<DictionaryEntry> {
  const enriched = await requestAutoEnrich(word);
  const meaning = enriched.meanings.join("；") || "暂无释义";
  const entry = normalizeEntry({
    word: enriched.term || word,
    phonetic: enriched.phonetic || "",
    partOfSpeech: enriched.partOfSpeech || "",
    meaning,
    commonMeanings: enriched.meanings.length ? enriched.meanings.slice(0, 4) : splitMeaning(meaning),
    examMeanings: enriched.meanings.length
      ? enriched.meanings.slice(0, 3).map((meaningItem) => `${enriched.partOfSpeech || ""} ${meaningItem}`.trim())
      : [],
    example: enriched.example,
    exampleTranslation: enriched.exampleTranslation,
    source: "ai",
  });
  writeCacheEntry(word, entry);
  return entry;
}

function fallbackEntry(word: string): DictionaryEntry {
  return {
    word: word.trim(),
    phonetic: "",
    partOfSpeech: "",
    meaning: "暂未找到释义，可使用 AI 生成解释",
    commonMeanings: [],
    examMeanings: [],
    source: "fallback",
  };
}

export const DictionaryService = {
  async lookup(word: string, options: LookupOptions = {}): Promise<DictionaryEntry> {
    const clean = word.trim();
    if (!clean) return fallbackEntry(word);
    const candidates = getLookupCandidates(clean);

    if (!options.forceAi) {
      for (const candidate of candidates) {
        const embedded = lookupEmbeddedDictionary(candidate);
        if (isUsefulEntry(embedded)) {
          const entry = adaptEntryToRequestedWord(embedded, clean);
          writeCacheEntry(clean, entry);
          return entry;
        }
      }

      for (const candidate of candidates) {
        const cached = lookupCache(candidate);
        if (isUsefulEntry(cached)) return adaptEntryToRequestedWord(cached, clean);
      }

      if (options.preferLocal) {
        for (const candidate of candidates) {
          const local = await withTimeout(lookupLocalWord(candidate), LOCAL_LOOKUP_TIMEOUT_MS, null);
          if (isUsefulEntry(local)) return adaptEntryToRequestedWord(local, clean);
        }
      }

      for (const candidate of candidates) {
        const generated = await lookupGeneratedDictionary(candidate);
        if (isUsefulEntry(generated)) {
          const entry = adaptEntryToRequestedWord(generated, clean);
          writeCacheEntry(clean, entry);
          return entry;
        }
      }

      if (!options.preferLocal) {
        for (const candidate of candidates) {
          const local = await withTimeout(lookupLocalWord(candidate), LOCAL_LOOKUP_TIMEOUT_MS, null);
          if (isUsefulEntry(local)) return adaptEntryToRequestedWord(local, clean);
        }
      }
    }

    if (options.allowAi !== false) {
      const ai = await withTimeout(lookupAi(clean), AI_LOOKUP_TIMEOUT_MS, null);
      if (isUsefulEntry(ai)) return ai;
      if (!ai) {
        const cached = lookupCache(clean);
        if (isUsefulEntry(cached)) return cached;
      }
    }

    return fallbackEntry(clean);
  },

  async lookupMany(words: string[], options: LookupOptions = {}) {
    const unique = Array.from(new Set(words.map(normalizeWord).filter(Boolean)));
    const pairs = await Promise.all(unique.map(async (word) => [word, await DictionaryService.lookup(word, options)] as const));
    return Object.fromEntries(pairs) as Record<string, DictionaryEntry>;
  },

  async generateWithAi(word: string) {
    return DictionaryService.lookup(word, { allowAi: true, forceAi: true });
  },
};
