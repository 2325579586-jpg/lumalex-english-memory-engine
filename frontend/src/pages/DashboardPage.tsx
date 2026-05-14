import {
  Activity,
  BookOpenCheck,
  CalendarClock,
  CircleDashed,
  Flame,
  FolderKanban,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { startOfDay } from "@/lib/utils";
import { buildDashboardSnapshot } from "@/modules/dashboard/selectors";
import { deckRepository } from "@/repositories/deck-repository";
import { learnRecordRepository } from "@/repositories/learn-record-repository";
import { reviewRecordRepository } from "@/repositories/review-record-repository";
import { sessionRepository } from "@/repositories/session-repository";
import { wordRepository } from "@/repositories/word-repository";
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

export function DashboardPage() {
  const navigate = useNavigate();
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

  const pendingLearn = snapshot.todayLearnAvailable;
  const pendingReview = snapshot.todayReviewDue;
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
  const focusMinutes = Math.round(
    sessions.filter((session) => session.endedAt).reduce((sum, session) => sum + (session.durationSec || 0), 0) / 60,
  );
  const totalWordCount = useMemo(() => decks.reduce((sum, deck) => sum + deck.totalCount, 0), [decks]);
  const todayStart = startOfDay(Date.now());
  const todayLearnCount = useMemo(() => learnRecords.filter((record) => record.createdAt >= todayStart).length, [learnRecords, todayStart]);
  const todayReviewCount = useMemo(() => reviewRecords.filter((record) => record.createdAt >= todayStart).length, [reviewRecords, todayStart]);
  const learnCompletionRate = pendingLearn + todayLearnCount === 0 ? 100 : Math.min(100, Math.round((todayLearnCount / (todayLearnCount + pendingLearn)) * 100));
  const reviewCompletionRate = pendingReview + todayReviewCount === 0 ? 100 : Math.min(100, Math.round((todayReviewCount / (todayReviewCount + pendingReview)) * 100));

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
        <CardContent className="grid gap-6 p-6 sm:p-8 lg:gap-10 lg:p-9 xl:grid-cols-[1.35fr_0.7fr]">
          <div className="space-y-5 sm:space-y-6">
            <Badge variant="secondary">今日学习总览</Badge>
            <div className="space-y-4">
              <h1 className="max-w-[680px] text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl lg:text-5xl lg:leading-[1.08]">
                今天还剩 {Math.max(snapshot.totalTasks - snapshot.completedTasks, 0)} 项任务，
                {snapshot.recommendedAction === "review" ? "建议优先处理复习窗口" : "可以先推进一组新词"}。
              </h1>
              <p className="max-w-[620px] text-sm leading-7 text-muted-foreground sm:text-base">{snapshot.strategyCopy}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/learn")}>
                开始学习
              </Button>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate("/review")}>
                进入复习
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto" onClick={() => navigate("/learn")}>
                继续上次进度
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl bg-white/[0.045] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">今日完成率</p>
                <Target className="h-5 w-5 text-primary" />
              </div>
              <strong className="mt-6 block text-4xl font-semibold sm:mt-8 sm:text-5xl">{snapshot.completionRate}%</strong>
              <p className="mt-2 text-sm text-muted-foreground">
                已完成 {snapshot.completedTasks} / {snapshot.totalTasks} 项核心任务
              </p>
              <Progress value={snapshot.completionRate} className="mt-5 sm:mt-6" />
            </div>

            <div className="rounded-2xl bg-white/[0.045] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">连续学习天数</p>
                <Flame className="h-5 w-5 text-warning" />
              </div>
              <strong className="mt-6 block text-4xl font-semibold sm:mt-8 sm:text-5xl">{snapshot.streakDays}</strong>
              <p className="mt-2 text-sm text-muted-foreground">你已经把“打开就学一点”变成了稳定节奏。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:gap-6 xl:grid-cols-[1fr_1fr_1.08fr]">
        <Card className="border-white/5 bg-card/90 shadow-none">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">开始今天的新词学习</p>
                <p className="mt-1 text-sm text-muted-foreground">只显示真正需要推进的新词数量，不重复堆叠其他统计。</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <BookOpenCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">待学新词</p>
                <strong className="mt-2 block text-2xl font-semibold sm:text-3xl">{pendingLearn}</strong>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">预计时长</p>
                <strong className="mt-2 block text-2xl font-semibold sm:text-3xl">
                  {Math.max(8, Math.round(pendingLearn * 1.5))} 分钟
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleDashed className="h-4 w-4 shrink-0 text-primary" />
              推荐先学一组 10 个，保持节奏稳定比一次学太多更有效。
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" onClick={() => navigate("/learn")}>
                开始新学
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => navigate("/library")}>
                查看词单
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-card/90 shadow-none">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">巩固已复习过的词</p>
                <p className="mt-1 text-sm text-muted-foreground">先清掉到期窗口，再继续扩大输入量。</p>
              </div>
              <div className="rounded-xl bg-accent/10 p-2 text-accent-foreground">
                <CalendarClock className="h-5 w-5 text-accent" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">待复习</p>
                <strong className="mt-2 block text-2xl font-semibold sm:text-3xl">{pendingReview}</strong>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">逾期词</p>
                <strong className="mt-2 block text-2xl font-semibold sm:text-3xl">{snapshot.overdueCount}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-accent" />
              本轮重点：昨日遗忘词、近期模糊词、逾期复习词。
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" variant="secondary" onClick={() => navigate("/review")}>
                开始复习
              </Button>
              <Button className="flex-1" variant="ghost" onClick={() => navigate("/stats")}>
                查看计划
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-card/90 shadow-none">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">今日任务节奏</p>
                <p className="mt-1 text-sm text-muted-foreground">把今天的节奏看清楚，就更容易稳定完成。</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-2 text-foreground">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-4 rounded-xl bg-white/[0.04] p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">学习进度</span>
                  <span>{learnCompletionRate}%</span>
                </div>
                <Progress value={learnCompletionRate} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">复习进度</span>
                  <span>{reviewCompletionRate}%</span>
                </div>
                <Progress value={reviewCompletionRate} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">专注时长</p>
                <strong className="mt-2 block text-xl font-semibold">{focusMinutes} 分钟</strong>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-sm text-muted-foreground">预计剩余</p>
                <strong className="mt-2 block text-xl font-semibold">{Math.max(5, Math.round((snapshot.totalTasks - snapshot.completedTasks) * 1.8))} 分钟</strong>
              </div>
            </div>

            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => navigate("/stats")}>
              查看详细计划
            </Button>
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
                <p className="text-sm text-muted-foreground">总词条数</p>
                <strong className="mt-2 block text-2xl font-semibold">{totalWordCount}</strong>
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
              当前共有 {decks.length} 个可用词库。系统会把新词、到期复习词和薄弱词统一纳入调度。
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
