import { ArrowLeft, CheckCircle2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LetterSpellingInput } from "@/components/shared/letter-spelling-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSpellingMeaningText } from "@/lib/study-text";
import { playPronunciation } from "@/services/pronunciation-service";
import type { WordItem } from "@/types/domain";

type SpellingPanelProps = {
  word: WordItem;
  currentIndex: number;
  total: number;
  accent: "uk" | "us";
  sourceLabel: string;
  onSubmit: (answer: string, options?: { advanceWithoutMastery?: boolean }) => Promise<{ completed: boolean; correct: boolean; noScore?: boolean }>;
  onExit?: () => void;
  onCompleted?: () => void;
};

type SpellingStage = "idle" | "wrong_show_answer" | "retry_after_hint" | "retry_done_no_score" | "correct";

export function SpellingPanel({
  word,
  currentIndex,
  total,
  accent,
  sourceLabel,
  onSubmit,
  onExit,
  onCompleted,
}: SpellingPanelProps) {
  const [answer, setAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<SpellingStage>("idle");
  const meaningHintText = getSpellingMeaningText(word);

  useEffect(() => {
    setAnswer("");
    setSubmittedAnswer("");
    setMessage("");
    setStage("idle");
  }, [word.id, currentIndex]);

  const playCurrentWord = () => {
    void playPronunciation(word, accent).catch(() => undefined);
  };

  const handleSubmit = async (nextAnswer = answer) => {
    if (stage === "wrong_show_answer") {
      setAnswer("");
      setSubmittedAnswer("");
      setMessage("请重新拼一次。刚才看过答案，本次不计分。");
      setStage("retry_after_hint");
      return;
    }

    if (stage === "correct" || stage === "retry_done_no_score") {
      setAnswer("");
      setSubmittedAnswer("");
      setMessage("");
      setStage("idle");
      return;
    }

    const cleanAnswer = nextAnswer.trim().toLowerCase();

    if (!cleanAnswer) {
      setSubmittedAnswer("未输入");
      setMessage("没关系，先看一遍正确拼写。");
      setStage("wrong_show_answer");
      playCurrentWord();
      return;
    }
    playCurrentWord();
    setSubmitting(true);
    try {
      const result = await onSubmit(cleanAnswer, { advanceWithoutMastery: stage === "retry_after_hint" });
      if (!result.correct) {
        setSubmittedAnswer(cleanAnswer);
        if (stage === "retry_after_hint") {
          setAnswer("");
          setMessage("还差一点。先看正确拼写，再继续拼当前词，拼对后才能进入下一个。");
          setStage("wrong_show_answer");
          return;
        }
        setMessage("先看一遍正确拼写，再重新拼一次。");
        setStage("wrong_show_answer");
        return;
      }
      setAnswer("");
      if (stage === "retry_after_hint" || result.noScore) {
        setMessage("这次拼对了，但因为刚刚看过答案，所以不计入掌握。稍后会再次出现。");
        setStage("retry_done_no_score");
        return;
      }
      setStage("correct");
      setMessage(result.completed ? "本轮拼写完成。" : "很好，这次是在没有提示的情况下拼对，已计入掌握。");
      if (result.completed) {
        onCompleted?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">{sourceLabel}</p>
          <CardTitle className="mt-2">拼写巩固</CardTitle>
        </div>
        {onExit ? (
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" />
            退出
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            第 {currentIndex + 1} / {total} 个
          </span>
          <span>只给提示，不直接显示单词本身</span>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel/60 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">中文释义</p>
          <p className="mt-3 text-2xl font-semibold">{meaningHintText}</p>
          <p className="mt-4 text-sm text-muted-foreground">{word.partOfSpeech || word.type}</p>
        </div>
        <div className="grid gap-3">
          <LetterSpellingInput
            target={word.term}
            value={answer}
            autoFocusKey={`${word.id}:${currentIndex}:${stage}`}
            disabled={submitting || stage === "wrong_show_answer" || stage === "correct" || stage === "retry_done_no_score"}
            status={stage === "wrong_show_answer" ? "error" : stage === "correct" || stage === "retry_done_no_score" ? "success" : "idle"}
            onChange={(value) => {
              setAnswer(value);
              if (stage !== "retry_after_hint") {
                setStage("idle");
              }
              setMessage("");
              setSubmittedAnswer("");
            }}
            onClear={() => {
              setAnswer("");
              setMessage("");
              setSubmittedAnswer("");
            }}
            onComplete={(value) => void handleSubmit(value)}
          />
          <Button variant="secondary" className="h-12 rounded-xl" onClick={playCurrentWord}>
            <Volume2 className="h-4 w-4" />
            发音提示
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="h-12 rounded-xl sm:min-w-40" disabled={submitting} onClick={() => void handleSubmit()}>
            {stage === "wrong_show_answer" ? "再拼一次" : stage === "correct" || stage === "retry_done_no_score" ? "继续" : "提交"}
          </Button>
        </div>
        {message ? (
          <div className={`rounded-2xl border border-border/70 bg-panel/50 px-4 py-3 text-sm ${message.includes("很好") || message.includes("拼对") || message.includes("完成") ? "text-emerald-300" : "text-muted-foreground"}`}>
            {message.includes("很好") || message.includes("拼对") || message.includes("完成") ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : null}
            {message}
            {stage === "wrong_show_answer" ? (
              <div className="mt-2 space-y-1">
                <p>
                  正确拼写：<strong>{word.term}</strong>
                </p>
                <p>
                  你的输入：<strong>{submittedAnswer}</strong>
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
