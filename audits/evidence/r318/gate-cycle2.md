# R318 defect gate — 2026-10-25T10:18:36.210Z

Base `http://localhost:4173` · Viewports 320,360,390,430,480,600,720,768,1024,1440 · Themes light,dark · Skipped: ocr,perf

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 320 | light | word-integrity | PASS | — | — |
| 320 | light | contrast | PASS | p=0: 0/146 · p=0.5: 0/146 · p=1: 0/143 | — |
| 320 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 320 | light | placeholders | PASS | — | — |
| 320 | light | overflow | PASS | doc 320/320 · body 320/320 | — |
| 320 | light | ocr | NA | — | — |
| 320 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 360 | light | word-integrity | PASS | — | — |
| 360 | light | contrast | PASS | p=0: 0/150 · p=0.5: 0/150 · p=1: 0/150 | — |
| 360 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 360 | light | placeholders | PASS | — | — |
| 360 | light | overflow | PASS | doc 360/360 · body 360/360 | — |
| 360 | light | ocr | NA | — | — |
| 360 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | light | word-integrity | PASS | — | — |
| 390 | light | contrast | PASS | p=0: 0/150 · p=0.5: 0/150 · p=1: 0/147 | — |
| 390 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 390 | light | placeholders | PASS | — | — |
| 390 | light | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 430 | light | word-integrity | PASS | — | — |
| 430 | light | contrast | PASS | p=0: 0/150 · p=0.5: 0/150 · p=1: 0/150 | — |
| 430 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 430 | light | placeholders | PASS | — | — |
| 430 | light | overflow | PASS | doc 430/430 · body 430/430 | — |
| 430 | light | ocr | NA | — | — |
| 430 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 480 | light | word-integrity | PASS | — | — |
| 480 | light | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 480 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 480 | light | placeholders | PASS | — | — |
| 480 | light | overflow | PASS | doc 480/480 · body 480/480 | — |
| 480 | light | ocr | NA | — | — |
| 480 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 600 | light | word-integrity | PASS | — | — |
| 600 | light | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/148 | — |
| 600 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 600 | light | placeholders | PASS | — | — |
| 600 | light | overflow | PASS | doc 600/600 · body 600/600 | — |
| 600 | light | ocr | NA | — | — |
| 600 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 720 | light | word-integrity | PASS | — | — |
| 720 | light | contrast | PASS | p=0: 0/151 · p=0.5: 0/148 · p=1: 0/148 | — |
| 720 | light | collisions | FAIL | 2 overlaps · 0 edge · 0 allowlisted | a.btn.accent.lg.fo-hero-cta «أنشئ حسابك الجامعي» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 247.7px² @(185,817) |
| 720 | light | placeholders | PASS | — | — |
| 720 | light | overflow | PASS | doc 720/720 · body 720/720 | — |
| 720 | light | ocr | NA | — | — |
| 720 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 768 | light | word-integrity | PASS | — | — |
| 768 | light | contrast | PASS | p=0: 0/179 · p=0.5: 0/179 · p=1: 0/179 | — |
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
| 320 | dark | word-integrity | PASS | — | — |
| 320 | dark | contrast | PASS | p=0: 0/146 · p=0.5: 0/146 · p=1: 0/146 | — |
| 320 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 320 | dark | placeholders | PASS | — | — |
| 320 | dark | overflow | PASS | doc 320/320 · body 320/320 | — |
| 320 | dark | ocr | NA | — | — |
| 320 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 360 | dark | word-integrity | PASS | — | — |
| 360 | dark | contrast | PASS | p=0: 0/150 · p=0.5: 0/150 · p=1: 0/150 | — |
| 360 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 360 | dark | placeholders | PASS | — | — |
| 360 | dark | overflow | PASS | doc 360/360 · body 360/360 | — |
| 360 | dark | ocr | NA | — | — |
| 360 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | dark | word-integrity | PASS | — | — |
| 390 | dark | contrast | PASS | p=0: 0/150 · p=0.5: 0/150 · p=1: 0/150 | — |
| 390 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 390 | dark | placeholders | PASS | — | — |
| 390 | dark | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 430 | dark | word-integrity | PASS | — | — |
| 430 | dark | contrast | PASS | p=0: 0/150 · p=0.5: 0/150 · p=1: 0/150 | — |
| 430 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 430 | dark | placeholders | PASS | — | — |
| 430 | dark | overflow | PASS | doc 430/430 · body 430/430 | — |
| 430 | dark | ocr | NA | — | — |
| 430 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 480 | dark | word-integrity | PASS | — | — |
| 480 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 480 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 480 | dark | placeholders | PASS | — | — |
| 480 | dark | overflow | PASS | doc 480/480 · body 480/480 | — |
| 480 | dark | ocr | NA | — | — |
| 480 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 600 | dark | word-integrity | PASS | — | — |
| 600 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 600 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 600 | dark | placeholders | PASS | — | — |
| 600 | dark | overflow | PASS | doc 600/600 · body 600/600 | — |
| 600 | dark | ocr | NA | — | — |
| 600 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 720 | dark | word-integrity | PASS | — | — |
| 720 | dark | contrast | PASS | p=0: 0/151 · p=0.5: 0/151 · p=1: 0/151 | — |
| 720 | dark | collisions | FAIL | 2 overlaps · 0 edge · 0 allowlisted | a.btn.accent.lg.fo-hero-cta «أنشئ حسابك الجامعي» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 247.7px² @(185,817) |
| 720 | dark | placeholders | PASS | — | — |
| 720 | dark | overflow | PASS | doc 720/720 · body 720/720 | — |
| 720 | dark | ocr | NA | — | — |
| 720 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
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

**2 failing check(s) → exit 1** (a red gate blocks merges).
