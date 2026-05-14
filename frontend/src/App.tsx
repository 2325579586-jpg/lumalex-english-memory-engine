import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";
import { AddWordsPage } from "@/pages/AddWordsPage";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LearnPage } from "@/pages/LearnPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StatsPage } from "@/pages/StatsPage";
import { useAuthStore } from "@/stores/auth-store";

export default function App() {
  const { bootstrapStatus, bootstrapError } = useAppBootstrap();
  const authStatus = useAuthStore((state) => state.status);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  if (authStatus === "unknown") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-3 p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">LumaLex</p>
            <h1 className="text-2xl font-semibold">正在检查本地账号会话...</h1>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authStatus === "guest") {
    return <AuthPage />;
  }

  if (bootstrapStatus === "loading" || bootstrapStatus === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-3 p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">LumaLex MVP</p>
            <h1 className="text-2xl font-semibold">正在准备你的本地学习空间...</h1>
            <p className="text-sm text-muted-foreground">
              系统会按当前账号加载设置、同步系统词库，并恢复你自己的学习记录和复习计划。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bootstrapStatus === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-3 p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-destructive">初始化失败</p>
            <h1 className="text-2xl font-semibold">当前账号的数据空间暂时没有准备好</h1>
            <p className="text-sm text-muted-foreground">{bootstrapError || "请刷新页面后重试。"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/add" element={<AddWordsPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:deckId" element={<LibraryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
