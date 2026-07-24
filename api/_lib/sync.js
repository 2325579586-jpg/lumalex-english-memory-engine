const SYNC_COLLECTIONS = ["decks", "words", "learnRecords", "reviewRecords", "sessions", "settings", "activeSessions", "deletions"];

function getPayloadTimestamp(item) {
  const candidates = [
    item.updatedAt,
    item.lastUpdatedAt,
    item.lastStudiedAt,
    item.lastReviewedAt,
    item.endedAt,
    item.createdAt,
    item.startedAt,
  ];
  const raw = candidates.find((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
  if (!raw) return new Date();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getSyncItemId(collection, item) {
  const raw =
    collection === "deletions"
      ? item.id || (item.collection && item.itemId ? `${item.collection}:${item.itemId}` : "")
      : collection === "settings"
        ? item.userId || item.id || "settings"
        : item.id || item.wordId || item.deckId || "";
  const itemId = String(raw || "").trim();
  return itemId && itemId.length <= 200 ? itemId : "";
}

function emptyCollections() {
  return Object.fromEntries(SYNC_COLLECTIONS.map((name) => [name, []]));
}

function isCloudRelevantWord(item) {
  if (!item || typeof item !== "object") return false;
  if (item.source !== "system") return true;

  return (
    item.status !== "unseen" ||
    Number(item.memoryStrength || 0) > 0 ||
    Number(item.correctCount || 0) > 0 ||
    Number(item.wrongCount || 0) > 0 ||
    Number(item.hesitateCount || 0) > 0 ||
    Number(item.learnCount || 0) > 0 ||
    Number(item.reviewCount || 0) > 0 ||
    Boolean(item.lastStudiedAt) ||
    Boolean(item.lastReviewedAt) ||
    Boolean(item.nextReviewAt) ||
    Boolean(item.isStarred) ||
    Boolean(item.isFocused) ||
    Boolean(item.isConfused) ||
    (Array.isArray(item.errorTags) && item.errorTags.length > 0)
  );
}

module.exports = {
  SYNC_COLLECTIONS,
  getPayloadTimestamp,
  getSyncItemId,
  emptyCollections,
  isCloudRelevantWord,
};
