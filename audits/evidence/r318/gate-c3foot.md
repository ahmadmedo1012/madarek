# R318 defect gate — 2026-10-25T08:44:45.066Z

Base `http://localhost:4195` · Viewports 1440,390 · Themes light,dark · Skipped: perf

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 1440 | light | word-integrity | PASS | — | — |
| 1440 | light | contrast | PASS | p=0: 0/163 · p=0.5: 0/181 · p=1: 0/193 | — |
| 1440 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1440 | light | placeholders | PASS | — | — |
| 1440 | light | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | light | ocr | PASS | مدارك found | — |
| 1440 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | light | word-integrity | PASS | — | — |
| 390 | light | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/148 | — |
| 390 | light | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | light | placeholders | PASS | — | — |
| 390 | light | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | light | ocr | PASS | مدارك found | — |
| 390 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | dark | word-integrity | PASS | — | — |
| 1440 | dark | contrast | PASS | p=0: 0/163 · p=0.5: 0/181 · p=1: 0/193 | — |
| 1440 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1440 | dark | placeholders | PASS | — | — |
| 1440 | dark | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | dark | ocr | PASS | مدارك found | — |
| 1440 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | dark | word-integrity | PASS | — | — |
| 390 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 390 | dark | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | dark | placeholders | PASS | — | — |
| 390 | dark | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | dark | ocr | PASS | مدارك found | — |
| 390 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |

## Blocked-with-reason

- skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)

**2 failing check(s) → exit 1** (a red gate blocks merges).
