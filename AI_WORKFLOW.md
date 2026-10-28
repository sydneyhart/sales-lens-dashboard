# AI-assisted development workflow

This final project builds on the working Sales Lens prototype created in the same project conversation. AI assisted requirements translation, implementation, synthetic-data generation, test design, debugging, and documentation. The prompts below are reusable instructions derived from the requirements and implementation; they are not claimed to be a verbatim transcript of every earlier message.

## Prompt 1 — define the product (R1–R10)

> Design a browser-private monthly sales review tool for a SaaS manager. Translate spreadsheet inputs into clear region, rep, and product comparisons. Write a PRD with testable acceptance criteria, data definitions, privacy boundaries, explicit first-release scope, and a demonstration workflow. Separate peer comparisons from quota attainment. Keep a functional baseline that does not require a language model.

**Output:** PRD.md and the release checklist. Scope chose CSV/TSV exports, a buildless browser app, a deterministic brief, optional local AI, and downloadable reports.

## Prompt 2 — create repeatable test data (R1–R5)

> Generate original fictional deal records for three months, four regions, eight reps, and three products. Include won, lost, and open deals, differing regional patterns, and one rep with fewer wins. Use unique IDs, zero-padded ISO dates, and two-decimal USD amounts. Supply a deterministic generator so fixture changes can be reviewed. Do not use real customer or employee data.

**Output:** data/generate.cjs, data/sample-sales.csv, data/sample.js, and examples/monthly-report.html.

## Prompt 3 — implement calculations before prose (R1–R6)

> Build a DOM-independent JavaScript module for strict CSV/TSV ingestion and sales analysis. Reject invalid imports as a whole. Represent money in integer cents. Calculate average deal size from total won value divided by won count, not average-of-averages. Apply the same filters to current and prior calendar months. Handle ties, missing prior data, zero baselines, zero wins, and empty scopes without NaN or Infinity. Generate a brief only from these calculated results.

**Output:** core.js and tests/core.test.cjs. The browser and tests share the same calculations rather than separate implementations.

## Prompt 4 — build the manager's interface (R3–R6, R9)

> Create a responsive dashboard with local file input, a synthetic-example button, four filters, three metric buttons, KPI cards, region/product charts, a rep table, attention signals, and a concise executive brief. Use textContent for user-provided labels. Make metric definitions and peer-comparison limits visible. Add clear import, empty, copy, and session-reset feedback. Keep data in memory without browser storage or telemetry.

**Output:** index.html, style.css, and app.js. Synthetic sample loading is explicit, keeping the initial private workspace empty.

## Prompt 5 — add optional local AI and sharing (R7–R9)

> Add a Python standard-library companion that binds only to loopback. Accept only the expected aggregate request, check installed Ollama model metadata, reject reported remote models and cloud names, and call only the fixed local chat endpoint. Send no raw deal rows or IDs. Keep deterministic analysis available when inference fails. Export standalone escaped HTML with aggregates, current filters, and separately labeled AI prose when available. Do not upload reports automatically.

**Output:** server.py, the AI/export handlers in app.js, exportHTML() in core.js, and tests/test_server.py. Live model inference was not available; contract and failure handling were tested with mocks and a real browser fallback check.

## Prompt 6 — test, debug, and refine (R1–R10)

> Test known totals and weighted averages independently of the UI. Exercise malformed CSV, duplicates, invalid dates/amounts, metric switching, date rollover, unavailable baselines, empty scopes, ties, safe exports, and local-origin protections. Then use the actual browser controls to upload the fixture, change metrics/filters, download a report, and clear the session. Record observed outcomes separately from untested assumptions.

**Observed refinements from the implementation session:**

| Issue identified | Refinement | Evidence |
|---|---|---|
| Generated August/September dates initially lacked zero padding | Emit YYYY-MM-DD dates in the fixture generator | Strict date validation and the 120-row fixture tests pass |
| Model remote metadata belongs to the model-list response | Inspect /api/tags before sending aggregates to /api/chat | Local-model and reported-remote rejection tests |
| Late imports or AI responses could restore stale results | Use import-version and AI-generation tickets, plus AbortController for AI requests | Code lifecycle checks; browser clear-data check verifies displayed values disappear |
| Clearing only the visible table left hidden KPI text | Clear KPI, scope, narrative, options, and table/chart content too | Browser DOM readback verified empty metric text and zero rep rows |
| Large ties and attention lists could overwhelm the brief | Abbreviate narrative names; keep complete results in the table/export | Tie tests and bounded narrative implementation |
| Sales goals are absent from the input | Label signals as observed peer-median comparisons, not quota judgments | Summary/table wording and metric tests |

**Results:** 26 automated tests passed. Real browser checks validated upload, switching, filters, empty states, report download/readback, unavailable-AI feedback, data clearing, and responsive layout. See TESTING.md for precise scope and limitations; the prompt itself is not evidence of a successful test.

## Prompt 7 — prepare the final submission (R10)

> Assemble the final-project repository around the completed prototype. Include the PRD, reusable AI-assisted prompts, code and generated sample, README with run/demo/share instructions, meaningful inline comments, a data-flow diagram, and test results. Distinguish implemented features, verified behavior, and limits. Recheck automated tests and publish the complete reviewable result to the existing repository.

**Output:** the final submission documents, inline code comments, and repository update. This stage packages and explains the working prototype; it does not claim a new model-quality evaluation or a verbatim historical prompt log.
