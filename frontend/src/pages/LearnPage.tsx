import { ArrowLeft, BookmarkPlus, ChevronRight, Image as ImageIcon, Pause, Settings2, Star, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExampleBlock } from "@/components/shared/example-block";
import { SpellingPanel } from "@/components/shared/spelling-panel";
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

const feedbackOptions: Array<{ value: LearnResult; label: string }> = [
  { value: "know", label: "认识" },
  { value: "vague", label: "模糊" },
  { value: "dontKnow", label: "不认识" },
];

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
            <CardDescription>新词已经完成第一次编码，系统已根据你的反馈安排首轮复习时间。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">认识</p>
                <strong className="mt-3 block text-4xl">{completedSummary.know}</strong>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">模糊</p>
                <strong className="mt-3 block text-4xl">{completedSummary.vague}</strong>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">不认识</p>
                <strong className="mt-3 block text-4xl">{completedSummary.dontKnow}</strong>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-panel/60 p-6">
              <p className="text-sm text-muted-foreground">本轮认识率</p>
              <p className="mt-2 text-4xl font-semibold">{rate}%</p>
              <Progress className="mt-4" value={rate} />
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <p>推荐下一步：</p>
                <p>1. 立刻进入复习，先巩固刚被安排到近期窗口的词。</p>
                <p>2. 或继续下一组新词，把今天的目标一次推进完成。</p>
                <p>3. 模糊和不认识的词会更早重新出现。</p>
              </div>
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
                  稍后去复习
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
              <p className="text-xs uppercase tracking-[0.22em] text-muted">学习准备</p>
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
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="w-full sm:w-auto" disabled={loading} onClick={() => startSession().catch(() => undefined)}>
                  {loading ? "准备中..." : "开始新学"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-40 sm:space-y-6 lg:pb-6">
      <Card className="overflow-hidden shadow-none">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-8">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" className="mt-1 rounded-lg" onClick={() => abandonSession().catch(() => undefined)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted">当前词单</p>
                <h1 className="mt-2 text-lg font-semibold sm:text-2xl">{currentDeckName}</h1>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm sm:gap-6">
              <div>
                <p className="text-muted-foreground">进度</p>
                <strong className="mt-1 block text-lg sm:text-xl">
                  {currentIndex + 1}/{queue.length}
                </strong>
              </div>
              <div>
                <p className="text-muted-foreground">剩余</p>
                <strong className="mt-1 block text-lg sm:text-xl">{(Math.max(1, queue.length - currentIndex - 1) * 1.5).toFixed(1)} 分钟</strong>
              </div>
              <div>
                <p className="text-muted-foreground">模式</p>
                <strong className="mt-1 block text-lg sm:text-xl">首次编码</strong>
              </div>
            </div>
          </div>
          <div className="hidden flex-wrap items-center gap-2 sm:gap-3 lg:flex">
            <Button variant="ghost" className="w-full rounded-lg sm:w-auto">
              <Settings2 className="h-4 w-4" />
              学习设置
            </Button>
            <Button variant="secondary" className="w-full rounded-lg sm:w-auto">
              专注模式
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr] xl:gap-6">
        <Card className="overflow-hidden shadow-none">
          <CardContent className="space-y-6 p-5 sm:space-y-8 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge>{item.partOfSpeech || item.type}</Badge>
                  <Badge variant="muted">先回忆含义，再决定是否展开答案</Badge>
                </div>
                <h2 className="mt-5 break-words text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{item.term}</h2>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <p className="text-base text-muted-foreground sm:text-lg">{item.phonetic || "暂无音标"}</p>
                  <div className="flex items-center rounded-full border border-border p-1">
                    <button
                      type="button"
                      className={cn("rounded-full px-3 py-1.5 text-xs font-medium", accent === "uk" ? "bg-white text-slate-950" : "text-muted-foreground")}
                      onClick={() => setAccent("uk")}
                    >
                      英音
                    </button>
                    <button
                      type="button"
                      className={cn("rounded-full px-3 py-1.5 text-xs font-medium", accent === "us" ? "bg-white text-slate-950" : "text-muted-foreground")}
                      onClick={() => setAccent("us")}
                    >
                      美音
                    </button>
                  </div>
                  <Button variant="secondary" className="w-full rounded-lg sm:w-auto" onClick={() => playPronunciation(item, accent).catch(() => undefined)}>
                    <Volume2 className="h-4 w-4" />
                    播放发音
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 self-end lg:self-start">
                <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => toggleFocusCurrent().catch(() => undefined)}>
                  <BookmarkPlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => toggleStarCurrent().catch(() => undefined)}>
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!detailsVisible ? (
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">当前任务</p>
                <p className="mt-3 text-base leading-7 sm:text-lg">先不要看答案，先在脑中回忆这个词的中文意思、使用场景和语气，再选择你的掌握程度。</p>
                <div className="mt-5 grid gap-3 rounded-xl border border-dashed border-border/70 bg-panel p-4 text-sm text-muted-foreground sm:grid-cols-3">
                  <div>
                    <p className="font-medium text-foreground">1 = 认识</p>
                    <p className="mt-1">能够稳定想起释义与用法。</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">2 = 模糊</p>
                    <p className="mt-1">有印象，但仍不够确定。</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">3 = 不认识</p>
                    <p className="mt-1">几乎想不起来或完全陌生。</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 rounded-2xl border border-border/70 bg-panel/60 p-5 lg:grid-cols-[1fr_0.42fr]">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted">核心中文释义</p>
                    <p className="mt-3 text-xl font-medium sm:text-2xl">{meaningsText}</p>
                  </div>
                  <div>
                    <ExampleBlock
                      title="例句"
                      example={item.example || ""}
                      translation={item.exampleTranslation || ""}
                      preferredAccent={accent}
                      autoPlay={settings.autoPlayExampleSentence && detailsVisible}
                    />
                  </div>
                  {settings.showMemoryHint && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted">记忆提示</p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.memoryHint || "当前词条还没有记忆提示。"}</p>
                    </div>
                  )}
                </div>
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-border bg-panel sm:min-h-[220px]">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-8 w-8" />
                    <p className="mt-3 text-sm">可选图片记忆位</p>
                  </div>
                </div>
              </div>
            )}

            <div className="hidden space-y-4 lg:block">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>{detailsVisible ? "答案已展开，可以确认你的判断后进入下一词。" : "先选掌握程度，再展开释义与例句。"}</p>
                <span>1=认识 / 2=模糊 / 3=不认识 / N=下一词 / S=收藏</span>
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                {feedbackOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="lg"
                    variant={pendingResult === option.value ? "default" : "outline"}
                    className={cn(
                      "rounded-lg border-border/80 bg-panel/50",
                      pendingResult === option.value && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
                    )}
                    onClick={() => chooseFeedback(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
                <Button size="lg" variant="ghost" className="rounded-lg" disabled={!pendingResult} onClick={() => commitAndNext().catch(() => undefined)}>
                  下一词
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5 sm:space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>学习辅助</CardTitle>
              <CardDescription>{aidLoading ? "AI 正在补全当前单词的辅助信息。" : "默认折叠次要信息，保持主界面专注。"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-panel/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">词根词缀</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {(learningAid?.roots || item.roots).map((root) => (
                    <li key={root}>{root}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border/70 bg-panel/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">近义 / 反义</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...(learningAid?.synonyms || item.synonyms), ...(learningAid?.antonyms || item.antonyms)].map((word) => (
                    <Badge key={word} variant="muted">
                      {word}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-panel/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">常见搭配</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {(learningAid?.collocations || item.collocations).map((collocation) => (
                    <li key={collocation}>{collocation}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border/70 bg-panel/60 p-4">
                <p className="font-medium">AI 记忆提示</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{learningAid?.memoryHint || item.memoryHint || "正在准备记忆提示。"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>当前节奏</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground">已完成</p>
                  <strong className="mt-2 block text-xl sm:text-2xl">{currentIndex}</strong>
                </div>
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground">剩余</p>
                  <strong className="mt-2 block text-xl sm:text-2xl">{queue.length - currentIndex - 1}</strong>
                </div>
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground">目标</p>
                  <strong className="mt-2 block text-xl sm:text-2xl">{queue.length}</strong>
                </div>
              </div>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">学习中刷新页面后，可以继续回到这组词的当前进度。</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-24 z-30 rounded-[24px] border border-border/80 bg-panel/96 p-4 shadow-card backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <Badge variant="muted">{willAdvance ? "满 3 分后进入下一词" : `累计 ${nextScore}/3 分`}</Badge>
          <span>{detailsVisible ? "答案已展开，确认后进入下一词" : "先判断掌握程度，再展开答案"}</span>
          {pendingResult && <Badge variant="muted">已选：{feedbackOptions.find((option) => option.value === pendingResult)?.label}</Badge>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {feedbackOptions.map((option) => (
            <Button
              key={option.value}
              variant={pendingResult === option.value ? "default" : "outline"}
              className={cn(
                "h-12 rounded-xl border-border/80 bg-panel/50",
                pendingResult === option.value && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
              )}
              onClick={() => chooseFeedback(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" className="h-12 rounded-xl" onClick={() => playPronunciation(item, accent).catch(() => undefined)}>
            <Volume2 className="h-4 w-4" />
            发音
          </Button>
          <Button className="h-12 rounded-xl" disabled={!pendingResult} onClick={() => commitAndNext().catch(() => undefined)}>
            下一词
          </Button>
        </div>
      </div>
    </div>
  );
}
