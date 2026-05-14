import { ArrowLeft, CheckCircle2, Clock3, Headphones, PenSquare, Volume2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ExampleBlock } from "@/components/shared/example-block";
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
const reviewOptions: Array<{ value: ReviewResult; label: string }> = [
  { value: "remembered", label: "记住了" },
  { value: "hesitant", label: "勉强记住" },
  { value: "forgot", label: "忘了" },
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
      if (event.key === "1") {
        submitFeedback("remembered").catch(() => undefined);
      }
      if (event.key === "2") {
        submitFeedback("hesitant").catch(() => undefined);
      }
      if (event.key === "3") {
        submitFeedback("forgot").catch(() => undefined);
      }
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
            <CardDescription>复习结果已经写入本地调度引擎，后续会根据表现自动安排下一次复习。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">记住了</p>
                <strong className="mt-3 block text-4xl">{completedSummary.remembered}</strong>
              </div>
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">勉强记住</p>
                <strong className="mt-3 block text-4xl">{completedSummary.hesitant}</strong>
              </div>
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">忘了</p>
                <strong className="mt-3 block text-4xl">{completedSummary.forgot}</strong>
              </div>
            </div>
            <div className="rounded-3xl border border-border/70 bg-panel/60 p-6">
              <p className="text-sm text-muted-foreground">本轮正确率</p>
              <p className="mt-2 text-4xl font-semibold">{accuracy}%</p>
              <Progress className="mt-4" value={accuracy} />
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <p>建议下一步：</p>
                <p>1. 如果“忘了”的词较多，可以立即进入错词强化。</p>
                <p>2. 如果正确率较高，建议继续推进今天的新词任务。</p>
                <p>3. 系统已经把遗忘词标记为重点复习，并缩短下次间隔。</p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => {
                    clearCompletedSummary();
                  }}
                >
                  继续复习
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearCompletedSummary();
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
              <p className="text-xs uppercase tracking-[0.22em] text-muted">复习模式</p>
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
                      mode === reviewModeById[itemMode.id]
                        ? "bg-white text-slate-950"
                        : "text-muted-foreground hover:text-foreground",
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
              <p className="text-xs uppercase tracking-[0.22em] text-muted">复习准备</p>
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
        ? "先听发音，再回忆中文含义"
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
  const promptHint =
    activeMode === "zh_to_en"
      ? "输入或默想英文单词，再展开答案核对。"
      : activeMode === "audio"
        ? "点击音标可重播发音，先不要看拼写。"
        : activeMode === "spelling"
          ? "根据中文释义拼写英文单词。"
          : activeMode === "cloze"
            ? "根据例句空格补全当前单词。"
            : "先回忆中文含义，再决定你的掌握程度。";

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
    <div className="space-y-5 pb-28 sm:space-y-6 lg:pb-6">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:gap-6">
        <Card className="min-h-[520px] sm:min-h-[620px]">
          <CardContent className="flex h-full flex-col p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => abandonSession().catch(() => undefined)} title="返回复习模式">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{activeModeLabel}</span>
                  <span>
                    {currentIndex + 1}/{queue.length} · {nextScore}/3
                  </span>
                </div>
                <Progress className="mt-2" value={progress} />
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center pt-7 text-center sm:pt-10">
            <Badge variant="secondary">{activeMode === "audio" ? "听音辨义" : activeMode === "spelling" ? "拼写复习" : activeMode === "cloze" ? "例句填空" : "回忆强化"}</Badge>
            <h2 className={cn("mt-4 break-words font-semibold", activeMode === "cloze" ? "text-2xl leading-relaxed sm:text-3xl" : "text-4xl sm:text-5xl lg:text-6xl")}>
              {prompt}
            </h2>
            {(activeMode !== "zh_to_en" || revealed) && (
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">
                <div className="flex items-center rounded-full border border-border p-1">
                  <button
                    type="button"
                    className={cn("rounded-full px-3 py-1.5 text-xs font-medium", accent === "us" ? "bg-white text-slate-950" : "text-muted-foreground")}
                    onClick={() => setAccent("us")}
                  >
                    美音
                  </button>
                  <button
                    type="button"
                    className={cn("rounded-full px-3 py-1.5 text-xs font-medium", accent === "uk" ? "bg-white text-slate-950" : "text-muted-foreground")}
                    onClick={() => setAccent("uk")}
                  >
                    英音
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-panel/70 px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                  onClick={() => playPronunciation(item, accent).catch(() => undefined)}
                  title="播放发音"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>{item.phonetic || "暂无音标"}</span>
                </button>
              </div>
            )}
            <p className="mt-4 max-w-[560px] text-sm text-muted-foreground sm:text-base">
              {promptHint}
            </p>

            {isObjectiveMode && (
              <div className="mt-7 w-full max-w-[560px] space-y-3">
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
                    className="h-12 rounded-xl text-center text-lg"
                  />
                  <Button className="h-12 rounded-xl sm:w-32" disabled={!typedAnswer.trim() || committing || answerChecked} onClick={checkTypedAnswer}>
                    检查答案
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
                {activeMode === "cloze" && item.exampleTranslation ? (
                  <p className="text-sm leading-6 text-muted-foreground">{item.exampleTranslation}</p>
                ) : null}
              </div>
            )}

            <div className="mt-8 w-full max-w-[760px] space-y-3 sm:mt-10">
              {(!isObjectiveMode || answerChecked) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {reviewOptions.map((option) => (
                    <Button
                      key={option.value}
                      size="lg"
                      variant={pendingResult === option.value ? "default" : "outline"}
                      className={cn(
                        "border-border/80 bg-panel/50",
                        pendingResult === option.value && "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
                      )}
                      disabled={committing}
                      onClick={() => submitFeedback(option.value).catch(() => undefined)}
                    >
                      {option.label}
                    </Button>
                  ))}
                <Button size="lg" variant="ghost" disabled={!pendingResult || committing} onClick={() => commitAndNext().catch(() => undefined)}>
                  {committing ? "提交中..." : "下一词"}
                </Button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {!pendingResult && !isObjectiveMode && (
                  <Button variant="secondary" className="w-full" onClick={() => (revealed ? hide() : reveal())}>
                    {revealed ? "隐藏答案" : "显示答案"}
                  </Button>
                )}
                <Button variant="ghost" className="w-full" disabled={committing} onClick={() => postpone().catch(() => undefined)}>
                  稍后再出现
                </Button>
              </div>
            </div>

            {revealed && (
              <div className="mt-8 w-full max-w-[560px] rounded-3xl border border-border/70 bg-panel/60 p-5 text-left sm:mt-10 sm:p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">答案反馈</p>
                <p className="mt-3 text-2xl font-medium">{item.term}</p>
                <p className="mt-2 text-base">{item.meanings.join("；") || "暂无释义"}</p>
                <div className="mt-4">
                  <ExampleBlock
                    title="例句"
                    example={item.example || ""}
                    translation={item.exampleTranslation || ""}
                    preferredAccent={accent}
                    autoPlay={settings.autoPlayExampleSentence && revealed}
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.memoryHint && <Badge variant="warning">记忆提示</Badge>}
                  {item.isFocused && <Badge variant="muted">重点复习</Badge>}
                </div>
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>答题反馈区</CardTitle>
              <CardDescription>强化“判断”和“矫正”的反馈，而不是资料堆叠。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success/10 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-success">记住了</p>
                  <p className="mt-1 text-sm text-muted-foreground">记忆稳定，下次会进入更长的复习间隔。</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">忘了</p>
                  <p className="mt-1 text-sm text-muted-foreground">会缩短下次复习时间，并标记为重点词。</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => postpone().catch(() => undefined)}>稍后再次出现</Button>
                <Button variant="outline" onClick={() => abandonSession().catch(() => undefined)}>退出并保存</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>本轮复习进度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-muted-foreground">已完成</p>
                  <strong className="mt-2 block text-2xl sm:text-3xl">{currentIndex}</strong>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-xs text-muted-foreground">剩余题数</p>
                  <strong className="mt-2 block text-2xl sm:text-3xl">{queue.length - currentIndex - 1}</strong>
                </div>
              </div>
              <Progress value={Math.round(((currentIndex + 1) / queue.length) * 100)} />
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <p className="text-sm font-medium">当前复习重点</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Headphones className="h-4 w-4" />优先清掉到期词和薄弱词</li>
                  <li className="flex items-center gap-2"><PenSquare className="h-4 w-4" />先回忆，再显示答案，避免被动浏览</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">预计剩余时间：{Math.max(1, queue.length - currentIndex - 1)} 分钟</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
