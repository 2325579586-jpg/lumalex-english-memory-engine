const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_KEY_BYTES = 64;
const PASSWORD_SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const LEGACY_HASH_PATTERN = /^[a-f0-9]{64}$/i;

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function isValidUsername(username) {
  return username.length >= 3 && username.length <= 64 && /^\S+$/u.test(username) && !/[\u0000-\u001f\u007f]/u.test(username);
}

function isLegacyPasswordHash(value) {
  return LEGACY_HASH_PATTERN.test(String(value || ""));
}

function hashLegacyPassword(password) {
  return crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");
}

function safeEqualHex(left, right) {
  if (!isLegacyPasswordHash(left) || !isLegacyPasswordHash(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(String(password || ""), salt, PASSWORD_KEY_BYTES, PASSWORD_SCRYPT_OPTIONS);
  return `scrypt$${PASSWORD_SCRYPT_OPTIONS.N}$${PASSWORD_SCRYPT_OPTIONS.r}$${PASSWORD_SCRYPT_OPTIONS.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

async function verifyPassword(password, encodedHash) {
  const stored = String(encodedHash || "");
  if (isLegacyPasswordHash(stored)) {
    return safeEqualHex(hashLegacyPassword(password), stored);
  }

  const [algorithm, nRaw, rRaw, pRaw, saltRaw, hashRaw] = stored.split("$");
  if (algorithm !== "scrypt" || !nRaw || !rRaw || !pRaw || !saltRaw || !hashRaw) return false;
  const options = {
    N: Number(nRaw),
    r: Number(rRaw),
    p: Number(pRaw),
    maxmem: 32 * 1024 * 1024,
  };
  if (options.N !== PASSWORD_SCRYPT_OPTIONS.N || options.r !== PASSWORD_SCRYPT_OPTIONS.r || options.p !== PASSWORD_SCRYPT_OPTIONS.p) {
    return false;
  }
  try {
    const expected = Buffer.from(hashRaw, "base64url");
    const actual = await scryptAsync(String(password || ""), Buffer.from(saltRaw, "base64url"), expected.length, options);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

async function issueSession(sql, user) {
  const token = `v2.${crypto.randomBytes(32).toString("base64url")}`;
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await sql`
    INSERT INTO auth_sessions (user_id, token_hash, created_at, expires_at)
    VALUES (${user.id}, ${tokenHash}, NOW(), ${expiresAt})
  `;
  await sql`DELETE FROM auth_sessions WHERE expires_at <= NOW()`;
  await sql`
    DELETE FROM auth_sessions
    WHERE user_id = ${user.id}
      AND id NOT IN (
        SELECT id FROM auth_sessions
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 8
      )
  `;
  return {
    userId: user.id,
    username: user.username,
    syncToken: token,
    loggedInAt: Date.now(),
  };
}

async function verifySyncAuth(sql, userId, syncToken) {
  const token = String(syncToken || "");
  if (!token.startsWith("v2.") || token.length > 128) return false;
  const rows = await sql`
    SELECT id
    FROM auth_sessions
    WHERE user_id = ${userId}
      AND token_hash = ${hashSessionToken(token)}
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows.length > 0;
}

async function revokeSession(sql, userId, syncToken) {
  const token = String(syncToken || "");
  if (!token.startsWith("v2.")) return;
  await sql`
    DELETE FROM auth_sessions
    WHERE user_id = ${userId} AND token_hash = ${hashSessionToken(token)}
  `;
}

module.exports = {
  hashLegacyPassword,
  hashPassword,
  isLegacyPasswordHash,
  isValidUsername,
  issueSession,
  normalizeUsername,
  revokeSession,
  safeEqualHex,
  verifyPassword,
  verifySyncAuth,
};
