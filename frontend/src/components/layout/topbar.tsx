import { LogOut, Search, Settings2, Sparkles, User2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCloudSyncStatus } from "@/hooks/use-cloud-sync-status";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

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

export function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, mode, setMode, toggleLanguage } = useUiStore();
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const syncState = useCloudSyncStatus();
  const syncBadge = getSyncBadge(syncState);

  const isStudyRoute = location.pathname === "/learn" || location.pathname === "/review";

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
              {isStudyRoute
                ? "先做判断，再展开答案，保持主动回忆。"
                : "今天的重点是先守住复习窗口，再推进一组新词。"}
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input placeholder="搜索单词、短语、标签、例句" className="rounded-lg border-border bg-panel pl-10" />
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
