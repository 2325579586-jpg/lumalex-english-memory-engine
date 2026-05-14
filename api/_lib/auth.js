const crypto = require("node:crypto");

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");
}

function buildSession(user) {
  return {
    userId: user.id,
    username: user.username,
    loggedInAt: Date.now(),
  };
}

module.exports = {
  normalizeUsername,
  hashPassword,
  buildSession,
};
