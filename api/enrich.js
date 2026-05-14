const { enrichWord, detectKind } = require("./_lib/enrich");
const { handleOptions, readJsonBody, sendJson } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const payload = await readJsonBody(req);
  const text = String(payload.text || "").trim();
  const kind = payload.kind === "phrase" || payload.kind === "word" ? payload.kind : detectKind(text);

  if (!text) {
    return sendJson(res, 400, { error: "text is required" });
  }

  try {
    const enriched = await enrichWord(text, kind);
    return sendJson(res, 200, enriched);
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Enrichment failed" });
  }
};
