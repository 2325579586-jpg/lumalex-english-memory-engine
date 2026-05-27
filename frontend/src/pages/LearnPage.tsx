import { ArrowLeft, BookmarkPlus, ChevronDown, MoreHorizontal, RotateCcw, Star, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SpellingPanel } from "@/components/shared/spelling-panel";
import { StudyDetailTabs } from "@/components/shared/study-detail-tabs";
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
const dailyTargetOptions = Array.from({ length: 10 }, (_, index) => (index + 1) * 10);

function getWordTitleSize(value: string, compact = false) {
  const length = value.replace(/\s+/g, "").length;
  if (compact) {
    if (length > 20) return "text-[26px] sm:text-[34px]";
    if (length > 14) return "text-[30px] sm:text-[40px]";
    if (length > 9) return "text-[36px] sm:text-[48px]";
    return "text-[42px] sm:text-[56px]";
  }
  if (length > 20) return "text-[30px] sm:text-[40px]";
  if (length > 14) return "text-[36px] sm:text-[48px]";
  if (length > 9) return "text-[46px] sm:text-[56px]";
  return "text-[56px] sm:text-[64px]";
}

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
  const navigate = useNavigate();
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

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
    const active = Boolean((activeSession && item) || spellingState);
    document.body.classList.toggle("study-session-active", active);
    return () => {
      document.body.classList.remove("study-session-active");
    };
  }, [activeSession, item?.id, spellingState]);

  useEffect(() => {
    setPendingResult(null);
    setDetailsVisible(false);
    setLearningAid(null);
    setMoreOpen(false);
    setActionMessage("");
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
    ? Math.min(3, currentScore + (pendingResult === "know" || pendingResult === "vague" ? 1 : 0))
    : currentScore;
  const meaningsText = item?.meanings?.length ? item.meanings.join("；") : "暂无释义";
  const primaryMeaning = item?.meanings?.length ? item.meanings.slice(0, pendingResult === "know" ? 2 : 4).join(" / ") : "暂无释义";
  const selectedFeedback = feedbackOptions.find((option) => option.value === pendingResult);
  const answerPartOfSpeech = item?.partOfSpeech || item?.type || "";

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
        onSubmit={async (answer, options) => {
          const result = await submitSpellingAnswer("learn", answer, options);
          if ("snapshot" in result && "words" in result && result.snapshot && result.words) {
            setSpellingState({ snapshot: result.snapshot, words: result.words });
          }
          return result;
        }}
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
                    navigate("/review");
                  }}
                >
                  进入复习
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
                <button
                  type="button"
                  onClick={() => setTargetPickerOpen((current) => !current)}
                  className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-input px-4 text-sm outline-none transition hover:border-primary/50 focus:border-primary/50"
                  aria-expanded={targetPickerOpen}
                >
                  <span>{dailyTarget} 个单词</span>
                  <ChevronDown className={cn("h-4 w-4 transition", targetPickerOpen && "rotate-180")} />
                </button>
                {targetPickerOpen ? (
                  <div className="rounded-2xl border border-border/70 bg-panel/70 p-4">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={10}
                      value={dailyTarget}
                      onChange={(event) => setDailyTarget(Number(event.target.value))}
                      className="w-full accent-primary"
                      aria-label="选择今日新词数量"
                    />
                    <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
                      {dailyTargetOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDailyTarget(option)}
                          className={cn(
                            "h-8 rounded-full border border-border/70 text-xs font-medium transition",
                            dailyTarget === option ? "border-primary bg-primary text-primary-foreground" : "bg-panel/60 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
    <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-3xl flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/88 shadow-card sm:h-[calc(100dvh-2.5rem)] lg:h-auto lg:min-h-[calc(100dvh-8rem)]">
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="border-b border-border/70 bg-card/80 px-3 py-3 backdrop-blur sm:px-5">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/60 text-muted-foreground transition hover:text-foreground"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/60 text-muted-foreground transition hover:text-foreground"
              title="更多"
              onClick={() => setMoreOpen((current) => !current)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          {moreOpen ? (
            <div className="mt-3 grid gap-2 rounded-2xl border border-border/70 bg-panel/80 p-3 text-sm sm:ml-auto sm:max-w-xs">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  playPronunciation(item, accent).catch(() => undefined);
                  setActionMessage("已播放当前单词发音。");
                }}
              >
                <Volume2 className="h-4 w-4" />
                播放发音
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  toggleFocusCurrent()
                    .then(() => setActionMessage(item.isFocused ? "已取消重点标记。" : "已加入重点复习。"))
                    .catch((error) => setActionMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。"));
                }}
              >
                <BookmarkPlus className="h-4 w-4" />
                {item.isFocused ? "取消重点" : "加入重点复习"}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  toggleStarCurrent()
                    .then(() => setActionMessage(item.isStarred ? "已取消收藏。" : "已收藏当前单词。"))
                    .catch((error) => setActionMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。"));
                }}
              >
                <Star className="h-4 w-4" />
                {item.isStarred ? "取消收藏" : "收藏单词"}
              </Button>
            </div>
          ) : null}
          {actionMessage ? <p className="mt-2 rounded-xl bg-panel/60 px-3 py-2 text-xs text-muted-foreground">{actionMessage}</p> : null}
        </header>

        <main className="scrollbar-subtle min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
          <section className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{item.partOfSpeech || item.type}</Badge>
              <Badge variant={detailsVisible ? "secondary" : "muted"}>{detailsVisible ? selectedFeedback?.label || "已判断" : "英文 → 中文"}</Badge>
            </div>

            <div className={cn("pt-5", detailsVisible ? "pb-3" : "pb-8")}>
              <h2
                className={cn(
                  "max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-none tracking-normal",
                  getWordTitleSize(item.term, detailsVisible),
                )}
                title={item.term}
              >
                {item.term}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-muted-foreground">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-panel/70 px-3 text-sm transition hover:border-primary/50 hover:text-foreground"
                  onClick={() => playPronunciation(item, accent).catch(() => undefined)}
                >
                  <Volume2 className="h-4 w-4" />
                  <span>{item.phonetic || "暂无音标"}</span>
                </button>
                <PronunciationActionBar
                  accent={accent}
                  isFocused={item.isFocused}
                  isStarred={item.isStarred}
                  onAccentChange={setAccent}
                  onPlay={() => playPronunciation(item, accent).catch(() => undefined)}
                  onFocus={() => toggleFocusCurrent().catch(() => undefined)}
                  onStar={() => toggleStarCurrent().catch(() => undefined)}
                />
              </div>
            </div>

            {!detailsVisible ? (
              <div className="flex flex-1 items-center">
                <div className="rounded-[24px] border border-dashed border-border/70 bg-panel/35 p-5 text-sm leading-6 text-muted-foreground">
                  先回忆中文含义，再判断掌握程度。答案、例句、搭配、近义词和派生词会在你选择后展开。
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-2">
                <div className="rounded-[22px] border border-border/70 bg-panel/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">答案反馈</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">已选：{selectedFeedback?.label}</Badge>
                      <Badge variant="muted">{nextScore}/3 分</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-semibold leading-7">
                    {answerPartOfSpeech ? <span className="mr-2 text-primary">{answerPartOfSpeech}</span> : null}
                    {meaningsText}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{primaryMeaning}</p>
                </div>

                <StudyDetailTabs
                  deckId={item.deckId}
                  currentTerm={item.term}
                  collocations={learningAid?.collocations || item.collocations}
                  derivedForms={learningAid?.derivedForms || item.derivedForms || []}
                  synonyms={learningAid?.synonyms || item.synonyms}
                  antonyms={learningAid?.antonyms || item.antonyms}
                  example={learningAid?.example || item.example}
                  exampleTranslation={learningAid?.exampleTranslation || item.exampleTranslation}
                  preferredAccent={accent}
                  loading={aidLoading}
                />
              </div>
            )}
          </section>
        </main>

        <footer className="border-t border-border/70 bg-card/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-5">
          {!detailsVisible ? (
            <div className="grid grid-cols-3 gap-2">
              {feedbackOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className="h-11 rounded-2xl border-border/80 bg-panel/55 px-2 text-sm"
                  onClick={() => chooseFeedback(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
              <Button variant="secondary" className="h-11 rounded-2xl" onClick={() => chooseFeedback("dontKnow")}>
                记错了
              </Button>
              <Button className="h-11 rounded-2xl" disabled={!pendingResult} onClick={() => commitAndNext().catch(() => undefined)}>
                下一词
              </Button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
