import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/services/auth-session";
import { scheduleCloudDataSync } from "@/services/cloud-sync-service";
import { initLocalDb } from "@/services/bootstrap-service";
import { syncSystemLexicons } from "@/services/system-lexicon-sync";
import type {
  Deck,
  LearnRecord,
  ReviewRecord,
  SessionRecord,
  UserSettings,
  WordItem,
  WordStatus,
} from "@/types/domain";

export type ImportSummary = {
  decks: number;
  words: number;
  learnRecords: number;
  reviewRecords: number;
  sessions: number;
  settings: number;
};

export type ImportPreview = ImportSummary & {
  format: "current_export" | "legacy_progress";
  deckNames: string[];
  sourceWordCount: number;
};

type LegacyState = {
  status?: string;
  level?: number;
  dueAt?: number | null;
  lastReviewedAt?: number | null;
  lastResult?: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  if (isObject(value)) return Object.values(value).map((item) => normalizeText(item)).filter(Boolean);
  return normalizeText(value) ? [normalizeText(value)] : [];
}

function mapLegacyStatus(state?: LegacyState): WordStatus {
  if (!state) return "unseen";
  if (state.status === "new") return "unseen";
  if ((state.level || 0) >= 4 && state.lastResult === "know") return "mastered";
  if ((state.lastResult === "dontKnow" || state.lastResult === "forgot") && (state.level || 0) <= 1) return "weak";
  if (typeof state.dueAt === "number" && state.dueAt <= Date.now()) return "due_review";
  return "learned_pending_review";
}

function mapLegacyMeaning(item: Record<string, unknown>) {
  const meaning = isObject(item.meaning) ? item.meaning : null;
  const zh = normalizeText(meaning?.zh);
  const en = normalizeText(meaning?.en);
  return [zh, en].filter(Boolean);
}

function mapLegacyCustomDeckName(lexiconKey: string) {
  const map: Record<string, string> = {
    graduate: "旧版导入：考研词汇",
    cet4: "旧版导入：四级词汇",
    cet6: "旧版导入：六级词汇",
    ielts: "旧版导入：雅思词汇",
  };
  return map[lexiconKey] || `旧版导入：${lexiconKey || "自定义词库"}`;
}

async function ensureImportedDeck(userId: string, legacyKey: string) {
  const name = mapLegacyCustomDeckName(legacyKey);
  const existing = (await db.decks.toArray()).find(
    (deck) => deck.userId === userId && deck.sourceType === "imported" && deck.name === name,
  );
  if (existing) return existing;

  const now = Date.now();
  const deck: Deck = {
    id: `imported-${legacyKey || "legacy"}-${crypto.randomUUID()}`,
    userId,
    name,
    description: "从旧版本本地数据导入的词库。",
    sourceType: "imported",
    totalCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.decks.put(deck);
  return deck;
}

function buildCurrentExportPreview(payload: Record<string, unknown>): ImportPreview {
  const decks = Array.isArray(payload.decks) ? payload.decks.filter(isObject) : [];
  const words = Array.isArray(payload.words) ? payload.words : [];
  const learnRecords = Array.isArray(payload.learnRecords) ? payload.learnRecords : [];
  const reviewRecords = Array.isArray(payload.reviewRecords) ? payload.reviewRecords : [];
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
  const settings = Array.isArray(payload.settings) ? payload.settings : [];

  return {
    format: "current_export",
    decks: decks.filter((deck) => normalizeText(deck.sourceType) !== "system").length,
    words: words.length,
    learnRecords: learnRecords.length,
    reviewRecords: reviewRecords.length,
    sessions: sessions.length,
    settings: settings.length > 0 ? 1 : 0,
    deckNames: decks
      .filter((deck) => normalizeText(deck.sourceType) !== "system")
      .map((deck) => normalizeText(deck.name))
      .filter(Boolean)
      .slice(0, 8),
    sourceWordCount: words.length,
  };
}

function buildLegacyProgressPreview(payload: Record<string, unknown>): ImportPreview {
  const customItems = Array.isArray(payload.customItems) ? payload.customItems.filter(isObject) : [];
  const itemStates = isObject(payload.itemStates) ? payload.itemStates : {};
  const deckNames = Array.from(
    new Set(
      customItems
        .map((item) => mapLegacyCustomDeckName(normalizeText(item.lexiconKey || "legacy")))
        .filter(Boolean),
    ),
  );

  return {
    format: "legacy_progress",
    decks: deckNames.length,
    words: customItems.length + Object.keys(itemStates).length,
    learnRecords: 0,
    reviewRecords: 0,
    sessions: 0,
    settings: 0,
    deckNames: deckNames.slice(0, 8),
    sourceWordCount: customItems.length,
  };
}

export function inspectImportPayload(payload: Record<string, unknown>): ImportPreview {
  return Array.isArray(payload.words) || Array.isArray(payload.decks)
    ? buildCurrentExportPreview(payload)
    : buildLegacyProgressPreview(payload);
}

export async function readImportFile(file: File) {
  const text = await file.text();
  const payload = JSON.parse(text) as Record<string, unknown>;
  return {
    payload,
    preview: inspectImportPayload(payload),
  };
}

export async function exportAllData() {
  const userId = requireCurrentUserId();
  const [decks, words, learnRecords, reviewRecords, sessions, settings, meta] = await Promise.all([
    db.decks.toArray(),
    db.words.toArray(),
    db.learnRecords.toArray(),
    db.reviewRecords.toArray(),
    db.sessions.toArray(),
    db.settings.toArray(),
    db.meta.toArray(),
  ]);

  return {
    exportedAt: Date.now(),
    userId,
    decks: decks.filter((deck) => deck.sourceType === "system" || deck.userId === userId),
    words: words.filter((word) => word.userId === userId),
    learnRecords: learnRecords.filter((record) => record.userId === userId),
    reviewRecords: reviewRecords.filter((record) => record.userId === userId),
    sessions: sessions.filter((session) => session.userId === userId),
    settings: settings.filter((item) => item.userId === userId),
    meta: meta.filter((item) => String(item.key).includes(userId) || String(item.key).includes("system_")),
  };
}

export async function clearLocalData() {
  const userId = requireCurrentUserId();
  await Promise.all([
    db.words.where("userId").equals(userId).delete(),
    db.learnRecords.where("userId").equals(userId).delete(),
    db.reviewRecords.where("userId").equals(userId).delete(),
    db.sessions.where("userId").equals(userId).delete(),
    db.settings.where("userId").equals(userId).delete(),
  ]);
  await db.meta.delete(`system_lexicons_synced_at:${userId}`);
  await initLocalDb();
}

async function importCurrentExportFormat(userId: string, payload: Record<string, unknown>) {
  const summary: ImportSummary = { decks: 0, words: 0, learnRecords: 0, reviewRecords: 0, sessions: 0, settings: 0 };

  const decks = Array.isArray(payload.decks) ? payload.decks : [];
  const words = Array.isArray(payload.words) ? payload.words : [];
  const learnRecords = Array.isArray(payload.learnRecords) ? payload.learnRecords : [];
  const reviewRecords = Array.isArray(payload.reviewRecords) ? payload.reviewRecords : [];
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
  const settings = Array.isArray(payload.settings) ? payload.settings : [];

  if (decks.length) {
    const normalizedDecks = decks
      .filter(isObject)
      .map((deck) => ({
        ...(deck as unknown as Deck),
        userId: (deck as Deck).sourceType === "system" ? undefined : userId,
      }));
    await db.decks.bulkPut(normalizedDecks);
    summary.decks = normalizedDecks.filter((deck) => deck.sourceType !== "system").length;
  }

  if (words.length) {
    const normalizedWords = words.filter(isObject).map((word) => {
      const item = word as unknown as WordItem;
      return { ...item, derivedForms: item.derivedForms || [], userId };
    });
    await db.words.bulkPut(normalizedWords);
    summary.words = normalizedWords.length;
  }

  if (learnRecords.length) {
    const normalizedRecords = learnRecords
      .filter(isObject)
      .map((record) => ({ ...(record as unknown as LearnRecord), userId }));
    await db.learnRecords.bulkPut(normalizedRecords);
    summary.learnRecords = normalizedRecords.length;
  }

  if (reviewRecords.length) {
    const normalizedRecords = reviewRecords
      .filter(isObject)
      .map((record) => ({ ...(record as unknown as ReviewRecord), userId }));
    await db.reviewRecords.bulkPut(normalizedRecords);
    summary.reviewRecords = normalizedRecords.length;
  }

  if (sessions.length) {
    const normalizedSessions = sessions
      .filter(isObject)
      .map((session) => ({ ...(session as unknown as SessionRecord), userId }));
    await db.sessions.bulkPut(normalizedSessions);
    summary.sessions = normalizedSessions.length;
  }

  if (settings.length && isObject(settings[0])) {
    const setting = settings[0] as UserSettings;
    await db.settings.put({ id: userId, ...setting, userId });
    summary.settings = 1;
  }

  return summary;
}

async function importLegacyProgressFormat(userId: string, payload: Record<string, unknown>) {
  await syncSystemLexicons(true).catch(() => undefined);

  const summary: ImportSummary = { decks: 0, words: 0, learnRecords: 0, reviewRecords: 0, sessions: 0, settings: 0 };
  const customItems = Array.isArray(payload.customItems) ? payload.customItems.filter(isObject) : [];
  const itemStates = isObject(payload.itemStates) ? payload.itemStates : {};

  const systemWords = await db.words.toArray();
  const systemWordMap = new Map<string, WordItem>();
  for (const word of systemWords.filter((item) => item.userId === userId)) {
    const parts = word.id.split(":");
    const legacyId = parts.length >= 3 ? parts.slice(2).join(":") : word.id;
    systemWordMap.set(legacyId, word);
  }

  const importedWordIds = new Set<string>();
  let updatedSystemWords = 0;

  for (const legacyItem of customItems) {
    const legacyId = normalizeText(legacyItem.id) || `legacy-${crypto.randomUUID()}`;
    const term = normalizeText(legacyItem.text);
    if (!term) continue;

    const legacyKey = normalizeText(legacyItem.lexiconKey || "legacy");
    const deck = await ensureImportedDeck(userId, legacyKey);
    const state = isObject(itemStates[legacyId]) ? (itemStates[legacyId] as LegacyState) : undefined;
    const meanings = mapLegacyMeaning(legacyItem);
    const now = Date.now();
    const wordId = `${userId}:imported:${legacyId}`;
    const example = isObject(legacyItem.example) ? legacyItem.example : {};
    const mnemonic = isObject(legacyItem.mnemonic) ? legacyItem.mnemonic : {};

    const word: WordItem = {
      id: wordId,
      userId,
      term,
      normalizedTerm: term.toLowerCase(),
      type: normalizeText(legacyItem.kind) === "phrase" ? "phrase" : "word",
      phonetic: normalizeText(legacyItem.phonetic),
      pronunciationUk: "",
      pronunciationUs: "",
      partOfSpeech: normalizeText(legacyItem.pos),
      meanings,
      example: normalizeText(example.en),
      exampleTranslation: normalizeText(example.zh),
      memoryHint: normalizeText(mnemonic.zh) || normalizeText(mnemonic.en),
      roots: [],
      derivedForms: [],
      synonyms: [],
      antonyms: [],
      collocations: [],
      imageUrl: undefined,
      tags: toStringArray(legacyItem.category),
      source: "imported",
      deckId: deck.id,
      difficultyLevel: 2,
      status: mapLegacyStatus(state),
      memoryStrength: Math.max(0, Number(state?.level || 0)),
      correctCount: state?.lastResult === "know" ? 1 : 0,
      wrongCount: state?.lastResult === "dontKnow" ? 1 : 0,
      hesitateCount: state?.lastResult === "vague" ? 1 : 0,
      learnCount: 1,
      reviewCount: state?.lastReviewedAt ? 1 : 0,
      lastStudiedAt: typeof legacyItem.createdAt === "number" ? legacyItem.createdAt : now,
      lastReviewedAt: typeof state?.lastReviewedAt === "number" ? state.lastReviewedAt : undefined,
      nextReviewAt: typeof state?.dueAt === "number" ? state.dueAt : undefined,
      createdAt: typeof legacyItem.createdAt === "number" ? legacyItem.createdAt : now,
      updatedAt: now,
      isStarred: false,
      isFocused: mapLegacyStatus(state) === "weak",
      isConfused: false,
      errorTags: [],
    };

    await db.words.put(word);
    importedWordIds.add(word.id);
  }

  for (const [legacyId, rawState] of Object.entries(itemStates)) {
    if (!isObject(rawState)) continue;
    const state = rawState as LegacyState;
    const systemWord = systemWordMap.get(legacyId);
    if (!systemWord) continue;

    await db.words.update(systemWord.id, {
      status: mapLegacyStatus(state),
      memoryStrength: Math.max(0, Number(state.level || 0)),
      lastReviewedAt: typeof state.lastReviewedAt === "number" ? state.lastReviewedAt : systemWord.lastReviewedAt,
      nextReviewAt: typeof state.dueAt === "number" ? state.dueAt : systemWord.nextReviewAt,
      isFocused: mapLegacyStatus(state) === "weak" ? true : systemWord.isFocused,
      updatedAt: Date.now(),
    });
    updatedSystemWords += 1;
  }

  const userDecks = (await db.decks.toArray()).filter((deck) => deck.userId === userId && deck.sourceType === "imported");
  for (const deck of userDecks) {
    const total = (await db.words.where("[userId+deckId]").equals([userId, deck.id]).count()) || 0;
    await db.decks.update(deck.id, { totalCount: total, updatedAt: Date.now() });
  }

  summary.decks = userDecks.length;
  summary.words = importedWordIds.size + updatedSystemWords;
  return summary;
}

export async function importDataPayload(payload: Record<string, unknown>) {
  const userId = requireCurrentUserId();

  const summary = Array.isArray(payload.words) || Array.isArray(payload.decks)
    ? await importCurrentExportFormat(userId, payload)
    : await importLegacyProgressFormat(userId, payload);

  scheduleCloudDataSync(50);
  return summary;
}

export async function importDataFile(file: File) {
  const { payload } = await readImportFile(file);
  return importDataPayload(payload);
}
