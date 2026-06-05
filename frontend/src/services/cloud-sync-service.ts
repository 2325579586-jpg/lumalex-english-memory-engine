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

export type CloudSyncErrorDetail = {
  phase?: "push" | "pull" | "apply" | "unknown";
  path?: string;
  status?: number;
  message: string;
  userId?: string;
  requestCounts?: Record<string, number>;
  responseBody?: unknown;
  lastSyncedAt?: number;
  pendingCount?: number;
};

export type CloudSyncState = {
  status: CloudSyncStatus;
  lastSyncedAt?: number;
  error?: string;
  errorDetail?: CloudSyncErrorDetail;
  pendingCount?: number;
  nextRetryAt?: number;
};

const CLOUD_SYNC_STATE_EVENT = "lumalex:cloud-sync-state";
const DELETION_LOG_KEY = "cloud_deletion_log";
const PENDING_SYNC_QUEUE_KEY = "cloud_pending_sync_queue";
const REQUEST_TIMEOUT_MS = 45_000;
const PUSH_CHUNK_SIZE = 25;
const PULL_PAGE_SIZE = 250;
const SYNC_OVERLAP_MS = 5 * 60 * 1000;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000];

let syncTimer: number | undefined;
let retryTimer: number | undefined;
let syncing = false;
let currentSyncPromise: Promise<void> | undefined;
let pendingSync = false;
let pendingPushFirst = false;
let deferredVisibleSync = false;
let deferredVisiblePushFirst = false;
let retryAttempt = 0;
let syncState: CloudSyncState = { status: "idle" };

function emitSyncState(next: CloudSyncState) {
  syncState = next;
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_STATE_EVENT, { detail: next }));
}

function isDocumentHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function clearDeferredVisibleSync() {
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", runDeferredVisibleSync);
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("pageshow", runDeferredVisibleSync);
    window.removeEventListener("focus", runDeferredVisibleSync);
  }
}

function runDeferredVisibleSync() {
  if (!deferredVisibleSync || isDocumentHidden()) return;
  const pushFirst = deferredVisiblePushFirst;
  deferredVisibleSync = false;
  deferredVisiblePushFirst = false;
  clearDeferredVisibleSync();
  void syncCloudData({ pushFirst }).catch(() => undefined);
}

function deferSyncUntilVisible(pushFirst: boolean) {
  deferredVisibleSync = true;
  deferredVisiblePushFirst = deferredVisiblePushFirst || pushFirst;
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", runDeferredVisibleSync);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pageshow", runDeferredVisibleSync);
    window.addEventListener("focus", runDeferredVisibleSync);
  }
}

class CloudSyncError extends Error {
  detail: CloudSyncErrorDetail;

  constructor(detail: CloudSyncErrorDetail) {
    super(detail.message || "Cloud sync failed");
    this.name = "CloudSyncError";
    this.detail = detail;
  }
}

function getPendingSyncQueue(userId: string) {
  return readStorage<Array<{ id: string; dataType: string; itemId?: string; updatedAt: number }>>(
    withUserScopedKey(PENDING_SYNC_QUEUE_KEY),
    [],
  ).filter((item) => item?.id && item?.dataType && item.updatedAt);
}

function writePendingSyncQueue(userId: string, items: Array<{ id: string; dataType: string; itemId?: string; updatedAt: number }>) {
  const deduped = Array.from(new Map(items.map((item) => [item.id, item])).values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 1000);
  writeStorage(withUserScopedKey(PENDING_SYNC_QUEUE_KEY), deduped);
}

export function markCloudDataDirty(dataType = "localData", itemId = "pending") {
  const userId = currentUserId();
  if (!userId) return;
  const now = Date.now();
  writePendingSyncQueue(userId, [
    ...getPendingSyncQueue(userId),
    {
      id: `${dataType}:${itemId}`,
      dataType,
      itemId,
      updatedAt: now,
    },
  ]);
}

export function getPendingCloudSyncCount() {
  const userId = currentUserId();
  return userId ? getPendingSyncQueue(userId).length : 0;
}

export function hasPendingCloudSync() {
  return getPendingCloudSyncCount() > 0;
}

function clearPendingCloudSync(userId: string) {
  writePendingSyncQueue(userId, []);
}

function collectionCounts(collections?: Partial<SyncCollections>) {
  const source = collections || {};
  return Object.fromEntries(
    (Object.keys(emptyCollections()) as Array<keyof SyncCollections>).map((key) => {
      const value = source[key];
      return [key, Array.isArray(value) ? value.length : 0];
    }),
  );
}

function describeSyncError(error: unknown, fallbackPhase: CloudSyncErrorDetail["phase"] = "unknown"): CloudSyncErrorDetail {
  if (error instanceof CloudSyncError) return error.detail;
  return {
    phase: fallbackPhase,
    message: error instanceof Error ? error.message : "Cloud sync failed",
    userId: currentUserId() || undefined,
    lastSyncedAt: syncState.lastSyncedAt,
    pendingCount: getPendingCloudSyncCount(),
  };
}

function logSyncError(detail: CloudSyncErrorDetail) {
  console.error("[LumaLex Sync] Cloud sync failed", {
    userId: detail.userId,
    phase: detail.phase,
    path: detail.path,
    status: detail.status,
    message: detail.message,
    requestCounts: detail.requestCounts,
    pendingCount: detail.pendingCount,
    lastSyncedAt: detail.lastSyncedAt,
    responseBody: detail.responseBody,
  });
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

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  detail: Pick<CloudSyncErrorDetail, "phase" | "requestCounts"> = {},
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response | undefined;
  let payload: (T & { error?: string }) | undefined;

  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  } catch (error) {
    throw new CloudSyncError({
      phase: detail.phase,
      path: apiUrl(path),
      message: error instanceof Error && error.name === "AbortError" ? "云同步请求超时，稍后会自动重试" : error instanceof Error ? error.message : "网络异常，稍后会自动重试",
      userId: currentUserId() || undefined,
      requestCounts: detail.requestCounts,
      lastSyncedAt: syncState.lastSyncedAt,
      pendingCount: getPendingCloudSyncCount(),
    });
  } finally {
    window.clearTimeout(timer);
  }

  if (!response.ok) {
    throw new CloudSyncError({
      phase: detail.phase,
      path: apiUrl(path),
      status: response.status,
      message:
        response.status === 401
          ? "登录状态失效，请重新登录"
          : payload?.error || `云端接口异常（HTTP ${response.status}）`,
      userId: currentUserId() || undefined,
      requestCounts: detail.requestCounts,
      responseBody: payload,
      lastSyncedAt: syncState.lastSyncedAt,
      pendingCount: getPendingCloudSyncCount(),
    });
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
  markCloudDataDirty("deletions", collection);
}

function isChangedSince(item: unknown, since?: number) {
  if (!since) return true;
  return itemTimestamp(item) >= since;
}

async function collectLocalData(userId: string, options: { since?: number; full?: boolean } = {}): Promise<SyncCollections> {
  const [decks, words, learnRecords, reviewRecords, sessions, settings] = await Promise.all([
    db.decks.toArray(),
    db.words.toArray(),
    db.learnRecords.toArray(),
    db.reviewRecords.toArray(),
    db.sessions.toArray(),
    db.settings.toArray(),
  ]);
  const since = options.full ? undefined : options.since;

  return {
    decks: decks.filter((deck) => deck.sourceType !== "system" && deck.userId === userId && isChangedSince(deck, since)),
    words: words.filter((word) => word.userId === userId && isCloudRelevantWord(word) && isChangedSince(word, since)),
    learnRecords: learnRecords.filter((record) => record.userId === userId && isChangedSince(record, since)),
    reviewRecords: reviewRecords.filter((record) => record.userId === userId && isChangedSince(record, since)),
    sessions: sessions.filter((session) => session.userId === userId && isChangedSince(session, since)),
    settings: settings.filter((item) => item.userId === userId && isChangedSince(item, since)).map(({ id: _id, ...setting }) => setting),
    activeSessions: collectActiveSessions(userId).filter((item) => isChangedSince(item, since)),
    deletions: readDeletionLog(userId).filter((item) => isChangedSince(item, since)),
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

function chunkItems(items: unknown[], size = PUSH_CHUNK_SIZE) {
  const chunks: unknown[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function pushLocalCollections(userId: string, syncToken: string, collections: SyncCollections) {
  const keys = Object.keys(collections) as Array<keyof SyncCollections>;
  for (const key of keys) {
    const items = collections[key];
    if (!items.length) continue;

    for (const chunk of chunkItems(items as unknown[])) {
      await postJson(
        "/sync/push",
        {
          userId,
          syncToken,
          collections: {
            [key]: chunk,
          },
        },
        {
          phase: "push",
          requestCounts: { [key]: chunk.length },
        },
      );
    }
  }
}

async function pullRemoteCollections(userId: string, syncToken: string) {
  const lastSyncedAt = await getLastCloudSyncedAt();
  const since = lastSyncedAt ? Math.max(0, lastSyncedAt - SYNC_OVERLAP_MS) : undefined;
  const merged = emptyCollections();
  let cursor: string | undefined;

  do {
    const payload = await postJson<{ collections?: Partial<SyncCollections>; cursor?: string; hasMore?: boolean }>(
      "/sync/pull",
      { userId, syncToken, since, cursor, limit: PULL_PAGE_SIZE },
      { phase: "pull" },
    );
    const normalized = normalizeCollections(userId, payload.collections);
    for (const key of Object.keys(merged) as Array<keyof SyncCollections>) {
      (merged[key] as unknown[]).push(...(normalized[key] as unknown[]));
    }
    cursor = payload.hasMore ? payload.cursor : undefined;
  } while (cursor);

  return { collections: merged };
}

function cancelRetryTimer() {
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
  }
}

function scheduleFailedSyncRetry(detail: CloudSyncErrorDetail) {
  if (!currentUserId() || detail.status === 401) return;
  cancelRetryTimer();
  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  const nextRetryAt = Date.now() + delay;
  emitSyncState({
    status: "error",
    lastSyncedAt: syncState.lastSyncedAt,
    error: detail.message,
    errorDetail: detail,
    pendingCount: getPendingCloudSyncCount(),
    nextRetryAt,
  });
  retryTimer = window.setTimeout(() => {
    retryTimer = undefined;
    void syncCloudData({ pushFirst: true }).catch(() => undefined);
  }, delay);
}

export async function syncCloudData(options: { pushFirst?: boolean } = {}) {
  const userId = currentUserId();
  const syncToken = currentSyncToken();
  if (!userId || !syncToken) return;

  const pushFirst = Boolean(options.pushFirst || hasPendingCloudSync());
  if (isDocumentHidden()) {
    deferSyncUntilVisible(pushFirst);
    if (pushFirst || getPendingCloudSyncCount() > 0) {
      emitSyncState({
        status: "queued",
        lastSyncedAt: syncState.lastSyncedAt,
        pendingCount: getPendingCloudSyncCount(),
      });
    }
    return;
  }

  if (syncing) {
    pendingSync = true;
    pendingPushFirst = pendingPushFirst || pushFirst;
    emitSyncState({
      status: "queued",
      lastSyncedAt: syncState.lastSyncedAt,
      pendingCount: getPendingCloudSyncCount(),
    });
    return currentSyncPromise;
  }

  syncing = true;
  currentSyncPromise = (async () => {
    const shouldPushFirst = pushFirst;
    const lastSyncedAt = await getLastCloudSyncedAt();
    const incrementalSince = lastSyncedAt ? Math.max(0, lastSyncedAt - SYNC_OVERLAP_MS) : undefined;
    emitSyncState({
      status: "syncing",
      lastSyncedAt: syncState.lastSyncedAt,
      pendingCount: getPendingCloudSyncCount(),
    });
    try {
      if (shouldPushFirst) {
        const localCollections = await collectLocalData(userId, {
          since: incrementalSince,
          full: !lastSyncedAt,
        });
        await pushLocalCollections(userId, syncToken, localCollections);
      }

      const pull = await pullRemoteCollections(userId, syncToken);
      await applyRemoteData(userId, pull.collections);
      if (shouldPushFirst || hasPendingCloudSync()) {
        const collections = await collectLocalData(userId, {
          since: incrementalSince,
          full: !lastSyncedAt,
        });
        await pushLocalCollections(userId, syncToken, collections);
      }
      const syncedAt = Date.now();
      await db.meta.put({ key: `cloud_synced_at:${userId}`, value: syncedAt });
      clearPendingCloudSync(userId);
      retryAttempt = 0;
      cancelRetryTimer();
      deferredVisibleSync = false;
      deferredVisiblePushFirst = false;
      clearDeferredVisibleSync();
      emitSyncState({ status: "success", lastSyncedAt: syncedAt, pendingCount: 0 });
      window.dispatchEvent(new CustomEvent("lumalex:cloud-sync"));
    } catch (error) {
      markCloudDataDirty("failedSync", "retry");
      const detail = describeSyncError(error);
      logSyncError(detail);
      emitSyncState({
        status: "error",
        lastSyncedAt: syncState.lastSyncedAt,
        error: detail.message,
        errorDetail: detail,
        pendingCount: getPendingCloudSyncCount(),
      });
      scheduleFailedSyncRetry(detail);
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
  markCloudDataDirty("localData", "pending");
  if (syncTimer) window.clearTimeout(syncTimer);
  emitSyncState({
    status: "queued",
    lastSyncedAt: syncState.lastSyncedAt,
    pendingCount: getPendingCloudSyncCount(),
  });
  syncTimer = window.setTimeout(() => {
    syncTimer = undefined;
    void syncCloudData({ pushFirst: true }).catch(() => undefined);
  }, Math.max(300, Math.min(delayMs, 1000)));
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

export const SyncService = {
  syncNow: syncCloudData,
  pushLocalChanges: () => syncCloudData({ pushFirst: true }),
  pullRemoteChanges: () => syncCloudData({ pushFirst: false }),
  markDirty: markCloudDataDirty,
  getLastSyncTime: getLastCloudSyncedAt,
  retryFailedSync: () => syncCloudData({ pushFirst: true }),
  hasPendingChanges: hasPendingCloudSync,
};

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
