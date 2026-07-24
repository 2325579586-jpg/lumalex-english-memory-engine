const DEFAULT_MAX_BODY_BYTES = 256 * 1024;

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value || "");
}

function getAllowedOrigins(req) {
  const configured = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const host = getHeader(req, "x-forwarded-host") || getHeader(req, "host");
  const protocol = getHeader(req, "x-forwarded-proto") || "https";
  if (host) configured.push(`${protocol}://${host}`);
  return new Set(configured);
}

function applyCors(req, res) {
  const origin = getHeader(req, "origin");
  if (!origin) return true;
  if (!getAllowedOrigins(req).has(origin)) return false;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  return true;
}

function applySecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
}

function sendJson(res, status, payload, req) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  applySecurityHeaders(res);
  if (req) applyCors(req, res);
  res.end(status === 204 ? undefined : JSON.stringify(payload));
}

function parseJson(raw, req, res) {
  if (!raw.trim()) return {};
  try {
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      sendJson(res, 400, { error: "JSON body must be an object", code: "INVALID_JSON_BODY" }, req);
      return null;
    }
    return payload;
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body", code: "INVALID_JSON_BODY" }, req);
    return null;
  }
}

async function readJsonBody(req, res, options = {}) {
  const maxBytes = Number(options.maxBytes || DEFAULT_MAX_BODY_BYTES);
  const declaredLength = Number(getHeader(req, "content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    sendJson(res, 413, { error: "Request body is too large", code: "PAYLOAD_TOO_LARGE" }, req);
    return null;
  }

  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      if (req.body.length > maxBytes) {
        sendJson(res, 413, { error: "Request body is too large", code: "PAYLOAD_TOO_LARGE" }, req);
        return null;
      }
      return parseJson(req.body.toString("utf8"), req, res);
    }
    if (typeof req.body === "string") {
      if (Buffer.byteLength(req.body, "utf8") > maxBytes) {
        sendJson(res, 413, { error: "Request body is too large", code: "PAYLOAD_TOO_LARGE" }, req);
        return null;
      }
      return parseJson(req.body, req, res);
    }
    if (typeof req.body === "object" && !Array.isArray(req.body)) {
      if (Buffer.byteLength(JSON.stringify(req.body), "utf8") > maxBytes) {
        sendJson(res, 413, { error: "Request body is too large", code: "PAYLOAD_TOO_LARGE" }, req);
        return null;
      }
      return req.body;
    }
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      sendJson(res, 413, { error: "Request body is too large", code: "PAYLOAD_TOO_LARGE" }, req);
      return null;
    }
    chunks.push(buffer);
  }

  return parseJson(Buffer.concat(chunks).toString("utf8"), req, res);
}

function handleOptions(req, res) {
  if (req.method !== "OPTIONS") return false;
  if (!applyCors(req, res)) {
    sendJson(res, 403, { error: "Origin is not allowed", code: "CORS_ORIGIN_DENIED" }, req);
    return true;
  }
  sendJson(res, 204, {}, req);
  return true;
}

function sendServerError(req, res, error, context, fallback = "Request failed") {
  console.error(`[${context}]`, {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return sendJson(res, 500, { error: fallback, code: "INTERNAL_ERROR" }, req);
}

module.exports = {
  applyCors,
  handleOptions,
  readJsonBody,
  sendJson,
  sendServerError,
};
