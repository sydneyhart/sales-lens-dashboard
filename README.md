# Sales Lens

A browser-private SaaS sales dashboard built with AI-assisted iterative coding. Upload a spreadsheet export, compare regions, reps, and products, review a plain-language executive brief, and download an aggregate report for the team.

## Start

Open `index.html` in a modern browser, or run the included local server with Python 3.10+:

```sh
python3 server.py
```

Open **http://127.0.0.1:8767**. Click **Try synthetic sample** for an immediate working example. No package installation or API key is required. For ordinary spreadsheet analysis, neither Python nor AI inference is required.

## What the dashboard does

- Summarizes won revenue, deals won, average won deal size, and win rate.
- Switches region/product rankings and rep performance signals between **revenue**, **deals won**, and **average deal size**.
- Filters by month, region, rep, and product. Prior-month comparisons retain the same filters.
- Highlights leaders, ties, reps with no wins, and reps below the observed peer median. These flags are not quota attainment or proof of individual underperformance.
- Generates a concise **data-derived executive brief** from deterministic calculations. It works offline and is explicitly distinguished from a language-model output.
- Optionally generates a **local AI draft** using Ollama, with aggregates only.
- Exports a standalone HTML report with the brief, filters, and all region/rep/product aggregates. Print the file to PDF if desired.
- Provides mobile layout, accessible filter labels, keyboard focus, feedback, empty states, validation errors, and Clear data.

An example shareable output is included at [examples/monthly-report.html](examples/monthly-report.html). Download and open it locally; it contains only the synthetic sample's aggregates.

## Spreadsheet format

Accepts **CSV UTF-8 or TSV**. Export Excel `.xlsx` or Google Sheets to CSV first; native XLSX parsing is not included.

| Required column | Meaning | Example |
|---|---|---|
| `deal_id` | Unique identifier; one row per deal | `D-001` |
| `close_date` | Actual close date for won/lost; expected close date for open | `2026-10-15` |
| `region` | Region label | `North America` |
| `rep` | Rep label | `Alex Morgan` |
| `product` | One product per deal | `Analytics Pro` |
| `status` | `won`, `lost`, or `open` (case-insensitive) | `won` |
| `amount` | Nonnegative USD deal value; no currency symbols/thousands separators; max 2 decimals | `12500.50` |

Column names are case-insensitive; leading/trailing field whitespace is trimmed. Quoted commas/newlines and escaped quotes are supported. Blank lines are ignored. Extra columns are discarded rather than retained. Duplicate IDs, missing columns, invalid dates/statuses/amounts, malformed CSV, and incomplete rows reject the whole import with a record-specific error. A rejected upload preserves the last valid dataset. Maximum: **2 MB, 10,000 deals, and 120 characters per required field**.

Do not mix currencies, upload monthly rollups as deal rows, repeat a deal per product, or interpret total contract values as monthly recurring revenue. Use one consistently defined USD deal value per unique deal.

## Metric definitions

| Metric | Definition |
|---|---|
| Won revenue | Sum of amount for `status=won` in the selected month/scope |
| Deals won | Count of won rows |
| Average won deal | Total won revenue / won deal count; not an average of group averages |
| Win rate | Won count / (won count + lost count); open deals excluded |
| Prior month | Previous calendar month with identical region/rep/product filters |
| Rep review flag | No won deals, or selected metric strictly below the median among reps observed in the scope |

Amounts are calculated in integer cents; display uses USD. Average values can contain fractional cents internally and are rounded for display. No won deals means average is unavailable, not zero. A missing prior-month sample is reported as missing; a present zero baseline is shown as “From $0.00,” avoiding infinite percentage growth. No targets or quotas are supplied, so peer signals require managerial context such as territory, role, tenure, and sample size.

Charts show the top eight groups when many exist; the report includes every group. The check-in card shows up to five flagged reps, with additional flags visible in the complete rep table. Briefs summarize long ties and review lists instead of listing every name.

## Local AI option

The standard brief is an automated, rule-based narrative. It is **not** an LLM summary. To generate an additional AI-written draft without cloud inference:

1. Install [Ollama](https://ollama.com/download) and download a local model, for example `ollama pull llama3.2:3b`.
2. Start Ollama locally (`ollama serve`, or use its desktop app).
3. Run `python3 server.py` and open http://127.0.0.1:8767.
4. Expand **Optional: polish with local AI**, enter the installed model name, and click **Generate local AI draft**.

The browser sends month, metric, calculated totals, grouped names/values, and the deterministic brief to the loopback companion. The companion checks installed model metadata through `/api/tags`, rejects cloud model names/reported remote models, and calls the fixed `127.0.0.1:11434/api/chat` endpoint. It never sends raw deal rows, deal IDs, or discarded extra columns. It cannot enforce the internal behavior of a separately configured proxy/runtime; use a trusted local Ollama installation and review its logging settings.

The integration follows the [Ollama chat API](https://docs.ollama.com/api/chat) and [official model metadata schema](https://github.com/ollama/ollama/blob/main/docs/openapi.yaml). AI drafts are labeled for review and included in exports only after successful generation. Their wording and claims are not automatically fact-verified. Filtering, replacing data, or clearing the session cancels and removes stale drafts. If Ollama is unavailable, the dashboard and data-derived brief continue working.

**Live inference was not tested on the development machine because no local Ollama model was installed.** The request contract, loopback restriction, cloud rejection, response checks, and unavailable-model behavior were tested with mocks and browser checks; see TESTING.md.

## Privacy and team sharing

- Uploaded files are read using the browser File API. They are never sent to a server for parsing or analysis.
- No analytics, external fonts/assets, database, cookies, browser storage, or background cloud requests. Nothing is automatically saved between sessions.
- Clear data drops active data/results, removes rendered metrics, cancels pending AI/import work, and revokes the report download URL. Reload also resets the session. This does not securely erase OS memory or files you have already downloaded/shared.
- Local AI is opt-in. It sends only aggregates to localhost, never a remote AI endpoint. Aggregates still include rep, region, and product labels.
- Export contains aggregates and grouped names, not raw records or deal IDs. It has no JavaScript or external resources and opens without the app. Share it using an **approved private team channel** or private shared drive; import/print it to PDF if your team prefers.
- Sharing the code repository shares only code and the **synthetic fixture**, not anyone's uploaded data. Never commit real spreadsheets or confidential reports to this public repository. Public hosting of the app shell is unnecessary for this release.
- This is a local tool, not an authenticated multi-user system. Confidentiality of a shared report depends on the channel and people you choose.

## Synthetic test dataset

`data/sample-sales.csv` contains **120 fictional deals**, spanning August–October 2026, four regions, eight reps, and three products. Names are fictional and no company/customer data was used. Includes won, lost, and open deals; varying regional growth; and a rep with one October win to exercise attention flags.

Regenerate the deterministic fixture and bundled sample loader with Node 18+:

```sh
npm run sample
```

October reference values: **$195,792.50 won revenue; 22 deals won; $8,899.66 average won deal; 68.8% win rate**. September won revenue is $201,960.00. North America leads October revenue at $82,335.00; Alex Morgan leads reps at $43,230.00; Support Hub leads products at $70,350.00.

## Architecture and testing

| File | Role |
|---|---|
| `core.js` | Strict CSV/TSV parsing, validation, cent-based calculations, filters, rankings, deterministic narrative, safe report HTML |
| `app.js` | File input, state, DOM charts/table, filters, metric controls, clipboard/download, and optional local AI requests |
| `index.html`, `style.css` | Responsive dashboard and privacy guidance; no remote assets |
| `server.py` | Optional loopback-only static/AI companion with route allowlist, size limits, Host/Origin guards, and no content logs |
| `data/generate.cjs` | Reproducible original synthetic dataset and embedded sample loader |
| `tests/` | 20 JavaScript data tests and six Python companion tests |
| `.github/workflows/tests.yml` | CI on Node 22 and Python 3.12 |

Run tests:

```sh
npm test
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

The browser uses `SalesCore` as a global; Node loads the same core via CommonJS. Flow: local file → validate → retain approved fields in memory → filter → calculate → rank → render. Optional flow: aggregate snapshot → loopback companion → local model → reviewable draft. Export serializes only aggregates and current report text.

The app was developed through natural-language requirements, AI-assisted implementation, synthetic-data generation, automated tests, and real browser checks. Full results and limits are in [TESTING.md](TESTING.md).
