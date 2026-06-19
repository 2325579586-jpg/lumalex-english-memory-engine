import { scheduleAfterLearn } from "@/schedulers/review-scheduler";
import { learnRecordRepository } from "@/repositories/learn-record-repository";
import { sessionRepository } from "@/repositories/session-repository";
import { settingsRepository } from "@/repositories/settings-repository";
import { wordRepository } from "@/repositories/word-repository";
import { requireCurrentUserId, withUserScopedKey } from "@/services/auth-session";
import { readStorage, removeStorage, writeStorage } from "@/services/storage";
import { syncSystemLexicons } from "@/services/system-lexicon-sync";
import type { LearnResult, SessionRecord, WordItem } from "@/types/domain";

const ACTIVE_LEARN_SESSION_KEY = "active-learn-session";
const LEARN_MASTERY_SCORE = 3;

export type ActiveLearnSession = {
  sessionId: string;
  originalWordIds?: string[];
  wordIds: string[];
  currentIndex: number;
  round?: number;
  startedAt: number;
  deckId: string;
  dailyTarget: number;
  feedbackMap: Record<string, LearnResult>;
  scoreMap: Record<string, number>;
  dwellStartedAt: number;
  updatedAt: number;
};

type LearnCompletionSummary = {
  total: number;
  know: number;
  vague: number;
  dontKnow: number;
  wordIds: string[];
};

type StartLearnOptions = {
  deckId?: string;
  dailyTarget?: number;
};

function getStoredSession() {
  return readStorage<ActiveLearnSession | null>(withUserScopedKey(ACTIVE_LEARN_SESSION_KEY), null);
}

function saveStoredSession(session: ActiveLearnSession) {
  writeStorage(withUserScopedKey(ACTIVE_LEARN_SESSION_KEY), session);
}

function clearStoredSession() {
  removeStorage(withUserScopedKey(ACTIVE_LEARN_SESSION_KEY));
}

function closeStoredSession(session: ActiveLearnSession, closedAt = Date.now()) {
  saveStoredSession({
    ...session,
    wordIds: [],
    currentIndex: 0,
    dwellStartedAt: closedAt,
    updatedAt: closedAt,
  });
}

function isStillLearnable(word: WordItem) {
  return word.status === "unseen" || word.status === "learning";
}

export function getLearnResultScore(result: LearnResult, round = 1) {
  if (result === "know") return round <= 1 ? LEARN_MASTERY_SCORE : 1;
  if (result === "vague") return 1;
  return 0;
}

export function hasAnsweredLearnWord(session: Pick<ActiveLearnSession, "feedbackMap"> | null | undefined, wordId: string) {
  return Boolean(session?.feedbackMap && Object.prototype.hasOwnProperty.call(session.feedbackMap, wordId));
}

function getLearnQueuePriority(word: WordItem) {
  if (word.status === "learning") return 0;
  if (word.learnCount > 0) return 1;
  return 2;
}

function getLearnQueueSortTime(word: WordItem) {
  return word.lastStudiedAt || word.createdAt;
}

function shuffleSessionQueue<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export async function getTodayLearnQueue(options: StartLearnOptions = {}) {
  const settings = await settingsRepository.get();
  const target = options.dailyTarget || settings?.dailyNewWordTarget || 20;
  const words = await wordRepository.list({
    deckId: options.deckId && options.deckId !== "all" ? options.deckId : undefined,
  });
  return words
    .filter((word) => word.status === "unseen" || word.status === "learning")
    .sort((a, b) => {
      const priorityDiff = getLearnQueuePriority(a) - getLearnQueuePriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return getLearnQueueSortTime(a) - getLearnQueueSortTime(b);
    })
    .slice(0, target);
}

async function loadWords(wordIds: string[]) {
  const words = await Promise.all(wordIds.map((id) => wordRepository.getById(id)));
  return words.filter(Boolean) as WordItem[];
}

function reconcileLearnCurrentIndex(snapshot: ActiveLearnSession, nextWordIds: string[]) {
  if (!nextWordIds.length) return 0;
  const nextWordIdSet = new Set(nextWordIds);
  const currentWordId = snapshot.wordIds[snapshot.currentIndex];
  const currentIndex = currentWordId ? nextWordIds.indexOf(currentWordId) : -1;
  if (currentIndex >= 0) return currentIndex;

  const nextOriginalWordId = snapshot.wordIds.find((wordId, index) => index > snapshot.currentIndex && nextWordIdSet.has(wordId));
  if (nextOriginalWordId) return nextWordIds.indexOf(nextOriginalWordId);

  return 0;
}

export async function getLearnSessionState() {
  const snapshot = getStoredSession();
  if (!snapshot) {
    return null;
  }
  const words = await loadWords(snapshot.wordIds);
  const learnableWords = words.filter(isStillLearnable);
  if (!learnableWords.length) {
    if (snapshot.wordIds.length) {
      closeStoredSession(snapshot);
    }
    return null;
  }

  if (learnableWords.length !== snapshot.wordIds.length || snapshot.currentIndex >= learnableWords.length) {
    const now = Date.now();
    const nextWordIds = learnableWords.map((word) => word.id);
    const nextSnapshot: ActiveLearnSession = {
      ...snapshot,
      wordIds: nextWordIds,
      currentIndex: reconcileLearnCurrentIndex(snapshot, nextWordIds),
      updatedAt: now,
    };
    saveStoredSession(nextSnapshot);
    await sessionRepository.put({
      id: nextSnapshot.sessionId,
      userId: requireCurrentUserId(),
      type: "learn",
      wordIds: nextSnapshot.wordIds,
      startedAt: nextSnapshot.startedAt,
      progressIndex: nextSnapshot.currentIndex,
      updatedAt: now,
    });
    return { snapshot: nextSnapshot, words: learnableWords };
  }

  return { snapshot, words: learnableWords };
}

export async function startLearnSession(options: StartLearnOptions = {}) {
  const userId = requireCurrentUserId();
  const existing = await getLearnSessionState();
  if (existing) {
    return existing;
  }

  let queue = await getTodayLearnQueue(options);
  if (!queue.length) {
    await syncSystemLexicons(true).catch(() => undefined);
    queue = await getTodayLearnQueue(options);
  }
  if (!queue.length) {
    return null;
  }
  queue = shuffleSessionQueue(queue);

  const startedAt = Date.now();
  const sessionId = `learn-session-${crypto.randomUUID()}`;
  const snapshot: ActiveLearnSession = {
    sessionId,
    originalWordIds: queue.map((word) => word.id),
    wordIds: queue.map((word) => word.id),
    currentIndex: 0,
    round: 1,
    startedAt,
    deckId: options.deckId || "all",
    dailyTarget: options.dailyTarget || queue.length,
    feedbackMap: {},
    scoreMap: {},
    dwellStartedAt: startedAt,
    updatedAt: startedAt,
  };

  await wordRepository.bulkUpsert(
    queue.map((word) => ({
      ...word,
      status: "learning",
      updatedAt: Date.now(),
    })),
  );

  const sessionRecord: SessionRecord = {
    id: sessionId,
    userId,
    type: "learn",
    wordIds: snapshot.wordIds,
    startedAt,
    progressIndex: 0,
    updatedAt: startedAt,
  };
  await sessionRepository.put(sessionRecord);
  saveStoredSession(snapshot);

  return { snapshot, words: queue };
}

export async function submitLearnFeedback(result: LearnResult) {
  const userId = requireCurrentUserId();
  const snapshot = getStoredSession();
  if (!snapshot) {
    throw new Error("没有可继续的学习会话");
  }

  const currentWordId = snapshot.wordIds[snapshot.currentIndex];
  const word = await wordRepository.getById(currentWordId);
  if (!word) {
    throw new Error("当前词条不存在");
  }

  const now = Date.now();
  const dwellTimeMs = Math.max(1000, now - snapshot.dwellStartedAt);
  const previousScore = snapshot.scoreMap?.[word.id] || 0;
  const attemptRound = hasAnsweredLearnWord(snapshot, word.id) ? 2 : 1;
  const nextScore = Math.min(LEARN_MASTERY_SCORE, previousScore + getLearnResultScore(result, attemptRound));
  const nextScoreMap = { ...(snapshot.scoreMap || {}), [word.id]: nextScore };
  const mastered = nextScore >= LEARN_MASTERY_SCORE;
  const scheduled = mastered
    ? scheduleAfterLearn(result, now)
    : {
        nextReviewAt: word.nextReviewAt,
        status: "learning" as const,
        memoryStrength: word.memoryStrength,
      };

  await learnRecordRepository.put({
    id: `learn-record-${crypto.randomUUID()}`,
    userId,
    wordId: word.id,
    result,
    dwellTimeMs,
    createdAt: now,
  });

  const updatedWord: WordItem = {
    ...word,
    status: scheduled.status,
    memoryStrength: scheduled.memoryStrength,
    nextReviewAt: scheduled.nextReviewAt,
    lastStudiedAt: now,
    learnCount: word.learnCount + 1,
    correctCount: word.correctCount + (result === "know" ? 1 : 0),
    hesitateCount: word.hesitateCount + (result === "vague" ? 1 : 0),
    wrongCount: word.wrongCount + (result === "dontKnow" ? 1 : 0),
    updatedAt: now,
  };
  await wordRepository.put(updatedWord);

  const nextFeedbackMap = { ...snapshot.feedbackMap, [word.id]: result };
  const isLast = snapshot.currentIndex >= snapshot.wordIds.length - 1;
  const remainingWordIds = snapshot.wordIds.filter((wordId) => (nextScoreMap[wordId] || 0) < LEARN_MASTERY_SCORE);

  if (isLast && remainingWordIds.length === 0) {
    const counts = Object.values(nextFeedbackMap).reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item] += 1;
        return acc;
      },
      { total: 0, know: 0, vague: 0, dontKnow: 0 },
    );
    const summary: LearnCompletionSummary = {
      ...counts,
      wordIds: snapshot.originalWordIds || snapshot.wordIds,
    };
    await sessionRepository.put({
      id: snapshot.sessionId,
      userId,
      type: "learn",
      wordIds: snapshot.originalWordIds || snapshot.wordIds,
      startedAt: snapshot.startedAt,
      endedAt: now,
      durationSec: Math.round((now - snapshot.startedAt) / 1000),
      progressIndex: snapshot.wordIds.length,
      summary,
      updatedAt: now,
    });
    closeStoredSession(snapshot, now);
    return { completed: true as const, updatedWord, summary };
  }

  const nextSnapshot: ActiveLearnSession = {
    ...snapshot,
    wordIds: isLast ? remainingWordIds : snapshot.wordIds,
    currentIndex: isLast ? 0 : snapshot.currentIndex + 1,
    round: isLast ? (snapshot.round || 1) + 1 : snapshot.round,
    feedbackMap: nextFeedbackMap,
    scoreMap: nextScoreMap,
    dwellStartedAt: now,
    updatedAt: now,
  };

  await sessionRepository.put({
    id: snapshot.sessionId,
    userId,
    type: "learn",
    wordIds: nextSnapshot.wordIds,
    startedAt: snapshot.startedAt,
    progressIndex: nextSnapshot.currentIndex,
    updatedAt: now,
  });
  saveStoredSession(nextSnapshot);

  return { completed: false as const, updatedWord, snapshot: nextSnapshot };
}

export async function skipCurrentLearnWord() {
  const userId = requireCurrentUserId();
  const snapshot = getStoredSession();
  if (!snapshot) {
    return null;
  }
  const currentWordId = snapshot.wordIds[snapshot.currentIndex];
  const rest = snapshot.wordIds.filter((_, index) => index !== snapshot.currentIndex);
  const nextWordIds = [...rest, currentWordId];
  const nextSnapshot: ActiveLearnSession = {
    ...snapshot,
    wordIds: nextWordIds,
    dwellStartedAt: Date.now(),
    updatedAt: Date.now(),
  };
  await sessionRepository.put({
    id: snapshot.sessionId,
    userId,
    type: "learn",
    wordIds: nextWordIds,
    startedAt: snapshot.startedAt,
    progressIndex: snapshot.currentIndex,
    updatedAt: nextSnapshot.updatedAt,
  });
  saveStoredSession(nextSnapshot);
  return nextSnapshot;
}

export async function abandonLearnSession() {
  const userId = requireCurrentUserId();
  const snapshot = getStoredSession();
  if (!snapshot) return;
  const now = Date.now();
  await sessionRepository.put({
    id: snapshot.sessionId,
    userId,
    type: "learn",
    wordIds: snapshot.wordIds,
    startedAt: snapshot.startedAt,
    endedAt: now,
    durationSec: Math.round((now - snapshot.startedAt) / 1000),
    progressIndex: snapshot.currentIndex,
    abandoned: true,
    updatedAt: now,
  });
  const words = await loadWords(snapshot.wordIds);
  await wordRepository.bulkUpsert(
    words
      .filter((word) => word.status === "learning" && (snapshot.scoreMap?.[word.id] || 0) < LEARN_MASTERY_SCORE)
      .map((word) => ({
        ...word,
        status: "unseen" as const,
        nextReviewAt: undefined,
        updatedAt: now,
      })),
  );
  closeStoredSession(snapshot, now);
}

export async function toggleWordStar(wordId: string) {
  const word = await wordRepository.getById(wordId);
  if (!word) return;
  await wordRepository.put({ ...word, isStarred: !word.isStarred, updatedAt: Date.now() });
}

export async function toggleWordFocus(wordId: string) {
  const word = await wordRepository.getById(wordId);
  if (!word) return;
  await wordRepository.put({ ...word, isFocused: !word.isFocused, updatedAt: Date.now() });
}
