const https = require("https");

const CONFIG = {
  appsScriptUrl: process.env.CTC_APPS_SCRIPT_URL || "",
  appsScriptSecret: process.env.CTC_APPS_SCRIPT_SECRET || "",
  timeoutMs: Number(process.env.CTC_APPS_SCRIPT_TIMEOUT_MS || 30000),
};

let lastGoodData = null;
let lastLoadedAt = 0;
const MEMORY_CACHE_MS = 5 * 60 * 1000;

function requestJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          if (redirects >= 5) return reject(new Error("Too many redirects"));
          return requestJson(new URL(response.headers.location, url).toString(), redirects + 1).then(resolve, reject);
        }
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (parsed.error) return reject(new Error(parsed.error));
          if (!Array.isArray(parsed.rows)) return reject(new Error("Reporting rows were not returned"));
          resolve(parsed);
        } catch (error) {
          reject(error instanceof SyntaxError
            ? new Error("Invalid JSON response from the reporting service")
            : error);
        }
      });
    });
    req.setTimeout(CONFIG.timeoutMs, () => req.destroy(new Error("Reporting service timed out")));
    req.on("error", reject);
  });
}

async function loadData(forceRefresh = false) {
  if (!CONFIG.appsScriptUrl || !CONFIG.appsScriptSecret) {
    throw new Error("Apps Script dashboard connection is not configured");
  }

  if (!forceRefresh && lastGoodData && Date.now() - lastLoadedAt < MEMORY_CACHE_MS) {
    return Object.assign({}, lastGoodData, { stale: false, warning: "" });
  }

  const url = new URL(CONFIG.appsScriptUrl);
  url.searchParams.set("key", CONFIG.appsScriptSecret);
  url.searchParams.set("format", "adsmanager");
  try {
    const payload = await requestJson(url.toString());
    lastGoodData = {
      rows: payload.rows || [],
      dataUpdatedAt: payload.dataUpdatedAt || payload.updatedAt || "",
    };
    lastLoadedAt = Date.now();
    return Object.assign({}, lastGoodData, { stale: false, warning: "" });
  } catch (error) {
    if (lastGoodData) {
      return Object.assign({}, lastGoodData, {
        stale: true,
        warning: `Live refresh failed: ${error.message}`,
      });
    }
    throw error;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const forceRefresh = Boolean(req.query && req.query.refresh);
    const payload = await loadData(forceRefresh);
    res.setHeader(
      "Cache-Control",
      forceRefresh ? "no-store" : "public, s-maxage=300, stale-while-revalidate=900"
    );
    return res.status(200).json({
      rows: payload.rows,
      dataUpdatedAt: payload.dataUpdatedAt,
      updatedAt: payload.dataUpdatedAt,
      stale: Boolean(payload.stale),
      warning: payload.warning || "",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Dashboard data could not be loaded.",
      detail: error.message,
    });
  }
};
