# R318 defect gate — 2026-10-25T01:58:23.022Z

Base `http://localhost:4180` · Viewports 390 · Themes light · Skipped: perf

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 390 | light | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 64 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (4.33px) [rtl] span.wr.wr-scrub |
| 390 | light | contrast | FAIL | p=0: 8/155 · p=0.5: 8/155 · p=1: 8/155 | «موافق» 1.15:1 < 4.5:1 (13.8931) button.cb-accept |
| 390 | light | collisions | FAIL | 2 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | light | placeholders | PASS | — | — |
| 390 | light | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | light | ocr | FAIL | مدارك NOT read | ocr «مداع»  |
| 390 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |

## Blocked-with-reason

- skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)

**4 failing check(s) → exit 1** (a red gate blocks merges).
