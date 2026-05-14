const { getLexicon, getLexiconItems } = require("../_lib/system-lexicons");
const { handleOptions, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });

  const lexiconId = String(req.query.lexiconId || "").trim();
  const lexicon = await getLexicon(lexiconId);
  if (!lexicon) return sendJson(res, 404, { error: "Lexicon not found" });

  return sendJson(res, 200, { lexicon, items: await getLexiconItems(lexiconId) });
};
