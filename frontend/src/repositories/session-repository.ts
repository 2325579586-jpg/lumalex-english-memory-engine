import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/services/auth-session";
import { scheduleCloudDataSync } from "@/services/cloud-sync-service";
import type { SessionRecord } from "@/types/domain";

export const sessionRepository = {
  async list() {
    const userId = requireCurrentUserId();
    const sessions = await db.sessions.orderBy("startedAt").reverse().toArray();
    return sessions.filter((session) => session.userId === userId);
  },
  async getById(id: string) {
    const userId = requireCurrentUserId();
    const session = await db.sessions.get(id);
    if (session?.userId !== userId) {
      return undefined;
    }
    return session;
  },
  async getLatestOpen(type?: SessionRecord["type"]) {
    const userId = requireCurrentUserId();
    const sessions = (await db.sessions.orderBy("startedAt").reverse().toArray()).filter(
      (session) => session.userId === userId,
    );
    return sessions.find((session) => !session.endedAt && (!type || session.type === type));
  },
  async put(session: SessionRecord) {
    await db.sessions.put(session);
    scheduleCloudDataSync();
  },
};
