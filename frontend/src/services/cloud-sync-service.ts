import type { Table } from "dexie";
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
  deletions: DeletionSyncItem[];
};

type DeletionSyncItem = {
  id: string;
  userId: string;
  collection: Exclude<keyof SyncCollections, "deletions">;
  itemId: string;
  deletedAt: number;
  updatedAt: number;
};

export type CloudSyncStatus = "idle" | "queued" | "syncing" | "success" | "error";

export type CloudSyncState = {
  status: CloudSyncStatus;
  lastSyncedAt?: number;
  error?: string;
};

const CLOUD_SYNC_STATE_EVENT = "lumalex:cloud-sync-state";
const DELETION_LOG_KEY = "cloud_deletion_log";

let syncTimer: number | undefined;
let syncing = false;
let currentSyncPromise: Promise<void> | undefined;
let pendingSync = false;
let pendingPushFirst = false;
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
    deletions: [],
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

function currentSyncToken() {
  return getAuthSession()?.syncToken || null;
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

function readDeletionLog(userId: string): DeletionSyncItem[] {
  return readStorage<DeletionSyncItem[]>(withUserScopedKey(DELETION_LOG_KEY), []).filter(
    (item) => item.userId === userId && Boolean(item.collection) && Boolean(item.itemId),
  );
}

function writeDeletionLog(userId: string, items: DeletionSyncItem[]) {
  const deduped = Array.from(new Map(items.map((item) => [item.id, item])).values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 500);
  writeStorage(withUserScopedKey(DELETION_LOG_KEY), deduped);
}

export function recordCloudDeletion(collection: DeletionSyncItem["collection"], itemIds: string | string[]) {
  const userId = currentUserId();
  if (!userId) return;
  const now = Date.now();
  const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
  const next: DeletionSyncItem[] = ids.filter(Boolean).map((itemId) => ({
    id: `${collection}:${itemId}`,
    userId,
    collection,
    itemId,
    deletedAt: now,
    updatedAt: now,
  }));
  writeDeletionLog(userId, [...readDeletionLog(userId), ...next]);
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
    settings: settings.filter((item) => item.userId === userId).map(({ id: _id, ...setting }) => setting),
    activeSessions: collectActiveSessions(userId),
    deletions: readDeletionLog(userId),
  };
}

function normalizeSettings(userId: string, settings: UserSettings[]): StoredSettings[] {
  return settings.map((setting) => ({ ...setting, id: userId, userId }));
}

function normalizeCollections(userId: string, collections?: Partial<SyncCollections>): SyncCollections {
  const source = { ...emptyCollections(), ...(collections || {}) };
  return {
    decks: source.decks.map((deck) => ({ ...deck, userId: deck.sourceType === "system" ? deck.userId : userId })),
    words: source.words.map((word) => ({ ...word, derivedForms: word.derivedForms || [], userId })),
    learnRecords: source.learnRecords.map((record) => ({ ...record, userId })),
    reviewRecords: source.reviewRecords.map((record) => ({ ...record, userId })),
    sessions: source.sessions.map((session) => ({ ...session, userId })),
    settings: source.settings.map((setting) => ({ ...setting, userId })),
    activeSessions: source.activeSessions
      .filter((item) => item.id === "learn" || item.id === "review")
      .map((item) => ({ ...item, userId })),
    deletions: source.deletions
      .filter((item) => item.collection && item.itemId)
      .map((item) => ({ ...item, id: item.id || `${item.collection}:${item.itemId}`, userId })),
  };
}

function itemTimestamp(item: unknown) {
  if (!item || typeof item !== "object") return 0;
  const source = item as Record<string, unknown>;
  const value =
    source.updatedAt ||
    source.lastUpdatedAt ||
    source.lastStudiedAt ||
    source.lastReviewedAt ||
    source.endedAt ||
    source.createdAt ||
    source.startedAt;
  return typeof value === "number" ? value : 0;
}

async function bulkPutRemoteNewer<T extends { id: string }>(table: Table<T, string>, remoteItems: T[]) {
  if (!remoteItems.length) return;
  const localItems = await table.bulkGet(remoteItems.map((item) => item.id));
  const newerItems = remoteItems.filter((remoteItem, index) => {
    const localItem = localItems[index];
    return !localItem || itemTimestamp(remoteItem) >= itemTimestamp(localItem);
  });
  if (newerItems.length) {
    await table.bulkPut(newerItems);
  }
}

function isSnapshotWithWordIds(snapshot: unknown): snapshot is Record<string, unknown> & { wordIds: string[] } {
  return Boolean(snapshot && typeof snapshot === "object" && Array.isArray((snapshot as { wordIds?: unknown }).wordIds));
}

function closeActiveSnapshot(snapshot: Record<string, unknown>, timestampKey: "dwellStartedAt" | "questionStartedAt") {
  const now = Date.now();
  return {
    ...snapshot,
    wordIds: [],
    currentIndex: 0,
    [timestampKey]: now,
    updatedAt: now,
  };
}

async function reconcileActiveLearnSession(userId: string) {
  const scopedKey = withUserScopedKey(ACTIVE_LEARN_SESSION_KEY);
  const snapshot = readStorage<unknown | null>(scopedKey, null);
  if (!isSnapshotWithWordIds(snapshot) || !snapshot.wordIds.length) return;

  const words = await db.words.bulkGet(snapshot.wordIds);
  const activeWordIds = snapshot.wordIds.filter((_, index) => {
    const word = words[index];
    return word?.userId === userId && (word.status === "unseen" || word.status === "learning");
  });

  if (!activeWordIds.length) {
    writeStorage(scopedKey, closeActiveSnapshot(snapshot, "dwellStartedAt"));
    return;
  }

  const currentIndex = typeof snapshot.currentIndex === "number" ? snapshot.currentIndex : 0;
  if (activeWordIds.length !== snapshot.wordIds.length || currentIndex >= activeWordIds.length) {
    writeStorage(scopedKey, {
      ...snapshot,
      wordIds: activeWordIds,
      currentIndex: Math.min(currentIndex, activeWordIds.length - 1),
      updatedAt: Date.now(),
    });
  }
}

async function reconcileActiveReviewSession(userId: string) {
  const scopedKey = withUserScopedKey(ACTIVE_REVIEW_SESSION_KEY);
  const snapshot = readStorage<unknown | null>(scopedKey, null);
  if (!isSnapshotWithWordIds(snapshot) || !snapshot.wordIds.length) return;

  const words = await db.words.bulkGet(snapshot.wordIds);
  const activeWordIds = snapshot.wordIds.filter((_, index) => {
    const word = words[index];
    return word?.userId === userId && word.status === "reviewing";
  });

  if (!activeWordIds.length) {
    writeStorage(scopedKey, closeActiveSnapshot(snapshot, "questionStartedAt"));
    return;
  }

  const currentIndex = typeof snapshot.currentIndex === "number" ? snapshot.currentIndex : 0;
  if (activeWordIds.length !== snapshot.wordIds.length || currentIndex >= activeWordIds.length) {
    writeStorage(scopedKey, {
      ...snapshot,
      wordIds: activeWordIds,
      currentIndex: Math.min(currentIndex, activeWordIds.length - 1),
      updatedAt: Date.now(),
    });
  }
}

async function reconcileActiveSessions(userId: string) {
  await Promise.all([reconcileActiveLearnSession(userId), reconcileActiveReviewSession(userId)]);
}

async function getLocalDeletionTargetTimestamp(userId: string, deletion: DeletionSyncItem) {
  if (deletion.collection === "words") return itemTimestamp(await db.words.get(deletion.itemId));
  if (deletion.collection === "decks") return itemTimestamp(await db.decks.get(deletion.itemId));
  if (deletion.collection === "learnRecords") return itemTimestamp(await db.learnRecords.get(deletion.itemId));
  if (deletion.collection === "reviewRecords") return itemTimestamp(await db.reviewRecords.get(deletion.itemId));
  if (deletion.collection === "sessions") return itemTimestamp(await db.sessions.get(deletion.itemId));
  if (deletion.collection === "settings") return itemTimestamp(await db.settings.get(userId));
  return 0;
}

async function applyRemoteData(userId: string, collections?: Partial<SyncCollections>) {
  const normalized = normalizeCollections(userId, collections);
  await db.transaction("rw", [db.decks, db.words, db.learnRecords, db.reviewRecords, db.sessions, db.settings], async () => {
    await bulkPutRemoteNewer(db.decks, normalized.decks);
    await bulkPutRemoteNewer(db.words, normalized.words);
    await bulkPutRemoteNewer(db.learnRecords, normalized.learnRecords);
    await bulkPutRemoteNewer(db.reviewRecords, normalized.reviewRecords);
    await bulkPutRemoteNewer(db.sessions, normalized.sessions);
    await bulkPutRemoteNewer(db.settings, normalizeSettings(userId, normalized.settings));

    for (const deletion of normalized.deletions) {
      const targetTimestamp = await getLocalDeletionTargetTimestamp(userId, deletion);
      if (targetTimestamp > deletion.deletedAt) continue;

      if (deletion.collection === "words") await db.words.delete(deletion.itemId);
      if (deletion.collection === "decks") await db.decks.delete(deletion.itemId);
      if (deletion.collection === "learnRecords") await db.learnRecords.delete(deletion.itemId);
      if (deletion.collection === "reviewRecords") await db.reviewRecords.delete(deletion.itemId);
      if (deletion.collection === "sessions") await db.sessions.delete(deletion.itemId);
      if (deletion.collection === "settings") await db.settings.delete(userId);
    }
  });

  if (normalized.deletions.length) {
    writeDeletionLog(userId, [...readDeletionLog(userId), ...normalized.deletions]);
  }

  for (const item of normalized.activeSessions) {
    const storageKey = item.id === "learn" ? ACTIVE_LEARN_SESSION_KEY : ACTIVE_REVIEW_SESSION_KEY;
    const scopedKey = withUserScopedKey(storageKey);
    const localSnapshot = readStorage<unknown | null>(scopedKey, null);
    if (!localSnapshot || getSnapshotTimestamp(localSnapshot) <= item.updatedAt) {
      writeStorage(scopedKey, item.snapshot);
    }
  }

  await reconcileActiveSessions(userId);
}

export async function syncCloudData(options: { pushFirst?: boolean } = {}) {
  if (syncing) {
    pendingSync = true;
    pendingPushFirst = pendingPushFirst || Boolean(options.pushFirst);
    emitSyncState({ status: "queued", lastSyncedAt: syncState.lastSyncedAt });
    return currentSyncPromise;
  }

  const userId = currentUserId();
  const syncToken = currentSyncToken();
  if (!userId || !syncToken) return;

  syncing = true;
  currentSyncPromise = (async () => {
    emitSyncState({ status: "syncing", lastSyncedAt: syncState.lastSyncedAt });
    try {
      if (options.pushFirst) {
        const localCollections = await collectLocalData(userId);
        await postJson("/sync/push", { userId, syncToken, collections: localCollections });
      }

      const pull = await postJson<{ collections?: Partial<SyncCollections> }>("/sync/pull", { userId, syncToken });
      await applyRemoteData(userId, pull.collections);
      const collections = await collectLocalData(userId);
      await postJson("/sync/push", { userId, syncToken, collections });
      const syncedAt = Date.now();
      await db.meta.put({ key: `cloud_synced_at:${userId}`, value: syncedAt });
      emitSyncState({ status: "success", lastSyncedAt: syncedAt });
      window.dispatchEvent(new CustomEvent("lumalex:cloud-sync"));
    } catch (error) {
      emitSyncState({
        status: "error",
        lastSyncedAt: syncState.lastSyncedAt,
        error: error instanceof Error ? error.message : "Cloud sync failed",
      });
      throw error;
    } finally {
      syncing = false;
      currentSyncPromise = undefined;
      if (pendingSync) {
        const shouldPushFirst = pendingPushFirst;
        pendingSync = false;
        pendingPushFirst = false;
        void syncCloudData({ pushFirst: shouldPushFirst }).catch(() => undefined);
      }
    }
  })();

  return currentSyncPromise;
}

export async function getLastCloudSyncedAt() {
  const userId = currentUserId();
  if (!userId) return undefined;
  const item = await db.meta.get(`cloud_synced_at:${userId}`);
  return typeof item?.value === "number" ? item.value : undefined;
}

export function scheduleCloudDataSync(delayMs = 600) {
  if (!currentUserId()) return;
  if (syncTimer) window.clearTimeout(syncTimer);
  emitSyncState({ status: "queued", lastSyncedAt: syncState.lastSyncedAt });
  syncTimer = window.setTimeout(() => {
    syncTimer = undefined;
    void syncCloudData({ pushFirst: true }).catch(() => undefined);
  }, delayMs);
}

export function flushCloudDataSync() {
  if (syncTimer) {
    window.clearTimeout(syncTimer);
    syncTimer = undefined;
  }
  return syncCloudData({ pushFirst: true }).catch(() => undefined);
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
