import type { PropsWithChildren } from "react";
import { MobileSyncBar } from "@/components/layout/mobile-sync-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useUiStore } from "@/stores/ui-store";

export function AppShell({ children }: PropsWithChildren) {
  const mode = useUiStore((state) => state.mode);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-transparent text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        跳到主要内容
      </a>
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main-content" tabIndex={-1} className="app-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-28 focus:outline-none sm:px-5 sm:py-6 sm:pb-28 lg:px-8 lg:py-8 lg:pb-8">
          <div className={mode === "focus" ? "mx-auto max-w-[1120px]" : "mx-auto max-w-[1400px]"}>
            <MobileSyncBar />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
