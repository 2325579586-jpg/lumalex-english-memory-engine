import { db } from "@/lib/db";
import { deckRepository } from "@/repositories/deck-repository";
import { wordRepository } from "@/repositories/word-repository";
import { requireCurrentUserId } from "@/services/auth-session";
import { getLexiconCatalog, getLexiconItems } from "@/services/lexicon-service";
import type { BackendLexiconDto, BackendLexiconItemDto } from "@/types/api";
import type { Deck, WordItem, WordStatus } from "@/types/domain";

function normalizeTerm(term: string) {
  return term.trim().toLowerCase();
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value as Record<string, unknown>)
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function toMeaningList(item: BackendLexiconItemDto) {
  const zh = item.meaning?.zh?.trim();
  const en = item.meaning?.en?.trim();
  return [zh, en].filter(Boolean) as string[];
}

function getInitialStatus(item?: Partial<WordItem>): WordStatus {
  if (!item) return "unseen";
  if (item.nextReviewAt && item.nextReviewAt <= Date.now()) return "due_review";
  return item.status ?? "unseen";
}

function getDifficultyLevel(value: BackendLexiconItemDto["difficulty"]) {
  if (!value) return 2;
  const raw = typeof value === "object" ? value.zh || value.en || "" : String(value);
  if (raw.includes("难")) return 3;
  if (raw.includes("易") || raw.includes("简单")) return 1;
  return 2;
}

function mapLexiconToDeck(dto: BackendLexiconDto, existing?: Deck): Deck {
  const now = Date.now();
  return {
    id: dto.id,
    name: dto.name?.zh || dto.name?.en || dto.id,
    description: dto.name?.en ? `${dto.name.en} 词库` : "系统词库",
    sourceType: "system",
    totalCount: dto.itemCount || dto.item_count || existing?.totalCount || 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function mapItemToWord(userId: string, deckId: string, dto: BackendLexiconItemDto, existing?: WordItem): WordItem {
  const now = Date.now();
  const term = dto.text.trim();
  return {
    id: existing?.id ?? `${userId}:${deckId}:${dto.id}`,
    userId,
    term,
    normalizedTerm: normalizeTerm(term),
    type: dto.kind === "phrase" ? "phrase" : "word",
    phonetic: dto.phonetic || existing?.phonetic || "",
    pronunciationUk: dto.audioUrl || existing?.pronunciationUk || "",
    pronunciationUs: dto.audioUrl || existing?.pronunciationUs || "",
    partOfSpeech: dto.pos || existing?.partOfSpeech || "",
    meanings: toMeaningList(dto).length ? toMeaningList(dto) : existing?.meanings || [],
    example: dto.example?.en || existing?.example || "",
    exampleTranslation: dto.example?.zh || existing?.exampleTranslation || "",
    memoryHint: dto.mnemonic?.zh || existing?.memoryHint || "",
    roots: existing?.roots || [],
    derivedForms: existing?.derivedForms || [],
    synonyms: existing?.synonyms || [],
    antonyms: existing?.antonyms || [],
    collocations: existing?.collocations || [],
    imageUrl: existing?.imageUrl,
    tags: Array.from(new Set([...(existing?.tags || []), ...toArray(dto.category)])),
    source: "system",
    deckId,
    difficultyLevel: existing?.difficultyLevel ?? getDifficultyLevel(dto.difficulty),
    status: getInitialStatus(existing),
    memoryStrength: existing?.memoryStrength ?? 0,
    correctCount: existing?.correctCount ?? 0,
    wrongCount: existing?.wrongCount ?? 0,
    hesitateCount: existing?.hesitateCount ?? 0,
    learnCount: existing?.learnCount ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    lastStudiedAt: existing?.lastStudiedAt,
    lastReviewedAt: existing?.lastReviewedAt,
    nextReviewAt: existing?.nextReviewAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    isStarred: existing?.isStarred ?? false,
    isFocused: existing?.isFocused ?? false,
    isConfused: existing?.isConfused ?? false,
    errorTags: existing?.errorTags ?? [],
  };
}

async function syncLexiconWords(userId: string, deckId: string) {
  const payload = await getLexiconItems(deckId);
  const existingWords = await wordRepository.listByDeck(deckId);
  const existingMap = new Map(existingWords.map((item) => [item.id, item]));
  const mapped = payload.items.map((item) =>
    mapItemToWord(userId, deckId, item, existingMap.get(`${userId}:${deckId}:${item.id}`)),
  );
  await wordRepository.bulkUpsert(mapped);
}

type SyncSystemLexiconOptions = {
  includeWords?: boolean;
};

export async function syncSystemLexicons(force = false, options: SyncSystemLexiconOptions = {}) {
  const userId = requireCurrentUserId();
  const includeWords = options.includeWords ?? true;
  const catalogKey = `system_lexicon_catalog_synced_at:${userId}`;
  const wordsKey = `system_lexicon_words_synced_at:${userId}`;
  const alreadySynced = await db.meta.get(includeWords ? wordsKey : catalogKey);
  if (alreadySynced && !force) {
    return;
  }

  const lexicons = await getLexiconCatalog();
  const existingDecks = await db.decks.toArray();
  const existingMap = new Map(existingDecks.map((deck) => [deck.id, deck]));
  const mappedDecks = lexicons.map((lexicon) => mapLexiconToDeck(lexicon, existingMap.get(lexicon.id)));

  await db.decks.bulkPut(mappedDecks);

  await db.meta.put({ key: catalogKey, value: Date.now() });

  if (!includeWords) {
    return;
  }

  for (const deck of mappedDecks) {
    await syncLexiconWords(userId, deck.id);
  }

  await db.meta.put({ key: wordsKey, value: Date.now() });
}
