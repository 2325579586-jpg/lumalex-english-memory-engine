import { ArrowLeft, BookmarkPlus, MoreHorizontal, RotateCcw, Star, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SpellingPanel } from "@/components/shared/spelling-panel";
import { WordRelationsPanel } from "@/components/shared/word-relations-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getLearningAid, type LearningAid } from "@/services/learning-aid-service";
import { playPronunciation, warmPronunciationVoices } from "@/services/pronunciation-service";
import { abandonSpellingSession, getSpellingSessionState, startSpellingSession, submitSpellingAnswer } from "@/services/spelling-service";
import { useSettingsStore } from "@/stores/settings-store";
import { useStudyStore } from "@/stores/study-store";
import type { LearnResult } from "@/types/domain";

const feedbackOptions: Array<{ value: LearnResult; label: string; hint: string }> = [
  { value: "know", label: "认识", hint: "能想起" },
  { value: "vague", label: "模糊", hint: "有印象" },
  { value: "dontKnow", label: "不认识", hint: "要重学" },
];

type PronunciationActionBarProps = {
  accent: "uk" | "us";
  isFocused: boolean;
  isStarred: boolean;
  onAccentChange: (accent: "uk" | "us") => void;
  onPlay: () => void;
  onFocus: () => void;
  onStar: () => void;
};

function PronunciationActionBar({
  accent,
  isFocused,
  isStarred,
  onAccentChange,
  onPlay,
  onFocus,
  onStar,
}: PronunciationActionBarProps) {
  return (
    <div className="mx-auto mt-3 flex w-full max-w-[360px] items-center justify-center gap-2">
      <div className="flex h-9 shrink-0 items-center rounded-full border border-border/70 bg-panel/70 p-1">
        {(["us", "uk"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "h-7 rounded-full px-2.5 text-xs font-semibold transition",
              accent === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onAccentChange(item)}
          >
            {item === "us" ? "美" : "英"}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-panel/70 px-3 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
        onClick={onPlay}
      >
        <Volume2 className="h-4 w-4 shrink-0" />
        <span className="truncate">发音</span>
      </button>
      <button
        type="button"
        aria-label="加入词库"
        title="加入词库"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/70 transition hover:border-primary/50 hover:bg-primary/5 active:scale-95",
          isFocused && "border-primary/60 text-primary",
        )}
        onClick={onFocus}
      >
        <BookmarkPlus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="星标"
        title="星标"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/70 transition hover:border-primary/50 hover:bg-primary/5 active:scale-95",
          isStarred && "border-warning/60 text-warning",
        )}
        onClick={onStar}
      >
        <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
      </button>
    </div>
  );
}

export function LearnPage() {
  const {
    decks,
    selectedLexiconId,
    dailyTarget,
    loading,
    error,
    queue,
    currentIndex,
    activeSession,
    completedSummary,
    hydrate,
    setSelectedLexiconId,
    setDailyTarget,
    startSession,
    submitFeedback,
    toggleStarCurrent,
    toggleFocusCurrent,
    abandonSession,
    clearCompletedSummary,
  } = useStudyStore();
  const settings = useSettingsStore((state) => state.settings);
  const [accent, setAccent] = useState<"uk" | "us">(settings.preferredAccent);
  const [pendingResult, setPendingResult] = useState<LearnResult | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [learningAid, setLearningAid] = useState<LearningAid | null>(null);
  const [aidLoading, setAidLoading] = useState(false);
  const [spellingState, setSpellingState] = useState<Awaited<ReturnType<typeof getSpellingSessionState>> | null>(null);
  const [spellingDismissed, setSpellingDismissed] = useState(false);

  useEffect(() => {
    warmPronunciationVoices();
  }, []);

  useEffect(() => {
    setAccent(settings.preferredAccent);
  }, [settings.preferredAccent]);

  useEffect(() => {
    hydrate().catch(() => undefined);
  }, [hydrate]);

  useEffect(() => {
    getSpellingSessionState("learn").then(setSpellingState).catch(() => undefined);
  }, []);

  useEffect(() => {
    const handleCloudSync = () => {
      hydrate().catch(() => undefined);
    };
    window.addEventListener("lumalex:cloud-sync", handleCloudSync);
    return () => window.removeEventListener("lumalex:cloud-sync", handleCloudSync);
  }, [hydrate]);

  const item = queue[currentIndex];

  useEffect(() => {
    setPendingResult(null);
    setDetailsVisible(false);
    setLearningAid(null);
  }, [item?.id]);

  useEffect(() => {
    if (!completedSummary?.wordIds?.length || spellingState || spellingDismissed) return;
    startSpellingSession("learn", completedSummary.wordIds)
      .then((state) => {
        if (state) setSpellingState(state);
      })
      .catch(() => undefined);
  }, [completedSummary, spellingDismissed, spellingState]);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setAidLoading(true);
    getLearningAid(item)
      .then((aid) => {
        if (!cancelled) setLearningAid(aid);
      })
      .finally(() => {
        if (!cancelled) setAidLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  const chooseFeedback = useCallback(
    (result: LearnResult) => {
      setPendingResult(result);
      setDetailsVisible(true);
      if (settings.autoPlayPronunciation && item) {
        void playPronunciation(item, accent);
      }
    },
    [accent, item, settings.autoPlayPronunciation],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!activeSession) return;

      const key = event.key.toLowerCase();
      if (key === "1") chooseFeedback("know");
      if (key === "2") chooseFeedback("vague");
      if (key === "3") chooseFeedback("dontKnow");
      if (key === "n" && pendingResult) {
        const selected = pendingResult;
        submitFeedback(selected)
          .then(() => {
            setPendingResult(null);
            setDetailsVisible(false);
          })
          .catch(() => undefined);
      }
      if (key === "s") toggleStarCurrent().catch(() => undefined);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSession, chooseFeedback, pendingResult, submitFeedback, toggleStarCurrent]);

  const currentDeckName = useMemo(
    () => decks.find((deck) => deck.id === selectedLexiconId)?.name || "系统推荐词池",
    [decks, selectedLexiconId],
  );

  const progress = queue.length ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0;
  const currentScore = item ? activeSession?.scoreMap?.[item.id] || 0 : 0;
  const nextScore = pendingResult
    ? Math.min(3, currentScore + (pendingResult === "know" ? 3 : pendingResult === "vague" ? 1 : 0))
    : currentScore;
  const willAdvance = nextScore >= 3;
  const meaningsText = item?.meanings?.length ? item.meanings.join("；") : "暂无释义";
  const primaryMeaning = item?.meanings?.length ? item.meanings.slice(0, pendingResult === "know" ? 2 : 4).join(" / ") : "暂无释义";
  const selectedFeedback = feedbackOptions.find((option) => option.value === pendingResult);

  const commitAndNext = async () => {
    if (!pendingResult) return;
    await submitFeedback(pendingResult);
    setPendingResult(null);
    setDetailsVisible(false);
  };

  const spellingWord = spellingState?.words?.[spellingState.snapshot.currentIndex];

  if (spellingState && spellingWord) {
    return (
      <SpellingPanel
        word={spellingWord}
        currentIndex={spellingState.snapshot.currentIndex}
        total={spellingState.words.length}
        accent={accent}
        sourceLabel="学习完成后拼写"
        onSubmit={(answer) => submitSpellingAnswer("learn", answer)}
        onExit={() => {
          abandonSpellingSession("learn")
            .then(() => {
              setSpellingState(null);
              setSpellingDismissed(true);
            })
            .catch(() => undefined);
        }}
        onCompleted={() => {
          setSpellingState(null);
          setSpellingDismissed(true);
        }}
      />
    );
  }

  if (completedSummary) {
    const rate = Math.round((completedSummary.know / Math.max(completedSummary.total, 1)) * 100);
    return (
      <div className="space-y-6">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>本轮学习完成</CardTitle>
            <CardDescription>新词已经完成第一次编码，系统会根据反馈安排第一次复习时间。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase text-muted">认识</p>
                <strong className="mt-3 block text-4xl">{completedSummary.know}</strong>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase text-muted">模糊</p>
                <strong className="mt-3 block text-4xl">{completedSummary.vague}</strong>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase text-muted">不认识</p>
                <strong className="mt-3 block text-4xl">{completedSummary.dontKnow}</strong>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-panel/60 p-6">
              <p className="text-sm text-muted-foreground">本轮认识率</p>
              <p className="mt-2 text-4xl font-semibold">{rate}%</p>
              <Progress className="mt-4" value={rate} />
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => {
                    setSpellingDismissed(false);
                    clearCompletedSummary();
                  }}
                >
                  继续新学
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSpellingDismissed(false);
                    clearCompletedSummary();
                  }}
                >
                  稍后复习
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeSession || !item) {
    return (
      <div className="space-y-6">
        <Card className="shadow-none">
          <CardContent className="grid gap-6 p-5 sm:p-8 xl:grid-cols-[1fr_0.92fr]">
            <div className="space-y-4">
              <p className="text-xs uppercase text-muted">学习准备</p>
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">先确定今天要学哪一组词，再进入正式学习。</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                学习页会从真实的未学习词池中抽取新词，记录你的反馈，并自动生成第一次复习时间。
              </p>
            </div>
            <div className="grid gap-4 rounded-2xl border border-border/70 bg-panel/60 p-5 sm:p-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">词库选择</label>
                <select
                  value={selectedLexiconId}
                  onChange={(event) => setSelectedLexiconId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-input px-4 text-sm outline-none transition focus:border-primary/50"
                >
                  <option value="all">系统推荐混合词池</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">今日新词目标</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={dailyTarget}
                  onChange={(event) => setDailyTarget(Number(event.target.value) || 20)}
                  className="h-11 w-full rounded-xl border border-border bg-input px-4 text-sm outline-none transition focus:border-primary/50"
                />
              </div>
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button className="w-full sm:w-auto" disabled={loading} onClick={() => startSession().catch(() => undefined)}>
                {loading ? "准备中..." : "开始新学"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-36 lg:pb-6">
      <Card className="overflow-hidden border-border/70 bg-card/88 shadow-none">
        <CardContent className="flex min-h-[calc(100dvh-180px)] flex-col p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => abandonSession().catch(() => undefined)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{currentDeckName}</span>
                <span className="shrink-0 font-medium text-foreground">
                  {currentIndex + 1}/{queue.length}
                </span>
              </div>
              <Progress className="mt-2 h-1.5" value={progress} />
            </div>
            <button
              type="button"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/60 text-muted-foreground transition hover:text-foreground sm:flex"
              title="重新回忆"
              onClick={() => {
                setPendingResult(null);
                setDetailsVisible(false);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/60 text-muted-foreground transition hover:text-foreground sm:flex"
              title="更多"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <section className="flex flex-1 flex-col justify-center py-5 text-center sm:py-8">
            <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
              <Badge variant="muted">{item.partOfSpeech || item.type}</Badge>
              <Badge variant={detailsVisible ? "secondary" : "muted"}>
                {detailsVisible ? selectedFeedback?.hint || "已判断" : "先回忆，再判断"}
              </Badge>
            </div>

            <h2 className="mx-auto mt-5 max-w-full break-words text-5xl font-semibold leading-[1.05] sm:text-6xl">
              {item.term}
            </h2>
            <div className="mt-3 flex items-center justify-center gap-2 text-muted-foreground">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-base transition hover:bg-primary/5 hover:text-foreground"
                onClick={() => playPronunciation(item, accent).catch(() => undefined)}
              >
                <span>{item.phonetic || "暂无音标"}</span>
                <Volume2 className="h-4 w-4" />
              </button>
            </div>

            <PronunciationActionBar
              accent={accent}
              isFocused={item.isFocused}
              isStarred={item.isStarred}
              onAccentChange={setAccent}
              onPlay={() => playPronunciation(item, accent).catch(() => undefined)}
              onFocus={() => toggleFocusCurrent().catch(() => undefined)}
              onStar={() => toggleStarCurrent().catch(() => undefined)}
            />

            <div className="mx-auto mt-5 max-w-xl">
              <p className={cn("text-lg font-medium leading-7", !detailsVisible && "text-muted-foreground")}>
                {detailsVisible ? primaryMeaning : "先回忆含义，再判断掌握程度"}
              </p>
              {!detailsVisible ? (
                <p className="mt-2 text-sm text-muted-foreground">答案和学习辅助内容会在你做出判断后展开。</p>
              ) : null}
            </div>
          </section>

          {detailsVisible ? (
            <div className="space-y-3">
              <div className="rounded-[22px] border border-border/70 bg-panel/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">答案反馈</p>
                  <Badge variant="muted">累计 {nextScore}/3 分</Badge>
                </div>
                <p className="mt-3 text-xl font-semibold leading-8">{meaningsText}</p>
                {pendingResult !== "know" && item.example ? (
                  <div className="mt-3 rounded-2xl bg-white/5 p-3">
                    <p className="text-sm leading-6">{item.example}</p>
                    {item.exampleTranslation ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.exampleTranslation}</p> : null}
                  </div>
                ) : null}
              </div>

              <WordRelationsPanel
                deckId={item.deckId}
                currentTerm={item.term}
                collocations={learningAid?.collocations || item.collocations}
                derivedForms={learningAid?.derivedForms || item.derivedForms || []}
                roots={learningAid?.roots || item.roots}
                synonyms={learningAid?.synonyms || item.synonyms}
                antonyms={learningAid?.antonyms || item.antonyms}
                example={learningAid?.example || item.example}
                exampleTranslation={learningAid?.exampleTranslation || item.exampleTranslation}
                memoryHint={settings.showMemoryHint ? learningAid?.memoryHint || item.memoryHint : ""}
                preferredAccent={accent}
                aiLoading={aidLoading}
              />
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border/70 bg-panel/35 p-4 text-center text-sm text-muted-foreground">
              详细释义、例句、词根、派生、近义和搭配会折叠在这里，先不要偷看。
            </div>
          )}

          <div className="mt-4 hidden gap-2 lg:grid lg:grid-cols-[repeat(3,1fr)_1.1fr]">
            {feedbackOptions.map((option) => (
              <Button
                key={option.value}
                size="lg"
                variant={pendingResult === option.value ? "default" : "outline"}
                className={cn(
                  "rounded-full border-border/80 bg-panel/50",
                  pendingResult === option.value && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
                )}
                onClick={() => chooseFeedback(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button size="lg" className="rounded-full" disabled={!pendingResult} onClick={() => commitAndNext().catch(() => undefined)}>
              {willAdvance ? "下一词" : "确认"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-4 bottom-24 z-30 rounded-[24px] border border-border/80 bg-panel/95 p-3 shadow-card backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <Badge variant="muted">{willAdvance ? "可进入下一词" : `累计 ${nextScore}/3 分`}</Badge>
          {pendingResult ? <span>已选：{selectedFeedback?.label}</span> : <span>选择掌握程度</span>}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {feedbackOptions.map((option) => (
            <Button
              key={option.value}
              variant={pendingResult === option.value ? "default" : "outline"}
              className={cn(
                "h-11 rounded-full border-border/80 bg-panel/50 text-sm",
                pendingResult === option.value && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
              )}
              onClick={() => chooseFeedback(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {pendingResult ? (
          <Button className="mt-2 h-11 w-full rounded-full" onClick={() => commitAndNext().catch(() => undefined)}>
            {willAdvance ? "下一词" : "确认判断"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
