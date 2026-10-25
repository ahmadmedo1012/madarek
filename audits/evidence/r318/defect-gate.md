# R318 defect gate — 2026-10-25T01:56:38.586Z

Base `http://localhost:4180` · Viewports 360,390,768,1024,1440 · Themes light,dark · Skipped: ocr,perf

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 360 | light | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 62 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (4.00px) [rtl] span.wr.wr-scrub |
| 360 | light | contrast | FAIL | p=0: 8/155 · p=0.5: 8/155 · p=1: 8/155 | «موافق» 1.15:1 < 4.5:1 (12.8244) button.cb-accept |
| 360 | light | collisions | FAIL | 2 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 1941.8px² @(253,716) |
| 360 | light | placeholders | PASS | — | — |
| 360 | light | overflow | PASS | doc 360/360 · body 360/360 | — |
| 360 | light | ocr | NA | — | — |
| 360 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | light | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 64 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (4.33px) [rtl] span.wr.wr-scrub |
| 390 | light | contrast | FAIL | p=0: 8/158 · p=0.5: 8/155 · p=1: 8/155 | «موافق» 1.15:1 < 4.5:1 (13.8931) button.cb-accept |
| 390 | light | collisions | FAIL | 2 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | light | placeholders | PASS | — | — |
| 390 | light | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 768 | light | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 67 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (5.24px) [rtl] span.wr.wr-scrub |
| 768 | light | contrast | FAIL | p=0: 8/186 · p=0.5: 8/183 · p=1: 8/183 | «موافق» 1.15:1 < 4.5:1 (12.8921) button.cb-accept |
| 768 | light | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 768 | light | placeholders | PASS | — | — |
| 768 | light | overflow | PASS | doc 768/768 · body 768/768 | — |
| 768 | light | ocr | NA | — | — |
| 768 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1024 | light | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 65 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (6.40px) [rtl] span.wr.wr-scrub |
| 1024 | light | contrast | FAIL | p=0: 13/169 · p=0.5: 13/187 · p=1: 14/200 | «موافق» 1.15:1 < 4.5:1 (8.2963) button.cb-accept |
| 1024 | light | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-mono «01 · live · lectures» ✕ p.jt-station-title «المحاضرة التفاعلية» 1669.6px² @(765,2744) |
| 1024 | light | placeholders | PASS | — | — |
| 1024 | light | overflow | PASS | doc 1024/1024 · body 1024/1024 | — |
| 1024 | light | ocr | NA | — | — |
| 1024 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | light | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 65 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (9.00px) [rtl] span.wr.wr-scrub |
| 1440 | light | contrast | FAIL | p=0: 13/181 · p=0.5: 13/199 · p=1: 14/212 | «موافق» 1.15:1 < 4.5:1 (11.6667) button.cb-accept |
| 1440 | light | collisions | PASS | 0 overlaps · 0 edge · 1 allowlisted | — |
| 1440 | light | placeholders | FAIL | 1 matches | «--%» …ضيحي الحضور --% مساعد الفه… |
| 1440 | light | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | light | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | light | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 360 | dark | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 62 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (4.00px) [rtl] span.wr.wr-scrub |
| 360 | dark | contrast | FAIL | p=0: 7/155 · p=0.5: 7/155 · p=1: 7/155 | «موافق» 1.43:1 < 4.5:1 (12.8244) button.cb-accept |
| 360 | dark | collisions | FAIL | 2 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 1941.8px² @(253,716) |
| 360 | dark | placeholders | PASS | — | — |
| 360 | dark | overflow | PASS | doc 360/360 · body 360/360 | — |
| 360 | dark | ocr | NA | — | — |
| 360 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 390 | dark | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 64 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (4.33px) [rtl] span.wr.wr-scrub |
| 390 | dark | contrast | FAIL | p=0: 7/155 · p=0.5: 7/155 · p=1: 7/155 | «موافق» 1.43:1 < 4.5:1 (13.8931) button.cb-accept |
| 390 | dark | collisions | FAIL | 2 overlaps · 0 edge · 0 allowlisted | span.fo-hero-discover-label «اكتشف المزيد» ✕ p.cb-text «يستخدم هذا الموقع التخزين » 2360.9px² @(271,758) |
| 390 | dark | placeholders | PASS | — | — |
| 390 | dark | overflow | PASS | doc 390/390 · body 390/390 | — |
| 390 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 390 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 768 | dark | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 67 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (5.24px) [rtl] span.wr.wr-scrub |
| 768 | dark | contrast | FAIL | p=0: 7/183 · p=0.5: 7/183 · p=1: 7/183 | «موافق» 1.43:1 < 4.5:1 (12.8921) button.cb-accept |
| 768 | dark | collisions | PASS | 0 overlaps · 0 edge · 0 allowlisted | — |
| 768 | dark | placeholders | PASS | — | — |
| 768 | dark | overflow | PASS | doc 768/768 · body 768/768 | — |
| 768 | dark | ocr | NA | — | — |
| 768 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1024 | dark | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 65 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (6.40px) [rtl] span.wr.wr-scrub |
| 1024 | dark | contrast | FAIL | p=0: 12/169 · p=0.5: 12/187 · p=1: 13/200 | «موافق» 1.43:1 < 4.5:1 (8.2963) button.cb-accept |
| 1024 | dark | collisions | FAIL | 1 overlaps · 0 edge · 0 allowlisted | span.fo-mono «01 · live · lectures» ✕ p.jt-station-title «المحاضرة التفاعلية» 1669.6px² @(765,2746) |
| 1024 | dark | placeholders | PASS | — | — |
| 1024 | dark | overflow | PASS | doc 1024/1024 · body 1024/1024 | — |
| 1024 | dark | ocr | NA | — | — |
| 1024 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |
| 1440 | dark | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 65 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (9.00px) [rtl] span.wr.wr-scrub |
| 1440 | dark | contrast | FAIL | p=0: 12/181 · p=0.5: 12/199 · p=1: 13/212 | «موافق» 1.43:1 < 4.5:1 (11.6667) button.cb-accept |
| 1440 | dark | collisions | PASS | 0 overlaps · 0 edge · 1 allowlisted | — |
| 1440 | dark | placeholders | FAIL | 1 matches | «--%» …ضيحي الحضور --% مساعد الفه… |
| 1440 | dark | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | dark | ocr | BLOCKED | — | skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle) |
| 1440 | dark | perf | BLOCKED | — | skipped via --skip=perf — deep perf harness owned by C2 (cycle 2) |

## Blocked-with-reason

- skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)
- skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle)

**28 failing check(s) → exit 1** (a red gate blocks merges).
