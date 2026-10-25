# R318 defect gate — 2026-10-25T04:47:39.836Z

Base `http://localhost:4190` · Viewports 360,390,1440 · Themes light,dark · Skipped: ocr,perf

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 360 | light | word-integrity | PASS | — | — |
| 360 | light | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 360 | light | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 1941.8px² @(253,716) |
| 360 | light | placeholders | PASS | — | — |
| 360 | light | overflow | PASS | doc 360/360 · body 360/360 | — |
| 360 | light | ocr | NA | — | — |
| 360 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | light | word-integrity | PASS | — | — |
| 390 | light | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 390 | light | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | light | placeholders | PASS | — | — |
| 390 | light | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | light | word-integrity | PASS | — | — |
| 1440 | light | contrast | PASS | p=0: 0/166 · p=0.5: 0/166 · p=1: 0/166 | — |
| 1440 | light | collisions | FAIL | 5 overlaps · 0 edge · 1 allowlisted | p.jt-statement «الرحلة مرسومة على مسطح واح» ✕ h3.jt-station-verb «شاهد» 14996px² @(1022,3399) |
| 1440 | light | placeholders | FAIL | 1 matches | «--%» …ضيحي الحضور --% مساعد الفه… |
| 1440 | light | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 360 | dark | word-integrity | PASS | — | — |
| 360 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/148 | — |
| 360 | dark | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 1941.8px² @(253,716) |
| 360 | dark | placeholders | PASS | — | — |
| 360 | dark | overflow | PASS | doc 360/360 · body 360/360 | — |
| 360 | dark | ocr | NA | — | — |
| 360 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | dark | word-integrity | PASS | — | — |
| 390 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 390 | dark | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | dark | placeholders | PASS | — | — |
| 390 | dark | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | dark | word-integrity | PASS | — | — |
| 1440 | dark | contrast | PASS | p=0: 0/166 · p=0.5: 0/166 · p=1: 0/166 | — |
| 1440 | dark | collisions | FAIL | 5 overlaps · 0 edge · 1 allowlisted | p.jt-statement «الرحلة مرسومة على مسطح واح» ✕ h3.jt-station-verb «شاهد» 14996px² @(1022,3401) |
| 1440 | dark | placeholders | FAIL | 1 matches | «--%» …ضيحي الحضور --% مساعد الفه… |
| 1440 | dark | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |

## Blocked-with-reason

- skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)
- skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle)

**8 failing check(s) → exit 1** (a red gate blocks merges).
