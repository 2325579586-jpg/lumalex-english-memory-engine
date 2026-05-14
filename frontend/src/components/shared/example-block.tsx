import { CheckCircle2, Plus, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { quickAddTermToDeck, ensureDeckOptions, type DeckOption } from "@/services/add-words-service";
import { playTextPronunciation } from "@/services/pronunciation-service";

type ExampleBlockProps = {
  example: string;
  translation?: string;
  preferredAccent: "uk" | "us";
  autoPlay?: boolean;
  title?: string;
};

function isAddableToken(token: string) {
  return /^[A-Za-z][A-Za-z'-]*$/.test(token);
}

function tokenizeExample(example: string) {
  return example.split(/(\s+|[.,!?;:()[\]"/]+)/g).filter((part) => part.length > 0);
}

export function ExampleBlock({
  example,
  translation,
  preferredAccent,
  autoPlay = false,
  title = "例句",
}: ExampleBlockProps) {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [deckOptions, setDeckOptions] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    setSelectedToken(null);
    setMessage(null);
  }, [example]);

  useEffect(() => {
    if (!autoPlay || !example.trim()) return;
    void playTextPronunciation(example, preferredAccent);
  }, [autoPlay, example, preferredAccent]);

  const tokens = useMemo(() => tokenizeExample(example), [example]);

  const chooseToken = async (token: string) => {
    setSelectedToken(token);
    setMessage(null);
    if (deckOptions.length > 0) return;

    setLoadingDecks(true);
    try {
      const decks = await ensureDeckOptions();
      setDeckOptions(decks);
      if (decks.length > 0) {
        setSelectedDeckId(decks[0].id);
      }
    } finally {
      setLoadingDecks(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedToken || !selectedDeckId) return;
    setAdding(true);
    setMessage(null);
    try {
      const result = await quickAddTermToDeck(selectedToken, selectedDeckId);
      if (result.status === "reset") {
        setMessage({ type: "success", text: `“${selectedToken}” 已重新加入该词库，并重置为待学习状态。` });
      } else {
        setMessage({ type: "success", text: `已将 “${selectedToken}” 添加到指定词库。` });
      }
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "添加失败，请稍后重试。" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">{title}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => void playTextPronunciation(example, preferredAccent)}
          disabled={!example.trim()}
          title="播放例句"
        >
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-3 rounded-2xl border border-border/70 bg-panel/50 p-4">
        <p className="text-sm leading-7 sm:text-base">
          {tokens.length > 0 ? (
            tokens.map((token, index) =>
              isAddableToken(token) ? (
                <button
                  key={`${token}-${index}`}
                  type="button"
                  className={`rounded px-0.5 transition hover:bg-primary/10 hover:text-primary ${
                    selectedToken === token ? "bg-primary/12 text-primary" : ""
                  }`}
                  onClick={() => void chooseToken(token)}
                >
                  {token}
                </button>
              ) : (
                <span key={`${token}-${index}`}>{token}</span>
              ),
            )
          ) : (
            <span className="text-muted-foreground">暂无例句</span>
          )}
        </p>
        {translation ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{translation}</p> : null}
      </div>

      {selectedToken ? (
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{selectedToken}</Badge>
            <span className="text-sm text-muted-foreground">把这个例句里的生词直接加入词库</span>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedDeckId}
              onChange={(event) => setSelectedDeckId(event.target.value)}
              className="h-10 flex-1 rounded-xl border border-border bg-panel px-3 text-sm outline-none transition focus:border-primary/50"
              disabled={loadingDecks || deckOptions.length === 0}
            >
              {deckOptions.length === 0 ? (
                <option value="">{loadingDecks ? "正在加载词库..." : "暂无可用词库"}</option>
              ) : (
                deckOptions.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))
              )}
            </select>
            <Button
              type="button"
              className="rounded-xl"
              disabled={adding || !selectedDeckId}
              onClick={() => void handleAdd()}
            >
              <Plus className="h-4 w-4" />
              {adding ? "添加中..." : "加入指定词库"}
            </Button>
          </div>
          {message ? (
            <p
              className={`mt-3 text-sm ${
                message.type === "error"
                  ? "text-destructive"
                  : message.type === "success"
                    ? "text-emerald-300"
                    : "text-muted-foreground"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : null}
              {message.text}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">点按例句中的英文单词，可直接加入指定词库。</p>
      )}
    </div>
  );
}
