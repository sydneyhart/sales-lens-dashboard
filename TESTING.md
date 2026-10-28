# Sales Lens — release verification

Tested October 28, 2026.

## Automated tests

**26 passed, 0 failed:** 20 JavaScript data tests plus six Python local-companion tests.

JavaScript covers synthetic-fixture dimensions and known totals, weighted averages, won/lost/open semantics, all metric orderings, filter consistency across months, missing-versus-zero baselines, January rollover, leap dates, quoted CSV/TSV/BOM/CRLF, malformed input, duplicate IDs/headers, invalid dates/statuses/amounts, size/row limits, empty states, zero wins, ties, median flags, escaped report content, discarded extra columns, and rejected metric names.

Python covers the aggregate-only model request contract, fixed loopback transport, cloud/reported-remote model rejection, empty/oversized response rejection, static route allowlist, successful HTTP response with simulated model output, and cross-origin/invalid-Host blocking.

## Real browser checks

- Sample loading: 120 valid deals, three months, four regions, eight reps, three products.
- Actual CSV file chooser/upload of `data/sample-sales.csv` succeeded; source-file contents were parsed in the browser.
- October: **$195,792.50**, **22 wins**, **$8,899.66 average**, **68.8% win rate**; comparison labels matched the expected previous-month values.
- Revenue, deals-won, and average-deal metric switching updated rankings and the executive brief. Tied leaders appeared for the deals-won metric.
- Europe filter: **10 matching rows, six wins, $65,835.00 won revenue, $10,972.50 average**. Selecting an incompatible rep produced a clean zero-result state across the brief, charts, and table.
- Downloaded a real standalone HTML report. Readback confirmed the expected revenue, no raw `DEAL-` IDs, no executable scripts, and complete HTML.
- Optional local AI displayed a clear unavailable-Ollama message while the standard brief and dashboard remained usable.
- Clear data removed rendered KPI/summary/scope values and rep rows, restored the upload empty state, and disabled export.
- Desktop checked at 1360 × 1000; mobile at 390 × 844. No horizontal page overflow in the mobile check; table content scrolls within its own wrapper.

## Limits

- No local model was installed, so **live AI inference and semantic output quality were not tested**. Model transport/validation were tested with mocks. The normal brief is deterministic and explicitly labeled data-derived.
- The optional local AI narrative is not fact-checked automatically; review it against the deterministic brief and tables.
- Native XLSX is not supported; CSV/TSV exports are the supported spreadsheet input.
- Browser checks used the available Chromium-based browser; physical touch devices, other browser engines, and assistive-technology sessions were not separately tested.
- Report download/readback was verified. PDF printing and a real team's private distribution system were not exercised.
- Invalid-input behavior is covered by automated tests; the real upload browser check used a valid sample file.
