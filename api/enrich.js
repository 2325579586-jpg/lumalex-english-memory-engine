const { enrichWord, detectKind } = require("./_lib/enrich");
const { handleOptions, readJsonBody, sendJson } = require("./_lib/http");
const { checkRateLimit } = require("./_lib/rate-limit");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);
  if (!checkRateLimit(req, res, { key: "enrich", max: 30, windowMs: 60_000 })) return;

  const payload = await readJsonBody(req, res, { maxBytes: 16 * 1024 });
  if (!payload) return;
  const text = String(payload.text || "").trim().replace(/\s+/g, " ");
  const kind = payload.kind === "phrase" || payload.kind === "word" ? payload.kind : detectKind(text);

  if (!text || text.length > 120) {
    return sendJson(res, 400, { error: "text must contain 1–120 characters", code: "INVALID_TEXT" }, req);
  }

  try {
    const enriched = await enrichWord(text, kind);
    return sendJson(res, 200, enriched, req);
  } catch (error) {
    console.warn("[enrich] provider request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return sendJson(res, 502, { error: "词条补全服务暂时不可用，请稍后重试。", code: "ENRICH_PROVIDER_FAILED" }, req);
  }
};
