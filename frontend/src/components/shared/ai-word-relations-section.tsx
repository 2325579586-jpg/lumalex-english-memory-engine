import { ExternalLink, RefreshCw, Sparkles, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DictionaryService, type DictionaryEntry } from "@/services/dictionary-service";
import { playTextPronunciation } from "@/services/pronunciation-service";
import { findExistingWord, getWordRelations } from "@/services/word-relations-service";
import type { WordRelation, WordRelationsResponse } from "@/types/word-relations";

type AiWordRelationsSectionProps = {
  word: string;
  definition: string;
  partOfSpeech: string;
  preferredAccent: "uk" | "us";
};

type SelectedRelation = {
  relation: WordRelation;
  entry?: DictionaryEntry;
  loading: boolean;
  message: string;
};

function RelationSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/60 bg-white/5 p-3">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-16 animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-2 h-16 animate-pulse rounded-2xl bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function compactText(value: string | undefined) {
  return String(value || "").trim();
}

function relationDetailText(relation: WordRelation) {
  return compactText(relation.difference) || compactText(relation.note);
}

function RelationCard({
  relation,
  onClick,
}: {
  relation: WordRelation;
  onClick: (relation: WordRelation) => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-[188px] w-[252px] shrink-0 flex-col rounded-2xl border border-border/60 bg-background/55 p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.055] sm:w-auto"
      onClick={() => onClick(relation)}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{relation.word}</p>
          <p className="mt-1 text-xs font-semibold text-primary">{relation.partOfSpeech || "--"}</p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-foreground">{relation.chinese || "暂无释义"}</p>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{relationDetailText(relation) || "暂无说明"}</p>
      <div className="mt-auto border-t border-border/60 pt-2">
        <p className="line-clamp-2 text-xs leading-5 text-foreground">{relation.example || "No example yet."}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{relation.exampleZh || "暂无例句翻译"}</p>
      </div>
    </button>
  );
}

function SelectedRelationSheet({
  selected,
  preferredAccent,
  onClose,
}: {
  selected: SelectedRelation;
  preferredAccent: "uk" | "us";
  onClose: () => void;
}) {
  const entry = selected.entry;
  const relation = selected.relation;
  const meaning = entry?.meaning || relation.chinese || "暂无释义";
  const example = entry?.example || relation.example;
  const exampleZh = entry?.exampleTranslation || relation.exampleZh;

  return (
    <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-h-[420px] max-w-[440px] overflow-y-auto rounded-[26px] border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-3xl font-black leading-none text-foreground [overflow-wrap:anywhere] sm:text-4xl">
              {entry?.word || relation.word}
            </h3>
            <Badge variant="muted">{entry ? "词典" : "临时"}</Badge>
          </div>
          <p className="mt-2 text-xs font-semibold text-primary">{entry?.partOfSpeech || relation.partOfSpeech || "--"}</p>
        </div>
        <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-panel/80 text-muted-foreground" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {selected.loading ? <p className="mt-3 text-sm text-muted-foreground">正在查询释义...</p> : null}
      {selected.message ? <p className="mt-3 text-xs text-destructive">{selected.message}</p> : null}

      <p className="mt-3 text-base font-semibold leading-7 text-foreground">{meaning}</p>
      {relation.note ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{relation.note}</p> : null}
      {relation.difference ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{relation.difference}</p> : null}

      {example ? (
        <div className="mt-4 rounded-2xl border border-border/60 bg-white/5 p-3">
          <p className="text-sm leading-6 text-foreground">{example}</p>
          {exampleZh ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{exampleZh}</p> : null}
        </div>
      ) : null}

      <Button type="button" variant="outline" className="mt-4 h-10 w-full rounded-full" onClick={() => void playTextPronunciation(relation.word, preferredAccent)}>
        <Volume2 className="h-4 w-4" />
        发音
      </Button>
    </div>
  );
}

export function AiWordRelationsSection({ word, definition, partOfSpeech, preferredAccent }: AiWordRelationsSectionProps) {
  const navigate = useNavigate();
  const [relations, setRelations] = useState<WordRelationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SelectedRelation | null>(null);

  const request = useMemo(
    () => ({
      word,
      definition,
      partOfSpeech,
      language: "zh-CN",
    }),
    [definition, partOfSpeech, word],
  );

  const loadRelations = (force = false) => {
    if (!word.trim()) return;
    setLoading(true);
    setError("");
    getWordRelations(request, { force })
      .then(setRelations)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "生成失败，点击重试"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setRelations(null);
    setSelected(null);
    loadRelations(false);
  }, [request]);

  const openRelation = async (relation: WordRelation) => {
    const existing = await findExistingWord(relation.word).catch(() => null);
    if (existing) {
      navigate(`/library/${encodeURIComponent(existing.deckId)}?word=${encodeURIComponent(existing.term)}`);
      return;
    }

    setSelected({ relation, loading: true, message: "" });
    DictionaryService.lookup(relation.word, { allowAi: true, preferLocal: true })
      .then((entry) => setSelected({ relation, entry, loading: false, message: "" }))
      .catch((lookupError) =>
        setSelected({
          relation,
          loading: false,
          message: lookupError instanceof Error ? lookupError.message : "查询失败，请稍后重试。",
        }),
      );
  };

  return (
    <section className="rounded-[22px] border border-border/70 bg-panel/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">关系词</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">长相近似、近义、反义和派生相关词</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" disabled={loading} onClick={() => loadRelations(true)}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {loading && !relations ? <RelationSkeleton /> : null}

      {error && !loading ? (
        <button
          type="button"
          className="flex min-h-[96px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/30 bg-destructive/10 px-4 text-center text-sm font-semibold text-destructive"
          onClick={() => loadRelations(true)}
        >
          <Sparkles className="mb-2 h-5 w-5" />
          生成失败，点击重试
        </button>
      ) : null}

      {relations && !error ? (
        <div className="space-y-3">
          {relations.groups.map((group) => (
            <div key={group.type} className="rounded-2xl border border-border/60 bg-white/[0.035] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{group.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{group.description}</p>
                </div>
                <Badge variant="muted">{group.items.length}</Badge>
              </div>

              {group.items.length ? (
                <div className="scrollbar-subtle flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
                  {group.items.map((relation) => (
                    <RelationCard key={`${group.type}-${relation.word}`} relation={relation} onClick={(item) => void openRelation(item)} />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm leading-6 text-muted-foreground">暂无内容</p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {selected ? <SelectedRelationSheet selected={selected} preferredAccent={preferredAccent} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}
