export type WordType = "word" | "phrase";

export type WordStatus =
  | "unseen"
  | "learning"
  | "learned_pending_review"
  | "due_review"
  | "reviewing"
  | "weak"
  | "mastered"
  | "suspended";

export type DeckSourceType = "system" | "custom" | "imported" | "ai_generated";
export type LearnResult = "know" | "vague" | "dontKnow";
export type ReviewResult = "remembered" | "hesitant" | "forgot";
export type SessionType = "learn" | "review";
export type ReviewMode = "en_to_zh" | "zh_to_en" | "audio" | "spelling" | "cloze";
export type ErrorTag =
  | "spelling_confusion"
  | "meaning_confusion"
  | "collocation_issue"
  | "pronunciation_issue";

export type DerivedWord = {
  term: string;
  pos: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";
  meaning?: string;
};

export type AppUser = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
};

export type AuthSession = {
  userId: string;
  username: string;
  syncToken?: string;
  loggedInAt: number;
};

export type WordItem = {
  id: string;
  userId: string;
  term: string;
  normalizedTerm: string;
  type: WordType;
  phonetic: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
  partOfSpeech: string;
  meanings: string[];
  example: string;
  exampleTranslation: string;
  memoryHint: string;
  roots: string[];
  derivedForms: DerivedWord[];
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  imageUrl?: string;
  tags: string[];
  source: DeckSourceType | "manual";
  deckId: string;
  difficultyLevel: number;
  status: WordStatus;
  memoryStrength: number;
  correctCount: number;
  wrongCount: number;
  hesitateCount: number;
  learnCount: number;
  reviewCount: number;
  lastStudiedAt?: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  createdAt: number;
  updatedAt: number;
  isStarred: boolean;
  isFocused: boolean;
  isConfused: boolean;
  errorTags: ErrorTag[];
};

export type Deck = {
  id: string;
  userId?: string;
  name: string;
  description: string;
  sourceType: DeckSourceType;
  totalCount: number;
  createdAt: number;
  updatedAt: number;
};

export type ReviewRecord = {
  id: string;
  userId: string;
  wordId: string;
  mode: ReviewMode;
  result: ReviewResult;
  responseTimeMs: number;
  createdAt: number;
};

export type LearnRecord = {
  id: string;
  userId: string;
  wordId: string;
  result: LearnResult;
  dwellTimeMs: number;
  createdAt: number;
};

export type SessionSummary = {
  total: number;
  know?: number;
  vague?: number;
  dontKnow?: number;
  remembered?: number;
  hesitant?: number;
  forgot?: number;
};

export type SessionRecord = {
  id: string;
  userId: string;
  type: SessionType;
  wordIds: string[];
  startedAt: number;
  updatedAt?: number;
  endedAt?: number;
  durationSec?: number;
  summary?: SessionSummary;
  progressIndex?: number;
  abandoned?: boolean;
};

export type UserSettings = {
  userId: string;
  dailyNewWordTarget: number;
  dailyReviewTarget: number;
  firstReviewDelayMinutes: number;
  reviewIntervals: number[];
  autoPlayPronunciation: boolean;
  autoPlayExampleSentence: boolean;
  preferredAccent: "uk" | "us";
  uiMode: "focus" | "full";
  showMemoryHint: boolean;
  showExampleByDefault: boolean;
  reviewModeWeights: Record<ReviewMode, number>;
  language: "zh" | "en";
  theme: "dark" | "light";
  updatedAt?: number;
};

export type LibraryFilters = {
  query?: string;
  deckId?: string;
  status?: WordStatus | "all";
  tag?: string;
  isStarred?: boolean;
  isFocused?: boolean;
};

export type DashboardSnapshot = {
  todayLearnAvailable: number;
  todayReviewDue: number;
  overdueCount: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  streakDays: number;
  recommendedAction: "learn" | "review";
  strategyCopy: string;
};
