import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/services/auth-session";
import { recordCloudDeletion, scheduleCloudDataSync } from "@/services/cloud-sync-service";
import type { ReviewRecord } from "@/types/domain";

export const reviewRecordRepository = {
  async list() {
    const userId = requireCurrentUserId();
    const records = await db.reviewRecords.orderBy("createdAt").reverse().toArray();
    return records.filter((record) => record.userId === userId);
  },
  async listByWord(wordId: string) {
    const userId = requireCurrentUserId();
    const records = await db.reviewRecords.where("[userId+wordId]").equals([userId, wordId]).toArray();
    return records.sort((a, b) => b.createdAt - a.createdAt);
  },
  async put(record: ReviewRecord) {
    await db.reviewRecords.put(record);
    scheduleCloudDataSync();
  },
  async bulkPut(records: ReviewRecord[]) {
    await db.reviewRecords.bulkPut(records);
    scheduleCloudDataSync();
  },
  async deleteByWord(wordId: string) {
    const userId = requireCurrentUserId();
    const recordIds = await db.reviewRecords.where("[userId+wordId]").equals([userId, wordId]).primaryKeys();
    recordCloudDeletion("reviewRecords", recordIds as string[]);
    await db.reviewRecords.bulkDelete(recordIds);
    scheduleCloudDataSync();
  },
};
