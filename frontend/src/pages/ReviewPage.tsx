import { ArrowLeft, Clock3, Headphones, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { WordRelationsPanel } from "@/components/shared/word-relations-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { reviewModes } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import { playPronunciation, warmPronunciationVoices } from "@/services/pronunciation-service";
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

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

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
  const settings = useSettingsStore((state) => state.settings);
  const {
    mode,
    revealed,
    loading,
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
  const [answerChecked, setAnswerChecked] = useState(false);
  const item = queue[currentIndex];
  const activeMode = activeSession?.modeSequence?.[activeSession.modeIndex] ?? mode;
  const isObjectiveMode = activeMode === "spelling" || activeMode === "cloze";

  const submitFeedback = async (result: ReviewResult) => {
    if (committing) return;
    setPendingResult(result);
    reveal();
    if (settings.autoPlayPronunciation && item) {
      void playPronunciation(item, accent);
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
    setMode(readStorage<ReviewMode>(DEFAULT_REVIEW_MODE_KEY, "en_to_zh"));
  }, [setMode]);

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
    setAnswerChecked(false);
    hide();
  }, [activeMode, item?.id, hide]);

  useEffect(() => {
    if (activeMode !== "audio" || !item || revealed) return;
    void playPronunciation(item, accent);
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
      if (event.key.toLowerCase() === "n" && pendingResult && !committing) {
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
  }, [activeSession, answerChecked, commitReviewFeedback, committing, hide, isObjectiveMode, pendingResult, submitFeedback, typedAnswer]);

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
                <Button variant="secondary" onClick={() => clearCompletedSummary()}>
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
  const clozeText = buildClozeExample(item.example || "", item.term);
  const prompt =
    activeMode === "zh_to_en" || activeMode === "spelling"
      ? meaningsText
      : activeMode === "audio"
        ? "听发音，回忆含义"
        : activeMode === "cloze"
          ? clozeText
          : item.term;
  const currentScore = activeSession?.scoreMap?.[item.id] || 0;
  const nextScore = pendingResult
    ? Math.min(3, currentScore + (pendingResult === "remembered" ? 3 : pendingResult === "hesitant" ? 1 : 0))
    : currentScore;
  const progress = queue.length ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0;
  const activeModeLabel = reviewModeLabel[activeMode];
  const typedCorrect = normalizeAnswer(typedAnswer) === normalizeAnswer(item.term);
  const selectedFeedback = reviewOptions.find((option) => option.value === pendingResult);
  const canJudge = !isObjectiveMode || answerChecked;
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
    if (!pendingResult || committing) return;
    setCommitting(true);
    try {
      await commitReviewFeedback(pendingResult);
      setPendingResult(null);
      hide();
    } finally {
      setCommitting(false);
    }
  };

  function checkTypedAnswer() {
    if (!typedAnswer.trim()) return;
    setAnswerChecked(true);
    setPendingResult(typedCorrect ? "remembered" : "forgot");
    reveal();
    if (settings.autoPlayPronunciation && typedCorrect) {
      void playPronunciation(item, accent);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-36 lg:pb-6">
      <Card className="overflow-hidden border-border/70 bg-card/88 shadow-none">
        <CardContent className="flex min-h-[calc(100dvh-180px)] flex-col p-4 sm:p-6">
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
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-panel/60 text-muted-foreground transition hover:text-foreground sm:flex"
              title="稍后再出现"
              onClick={() => postpone().catch(() => undefined)}
            >
              <Clock3 className="h-4 w-4" />
            </button>
          </div>

          <section className="flex flex-1 flex-col justify-center py-5 text-center sm:py-8">
            <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
              <Badge variant="secondary">{activeModeLabel}</Badge>
              <Badge variant={revealed ? "muted" : "secondary"}>{revealed ? selectedFeedback?.hint || "已展开" : "先回忆"}</Badge>
            </div>

            <h2
              className={cn(
                "mx-auto mt-5 max-w-full break-words font-semibold leading-[1.12]",
                activeMode === "cloze" ? "text-2xl sm:text-3xl" : "text-5xl sm:text-6xl",
              )}
            >
              {prompt}
            </h2>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-muted-foreground">
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

            <p className="mx-auto mt-4 max-w-[560px] text-sm leading-6 text-muted-foreground sm:text-base">{promptHint}</p>

            {isObjectiveMode && (
              <div className="mx-auto mt-5 w-full max-w-[560px] space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={typedAnswer}
                    onChange={(event) => {
                      setTypedAnswer(event.target.value);
                      setAnswerChecked(false);
                      setPendingResult(null);
                      hide();
                    }}
                    placeholder={activeMode === "cloze" ? "填写例句中的空格" : "输入英文单词"}
                    disabled={committing}
                    className="h-11 rounded-full text-center text-lg"
                  />
                  <Button className="h-11 rounded-full sm:w-32" disabled={!typedAnswer.trim() || committing || answerChecked} onClick={checkTypedAnswer}>
                    检查
                  </Button>
                </div>
                {answerChecked && (
                  <div
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm",
                      typedCorrect ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                  >
                    {typedCorrect ? "拼写正确，可以进入下一词。" : `正确答案：${item.term}`}
                  </div>
                )}
              </div>
            )}

            {!isObjectiveMode && !revealed ? (
              <Button variant="secondary" className="mx-auto mt-5 rounded-full" onClick={() => reveal()}>
                显示答案
              </Button>
            ) : null}
          </section>

          {revealed ? (
            <div className="space-y-3">
              <div className="rounded-[22px] border border-border/70 bg-panel/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">答案反馈</p>
                  <Badge variant="muted">{nextScore}/3 分</Badge>
                </div>
                <p className="mt-3 text-2xl font-semibold">{item.term}</p>
                <p className="mt-2 text-base leading-7">{meaningsText}</p>
                {activeMode === "cloze" && item.exampleTranslation ? (
                  <p className="mt-3 rounded-2xl bg-white/5 p-3 text-sm leading-6 text-muted-foreground">{item.exampleTranslation}</p>
                ) : null}
              </div>

              <WordRelationsPanel
                deckId={item.deckId}
                currentTerm={item.term}
                collocations={item.collocations}
                derivedForms={item.derivedForms || []}
                roots={item.roots}
                synonyms={item.synonyms}
                antonyms={item.antonyms}
                example={item.example}
                exampleTranslation={item.exampleTranslation}
                memoryHint={settings.showMemoryHint ? item.memoryHint : ""}
                preferredAccent={accent}
              />
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-border/70 bg-panel/35 p-4 text-center text-sm text-muted-foreground">
              答案、例句、词根、近义和搭配会在展开后显示。
            </div>
          )}

          <div className="mt-4 hidden gap-2 lg:grid lg:grid-cols-[repeat(3,1fr)_1.1fr]">
            {reviewOptions.map((option) => (
              <Button
                key={option.value}
                size="lg"
                variant={pendingResult === option.value ? "default" : "outline"}
                className={cn(
                  "rounded-full border-border/80 bg-panel/50",
                  pendingResult === option.value && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
                )}
                disabled={committing || !canJudge}
                onClick={() => submitFeedback(option.value).catch(() => undefined)}
              >
                {option.label}
              </Button>
            ))}
            <Button size="lg" className="rounded-full" disabled={!pendingResult || committing} onClick={() => commitAndNext().catch(() => undefined)}>
              {committing ? "提交中..." : "下一词"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-4 bottom-24 z-30 rounded-[24px] border border-border/80 bg-panel/95 p-3 shadow-card backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <Badge variant="muted">
            <Headphones className="mr-1 h-3 w-3" />
            {activeModeLabel}
          </Badge>
          {pendingResult ? <span>已选：{selectedFeedback?.label}</span> : <span>{canJudge ? "选择复习结果" : "先检查答案"}</span>}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {reviewOptions.map((option) => (
            <Button
              key={option.value}
              variant={pendingResult === option.value ? "default" : "outline"}
              className={cn(
                "h-11 rounded-full border-border/80 bg-panel/50 text-sm",
                pendingResult === option.value && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
              )}
              disabled={committing || !canJudge}
              onClick={() => submitFeedback(option.value).catch(() => undefined)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {pendingResult ? (
          <Button className="mt-2 h-11 w-full rounded-full" disabled={committing} onClick={() => commitAndNext().catch(() => undefined)}>
            {committing ? "提交中..." : "下一词"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
