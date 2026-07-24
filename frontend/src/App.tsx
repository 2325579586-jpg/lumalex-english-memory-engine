import { lazy, Suspense, useEffect } from "react";
import { FullPageStatus } from "@/components/shared/full-page-status";
import { useAuthStore } from "@/stores/auth-store";

const AuthPage = lazy(() => import("@/pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const AuthenticatedApp = lazy(() => import("@/authenticated-app").then((module) => ({ default: module.AuthenticatedApp })));

export default function App() {
  const authStatus = useAuthStore((state) => state.status);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  if (authStatus === "unknown") {
    return <FullPageStatus eyebrow="LumaLex" title="正在检查本地账号会话…" />;
  }

  if (authStatus === "guest") {
    return (
      <Suspense fallback={<FullPageStatus eyebrow="LumaLex" title="正在加载账号页面…" />}>
        <AuthPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<FullPageStatus eyebrow="LumaLex" title="正在加载学习空间…" />}>
      <AuthenticatedApp />
    </Suspense>
  );
}
