const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = __dirname;
const files = ["server.js", path.join("api", "reporting-data.js")];
for (const file of files) {
  childProcess.execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "inherit" });
}

const html = fs.readFileSync(path.join(root, "ctc-ads-manager.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
if (!scripts.length) throw new Error("Dashboard script block is missing");
scripts.forEach((source) => new Function(source));

const appsScript = fs.readFileSync(path.join(root, "..", "Code.gs"), "utf8");
new Function(appsScript);

const dashboardScript = scripts.join("\n");
const dateInRangeSource = dashboardScript.match(/function dateInRange\([\s\S]*?\n}/)?.[0];
const dedupeSource = dashboardScript.match(/function dedupeLeadRowsForRange\([\s\S]*?\n}/)?.[0];
const summarizeSource = dashboardScript.match(/function summarize\([\s\S]*?\n}/)?.[0];
if (!dateInRangeSource || !dedupeSource || !summarizeSource) throw new Error("Dashboard summary functions are missing");
const runSummary = new Function("rows", "start", "end", `${dateInRangeSource}\n${dedupeSource}\n${summarizeSource}\nreturn summarize(dedupeLeadRowsForRange(rows,start,end),start,end);`);
const rangeStart = new Date(2026, 8, 13);
const rangeEnd = new Date(2026, 8, 19);
const summary = runSummary([
  { date: rangeEnd, leadKey: "lead-a", leadSequence: 11, spend: 0, clicks: 0, leads: 1, qualifiedLeads: 1 },
  { date: rangeStart, leadKey: "lead-a", leadSequence: 10, spend: 0, clicks: 0, leads: 1, qualifiedLeads: 0 },
  { date: rangeEnd, leadKey: "lead-b", leadSequence: 12, spend: 0, clicks: 0, leads: 1, qualifiedLeads: 1 },
  { date: rangeEnd, leadKey: "", leadSequence: 0, spend: 6, clicks: 3, leads: 0, qualifiedLeads: 0 }
], rangeStart, rangeEnd);
if (summary.leads !== 2 || summary.qualifiedLeads !== 1 || summary.spend !== 6) {
  throw new Error(`Selected-range deduplication failed: ${JSON.stringify(summary)}`);
}

if (!appsScript.includes("ctcCanonicalCampaign_") || !appsScript.includes("Lead Sequence") || !appsScript.includes("i.?m not sure")) {
  throw new Error("Apps Script bridge is missing attribution or deduplication fields");
}

const demo = JSON.parse(fs.readFileSync(path.join(root, "demo-data.json"), "utf8"));
if (!Array.isArray(demo.rows) || !demo.rows.length) throw new Error("Demo reporting rows are missing");

console.log(`Crossroads Ads Manager checks passed (${demo.rows.length} demo rows).`);
