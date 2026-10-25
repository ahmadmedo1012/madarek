# R318 defect gate — 2026-10-25T07:50:55.145Z

Base `http://localhost:4194` · Viewports 768,1024,1440 · Themes light,dark · Skipped: ocr,perf

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 768 | light | word-integrity | PASS | — | — |
| 768 | light | contrast | PASS | p=0: 0/179 · p=0.5: 0/179 · p=1: 0/176 | — |
| 768 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 768 | light | placeholders | PASS | — | — |
| 768 | light | overflow | PASS | doc 768/768 · body 768/768 | — |
| 768 | light | ocr | NA | — | — |
| 768 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1024 | light | word-integrity | PASS | — | — |
| 1024 | light | contrast | PASS | p=0: 0/150 · p=0.5: 0/168 · p=1: 0/180 | — |
| 1024 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1024 | light | placeholders | PASS | — | — |
| 1024 | light | overflow | PASS | doc 1024/1024 · body 1024/1024 | — |
| 1024 | light | ocr | NA | — | — |
| 1024 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | light | word-integrity | PASS | — | — |
| 1440 | light | contrast | PASS | p=0: 0/163 · p=0.5: 0/181 · p=1: 0/193 | — |
| 1440 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1440 | light | placeholders | PASS | — | — |
| 1440 | light | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 768 | dark | word-integrity | PASS | — | — |
| 768 | dark | contrast | PASS | p=0: 0/179 · p=0.5: 0/179 · p=1: 0/179 | — |
| 768 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 768 | dark | placeholders | PASS | — | — |
| 768 | dark | overflow | PASS | doc 768/768 · body 768/768 | — |
| 768 | dark | ocr | NA | — | — |
| 768 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1024 | dark | word-integrity | PASS | — | — |
| 1024 | dark | contrast | PASS | p=0: 0/150 · p=0.5: 0/168 · p=1: 0/180 | — |
| 1024 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1024 | dark | placeholders | PASS | — | — |
| 1024 | dark | overflow | PASS | doc 1024/1024 · body 1024/1024 | — |
| 1024 | dark | ocr | NA | — | — |
| 1024 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | dark | word-integrity | PASS | — | — |
| 1440 | dark | contrast | PASS | p=0: 0/163 · p=0.5: 0/181 · p=1: 0/193 | — |
| 1440 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 1440 | dark | placeholders | PASS | — | — |
| 1440 | dark | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |

## Blocked-with-reason

- skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)
- skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle)

**0 failing check(s) → exit 0** (a red gate blocks merges).
