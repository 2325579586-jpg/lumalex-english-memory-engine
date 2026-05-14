import { create } from "zustand";
import { initLocalDb } from "@/services/bootstrap-service";

type BootstrapStatus = "idle" | "loading" | "ready" | "error";

type AppStoreState = {
  bootstrapStatus: BootstrapStatus;
  bootstrapError?: string;
  bootstrap: () => Promise<void>;
  reset: () => void;
};

export const useAppStore = create<AppStoreState>((set, get) => ({
  bootstrapStatus: "idle",
  bootstrapError: undefined,
  bootstrap: async () => {
    if (get().bootstrapStatus === "loading" || get().bootstrapStatus === "ready") {
      return;
    }
    set({ bootstrapStatus: "loading", bootstrapError: undefined });
    try {
      await initLocalDb();
      set({ bootstrapStatus: "ready", bootstrapError: undefined });
    } catch (error) {
      set({
        bootstrapStatus: "error",
        bootstrapError: error instanceof Error ? error.message : "应用初始化失败。",
      });
    }
  },
  reset: () => {
    set({ bootstrapStatus: "idle", bootstrapError: undefined });
  },
}));
