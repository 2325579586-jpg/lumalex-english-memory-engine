import { create } from "zustand";
import {
  abandonReviewSession,
  getReviewSessionState,
  postponeReviewWord,
  startReviewSession,
  submitReviewFeedback,
  type ActiveReviewSession,
} from "@/services/review-service";
import type { ReviewMode, ReviewResult, WordItem } from "@/types/domain";

type ReviewSummary = {
  total: number;
  remembered: number;
  hesitant: number;
  forgot: number;
  wordIds: string[];
};

type ReviewStoreState = {
  loading: boolean;
  error?: string;
  mode: ReviewMode;
  revealed: boolean;
  queue: WordItem[];
  currentIndex: number;
  activeSession: ActiveReviewSession | null;
  completedSummary: ReviewSummary | null;
  hydrate: () => Promise<void>;
  setMode: (mode: ReviewMode) => void;
  reveal: () => void;
  hide: () => void;
  startSession: () => Promise<void>;
  submitFeedback: (result: ReviewResult) => Promise<void>;
  postpone: () => Promise<void>;
  abandonSession: () => Promise<void>;
  clearCompletedSummary: () => void;
};

export const useReviewStore = create<ReviewStoreState>((set, get) => ({
  loading: false,
  error: undefined,
  mode: "en_to_zh",
  revealed: false,
  queue: [],
  currentIndex: 0,
  activeSession: null,
  completedSummary: null,
  hydrate: async () => {
    const existing = await getReviewSessionState();
    set({
      activeSession: existing?.snapshot ?? null,
      queue: existing?.words ?? [],
      currentIndex: existing?.snapshot?.currentIndex ?? 0,
    });
  },
  setMode: (mode) => set({ mode }),
  reveal: () => set({ revealed: true }),
  hide: () => set({ revealed: false }),
  startSession: async () => {
    set({ loading: true, error: undefined, completedSummary: null, revealed: false });
    try {
      const payload = await startReviewSession(get().mode);
      if (!payload) {
        set({ loading: false, error: "当前没有到期需要复习的词。", activeSession: null, queue: [], currentIndex: 0 });
        return;
      }
      set({
        loading: false,
        activeSession: payload.snapshot,
        queue: payload.words,
        currentIndex: payload.snapshot.currentIndex,
      });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "开始复习失败" });
    }
  },
  submitFeedback: async (result) => {
    const payload = await submitReviewFeedback(result);
    if (payload.completed) {
      set({
        activeSession: null,
        queue: [],
        currentIndex: 0,
        completedSummary: payload.summary,
        revealed: false,
      });
      return;
    }
    const restored = await getReviewSessionState();
    set({
      activeSession: restored?.snapshot ?? null,
      queue: restored?.words ?? [],
      currentIndex: restored?.snapshot?.currentIndex ?? 0,
      revealed: false,
    });
  },
  postpone: async () => {
    await postponeReviewWord();
    const restored = await getReviewSessionState();
    set({
      activeSession: restored?.snapshot ?? null,
      queue: restored?.words ?? [],
      currentIndex: restored?.snapshot?.currentIndex ?? 0,
      revealed: false,
    });
  },
  abandonSession: async () => {
    await abandonReviewSession();
    set({ activeSession: null, queue: [], currentIndex: 0, revealed: false, error: undefined });
  },
  clearCompletedSummary: () => set({ completedSummary: null }),
}));
