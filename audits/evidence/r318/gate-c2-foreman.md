# R318 defect gate — 2026-10-25T06:07:43.138Z

Base `http://localhost:4173` · Viewports 1440,390 · Themes light,dark · Skipped: ocr,perf

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 1440 | light | word-integrity | PASS | — | — |
| 1440 | light | contrast | PASS | p=0: 0/166 · p=0.5: 0/184 · p=1: 0/196 | — |
| 1440 | light | collisions | PASS | 0 overlaps · 0 edge · 1 allowlisted | — |
| 1440 | light | placeholders | FAIL | 1 matches | «--%» …ضيحي الحضور --% مساعد الفه… |
| 1440 | light | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | light | word-integrity | PASS | — | — |
| 390 | light | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 390 | light | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | light | placeholders | PASS | — | — |
| 390 | light | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | dark | word-integrity | PASS | — | — |
| 1440 | dark | contrast | PASS | p=0: 0/166 · p=0.5: 0/184 · p=1: 0/196 | — |
| 1440 | dark | collisions | PASS | 0 overlaps · 0 edge · 1 allowlisted | — |
| 1440 | dark | placeholders | FAIL | 1 matches | «--%» …ضيحي الحضور --% مساعد الفه… |
| 1440 | dark | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | dark | word-integrity | PASS | — | — |
| 390 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 390 | dark | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | dark | placeholders | PASS | — | — |
| 390 | dark | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |

## Blocked-with-reason

- skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle)
- skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)

**4 failing check(s) → exit 1** (a red gate blocks merges).
