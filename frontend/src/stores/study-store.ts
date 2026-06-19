import { create } from "zustand";
import { deckRepository } from "@/repositories/deck-repository";
import {
  abandonLearnSession,
  getLearnSessionState,
  skipCurrentLearnWord,
  startLearnSession,
  submitLearnFeedback,
  toggleWordFocus,
  toggleWordStar,
  type ActiveLearnSession,
} from "@/services/study-service";
import { withUserScopedKey } from "@/services/auth-session";
import { readStorage, writeStorage } from "@/services/storage";
import type { Deck, LearnResult, WordItem } from "@/types/domain";

const SELECTED_LEXICON_KEY = "selected-learn-deck";
const TARGET_STEP = 10;
const MIN_DAILY_TARGET = 10;
const MAX_DAILY_TARGET = 100;

function normalizeDailyTarget(value: number) {
  const stepped = Math.round(value / TARGET_STEP) * TARGET_STEP;
  return Math.min(MAX_DAILY_TARGET, Math.max(MIN_DAILY_TARGET, stepped || 20));
}

type LearnSummary = {
  total: number;
  know: number;
  vague: number;
  dontKnow: number;
  wordIds: string[];
};

type StudyState = {
  decks: Deck[];
  selectedLexiconId: string;
  dailyTarget: number;
  loading: boolean;
  submitting: boolean;
  error?: string;
  activeSession: ActiveLearnSession | null;
  queue: WordItem[];
  currentIndex: number;
  completedSummary: LearnSummary | null;
  hydrate: () => Promise<void>;
  setSelectedLexiconId: (id: string) => void;
  setDailyTarget: (value: number) => void;
  startSession: () => Promise<void>;
  submitFeedback: (result: LearnResult) => Promise<void>;
  skipCurrent: () => Promise<void>;
  toggleStarCurrent: () => Promise<void>;
  toggleFocusCurrent: () => Promise<void>;
  abandonSession: () => Promise<void>;
  clearCompletedSummary: () => void;
};

export const useStudyStore = create<StudyState>((set, get) => ({
  decks: [],
  selectedLexiconId: readStorage<string>(withUserScopedKey(SELECTED_LEXICON_KEY), "all"),
  dailyTarget: 20,
  loading: false,
  submitting: false,
  error: undefined,
  activeSession: null,
  queue: [],
  currentIndex: 0,
  completedSummary: null,
  hydrate: async () => {
    if (get().submitting) return;
    const [decks, existing] = await Promise.all([deckRepository.list(), getLearnSessionState()]);
    const storedSelection = readStorage<string>(withUserScopedKey(SELECTED_LEXICON_KEY), "all");
    const currentSelection = get().selectedLexiconId || storedSelection;
    set({
      decks,
      selectedLexiconId: currentSelection || "all",
      activeSession: existing?.snapshot ?? null,
      queue: existing?.words ?? [],
      currentIndex: existing?.snapshot?.currentIndex ?? 0,
    });
  },
  setSelectedLexiconId: (id) => {
    writeStorage(withUserScopedKey(SELECTED_LEXICON_KEY), id);
    set({ selectedLexiconId: id });
  },
  setDailyTarget: (value) => set({ dailyTarget: normalizeDailyTarget(value) }),
  startSession: async () => {
    set({ loading: true, error: undefined, completedSummary: null });
    try {
      const state = get();
      const payload = await startLearnSession({
        deckId: state.selectedLexiconId === "all" ? undefined : state.selectedLexiconId,
        dailyTarget: state.dailyTarget,
      });
      if (!payload || !payload.words.length) {
        set({ loading: false, error: "当前没有可学习的新词。", activeSession: null, queue: [], currentIndex: 0 });
        return;
      }
      set({
        loading: false,
        activeSession: payload.snapshot,
        queue: payload.words,
        currentIndex: payload.snapshot.currentIndex,
        error: undefined,
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "开始学习失败",
      });
    }
  },
  submitFeedback: async (result) => {
    const state = get();
    if (!state.activeSession || state.submitting) return;
    set({ submitting: true, error: undefined });
    try {
      const feedbackResult = await submitLearnFeedback(result);
      if (feedbackResult.completed) {
        set({
          submitting: false,
          activeSession: null,
          currentIndex: 0,
          queue: [],
          completedSummary: feedbackResult.summary,
        });
        return;
      }
      const restored = await getLearnSessionState();
      set({
        submitting: false,
        activeSession: restored?.snapshot ?? null,
        queue: restored?.words ?? [],
        currentIndex: restored?.snapshot?.currentIndex ?? 0,
      });
    } catch (error) {
      set({
        submitting: false,
        error: error instanceof Error ? error.message : "提交学习反馈失败",
      });
      throw error;
    }
  },
  skipCurrent: async () => {
    await skipCurrentLearnWord();
    const restored = await getLearnSessionState();
    set({
      activeSession: restored?.snapshot ?? null,
      queue: restored?.words ?? [],
      currentIndex: restored?.snapshot?.currentIndex ?? 0,
    });
  },
  toggleStarCurrent: async () => {
    const state = get();
    const currentWord = state.queue[state.currentIndex];
    if (!currentWord) return;
    await toggleWordStar(currentWord.id);
    const restored = await getLearnSessionState();
    set({ queue: restored?.words ?? state.queue });
  },
  toggleFocusCurrent: async () => {
    const state = get();
    const currentWord = state.queue[state.currentIndex];
    if (!currentWord) return;
    await toggleWordFocus(currentWord.id);
    const restored = await getLearnSessionState();
    set({ queue: restored?.words ?? state.queue });
  },
  abandonSession: async () => {
    await abandonLearnSession();
    set({ activeSession: null, queue: [], currentIndex: 0, error: undefined });
  },
  clearCompletedSummary: () => set({ completedSummary: null }),
}));
