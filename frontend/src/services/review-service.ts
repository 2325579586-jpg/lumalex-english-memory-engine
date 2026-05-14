import { scheduleAfterReview } from "@/schedulers/review-scheduler";
import { reviewRecordRepository } from "@/repositories/review-record-repository";
import { sessionRepository } from "@/repositories/session-repository";
import { settingsRepository } from "@/repositories/settings-repository";
import { wordRepository } from "@/repositories/word-repository";
import { requireCurrentUserId, withUserScopedKey } from "@/services/auth-session";
import { readStorage, removeStorage, writeStorage } from "@/services/storage";
import type { ReviewMode, ReviewResult, SessionRecord, WordItem, WordStatus } from "@/types/domain";

const ACTIVE_REVIEW_SESSION_KEY = "active-review-session";
const REVIEW_MASTERY_SCORE = 3;

export type ActiveReviewSession = {
  sessionId: string;
  originalWordIds?: string[];
  initialStatusMap?: Record<string, WordStatus>;
  wordIds: string[];
  currentIndex: number;
  round?: number;
  startedAt: number;
  modeSequence: ReviewMode[];
  modeIndex: number;
  resultMap: Record<string, ReviewResult>;
  scoreMap: Record<string, number>;
  summaryTotals?: {
    total: number;
    remembered: number;
    hesitant: number;
    forgot: number;
  };
  questionStartedAt: number;
  updatedAt: number;
};

function getStoredSession() {
  return readStorage<ActiveReviewSession | null>(withUserScopedKey(ACTIVE_REVIEW_SESSION_KEY), null);
}

function saveStoredSession(session: ActiveReviewSession) {
  writeStorage(withUserScopedKey(ACTIVE_REVIEW_SESSION_KEY), session);
}

function clearStoredSession() {
  removeStorage(withUserScopedKey(ACTIVE_REVIEW_SESSION_KEY));
}

function getReviewResultScore(result: ReviewResult) {
  if (result === "remembered") return 3;
  if (result === "hesitant") return 1;
  return 0;
}

async function loadWords(wordIds: string[]) {
  const words = await Promise.all(wordIds.map((id) => wordRepository.getById(id)));
  return words.filter(Boolean) as WordItem[];
}

export async function getDueReviewQueue(limit?: number) {
  const settings = await settingsRepository.get();
  const target = limit || settings?.dailyReviewTarget || 40;
  const now = Date.now();
  const words = await wordRepository.list();

  const overdue = words.filter((word) => !!word.nextReviewAt && word.nextReviewAt < now && word.status === "due_review");
  const due = words.filter((word) => !!word.nextReviewAt && word.nextReviewAt <= now && word.status === "learned_pending_review");
  const weak = words.filter((word) => word.status === "weak");
  const focused = words.filter((word) => word.isFocused);

  const combined = [...overdue, ...due, ...weak, ...focused]
    .filter((word, index, arr) => arr.findIndex((item) => item.id === word.id) === index)
    .sort((a, b) => (a.nextReviewAt || 0) - (b.nextReviewAt || 0));

  return combined.slice(0, target);
}

export async function getReviewSessionState() {
  const snapshot = getStoredSession();
  if (!snapshot) return null;
  const words = await loadWords(snapshot.wordIds);
  return { snapshot, words };
}

export async function startReviewSession(mode: ReviewMode = "en_to_zh") {
  const userId = requireCurrentUserId();
  const existing = await getReviewSessionState();
  if (existing) {
    return existing;
  }
  const queue = await getDueReviewQueue();
  if (!queue.length) return null;

  const startedAt = Date.now();
  const sessionId = `review-session-${crypto.randomUUID()}`;
  const snapshot: ActiveReviewSession = {
    sessionId,
    originalWordIds: queue.map((word) => word.id),
    initialStatusMap: Object.fromEntries(queue.map((word) => [word.id, word.status])),
    wordIds: queue.map((word) => word.id),
    currentIndex: 0,
    round: 1,
    startedAt,
    modeSequence: [mode],
    modeIndex: 0,
    resultMap: {},
    scoreMap: {},
    summaryTotals: { total: 0, remembered: 0, hesitant: 0, forgot: 0 },
    questionStartedAt: startedAt,
    updatedAt: startedAt,
  };

  await wordRepository.bulkUpsert(
    queue.map((word) => ({
      ...word,
      status: "reviewing",
      updatedAt: startedAt,
    })),
  );

  const sessionRecord: SessionRecord = {
    id: sessionId,
    userId,
    type: "review",
    wordIds: snapshot.wordIds,
    startedAt,
    progressIndex: 0,
  };
  await sessionRepository.put(sessionRecord);
  saveStoredSession(snapshot);
  return { snapshot, words: queue };
}

export async function submitReviewFeedback(result: ReviewResult) {
  const userId = requireCurrentUserId();
  const snapshot = getStoredSession();
  if (!snapshot) {
    throw new Error("没有可继续的复习会话");
  }

  const currentWordId = snapshot.wordIds[snapshot.currentIndex];
  const word = await wordRepository.getById(currentWordId);
  if (!word) {
    throw new Error("当前词条不存在");
  }

  const now = Date.now();
  const responseTimeMs = Math.max(1000, now - snapshot.questionStartedAt);
  const currentMode = snapshot.modeSequence[snapshot.modeIndex] || "en_to_zh";
  const previousScore = snapshot.scoreMap?.[word.id] || 0;
  const nextScore = Math.min(REVIEW_MASTERY_SCORE, previousScore + getReviewResultScore(result));
  const nextScoreMap = { ...(snapshot.scoreMap || {}), [word.id]: nextScore };
  const mastered = nextScore >= REVIEW_MASTERY_SCORE;
  const scheduled = mastered
    ? scheduleAfterReview(word, result, now)
    : {
        memoryStrength: word.memoryStrength,
        nextReviewAt: word.nextReviewAt,
        status: "reviewing" as const,
      };

  await reviewRecordRepository.put({
    id: `review-record-${crypto.randomUUID()}`,
    userId,
    wordId: word.id,
    mode: currentMode,
    result,
    responseTimeMs,
    createdAt: now,
  });

  const updatedWord: WordItem = {
    ...word,
    status: scheduled.status,
    memoryStrength: scheduled.memoryStrength,
    nextReviewAt: scheduled.nextReviewAt,
    lastReviewedAt: now,
    reviewCount: word.reviewCount + 1,
    correctCount: word.correctCount + (result === "remembered" ? 1 : 0),
    hesitateCount: word.hesitateCount + (result === "hesitant" ? 1 : 0),
    wrongCount: word.wrongCount + (result === "forgot" ? 1 : 0),
    isFocused: result === "forgot" ? true : word.isFocused,
    updatedAt: now,
  };
  await wordRepository.put(updatedWord);

  const nextResultMap = { ...snapshot.resultMap, [word.id]: result };
  const summaryTotals = {
    total: (snapshot.summaryTotals?.total || 0) + 1,
    remembered: (snapshot.summaryTotals?.remembered || 0) + (result === "remembered" ? 1 : 0),
    hesitant: (snapshot.summaryTotals?.hesitant || 0) + (result === "hesitant" ? 1 : 0),
    forgot: (snapshot.summaryTotals?.forgot || 0) + (result === "forgot" ? 1 : 0),
  };
  const isLast = snapshot.currentIndex >= snapshot.wordIds.length - 1;
  const remainingWordIds = snapshot.wordIds.filter((wordId) => (nextScoreMap[wordId] || 0) < REVIEW_MASTERY_SCORE);
  if (isLast && remainingWordIds.length === 0 && snapshot.modeIndex >= snapshot.modeSequence.length - 1) {
    const summary = {
      ...summaryTotals,
      wordIds: snapshot.originalWordIds || snapshot.wordIds,
    };

    await sessionRepository.put({
      id: snapshot.sessionId,
      userId,
      type: "review",
      wordIds: snapshot.originalWordIds || snapshot.wordIds,
      startedAt: snapshot.startedAt,
      endedAt: now,
      durationSec: Math.round((now - snapshot.startedAt) / 1000),
      progressIndex: snapshot.wordIds.length,
      summary,
    });
    clearStoredSession();
    return { completed: true as const, updatedWord, summary };
  }

  if (isLast && remainingWordIds.length === 0 && snapshot.modeIndex < snapshot.modeSequence.length - 1) {
    const nextSnapshot: ActiveReviewSession = {
      ...snapshot,
      wordIds: snapshot.originalWordIds || snapshot.wordIds,
      currentIndex: 0,
      round: 1,
      modeIndex: snapshot.modeIndex + 1,
      resultMap: {},
      scoreMap: {},
      summaryTotals,
      questionStartedAt: now,
      updatedAt: now,
    };
    await sessionRepository.put({
      id: snapshot.sessionId,
      userId,
      type: "review",
      wordIds: nextSnapshot.wordIds,
      startedAt: snapshot.startedAt,
      progressIndex: 0,
    });
    saveStoredSession(nextSnapshot);
    return { completed: false as const, phaseTransition: true as const, updatedWord, snapshot: nextSnapshot };
  }

  const nextSnapshot: ActiveReviewSession = {
    ...snapshot,
    wordIds: isLast ? remainingWordIds : snapshot.wordIds,
    currentIndex: isLast ? 0 : snapshot.currentIndex + 1,
    round: isLast ? (snapshot.round || 1) + 1 : snapshot.round,
    resultMap: nextResultMap,
    scoreMap: nextScoreMap,
    summaryTotals,
    questionStartedAt: now,
    updatedAt: now,
  };
  await sessionRepository.put({
    id: snapshot.sessionId,
    userId,
    type: "review",
    wordIds: nextSnapshot.wordIds,
    startedAt: snapshot.startedAt,
    progressIndex: nextSnapshot.currentIndex,
  });
  saveStoredSession(nextSnapshot);
  return { completed: false as const, updatedWord, snapshot: nextSnapshot };
}

export async function postponeReviewWord() {
  const userId = requireCurrentUserId();
  const snapshot = getStoredSession();
  if (!snapshot) return null;
  const currentWordId = snapshot.wordIds[snapshot.currentIndex];
  const rest = snapshot.wordIds.filter((_, index) => index !== snapshot.currentIndex);
  const nextSnapshot: ActiveReviewSession = {
    ...snapshot,
    wordIds: [...rest, currentWordId],
    questionStartedAt: Date.now(),
    updatedAt: Date.now(),
  };
  await sessionRepository.put({
    id: snapshot.sessionId,
    userId,
    type: "review",
    wordIds: nextSnapshot.wordIds,
    startedAt: snapshot.startedAt,
    progressIndex: snapshot.currentIndex,
  });
  saveStoredSession(nextSnapshot);
  return nextSnapshot;
}

export async function abandonReviewSession() {
  const userId = requireCurrentUserId();
  const snapshot = getStoredSession();
  if (!snapshot) return;
  const now = Date.now();
  await sessionRepository.put({
    id: snapshot.sessionId,
    userId,
    type: "review",
    wordIds: snapshot.wordIds,
    startedAt: snapshot.startedAt,
    endedAt: now,
    durationSec: Math.round((now - snapshot.startedAt) / 1000),
    progressIndex: snapshot.currentIndex,
    abandoned: true,
  });
  const words = await loadWords(snapshot.wordIds);
  await wordRepository.bulkUpsert(
    words
      .filter((word) => word.status === "reviewing")
      .map((word) => ({
        ...word,
        status: snapshot.initialStatusMap?.[word.id] || (word.nextReviewAt && word.nextReviewAt <= now ? "due_review" : "learned_pending_review"),
        updatedAt: now,
      })),
  );
  clearStoredSession();
}
