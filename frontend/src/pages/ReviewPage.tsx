import { ArrowLeft, Clock3, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LetterSpellingInput } from "@/components/shared/letter-spelling-input";
import { SpellingPanel } from "@/components/shared/spelling-panel";
import { StudyDetailTabs } from "@/components/shared/study-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { reviewModes } from "@/data/mock-data";
import { focusNativeSpellingInput, nativeSpellingInputProps } from "@/lib/native-spelling-input";
import { getSpellingMeaningText, getStudyTitleStyle, normalizeSpellingAnswer } from "@/lib/study-text";
import { cn } from "@/lib/utils";
import { playPronunciation, warmPronunciationVoices } from "@/services/pronunciation-service";
import { getReviewResultScore, hasAnsweredReviewWord } from "@/services/review-service";
import { abandonSpellingSession, getSpellingSessionState, startSpellingSession, submitSpellingAnswer } from "@/services/spelling-service";
import { readStorage } from "@/services/storage";
import { useReviewStore } from "@/stores/review-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { ReviewMode, ReviewResult } from "@/types/domain";

const DEFAULT_REVIEW_MODE_KEY = "default-review-mode";

const reviewOptions: Array<{ value: ReviewResult; label: string; hint: string }> = [
  { value: "remembered", label: "记住了", hint: "稳定" },
  { value: "hesitant", label: "勉强", hint: "不稳" },
  { value: "forgot", label: "忘了", hint: "重学" },
];

const reviewModeById: Record<string, ReviewMode> = {
  "en-zh": "en_to_zh",
  "zh-en": "zh_to_en",
  audio: "audio",
  spelling: "spelling",
  cloze: "cloze",
};

const reviewModeLabel: Record<ReviewMode, string> = {
  en_to_zh: "英文 → 中文",
  zh_to_en: "中文 → 英文",
  audio: "听音辨义",
  spelling: "拼写复习",
  cloze: "例句填空",
};

type SpellingStage =
  | "idle"
  | "correct"
  | "wrong_show_answer"
  | "retry_after_hint"
  | "retry_correct_no_score"
  | "retry_wrong";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildClozeExample(example: string, term: string) {
  if (!example.trim()) return "当前词条暂无例句，请根据中文释义拼写英文。";
  const escaped = escapeRegExp(term.trim());
  if (!escaped) return example;
  const phrasePattern = new RegExp(escaped, "ig");
  const replaced = example.replace(phrasePattern, "____");
  return replaced === example ? example.replace(/\b[A-Za-z][A-Za-z'-]*\b/, "____") : replaced;
}

export function ReviewPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((state) => state.settings);
  const {
    mode,
    revealed,
    loading,
    submitting: storeSubmitting,
    error,
    queue,
    currentIndex,
    activeSession,
    completedSummary,
    hydrate,
    setMode,
    reveal,
    hide,
    startSession,
    submitFeedback: commitReviewFeedback,
    postpone,
    abandonSession,
    clearCompletedSummary,
  } = useReviewStore();
  const [pendingResult, setPendingResult] = useState<ReviewResult | null>(null);
  const [accent, setAccent] = useState<"uk" | "us">(settings.preferredAccent);
  const [committing, setCommitting] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [answerChecked, setAnswerChecked] = useState(false);
  const [spellingStage, setSpellingStage] = useState<SpellingStage>("idle");
  const [postRoundSpellingState, setPostRoundSpellingState] = useState<Awaited<ReturnType<typeof getSpellingSessionState>> | null>(null);
  const [postRoundSpellingDoneKey, setPostRoundSpellingDoneKey] = useState("");
  const spellingInputRef = useRef<HTMLInputElement | null>(null);
  const item = queue[currentIndex];
  const activeMode = activeSession?.modeSequence?.[activeSession.modeIndex] ?? mode;
  const isObjectiveMode = activeMode === "spelling" || activeMode === "cloze";
  const isSpellingMode = activeMode === "spelling";
  const actionPending = committing || storeSubmitting;

  useEffect(() => {
    const active = Boolean((activeSession && item) || postRoundSpellingState);
    document.body.classList.toggle("study-session-active", active);
    return () => {
      document.body.classList.remove("study-session-active");
    };
  }, [activeSession, item?.id, postRoundSpellingState]);

  const submitFeedback = async (result: ReviewResult) => {
    if (actionPending) return;
    setPendingResult(result);
    reveal();
    if (settings.autoPlayPronunciation && item) {
      void playPronunciation(item, accent).catch(() => undefined);
    }
  };

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
    getSpellingSessionState("review").then(setPostRoundSpellingState).catch(() => undefined);
  }, []);

  useEffect(() => {
    setMode(readStorage<ReviewMode>(DEFAULT_REVIEW_MODE_KEY, "en_to_zh"));
  }, [setMode]);

  useEffect(() => {
    if (!completedSummary) {
      setPostRoundSpellingDoneKey("");
    }
  }, [completedSummary]);

  useEffect(() => {
    if (!activeSession) return;
    setPostRoundSpellingDoneKey("");
  }, [activeSession?.sessionId]);

  useEffect(() => {
    const summaryKey = completedSummary?.wordIds?.join("|") || "";
    if (!summaryKey || postRoundSpellingState || postRoundSpellingDoneKey === summaryKey) return;
    startSpellingSession("review", completedSummary?.wordIds || [])
      .then((state) => {
        if (state) setPostRoundSpellingState(state);
      })
      .catch(() => undefined);
  }, [completedSummary, postRoundSpellingDoneKey, postRoundSpellingState]);

  useEffect(() => {
    const handleCloudSync = () => {
      hydrate().catch(() => undefined);
    };
    window.addEventListener("lumalex:cloud-sync", handleCloudSync);
    return () => window.removeEventListener("lumalex:cloud-sync", handleCloudSync);
  }, [hydrate]);

  useEffect(() => {
    setPendingResult(null);
    setTypedAnswer("");
    setSubmittedAnswer("");
    setAnswerChecked(false);
    setSpellingStage("idle");
    hide();
  }, [activeMode, item?.id, activeSession?.round, hide]);

  useEffect(() => {
    if (!activeSession || !item || !isObjectiveMode || isSpellingMode || revealed || answerChecked) return;
    window.setTimeout(() => focusNativeSpellingInput(spellingInputRef.current), 0);
  }, [activeSession, answerChecked, activeMode, isObjectiveMode, isSpellingMode, item?.id, revealed]);

  useEffect(() => {
    if (activeMode !== "audio" || !item || revealed) return;
    void playPronunciation(item, accent).catch(() => undefined);
  }, [accent, activeMode, item?.id, revealed]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!activeSession) return;
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "Enter" && isObjectiveMode && !answerChecked) {
        event.preventDefault();
        checkTypedAnswer();
        return;
      }
      if (isTyping) return;
      if ((!isObjectiveMode || answerChecked) && event.key === "1") submitFeedback("remembered").catch(() => undefined);
      if ((!isObjectiveMode || answerChecked) && event.key === "2") submitFeedback("hesitant").catch(() => undefined);
      if ((!isObjectiveMode || answerChecked) && event.key === "3") submitFeedback("forgot").catch(() => undefined);
      if (event.key.toLowerCase() === "n" && pendingResult && !actionPending) {
        const selected = pendingResult;
        setCommitting(true);
        commitReviewFeedback(selected)
          .then(() => {
            setPendingResult(null);
            hide();
          })
          .catch(() => undefined)
          .finally(() => setCommitting(false));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSession, actionPending, answerChecked, commitReviewFeedback, hide, isObjectiveMode, pendingResult, submitFeedback, typedAnswer]);

  const postRoundSpellingWord = postRoundSpellingState?.words?.[postRoundSpellingState.snapshot.currentIndex];
  const postRoundSummaryKey = completedSummary?.wordIds?.join("|") || "";

  if (postRoundSpellingState && postRoundSpellingWord) {
    return (
      <SpellingPanel
        word={postRoundSpellingWord}
        currentIndex={postRoundSpellingState.snapshot.currentIndex}
        total={postRoundSpellingState.words.length}
        accent={accent}
        sourceLabel="复习完成后拼写"
        onSubmit={async (answer, options) => {
          const result = await submitSpellingAnswer("review", answer, options);
          if ("snapshot" in result && "words" in result && result.snapshot && result.words) {
            setPostRoundSpellingState({ snapshot: result.snapshot, words: result.words });
          }
          return result;
        }}
        onExit={() => {
          abandonSpellingSession("review")
            .then(() => {
              setPostRoundSpellingState(null);
              setPostRoundSpellingDoneKey(postRoundSummaryKey);
            })
            .catch(() => undefined);
        }}
        onCompleted={() => {
          setPostRoundSpellingState(null);
          setPostRoundSpellingDoneKey(postRoundSummaryKey);
        }}
      />
    );
  }

  if (completedSummary) {
    const accuracy = Math.round((completedSummary.remembered / Math.max(completedSummary.total, 1)) * 100);
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>本轮复习完成</CardTitle>
            <CardDescription>复习结果已经写入调度引擎，后续会根据表现自动安排下一次复习。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase text-muted">记住了</p>
                <strong className="mt-3 block text-4xl">{completedSummary.remembered}</strong>
              </div>
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase text-muted">勉强记住</p>
                <strong className="mt-3 block text-4xl">{completedSummary.hesitant}</strong>
              </div>
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase text-muted">忘了</p>
                <strong className="mt-3 block text-4xl">{completedSummary.forgot}</strong>
              </div>
            </div>
            <div className="rounded-3xl border border-border/70 bg-panel/60 p-6">
              <p className="text-sm text-muted-foreground">本轮正确率</p>
              <p className="mt-2 text-4xl font-semibold">{accuracy}%</p>
              <Progress className="mt-4" value={accuracy} />
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => clearCompletedSummary()}>继续复习</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearCompletedSummary();
                    navigate("/");
                  }}
                >
                  返回控制台
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
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase text-muted">复习模式</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">今天先做回忆判断，再处理最容易遗忘的词。</h1>
            </div>
            <div className="scrollbar-subtle overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 rounded-2xl border border-border bg-panel p-2">
                {reviewModes.map((itemMode) => (
                  <button
                    key={itemMode.id}
                    type="button"
                    onClick={() => setMode(reviewModeById[itemMode.id] || "en_to_zh")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-medium transition-all",
                      mode === reviewModeById[itemMode.id] ? "bg-white text-slate-950" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {itemMode.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-6 p-5 sm:p-8 xl:grid-cols-[1fr_0.92fr]">
            <div className="space-y-4">
              <p className="text-xs uppercase text-muted">复习准备</p>
              <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">复习页会优先加载逾期词、到期词和薄弱词。</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                当前支持英文→中文、中文→英文、听音辨义、拼写复习和例句填空。答题记录会更新记忆强度、错误次数和下次复习时间。
              </p>
            </div>
            <div className="space-y-4 rounded-3xl border border-border/70 bg-panel/60 p-5 sm:p-6">
              {error && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button className="w-full sm:w-auto" disabled={loading} onClick={() => startSession().catch(() => undefined)}>
                {loading ? "准备中..." : "开始复习"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meaningsText = item.meanings.join("；") || "暂无释义";
  const spellingMeaningText = getSpellingMeaningText(item);
  const answerPartOfSpeech = item.partOfSpeech || item.type || "";
  const clozeText = buildClozeExample(item.example || "", item.term);
  const prompt =
    activeMode === "zh_to_en" || activeMode === "spelling"
      ? spellingMeaningText
      : activeMode === "audio"
        ? "听发音，回忆含义"
        : activeMode === "cloze"
          ? clozeText
          : item.term;
  const currentScore = activeSession?.scoreMap?.[item.id] || 0;
  const nextScore = pendingResult
    ? Math.min(3, currentScore + getReviewResultScore(pendingResult, hasAnsweredReviewWord(activeSession, item.id) ? 2 : 1))
    : currentScore;
  const progress = queue.length ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0;
  const activeModeLabel = reviewModeLabel[activeMode];
  const typedCorrect = normalizeSpellingAnswer(typedAnswer) === normalizeSpellingAnswer(item.term);
  const selectedFeedback = reviewOptions.find((option) => option.value === pendingResult);
  const spellingCanCommit = isSpellingMode && (spellingStage === "correct" || spellingStage === "retry_correct_no_score");
  const promptHint =
    activeMode === "zh_to_en"
      ? "先默想英文单词，再展开答案核对。"
      : activeMode === "audio"
        ? "点击音标可重播发音，先不要看拼写。"
        : activeMode === "spelling"
          ? "根据中文释义拼写英文单词。"
          : activeMode === "cloze"
            ? "根据例句空格补全当前单词。"
            : "先回忆中文含义，再判断掌握程度。";

  const commitAndNext = async () => {
    if (!pendingResult || actionPending) return;
    setCommitting(true);
    try {
      await commitReviewFeedback(pendingResult);
      setPendingResult(null);
      setTypedAnswer("");
      setSubmittedAnswer("");
      setAnswerChecked(false);
      setSpellingStage("idle");
      hide();
    } finally {
      setCommitting(false);
    }
  };

  function checkTypedAnswer(answerOverride = typedAnswer) {
    const cleanAnswer = answerOverride.trim().toLowerCase();
    const normalizedCorrect = normalizeSpellingAnswer(cleanAnswer) === normalizeSpellingAnswer(item.term);
    if (isSpellingMode) {
      setSubmittedAnswer(cleanAnswer || "未输入");
      setAnswerChecked(true);
      reveal();

      if (!cleanAnswer) {
        setPendingResult(null);
        setSpellingStage("wrong_show_answer");
        void playPronunciation(item, accent).catch(() => undefined);
        return;
      }

      if (spellingStage === "retry_after_hint") {
        if (normalizedCorrect) {
          setPendingResult("forgot");
          setSpellingStage("retry_correct_no_score");
        } else {
          setPendingResult(null);
          setSpellingStage("retry_wrong");
        }
        void playPronunciation(item, accent).catch(() => undefined);
        return;
      }

      if (normalizedCorrect) {
        setPendingResult("remembered");
        setSpellingStage("correct");
        void playPronunciation(item, accent).catch(() => undefined);
        return;
      }

      setPendingResult(null);
      setSpellingStage("wrong_show_answer");
      void playPronunciation(item, accent).catch(() => undefined);
      return;
    }
    if (!cleanAnswer) return;
    setAnswerChecked(true);
    setPendingResult(normalizedCorrect ? "remembered" : "forgot");
    reveal();
    if (settings.autoPlayPronunciation && normalizedCorrect) {
      void playPronunciation(item, accent).catch(() => undefined);
    }
  }

  function retrySpellingAfterHint() {
    setTypedAnswer("");
    setSubmittedAnswer("");
    setAnswerChecked(false);
    setPendingResult(null);
    setSpellingStage("retry_after_hint");
    hide();
    window.setTimeout(() => focusNativeSpellingInput(spellingInputRef.current), 0);
  }

  const spellingPrimaryLabel =
    spellingStage === "wrong_show_answer"
      ? "再拼一次"
      : spellingStage === "correct"
        ? "下一词"
        : spellingStage === "retry_correct_no_score"
          ? "继续"
          : spellingStage === "retry_wrong"
            ? "再拼一次"
          : "提交";

  const handleSpellingPrimaryAction = () => {
    if (spellingStage === "wrong_show_answer" || spellingStage === "retry_wrong") {
      retrySpellingAfterHint();
      return;
    }
    if (spellingCanCommit) {
      commitAndNext().catch(() => undefined);
      return;
    }
    checkTypedAnswer();
  };

  const spellingFeedbackMessage =
    spellingStage === "correct"
      ? "很好，这次是在没有提示的情况下拼对，已计入掌握。"
      : spellingStage === "wrong_show_answer"
        ? "先看一遍正确拼写，再重新拼一次。"
        : spellingStage === "retry_after_hint"
          ? "已清空输入。请根据刚刚看过的正确拼写再练一次，本次不计分。"
          : spellingStage === "retry_correct_no_score"
            ? "这次拼对了，但因为刚刚看过答案，所以不计入掌握。稍后会再次出现。"
            : spellingStage === "retry_wrong"
              ? "这次仍然没有拼对。先看正确拼写，再拼一次，拼对后才能进入下一个词。"
              : "";
  const spellingFeedbackIsPositive = spellingStage === "correct" || spellingStage === "retry_correct_no_score";
  const spellingPrimaryDisabled =
    actionPending ||
    (spellingStage === "correct" && !pendingResult) ||
    (spellingStage === "retry_correct_no_score" && !pendingResult);

  return (
    <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-3xl flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/[0.88] shadow-card sm:h-[calc(100dvh-2.5rem)] lg:h-auto lg:min-h-[calc(100dvh-8rem)]">
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto]">
        <header className="border-b border-border/70 bg-card/80 px-3 py-3 backdrop-blur sm:px-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => abandonSession().catch(() => undefined)} title="返回复习模式">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{activeModeLabel}</span>
                <span className="shrink-0 font-medium text-foreground">
                  {currentIndex + 1}/{queue.length}
                </span>
              </div>
              <Progress className="mt-2 h-1.5" value={progress} />
            </div>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/60 text-muted-foreground transition hover:text-foreground"
              title="稍后再出现"
              disabled={actionPending}
              onClick={() => postpone().catch(() => undefined)}
            >
              <Clock3 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="scrollbar-subtle min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
          <section className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{activeModeLabel}</Badge>
              <Badge variant={revealed ? "muted" : "secondary"}>{revealed ? selectedFeedback?.label || "已展开" : "先回忆"}</Badge>
            </div>

            <div className={cn("pt-5", revealed ? "pb-3" : "pb-8")}>
              <h2
                className={cn(
                  "max-w-full font-semibold tracking-normal",
                  activeMode === "cloze" ? "whitespace-normal text-2xl sm:text-3xl" : "break-words [overflow-wrap:anywhere]",
                )}
                style={activeMode === "cloze" ? undefined : getStudyTitleStyle(prompt, { compact: revealed })}
                title={prompt}
              >
                {prompt}
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-muted-foreground">
                <div className="flex h-9 items-center rounded-full border border-border/70 bg-panel/70 p-1">
                  {(["us", "uk"] as const).map((itemAccent) => (
                    <button
                      key={itemAccent}
                      type="button"
                      className={cn(
                        "h-7 rounded-full px-2.5 text-xs font-semibold transition",
                        accent === itemAccent ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setAccent(itemAccent)}
                    >
                      {itemAccent === "us" ? "美" : "英"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-panel/70 px-3 text-sm transition hover:border-primary/50 hover:text-foreground"
                  onClick={() => playPronunciation(item, accent).catch(() => undefined)}
                  title="播放发音"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>{item.phonetic || "暂无音标"}</span>
                </button>
              </div>
            </div>

            {!revealed ? (
              <div className="flex flex-1 items-center">
                <div className="w-full rounded-[24px] border border-dashed border-border/70 bg-panel/[0.35] p-5 text-sm leading-6 text-muted-foreground">
                  {promptHint}
                  {!isObjectiveMode ? <p className="mt-2">先在心里作答，再用底部按钮判断掌握程度。</p> : null}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pb-2">
                <div className="rounded-[22px] border border-border/70 bg-panel/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">答案反馈</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {selectedFeedback ? <Badge variant="secondary">已选：{selectedFeedback.label}</Badge> : null}
                      <Badge variant="muted">{nextScore}/3 分</Badge>
                    </div>
                  </div>
                  <p
                    className="mt-3 max-w-full font-semibold tracking-normal"
                    style={getStudyTitleStyle(item.term, { compact: true })}
                    title={item.term}
                  >
                    {item.term}
                  </p>
                  <p className="mt-2 text-base leading-7">
                    {answerPartOfSpeech ? <span className="mr-2 font-semibold text-primary">{answerPartOfSpeech}</span> : null}
                    {meaningsText}
                  </p>
                  {activeMode === "cloze" && item.exampleTranslation ? (
                    <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm leading-6 text-muted-foreground">{item.exampleTranslation}</p>
                  ) : null}
                </div>

                <StudyDetailTabs
                  deckId={item.deckId}
                  currentTerm={item.term}
                  definition={meaningsText}
                  partOfSpeech={answerPartOfSpeech}
                  collocations={item.collocations}
                  derivedForms={item.derivedForms || []}
                  synonyms={item.synonyms}
                  antonyms={item.antonyms}
                  example={item.example}
                  exampleTranslation={item.exampleTranslation}
                  preferredAccent={accent}
                />
              </div>
            )}

            {isObjectiveMode ? (
              <div className="mt-4 w-full space-y-3">
                {isSpellingMode ? (
                  <LetterSpellingInput
                    target={item.term}
                    value={typedAnswer}
                    autoFocusKey={`${item.id}:${activeSession?.round || 1}:${activeMode}:${spellingStage}`}
                    disabled={
                      actionPending ||
                      spellingStage === "correct" ||
                      spellingStage === "wrong_show_answer" ||
                      spellingStage === "retry_correct_no_score" ||
                      spellingStage === "retry_wrong"
                    }
                    status={
                      spellingStage === "wrong_show_answer" || spellingStage === "retry_wrong"
                        ? "error"
                        : spellingStage === "correct" || spellingStage === "retry_correct_no_score"
                          ? "success"
                          : "idle"
                    }
                    onChange={(value) => {
                      setTypedAnswer(value);
                      setAnswerChecked(false);
                      setPendingResult(null);
                      setSubmittedAnswer("");
                      if (spellingStage !== "retry_after_hint") {
                        setSpellingStage("idle");
                      }
                      hide();
                    }}
                    onClear={() => {
                      setTypedAnswer("");
                      setAnswerChecked(false);
                      setPendingResult(null);
                      setSubmittedAnswer("");
                      if (spellingStage !== "retry_after_hint") {
                        setSpellingStage("idle");
                      }
                      hide();
                    }}
                    onComplete={(value) => checkTypedAnswer(value)}
                  />
                ) : (
                  <Input
                    {...nativeSpellingInputProps}
                    ref={spellingInputRef}
                    key={`${item.id}:${activeSession?.round || 1}:${activeMode}`}
                    value={typedAnswer}
                    onChange={(event) => {
                      setTypedAnswer(event.target.value);
                      setAnswerChecked(false);
                      setPendingResult(null);
                      setSubmittedAnswer("");
                      hide();
                    }}
                    placeholder="填写例句中的空格"
                    disabled={actionPending}
                    className="h-11 rounded-full text-center text-lg"
                  />
                )}
                {answerChecked ? (
                  <div
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm",
                      isSpellingMode
                        ? spellingFeedbackIsPositive
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                        : typedCorrect
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                  >
                    {isSpellingMode ? (
                      <div className="space-y-1 text-left">
                        <p>{spellingFeedbackMessage}</p>
                        {spellingStage === "wrong_show_answer" || spellingStage === "retry_wrong" ? (
                          <>
                            <p>
                              正确拼写：<strong>{item.term}</strong>
                            </p>
                            <p>
                              你的输入：<strong>{submittedAnswer || typedAnswer}</strong>
                            </p>
                          </>
                        ) : null}
                      </div>
                    ) : typedCorrect ? (
                      "拼写正确，可以进入下一词。"
                    ) : (
                      `正确答案：${item.term}`
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </main>

        <footer className="border-t border-border/70 bg-card/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-5">
          {isSpellingMode ? (
            <Button className="h-11 w-full rounded-2xl" disabled={spellingPrimaryDisabled} onClick={handleSpellingPrimaryAction}>
              {actionPending ? "提交中..." : spellingPrimaryLabel}
            </Button>
          ) : isObjectiveMode && !revealed ? (
            <Button className="h-11 w-full rounded-2xl" disabled={!typedAnswer.trim() || actionPending || answerChecked} onClick={() => checkTypedAnswer()}>
              检查答案
            </Button>
          ) : !revealed ? (
            <div className="grid grid-cols-3 gap-2">
              {reviewOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className="h-11 rounded-2xl border-border/80 bg-panel/[0.55] px-2 text-sm"
                  disabled={actionPending}
                  onClick={() => submitFeedback(option.value).catch(() => undefined)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
              <Button
                variant="secondary"
                className="h-11 rounded-2xl"
                disabled={actionPending}
                onClick={() => {
                  setPendingResult("forgot");
                  reveal();
                }}
              >
                记错了
              </Button>
              <Button className="h-11 rounded-2xl" disabled={!pendingResult || actionPending} onClick={() => commitAndNext().catch(() => undefined)}>
                {actionPending ? "提交中..." : "下一词"}
              </Button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
