import { wordRepository } from "@/repositories/word-repository";
import { requireCurrentUserId, withUserScopedKey } from "@/services/auth-session";
import { removeStorage, readStorage, writeStorage } from "@/services/storage";
import type { WordItem } from "@/types/domain";

const SPELLING_SESSION_KEY = "active-spelling-session";

export type SpellingSource = "learn" | "review";

export type ActiveSpellingSession = {
  id: string;
  source: SpellingSource;
  wordIds: string[];
  currentIndex: number;
  startedAt: number;
  updatedAt: number;
};

function getStoredSession(source: SpellingSource) {
  return readStorage<ActiveSpellingSession | null>(withUserScopedKey(`${SPELLING_SESSION_KEY}:${source}`), null);
}

function saveStoredSession(session: ActiveSpellingSession) {
  writeStorage(withUserScopedKey(`${SPELLING_SESSION_KEY}:${session.source}`), session);
}

function clearStoredSession(source: SpellingSource) {
  removeStorage(withUserScopedKey(`${SPELLING_SESSION_KEY}:${source}`));
}

async function loadWords(wordIds: string[]) {
  const words = await Promise.all(wordIds.map((id) => wordRepository.getById(id)));
  return words.filter(Boolean) as WordItem[];
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getSpellingSessionState(source: SpellingSource) {
  const snapshot = getStoredSession(source);
  if (!snapshot) return null;
  const words = await loadWords(snapshot.wordIds);
  if (!words.length) {
    clearStoredSession(source);
    return null;
  }
  const nextSnapshot: ActiveSpellingSession =
    words.length !== snapshot.wordIds.length || snapshot.currentIndex >= words.length
      ? {
          ...snapshot,
          wordIds: words.map((word) => word.id),
          currentIndex: Math.min(snapshot.currentIndex, words.length - 1),
          updatedAt: Date.now(),
        }
      : snapshot;
  if (nextSnapshot !== snapshot) {
    saveStoredSession(nextSnapshot);
  }
  return { snapshot: nextSnapshot, words };
}

export async function startSpellingSession(source: SpellingSource, wordIds: string[]) {
  requireCurrentUserId();
  const existing = await getSpellingSessionState(source);
  if (existing) return existing;

  const uniqueWordIds = wordIds.filter((wordId, index, arr) => arr.indexOf(wordId) === index);
  const words = await loadWords(uniqueWordIds);
  if (!words.length) return null;

  const now = Date.now();
  const snapshot: ActiveSpellingSession = {
    id: `spelling-session-${crypto.randomUUID()}`,
    source,
    wordIds: words.map((word) => word.id),
    currentIndex: 0,
    startedAt: now,
    updatedAt: now,
  };
  saveStoredSession(snapshot);
  return { snapshot, words };
}

export async function submitSpellingAnswer(source: SpellingSource, answer: string) {
  const state = await getSpellingSessionState(source);
  if (!state) {
    throw new Error("没有可继续的拼写会话。");
  }
  const { snapshot, words } = state;
  const currentWord = words[snapshot.currentIndex];
  if (!currentWord) {
    throw new Error("当前拼写词条不存在。");
  }

  const isCorrect = normalizeText(answer) === normalizeText(currentWord.term);
  if (!isCorrect) {
    return {
      completed: false as const,
      correct: false as const,
      word: currentWord,
      snapshot,
      words,
    };
  }

  const isLast = snapshot.currentIndex >= snapshot.wordIds.length - 1;
  if (isLast) {
    clearStoredSession(source);
    return {
      completed: true as const,
      correct: true as const,
      word: currentWord,
    };
  }

  const nextSnapshot: ActiveSpellingSession = {
    ...snapshot,
    currentIndex: snapshot.currentIndex + 1,
    updatedAt: Date.now(),
  };
  saveStoredSession(nextSnapshot);
  const nextWords = await loadWords(nextSnapshot.wordIds);
  return {
    completed: false as const,
    correct: true as const,
    word: currentWord,
    snapshot: nextSnapshot,
    words: nextWords,
  };
}

export async function abandonSpellingSession(source: SpellingSource) {
  clearStoredSession(source);
}
