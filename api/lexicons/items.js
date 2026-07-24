const { getLexicon, getLexiconItems } = require("../_lib/system-lexicons");
const { handleOptions, sendJson, sendServerError } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" }, req);

  const lexiconId = String(req.query.lexiconId || "").trim();
  if (!lexiconId || lexiconId.length > 160) return sendJson(res, 400, { error: "lexiconId is invalid" }, req);
  try {
    const lexicon = await getLexicon(lexiconId);
    if (!lexicon) return sendJson(res, 404, { error: "Lexicon not found" }, req);
    return sendJson(res, 200, { lexicon, items: await getLexiconItems(lexiconId) }, req);
  } catch (error) {
    return sendServerError(req, res, error, "lexicons/items", "词库内容暂时不可用，请稍后重试。");
  }
};
