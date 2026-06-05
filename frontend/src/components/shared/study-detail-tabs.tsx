import { CheckCircle2, Plus, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AiWordRelationsSection } from "@/components/shared/ai-word-relations-section";
import { ClickableSentence } from "@/components/shared/clickable-sentence";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ensureDeckOptions, quickAddTermToDeck, type DeckOption } from "@/services/add-words-service";
import { DictionaryService, type DictionaryEntry } from "@/services/dictionary-service";
import { playTextPronunciation } from "@/services/pronunciation-service";
import type { DerivedWord } from "@/types/domain";

type StudyDetailTabsProps = {
  deckId: string;
  currentTerm: string;
  definition?: string;
  partOfSpeech?: string;
  collocations?: string[];
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
  exampleTranslation?: string;
  derivedForms?: DerivedWord[];
  preferredAccent: "uk" | "us";
  loading?: boolean;
};

type DetailTab = "collocations" | "example" | "synonyms" | "antonyms" | "similar" | "derived";

type RelatedEntry = {
  term: string;
  partOfSpeech: string;
  meaning: string;
  phonetic: string;
  commonMeanings: string[];
  examMeanings: string[];
  source: DictionaryEntry["source"] | "pending";
};

type AddMessage = {
  term: string;
  type: "success" | "error";
  text: string;
};

const emptyCopy = "暂无内容，可以在添加页使用 AI 补全。";

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "collocations", label: "搭配" },
  { id: "example", label: "例句" },
  { id: "synonyms", label: "近义" },
  { id: "antonyms", label: "反义" },
  { id: "similar", label: "形近" },
  { id: "derived", label: "派生" },
];

function hasContent(tab: DetailTab, props: StudyDetailTabsProps) {
  if (tab === "collocations") return Boolean(props.collocations?.length);
  if (tab === "example") return Boolean(props.example?.trim());
  if (tab === "synonyms") return Boolean(props.synonyms?.length);
  if (tab === "antonyms") return Boolean(props.antonyms?.length);
  if (tab === "similar") return false;
  return Boolean(props.derivedForms?.length);
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

function uniqueTerms(items?: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items || []) {
    const clean = item.trim();
    const key = normalizeTerm(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function fallbackEntry(term: string): RelatedEntry {
  return {
    term,
    partOfSpeech: "",
    meaning: "暂未找到释义，可以在添加页使用 AI 补全。",
    phonetic: "",
    commonMeanings: [],
    examMeanings: [],
    source: "pending",
  };
}

function dictionaryToRelatedEntry(entry: DictionaryEntry, term: string): RelatedEntry {
  return {
    term: entry.word || term,
    partOfSpeech: entry.partOfSpeech || "",
    meaning: entry.meaning || "暂未找到释义，可以在添加页使用 AI 补全。",
    phonetic: entry.phonetic || "",
    commonMeanings: entry.commonMeanings || [],
    examMeanings: entry.examMeanings || [],
    source: entry.source,
  };
}

function TextList({ items }: { items?: string[] }) {
  if (!items?.length) {
    return <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm leading-6 text-muted-foreground">{emptyCopy}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-border/70 bg-white/5 px-3 py-2 text-sm leading-none text-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

function RelatedWordRows({
  terms,
  entries,
  onSelect,
}: {
  terms?: string[];
  entries: Record<string, RelatedEntry>;
  onSelect: (entry: RelatedEntry) => void;
}) {
  const cleanTerms = uniqueTerms(terms);
  if (!cleanTerms.length) {
    return <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm leading-6 text-muted-foreground">{emptyCopy}</p>;
  }

  return (
    <div className="divide-y divide-border/55 overflow-hidden rounded-2xl border border-border/60 bg-white/5">
      {cleanTerms.map((term) => {
        const entry = entries[normalizeTerm(term)] || fallbackEntry(term);
        return (
          <button
            key={term}
            type="button"
            className="flex min-h-[58px] w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-primary/5"
            onClick={() => onSelect(entry)}
          >
            <span className="w-[88px] shrink-0 truncate text-[15px] font-semibold text-foreground">{term}</span>
            <span className="w-[48px] shrink-0 text-xs font-semibold text-primary">{entry.partOfSpeech || "--"}</span>
            <span className="min-w-0 flex-1 truncate text-xs leading-5 text-muted-foreground">{entry.meaning}</span>
          </button>
        );
      })}
    </div>
  );
}

function RelatedWordCard({
  entry,
  preferredAccent,
  onClose,
}: {
  entry: RelatedEntry;
  preferredAccent: "uk" | "us";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[420px] rounded-[26px] border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <h3 className="min-w-0 flex-1 text-4xl font-black leading-[0.95] tracking-normal text-foreground [overflow-wrap:anywhere] sm:text-5xl">
              {entry.term}
            </h3>
            {entry.partOfSpeech ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{entry.partOfSpeech}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-1 text-xs">{preferredAccent === "us" ? "美" : "英"}</span>
            <span>{entry.phonetic || "暂无音标"}</span>
          </div>
        </div>
        <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-panel/80 text-muted-foreground" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-3 text-base font-semibold leading-7 text-foreground">
        {entry.partOfSpeech ? <span className="mr-2 text-primary">{entry.partOfSpeech}</span> : null}
        {entry.meaning}
      </p>

      {(entry.commonMeanings.length || entry.examMeanings.length) ? (
        <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
          {entry.commonMeanings.length ? <p>常见义：{entry.commonMeanings.slice(0, 3).join("；")}</p> : null}
          {entry.examMeanings.length ? <p>常考义：{entry.examMeanings.slice(0, 3).join("；")}</p> : null}
        </div>
      ) : null}

      <Button type="button" variant="outline" className="mt-4 h-10 w-full rounded-full" onClick={() => void playTextPronunciation(entry.term, preferredAccent)}>
        <Volume2 className="mr-2 h-4 w-4" />
        发音
      </Button>
    </div>
  );
}

function DerivedWordCards({
  items,
  deckOptions,
  selectedDeckId,
  loadingDecks,
  addingTerm,
  addedTerms,
  message,
  preferredAccent,
  onDeckChange,
  onAdd,
}: {
  items?: DerivedWord[];
  deckOptions: DeckOption[];
  selectedDeckId: string;
  loadingDecks: boolean;
  addingTerm: string;
  addedTerms: Set<string>;
  message: AddMessage | null;
  preferredAccent: "uk" | "us";
  onDeckChange: (deckId: string) => void;
  onAdd: (term: string) => void;
}) {
  if (!items?.length) {
    return <p className="text-sm leading-6 text-muted-foreground">{emptyCopy}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-white/5 p-3 sm:flex-row sm:items-center">
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">添加到词库</span>
        <select
          value={selectedDeckId}
          onChange={(event) => onDeckChange(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-panel px-3 text-sm outline-none transition focus:border-primary/50"
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
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const key = normalizeTerm(item.term);
          const isAdding = addingTerm === item.term;
          const isAdded = addedTerms.has(key);
          const isCurrentMessage = message?.term === item.term;

          return (
            <article key={`${item.term}-${item.pos}`} className="rounded-2xl border border-border/60 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <strong className="min-w-0 text-lg leading-tight text-foreground [overflow-wrap:anywhere]">{item.term}</strong>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{item.pos}</span>
                  </div>
                  {item.meaning ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.meaning}</p> : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  title="播放发音"
                  onClick={() => void playTextPronunciation(item.term, preferredAccent)}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-muted-foreground">{isAdded ? "已加入，可在词库中学习" : "可作为新单词加入学习"}</span>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 rounded-xl"
                  disabled={!selectedDeckId || isAdding}
                  onClick={() => onAdd(item.term)}
                >
                  {isAdded ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isAdding ? "添加中..." : isAdded ? "已加入" : "加入"}
                </Button>
              </div>

              {isCurrentMessage ? (
                <p className={cn("mt-2 text-xs leading-5", message.type === "error" ? "text-destructive" : "text-success")}>
                  {message.text}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function StudyDetailTabs(props: StudyDetailTabsProps) {
  const defaultTab = useMemo<DetailTab>(() => {
    if (hasContent("collocations", props)) return "collocations";
    if (hasContent("example", props)) return "example";
    if (hasContent("synonyms", props)) return "synonyms";
    if (hasContent("antonyms", props)) return "antonyms";
    return "derived";
  }, [props.collocations, props.example, props.synonyms, props.antonyms, props.derivedForms]);
  const [activeTab, setActiveTab] = useState<DetailTab>(defaultTab);
  const [relatedEntries, setRelatedEntries] = useState<Record<string, RelatedEntry>>({});
  const [selectedEntry, setSelectedEntry] = useState<RelatedEntry | null>(null);
  const [deckOptions, setDeckOptions] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState(props.deckId);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [similarTerms, setSimilarTerms] = useState<string[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [addingDerivedTerm, setAddingDerivedTerm] = useState("");
  const [addedDerivedTerms, setAddedDerivedTerms] = useState<Set<string>>(new Set());
  const [addMessage, setAddMessage] = useState<AddMessage | null>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
    setSelectedEntry(null);
    setAddMessage(null);
    setSimilarTerms([]);
  }, [defaultTab, props.currentTerm]);

  useEffect(() => {
    setSelectedDeckId(props.deckId);
  }, [props.deckId]);

  useEffect(() => {
    if (!props.derivedForms?.length) return;
    let cancelled = false;
    setLoadingDecks(true);
    ensureDeckOptions()
      .then((items) => {
        if (cancelled) return;
        setDeckOptions(items);
        const preferred = items.find((deck) => deck.id === props.deckId) || items[0];
        if (preferred) setSelectedDeckId(preferred.id);
      })
      .catch(() => {
        if (!cancelled) setDeckOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDecks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.deckId, props.derivedForms]);

  useEffect(() => {
    let cancelled = false;
    const terms = uniqueTerms([...(props.synonyms || []), ...(props.antonyms || []), ...similarTerms]);
    if (!terms.length) {
      setRelatedEntries({});
      return;
    }

    DictionaryService.lookupMany(terms, { allowAi: false, preferLocal: true })
      .then((entries) => {
        if (cancelled) return;
        const nextEntries = Object.fromEntries(
          terms.map((term) => {
            const key = normalizeTerm(term);
            const entry = entries[key];
            return [key, entry ? dictionaryToRelatedEntry(entry, term) : fallbackEntry(term)];
          }),
        );
        setRelatedEntries(nextEntries);
      })
      .catch(() => {
        if (cancelled) return;
        setRelatedEntries(Object.fromEntries(terms.map((term) => [normalizeTerm(term), fallbackEntry(term)])));
      });

    return () => {
      cancelled = true;
    };
  }, [props.synonyms, props.antonyms, similarTerms]);

  useEffect(() => {
    let cancelled = false;
    setSimilarLoading(true);
    DictionaryService.findSimilarLookingWords(props.currentTerm, 8)
      .then((terms) => {
        if (cancelled) return;
        setSimilarTerms(terms);
      })
      .catch(() => {
        if (!cancelled) setSimilarTerms([]);
      })
      .finally(() => {
        if (!cancelled) setSimilarLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [props.currentTerm]);

  const addDerivedTerm = async (term: string) => {
    if (!selectedDeckId) return;
    setAddingDerivedTerm(term);
    setAddMessage(null);
    try {
      const result = await quickAddTermToDeck(term, selectedDeckId);
      setAddedDerivedTerms((current) => new Set(current).add(normalizeTerm(term)));
      setAddMessage({
        term,
        type: "success",
        text: result.status === "reset" ? `${term} 已在该词库中，已重置为待学习。` : `${term} 已加入指定词库。`,
      });
    } catch (error) {
      setAddMessage({
        term,
        type: "error",
        text: error instanceof Error ? error.message : "添加失败，请稍后重试。",
      });
    } finally {
      setAddingDerivedTerm("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] border border-border/70 bg-panel/60 p-3">
      <div className="scrollbar-subtle -mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition",
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow-glow" : "bg-white/5 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={cn("scrollbar-subtle overflow-y-auto rounded-2xl bg-white/[0.035] p-3", activeTab === "derived" ? "max-h-[320px]" : "max-h-[180px]")}>
        {props.loading ? <p className="mb-2 text-xs text-muted-foreground">正在补全学习内容...</p> : null}
        {activeTab === "collocations" ? <TextList items={props.collocations} /> : null}
        {activeTab === "synonyms" ? <RelatedWordRows terms={props.synonyms} entries={relatedEntries} onSelect={setSelectedEntry} /> : null}
        {activeTab === "antonyms" ? <RelatedWordRows terms={props.antonyms} entries={relatedEntries} onSelect={setSelectedEntry} /> : null}
        {activeTab === "similar" ? (
          similarLoading ? (
            <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm leading-6 text-muted-foreground">正在查找形近词...</p>
          ) : (
            <RelatedWordRows terms={similarTerms} entries={relatedEntries} onSelect={setSelectedEntry} />
          )
        ) : null}
        {activeTab === "example" ? (
          props.example?.trim() ? (
            <ClickableSentence
              sentence={props.example}
              translation={props.exampleTranslation}
              deckId={props.deckId}
              preferredAccent={props.preferredAccent}
            />
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">{emptyCopy}</p>
          )
        ) : null}
        {activeTab === "derived" ? (
          <DerivedWordCards
            items={props.derivedForms}
            deckOptions={deckOptions}
            selectedDeckId={selectedDeckId}
            loadingDecks={loadingDecks}
            addingTerm={addingDerivedTerm}
            addedTerms={addedDerivedTerms}
            message={addMessage}
            preferredAccent={props.preferredAccent}
            onDeckChange={setSelectedDeckId}
            onAdd={(term) => void addDerivedTerm(term)}
          />
        ) : null}
      </div>
      </div>
      <AiWordRelationsSection
        word={props.currentTerm}
        definition={props.definition || ""}
        partOfSpeech={props.partOfSpeech || ""}
        preferredAccent={props.preferredAccent}
      />
      {selectedEntry ? <RelatedWordCard entry={selectedEntry} preferredAccent={props.preferredAccent} onClose={() => setSelectedEntry(null)} /> : null}
    </div>
  );
}
