import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/services/auth-session";
import { scheduleCloudDataSync } from "@/services/cloud-sync-service";
import type { UserSettings } from "@/types/domain";

export const settingsRepository = {
  async get() {
    const userId = requireCurrentUserId();
    const stored = await db.settings.get(userId);
    if (!stored) {
      return undefined;
    }
    const { id: _id, ...settings } = stored;
    return settings;
  },
  async put(settings: UserSettings) {
    const userId = requireCurrentUserId();
    await db.settings.put({ id: userId, ...settings, userId });
    scheduleCloudDataSync();
  },
};
