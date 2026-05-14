import { create } from "zustand";
import { readStorage, writeStorage } from "@/services/storage";

type Mode = "focus" | "full";
type Language = "zh" | "en";

type UiState = {
  mode: Mode;
  language: Language;
  setMode: (mode: Mode) => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const initialMode = readStorage<Mode>("ui-mode", "full");
const initialLanguage = readStorage<Language>("ui-language", "zh");

export const useUiStore = create<UiState>((set) => ({
  mode: initialMode,
  language: initialLanguage,
  setMode: (mode) => {
    writeStorage("ui-mode", mode);
    set({ mode });
  },
  setLanguage: (language) => {
    writeStorage("ui-language", language);
    set({ language });
  },
  toggleLanguage: () =>
    set((state) => {
      const language = state.language === "zh" ? "en" : "zh";
      writeStorage("ui-language", language);
      return { language };
    }),
}));
