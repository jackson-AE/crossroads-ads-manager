# Crossroads Treatment Centers — Ads Manager

Internal advertising-performance workspace based on the PeterMD Ads Manager.

## Data flow

1. `ALL LEADS` imports the client lead tracker.
2. The Apps Script in `../Code.gs` reads Facebook delivery from `fb_db` and raw submissions from `ALL LEADS`.
3. Campaign attribution uses the earliest submission's Funnel Name. Facebook UTM Medium and Content are matched against that funnel's canonical C1-C6 campaign to build Ad Set and Ad paths.
4. The Apps Script publishes only reporting-level fields and a one-way Lead Key plus source-row sequence.
5. The dashboard deduplicates the selected date range before Campaign → Ad Set → Ad grouping, keeping the earliest submission exactly like Google Sheets Remove duplicates.
6. `/api/reporting-data` calls the Apps Script using a server-side secret.
7. `ctc-ads-manager.html` aggregates the deduplicated rows into Campaign → Ad Set → Ad views.

No lead contact IDs, insurance answers, health answers, or other lead-level details are returned by the Apps Script bridge. A one-way `Lead Key` is returned only for selected-range deduplication. There is no dashboard password gate.

## Workbook

- [Crossroads Treatment Centers — Ad Performance Report](https://docs.google.com/spreadsheets/d/10zMbHqP_GI52n10dOCNQOvyWdR_net4yTZndBmHUtg8/edit)
- Delivery source: `fb_db`
- Lead source: `ALL LEADS`
- Spreadsheet ID: `10zMbHqP_GI52n10dOCNQOvyWdR_net4yTZndBmHUtg8`
- Reporting Data sheet ID: `1765170011`

## Apps Script setup

1. Open the Crossroads report and choose **Extensions → Apps Script**.
2. Replace the bound script with `../Code.gs` and save.
3. Replace `CTC_API_SECRET` with a random value at least 24 characters long.
4. Deploy the Apps Script as a Web App, executing as the workbook owner.
5. Save the `/exec` URL and the same secret in the dashboard environment.

The Apps Script secret protects the sheet bridge. It is not a user-facing dashboard password.

## Runtime configuration

Copy `.env.example` to `.env` locally or configure the same variables in the hosting environment:

- `CTC_APPS_SCRIPT_URL`
- `CTC_APPS_SCRIPT_SECRET`
- `CTC_APPS_SCRIPT_TIMEOUT_MS` (optional)

## Local preview

Run `npm run dev`, then open `http://127.0.0.1:8792/`.

Normal page loads use the same five-minute edge and memory cache as the Happy Healthy Lean Ads Manager. The refresh button bypasses that cache and requests the newest Apps Script snapshot.

Until the Apps Script environment values are supplied, the local dashboard uses safe reporting-level preview rows and labels them as preview data.

## Current metrics

- Spend
- Link Clicks
- Unique Leads
- CPL
- Qualified Leads
- CPQL
- Opt-in Rate
- Qualification Rate

Purchase, customer, revenue, CAC, and ROAS metrics are intentionally excluded until those data sources exist.
