const { getLexicons } = require("../_lib/system-lexicons");
const { handleOptions, sendJson, sendServerError } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" }, req);
  try {
    return sendJson(res, 200, { lexicons: await getLexicons() }, req);
  } catch (error) {
    return sendServerError(req, res, error, "lexicons/index", "词库暂时不可用，请稍后重试。");
  }
};
