import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { FullPageStatus } from "@/components/shared/full-page-status";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";

const AddWordsPage = lazy(() => import("@/pages/AddWordsPage").then((module) => ({ default: module.AddWordsPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const LearnPage = lazy(() => import("@/pages/LearnPage").then((module) => ({ default: module.LearnPage })));
const LibraryPage = lazy(() => import("@/pages/LibraryPage").then((module) => ({ default: module.LibraryPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const ReviewPage = lazy(() => import("@/pages/ReviewPage").then((module) => ({ default: module.ReviewPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const StatsPage = lazy(() => import("@/pages/StatsPage").then((module) => ({ default: module.StatsPage })));

export function AuthenticatedApp() {
  const { bootstrapStatus, bootstrapError } = useAppBootstrap();

  if (bootstrapStatus === "loading" || bootstrapStatus === "idle") {
    return (
      <FullPageStatus
        eyebrow="LumaLex"
        title="正在准备你的本地学习空间…"
        description="系统会加载账号设置、同步系统词库，并恢复你的学习记录和复习计划。"
      />
    );
  }

  if (bootstrapStatus === "error") {
    return (
      <FullPageStatus
        eyebrow="初始化失败"
        title="当前账号的数据空间暂时没有准备好"
        description={bootstrapError || "请刷新页面后重试。"}
        error
      />
    );
  }

  return (
    <AppShell>
      <Suspense fallback={<FullPageStatus eyebrow="LumaLex" title="正在加载页面…" compact />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/add" element={<AddWordsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/:deckId" element={<LibraryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
