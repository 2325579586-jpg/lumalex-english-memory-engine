const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const apiRoot = path.resolve(__dirname, "..", "api");

function listJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

for (const file of listJavaScriptFiles(apiRoot)) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`Checked ${listJavaScriptFiles(apiRoot).length} API JavaScript files.`);
