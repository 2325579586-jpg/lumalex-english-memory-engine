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
const LOCAL_LOOKUP_TIMEOUT_MS = 650;
const AI_LOOKUP_TIMEOUT_MS = 4500;

function normalizeWord(word: string) {
  return word.trim().toLowerCase();
}

function isUsefulEntry(entry: DictionaryEntry | null | undefined): entry is DictionaryEntry {
  return Boolean(entry?.meaning?.trim() && entry.meaning !== "暂无释义" && entry.meaning !== "点击查看释义");
}

function splitMeaning(value: string) {
  return value
    .split(/[;；,，。]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function readCache() {
  return readStorage<Record<string, DictionaryEntry>>(CACHE_KEY, {});
}

function writeCacheEntry(word: string, entry: DictionaryEntry) {
  const cache = readCache();
  const next = {
    ...cache,
    [normalizeWord(word)]: { ...entry, source: entry.source === "cache" ? "cache" : entry.source },
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
  return {
    word: item.term,
    phonetic: item.phonetic || "",
    partOfSpeech: item.partOfSpeech || "",
    meaning,
    commonMeanings,
    examMeanings: item.meanings.length ? item.meanings.slice(0, 3).map((itemMeaning) => `${item.partOfSpeech || ""} ${itemMeaning}`.trim()) : [],
    example: item.example,
    exampleTranslation: item.exampleTranslation,
    source: "local_dictionary",
  };
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
  const entry = basicDictionary[normalizeWord(word)];
  return entry ? { ...entry, source: "basic_dictionary" } : null;
}

async function lookupGeneratedDictionary(word: string): Promise<DictionaryEntry | null> {
  const shard = await loadGeneratedDictionaryShard(dictionaryShardName(word));
  const generatedEntry = shard[normalizeWord(word)];
  return generatedEntry ? { ...generatedEntry, source: "basic_dictionary" } : null;
}

function lookupCache(word: string): DictionaryEntry | null {
  const entry = readCache()[normalizeWord(word)];
  return entry ? { ...entry, source: "cache" } : null;
}

async function lookupAi(word: string): Promise<DictionaryEntry> {
  const enriched = await requestAutoEnrich(word);
  const meaning = enriched.meanings.join("；") || "暂无释义";
  const entry: DictionaryEntry = {
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
  };
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

    if (!options.forceAi) {
      const embedded = lookupEmbeddedDictionary(clean);
      if (isUsefulEntry(embedded)) {
        writeCacheEntry(clean, embedded);
        return embedded;
      }

      const cached = lookupCache(clean);
      if (isUsefulEntry(cached)) return cached;

      if (options.preferLocal) {
        const local = await withTimeout(lookupLocalWord(clean), LOCAL_LOOKUP_TIMEOUT_MS, null);
        if (isUsefulEntry(local)) return local;
      }

      const generated = await lookupGeneratedDictionary(clean);
      if (isUsefulEntry(generated)) {
        writeCacheEntry(clean, generated);
        return generated;
      }

      if (!options.preferLocal) {
        const local = await withTimeout(lookupLocalWord(clean), LOCAL_LOOKUP_TIMEOUT_MS, null);
        if (isUsefulEntry(local)) return local;
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
