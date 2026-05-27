import {
  ArrowRight,
  BookOpenCheck,
  Cloud,
  Flame,
  FolderKanban,
  RefreshCcw,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCloudSyncStatus } from "@/hooks/use-cloud-sync-status";
import { startOfDay } from "@/lib/utils";
import { buildDashboardSnapshot } from "@/modules/dashboard/selectors";
import { deckRepository } from "@/repositories/deck-repository";
import { learnRecordRepository } from "@/repositories/learn-record-repository";
import { reviewRecordRepository } from "@/repositories/review-record-repository";
import { sessionRepository } from "@/repositories/session-repository";
import { wordRepository } from "@/repositories/word-repository";
import { useStudyStore } from "@/stores/study-store";
import type { DashboardSnapshot, Deck, LearnRecord, ReviewRecord, SessionRecord, WordItem } from "@/types/domain";

type AssistantTab = "memory" | "curve" | "mistakes" | "trend";

const assistantTabs: Array<{ id: AssistantTab; label: string }> = [
  { id: "memory", label: "最近记忆反馈" },
  { id: "curve", label: "遗忘曲线提醒" },
  { id: "mistakes", label: "错词本" },
  { id: "trend", label: "最近 7 天趋势" },
];

function formatDate(value?: number) {
  if (!value) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function buildForgettingWindows(words: WordItem[]) {
  const now = Date.now();
  const windows = [
    { label: "2 小时内", min: now, max: now + 2 * 60 * 60 * 1000, hint: "适合快速回看刚学完的新词。" },
    { label: "今晚", min: now + 2 * 60 * 60 * 1000, max: startOfDay(now) + 24 * 60 * 60 * 1000, hint: "优先处理今天模糊过的词。" },
    { label: "明早", min: startOfDay(now) + 24 * 60 * 60 * 1000, max: startOfDay(now) + 36 * 60 * 60 * 1000, hint: "适合第二次巩固记忆。" },
    { label: "3 天后", min: now + 2 * 24 * 60 * 60 * 1000, max: now + 4 * 24 * 60 * 60 * 1000, hint: "中期保持的关键窗口。" },
  ];

  return windows.map((window) => ({
    ...window,
    value: words.filter((word) => word.nextReviewAt && word.nextReviewAt >= window.min && word.nextReviewAt < window.max).length,
  }));
}

function buildTrendBars(learnRecords: LearnRecord[], reviewRecords: ReviewRecord[]) {
  const today = startOfDay(Date.now());
  return Array.from({ length: 7 }).map((_, index) => {
    const dayStart = today - (6 - index) * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return {
      label: `D${index + 1}`,
      learn: learnRecords.filter((record) => record.createdAt >= dayStart && record.createdAt < dayEnd).length,
      review: reviewRecords.filter((record) => record.createdAt >= dayStart && record.createdAt < dayEnd).length,
    };
  });
}

function getNormalizedMiniBarHeight(value: number, maxValue: number, maxHeight = 112, minHeight = 8) {
  if (value <= 0 || maxValue <= 0) return minHeight;
  const scaled = Math.round((value / maxValue) * maxHeight);
  return Math.min(maxHeight, Math.max(minHeight, scaled));
}

function getSyncLabel(status: ReturnType<typeof useCloudSyncStatus>["status"]) {
  if (status === "syncing") return "同步中";
  if (status === "queued") return "待同步";
  if (status === "success") return "已同步";
  if (status === "error") return "稍后重试";
  return "云同步";
}

function isDueToday(word: WordItem, now: number) {
  return Boolean(
    word.nextReviewAt &&
      word.nextReviewAt <= now &&
      ["due_review", "weak", "learned_pending_review"].includes(word.status),
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const syncState = useCloudSyncStatus();
  const selectedLexiconId = useStudyStore((state) => state.selectedLexiconId);
  const setSelectedLexiconId = useStudyStore((state) => state.setSelectedLexiconId);
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("memory");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [words, setWords] = useState<WordItem[]>([]);
  const [learnRecords, setLearnRecords] = useState<LearnRecord[]>([]);
  const [reviewRecords, setReviewRecords] = useState<ReviewRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = () => {
      Promise.all([
        deckRepository.list(),
        wordRepository.list(),
        learnRecordRepository.list(),
        reviewRecordRepository.list(),
        sessionRepository.list(),
      ]).then(([deckItems, wordItems, learnItems, reviewItems, sessionItems]) => {
        if (cancelled) return;
        setDecks(deckItems);
        setWords(wordItems);
        setLearnRecords(learnItems);
        setReviewRecords(reviewItems);
        setSessions(sessionItems);
      });
    };

    loadData();
    window.addEventListener("lumalex:cloud-sync", loadData);
    return () => {
      cancelled = true;
      window.removeEventListener("lumalex:cloud-sync", loadData);
    };
  }, []);

  const snapshot: DashboardSnapshot = useMemo(
    () => buildDashboardSnapshot(words, learnRecords, reviewRecords, sessions),
    [words, learnRecords, reviewRecords, sessions],
  );

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === selectedLexiconId), [decks, selectedLexiconId]);
  const effectiveLexiconId = selectedLexiconId === "all" || activeDeck ? selectedLexiconId : "all";
  const activeDeckName = activeDeck?.name || "系统推荐混合词池";
  const activeDeckWords = useMemo(
    () => (effectiveLexiconId !== "all" ? words.filter((word) => word.deckId === effectiveLexiconId) : words),
    [effectiveLexiconId, words],
  );
  const now = Date.now();
  const todayStart = startOfDay(now);
  const pendingLearn = activeDeckWords.filter((word) => word.status === "unseen" || word.status === "learning").length;
  const pendingReview = activeDeckWords.filter((word) => isDueToday(word, now)).length;
  const overdueInDeck = activeDeckWords.filter((word) => word.nextReviewAt && word.nextReviewAt < todayStart).length;
  const learnedInDeck = activeDeckWords.filter((word) => !["unseen", "learning", "suspended"].includes(word.status)).length;
  const forgettingWindows = useMemo(() => buildForgettingWindows(words), [words]);
  const weakWords = useMemo(
    () => words.filter((word) => word.status === "weak" || word.wrongCount >= 2).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 4),
    [words],
  );
  const recentFeedback = useMemo(() => {
    const byWord = new Map(words.map((word) => [word.id, word]));
    return [
      ...learnRecords.slice(0, 5).map((record) => ({ type: "learn" as const, time: record.createdAt, result: record.result, word: byWord.get(record.wordId) })),
      ...reviewRecords.slice(0, 5).map((record) => ({ type: "review" as const, time: record.createdAt, result: record.result, word: byWord.get(record.wordId) })),
    ]
      .filter((item) => item.word)
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
  }, [learnRecords, reviewRecords, words]);
  const trendBars = useMemo(() => buildTrendBars(learnRecords, reviewRecords), [learnRecords, reviewRecords]);
  const trendScale = useMemo(
    () => ({
      maxLearn: Math.max(...trendBars.map((item) => item.learn), 0),
      maxReview: Math.max(...trendBars.map((item) => item.review), 0),
    }),
    [trendBars],
  );
  const shouldReviewFirst = pendingReview > 0 && (pendingReview >= pendingLearn || overdueInDeck > 0);
  const primaryHint = shouldReviewFirst ? "先清复习窗口，再学新词" : pendingLearn > 0 ? "先推进一组新词" : "今天可以轻量巩固";
  const syncLabel = getSyncLabel(syncState.status);

  const renderAssistantContent = () => {
    if (assistantTab === "memory") {
      return (
        <div className="space-y-3">
          {recentFeedback.length ? (
            recentFeedback.map((item) => (
              <div
                key={`${item.word?.id}-${item.time}`}
                className="flex flex-col gap-3 rounded-xl bg-white/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{item.word?.term}</p>
                    <Badge
                      variant={
                        item.result === "forgot" || item.result === "dontKnow"
                          ? "danger"
                          : item.result === "hesitant" || item.result === "vague"
                            ? "warning"
                            : "success"
                      }
                    >
                      {item.type === "learn"
                        ? item.result === "know"
                          ? "首轮认识"
                          : item.result === "vague"
                            ? "首轮模糊"
                            : "首轮不认识"
                        : item.result === "remembered"
                          ? "记住了"
                          : item.result === "hesitant"
                            ? "勉强记住"
                            : "忘了"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">最近记录：{formatDate(item.time)}</p>
                </div>
                <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/review")}>
                  再看一遍
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-white/[0.04] p-4 text-sm text-muted-foreground">
              还没有最近学习记录，先完成一轮新学或复习后，这里会显示记忆反馈。
            </div>
          )}
        </div>
      );
    }

    if (assistantTab === "curve") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {forgettingWindows.map((window) => (
            <div key={window.label} className="rounded-xl bg-white/[0.04] p-4">
              <p className="text-sm text-muted-foreground">{window.label}</p>
              <strong className="mt-3 block text-3xl font-semibold">{window.value}</strong>
              <p className="mt-2 text-sm text-muted-foreground">{window.hint}</p>
            </div>
          ))}
        </div>
      );
    }

    if (assistantTab === "mistakes") {
      return (
        <div className="space-y-3">
          {weakWords.length ? (
            weakWords.map((item) => (
              <div key={item.id} className="rounded-xl bg-white/[0.04] px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.term}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.errorTags.length ? item.errorTags.join(" / ") : "近期遗忘次数偏高"}
                    </p>
                  </div>
                  <Badge variant="warning">错误 {item.wrongCount} 次</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-white/[0.04] p-4 text-sm text-muted-foreground">
              最近没有明显高频错误词，保持得不错。
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-xl bg-white/[0.04] p-4">
        <div className="flex h-36 items-end gap-2 sm:h-40 sm:gap-3">
          {trendBars.map((value) => (
              <div key={value.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-end gap-1">
                  <div
                    className="w-1/2 rounded-t-xl bg-primary/85"
                    style={{ height: `${getNormalizedMiniBarHeight(value.learn, trendScale.maxLearn)}px` }}
                  />
                  <div
                    className="w-1/2 rounded-t-xl bg-white/35"
                    style={{ height: `${getNormalizedMiniBarHeight(value.review, trendScale.maxReview)}px` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{value.label}</span>
              </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">主色代表新学，浅色代表复习。最近 7 天的节奏正在逐步稳定。</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-none">
        <CardContent className="space-y-6 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="secondary" className="shrink-0">当前词库</Badge>
              <select
                value={effectiveLexiconId}
                onChange={(event) => setSelectedLexiconId(event.target.value)}
                className="h-9 max-w-full rounded-full border border-border bg-input px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50 sm:max-w-[260px]"
                aria-label="选择首页统计词库"
              >
                <option value="all">系统推荐混合词池</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-panel/70 px-3 py-2 text-xs text-muted-foreground">
              <Cloud className="h-3.5 w-3.5 text-primary" />
              <span>{syncLabel}</span>
              {syncState.pendingCount ? <span>· {syncState.pendingCount} 条待上传</span> : null}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr] xl:items-end">
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">{primaryHint}</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl lg:text-5xl">
                今天的学习任务
              </h1>
              <p className="max-w-[520px] text-sm leading-6 text-muted-foreground">
                {activeDeckName}：还有 {pendingLearn} 个待学新词，{pendingReview} 个今日待复习。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="group rounded-[28px] border border-primary/20 bg-primary p-5 text-left text-primary-foreground shadow-card transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
                onClick={() => navigate("/learn")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold uppercase tracking-[0.16em] opacity-85">Learn</span>
                  <BookOpenCheck className="h-6 w-6 opacity-90 transition group-hover:scale-105" />
                </div>
                <strong className="mt-5 block text-6xl font-black leading-none tracking-tight sm:text-7xl">{pendingLearn}</strong>
                <p className="mt-3 text-base font-semibold">{pendingLearn ? "待学新词" : "新词已清空"}</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-2 text-sm font-semibold">
                  开始学习
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>

              <button
                type="button"
                className="group rounded-[28px] border border-border/80 bg-panel/85 p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg sm:p-6"
                onClick={() => (pendingReview ? navigate("/review") : navigate("/stats"))}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Review</span>
                  <RefreshCcw className="h-6 w-6 text-primary transition group-hover:rotate-45" />
                </div>
                <strong className="mt-5 block text-6xl font-black leading-none tracking-tight text-foreground sm:text-7xl">{pendingReview}</strong>
                <p className="mt-3 text-base font-semibold text-foreground">{pendingReview ? "今日需要巩固" : "今日已清空"}</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm font-semibold text-foreground">
                  {pendingReview ? "开始复习" : "查看复习计划"}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/70 bg-card/90 shadow-none lg:col-span-2">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4 text-primary" />
                今日完成率
              </div>
              <strong className="mt-3 block text-4xl font-semibold">{snapshot.completionRate}%</strong>
              <Progress value={snapshot.completionRate} className="mt-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Flame className="h-4 w-4 text-warning" />
                连续学习
              </div>
              <strong className="mt-3 block text-4xl font-semibold">{snapshot.streakDays} 天</strong>
              <p className="mt-2 text-sm text-muted-foreground">保持打开就学一点的节奏。</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-none">
          <CardContent className="p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">已学词</p>
            <strong className="mt-3 block text-4xl font-semibold">{learnedInDeck}</strong>
            <p className="mt-2 text-sm text-muted-foreground">当前词库范围</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-none">
          <CardContent className="p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">逾期复习</p>
            <strong className="mt-3 block text-4xl font-semibold">{overdueInDeck}</strong>
            <p className="mt-2 text-sm text-muted-foreground">包含在今日复习内</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-white/5 bg-card/90 shadow-none">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">智能辅助区</p>
                <p className="mt-1 text-sm text-muted-foreground">把遗忘提醒、记忆反馈、错词本和趋势合并到一个安静的辅助面板里。</p>
              </div>
              <div className="scrollbar-subtle overflow-x-auto">
                <div className="flex min-w-max items-center rounded-xl border border-border bg-panel p-1">
                  {assistantTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAssistantTab(tab.id)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                        assistantTab === tab.id ? "bg-white text-slate-950" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {renderAssistantContent()}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-card/90 shadow-none">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">词库入口</p>
                <p className="mt-1 text-sm text-muted-foreground">把资源管理收拢为一个入口卡，减少首页噪音。</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-2">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">当前词库</p>
                <strong className="mt-2 block text-2xl font-semibold">{activeDeckWords.length}</strong>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">待学习</p>
                <strong className="mt-2 block text-2xl font-semibold">{pendingLearn}</strong>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">待复习</p>
                <strong className="mt-2 block text-2xl font-semibold">{pendingReview}</strong>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.04] p-4 text-sm leading-6 text-muted-foreground">
              当前共有 {decks.length} 个可用词库。首页主数字会跟随当前词库切换，只显示真正需要学习和复习的词。
            </div>

            <Button className="w-full sm:w-auto" onClick={() => navigate("/library")}>
              打开词库
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
