import { Activity, CalendarDays, Clock3, TrendingUp, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { deckRepository } from "@/repositories/deck-repository";
import { learnRecordRepository } from "@/repositories/learn-record-repository";
import { reviewRecordRepository } from "@/repositories/review-record-repository";
import { sessionRepository } from "@/repositories/session-repository";
import { wordRepository } from "@/repositories/word-repository";
import { startOfDay } from "@/lib/utils";
import type { Deck, LearnRecord, ReviewRecord, SessionRecord, WordItem } from "@/types/domain";

function rangeCount<T extends { createdAt?: number; startedAt?: number }>(items: T[], start: number, end: number) {
  return items.filter((item) => {
    const value = "createdAt" in item ? item.createdAt : item.startedAt;
    return !!value && value >= start && value < end;
  }).length;
}

function streakFromSessions(sessions: SessionRecord[]) {
  const dates = Array.from(
    new Set(sessions.filter((item) => item.endedAt).map((item) => startOfDay(item.startedAt))),
  ).sort((a, b) => b - a);
  if (!dates.length) return 0;
  let streak = 1;
  let cursor = dates[0];
  for (let index = 1; index < dates.length; index += 1) {
    if (dates[index] === cursor - 24 * 60 * 60 * 1000) {
      streak += 1;
      cursor = dates[index];
    } else {
      break;
    }
  }
  return streak;
}

function getNormalizedBarHeight(value: number, maxValue: number, maxHeight = 176, minHeight = 12) {
  if (value <= 0 || maxValue <= 0) return minHeight;
  const scaled = Math.round((value / maxValue) * maxHeight);
  return Math.min(maxHeight, Math.max(minHeight, scaled));
}

export function StatsPage() {
  const [words, setWords] = useState<WordItem[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [learnRecords, setLearnRecords] = useState<LearnRecord[]>([]);
  const [reviewRecords, setReviewRecords] = useState<ReviewRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = () => {
      Promise.all([
        wordRepository.list(),
        deckRepository.list(),
        learnRecordRepository.list(),
        reviewRecordRepository.list(),
        sessionRepository.list(),
      ]).then(([wordItems, deckItems, learnItems, reviewItems, sessionItems]) => {
        if (cancelled) return;
        setWords(wordItems);
        setDecks(deckItems);
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

  const now = Date.now();
  const today = startOfDay(now);
  const weekStart = today - 6 * 24 * 60 * 60 * 1000;
  const monthStart = today - 29 * 24 * 60 * 60 * 1000;

  const todayLearn = rangeCount(learnRecords, today, now + 1);
  const todayReview = rangeCount(reviewRecords, today, now + 1);
  const weekLearn = rangeCount(learnRecords, weekStart, now + 1);
  const weekReview = rangeCount(reviewRecords, weekStart, now + 1);
  const monthLearn = rangeCount(learnRecords, monthStart, now + 1);
  const monthReview = rangeCount(reviewRecords, monthStart, now + 1);

  const retention = useMemo(() => {
    const total = reviewRecords.length || 1;
    const remembered = reviewRecords.filter((record) => record.result === "remembered").length;
    return Math.round((remembered / total) * 100);
  }, [reviewRecords]);

  const weeklySummary: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "本周新学", value: String(weekLearn), icon: Activity },
    { label: "本周复习", value: String(weekReview), icon: CalendarDays },
    { label: "保持率", value: `${retention}%`, icon: TrendingUp },
    {
      label: "最佳时段",
      value: (() => {
        const hours = new Map<number, number>();
        [...learnRecords, ...reviewRecords].forEach((record) => {
          const hour = new Date(record.createdAt).getHours();
          hours.set(hour, (hours.get(hour) || 0) + 1);
        });
        const top = Array.from(hours.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 20;
        return `${String(top).padStart(2, "0")}:00`;
      })(),
      icon: Clock3,
    },
  ];

  const trendBars = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) => {
        const dayStart = today - (6 - index) * 24 * 60 * 60 * 1000;
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        return {
          label: `D${index + 1}`,
          learn: rangeCount(learnRecords, dayStart, dayEnd),
          review: rangeCount(reviewRecords, dayStart, dayEnd),
        };
      }),
    [learnRecords, reviewRecords, today],
  );
  const trendScale = useMemo(
    () => ({
      maxLearn: Math.max(...trendBars.map((item) => item.learn), 0),
      maxReview: Math.max(...trendBars.map((item) => item.review), 0),
    }),
    [trendBars],
  );

  const errorStats = useMemo(() => {
    const map = new Map<string, number>();
    words.forEach((word) => {
      word.errorTags.forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [words]);

  const heatmap = useMemo(() => {
    const counts = new Map<string, number>();
    [...learnRecords, ...reviewRecords].forEach((record) => {
      const day = new Date(record.createdAt).getDay();
      const bucket = Math.floor(new Date(record.createdAt).getHours() / 6);
      const key = `${day}-${bucket}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from({ length: 28 }).map((_, index) => {
      const day = index % 7;
      const bucket = Math.floor(index / 7);
      return counts.get(`${day}-${bucket}`) || 0;
    });
  }, [learnRecords, reviewRecords]);

  const masteryByDeck = useMemo(
    () =>
      decks.map((deck) => {
        const deckWords = words.filter((word) => word.deckId === deck.id);
        const mastered = deckWords.filter((word) => word.status === "mastered").length;
        return {
          label: deck.name,
          value: deckWords.length ? Math.round((mastered / deckWords.length) * 100) : 0,
        };
      }),
    [decks, words],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">本周学习总结卡</p>
            <h1 className="mt-2 text-3xl font-semibold">
              本周一共新学 {weekLearn} 个词，复习 {weekReview} 次，整体保持率 {retention}%。
            </h1>
            <p className="mt-3 max-w-[640px] text-sm leading-6 text-muted-foreground">
              今日新学 {todayLearn}、今日复习 {todayReview}；本月累计新学 {monthLearn}、本月累计复习 {monthReview}。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {weeklySummary.map((item) => (
              <div key={item.label} className="rounded-3xl border border-border/70 bg-panel/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <strong className="mt-6 block text-3xl">{item.value}</strong>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>新学数量趋势</CardTitle>
            <CardDescription>最近 7 天新学数与节奏变化。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-52 items-end gap-3 overflow-hidden sm:gap-4">
              {trendBars.map((value) => (
                <div key={value.label} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className="w-full rounded-t-3xl bg-gradient-to-t from-primary/70 to-primary"
                    style={{ height: `${getNormalizedBarHeight(value.learn, trendScale.maxLearn)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{value.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>复习数量趋势</CardTitle>
            <CardDescription>最近 7 天复习次数变化。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-52 items-end gap-3 overflow-hidden sm:gap-4">
              {trendBars.map((value) => (
                <div key={value.label} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className="w-full rounded-t-3xl bg-gradient-to-t from-accent/60 to-accent"
                    style={{ height: `${getNormalizedBarHeight(value.review, trendScale.maxReview)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{value.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>记忆保持率</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-muted-foreground">综合保持率</p>
              <strong className="mt-2 block text-4xl">{retention}%</strong>
            </div>
            <Progress value={retention} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>易错词分类</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(errorStats.length ? errorStats : [["暂无明显错误类型", 0]]).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="text-muted-foreground">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>学习时段热力图</CardTitle>
            <CardDescription>一天分成 4 段，按周查看学习热度。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {heatmap.map((value, index) => (
                <div
                  key={index}
                  className="h-10 rounded-xl"
                  style={{
                    background:
                      value > 8
                        ? "rgba(245,158,97,0.85)"
                        : value > 4
                          ? "rgba(124,140,255,0.55)"
                          : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>连续学习天数</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <strong className="text-5xl">{streakFromSessions(sessions)} 天</strong>
              <p className="mt-2 text-sm text-muted-foreground">已经形成稳定学习链条，下一步是降低断档风险。</p>
            </div>
            <CalendarDays className="h-12 w-12 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>词库掌握度分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {masteryByDeck.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <Progress value={item.value} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
