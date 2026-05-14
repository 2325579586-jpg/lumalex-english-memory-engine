import Dexie, { type Table } from "dexie";
import type { AppUser, Deck, LearnRecord, ReviewRecord, SessionRecord, UserSettings, WordItem } from "@/types/domain";

export type StoredSettings = UserSettings & { id: string };

export class LumaLexDb extends Dexie {
  users!: Table<AppUser, string>;
  words!: Table<WordItem, string>;
  decks!: Table<Deck, string>;
  learnRecords!: Table<LearnRecord, string>;
  reviewRecords!: Table<ReviewRecord, string>;
  sessions!: Table<SessionRecord, string>;
  settings!: Table<StoredSettings, string>;
  meta!: Table<{ key: string; value: string | number | boolean }, string>;

  constructor() {
    super("lumalex-mvp");
    this.version(2).stores({
      users: "id, &username, updatedAt",
      words: "id, userId, [userId+deckId], [userId+status], [userId+nextReviewAt], updatedAt, isStarred, isFocused, normalizedTerm",
      decks: "id, userId, sourceType, updatedAt",
      learnRecords: "id, userId, [userId+wordId], createdAt",
      reviewRecords: "id, userId, [userId+wordId], createdAt, result",
      sessions: "id, userId, [userId+type], startedAt, endedAt",
      settings: "id, userId, theme, language, uiMode",
      meta: "key",
    });
  }
}

export const db = new LumaLexDb();
