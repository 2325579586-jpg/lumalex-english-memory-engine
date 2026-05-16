import { FileUp, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Deck } from "@/types/domain";
import {
  ensureDeckOptions,
  enrichExistingWordRelations,
  generateAiMockWordList,
  parseBatchText,
  parseCsvText,
  readTextFile,
  requestAutoEnrich,
  saveDraftsToDeck,
  saveSingleWord,
  type EnrichedDraft,
  type ParsedDraft,
} from "@/services/add-words-service";

const tabs = [
  { id: "single", label: "智能录入" },
  { id: "batch", label: "批量粘贴" },
  { id: "file", label: "文件导入" },
  { id: "ai", label: "AI 词单" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type SmartFormState = {
  term: string;
  deckId: string;
  meanings: string;
  phonetic: string;
  partOfSpeech: string;
  example: string;
  exampleTranslation: string;
  memoryHint: string;
  tags: string;
  synonyms: string;
  antonyms: string;
  derivedForms: string;
  pronunciationUk: string;
  pronunciationUs: string;
};

function mapDraftToForm(draft: EnrichedDraft, deckId: string): SmartFormState {
  return {
    term: draft.term,
    deckId,
    meanings: draft.meanings.join("；"),
    phonetic: draft.phonetic,
    partOfSpeech: draft.partOfSpeech,
    example: draft.example,
    exampleTranslation: draft.exampleTranslation,
    memoryHint: draft.memoryHint,
    tags: draft.tags.join("，"),
    synonyms: draft.synonyms.join("，"),
    antonyms: draft.antonyms.join("，"),
    derivedForms: draft.derivedForms.map((item) => item.term).join("，"),
    pronunciationUk: draft.pronunciationUk,
    pronunciationUs: draft.pronunciationUs,
  };
}

function emptySmartForm(deckId = ""): SmartFormState {
  return {
    term: "",
    deckId,
    meanings: "",
    phonetic: "",
    partOfSpeech: "",
    example: "",
    exampleTranslation: "",
    memoryHint: "",
    tags: "",
    synonyms: "",
    antonyms: "",
    derivedForms: "",
    pronunciationUk: "",
    pronunciationUs: "",
  };
}

export function AddWordsPage() {
  const [tab, setTab] = useState<TabId>("single");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number; term: string } | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [singleForm, setSingleForm] = useState<SmartFormState>(emptySmartForm());
  const [singleGenerated, setSingleGenerated] = useState<EnrichedDraft | null>(null);

  const [batchText, setBatchText] = useState("");
  const [batchDeckId, setBatchDeckId] = useState("");
  const [drafts, setDrafts] = useState<ParsedDraft[]>([]);
  const [draftErrors, setDraftErrors] = useState<Array<{ line: number; raw: string; reason: string }>>([]);

  const [aiForm, setAiForm] = useState({
    topic: "考研核心动词",
    count: 12,
    difficulty: "中等",
    withExample: true,
    deckId: "",
  });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    ensureDeckOptions().then((items) => {
      setDecks(items);
      const defaultDeckId = items[0]?.id || "";
      setSingleForm((current) => (current.deckId ? current : { ...current, deckId: defaultDeckId }));
      setBatchDeckId((current) => current || defaultDeckId);
      setAiForm((current) => (current.deckId ? current : { ...current, deckId: defaultDeckId }));
    });
  }, []);

  const selectedDeckName = useMemo(() => {
    const deckId = tab === "single" ? singleForm.deckId : tab === "ai" ? aiForm.deckId : batchDeckId;
    return decks.find((deck) => deck.id === deckId)?.name || "未选择词库";
  }, [aiForm.deckId, batchDeckId, decks, singleForm.deckId, tab]);

  const previewDraft = useMemo<ParsedDraft | EnrichedDraft | null>(() => {
    if (tab === "single") {
      if (singleGenerated) {
        return singleGenerated;
      }
      if (singleForm.term.trim()) {
        return {
          term: singleForm.term.trim(),
          meanings: singleForm.meanings
            .split(/[；;,，]/)
            .map((item) => item.trim())
            .filter(Boolean),
          type: singleForm.term.trim().includes(" ") ? "phrase" : "word",
          phonetic: singleForm.phonetic,
          partOfSpeech: singleForm.partOfSpeech,
          tags: singleForm.tags
            .split(/[；;,，]/)
            .map((item) => item.trim())
            .filter(Boolean),
          synonyms: singleForm.synonyms
            .split(/[；;,，、]/)
            .map((item) => item.trim())
            .filter(Boolean),
          antonyms: singleForm.antonyms
            .split(/[；;,，、]/)
            .map((item) => item.trim())
            .filter(Boolean),
          derivedForms: singleForm.derivedForms
            .split(/[；;,，、]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((term) => ({ term, pos: "other" as const })),
          example: singleForm.example,
          exampleTranslation: singleForm.exampleTranslation,
          memoryHint: singleForm.memoryHint,
          pronunciationUk: singleForm.pronunciationUk,
          pronunciationUs: singleForm.pronunciationUs,
        };
      }
      return null;
    }
    return drafts[0] || null;
  }, [drafts, singleForm, singleGenerated, tab]);

  const previewKind = useMemo(() => {
    if (!previewDraft) return "word";
    return "kind" in previewDraft ? previewDraft.kind : previewDraft.type;
  }, [previewDraft]);

  async function refreshDecks() {
    const items = await ensureDeckOptions();
    setDecks(items);
  }

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  async function handleAutoFill() {
    const term = singleForm.term.trim();
    if (!term) {
      setErrorMessage("请先输入要添加的单词或短语。");
      return;
    }

    clearMessages();
    setAutoFilling(true);
    try {
      const generated = await requestAutoEnrich(term);
      setSingleGenerated(generated);
      setSingleForm((current) => mapDraftToForm(generated, current.deckId));
      setMessage("已自动补全释义、音标、例句和记忆提示，你现在只需要确认并保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "自动补全失败，请稍后重试。");
    } finally {
      setAutoFilling(false);
    }
  }

  async function handleBackfillRelations() {
    clearMessages();
    setBackfilling(true);
    setBackfillProgress({ done: 0, total: 0, term: "" });
    try {
      const result = await enrichExistingWordRelations((done, total, term) => {
        setBackfillProgress({ done, total, term });
      });
      setMessage(result.total ? `已为现有词库补全 ${result.updated}/${result.total} 个词条的派生词和近义词。` : "现有词库都已经有派生词和近义信息。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "补全现有词库失败，请稍后重试。");
    } finally {
      setBackfilling(false);
    }
  }

  async function handleSaveSingle() {
    clearMessages();
    if (!singleForm.term.trim()) {
      setErrorMessage("请输入单词或短语后再保存。");
      return;
    }

    setSaving(true);
    try {
      let payloadToSave = singleForm;
      if (!singleForm.meanings.trim()) {
        const generated = await requestAutoEnrich(singleForm.term.trim());
        payloadToSave = mapDraftToForm(generated, singleForm.deckId);
        setSingleGenerated(generated);
        setSingleForm(payloadToSave);
      }

      await saveSingleWord({
        ...payloadToSave,
        derivedForms: singleGenerated?.term === payloadToSave.term ? singleGenerated.derivedForms : payloadToSave.derivedForms,
      });
      await refreshDecks();
      const currentDeckId = payloadToSave.deckId;
      setMessage(`已将 ${singleForm.term.trim()} 保存到 ${selectedDeckName}。`);
      setSingleGenerated(null);
      setAdvancedOpen(false);
      setSingleForm(emptySmartForm(currentDeckId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  function handleParseBatch() {
    clearMessages();
    const result = parseBatchText(batchText);
    setDrafts(result.drafts);
    setDraftErrors(result.errors);
    if (result.drafts.length) {
      setMessage(`已解析 ${result.drafts.length} 条词条，确认后即可导入 ${selectedDeckName}。`);
    }
    if (result.errors.length) {
      setErrorMessage("有部分内容解析失败，请检查下方错误行。");
    }
  }

  async function handleImportDrafts() {
    clearMessages();
    if (!drafts.length) {
      setErrorMessage("当前没有可导入的词条。");
      return;
    }

    setSaving(true);
    try {
      await saveDraftsToDeck(drafts, tab === "ai" ? aiForm.deckId : batchDeckId);
      await refreshDecks();
      setMessage(`已成功导入 ${drafts.length} 条内容到 ${selectedDeckName}。`);
      setDrafts([]);
      setDraftErrors([]);
      if (tab === "batch") {
        setBatchText("");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "导入失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelected(file?: File) {
    if (!file) return;
    clearMessages();
    setSaving(true);
    try {
      const text = await readTextFile(file);
      const result = file.name.endsWith(".csv") ? parseCsvText(text) : parseBatchText(text);
      setDrafts(result.drafts);
      setDraftErrors(result.errors);
      setMessage(`已读取 ${file.name}，解析出 ${result.drafts.length} 条可导入内容。`);
      if (result.errors.length) {
        setErrorMessage("文件中有部分行格式异常，请先确认后再导入。");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "文件解析失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAi() {
    clearMessages();
    setAiLoading(true);
    try {
      const generated = await generateAiMockWordList(aiForm);
      setDrafts(generated);
      setDraftErrors([]);
      setMessage(`已为你生成 ${generated.length} 条主题词单，确认后即可写入词库。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "词单生成失败，请稍后重试。");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">智能录入工作台</p>
            <h1 className="mt-2 text-2xl font-semibold">输入一个单词或短语，系统自动帮你生成完整学习内容。</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              默认流程是 输入内容、自动补全、预览结果、选择词库、一键保存。复杂字段被折叠到高级编辑里，只有你想微调时才需要展开。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-panel/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">默认流程</p>
              <p className="mt-2 text-sm font-medium">输入 → 生成 → 预览 → 保存</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-panel/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">当前词库</p>
              <p className="mt-2 text-sm font-medium">{selectedDeckName}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-panel/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">词库数量</p>
              <p className="mt-2 text-sm font-medium">{decks.length} 个可用词库</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" disabled={backfilling} onClick={() => void handleBackfillRelations()}>
              {backfilling ? "补全现有词库中..." : "补全现有词库关系"}
            </Button>
            {backfillProgress ? (
              <p className="text-xs text-muted-foreground">
                {backfillProgress.total
                  ? `${backfillProgress.done}/${backfillProgress.total}${backfillProgress.term ? ` · ${backfillProgress.term}` : ""}`
                  : "正在扫描现有词库"}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {(message || errorMessage) && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            errorMessage
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/40 bg-emerald-50 text-emerald-950 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-50",
          )}
        >
          {errorMessage || message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    clearMessages();
                  }}
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm font-medium transition-colors",
                    tab === item.id ? "bg-white text-slate-950" : "bg-panel text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <CardTitle className="pt-2">{tabs.find((item) => item.id === tab)?.label}</CardTitle>
            <CardDescription>
              {tab === "single" && "最推荐的方式：输入一个词，系统自动补全，用户只做确认和微调。"}
              {tab === "batch" && "适合一次性粘贴一组新词，用分隔符快速解析。"}
              {tab === "file" && "支持 txt / csv，本地解析后先预览再入库。"}
              {tab === "ai" && "先用 mock 流程模拟按主题生成词单，后续可接真实 AI。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {tab === "single" && (
              <>
                <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">输入单词或短语</label>
                      <Input
                        value={singleForm.term}
                        onChange={(event) => {
                          setSingleForm((current) => ({ ...current, term: event.target.value }));
                          setSingleGenerated(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleAutoFill();
                          }
                        }}
                        placeholder="例如 resilient / in the long run / take initiative"
                      />
                      <p className="text-xs text-muted-foreground">
                        回车或点击“自动补全”，系统会生成释义、音标、例句、翻译和记忆提示。
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">保存到词库</label>
                      <select
                        value={singleForm.deckId}
                        onChange={(event) => setSingleForm((current) => ({ ...current, deckId: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm outline-none transition focus:border-primary/50"
                      >
                        {decks.map((deck) => (
                          <option key={deck.id} value={deck.id}>
                            {deck.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={() => void handleAutoFill()} disabled={autoFilling}>
                      <Sparkles className="h-4 w-4" />
                      {autoFilling ? "自动补全中..." : "自动补全"}
                    </Button>
                    <Button variant="secondary" onClick={() => void handleSaveSingle()} disabled={saving}>
                      <Wand2 className="h-4 w-4" />
                      {saving ? "保存中..." : "确认并保存"}
                    </Button>
                    <Button variant="ghost" onClick={() => setAdvancedOpen((current) => !current)}>
                      {advancedOpen ? "收起高级编辑" : "展开高级编辑"}
                    </Button>
                  </div>
                </div>

                {advancedOpen && (
                  <div className="grid gap-4 rounded-3xl border border-border/70 bg-panel/50 p-5 lg:grid-cols-2">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium">中文释义</label>
                      <Input
                        value={singleForm.meanings}
                        onChange={(event) => setSingleForm((current) => ({ ...current, meanings: event.target.value }))}
                        placeholder="多个释义可用 中文分号 或逗号分隔"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">音标</label>
                      <Input
                        value={singleForm.phonetic}
                        onChange={(event) => setSingleForm((current) => ({ ...current, phonetic: event.target.value }))}
                        placeholder="/rɪˈzɪliənt/"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">词性 / 标签</label>
                      <Input
                        value={singleForm.partOfSpeech}
                        onChange={(event) => setSingleForm((current) => ({ ...current, partOfSpeech: event.target.value }))}
                        placeholder="adj. / phrase"
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium">例句</label>
                      <Textarea
                        value={singleForm.example}
                        onChange={(event) => setSingleForm((current) => ({ ...current, example: event.target.value }))}
                        placeholder="系统生成的英文例句可在这里微调"
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium">例句翻译</label>
                      <Textarea
                        value={singleForm.exampleTranslation}
                        onChange={(event) =>
                          setSingleForm((current) => ({ ...current, exampleTranslation: event.target.value }))
                        }
                        placeholder="系统生成的中文翻译可在这里微调"
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium">记忆提示</label>
                      <Textarea
                        value={singleForm.memoryHint}
                        onChange={(event) => setSingleForm((current) => ({ ...current, memoryHint: event.target.value }))}
                        placeholder="可以补充词根词缀、使用场景或联想提示"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">标签</label>
                      <Input
                        value={singleForm.tags}
                        onChange={(event) => setSingleForm((current) => ({ ...current, tags: event.target.value }))}
                        placeholder="例如 考研，高频，短语"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">同义词</label>
                      <Input
                        value={singleForm.synonyms}
                        onChange={(event) => setSingleForm((current) => ({ ...current, synonyms: event.target.value }))}
                        placeholder="例如 durable，flexible，tough"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">派生词 / 词形变化</label>
                      <Input
                        value={singleForm.derivedForms}
                        onChange={(event) => setSingleForm((current) => ({ ...current, derivedForms: event.target.value }))}
                        placeholder="例如 refer，reference，referential"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">反义词</label>
                      <Input
                        value={singleForm.antonyms}
                        onChange={(event) => setSingleForm((current) => ({ ...current, antonyms: event.target.value }))}
                        placeholder="例如 fragile，weak"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">发音地址</label>
                      <Input
                        value={singleForm.pronunciationUk}
                        onChange={(event) =>
                          setSingleForm((current) => ({
                            ...current,
                            pronunciationUk: event.target.value,
                            pronunciationUs: event.target.value,
                          }))
                        }
                        placeholder="自动补全后如有音频链接，会显示在这里"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === "batch" && (
              <>
                <div className="rounded-2xl border border-border/70 bg-panel/60 p-4 text-sm text-muted-foreground">
                  支持每行一个词条，示例：
                  <div className="mt-3 rounded-2xl bg-black/10 p-3 font-mono text-xs text-foreground">
                    resilient | 有韧性的{"\n"}
                    in the long run - 从长远来看{"\n"}
                    take initiative: 主动采取行动
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">导入到词库</label>
                  <select
                    value={batchDeckId}
                    onChange={(event) => setBatchDeckId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm outline-none transition focus:border-primary/50"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Textarea
                  className="min-h-[260px]"
                  value={batchText}
                  onChange={(event) => setBatchText(event.target.value)}
                  placeholder={"resilient | 有韧性的\nin the long run - 从长远来看\ntake initiative: 主动采取行动"}
                />
                <div className="flex gap-3">
                  <Button onClick={handleParseBatch}>解析预览</Button>
                  <Button disabled={saving || !drafts.length} variant="secondary" onClick={() => void handleImportDrafts()}>
                    确认导入
                  </Button>
                </div>
              </>
            )}

            {tab === "file" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">导入到词库</label>
                  <select
                    value={batchDeckId}
                    onChange={(event) => setBatchDeckId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm outline-none transition focus:border-primary/50"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-3xl border border-dashed border-border p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-panel text-primary">
                    <FileUp className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-lg font-medium">拖拽或选择 txt / csv 文件</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    文件会先在本地解析并生成预览，确认无误后才会真正写入词库。
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={(event) => void handleFileSelected(event.target.files?.[0])}
                  />
                  <Button className="mt-6" onClick={() => fileInputRef.current?.click()}>
                    选择文件
                  </Button>
                </div>
                <Button disabled={saving || !drafts.length} variant="secondary" onClick={() => void handleImportDrafts()}>
                  确认导入解析结果
                </Button>
              </>
            )}

            {tab === "ai" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">主题</label>
                    <Input
                      value={aiForm.topic}
                      onChange={(event) => setAiForm((current) => ({ ...current, topic: event.target.value }))}
                      placeholder="例如：考研高频动词 / 面试英语 / 雅思口语短语"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">数量</label>
                    <Input
                      type="number"
                      value={aiForm.count}
                      onChange={(event) =>
                        setAiForm((current) => ({ ...current, count: Number(event.target.value) || 10 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">难度</label>
                    <Input
                      value={aiForm.difficulty}
                      onChange={(event) => setAiForm((current) => ({ ...current, difficulty: event.target.value }))}
                      placeholder="基础 / 中等 / 进阶"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">保存到词库</label>
                    <select
                      value={aiForm.deckId}
                      onChange={(event) => setAiForm((current) => ({ ...current, deckId: event.target.value }))}
                      className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm outline-none transition focus:border-primary/50"
                    >
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={aiForm.withExample}
                    onChange={(event) =>
                      setAiForm((current) => ({ ...current, withExample: event.target.checked }))
                    }
                  />
                  生成示例例句和基础记忆提示（当前为 mock 流程）
                </label>
                <div className="flex gap-3">
                  <Button disabled={aiLoading} onClick={() => void handleGenerateAi()}>
                    {aiLoading ? "生成中..." : "生成词单预览"}
                  </Button>
                  <Button disabled={saving || !drafts.length} variant="secondary" onClick={() => void handleImportDrafts()}>
                    保存到词库
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>内容预览</CardTitle>
            <CardDescription>自动补全后的学习内容会先展示在这里，你可以快速确认，再决定是否展开高级编辑。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold">{previewDraft?.term || "等待输入内容"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {previewKind} · {selectedDeckName}
                  </p>
                </div>
                <Badge>{previewDraft ? "可保存" : "待生成"}</Badge>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">中文释义</p>
                  <p className="mt-2 text-base leading-7">
                    {previewDraft?.meanings?.join("；") || "输入单词后，这里会显示自动生成的核心释义。"}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">音标 / 词性</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {[previewDraft?.phonetic, previewDraft?.partOfSpeech].filter(Boolean).join(" · ") || "自动补全后显示"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">标签</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {previewDraft?.tags?.length ? (
                        previewDraft.tags.map((tag) => (
                          <Badge key={tag} variant="muted">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">补全后自动生成</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">派生词 / 词形变化</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {previewDraft?.derivedForms?.length ? (
                      previewDraft.derivedForms.map((word) => (
                        <Badge key={`${word.term}-${word.pos}`} variant="muted">
                          {word.term}
                          {word.pos !== "other" ? ` · ${word.pos}` : ""}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">自动补全后显示名词、动词、形容词和副词等词形</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">同义词</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {previewDraft?.synonyms?.length ? (
                      previewDraft.synonyms.map((word) => (
                        <Badge key={word} variant="muted">
                          {word}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">自动补全后显示，可在学习/复习时一键加入词库</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">例句</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/90">
                    {previewDraft?.example || "系统会在这里生成一条英文例句。"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {previewDraft?.exampleTranslation || "这里会显示例句翻译，方便快速确认语境。"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">记忆提示</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {previewDraft?.memoryHint || "补全后会生成简短记忆提示，帮助你决定是否保存到学习系统。"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
              <p className="text-sm font-medium">解析状态</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="text-muted-foreground">可导入条目</span>
                  <strong>{tab === "single" ? (previewDraft ? 1 : 0) : drafts.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="text-muted-foreground">异常行数</span>
                  <strong className={draftErrors.length ? "text-destructive" : ""}>{draftErrors.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span className="text-muted-foreground">目标词库</span>
                  <strong>{selectedDeckName}</strong>
                </div>
              </div>
            </div>

            {draftErrors.length > 0 && (
              <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-5">
                <p className="text-sm font-medium text-destructive">解析失败的内容</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {draftErrors.slice(0, 6).map((item) => (
                    <div key={`${item.line}-${item.raw}`} className="rounded-2xl bg-black/10 px-3 py-2">
                      第 {item.line} 行：{item.raw} · {item.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
