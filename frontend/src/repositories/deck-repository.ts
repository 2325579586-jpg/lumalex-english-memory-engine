import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/services/auth-session";
import { scheduleCloudDataSync } from "@/services/cloud-sync-service";
import type { Deck } from "@/types/domain";

export const deckRepository = {
  async list() {
    const userId = requireCurrentUserId();
    const decks = await db.decks.orderBy("updatedAt").reverse().toArray();
    return decks.filter((deck) => deck.sourceType === "system" || deck.userId === userId);
  },
  async getById(id: string) {
    const userId = requireCurrentUserId();
    const deck = await db.decks.get(id);
    if (!deck) return undefined;
    if (deck.sourceType === "system" || deck.userId === userId) {
      return deck;
    }
    return undefined;
  },
  async bulkUpsert(decks: Deck[]) {
    await db.decks.bulkPut(decks);
    scheduleCloudDataSync();
  },
  async put(deck: Deck) {
    await db.decks.put(deck);
    scheduleCloudDataSync();
  },
  async createCustom(name: string, description = "") {
    const userId = requireCurrentUserId();
    const now = Date.now();
    const deck: Deck = {
      id: `custom-${crypto.randomUUID()}`,
      userId,
      name,
      description,
      sourceType: "custom",
      totalCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.decks.put(deck);
    scheduleCloudDataSync();
    return deck;
  },
  async rename(deckId: string, name: string, description?: string) {
    const deck = await this.getById(deckId);
    if (!deck || deck.sourceType !== "custom") {
      throw new Error("只能修改当前账号下的自定义词库。");
    }
    await db.decks.update(deckId, {
      name,
      ...(description !== undefined ? { description } : {}),
      updatedAt: Date.now(),
    });
    scheduleCloudDataSync();
  },
  async deleteCustom(deckId: string) {
    const deck = await this.getById(deckId);
    if (!deck || deck.sourceType !== "custom") {
      throw new Error("只能删除当前账号下的自定义词库。");
    }
    await db.decks.delete(deckId);
    scheduleCloudDataSync();
  },
  async updateCount(deckId: string, totalCount: number) {
    await db.decks.update(deckId, { totalCount, updatedAt: Date.now() });
    scheduleCloudDataSync();
  },
};
