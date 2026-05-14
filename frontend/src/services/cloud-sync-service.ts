import { db, type StoredSettings } from "@/lib/db";
import { apiUrl } from "@/services/api-base";
import { getAuthSession, withUserScopedKey } from "@/services/auth-session";
import { readStorage, writeStorage } from "@/services/storage";
import type { Deck, LearnRecord, ReviewRecord, SessionRecord, UserSettings, WordItem } from "@/types/domain";

const ACTIVE_LEARN_SESSION_KEY = "active-learn-session";
const ACTIVE_REVIEW_SESSION_KEY = "active-review-session";

type ActiveSessionSyncItem = {
  id: "learn" | "review";
  userId: string;
  snapshot: unknown;
  updatedAt: number;
};

type SyncCollections = {
  decks: Deck[];
  words: WordItem[];
  learnRecords: LearnRecord[];
  reviewRecords: ReviewRecord[];
  sessions: SessionRecord[];
  settings: UserSettings[];
  activeSessions: ActiveSessionSyncItem[];
};

export type CloudSyncStatus = "idle" | "queued" | "syncing" | "success" | "error";

export type CloudSyncState = {
  status: CloudSyncStatus;
  lastSyncedAt?: number;
  error?: string;
};

const CLOUD_SYNC_STATE_EVENT = "lumalex:cloud-sync-state";

let syncTimer: number | undefined;
let syncing = false;
let syncState: CloudSyncState = { status: "idle" };

function emitSyncState(next: CloudSyncState) {
  syncState = next;
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_STATE_EVENT, { detail: next }));
}

function isCloudRelevantWord(word: WordItem) {
  if (word.source !== "system") return true;

  return (
    word.status !== "unseen" ||
    word.memoryStrength > 0 ||
    word.correctCount > 0 ||
    word.wrongCount > 0 ||
    word.hesitateCount > 0 ||
    word.learnCount > 0 ||
    word.reviewCount > 0 ||
    Boolean(word.lastStudiedAt) ||
    Boolean(word.lastReviewedAt) ||
    Boolean(word.nextReviewAt) ||
    word.isStarred ||
    word.isFocused ||
    word.isConfused ||
    word.errorTags.length > 0
  );
}

function emptyCollections(): SyncCollections {
  return {
    decks: [],
    words: [],
    learnRecords: [],
    reviewRecords: [],
    sessions: [],
    settings: [],
    activeSessions: [],
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Cloud sync failed");
  }
  return payload;
}

function currentUserId() {
  return getAuthSession()?.userId || null;
}

function getSnapshotTimestamp(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return Date.now();
  const source = snapshot as Record<string, unknown>;
  const value = source.updatedAt || source.dwellStartedAt || source.questionStartedAt || source.startedAt;
  return typeof value === "number" ? value : Date.now();
}

function collectActiveSessions(userId: string): ActiveSessionSyncItem[] {
  const learnSnapshot = readStorage<unknown | null>(withUserScopedKey(ACTIVE_LEARN_SESSION_KEY), null);
  const reviewSnapshot = readStorage<unknown | null>(withUserScopedKey(ACTIVE_REVIEW_SESSION_KEY), null);
  return [
    learnSnapshot && {
      id: "learn" as const,
      userId,
      snapshot: learnSnapshot,
      updatedAt: getSnapshotTimestamp(learnSnapshot),
    },
    reviewSnapshot && {
      id: "review" as const,
      userId,
      snapshot: reviewSnapshot,
      updatedAt: getSnapshotTimestamp(reviewSnapshot),
    },
  ].filter(Boolean) as ActiveSessionSyncItem[];
}

async function collectLocalData(userId: string): Promise<SyncCollections> {
  const [decks, words, learnRecords, reviewRecords, sessions, settings] = await Promise.all([
    db.decks.toArray(),
    db.words.toArray(),
    db.learnRecords.toArray(),
    db.reviewRecords.toArray(),
    db.sessions.toArray(),
    db.settings.toArray(),
  ]);

  return {
    decks: decks.filter((deck) => deck.sourceType !== "system" && deck.userId === userId),
    words: words.filter((word) => word.userId === userId && isCloudRelevantWord(word)),
    learnRecords: learnRecords.filter((record) => record.userId === userId),
    reviewRecords: reviewRecords.filter((record) => record.userId === userId),
    sessions: sessions.filter((session) => session.userId === userId),
    settings: settings
      .filter((item) => item.userId === userId)
      .map(({ id: _id, ...setting }) => setting),
    activeSessions: collectActiveSessions(userId),
  };
}

function normalizeSettings(userId: string, settings: UserSettings[]): StoredSettings[] {
  return settings.map((setting) => ({ ...setting, id: userId, userId }));
}

function normalizeCollections(userId: string, collections?: Partial<SyncCollections>): SyncCollections {
  const source = { ...emptyCollections(), ...(collections || {}) };
  return {
    decks: source.decks.map((deck) => ({ ...deck, userId: deck.sourceType === "system" ? deck.userId : userId })),
    words: source.words.map((word) => ({ ...word, userId })),
    learnRecords: source.learnRecords.map((record) => ({ ...record, userId })),
    reviewRecords: source.reviewRecords.map((record) => ({ ...record, userId })),
    sessions: source.sessions.map((session) => ({ ...session, userId })),
    settings: source.settings.map((setting) => ({ ...setting, userId })),
    activeSessions: source.activeSessions
      .filter((item) => item.id === "learn" || item.id === "review")
      .map((item) => ({ ...item, userId })),
  };
}

async function applyRemoteData(userId: string, collections?: Partial<SyncCollections>, options: { pruneMissing?: boolean } = {}) {
  const normalized = normalizeCollections(userId, collections);
  await db.transaction("rw", [db.decks, db.words, db.learnRecords, db.reviewRecords, db.sessions, db.settings], async () => {
    if (options.pruneMissing) {
      const remoteCustomWordIds = new Set(normalized.words.filter((word) => word.source !== "system").map((word) => word.id));
      const localWords = (await db.words.toArray()).filter((word) => word.userId === userId && word.source !== "system");
      const removedWordIds = localWords.filter((word) => !remoteCustomWordIds.has(word.id)).map((word) => word.id);
      if (removedWordIds.length) await db.words.bulkDelete(removedWordIds);

      const remoteDeckIds = new Set(normalized.decks.map((deck) => deck.id));
      const localCustomDecks = (await db.decks.toArray()).filter((deck) => deck.sourceType !== "system" && deck.userId === userId);
      const removedDeckIds = localCustomDecks.filter((deck) => !remoteDeckIds.has(deck.id)).map((deck) => deck.id);
      if (removedDeckIds.length) await db.decks.bulkDelete(removedDeckIds);
    }

    if (normalized.decks.length) await db.decks.bulkPut(normalized.decks);
    if (normalized.words.length) await db.words.bulkPut(normalized.words);
    if (normalized.learnRecords.length) await db.learnRecords.bulkPut(normalized.learnRecords);
    if (normalized.reviewRecords.length) await db.reviewRecords.bulkPut(normalized.reviewRecords);
    if (normalized.sessions.length) await db.sessions.bulkPut(normalized.sessions);
    if (normalized.settings.length) await db.settings.bulkPut(normalizeSettings(userId, normalized.settings));
  });

  for (const item of normalized.activeSessions) {
    const storageKey = item.id === "learn" ? ACTIVE_LEARN_SESSION_KEY : ACTIVE_REVIEW_SESSION_KEY;
    const scopedKey = withUserScopedKey(storageKey);
    const localSnapshot = readStorage<unknown | null>(scopedKey, null);
    if (!localSnapshot || getSnapshotTimestamp(localSnapshot) <= item.updatedAt) {
      writeStorage(scopedKey, item.snapshot);
    }
  }
}

export async function syncCloudData(options: { pushFirst?: boolean } = {}) {
  if (syncing) return;
  const userId = currentUserId();
  if (!userId) return;

  syncing = true;
  emitSyncState({ status: "syncing", lastSyncedAt: syncState.lastSyncedAt });
  try {
    const hadSynced = Boolean(await db.meta.get(`cloud_synced_at:${userId}`));
    if (options.pushFirst) {
      const localCollections = await collectLocalData(userId);
      await postJson("/sync/push", { userId, collections: localCollections, replace: true });
    }

    const pull = await postJson<{ collections?: Partial<SyncCollections> }>("/sync/pull", { userId });
    await applyRemoteData(userId, pull.collections, { pruneMissing: hadSynced || options.pushFirst });
    const collections = await collectLocalData(userId);
    await postJson("/sync/push", { userId, collections, replace: true });
    const syncedAt = Date.now();
    await db.meta.put({ key: `cloud_synced_at:${userId}`, value: syncedAt });
    emitSyncState({ status: "success", lastSyncedAt: syncedAt });
    window.dispatchEvent(new CustomEvent("lumalex:cloud-sync"));
  } catch (error) {
    emitSyncState({
      status: "error",
      lastSyncedAt: syncState.lastSyncedAt,
      error: error instanceof Error ? error.message : "同步失败，请稍后重试。",
    });
    throw error;
  } finally {
    syncing = false;
  }
}

export async function getLastCloudSyncedAt() {
  const userId = currentUserId();
  if (!userId) return undefined;
  const item = await db.meta.get(`cloud_synced_at:${userId}`);
  return typeof item?.value === "number" ? item.value : undefined;
}

export function scheduleCloudDataSync(delayMs = 1200) {
  if (!currentUserId()) return;
  if (syncTimer) window.clearTimeout(syncTimer);
  emitSyncState({ status: "queued", lastSyncedAt: syncState.lastSyncedAt });
  syncTimer = window.setTimeout(() => {
    void syncCloudData({ pushFirst: true }).catch(() => undefined);
  }, delayMs);
}

export function flushCloudDataSync() {
  if (syncTimer) {
    window.clearTimeout(syncTimer);
    syncTimer = undefined;
  }
  void syncCloudData({ pushFirst: true }).catch(() => undefined);
}

export function getCloudSyncState() {
  return syncState;
}

export function subscribeCloudSyncState(listener: (state: CloudSyncState) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CloudSyncState>).detail;
    if (detail) {
      listener(detail);
    }
  };
  window.addEventListener(CLOUD_SYNC_STATE_EVENT, handler as EventListener);
  return () => window.removeEventListener(CLOUD_SYNC_STATE_EVENT, handler as EventListener);
}
