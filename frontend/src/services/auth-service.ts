import { clearAuthSession, getAuthSession, setAuthSession } from "@/services/auth-session";
import { apiUrl } from "@/services/api-base";
import { db } from "@/lib/db";
import { userRepository } from "@/repositories/user-repository";
import type { AppUser, AuthSession } from "@/types/domain";

const REQUEST_FAILED_MESSAGE = "\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
const USERNAME_TOO_SHORT_MESSAGE = "\u8d26\u53f7\u81f3\u5c11\u9700\u8981 3 \u4e2a\u5b57\u7b26\u3002";
const PASSWORD_TOO_SHORT_MESSAGE = "\u5bc6\u7801\u81f3\u5c11\u9700\u8981 6 \u4e2a\u5b57\u7b26\u3002";
const ACCOUNT_EXISTS_MESSAGE = "\u8fd9\u4e2a\u8d26\u53f7\u5df2\u7ecf\u5b58\u5728\uff0c\u8bf7\u76f4\u63a5\u767b\u5f55\u3002";
const ACCOUNT_NOT_FOUND_MESSAGE = "\u8d26\u53f7\u4e0d\u5b58\u5728\uff0c\u8bf7\u5148\u6ce8\u518c\u3002";
const PASSWORD_INCORRECT_MESSAGE = "\u5bc6\u7801\u9519\u8bef\uff0c\u8bf7\u91cd\u65b0\u8f93\u5165\u3002";
const CLOUD_REQUIRED_MESSAGE = "\u5f53\u524d\u65e0\u6cd5\u8fde\u63a5\u6b63\u5f0f\u4e91\u7aef\u670d\u52a1\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u6216\u6539\u7528 https://worldapp-livid.vercel.app \u8bbf\u95ee\u3002";

class ApiRequestError extends Error {
  status?: number;
  unavailable: boolean;

  constructor(message: string, options: { status?: number; unavailable?: boolean } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.unavailable = Boolean(options.unavailable);
  }
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function requestJson<T>(path: string, body: Record<string, unknown>) {
  let response: Response;

  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(REQUEST_FAILED_MESSAGE, { unavailable: true });
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => ({}))) as T & { error?: string })
    : ({} as T & { error?: string });

  if (!response.ok) {
    throw new ApiRequestError(payload.error || REQUEST_FAILED_MESSAGE, {
      status: response.status,
      unavailable: !payload.error && [404, 405, 500, 502, 503, 504].includes(response.status),
    });
  }

  return payload;
}

function isApiUnavailable(error: unknown) {
  return error instanceof ApiRequestError && error.unavailable;
}

function assertSession(payload: { session?: AuthSession }) {
  if (!payload.session?.userId || !payload.session.username || !payload.session.syncToken) {
    throw new ApiRequestError(REQUEST_FAILED_MESSAGE, { unavailable: true });
  }
  return payload.session;
}

async function findSingleLegacyDataOwner(targetUserId: string) {
  const [decks, words] = await Promise.all([
    db.decks.toArray(),
    db.words.toArray(),
  ]);
  const owners = new Set<string>();

  for (const deck of decks) {
    if (deck.userId && deck.userId !== targetUserId && deck.sourceType !== "system") owners.add(deck.userId);
  }
  for (const word of words) {
    if (word.userId && word.userId !== targetUserId && word.source !== "system") owners.add(word.userId);
  }

  return owners.size === 1 ? Array.from(owners)[0] : null;
}

async function hasLocalCustomData(userId: string) {
  const [customDecks, customWords] = await Promise.all([
    db.decks.where("userId").equals(userId).filter((deck) => deck.sourceType !== "system").count(),
    db.words.where("userId").equals(userId).filter((word) => word.source !== "system").count(),
  ]);
  return customDecks + customWords > 0;
}

async function ensureLocalUser(userId: string, username: string, passwordHash: string) {
  const now = Date.now();
  const existingById = await userRepository.getById(userId);
  const existingByUsername = await userRepository.getByUsername(username);
  const legacyUserId =
    existingByUsername && existingByUsername.id !== userId
      ? existingByUsername.id
      : !(await hasLocalCustomData(userId))
        ? await findSingleLegacyDataOwner(userId)
        : null;

  if (legacyUserId && legacyUserId !== userId) {
    await migrateLocalUserData(legacyUserId, userId);
    await db.meta.delete(`cloud_synced_at:${userId}`);
  }
  const existing = existingById || existingByUsername;
  const user: AppUser = {
    id: userId,
    username,
    passwordHash,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await userRepository.put(user);
  if (existingByUsername && existingByUsername.id !== userId) {
    await db.users.delete(existingByUsername.id);
  }
  return user;
}

async function migrateLocalUserData(fromUserId: string, toUserId: string) {
  const wordIdMap = new Map<string, string>();
  const words = (await db.words.toArray()).filter((word) => word.userId === fromUserId);
  for (const word of words) {
    const migratedId = word.id.startsWith(`${fromUserId}:`) ? `${toUserId}:${word.id.slice(fromUserId.length + 1)}` : word.id;
    wordIdMap.set(word.id, migratedId);
    await db.words.put({ ...word, id: migratedId, userId: toUserId, updatedAt: Date.now() });
    if (migratedId !== word.id) {
      await db.words.delete(word.id);
    }
  }

  const decks = (await db.decks.toArray()).filter((deck) => deck.userId === fromUserId);
  await db.decks.bulkPut(decks.map((deck) => ({ ...deck, userId: toUserId, updatedAt: Date.now() })));

  const learnRecords = (await db.learnRecords.toArray()).filter((record) => record.userId === fromUserId);
  await db.learnRecords.bulkPut(
    learnRecords.map((record) => ({ ...record, userId: toUserId, wordId: wordIdMap.get(record.wordId) || record.wordId })),
  );

  const reviewRecords = (await db.reviewRecords.toArray()).filter((record) => record.userId === fromUserId);
  await db.reviewRecords.bulkPut(
    reviewRecords.map((record) => ({ ...record, userId: toUserId, wordId: wordIdMap.get(record.wordId) || record.wordId })),
  );

  const sessions = (await db.sessions.toArray()).filter((session) => session.userId === fromUserId);
  await db.sessions.bulkPut(
    sessions.map((session) => ({
      ...session,
      userId: toUserId,
      wordIds: session.wordIds.map((wordId) => wordIdMap.get(wordId) || wordId),
    })),
  );

  const settings = await db.settings.get(fromUserId);
  if (settings) {
    const { id: _oldId, ...rest } = settings;
    await db.settings.put({ ...rest, id: toUserId, userId: toUserId });
    await db.settings.delete(fromUserId);
  }
}

export async function syncLegacyLocalAccountToBackend(userId: string) {
  const localUser = await userRepository.getById(userId);
  if (!localUser) return null;

  const payload = await requestJson<{ session?: AuthSession }>("/auth/sync-local-user", {
    userId: localUser.id,
    username: localUser.username,
    passwordHash: localUser.passwordHash,
  });
  const session = assertSession(payload);
  setAuthSession(session);
  return session;
}

export async function syncCurrentLocalAccountToBackend() {
  const session = getAuthSession();
  if (!session) return null;

  const [currentUser, usernameUser] = await Promise.all([
    userRepository.getById(session.userId),
    userRepository.getByUsername(session.username),
  ]);
  const localUser = usernameUser && usernameUser.id !== session.userId ? usernameUser : currentUser || usernameUser;

  if (!localUser) return null;

  const payload = await requestJson<{ session?: AuthSession }>("/auth/sync-local-user", {
    userId: localUser.id,
    username: localUser.username,
    passwordHash: localUser.passwordHash,
  });

  const syncedSession = assertSession(payload);
  const nextSession: AuthSession = {
    userId: syncedSession.userId,
    username: syncedSession.username,
    syncToken: syncedSession.syncToken,
    loggedInAt: Date.now(),
  };

  await ensureLocalUser(syncedSession.userId, syncedSession.username, localUser.passwordHash);

  setAuthSession(nextSession);
  return nextSession;
}

export async function registerAccount(username: string, password: string) {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3) {
    throw new Error(USERNAME_TOO_SHORT_MESSAGE);
  }
  if (password.trim().length < 6) {
    throw new Error(PASSWORD_TOO_SHORT_MESSAGE);
  }

  try {
    const payload = await requestJson<{ session?: AuthSession }>("/auth/register", { username: normalized, password });
    const session = assertSession(payload);
    await ensureLocalUser(session.userId, session.username, await hashPassword(password));
    return session;
  } catch (error) {
    if (isApiUnavailable(error)) {
      throw new Error(CLOUD_REQUIRED_MESSAGE);
    }
    throw error;
  }
}

export async function loginAccount(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const passwordHash = await hashPassword(password);
  const localUser = await userRepository.getByUsername(normalized);
  if (localUser) {
    await requestJson<{ session?: AuthSession }>("/auth/sync-local-user", {
      userId: localUser.id,
      username: normalized,
      passwordHash,
    }).catch(() => undefined);
  }

  try {
    const payload = await requestJson<{ session?: AuthSession }>("/auth/login", { username: normalized, password });
    const session = assertSession(payload);
    await ensureLocalUser(session.userId, session.username, passwordHash);
    setAuthSession(session);
    return session;
  } catch (error) {
    if (isApiUnavailable(error)) {
      throw new Error(CLOUD_REQUIRED_MESSAGE);
    }

    if (!(error instanceof ApiRequestError) || error.status !== 404) {
      throw error;
    }

    const localUser = await userRepository.getByUsername(normalized);
    if (!localUser) {
      throw error;
    }

    await requestJson<{ session?: AuthSession }>("/auth/sync-local-user", {
      userId: localUser.id,
      username: localUser.username,
      passwordHash: localUser.passwordHash,
    });

    const retry = await requestJson<{ session?: AuthSession }>("/auth/login", { username: normalized, password });
    const session = assertSession(retry);
    await ensureLocalUser(session.userId, session.username, passwordHash);
    setAuthSession(session);
    return session;
  }
}

export function logoutAccount() {
  clearAuthSession();
}

export function getCurrentSession() {
  return getAuthSession();
}
