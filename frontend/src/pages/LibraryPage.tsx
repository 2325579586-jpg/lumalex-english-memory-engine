import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  LayoutGrid,
  ListFilter,
  PencilLine,
  Plus,
  Search,
  TableProperties,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { collectLibraryTags } from "@/modules/library/selectors";
import { deckRepository } from "@/repositories/deck-repository";
import { learnRecordRepository } from "@/repositories/learn-record-repository";
import { reviewRecordRepository } from "@/repositories/review-record-repository";
import { wordRepository } from "@/repositories/word-repository";
import { syncSystemLexicons } from "@/services/system-lexicon-sync";
import type { Deck, LibraryFilters, WordItem, WordStatus } from "@/types/domain";

const PAGE_SIZE = 20;

function formatStatus(status: WordStatus) {
  const map: Record<WordStatus, string> = {
    unseen: "未学习",
    learning: "学习中",
    learned_pending_review: "待复习",
    due_review: "到期复习",
    reviewing: "复习中",
    weak: "薄弱词",
    mastered: "已掌握",
    suspended: "已暂停",
  };
  return map[status];
}

function formatReviewTime(value?: number) {
  if (!value) return "未安排";
  const delta = value - Date.now();
  if (delta <= 0) return "已到期";
  const hours = Math.round(delta / (60 * 60 * 1000));
  if (hours < 24) return `${Math.max(hours, 1)} 小时后`;
  return `${Math.round(hours / 24)} 天后`;
}

function formatDate(value?: number) {
  if (!value) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getDeckTone(deck: Deck) {
  if (deck.sourceType === "custom") return "warning";
  if (deck.id.includes("cet")) return "secondary";
  return "default";
}

function getVisiblePages(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
}

async function syncDeckCounts(deckIds: string[]) {
  const uniqueIds = [...new Set(deckIds.filter(Boolean))];
  await Promise.all(
    uniqueIds.map(async (deckId) => {
      const words = await wordRepository.listByDeck(deckId);
      await deckRepository.updateCount(deckId, words.length);
    }),
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId?: string }>();
  const isDeckDetail = Boolean(deckId);

  const [view, setView] = useState<"table" | "card">("table");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [words, setWords] = useState<WordItem[]>([]);
  const [overviewWords, setOverviewWords] = useState<WordItem[]>([]);
  const [filters, setFilters] = useState<LibraryFilters>({ query: "", status: "all" });
  const [deckSearch, setDeckSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);
  const [detailHistory, setDetailHistory] = useState<{
    learns: Awaited<ReturnType<typeof learnRecordRepository.listByWord>>;
    reviews: Awaited<ReturnType<typeof reviewRecordRepository.listByWord>>;
  }>({ learns: [], reviews: [] });
  const [moveDeckId, setMoveDeckId] = useState("all");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [activeCustomDeckId, setActiveCustomDeckId] = useState("");
  const [editingDeckName, setEditingDeckName] = useState("");
  const [editingDeckDescription, setEditingDeckDescription] = useState("");

  const activeDeck = useMemo(() => decks.find((deck) => deck.id === deckId) || null, [deckId, decks]);
  const customDecks = useMemo(() => decks.filter((deck) => deck.sourceType === "custom"), [decks]);
  const systemDecks = useMemo(() => decks.filter((deck) => deck.sourceType !== "custom"), [decks]);
  const allTags = useMemo(() => collectLibraryTags(isDeckDetail ? words : overviewWords), [isDeckDetail, overviewWords, words]);
  const activeCustomDeck = useMemo(
    () => customDecks.find((deck) => deck.id === activeCustomDeckId) || null,
    [activeCustomDeckId, customDecks],
  );

  const deckStats = useMemo(() => {
    const map = new Map<string, { total: number; due: number; unseen: number; mastered: number }>();
    overviewWords.forEach((word) => {
      const item = map.get(word.deckId) || { total: 0, due: 0, unseen: 0, mastered: 0 };
      item.total += 1;
      if (word.status === "due_review" || word.status === "weak") item.due += 1;
      if (word.status === "unseen") item.unseen += 1;
      if (word.status === "mastered") item.mastered += 1;
      map.set(word.deckId, item);
    });
    return map;
  }, [overviewWords]);

  const overviewSummary = useMemo(
    () => ({
      totalWords: overviewWords.length,
      dueCount: overviewWords.filter((word) => word.status === "due_review" || word.status === "weak").length,
      unseenCount: overviewWords.filter((word) => word.status === "unseen").length,
      deckCount: decks.length,
    }),
    [decks.length, overviewWords],
  );

  const filteredDecks = useMemo(() => {
    const query = deckSearch.trim().toLowerCase();
    if (!query) return decks;
    return decks.filter(
      (deck) =>
        deck.name.toLowerCase().includes(query) ||
        deck.description.toLowerCase().includes(query),
    );
  }, [deckSearch, decks]);

  const totalPages = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
  const pageWords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return words.slice(start, start + PAGE_SIZE);
  }, [page, words]);

  async function loadData() {
    const deckFilters: LibraryFilters = {
      ...filters,
      deckId: deckId || "all",
    };
    const [deckItems, overviewItems, wordItems] = await Promise.all([
      deckRepository.list(),
      wordRepository.list(),
      isDeckDetail ? wordRepository.list(deckFilters) : Promise.resolve([]),
    ]);
    setDecks(deckItems);
    setOverviewWords(overviewItems);
    setWords(wordItems);
    if (moveDeckId === "all" && deckItems[0]) {
      setMoveDeckId(deckItems[0].id);
    }

    const deck = deckItems.find((item) => item.id === deckId);
    if (deckId && deck?.sourceType === "system" && wordItems.length === 0 && (deck.totalCount || 0) > 0) {
      await syncSystemLexicons(true).catch(() => undefined);
      const repairedWords = await wordRepository.list(deckFilters);
      setWords(repairedWords);
    }
  }

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [deckId, filters]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
    setSelectedWord(null);
  }, [deckId, filters.query, filters.status, filters.tag]);

  useEffect(() => {
    const handleCloudSync = () => {
      loadData().catch(() => undefined);
    };
    window.addEventListener("lumalex:cloud-sync", handleCloudSync);
    return () => window.removeEventListener("lumalex:cloud-sync", handleCloudSync);
  }, [deckId, filters]);

  useEffect(() => {
    if (!selectedWord) {
      setDetailHistory({ learns: [], reviews: [] });
      return;
    }
    Promise.all([
      learnRecordRepository.listByWord(selectedWord.id),
      reviewRecordRepository.listByWord(selectedWord.id),
    ]).then(([learns, reviews]) => setDetailHistory({ learns, reviews }));
  }, [selectedWord]);

  useEffect(() => {
    if (!activeCustomDeck && customDecks[0]) {
      setActiveCustomDeckId(customDecks[0].id);
      setEditingDeckName(customDecks[0].name);
      setEditingDeckDescription(customDecks[0].description);
    }
  }, [activeCustomDeck, customDecks]);

  function resetMessages() {
    setMessage("");
    setErrorMessage("");
  }

  function openCustomDeck(deck: Deck) {
    setActiveCustomDeckId(deck.id);
    setEditingDeckName(deck.name);
    setEditingDeckDescription(deck.description);
  }

  async function handleCreateCustomDeck() {
    resetMessages();
    const name = newDeckName.trim();
    if (!name) {
      setErrorMessage("请输入自定义词库名称。");
      return;
    }

    try {
      const created = await deckRepository.createCustom(name, newDeckDescription.trim());
      await loadData();
      setNewDeckName("");
      setNewDeckDescription("");
      openCustomDeck(created);
      setMessage(`已创建自定义词库“${created.name}”。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建词库失败，请稍后重试。");
    }
  }

  async function handleRenameCustomDeck() {
    if (!activeCustomDeck) return;
    resetMessages();

    const name = editingDeckName.trim();
    if (!name) {
      setErrorMessage("词库名称不能为空。");
      return;
    }

    try {
      await deckRepository.rename(activeCustomDeck.id, name, editingDeckDescription.trim());
      await loadData();
      setMessage(`已更新词库“${name}”。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "重命名失败，请稍后重试。");
    }
  }

  async function handleDeleteCustomDeck() {
    if (!activeCustomDeck) return;
    resetMessages();

    if (!window.confirm(`确认删除自定义词库“${activeCustomDeck.name}”吗？词库中的词条也会一并删除。`)) {
      return;
    }

    try {
      await wordRepository.deleteByDeck(activeCustomDeck.id);
      await deckRepository.deleteCustom(activeCustomDeck.id);
      await loadData();
      setActiveCustomDeckId("");
      setEditingDeckName("");
      setEditingDeckDescription("");
      setSelectedIds([]);
      setMessage(`已删除词库“${activeCustomDeck.name}”。`);
      if (deckId === activeCustomDeck.id) {
        navigate("/library");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除词库失败，请稍后重试。");
    }
  }

  async function handleDeleteSelected() {
    if (!selectedIds.length) return;
    resetMessages();
    const affectedDeckIds = words.filter((word) => selectedIds.includes(word.id)).map((word) => word.deckId);
    await wordRepository.delete(selectedIds);
    await syncDeckCounts(affectedDeckIds);
    setSelectedIds([]);
    await loadData();
    setMessage(`已删除 ${selectedIds.length} 条词条。`);
  }

  async function handleFocusSelected() {
    if (!selectedIds.length) return;
    resetMessages();
    await wordRepository.bulkUpdate(selectedIds, { isFocused: true });
    await loadData();
    setMessage(`已将 ${selectedIds.length} 条词条加入重点复习。`);
  }

  async function handleMoveSelected() {
    if (!selectedIds.length || moveDeckId === "all") return;
    resetMessages();
    const previousDeckIds = words.filter((word) => selectedIds.includes(word.id)).map((word) => word.deckId);
    await wordRepository.moveToDeck(selectedIds, moveDeckId);
    await syncDeckCounts([...previousDeckIds, moveDeckId]);
    setSelectedIds([]);
    await loadData();
    setMessage(`已将词条移动到 ${decks.find((deck) => deck.id === moveDeckId)?.name || "目标词库"}。`);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function renderDeckCard(deck: Deck) {
    const stats = deckStats.get(deck.id) || {
      total: deck.totalCount,
      due: 0,
      unseen: 0,
      mastered: 0,
    };
    const masteredRate = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;

    return (
      <button
        key={deck.id}
        type="button"
        onClick={() => navigate(`/library/${deck.id}`)}
        className="group rounded-3xl border border-border/70 bg-panel/55 p-5 text-left transition-all hover:border-primary/40 hover:bg-panel/80"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge variant={getDeckTone(deck)}>{deck.sourceType === "custom" ? "自定义" : "系统"}</Badge>
            <h2 className="mt-4 truncate text-xl font-semibold">{deck.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {deck.description || "暂无描述"}
            </p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs text-muted-foreground">词条</p>
            <strong className="mt-1 block text-xl">{stats.total}</strong>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs text-muted-foreground">待学</p>
            <strong className="mt-1 block text-xl">{stats.unseen}</strong>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-xs text-muted-foreground">掌握</p>
            <strong className="mt-1 block text-xl">{masteredRate}%</strong>
          </div>
        </div>
      </button>
    );
  }

  function renderWordCard(word: WordItem) {
    return (
      <div key={word.id} className="rounded-3xl border border-border/70 bg-panel/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <button type="button" className="min-w-0 text-left" onClick={() => setSelectedWord(word)}>
            <p className="truncate text-lg font-semibold">{word.term}</p>
            <p className="mt-1 text-sm text-muted-foreground">{word.phonetic || word.partOfSpeech || "暂无音标"}</p>
          </button>
          <input type="checkbox" checked={selectedIds.includes(word.id)} onChange={() => toggleSelected(word.id)} />
        </div>
        <p className="mt-4 text-sm leading-6">{word.meanings[0] || "暂无释义"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={word.status === "weak" || word.status === "due_review" ? "warning" : "muted"}>
            {formatStatus(word.status)}
          </Badge>
          {word.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="muted">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div>
            <p>学习次数</p>
            <strong className="mt-1 block text-foreground">{word.learnCount}</strong>
          </div>
          <div>
            <p>下次复习</p>
            <strong className="mt-1 block text-foreground">{formatReviewTime(word.nextReviewAt)}</strong>
          </div>
        </div>
      </div>
    );
  }

  if (!isDeckDetail) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-6 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">词库中心</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">先选择一个词库，再进入词条列表。</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                这里保留词库级别的概览和管理动作，具体单词会进入对应词库后分页显示。
              </p>
            </div>
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-10"
                placeholder="搜索词库名称或描述"
                value={deckSearch}
                onChange={(event) => setDeckSearch(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {(message || errorMessage) && (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              errorMessage
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
            )}
          >
            {errorMessage || message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
            <p className="text-sm text-muted-foreground">词库数量</p>
            <strong className="mt-3 block text-3xl">{overviewSummary.deckCount}</strong>
          </div>
          <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
            <p className="text-sm text-muted-foreground">总词条</p>
            <strong className="mt-3 block text-3xl">{overviewSummary.totalWords}</strong>
          </div>
          <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
            <p className="text-sm text-muted-foreground">待学习</p>
            <strong className="mt-3 block text-3xl">{overviewSummary.unseenCount}</strong>
          </div>
          <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
            <p className="text-sm text-muted-foreground">待复习 / 薄弱</p>
            <strong className="mt-3 block text-3xl">{overviewSummary.dueCount}</strong>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
          <Card>
            <CardHeader>
              <CardTitle>选择词库</CardTitle>
              <CardDescription>点击一个词库后，会进入该词库的分页词条页。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">系统词库</h2>
                  <Badge variant="muted">{systemDecks.length} 个</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredDecks.filter((deck) => deck.sourceType !== "custom").map(renderDeckCard)}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">自定义词库</h2>
                  <Badge variant="muted">{customDecks.length} 个</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredDecks.filter((deck) => deck.sourceType === "custom").map(renderDeckCard)}
                  {!customDecks.length && (
                    <div className="rounded-3xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                      还没有自定义词库，可以在右侧创建一个。
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>新建自定义词库</CardTitle>
                <CardDescription>把面试、阅读、错题等主题分开放，会更容易复习。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">词库名称</label>
                  <Input
                    value={newDeckName}
                    onChange={(event) => setNewDeckName(event.target.value)}
                    placeholder="例如：面试英语 / 我的易错词"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">描述</label>
                  <Input
                    value={newDeckDescription}
                    onChange={(event) => setNewDeckDescription(event.target.value)}
                    placeholder="一句话说明这个词库的用途"
                  />
                </div>
                <Button className="w-full" onClick={() => void handleCreateCustomDeck()}>
                  <Plus className="h-4 w-4" />
                  新建词库
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>编辑自定义词库</CardTitle>
                <CardDescription>选择一个自定义词库后，可以修改名称或删除。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {customDecks.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => openCustomDeck(deck)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                        activeCustomDeckId === deck.id
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border/70 bg-panel/50 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {deck.name}
                    </button>
                  ))}
                </div>

                {activeCustomDeck ? (
                  <div className="space-y-4 rounded-3xl border border-border/70 bg-panel/60 p-4">
                    <Input value={editingDeckName} onChange={(event) => setEditingDeckName(event.target.value)} />
                    <Input
                      value={editingDeckDescription}
                      onChange={(event) => setEditingDeckDescription(event.target.value)}
                      placeholder="词库描述"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button variant="secondary" onClick={() => void handleRenameCustomDeck()}>
                        <PencilLine className="h-4 w-4" />
                        保存
                      </Button>
                      <Button variant="outline" onClick={() => void handleDeleteCustomDeck()}>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无可编辑的自定义词库。</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  if (!activeDeck) {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-semibold">没有找到这个词库</h1>
          <Button onClick={() => navigate("/library")}>返回词库中心</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <Card>
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/library")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getDeckTone(activeDeck)}>{activeDeck.sourceType === "custom" ? "自定义词库" : "系统词库"}</Badge>
                <Badge variant="muted">每页 20 词</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{activeDeck.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {activeDeck.description || "进入词库后按分页查看词条，避免一次性铺开全部单词。"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-muted-foreground">匹配词条</p>
              <strong className="mt-1 block text-xl">{words.length}</strong>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-muted-foreground">页码</p>
              <strong className="mt-1 block text-xl">{page}/{totalPages}</strong>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 text-center">
              <p className="text-muted-foreground">已选择</p>
              <strong className="mt-1 block text-xl">{selectedIds.length}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {(message || errorMessage) && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            errorMessage
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
          )}
        >
          {errorMessage || message}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-10"
                placeholder="搜索当前词库内的单词、释义或标签"
                value={filters.query || ""}
                onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              />
            </div>
            <select
              value={filters.status || "all"}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value as LibraryFilters["status"] }))
              }
              className="h-11 rounded-2xl border border-border bg-panel px-4 text-sm outline-none"
            >
              <option value="all">全部状态</option>
              <option value="unseen">未学习</option>
              <option value="learning">学习中</option>
              <option value="learned_pending_review">待复习</option>
              <option value="due_review">到期复习</option>
              <option value="weak">薄弱词</option>
              <option value="mastered">已掌握</option>
            </select>
            <select
              value={filters.tag || ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value || undefined }))}
              className="h-11 rounded-2xl border border-border bg-panel px-4 text-sm outline-none"
            >
              <option value="">全部标签</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <Button variant="secondary">
              <ListFilter className="h-4 w-4" />
              筛选
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-panel/60 p-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <select
                value={moveDeckId}
                onChange={(event) => setMoveDeckId(event.target.value)}
                className="h-10 rounded-xl border border-border bg-input px-3 text-sm outline-none"
              >
                <option value="all">选择移动目标</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              <Button variant="secondary" disabled={!selectedIds.length} onClick={() => void handleMoveSelected()}>
                移动
              </Button>
              <Button variant="outline" disabled={!selectedIds.length} onClick={() => void handleFocusSelected()}>
                重点复习
              </Button>
              <Button variant="outline" disabled={!selectedIds.length} onClick={() => void handleDeleteSelected()}>
                删除
              </Button>
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-border bg-panel p-1 lg:flex">
              <button
                type="button"
                onClick={() => setView("table")}
                className={cn("rounded-xl px-3 py-2", view === "table" ? "bg-white text-slate-950" : "text-muted-foreground")}
              >
                <TableProperties className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("card")}
                className={cn("rounded-xl px-3 py-2", view === "card" ? "bg-white text-slate-950" : "text-muted-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>词条列表</CardTitle>
          <CardDescription>
            当前显示第 {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, words.length)} 条，共 {words.length} 条。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!words.length ? (
            <div className="rounded-3xl border border-dashed border-border/70 p-10 text-center">
              <p className="text-lg font-medium">当前词库没有匹配的词条</p>
              <p className="mt-2 text-sm text-muted-foreground">可以调整筛选条件，或去添加页面录入新的单词。</p>
            </div>
          ) : (
            <>
              {view === "table" && (
                <div className="hidden overflow-x-auto rounded-3xl border border-border/70 lg:block">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[0.4fr_1.15fr_1.2fr_0.9fr_0.8fr_0.85fr_0.85fr] bg-panel/80 px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted">
                      <span>选择</span>
                      <span>单词</span>
                      <span>释义</span>
                      <span>标签</span>
                      <span>状态</span>
                      <span>最近复习</span>
                      <span>下次复习</span>
                    </div>
                    {pageWords.map((word) => (
                      <div
                        key={word.id}
                        className="grid grid-cols-[0.4fr_1.15fr_1.2fr_0.9fr_0.8fr_0.85fr_0.85fr] items-center border-t border-border/70 px-4 py-4 text-sm"
                      >
                        <label className="flex items-center">
                          <input type="checkbox" checked={selectedIds.includes(word.id)} onChange={() => toggleSelected(word.id)} />
                        </label>
                        <button type="button" className="truncate text-left font-medium hover:text-primary" onClick={() => setSelectedWord(word)}>
                          {word.term}
                        </button>
                        <span className="truncate">{word.meanings[0] || "暂无释义"}</span>
                        <div className="flex flex-wrap gap-2">
                          {word.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="muted">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <span>{formatStatus(word.status)}</span>
                        <span className="text-muted-foreground">{formatDate(word.lastReviewedAt)}</span>
                        <span className="text-muted-foreground">{formatReviewTime(word.nextReviewAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={cn("grid gap-4", view === "table" ? "lg:hidden" : "md:grid-cols-2 xl:grid-cols-3")}>
                {pageWords.map(renderWordCard)}
              </div>
            </>
          )}

          {words.length > PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  上一页
                </Button>
                {getVisiblePages(page, totalPages).map((item) => (
                  <Button
                    key={item}
                    variant={item === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWord && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{selectedWord.term}</CardTitle>
                <CardDescription>{selectedWord.phonetic || selectedWord.partOfSpeech || "词条详情"}</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedWord(null)}>
                关闭
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">释义与例句</p>
                <p className="mt-3 text-base">{selectedWord.meanings.join("；") || "暂无释义"}</p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{selectedWord.example || "暂无例句"}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedWord.exampleTranslation || "暂无例句翻译"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">学习标记</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedWord.tags.length ? (
                    selectedWord.tags.map((tag) => (
                      <Badge key={tag} variant="muted">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">暂无标签</span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">状态</p>
                    <strong className="mt-1 block">{formatStatus(selectedWord.status)}</strong>
                  </div>
                  <div>
                    <p className="text-muted-foreground">记忆强度</p>
                    <strong className="mt-1 block">{selectedWord.memoryStrength}</strong>
                  </div>
                  <div>
                    <p className="text-muted-foreground">学习次数</p>
                    <strong className="mt-1 block">{selectedWord.learnCount}</strong>
                  </div>
                  <div>
                    <p className="text-muted-foreground">复习次数</p>
                    <strong className="mt-1 block">{selectedWord.reviewCount}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">学习历史</p>
                <div className="mt-3 space-y-2 text-sm">
                  {detailHistory.learns.length ? (
                    detailHistory.learns.slice(0, 5).map((record) => (
                      <div key={record.id} className="rounded-2xl bg-white/5 px-3 py-2">
                        {formatDate(record.createdAt)} · 反馈：{record.result} · 停留 {Math.round(record.dwellTimeMs / 1000)}s
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">暂无学习记录</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">复习历史</p>
                <div className="mt-3 space-y-2 text-sm">
                  {detailHistory.reviews.length ? (
                    detailHistory.reviews.slice(0, 5).map((record) => (
                      <div key={record.id} className="rounded-2xl bg-white/5 px-3 py-2">
                        {formatDate(record.createdAt)} · 模式：{record.mode} · 结果：{record.result}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">暂无复习记录</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
