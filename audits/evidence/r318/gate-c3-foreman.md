# R318 defect gate — 2026-10-25T07:15:29.989Z

Base `http://localhost:4173` · Viewports 360,390,768,1024,1440 · Themes light,dark · Skipped: ocr,perf

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
| 768 | light | word-integrity | PASS | — | — |
| 768 | light | contrast | PASS | p=0: 0/179 · p=0.5: 0/179 · p=1: 0/176 | — |
| 768 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 768 | light | placeholders | PASS | — | — |
| 768 | light | overflow | PASS | doc 768/768 · body 768/768 | — |
| 768 | light | ocr | NA | — | — |
| 768 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1024 | light | word-integrity | PASS | — | — |
| 1024 | light | contrast | PASS | p=0: 0/156 · p=0.5: 0/174 · p=1: 0/186 | — |
| 1024 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1024 | light | placeholders | PASS | — | — |
| 1024 | light | overflow | PASS | doc 1024/1024 · body 1024/1024 | — |
| 1024 | light | ocr | NA | — | — |
| 1024 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | light | word-integrity | PASS | — | — |
| 1440 | light | contrast | PASS | p=0: 0/166 · p=0.5: 0/184 · p=1: 0/196 | — |
| 1440 | light | collisions | PASS | 0 overlaps · 0 edge · 1 allowlisted | — |
| 1440 | light | placeholders | PASS | — | — |
| 1440 | light | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 360 | dark | word-integrity | PASS | — | — |
| 360 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
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
| 768 | dark | word-integrity | PASS | — | — |
| 768 | dark | contrast | PASS | p=0: 0/179 · p=0.5: 0/179 · p=1: 0/179 | — |
| 768 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 768 | dark | placeholders | PASS | — | — |
| 768 | dark | overflow | PASS | doc 768/768 · body 768/768 | — |
| 768 | dark | ocr | NA | — | — |
| 768 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1024 | dark | word-integrity | PASS | — | — |
| 1024 | dark | contrast | PASS | p=0: 0/156 · p=0.5: 0/174 · p=1: 0/186 | — |
| 1024 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1024 | dark | placeholders | PASS | — | — |
| 1024 | dark | overflow | PASS | doc 1024/1024 · body 1024/1024 | — |
| 1024 | dark | ocr | NA | — | — |
| 1024 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | dark | word-integrity | PASS | — | — |
| 1440 | dark | contrast | PASS | p=0: 0/166 · p=0.5: 0/184 · p=1: 0/196 | — |
| 1440 | dark | collisions | PASS | 0 overlaps · 0 edge · 1 allowlisted | — |
| 1440 | dark | placeholders | PASS | — | — |
| 1440 | dark | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |

## Blocked-with-reason

- skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)
- skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle)

**4 failing check(s) → exit 1** (a red gate blocks merges).
