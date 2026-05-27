import { useEffect, useMemo, useState } from "react";
import { ClickableSentence } from "@/components/shared/clickable-sentence";
import { cn } from "@/lib/utils";
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

export function StudyDetailTabs(props: StudyDetailTabsProps) {
  const defaultTab = useMemo<DetailTab>(() => {
    if (hasContent("collocations", props)) return "collocations";
    if (hasContent("example", props)) return "example";
    if (hasContent("synonyms", props)) return "synonyms";
    if (hasContent("antonyms", props)) return "antonyms";
    return "derived";
  }, [props.collocations, props.example, props.synonyms, props.antonyms, props.derivedForms]);
  const [activeTab, setActiveTab] = useState<DetailTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, props.currentTerm]);

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
        {activeTab === "synonyms" ? <TextList items={props.synonyms} /> : null}
        {activeTab === "antonyms" ? <TextList items={props.antonyms} /> : null}
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
    </div>
  );
}
