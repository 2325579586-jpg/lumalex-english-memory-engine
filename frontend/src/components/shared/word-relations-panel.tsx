import { ChevronRight, Plus, Sparkles, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quickAddTermToDeck } from "@/services/add-words-service";
import { DictionaryService, type DictionaryEntry } from "@/services/dictionary-service";
import { playTextPronunciation } from "@/services/pronunciation-service";
import type { DerivedWord } from "@/types/domain";

type RelationTab = "collocations" | "derived" | "roots" | "synonyms" | "antonyms" | "example";

type RelatedWordObject = {
  word?: string;
  term?: string;
  partOfSpeech?: string;
  pos?: string;
  meaning?: string;
  phonetic?: string;
  added?: boolean;
};

type RelatedWordInput = string | RelatedWordObject | DerivedWord;

type RelatedWord = {
  term: string;
  partOfSpeech: string;
  meaning: string;
  phonetic: string;
  commonMeanings: string[];
  examMeanings: string[];
  example?: string;
  exampleTranslation?: string;
  lookupSource?: DictionaryEntry["source"];
  loading?: boolean;
  error?: string;
  sourceType: RelationTab;
};

type WordRelationsPanelProps = {
  deckId: string;
  currentTerm: string;
  collocations: string[];
  derivedForms: DerivedWord[];
  roots: string[];
  synonyms: RelatedWordInput[];
  antonyms?: RelatedWordInput[];
  example?: string;
  exampleTranslation?: string;
  memoryHint?: string;
  preferredAccent?: "uk" | "us";
  aiLoading?: boolean;
};

type RelatedWordListProps = {
  words: RelatedWord[];
  addingWord: string;
  addedWords: Set<string>;
  emptyMessage: string;
  maxVisibleCount: number;
  expanded: boolean;
  onWordClick: (word: RelatedWord) => void;
  onAddWord: (term: string) => void;
};

const tabs: Array<{ id: RelationTab; label: string }> = [
  { id: "collocations", label: "词组搭配" },
  { id: "derived", label: "派生" },
  { id: "roots", label: "词根" },
  { id: "synonyms", label: "近义" },
  { id: "antonyms", label: "反义" },
  { id: "example", label: "例句" },
];

const posLabel: Record<DerivedWord["pos"], string> = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  phrase: "phr.",
  other: "其他",
};

const sourceLabel: Record<DictionaryEntry["source"], string> = {
  local_dictionary: "词库",
  basic_dictionary: "基础词典",
  cache: "缓存",
  ai: "AI",
  fallback: "待补全",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function compactText(value: unknown) {
  return String(value || "").trim();
}

function splitMeaning(value: string) {
  return value
    .split(/[;；,，。]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function getRelatedTerm(item: RelatedWordInput) {
  if (typeof item === "string") return item.trim();
  return compactText("term" in item ? item.term : item.word);
}

function normalizeRelatedWord(item: RelatedWordInput, currentTerm: string, sourceType: RelationTab): RelatedWord | null {
  const term = getRelatedTerm(item);
  if (!term || normalize(term) === normalize(currentTerm)) return null;

  if (typeof item === "string") {
    return {
      term,
      partOfSpeech: "",
      meaning: "正在查询释义...",
      phonetic: "",
      commonMeanings: [],
      examMeanings: [],
      sourceType,
    };
  }

  const isDerived = "pos" in item && "meaning" in item && !("word" in item);
  const rawPartOfSpeech = compactText((item as RelatedWordObject).partOfSpeech || (item as RelatedWordObject).pos);
  const partOfSpeech = isDerived ? posLabel[(item as DerivedWord).pos] || rawPartOfSpeech : rawPartOfSpeech;
  const meaning = compactText((item as RelatedWordObject).meaning) || "正在查询释义...";
  return {
    term,
    partOfSpeech,
    meaning,
    phonetic: compactText((item as RelatedWordObject).phonetic),
    commonMeanings: splitMeaning(meaning),
    examMeanings: partOfSpeech && meaning ? [`${partOfSpeech} ${meaning}`] : [],
    sourceType,
  };
}

function uniqueRelatedWords(items: RelatedWordInput[], currentTerm: string, sourceType: RelationTab) {
  const seen = new Set<string>();
  const result: RelatedWord[] = [];
  for (const item of items) {
    const word = normalizeRelatedWord(item, currentTerm, sourceType);
    if (!word) continue;
    const key = normalize(word.term);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

function rootToRelatedWord(item: string, currentTerm: string): RelatedWord | null {
  const trimmed = item.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/[A-Za-z][A-Za-z'-]{1,}/);
  const term = match?.[0] || trimmed;
  if (!term || normalize(term) === normalize(currentTerm)) return null;
  return {
    term,
    partOfSpeech: "root",
    meaning: trimmed,
    phonetic: "",
    commonMeanings: [trimmed],
    examMeanings: [],
    sourceType: "roots",
  };
}

function EmptyState({ aiLoading, message }: { aiLoading: boolean; message?: string }) {
  return (
    <div className="flex min-h-[112px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-panel/50 px-4 text-center">
      <p className="text-sm text-muted-foreground">{message || (aiLoading ? "AI 正在补全内容..." : "暂无内容，可以在添加页使用 AI 补全。")}</p>
    </div>
  );
}

function RelatedWordList({ words, addingWord, addedWords, emptyMessage, maxVisibleCount, expanded, onWordClick, onAddWord }: RelatedWordListProps) {
  const visibleWords = expanded ? words.slice(0, 18) : words.slice(0, maxVisibleCount);
  if (!visibleWords.length) return <EmptyState aiLoading={false} message={emptyMessage} />;

  return (
    <div className="divide-y divide-border/55 overflow-hidden rounded-2xl bg-white/5">
      {visibleWords.map((word) => {
        const key = normalize(word.term);
        const added = addedWords.has(key);
        const meaning = word.loading ? "正在查询释义..." : word.meaning || "点击 AI 生成释义";
        return (
          <button
            key={`${word.sourceType}-${word.term}`}
            type="button"
            className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-primary/5"
            onClick={() => onWordClick(word)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-[15px] font-semibold text-foreground">{word.term}</span>
                {word.partOfSpeech ? <span className="shrink-0 text-xs font-medium text-primary">{word.partOfSpeech}</span> : null}
              </div>
              <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">{meaning}</p>
            </div>
            <button
              type="button"
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/70 text-muted-foreground transition",
                added ? "border-primary/30 bg-primary/10 text-primary" : "hover:border-primary/30 hover:text-primary",
              )}
              disabled={addingWord === word.term || added}
              onClick={(event) => {
                event.stopPropagation();
                onAddWord(word.term);
              }}
              aria-label={`加入 ${word.term}`}
            >
              {addingWord === word.term ? "..." : <Plus className="h-4 w-4" />}
            </button>
          </button>
        );
      })}
    </div>
  );
}

function RelatedWordCard({
  word,
  preferredAccent,
  addingWord,
  isAdded,
  generating,
  onClose,
  onAddWord,
  onGenerateAi,
  onViewDetail,
}: {
  word: RelatedWord;
  preferredAccent: "uk" | "us";
  addingWord: string;
  isAdded: boolean;
  generating: boolean;
  onClose: () => void;
  onAddWord: (term: string) => void;
  onGenerateAi: (term: string) => void;
  onViewDetail: (term: string) => void;
}) {
  const hasUsefulMeaning = Boolean(word.meaning && !word.meaning.includes("暂无") && !word.meaning.includes("正在查询"));
  const source = word.lookupSource ? sourceLabel[word.lookupSource] : word.loading ? "查询中" : "待补全";

  return (
    <div className="fixed inset-x-4 bottom-[138px] z-40 mx-auto max-h-[272px] max-w-[420px] overflow-y-auto rounded-[26px] border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-3xl font-black tracking-tight text-foreground">{word.term}</h3>
            <Badge variant="muted" className="text-[10px]">
              {source}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-1 text-xs">{preferredAccent === "us" ? "美" : "英"}</span>
            {word.phonetic ? <span>{word.phonetic}</span> : <span className="text-xs">音标查询中</span>}
          </div>
        </div>
        <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-panel/80 text-muted-foreground" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-3 text-base font-semibold leading-7 text-foreground">
        {word.partOfSpeech ? <span className="mr-2 text-primary">{word.partOfSpeech}</span> : null}
        {word.loading ? "正在查询释义..." : word.meaning || "暂未找到释义，可使用 AI 生成解释"}
      </p>
      {word.error ? <p className="mt-1 text-xs text-destructive">{word.error}</p> : null}

      {(word.commonMeanings.length || word.examMeanings.length) && (
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
          {word.commonMeanings.length ? <p>常见义：{word.commonMeanings.slice(0, 3).join("；")}</p> : null}
          {word.examMeanings.length ? <p>常考义：{word.examMeanings.slice(0, 3).join("；")}</p> : null}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" variant="outline" className="h-10 flex-1 rounded-full" onClick={() => void playTextPronunciation(word.term, preferredAccent)}>
          <Volume2 className="mr-2 h-4 w-4" />
          发音
        </Button>
        <Button type="button" variant={isAdded ? "secondary" : "outline"} className="h-10 rounded-full px-4" disabled={addingWord === word.term || isAdded} onClick={() => onAddWord(word.term)}>
          <Plus className="mr-1 h-4 w-4" />
          {isAdded ? "已加入" : "加入"}
        </Button>
      </div>

      {!hasUsefulMeaning ? (
        <Button type="button" variant="secondary" className="mt-2 h-9 w-full rounded-full text-xs" disabled={generating || word.loading} onClick={() => onGenerateAi(word.term)}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {generating ? "AI 生成中..." : "AI 生成释义"}
        </Button>
      ) : null}

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-between rounded-2xl bg-panel/70 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        onClick={() => onViewDetail(word.term)}
      >
        查看详细释义
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function WordRelationsPanel({
  deckId,
  currentTerm,
  collocations,
  derivedForms,
  roots,
  synonyms,
  antonyms = [],
  example = "",
  exampleTranslation = "",
  memoryHint = "",
  preferredAccent = "us",
  aiLoading = false,
}: WordRelationsPanelProps) {
  const [activeTab, setActiveTab] = useState<RelationTab>("collocations");
  const [expanded, setExpanded] = useState(false);
  const [selectedWord, setSelectedWord] = useState<RelatedWord | null>(null);
  const [addingWord, setAddingWord] = useState("");
  const [generatingWord, setGeneratingWord] = useState("");
  const [lookupEntries, setLookupEntries] = useState<Record<string, DictionaryEntry>>({});
  const [lookupLoading, setLookupLoading] = useState<Set<string>>(() => new Set());
  const [lookupErrors, setLookupErrors] = useState<Record<string, string>>({});
  const [addedWords, setAddedWords] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");

  const cleanSynonyms = useMemo(() => uniqueRelatedWords(synonyms, currentTerm, "synonyms"), [currentTerm, synonyms]);
  const cleanAntonyms = useMemo(() => uniqueRelatedWords(antonyms, currentTerm, "antonyms"), [antonyms, currentTerm]);
  const cleanDerived = useMemo(() => uniqueRelatedWords(derivedForms, currentTerm, "derived"), [currentTerm, derivedForms]);
  const cleanRoots = useMemo(() => roots.map((item) => rootToRelatedWord(item, currentTerm)).filter(Boolean) as RelatedWord[], [currentTerm, roots]);
  const visibleLimit = activeTab === "synonyms" || activeTab === "antonyms" || activeTab === "derived" ? (expanded ? 18 : 5) : expanded ? 10 : 4;

  useEffect(() => {
    setSelectedWord(null);
    setExpanded(false);
  }, [currentTerm]);

  const activeRelatedWords = useMemo(() => {
    if (activeTab === "derived") return cleanDerived;
    if (activeTab === "roots") return cleanRoots;
    if (activeTab === "synonyms") return cleanSynonyms;
    if (activeTab === "antonyms") return cleanAntonyms;
    return [];
  }, [activeTab, cleanAntonyms, cleanDerived, cleanRoots, cleanSynonyms]);

  const visibleTermsKey = useMemo(
    () => activeRelatedWords.slice(0, visibleLimit).map((word) => word.term).join("|"),
    [activeRelatedWords, visibleLimit],
  );

  useEffect(() => {
    const visibleTerms = visibleTermsKey.split("|").filter(Boolean);
    if (!visibleTerms.length) return;
    let cancelled = false;
    const missingTerms = visibleTerms.filter((term) => {
      const key = normalize(term);
      return !lookupEntries[key] && !lookupLoading.has(key);
    });
    if (!missingTerms.length) return;

    setLookupLoading((current) => {
      const next = new Set(current);
      missingTerms.forEach((term) => next.add(normalize(term)));
      return next;
    });

    Promise.all(
      missingTerms.map(async (term) => {
        try {
          return { term, entry: await DictionaryService.lookup(term, { allowAi: false }), error: "" };
        } catch (error) {
          return { term, entry: null, error: error instanceof Error ? error.message : "查询失败" };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setLookupEntries((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result.entry) next[normalize(result.term)] = result.entry;
        }
        return next;
      });
      setLookupErrors((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result.error) next[normalize(result.term)] = result.error;
        }
        return next;
      });
      setLookupLoading((current) => {
        const next = new Set(current);
        results.forEach((result) => next.delete(normalize(result.term)));
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [lookupEntries, lookupLoading, visibleTermsKey]);

  const enrichRelatedWord = (word: RelatedWord): RelatedWord => {
    const key = normalize(word.term);
    const entry = lookupEntries[key];
    const loading = lookupLoading.has(key);
    const error = lookupErrors[key];
    if (!entry) {
      return {
        ...word,
        loading,
        error,
        meaning: loading ? "正在查询释义..." : word.meaning,
      };
    }

    return {
      ...word,
      partOfSpeech: word.partOfSpeech || entry.partOfSpeech,
      phonetic: word.phonetic || entry.phonetic,
      meaning: entry.meaning || word.meaning,
      commonMeanings: entry.commonMeanings.length ? entry.commonMeanings : word.commonMeanings,
      examMeanings: entry.examMeanings.length ? entry.examMeanings : word.examMeanings,
      example: entry.example || word.example,
      exampleTranslation: entry.exampleTranslation || word.exampleTranslation,
      lookupSource: entry.source,
      loading,
      error,
    };
  };

  const addTerm = async (term: string) => {
    setAddingWord(term);
    setMessage("");
    try {
      const result = await quickAddTermToDeck(term, deckId);
      setAddedWords((current) => new Set(current).add(normalize(term)));
      setMessage(result.status === "reset" ? `${term} 已在词库中，已重置为待学习。` : `${term} 已加入当前词库。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "添加失败，请稍后重试。");
    } finally {
      setAddingWord("");
    }
  };

  const viewDetail = (term: string) => {
    setMessage(`已保留“${term}”的详细释义入口，完整详情页接入后可从这里打开。`);
  };

  const openRelatedWord = (word: RelatedWord) => {
    const enriched = enrichRelatedWord(word);
    setSelectedWord(enriched);
    const key = normalize(word.term);
    if (lookupEntries[key] || lookupLoading.has(key)) return;

    setLookupLoading((current) => new Set(current).add(key));
    DictionaryService.lookup(word.term, { allowAi: false })
      .then((entry) => {
        setLookupEntries((current) => ({ ...current, [key]: entry }));
      })
      .catch((error) => {
        setLookupErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : "查询失败" }));
      })
      .finally(() => {
        setLookupLoading((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      });
  };

  const generateWithAi = (term: string) => {
    const key = normalize(term);
    setGeneratingWord(term);
    setLookupLoading((current) => new Set(current).add(key));
    DictionaryService.generateWithAi(term)
      .then((entry) => {
        setLookupEntries((current) => ({ ...current, [key]: entry }));
        setLookupErrors((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        setMessage(`${term} 的释义已生成并缓存。`);
      })
      .catch((error) => {
        setLookupErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : "AI 生成失败" }));
        setMessage(error instanceof Error ? error.message : "AI 生成失败，请稍后重试。");
      })
      .finally(() => {
        setGeneratingWord("");
        setLookupLoading((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      });
  };

  const relationCounts: Record<RelationTab, number> = {
    collocations: collocations.length,
    derived: cleanDerived.length,
    roots: cleanRoots.length,
    synonyms: cleanSynonyms.length,
    antonyms: cleanAntonyms.length,
    example: example.trim() ? 1 : 0,
  };
  const activeCount = relationCounts[activeTab];
  const hasMore = activeCount > visibleLimit;
  const selectedWordForCard = selectedWord ? enrichRelatedWord(selectedWord) : null;

  return (
    <div className="overflow-hidden rounded-[22px] border border-border/70 bg-panel/60">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5">
        <div className="scrollbar-subtle flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
              onClick={() => {
                setActiveTab(tab.id);
                setExpanded(false);
                setSelectedWord(null);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Badge variant="muted" className="shrink-0 text-[11px]">
          {aiLoading ? "AI 补全中" : "AI"}
        </Badge>
      </div>

      <div className="min-h-[138px] p-3.5">
        {activeTab === "collocations" && (
          <div className="space-y-2">
            {collocations.length ? (
              collocations.slice(0, visibleLimit).map((item) => (
                <p key={item} className="rounded-2xl bg-white/5 px-3 py-2 text-sm leading-6 text-muted-foreground">
                  {item}
                </p>
              ))
            ) : (
              <EmptyState aiLoading={aiLoading} />
            )}
          </div>
        )}

        {activeTab === "derived" && (
          <RelatedWordList
            words={cleanDerived.map(enrichRelatedWord)}
            addingWord={addingWord}
            addedWords={addedWords}
            emptyMessage={aiLoading ? "AI 正在补全派生词..." : "暂无派生词，可以在添加页使用 AI 补全。"}
            maxVisibleCount={5}
            expanded={expanded}
            onWordClick={openRelatedWord}
            onAddWord={(term) => void addTerm(term)}
          />
        )}

        {activeTab === "roots" && (
          <RelatedWordList
            words={cleanRoots.map(enrichRelatedWord)}
            addingWord={addingWord}
            addedWords={addedWords}
            emptyMessage={aiLoading ? "AI 正在补全词根相关词..." : "暂无词根相关词。"}
            maxVisibleCount={4}
            expanded={expanded}
            onWordClick={openRelatedWord}
            onAddWord={(term) => void addTerm(term)}
          />
        )}

        {activeTab === "synonyms" && (
          <RelatedWordList
            words={cleanSynonyms.map(enrichRelatedWord)}
            addingWord={addingWord}
            addedWords={addedWords}
            emptyMessage={aiLoading ? "AI 正在补全近义词..." : "暂无近义词。"}
            maxVisibleCount={5}
            expanded={expanded}
            onWordClick={openRelatedWord}
            onAddWord={(term) => void addTerm(term)}
          />
        )}

        {activeTab === "antonyms" && (
          <RelatedWordList
            words={cleanAntonyms.map(enrichRelatedWord)}
            addingWord={addingWord}
            addedWords={addedWords}
            emptyMessage={aiLoading ? "AI 正在补全反义词..." : "暂无反义词。"}
            maxVisibleCount={5}
            expanded={expanded}
            onWordClick={openRelatedWord}
            onAddWord={(term) => void addTerm(term)}
          />
        )}

        {activeTab === "example" && (
          <div>
            {example.trim() ? (
              <div className="rounded-2xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">例句</p>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => void playTextPronunciation(example, preferredAccent)}>
                    <Volume2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-2 text-sm leading-6">{example}</p>
                {exampleTranslation ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{exampleTranslation}</p> : null}
                {memoryHint ? <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">{memoryHint}</p> : null}
              </div>
            ) : (
              <EmptyState aiLoading={aiLoading} />
            )}
          </div>
        )}
      </div>

      {hasMore ? (
        <button
          type="button"
          className="w-full border-t border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起" : `查看更多 ${activeCount - visibleLimit} 条`}
        </button>
      ) : null}
      {message ? <p className="border-t border-border/70 px-4 py-2 text-xs text-muted-foreground">{message}</p> : null}
      {selectedWordForCard ? (
        <RelatedWordCard
          word={selectedWordForCard}
          preferredAccent={preferredAccent}
          addingWord={addingWord}
          isAdded={addedWords.has(normalize(selectedWordForCard.term))}
          generating={generatingWord === selectedWordForCard.term}
          onClose={() => setSelectedWord(null)}
          onAddWord={(term) => void addTerm(term)}
          onGenerateAi={generateWithAi}
          onViewDetail={viewDetail}
        />
      ) : null}
    </div>
  );
}
