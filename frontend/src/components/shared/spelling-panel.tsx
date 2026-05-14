import { ArrowLeft, CheckCircle2, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { playPronunciation } from "@/services/pronunciation-service";
import type { WordItem } from "@/types/domain";

type SpellingPanelProps = {
  word: WordItem;
  currentIndex: number;
  total: number;
  accent: "uk" | "us";
  sourceLabel: string;
  onSubmit: (answer: string) => Promise<{ completed: boolean; correct: boolean }>;
  onExit?: () => void;
  onCompleted?: () => void;
};

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
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      setMessage("先输入你回忆出来的拼写。");
      return;
    }
    setSubmitting(true);
    try {
      const result = await onSubmit(answer);
      if (!result.correct) {
        setMessage("拼写还不对，再试一次。");
        return;
      }
      setAnswer("");
      setMessage(result.completed ? "本轮拼写完成。" : "正确，进入下一个词。");
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
          <p className="mt-3 text-2xl font-semibold">{word.meanings.join("；") || "暂无释义"}</p>
          <p className="mt-4 text-sm text-muted-foreground">{word.partOfSpeech || word.type}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="请输入完整拼写"
            className="h-12 rounded-xl"
          />
          <Button variant="secondary" className="h-12 rounded-xl" onClick={() => void playPronunciation(word, accent)}>
            <Volume2 className="h-4 w-4" />
            发音提示
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="h-12 rounded-xl sm:min-w-40" disabled={submitting} onClick={() => void handleSubmit()}>
            提交拼写
          </Button>
        </div>
        {message ? (
          <p className={`text-sm ${message.includes("完成") || message.includes("正确") ? "text-emerald-300" : "text-muted-foreground"}`}>
            {message.includes("完成") || message.includes("正确") ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : null}
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
