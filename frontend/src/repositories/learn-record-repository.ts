import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/services/auth-session";
import { scheduleCloudDataSync } from "@/services/cloud-sync-service";
import type { LearnRecord } from "@/types/domain";

export const learnRecordRepository = {
  async list() {
    const userId = requireCurrentUserId();
    const records = await db.learnRecords.orderBy("createdAt").reverse().toArray();
    return records.filter((record) => record.userId === userId);
  },
  async listByWord(wordId: string) {
    const userId = requireCurrentUserId();
    const records = await db.learnRecords.where("[userId+wordId]").equals([userId, wordId]).toArray();
    return records.sort((a, b) => b.createdAt - a.createdAt);
  },
  async put(record: LearnRecord) {
    await db.learnRecords.put(record);
    scheduleCloudDataSync();
  },
  async bulkPut(records: LearnRecord[]) {
    await db.learnRecords.bulkPut(records);
    scheduleCloudDataSync();
  },
  async deleteByWord(wordId: string) {
    const userId = requireCurrentUserId();
    const recordIds = await db.learnRecords.where("[userId+wordId]").equals([userId, wordId]).primaryKeys();
    await db.learnRecords.bulkDelete(recordIds);
    scheduleCloudDataSync();
  },
};
