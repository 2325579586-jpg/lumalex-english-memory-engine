const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hashLegacyPassword,
  hashPassword,
  isLegacyPasswordHash,
  isValidUsername,
  safeEqualHex,
  verifyPassword,
} = require("../api/_lib/auth");
const { getPayloadTimestamp, getSyncItemId } = require("../api/_lib/sync");

const INTEROP_SCRYPT_HASH =
  "scrypt$16384$8$1$AAECAwQFBgcICQoLDA0ODw$T0m-Cy0394VmkIth_qzB02eARQEqio8wxu0sjsG6xdM2rlPdruFxMkrYT3DS-88tyquTbcH8o7rKKGngBOeOWQ";

test("password hashing uses a unique salted scrypt hash", async () => {
  const first = await hashPassword("correct-horse-battery-staple");
  const second = await hashPassword("correct-horse-battery-staple");

  assert.match(first, /^scrypt\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct-horse-battery-staple", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
});

test("legacy password hashes remain verifiable only for account migration", async () => {
  const legacy = hashLegacyPassword("legacy-password");
  assert.equal(isLegacyPasswordHash(legacy), true);
  assert.equal(safeEqualHex(legacy, hashLegacyPassword("legacy-password")), true);
  assert.equal(safeEqualHex(legacy, hashLegacyPassword("wrong-password")), false);
  assert.equal(await verifyPassword("legacy-password", legacy), true);
});

test("Node verifies the password-hash format shared with Flask", async () => {
  assert.equal(await verifyPassword("interop-password", INTEROP_SCRYPT_HASH), true);
  assert.equal(await verifyPassword("wrong-password", INTEROP_SCRYPT_HASH), false);
});

test("usernames reject whitespace, control characters, and excessive length", () => {
  assert.equal(isValidUsername("student-01"), true);
  assert.equal(isValidUsername("ab"), false);
  assert.equal(isValidUsername("student name"), false);
  assert.equal(isValidUsername(`student${"x".repeat(64)}`), false);
});

test("sync items require a stable bounded identifier", () => {
  assert.equal(getSyncItemId("words", { id: "word-1" }), "word-1");
  assert.equal(getSyncItemId("words", { term: "unstable-fallback" }), "");
  assert.equal(getSyncItemId("deletions", { collection: "words", itemId: "word-1" }), "words:word-1");
  assert.equal(getSyncItemId("words", { id: "x".repeat(201) }), "");
});

test("invalid sync timestamps fall back to a valid current date", () => {
  const before = Date.now();
  const value = getPayloadTimestamp({ updatedAt: Number.NaN });
  assert.ok(value.getTime() >= before);
  assert.ok(value.getTime() <= Date.now());
});
