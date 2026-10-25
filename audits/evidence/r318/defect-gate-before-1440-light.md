# R318 defect gate — 2026-10-25T01:56:01.197Z

Base `http://localhost:4180` · Viewports 1440 · Themes light · Skipped: none

| viewport | theme | check | result | count | worst sample |
|---|---|---|---|---|---|
| 1440 | light | word-integrity | FAIL | 13 aria-missing · 107 not-aria-hidden · 65 gaps<0.15em · 13 text≠aria | «منصّة واحدة» gap 0.00px < 0.15em (9.00px) [rtl] span.wr.wr-scrub |
| 1440 | light | contrast | FAIL | p=0: 13/181 · p=0.5: 13/199 · p=1: 14/212 | «موافق» 1.15:1 < 4.5:1 (11.6667) button.cb-accept |
| 1440 | light | collisions | PASS | 0 overlaps · 0 edge · 1 allowlisted | — |
| 1440 | light | placeholders | FAIL | 1 matches | «--%» …ضيحي الحضور --% مساعد الفه… |
| 1440 | light | overflow | PASS | doc 1440/1440 · body 1440/1440 | — |
| 1440 | light | ocr | FAIL | مدارك NOT read | ocr «‎ee re 6‏ لل»  |
| 1440 | light | perf | FAIL | 26.5% ≤20ms · 77 longtasks · CLS 0.2352 | ≥98% frames ≤20ms · 0 longtasks >50ms · CLS ≤0.05 |

## Blocked-with-reason

- (none)

**5 failing check(s) → exit 1** (a red gate blocks merges).
