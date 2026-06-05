import type { PropsWithChildren } from "react";
import { MobileSyncBar } from "@/components/layout/mobile-sync-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useUiStore } from "@/stores/ui-store";

export function AppShell({ children }: PropsWithChildren) {
  const mode = useUiStore((state) => state.mode);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-transparent text-foreground">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="app-main flex-1 overflow-auto px-4 py-4 pb-28 sm:px-5 sm:py-6 sm:pb-28 lg:px-8 lg:py-8 lg:pb-8">
          <div className={mode === "focus" ? "mx-auto max-w-[1120px]" : "mx-auto max-w-[1400px]"}>
            <MobileSyncBar />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
