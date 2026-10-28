# Project Requirements Document — Sales Lens

**Project category:** Business/productivity app with an optional local AI workflow  
**Release:** Final-project prototype, version 1.0  
**Primary user:** SaaS sales manager preparing a monthly review

## Problem and objective

Deal spreadsheets contain the numbers but make it slow to compare regions, products, and reps during a meeting. Sales Lens turns one spreadsheet export into a consistent monthly view, a readable brief, and an aggregate report that a manager can share privately.

The first release must let a manager answer: Where is won deal value coming from? Who leads under different metrics? Which observed reps warrant a contextual check-in? What changed from the prior month?

## User stories

- As a manager, I want to upload my own deal export without sending the file to a cloud service.
- As a manager, I want to switch between revenue, deals won, and average won deal size so a single metric does not dominate the conversation.
- As a manager, I want region, rep, and product filters that apply consistently to current and prior months.
- As a manager, I want a short monthly brief and a downloadable report for authorized colleagues.
- As a manager, I want optional local AI wording assistance while retaining a deterministic reference for checking the facts.

## First-release requirements and acceptance criteria

| ID | Requirement | Acceptance criteria / evidence |
|---|---|---|
| R1 | Spreadsheet import | Accept CSV UTF-8 and TSV with the seven documented columns. Reject invalid rows, duplicate IDs, unsafe amounts, or malformed input without replacing the last valid dataset. Tests cover these cases; browser check covers valid CSV upload. |
| R2 | Consistent metrics | Sum won values in integer cents; count won rows; compute average as total/count and win rate as won/(won+lost). Open and lost amounts do not contribute to won revenue. Known-value and weighted-average tests pass. |
| R3 | Monthly filtering | Filter month, region, rep, and product. Compare with the previous calendar month using identical filters. Missing baselines and zero baselines have distinct messaging. Empty combinations show explicit empty states. |
| R4 | Performance comparisons | Switch rankings and peer signals among revenue, deals won, and average won deal. Show region/product bars and a complete rep table. Handle ties and undefined averages. Charts may limit displayed groups only if the UI explains the limit and exports retain every group. |
| R5 | Leaders and attention | Identify leading groups and reps with no wins or below the observed peer median. Ignore undefined values when computing that metric's median. Explain that peer flags are not quotas or personnel judgments. |
| R6 | Executive brief | Generate a concise data-derived monthly narrative from the same filtered calculations. Include totals, leaders, comparison availability, and contextual attention flags. Label it as deterministic rather than pretending it is LLM output. |
| R7 | Optional AI assistance | A user-triggered local companion sends aggregates only to a fixed loopback Ollama endpoint. Reject cloud names and models reported as remote. Clearly label returned prose for review; unavailable inference must not break ordinary analysis. Mocks verify the contract; live inference remains unverified. |
| R8 | Private report sharing | Download standalone HTML containing filters, the brief, and grouped aggregates, excluding raw rows and deal IDs. Escape labels and AI text. Support opening offline and browser print-to-PDF. Real download/readback verifies HTML; PDF printing is not separately verified. |
| R9 | Session privacy | Analyze files in browser memory, without persistent storage, telemetry, or automatic remote requests. Clearing removes active results and rendered values, cancels pending imports/AI, and revokes download URLs. The optional server accepts only expected routes and local origins. |
| R10 | Testability and documentation | Include original synthetic data, reproducible generation, runnable tests, CI, README, inline comments, architecture notes, and an AI-assisted prompt/refinement record. |

## Data contract

One unique deal per row; fields: deal_id, close_date, region, rep, product, status, amount. Dates are YYYY-MM-DD, statuses are won/lost/open, and amounts are nonnegative USD numbers with at most two decimals. Actual close dates apply to won/lost rows; expected close dates apply to open rows. Users must export XLSX/Google Sheets to CSV first. Extra fields are discarded.

Limits: 2 MB, 10,000 deals, 120 characters per required field, and integer-safe aggregate amounts. All deal values must use the same currency and meaning. Won deal value is not automatically ARR, MRR, or recognized accounting revenue.

## Workflow

1. Open index.html or launch the optional local Python server.
2. Upload a valid spreadsheet export or load the synthetic fixture.
3. Select month and scope; switch metrics and inspect leaders/attention signals.
4. Review the data-derived executive brief. Optionally generate and check a local AI draft.
5. Export an aggregate HTML report and distribute it through an approved private team channel.
6. Clear the session when finished.

## Architecture and scope decisions

Use buildless HTML/CSS/JavaScript for the dashboard and Python's standard library for the optional companion. Keep calculations independent from the DOM so the same implementation can be tested with Node. A language model may improve wording but must not calculate the dashboard's source-of-truth metrics.

Included: single-user local sessions, manual spreadsheet snapshots, three comparison metrics, four filters, monthly comparisons, peer signals, deterministic briefs, optional local AI, and aggregate downloads.

Excluded: direct CRM/database connections, authentication, automatic cloud sharing, native XLSX parsing, mixed-currency conversion, forecasting, quota management, persistent history, and production multi-user hosting.

## Validation targets and current evidence

The synthetic fixture has 120 deals across three months, four regions, eight reps, and three products. October reference results are $195,792.50 won revenue, 22 wins, $8,899.66 average won value, and 68.8% win rate. The first release passed 20 JavaScript and six Python tests plus the browser checks recorded in TESTING.md.

A successful review demonstration imports the fixture, changes all three metrics, filters Europe, shows a clean empty combination, exports a readable aggregate report, and clears the session. Desktop and narrow-screen checks support basic responsiveness; full cross-browser, accessibility, and physical-device certification are outside this prototype's verification.

## Risks and limits

Uploaded data quality determines insight quality. Peer comparisons require managerial context. Shared aggregates remain confidential. The user must trust the separately installed local model/runtime; no live model-quality claim is made. The complete observed verification and known limitations are maintained in TESTING.md.

## Submission map

- Requirements: this file.
- AI-assisted prompts and refinements: AI_WORKFLOW.md.
- Prototype: index.html, style.css, app.js, core.js, server.py.
- Dataset and example output: data/ and examples/.
- Instructions and technical explanation: README.md, ARCHITECTURE.md, and inline comments.
- Validation: tests/, TESTING.md, and .github/workflows/tests.yml.
