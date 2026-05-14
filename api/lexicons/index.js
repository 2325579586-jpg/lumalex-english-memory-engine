const { getLexicons } = require("../_lib/system-lexicons");
const { handleOptions, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  return sendJson(res, 200, { lexicons: await getLexicons() });
};
