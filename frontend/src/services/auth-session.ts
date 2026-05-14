import { readStorage, removeStorage, writeStorage } from "@/services/storage";
import type { AuthSession } from "@/types/domain";

const AUTH_SESSION_KEY = "auth-session";

export function getAuthSession() {
  return readStorage<AuthSession | null>(AUTH_SESSION_KEY, null);
}

export function setAuthSession(session: AuthSession) {
  writeStorage(AUTH_SESSION_KEY, session);
}

export function clearAuthSession() {
  removeStorage(AUTH_SESSION_KEY);
}

export function getCurrentUserId() {
  return getAuthSession()?.userId || null;
}

export function requireCurrentUserId() {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("当前未登录，请先登录账号。");
  }
  return userId;
}

export function withUserScopedKey(baseKey: string) {
  const userId = getCurrentUserId();
  return userId ? `${baseKey}:${userId}` : baseKey;
}
