const { sendJson } = require("./http");

const buckets = new Map();
const MAX_BUCKETS = 2_000;

function getClientAddress(req) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

function pruneExpiredBuckets(now) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    buckets.delete(buckets.keys().next().value);
  }
}

function checkRateLimit(req, res, options) {
  const now = Date.now();
  const windowMs = Math.max(1_000, Number(options.windowMs || 60_000));
  const max = Math.max(1, Number(options.max || 20));
  const key = `${options.key}:${getClientAddress(req)}`;
  pruneExpiredBuckets(now);

  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
  res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count <= max) return true;
  res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
  sendJson(res, 429, { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" }, req);
  return false;
}

module.exports = { checkRateLimit };
