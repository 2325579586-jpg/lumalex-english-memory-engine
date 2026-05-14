import type { LearnResult, ReviewResult, WordItem, WordStatus } from "@/types/domain";

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;
const reviewIntervals = [day, 3 * day, 7 * day, 14 * day, 30 * day];

export function scheduleAfterLearn(result: LearnResult, now = Date.now()) {
  if (result === "know") {
    return {
      nextReviewAt: now + day,
      status: "learned_pending_review" as WordStatus,
      memoryStrength: 1,
    };
  }

  if (result === "vague") {
    return {
      nextReviewAt: now + 12 * hour,
      status: "learned_pending_review" as WordStatus,
      memoryStrength: 0,
    };
  }

  return {
    nextReviewAt: now + 10 * minute,
    status: "learned_pending_review" as WordStatus,
    memoryStrength: 0,
  };
}

export function scheduleAfterReview(word: WordItem, result: ReviewResult, now = Date.now()) {
  if (result === "remembered") {
    const nextStrength = Math.min(word.memoryStrength + 1, reviewIntervals.length - 1);
    return {
      memoryStrength: nextStrength,
      nextReviewAt: now + reviewIntervals[nextStrength],
      status: nextStrength >= 4 ? ("mastered" as WordStatus) : ("learned_pending_review" as WordStatus),
    };
  }

  if (result === "hesitant") {
    const nextStrength = Math.max(word.memoryStrength, 0);
    const interval = reviewIntervals[Math.min(nextStrength, reviewIntervals.length - 1)];
    return {
      memoryStrength: nextStrength,
      nextReviewAt: now + Math.max(interval / 2, 6 * hour),
      status: "learned_pending_review" as WordStatus,
    };
  }

  const nextStrength = Math.max(word.memoryStrength - 1, 0);
  return {
    memoryStrength: nextStrength,
    nextReviewAt: now + Math.min(12 * hour, day),
    status: word.wrongCount + 1 >= 3 ? ("weak" as WordStatus) : ("learned_pending_review" as WordStatus),
  };
}

export function getDueStatus(word: WordItem, now = Date.now()): WordStatus {
  if (word.status === "suspended" || word.status === "mastered") {
    return word.status;
  }
  if (word.nextReviewAt && word.nextReviewAt <= now && word.status !== "learning" && word.status !== "reviewing") {
    return "due_review";
  }
  return word.status;
}
