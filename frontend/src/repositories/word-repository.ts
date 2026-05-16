import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/services/auth-session";
import { recordCloudDeletion, scheduleCloudDataSync } from "@/services/cloud-sync-service";
import type { LibraryFilters, WordItem, WordStatus } from "@/types/domain";

function applyQuery(items: WordItem[], filters: LibraryFilters) {
  return items.filter((item) => {
    if (filters.deckId && filters.deckId !== "all" && item.deckId !== filters.deckId) return false;
    if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.tag && !item.tags.includes(filters.tag)) return false;
    if (filters.isStarred && !item.isStarred) return false;
    if (filters.isFocused && !item.isFocused) return false;
    if (filters.query) {
      const query = filters.query.trim().toLowerCase();
      if (
        !item.term.toLowerCase().includes(query) &&
        !item.meanings.join(" ").toLowerCase().includes(query) &&
        !item.tags.join(" ").toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });
}

export const wordRepository = {
  async list(filters: LibraryFilters = {}) {
    const userId = requireCurrentUserId();
    const items = (await db.words.toArray()).filter((item) => item.userId === userId);
    return applyQuery(items, filters).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async listByDeck(deckId: string) {
    const userId = requireCurrentUserId();
    const items = await db.words.where("[userId+deckId]").equals([userId, deckId]).toArray();
    return items;
  },
  async listByStatus(statuses: WordStatus[]) {
    const userId = requireCurrentUserId();
    const items = (await db.words.toArray()).filter((item) => item.userId === userId);
    return items.filter((item) => statuses.includes(item.status));
  },
  async getById(id: string) {
    const userId = requireCurrentUserId();
    const item = await db.words.get(id);
    if (item?.userId !== userId) {
      return undefined;
    }
    return item;
  },
  async bulkUpsert(items: WordItem[]) {
    await db.words.bulkPut(items);
    scheduleCloudDataSync();
  },
  async put(item: WordItem) {
    await db.words.put(item);
    scheduleCloudDataSync();
  },
  async bulkUpdate(ids: string[], patch: Partial<WordItem>) {
    await Promise.all(ids.map((id) => db.words.update(id, { ...patch, updatedAt: Date.now() })));
    scheduleCloudDataSync();
  },
  async moveToDeck(ids: string[], deckId: string) {
    await Promise.all(ids.map((id) => db.words.update(id, { deckId, updatedAt: Date.now() })));
    scheduleCloudDataSync();
  },
  async delete(ids: string[]) {
    recordCloudDeletion("words", ids);
    await db.words.bulkDelete(ids);
    scheduleCloudDataSync();
  },
  async deleteByDeck(deckId: string) {
    const userId = requireCurrentUserId();
    const items = await db.words.where("[userId+deckId]").equals([userId, deckId]).primaryKeys();
    recordCloudDeletion("words", items as string[]);
    await db.words.bulkDelete(items);
    scheduleCloudDataSync();
  },
  async count() {
    const userId = requireCurrentUserId();
    const items = await db.words.toArray();
    return items.filter((item) => item.userId === userId).length;
  },
  async countByStatus(statuses: WordStatus[]) {
    const userId = requireCurrentUserId();
    const items = await db.words.toArray();
    return items.filter((item) => item.userId === userId && statuses.includes(item.status)).length;
  },
};
