import { BarChart3, BookOpen, BrainCircuit, FolderKanban, Home, Plus, RefreshCcw, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMinutes } from "@/lib/utils";

const groups = [
  {
    label: "核心学习",
    items: [
      { to: "/", icon: Home, label: "首页" },
      { to: "/learn", icon: BookOpen, label: "学习" },
      { to: "/review", icon: RefreshCcw, label: "复习" },
    ],
  },
  {
    label: "内容管理",
    items: [
      { to: "/add", icon: Plus, label: "添加" },
      { to: "/library", icon: FolderKanban, label: "词库" },
    ],
  },
  {
    label: "分析与设置",
    items: [
      { to: "/stats", icon: BarChart3, label: "统计" },
      { to: "/settings", icon: Settings2, label: "设置" },
    ],
  },
] as const;

const mobileItems = [
  { to: "/", icon: Home, label: "首页" },
  { to: "/learn", icon: BookOpen, label: "学习" },
  { to: "/review", icon: RefreshCcw, label: "复习" },
  { to: "/settings", icon: Settings2, label: "设置" },
  { to: "/add", icon: Plus, label: "添加" },
  { to: "/library", icon: FolderKanban, label: "词库" },
] as const;

export function Sidebar() {
  return (
    <>
      <aside className="hidden h-screen w-[252px] shrink-0 flex-col border-r border-border/80 bg-card/95 px-5 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">
            LL
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Memory System</p>
            <h1 className="text-lg font-semibold">LumaLex</h1>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted transition-all hover:bg-white/5 hover:text-foreground",
                        isActive && "bg-white/[0.04] text-foreground shadow-[inset_0_0_0_1px_rgba(94,106,210,0.22)]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "absolute left-0 top-2 h-8 w-[3px] rounded-full bg-transparent transition-all",
                            isActive && "bg-primary",
                          )}
                        />
                        <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Card className="mt-6 border-border/80 bg-panel/90 shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted">今日摘要</p>
                <p className="mt-1 text-sm font-medium">节奏稳定，比硬撑更重要。</p>
              </div>
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">新学</p>
                <strong className="mt-2 block text-xl">18</strong>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">复习</p>
                <strong className="mt-2 block text-xl">26</strong>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">时长</p>
                <strong className="mt-2 block text-base">{formatMinutes(42)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-card/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-medium text-muted transition-all",
                  isActive ? "bg-white text-slate-950" : "hover:bg-white/5 hover:text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
