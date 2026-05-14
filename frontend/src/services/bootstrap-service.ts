import { db } from "@/lib/db";
import { createDefaultSettings, seedDecks } from "@/mock/seeds";
import { deckRepository } from "@/repositories/deck-repository";
import { settingsRepository } from "@/repositories/settings-repository";
import { wordRepository } from "@/repositories/word-repository";
import { requireCurrentUserId } from "@/services/auth-session";
import { syncCurrentLocalAccountToBackend } from "@/services/auth-service";
import { scheduleCloudDataSync, syncCloudData } from "@/services/cloud-sync-service";
import { syncSystemLexicons } from "@/services/system-lexicon-sync";

const SYSTEM_BOOTSTRAP_VERSION = 2;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function ensureSystemDecks() {
  const versionKey = "system_bootstrap_version";
  const current = await db.meta.get(versionKey);
  if (!current || current.value !== SYSTEM_BOOTSTRAP_VERSION) {
    await db.decks.bulkPut(seedDecks);
    await db.meta.put({ key: versionKey, value: SYSTEM_BOOTSTRAP_VERSION });
  }
}

async function ensureUserSettings(userId: string) {
  const settings = await settingsRepository.get();
  if (!settings) {
    await settingsRepository.put(createDefaultSettings(userId));
  }
}

async function repairMissingSystemLexicons() {
  const userId = requireCurrentUserId();
  const wordsSynced = await db.meta.get(`system_lexicon_words_synced_at:${userId}`);
  if (!wordsSynced) {
    return;
  }

  const decks = await deckRepository.list();
  const criticalDecks = decks.filter(
    (deck) => deck.sourceType === "system" && ["system-cet4", "system-cet6"].includes(deck.id),
  );

  if (criticalDecks.length < 2) {
    await syncSystemLexicons(true).catch(() => undefined);
    return;
  }

  const counts = await Promise.all(
    criticalDecks.map(async (deck) => ({
      deckId: deck.id,
      remoteCountHint: deck.totalCount,
      localCount: (await wordRepository.listByDeck(deck.id)).length,
    })),
  );

  const needsRepair = counts.some((item) => item.remoteCountHint > 0 && item.localCount === 0);
  if (needsRepair) {
    await syncSystemLexicons(true).catch(() => undefined);
  }
}

export async function initLocalDb() {
  await syncCurrentLocalAccountToBackend().catch(() => undefined);
  const userId = requireCurrentUserId();
  await ensureSystemDecks();
  await ensureUserSettings(userId);
  await syncSystemLexicons(false, { includeWords: false }).catch(() => undefined);
  await Promise.race([syncCloudData().catch(() => undefined), wait(1800)]);

  scheduleCloudDataSync(100);
  window.setTimeout(() => {
    void syncSystemLexicons(false, { includeWords: true })
      .then(() => repairMissingSystemLexicons())
      .then(() => {
        window.dispatchEvent(new CustomEvent("lumalex:cloud-sync"));
      })
      .catch(() => undefined);
  }, 0);
}
