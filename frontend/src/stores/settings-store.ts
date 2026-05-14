import { create } from "zustand";
import { createDefaultSettings } from "@/mock/seeds";
import { requireCurrentUserId } from "@/services/auth-session";
import { settingsRepository } from "@/repositories/settings-repository";
import type { UserSettings } from "@/types/domain";

type SettingsStoreState = {
  settings: UserSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  reset: (userId?: string) => void;
};

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: createDefaultSettings("guest"),
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    const userId = requireCurrentUserId();
    const persisted = await settingsRepository.get();
    const defaults = createDefaultSettings(userId);
    set({
      settings: persisted ? { ...defaults, ...persisted } : defaults,
      hydrated: true,
    });
  },
  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    await settingsRepository.put(next);
    set({ settings: next, hydrated: true });
  },
  reset: (userId = "guest") => {
    set({
      settings: createDefaultSettings(userId),
      hydrated: false,
    });
  },
}));
