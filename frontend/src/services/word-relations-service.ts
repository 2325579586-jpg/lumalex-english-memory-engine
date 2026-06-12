import { db } from "@/lib/db";
import { apiUrl } from "@/services/api-base";
import { getAuthSession } from "@/services/auth-session";
import { readStorage, writeStorage } from "@/services/storage";
import type {
  WordRelation,
  WordRelationGroup,
  WordRelationsRequest,
  WordRelationsResponse,
  WordRelationType,
} from "@/types/word-relations";
import type { WordItem } from "@/types/domain";

const CACHE_KEY = "word_relations_cache_v1";

const groupMeta: Record<WordRelationType, Pick<WordRelationGroup, "type" | "title" | "description">> = {
  lookalike: {
    type: "lookalike",
    title: "长相近似",
    description: "容易和当前单词看混、拼错或读错的词",
  },
  synonym: {
    type: "synonym",
    title: "近义词",
    description: "意思接近，但语气或使用场景不同的词",
  },
  antonym: {
    type: "antonym",
    title: "反义词",
    description: "意思相反或方向相反的词",
  },
  derived: {
    type: "derived",
    title: "派生 / 相关词",
    description: "由当前单词派生出的词、短语或高频相关表达",
  },
};

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function compactText(value: unknown) {
  return String(value || "").trim();
}

function isSingleEnglishWord(value: string) {
  return /^[A-Za-z]+$/.test(value.trim());
}

function cacheKey(request: WordRelationsRequest) {
  return [
    normalizeTerm(request.word),
    compactText(request.partOfSpeech).toLowerCase(),
    compactText(request.definition).slice(0, 160),
    request.language || "zh-CN",
  ].join("|");
}

function readCache() {
  return readStorage<Record<string, WordRelationsResponse>>(CACHE_KEY, {});
}

function writeCacheEntry(key: string, value: WordRelationsResponse) {
  const cache = readCache();
  writeStorage(CACHE_KEY, { ...cache, [key]: value });
}

function sanitizeItem(value: unknown, groupType: WordRelationType): WordRelation | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const word = compactText(source.word);
  if (!word) return null;
  if (groupType === "lookalike" && !isSingleEnglishWord(word)) return null;
  return {
    word,
    phonetic: compactText(source.phonetic) || undefined,
    partOfSpeech: compactText(source.partOfSpeech),
    chinese: compactText(source.chinese),
    note: compactText(source.note),
    difference: compactText(source.difference) || undefined,
    example: compactText(source.example),
    exampleZh: compactText(source.exampleZh),
  };
}

export function normalizeWordRelationsResponse(payload: unknown, fallbackWord: string): WordRelationsResponse {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawGroups = Array.isArray(source.groups) ? source.groups : [];
  const groupMap = new Map<WordRelationType, WordRelationGroup>();

  for (const rawGroup of rawGroups) {
    if (!rawGroup || typeof rawGroup !== "object") continue;
    const groupSource = rawGroup as Record<string, unknown>;
    const type = compactText(groupSource.type) as WordRelationType;
    if (!groupMeta[type]) continue;
    const items = Array.isArray(groupSource.items)
      ? groupSource.items.map((item) => sanitizeItem(item, type)).filter((item): item is WordRelation => Boolean(item)).slice(0, 6)
      : [];
    groupMap.set(type, {
      ...groupMeta[type],
      title: compactText(groupSource.title) || groupMeta[type].title,
      description: compactText(groupSource.description) || groupMeta[type].description,
      items,
    });
  }

  return {
    word: compactText(source.word) || fallbackWord,
    groups: (Object.keys(groupMeta) as WordRelationType[]).map((type) => groupMap.get(type) || { ...groupMeta[type], items: [] }),
  };
}

export async function getWordRelations(request: WordRelationsRequest, options: { force?: boolean } = {}) {
  const cleanWord = request.word.trim();
  if (!cleanWord) {
    throw new Error("word is required");
  }

  const key = cacheKey({ ...request, word: cleanWord });
  if (!options.force) {
    const cached = readCache()[key];
    if (cached) return normalizeWordRelationsResponse(cached, cleanWord);
  }

  const response = await fetch(apiUrl("/word-relations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: cleanWord,
      definition: request.definition,
      partOfSpeech: request.partOfSpeech,
      language: request.language || "zh-CN",
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `word relations failed (${response.status})`);
  }

  const normalized = normalizeWordRelationsResponse(await response.json(), cleanWord);
  writeCacheEntry(key, normalized);
  return normalized;
}

export async function findExistingWord(term: string): Promise<WordItem | null> {
  const normalized = normalizeTerm(term);
  if (!normalized) return null;
  const session = getAuthSession();
  const matches = await db.words.where("normalizedTerm").equals(normalized).toArray();
  return (session ? matches.find((item) => item.userId === session.userId) : undefined) || matches[0] || null;
}
