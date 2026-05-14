import { startOfDay } from "@/lib/utils";
import type { DashboardSnapshot, LearnRecord, ReviewRecord, SessionRecord, WordItem } from "@/types/domain";

export function buildDashboardSnapshot(
  words: WordItem[],
  learnRecords: LearnRecord[],
  reviewRecords: ReviewRecord[],
  sessions: SessionRecord[],
): DashboardSnapshot {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const todayLearnAvailable = words.filter((word) => word.status === "unseen").length;
  const todayReviewDue = words.filter(
    (word) =>
      !!word.nextReviewAt &&
      word.nextReviewAt <= now &&
      ["due_review", "weak", "learned_pending_review"].includes(word.status),
  ).length;
  const overdueCount = words.filter((word) => !!word.nextReviewAt && word.nextReviewAt < todayStart).length;
  const completedTasks =
    learnRecords.filter((record) => record.createdAt >= todayStart).length +
    reviewRecords.filter((record) => record.createdAt >= todayStart).length;
  const totalTasks = Math.max(completedTasks + todayLearnAvailable + todayReviewDue, 1);
  const days = new Set(
    sessions.filter((session) => session.endedAt).map((session) => new Date(session.startedAt).toDateString()),
  );

  return {
    todayLearnAvailable,
    todayReviewDue,
    overdueCount,
    completedTasks,
    totalTasks,
    completionRate: Math.min(100, Math.round((completedTasks / totalTasks) * 100)),
    streakDays: days.size,
    recommendedAction: todayReviewDue + overdueCount > todayLearnAvailable ? "review" : "learn",
    strategyCopy:
      todayReviewDue + overdueCount > todayLearnAvailable
        ? "今天的复习窗口更密集，建议先清空到期词，再进入新学。"
        : "复习压力可控，先推进一组新词，再回头巩固记忆更高效。",
  };
}
