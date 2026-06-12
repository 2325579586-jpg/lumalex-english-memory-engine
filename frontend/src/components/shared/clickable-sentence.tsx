import { ChevronRight, Plus, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quickAddTermToDeck } from "@/services/add-words-service";
import { DictionaryService, type DictionaryEntry } from "@/services/dictionary-service";
import { playTermPronunciation } from "@/services/pronunciation-service";

type ClickableSentenceProps = {
  sentence: string;
  translation?: string;
  deckId: string;
  preferredAccent: "uk" | "us";
  className?: string;
};

type SelectedWordState = {
  display: string;
  query: string;
  entry?: DictionaryEntry;
  loading: boolean;
  error?: string;
  adding?: boolean;
  added?: boolean;
  detailOpen?: boolean;
  message?: string;
};

const sourceLabel: Record<DictionaryEntry["source"], string> = {
  local_dictionary: "词库",
  basic_dictionary: "基础词典",
  cache: "缓存",
  ai: "AI",
  fallback: "待补全",
};

function isClickableWord(token: string) {
  return /^[A-Za-z][A-Za-z'-]*$/.test(token);
}

function tokenizeSentence(sentence: string) {
  return sentence.split(/(\s+|[.,!?;:()[\]"“”‘’]+)/g).filter(Boolean);
}

function cleanWord(token: string) {
  return token
    .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "")
    .trim()
    .toLowerCase();
}

function getLookupCandidates(word: string) {
  const clean = cleanWord(word);
  const candidates = [clean];
  if (clean.endsWith("ies") && clean.length > 4) candidates.push(`${clean.slice(0, -3)}y`);
  if (clean.endsWith("ves") && clean.length > 4) candidates.push(`${clean.slice(0, -3)}f`);
  if (clean.endsWith("ing") && clean.length > 5) {
    const stem = clean.slice(0, -3);
    candidates.push(stem);
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) candidates.push(stem.slice(0, -1));
    candidates.push(`${stem}e`);
  }
  if (clean.endsWith("ed") && clean.length > 4) {
    const stem = clean.slice(0, -2);
    candidates.push(stem);
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) candidates.push(stem.slice(0, -1));
    candidates.push(`${stem}e`);
  }
  if (clean.endsWith("s") && !clean.endsWith("ss") && clean.length > 3) candidates.push(clean.slice(0, -1));
  return Array.from(new Set(candidates.filter(Boolean)));
}

function hasUsefulMeaning(entry?: DictionaryEntry) {
  return Boolean(entry?.meaning && !entry.meaning.includes("暂无") && !entry.meaning.includes("暂未") && !entry.meaning.includes("点击"));
}

async function lookupExampleWord(word: string) {
  const candidates = getLookupCandidates(word);
  for (const candidate of candidates) {
    const entry = await DictionaryService.lookup(candidate, { allowAi: false, preferLocal: true });
    if (hasUsefulMeaning(entry)) return { ...entry, word: entry.word || candidate };
  }
  return DictionaryService.lookup(candidates[0] || word, { allowAi: true, preferLocal: true });
}

function WordLookupCard({
  selected,
  preferredAccent,
  onClose,
  onAdd,
  onGenerateAi,
  onViewDetail,
}: {
  selected: SelectedWordState;
  preferredAccent: "uk" | "us";
  onClose: () => void;
  onAdd: () => void;
  onGenerateAi: () => void;
  onViewDetail: () => void;
}) {
  const entry = selected.entry;
  const source = entry?.source ? sourceLabel[entry.source] : selected.loading ? "查询中" : "待补全";
  const meaning = selected.loading
    ? "正在查询释义..."
    : entry?.meaning || selected.error || "暂未找到释义，可使用 AI 生成解释";

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="fixed inset-x-4 bottom-[138px] mx-auto max-h-[268px] max-w-[420px] overflow-y-auto rounded-[26px] border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-start gap-2">
              <h3 className="min-w-0 flex-1 text-4xl font-black leading-[0.95] tracking-normal text-foreground [overflow-wrap:anywhere] sm:text-5xl">
                {entry?.word || selected.display}
              </h3>
              <Badge variant="muted" className="text-[10px]">
                {source}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/70 px-2 py-1 text-xs">{preferredAccent === "us" ? "美" : "英"}</span>
              {entry?.phonetic ? <span>{entry.phonetic}</span> : <span className="text-xs">音标查询中</span>}
            </div>
          </div>
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-panel/80 text-muted-foreground" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-base font-semibold leading-7 text-foreground">
          {entry?.partOfSpeech ? <span className="mr-2 text-primary">{entry.partOfSpeech}</span> : null}
          {meaning}
        </p>
        {entry?.commonMeanings?.length ? <p className="mt-2 text-xs text-muted-foreground">常见义：{entry.commonMeanings.slice(0, 3).join("；")}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <Button type="button" variant="outline" className="h-10 flex-1 rounded-full" onClick={() => void playTermPronunciation(entry?.word || selected.query, preferredAccent)}>
            <Volume2 className="mr-2 h-4 w-4" />
            发音
          </Button>
          <Button type="button" variant={selected.added ? "secondary" : "outline"} className="h-10 rounded-full px-4" disabled={selected.adding || selected.added} onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            {selected.added ? "已加入" : selected.adding ? "加入中" : "加入"}
          </Button>
        </div>

        {!hasUsefulMeaning(entry) ? (
          <Button type="button" variant="secondary" className="mt-2 h-9 w-full rounded-full text-xs" disabled={selected.loading} onClick={onGenerateAi}>
            AI 生成释义
          </Button>
        ) : null}

        {selected.message ? <p className="mt-2 text-xs text-muted-foreground">{selected.message}</p> : null}

        {selected.detailOpen ? (
          <div className="mt-3 rounded-2xl border border-border/70 bg-panel/70 p-3 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">详细释义</p>
            <p className="mt-2">
              {entry?.partOfSpeech ? `${entry.partOfSpeech} ` : ""}
              {entry?.meaning || selected.error || "暂未找到更多释义。"}
            </p>
            {entry?.commonMeanings?.length ? <p className="mt-2">常见义：{entry.commonMeanings.join("；")}</p> : null}
            {entry?.examMeanings?.length ? <p className="mt-1">常考义：{entry.examMeanings.join("；")}</p> : null}
            {entry?.example ? (
              <div className="mt-2 border-t border-border/60 pt-2">
                <p>{entry.example}</p>
                {entry.exampleTranslation ? <p className="mt-1">{entry.exampleTranslation}</p> : null}
              </div>
            ) : (
              <p className="mt-2">暂无例句，可使用 AI 生成释义补全。</p>
            )}
          </div>
        ) : null}

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between rounded-2xl bg-panel/70 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          onClick={onViewDetail}
        >
          {selected.detailOpen ? "收起详细释义" : "查看详细释义"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ClickableSentence({ sentence, translation, deckId, preferredAccent, className }: ClickableSentenceProps) {
  const [selected, setSelected] = useState<SelectedWordState | null>(null);
  const tokens = useMemo(() => tokenizeSentence(sentence), [sentence]);

  useEffect(() => {
    setSelected(null);
  }, [sentence]);

  const openWord = (token: string) => {
    const query = cleanWord(token);
    if (!query) return;
    setSelected({ display: token, query, loading: true });
    lookupExampleWord(query)
      .then((entry) => {
        setSelected((current) => (current?.query === query ? { ...current, entry, loading: false, error: undefined } : current));
      })
      .catch((error) => {
        setSelected((current) =>
          current?.query === query
            ? {
                ...current,
                loading: false,
                error: error instanceof Error ? error.message : "暂未找到释义，可使用 AI 生成解释",
              }
            : current,
        );
      });
  };

  const addSelected = async () => {
    if (!selected) return;
    const term = selected.entry?.word || selected.query;
    setSelected((current) => (current ? { ...current, adding: true, message: "" } : current));
    try {
      const result = await quickAddTermToDeck(term, deckId);
      setSelected((current) =>
        current
          ? {
              ...current,
              adding: false,
              added: true,
              message: result.status === "reset" ? `${term} 已在词库中，已重置为待学习。` : `${term} 已加入当前词库。`,
            }
          : current,
      );
    } catch (error) {
      setSelected((current) =>
        current
          ? {
              ...current,
              adding: false,
              message: error instanceof Error ? error.message : "加入失败，请稍后重试。",
            }
          : current,
      );
    }
  };

  const generateAi = async () => {
    if (!selected) return;
    const term = selected.entry?.word || selected.query;
    setSelected((current) => (current ? { ...current, loading: true, message: "" } : current));
    try {
      const entry = await DictionaryService.generateWithAi(term);
      setSelected((current) =>
        current
          ? {
              ...current,
              entry,
              loading: false,
              error: undefined,
              message: `${term} 的释义已生成并缓存。`,
            }
          : current,
      );
    } catch (error) {
      setSelected((current) =>
        current
          ? {
              ...current,
              loading: false,
              error: error instanceof Error ? error.message : "AI 生成失败，请稍后重试。",
            }
          : current,
      );
    }
  };

  return (
    <div className={className}>
      <p className="text-sm leading-6">
        {tokens.length ? (
          tokens.map((token, index) =>
            isClickableWord(cleanWord(token)) ? (
              <button
                key={`${token}-${index}`}
                type="button"
                className={cn(
                  "rounded px-0.5 underline decoration-dotted underline-offset-4 transition hover:bg-primary/10 hover:text-primary active:bg-primary/15",
                  selected?.display === token && "bg-primary/10 text-primary",
                )}
                onClick={() => openWord(token)}
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
      {translation ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{translation}</p> : null}
      {selected ? (
        <WordLookupCard
          selected={selected}
          preferredAccent={preferredAccent}
          onClose={() => setSelected(null)}
          onAdd={() => void addSelected()}
          onGenerateAi={() => void generateAi()}
          onViewDetail={() =>
            setSelected((current) =>
              current
                ? {
                    ...current,
                    detailOpen: !current.detailOpen,
                    message: "",
                  }
                : current,
            )
          }
        />
      ) : null}
    </div>
  );
}
