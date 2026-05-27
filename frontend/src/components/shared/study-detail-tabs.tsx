import { Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClickableSentence } from "@/components/shared/clickable-sentence";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DictionaryService, type DictionaryEntry } from "@/services/dictionary-service";
import { playTextPronunciation } from "@/services/pronunciation-service";
import type { DerivedWord } from "@/types/domain";

type StudyDetailTabsProps = {
  deckId: string;
  currentTerm: string;
  collocations?: string[];
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
  exampleTranslation?: string;
  derivedForms?: DerivedWord[];
  preferredAccent: "uk" | "us";
  loading?: boolean;
};

type DetailTab = "collocations" | "example" | "synonyms" | "antonyms" | "derived";

type RelatedEntry = {
  term: string;
  partOfSpeech: string;
  meaning: string;
  phonetic: string;
  commonMeanings: string[];
  examMeanings: string[];
  source: DictionaryEntry["source"] | "pending";
};

const emptyCopy = "暂无内容，可以在添加页使用 AI 补全。";

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: "collocations", label: "搭配" },
  { id: "example", label: "例句" },
  { id: "synonyms", label: "近义" },
  { id: "antonyms", label: "反义" },
  { id: "derived", label: "派生" },
];

function hasContent(tab: DetailTab, props: StudyDetailTabsProps) {
  if (tab === "collocations") return Boolean(props.collocations?.length);
  if (tab === "example") return Boolean(props.example?.trim());
  if (tab === "synonyms") return Boolean(props.synonyms?.length);
  if (tab === "antonyms") return Boolean(props.antonyms?.length);
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
          <div className="flex items-center gap-2">
            <h3 className="max-w-[220px] truncate text-3xl font-black tracking-normal text-foreground">{entry.term}</h3>
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

  useEffect(() => {
    setActiveTab(defaultTab);
    setSelectedEntry(null);
  }, [defaultTab, props.currentTerm]);

  useEffect(() => {
    let cancelled = false;
    const terms = uniqueTerms([...(props.synonyms || []), ...(props.antonyms || [])]);
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
  }, [props.synonyms, props.antonyms]);

  return (
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

      <div className="scrollbar-subtle max-h-[180px] overflow-y-auto rounded-2xl bg-white/[0.035] p-3">
        {props.loading ? <p className="mb-2 text-xs text-muted-foreground">正在补全学习内容...</p> : null}
        {activeTab === "collocations" ? <TextList items={props.collocations} /> : null}
        {activeTab === "synonyms" ? <RelatedWordRows terms={props.synonyms} entries={relatedEntries} onSelect={setSelectedEntry} /> : null}
        {activeTab === "antonyms" ? <RelatedWordRows terms={props.antonyms} entries={relatedEntries} onSelect={setSelectedEntry} /> : null}
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
          props.derivedForms?.length ? (
            <div className="grid gap-2">
              {props.derivedForms.map((item) => (
                <div key={`${item.term}-${item.pos}`} className="rounded-2xl border border-border/60 bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="min-w-0 truncate text-sm">{item.term}</strong>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[11px] text-muted-foreground">{item.pos}</span>
                  </div>
                  {item.meaning ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.meaning}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">{emptyCopy}</p>
          )
        ) : null}
      </div>
      {selectedEntry ? <RelatedWordCard entry={selectedEntry} preferredAccent={props.preferredAccent} onClose={() => setSelectedEntry(null)} /> : null}
    </div>
  );
}
