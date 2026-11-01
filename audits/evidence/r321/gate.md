# R321 composed gate — 2026-11-01T12:51:01.561Z

Runs gate:r320 as a child (which runs gate:r319) + the R321 rules: text-in-viewport (public sheets × phone widths, RECT-based) · duplicate-text (per-region normalised) · decor-innertext (marks/code) · rename-ledger (static repo scan).

| key | check | result | number | sample |
|---|---|---|---|---|
| child|r320-gate | r320-gate | FAIL | 1 | [mock-transport] no fixture for GET /api/v1/owner/activity?page=1&limit=8 — answering 501 ⏎ [gate:r320] 69 FAIL · 0 WARN |
| static|rename-ledger | rename-ledger | PASS | 0 | scanned 1246 files · 93 occurrences all covered |

**1 FAIL · 0 regression(s) → exit 0** (ratchet FAILs map to open tickets; only REGRESSIONS block)
