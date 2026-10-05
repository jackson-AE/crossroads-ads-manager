const http = require("http");
const fs = require("fs");
const path = require("path");

function loadEnvFile(envPath, allowedKeys = null) {
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index < 1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if ((!allowedKeys || allowedKeys.has(key)) && !process.env[key]) process.env[key] = value;
  });
}

loadEnvFile(
  path.join(__dirname, ".env"),
  new Set(["CTC_APPS_SCRIPT_URL", "CTC_APPS_SCRIPT_SECRET", "CTC_APPS_SCRIPT_TIMEOUT_MS"])
);

const reportingData = require("./api/reporting-data");
const port = Number(process.env.PORT || 8792);

function enhance(res) {
  res.status = function status(code) { res.statusCode = code; return res; };
  res.json = function json(value) {
    if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(value));
  };
  return res;
}

function sendFile(res, file, type) {
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, rawRes) => {
  const res = enhance(rawRes);
  const url = new URL(req.url, `http://${req.headers.host}`);
  req.query = Object.fromEntries(url.searchParams.entries());
  if (url.pathname === "/api/reporting-data") return reportingData(req, res);
  if (url.pathname === "/" || url.pathname === "/ads-manager" || url.pathname === "/ctc-ads-manager.html") {
    return sendFile(res, path.join(__dirname, "ctc-ads-manager.html"), "text/html; charset=utf-8");
  }
  if (url.pathname === "/agency-engineer-icon.png") {
    return sendFile(res, path.join(__dirname, "agency-engineer-icon.png"), "image/png");
  }
  res.status(404).json({ error: "Not found" });
}).listen(port, "127.0.0.1", () => {
  console.log(`Crossroads dashboard running at http://127.0.0.1:${port}/`);
});
