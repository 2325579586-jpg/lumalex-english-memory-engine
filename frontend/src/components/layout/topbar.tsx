import { CheckCircle2, Loader2, LogOut, Search, Settings2, Sparkles, User2, Volume2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCloudSyncStatus } from "@/hooks/use-cloud-sync-status";
import { cn } from "@/lib/utils";
import { deckRepository } from "@/repositories/deck-repository";
import { wordRepository } from "@/repositories/word-repository";
import { saveSingleWord } from "@/services/add-words-service";
import { DictionaryService, type DictionaryEntry } from "@/services/dictionary-service";
import { playPronunciation } from "@/services/pronunciation-service";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import type { Deck, WordItem, WordStatus } from "@/types/domain";

function getTodayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function getSyncBadge(state: ReturnType<typeof useCloudSyncStatus>) {
  switch (state.status) {
    case "queued":
      return { label: "待同步", variant: "muted" as const };
    case "syncing":
      return { label: "同步中", variant: "secondary" as const };
    case "success":
      return { label: "已同步", variant: "default" as const };
    case "error":
      return { label: "同步失败", variant: "warning" as const };
    default:
      return { label: "未同步", variant: "muted" as const };
  }
}

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

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

type SearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "local"; query: string; matches: WordItem[] }
  | { status: "dictionary"; query: string; entry: DictionaryEntry }
  | { status: "empty"; query: string }
  | { status: "error"; query: string; message: string };

export function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, mode, setMode, toggleLanguage } = useUiStore();
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const syncState = useCloudSyncStatus();
  const syncBadge = getSyncBadge(syncState);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const [decks, setDecks] = useState<Deck[]>([]);
  const [targetDeckId, setTargetDeckId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState("");

  const isStudyRoute = location.pathname === "/learn" || location.pathname === "/review";
  const selectedDeck = useMemo(() => decks.find((deck) => deck.id === targetDeckId), [decks, targetDeckId]);

  useEffect(() => {
    if (isStudyRoute) return;
    deckRepository
      .list()
      .then((items) => {
        setDecks(items);
        setTargetDeckId((current) => current || items.find((deck) => deck.sourceType === "custom")?.id || items[0]?.id || "");
      })
      .catch(() => undefined);
  }, [isStudyRoute]);

  useEffect(() => {
    setSearchState({ status: "idle" });
    setAddMessage("");
  }, [location.pathname]);

  async function handleGlobalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchState({ status: "idle" });
      return;
    }

    setAddMessage("");
    setSearchState({ status: "loading", query });
    try {
      const normalized = normalizeTerm(query);
      const allWords = await wordRepository.list();
      const localMatches = allWords.filter(
        (word) =>
          word.normalizedTerm === normalized ||
          word.term.toLowerCase().includes(normalized) ||
          word.meanings.join(" ").toLowerCase().includes(normalized) ||
          word.tags.join(" ").toLowerCase().includes(normalized),
      );

      if (localMatches.length) {
        setSearchState({ status: "local", query, matches: localMatches.slice(0, 6) });
        return;
      }

      const entry = await DictionaryService.lookup(query, { allowAi: false });
      if (entry.source !== "fallback" && entry.meaning.trim()) {
        setSearchState({ status: "dictionary", query, entry });
        return;
      }

      setSearchState({ status: "empty", query });
    } catch (error) {
      setSearchState({
        status: "error",
        query,
        message: error instanceof Error ? error.message : "搜索失败，请稍后重试。",
      });
    }
  }

  async function handleAddDictionaryEntry(entry: DictionaryEntry) {
    if (!targetDeckId) return;
    setAdding(true);
    setAddMessage("");
    try {
      const saved = await saveSingleWord({
        term: entry.word,
        meanings: entry.meaning,
        phonetic: entry.phonetic,
        partOfSpeech: entry.partOfSpeech,
        example: entry.example,
        exampleTranslation: entry.exampleTranslation,
        tags: ["全局搜索", entry.source === "basic_dictionary" ? "基础词典" : "词典"].join("，"),
        deckId: targetDeckId,
      });

      const [nextDecks, allWords] = await Promise.all([deckRepository.list(), wordRepository.list()]);
      const normalized = normalizeTerm(saved.term);
      const matches = allWords.filter((word) => word.normalizedTerm === normalized);
      setDecks(nextDecks);
      setSearchState({ status: "local", query: saved.term, matches: matches.length ? matches : [saved] });
      setAddMessage(`已加入 ${selectedDeck?.name || "目标词库"}。`);
    } catch (error) {
      setAddMessage(error instanceof Error ? error.message : "加入词库失败，请稍后重试。");
    } finally {
      setAdding(false);
    }
  }

  function closeSearchPanel() {
    setSearchState({ status: "idle" });
    setAddMessage("");
  }

  return (
    <header className="sticky top-0 z-20 hidden border-b border-border/80 bg-card/92 px-4 py-3 backdrop-blur-xl sm:px-5 lg:block lg:px-8 lg:py-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{getTodayLabel()}</p>
            <h2
              className={cn(
                "mt-1 font-semibold text-foreground",
                isStudyRoute ? "text-sm leading-6 sm:text-base" : "text-base leading-6 sm:text-lg",
              )}
            >
              {isStudyRoute ? "先做判断，再展开答案，保持主动回忆。" : "今天的重点是先守住复习窗口，再推进一组新词。"}
            </h2>
          </div>

          {!isStudyRoute && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center rounded-xl border border-border bg-panel p-1">
                {[
                  { id: "focus", label: "沉浸" },
                  { id: "full", label: "完整" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id as "focus" | "full")}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm",
                      mode === item.id ? "bg-white text-slate-950" : "text-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={toggleLanguage}
                className="rounded-lg border border-border bg-panel px-3 py-2 text-xs font-medium text-muted transition-all hover:text-foreground sm:text-sm"
              >
                {language === "zh" ? "中文 / EN" : "EN / 中文"}
              </button>

              <Button variant="secondary" size="sm" className="h-10 rounded-lg px-3 sm:px-4" onClick={() => navigate("/add")}>
                <Sparkles className="h-4 w-4" />
                添加单词
              </Button>
            </div>
          )}
        </div>

        {isStudyRoute ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">当前账号</p>
                <p className="truncate text-sm font-medium">{session?.username || "未登录"}</p>
              </div>
              <Badge variant={syncBadge.variant}>{syncBadge.label}</Badge>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-panel text-muted-foreground transition-colors hover:text-foreground"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative hidden w-full max-w-md sm:block">
              <form onSubmit={(event) => void handleGlobalSearch(event)}>
                <Search className="absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索单词、短语、标签、例句"
                  className="rounded-lg border-border bg-panel pl-10"
                />
              </form>

              {searchState.status !== "idle" && (
                <div className="absolute left-0 top-[52px] z-50 w-full overflow-hidden rounded-3xl border border-border/80 bg-card/98 shadow-card backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">全局查词</p>
                      <p className="truncate text-sm font-semibold">{searchState.status === "loading" ? searchState.query : searchQuery.trim()}</p>
                    </div>
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-panel hover:text-foreground"
                      onClick={closeSearchPanel}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {searchState.status === "loading" && (
                    <div className="flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在查找当前词库和系统总词典...
                    </div>
                  )}

                  {searchState.status === "local" && (
                    <div className="max-h-[520px] overflow-auto p-3">
                      <div className="mb-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        已在你的词库中找到 {searchState.matches.length} 个匹配
                      </div>
                      <div className="space-y-2">
                        {searchState.matches.map((word) => {
                          const deck = decks.find((item) => item.id === word.deckId);
                          return (
                            <div key={word.id} className="rounded-2xl border border-border/70 bg-panel/70 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-xl font-semibold">{word.term}</h3>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {[word.phonetic, word.partOfSpeech].filter(Boolean).join(" · ") || "暂无音标"}
                                  </p>
                                </div>
                                <Badge variant="muted">{formatStatus(word.status)}</Badge>
                              </div>
                              <p className="mt-3 text-sm leading-6">{word.meanings.join("；") || "暂无释义"}</p>
                              {word.example ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{word.example}</p> : null}
                              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span className="truncate">{deck?.name || "未知词库"}</span>
                                <Button variant="secondary" size="sm" className="h-8" onClick={() => navigate(`/library/${word.deckId}`)}>
                                  打开词库
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {searchState.status === "dictionary" && (
                    <div className="p-3">
                      <div className="rounded-2xl border border-border/70 bg-panel/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-2xl font-semibold">{searchState.entry.word}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {[searchState.entry.phonetic, searchState.entry.partOfSpeech].filter(Boolean).join(" · ") || "暂无音标"}
                            </p>
                          </div>
                          <Badge variant="secondary">系统词典</Badge>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6">{searchState.entry.meaning}</p>
                        {searchState.entry.example ? (
                          <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs leading-5 text-muted-foreground">
                            <p>{searchState.entry.example}</p>
                            {searchState.entry.exampleTranslation ? <p className="mt-1">{searchState.entry.exampleTranslation}</p> : null}
                          </div>
                        ) : null}
                        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <select
                            value={targetDeckId}
                            onChange={(event) => setTargetDeckId(event.target.value)}
                            className="h-10 rounded-xl border border-border bg-input px-3 text-sm outline-none"
                          >
                            {decks.map((deck) => (
                              <option key={deck.id} value={deck.id}>
                                {deck.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10"
                            onClick={() =>
                              playPronunciation({
                                term: searchState.entry.word,
                                pronunciationUk: "",
                                pronunciationUs: "",
                              }, "us").catch(() => undefined)
                            }
                          >
                            <Volume2 className="h-4 w-4" />
                            发音
                          </Button>
                          <Button
                            size="sm"
                            className="h-10"
                            disabled={adding || !targetDeckId}
                            onClick={() => void handleAddDictionaryEntry(searchState.entry)}
                          >
                            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            加入词库
                          </Button>
                        </div>
                        {addMessage ? <p className="mt-3 text-xs text-primary">{addMessage}</p> : null}
                      </div>
                    </div>
                  )}

                  {searchState.status === "empty" && (
                    <div className="px-4 py-5 text-sm text-muted-foreground">
                      没有在你的词库或系统总词典中找到 “{searchState.query}”。可以去添加页使用 AI 自动补全后保存。
                    </div>
                  )}

                  {searchState.status === "error" && (
                    <div className="px-4 py-5 text-sm text-destructive">{searchState.message}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              >
                <Settings2 className="h-4 w-4" />
                设置
              </button>

              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 sm:px-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-9 sm:w-9">
                  <User2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted">当前账号</p>
                  <p className="truncate text-sm font-medium">{session?.username || "未登录"}</p>
                </div>
                <Badge variant={syncBadge.variant} className="hidden sm:inline-flex">
                  {syncBadge.label}
                </Badge>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  title="退出登录"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              <div className="hidden h-10 min-w-[64px] items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-3 text-sm font-semibold text-primary sm:flex">
                72%
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
