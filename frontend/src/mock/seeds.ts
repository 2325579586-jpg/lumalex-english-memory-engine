import type { Deck, LearnRecord, ReviewRecord, SessionRecord, UserSettings, WordItem } from "@/types/domain";

const now = Date.now();

export function createDefaultSettings(userId: string): UserSettings {
  return {
    userId,
    dailyNewWordTarget: 20,
    dailyReviewTarget: 40,
    firstReviewDelayMinutes: 10,
    reviewIntervals: [1, 3, 7, 14, 30],
    autoPlayPronunciation: false,
    autoPlayExampleSentence: false,
    preferredAccent: "uk",
    uiMode: "full",
    showMemoryHint: true,
    showExampleByDefault: true,
    reviewModeWeights: {
      en_to_zh: 4,
      zh_to_en: 3,
      audio: 1,
      spelling: 1,
      cloze: 1,
    },
    language: "zh",
    theme: "dark",
  };
}

export const seedDecks: Deck[] = [
  {
    id: "system-graduate",
    name: "考研词汇",
    description: "考研阅读与写作高频词",
    sourceType: "system",
    totalCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "system-cet4",
    name: "四级词汇",
    description: "四级核心高频词",
    sourceType: "system",
    totalCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "system-cet6",
    name: "六级词汇",
    description: "六级高频词与短语",
    sourceType: "system",
    totalCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "system-ielts",
    name: "雅思词汇",
    description: "雅思场景词汇与短语",
    sourceType: "system",
    totalCount: 0,
    createdAt: now,
    updatedAt: now,
  },
];

export const seedWords: WordItem[] = [];
export const seedLearnRecords: LearnRecord[] = [];
export const seedReviewRecords: ReviewRecord[] = [];
export const seedSessions: SessionRecord[] = [];
