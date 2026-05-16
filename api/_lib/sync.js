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
  const raw = candidates.find((value) => typeof value === "number" && Number.isFinite(value));
  return raw ? new Date(raw) : new Date();
}

function getSyncItemId(collection, item) {
  if (collection === "deletions") return item.id || `${item.collection}:${item.itemId}`;
  if (collection === "settings") return item.userId || item.id || "settings";
  return item.id || item.wordId || item.deckId || item.term || `${collection}-${Math.random().toString(36).slice(2)}`;
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
