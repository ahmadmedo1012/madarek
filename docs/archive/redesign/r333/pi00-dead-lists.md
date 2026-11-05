# R333 · PI-00 — fresh CSS coverage sweep + batch-A dead lists

Task PI-00 (global-sequential, blocks all P-I deletions). Base commit `8efb5a9a`. **Read-only round: no CSS, no gate script, no config touched.** Deliverables: `docs/redesign/r333/css-coverage.json` (fresh summary) + this file. r331's artifact (`docs/redesign/r331/css-coverage.json`) **left byte-identical** (md5 `b054e110…` verified post-run; the gate hardcodes its summary path there — the fresh summary below is a faithful rebuild from the full map + probe logs, verified against the gate's own final log line: 5,104 sel / 65 sheets / 1,494 matched / 3,610 dead / 28.2KB).

## 1. Sweep facts

| Item | Value |
|---|---|
| Command | `cd frontend && CSS_COVERAGE_FRESH=1 CSS_COVERAGE_FULL=/home/z/evidence-r333/pi00-coverage-full.json npm run gate:css-coverage` inside `bash scripts/r333/dev-once.sh --web-only -- …` (mock-API transport — backend not needed, `installMockApi` context-routes `**/api/**`) |
| Duration | 2 dev-once calls: run 1 = 31/66 route-marks in ~8.5 min (SETTLE 1500 ms), run 2 = remaining 35 marks in ~7 min (**resume from checkpoint**, SETTLE 800 ms). ~17.5 min sweep total |
| ⚠ Settle caveat | 31 marks probed at 1500 ms settle, 35 resumed marks at 800 ms (mission-approved fallback). Dead = union over all probes; the 800 ms marks could in principle under-render late content → marginally inflated dead counts there. Risk accepted; refreshable at 1500 uniformly if a deletion needs the extra confidence |
| Coverage set | 66 route-marks × 3 viewports (390/768/1440): guest 12 routes × {light,dark} · STUDENT 17 × 2 · TEACHER 3 × light · ADMIN 2 × light · QUALITY 1 × light · OWNER 2 × light = **198 page probes** |
| Probe errors | **0 failed viewports, 0 unrendered marks.** `/student/mooc` (light) hit a transient chromium renderer crash on run 1 (@390, @768) — the checkpoint re-probed it cleanly on run 2 (488/488/497 light, 503/503/512 dark). The old "vite ENOSPC on owner pages" gap did **not** reproduce: `/owner/dashboard`, `/owner/institutions` rendered at all 3 viewports |
| Totals | **5,104 unique selectors, 65 loaded sheets → 1,494 matched (29.3%), 3,610 dead (70.7%)** |
| Never-loaded sheets (11 of 74 css files) | `pdf.css · ai.css · player.css · legal.css* · landing.css stub · layers.css · fonts.css · shared/brand.css · shared/design.css · student/lecture-player.css` + the two parity-export sheets (`unified-parity.css`, `shared-design-system.css` — zero importers **by design**, ⛔ DO-NOT-DELETE, baseline §3.3). *legal.css actually shows zero here → baseline §3.2 D2 list stands for batch D |
| Gate artifact (known, pre-existing) | 8 dead "candidates" are selectors whose pseudo-stripped probe string is EMPTY (raw selector starts `::` — Chrome elides the universal `*`), so `querySelector('')` can never match: `::-webkit-scrollbar(-track/-thumb(/:hover))`, `::selection` (polish.css), `::before`/`::after` (base.css + polish.css), `::placeholder` (base.css). These rules style every element and are almost certainly ALIVE → in batch A they affect **polish.css only: 5 rules, lines 2880–2901 (~19 lines), tagged `GATE-ARTIFACT` — do not delete** (base.css's are out of batch-A scope; flag for PI-28) |

r331 → fresh delta: selectors 5,061 → 5,104 · sheets 46 → 65 (fresh sweep measured 19 more loaded sheets) · matched 1,537 → 1,494 · dead 3,524 → **3,610**. Bucket ranking (baseline §3.1) is unchanged; components.css is now the #1 dead pool (646 dead sels).

Artifacts: full per-selector map (sel · matched · routes · files) → `/home/z/evidence-r333/pi00-coverage-full.json` (kept out of tree per repo hygiene; checkpoint `pi00-coverage-full.ckpt.json` auto-deleted on clean finish). Analyzer: `/home/z/evidence-r333/pi00-analyze.mjs` + `pi00-dead-analysis.json`.

## 2. How to consume these lists (deletion agents, PI-01…PI-11)

- Unit of deletion = **whole rule**. A rule is DEAD only when **every** selector in its comma list matched zero elements on zero routes. Interaction pseudos (`:hover/:focus…`) die **only together with their base rule** — each dead range below already satisfies this (a `:hover` fragment is listed dead only when its base fragment is dead too; a rule with any alive fragment is NOT listed).
- **Line ranges are 1-based, inclusive, selector-line → closing-brace-line** (verified against source). Deleting exactly the listed ranges cannot free selectors that matched anywhere. Blank lines / comments BETWEEN dead rules are extra savable space not counted in the estimates.
- `partial` rules (some fragments alive) are **not** listed — trimming dead fragments from a live rule is optional polish, not part of these budgets.
- `GATE-ARTIFACT`-tagged ranges = probe-empty pseudo-only selectors (§1) — **keep, verify manually**.
- Contract guards (baseline §4): `colleges.css` `.comp-*` borrow contract (PI-06) · `teacher/heron.css` `.hr-scope` (PI-09) · `training.css` `.filter-pill/.back-link` exports (PI-10) — dead rules touching them are tagged `KEEP …` and excluded from the "excl. guarded" estimate. Guarded ≠ protected forever; the owning PI decides, the default is keep.
- File-path correction vs baseline §4: PI-10's file is **`src/styles/training.css`** (904 lines; there is no `student/training.css` on disk — baseline §1.1's path label was wrong, the line count 904 identifies the file).
- Dead-line estimates are **upper bounds on rule-span only** (r331's deadRatio×lines assumed whole dead sections; the fresh rule-level sum is the honest number: 10,134 incl. guarded vs baseline's ~14,962 raw for these 10 files).

## 3. Batch-A summary (PI-01…PI-11 queue)

| file | rules | DEAD rules | dead lines (est) | excl. guarded | partial | unknown | dead sels / sels-in-rules | summary deadSels |
|---|---|---|---|---|---|---|---|---|
| file | rules | DEAD rules | dead lines (est) | excl. guarded | partial | unknown | dead sels / sels-in-rules | summary deadSels |
|---|---|---|---|---|---|---|---|---|
| src/styles/owner.css | 185 | 170 | 961 | 961 | 3 | 0 | 173/198 | 156/165 |
| src/styles/teacher-quality.css | 407 | 394 | 1802 | 1802 | 2 | 0 | 412/432 | 385/397 |
| src/styles/shared/research-heron.css | 212 | 206 | 1045 | 1045 | 0 | 0 | 238/244 | 222/228 |
| src/styles/research.css | 122 | 119 | 601 | 601 | 0 | 0 | 121/124 | 104/107 |
| src/styles/student.css | 563 | 491 | 2719 | 2719 | 3 | 0 | 519/601 | 460/523 |
| src/styles/colleges.css | 156 | 134 | 805 | 482 | 3 | 0 | 155/180 | 150/168 |
| src/styles/shared/heron-admin-owner.css | 187 | 158 | 527 | 527 | 13 | 0 | 173/234 | 180/210 |
| src/styles/teacher/heron.css | 154 | 142 | 580 | 428 | 0 | 0 | 148/160 | 142/153 |
| src/styles/training.css | 108 | 101 | 623 | 589 | 0 | 0 | 110/117 | 96/101 |
| src/styles/polish.css | 273 | 120 | 471 | 452 | 21 | 0 | 182/455 | 191/332 |

## src/styles/owner.css — 170 dead rules, ~961 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
7-13, 15-29, 31-41, 44-47, 50-52, 55-68, 70-79, 84-87, 89-92, 94-99, 101-106, 117-123, 125-127, 129-140, 142-155, 157-159, 162-164, 168-170, 173-176, 178-181, 183-212, 214-216, 219-221, 223-231, 233-235, 237-241, 243-246, 256-263, 265-271, 273-282, 285-290, 292-296, 305-314, 316-318, 320-326, 329, 332-346, 349-352, 354-356, 358-377, 380-384, 387-390, 392-396, 398-400, 407-412, 414-418, 420-431, 436-438, 440-442, 461-467, 475-479, 480-495, 496-499, 501-503, 505-509, 510-517, 518-520, 521-524, 525-529, 543-552, 555-561, 563-565, 567-573, 575, 581-584, 586-595, 603, 605, 607-611, 613-622, 624-627, 630-634, 637-648, 714-716, 723-732, 735-737, 740-743, 749-752, 754-757, 759-761, 763-768, 770-775, 780-784, 786-791, 793-796, 804-808, 811-813, 817-837, 889-891, 893-896, 905-907, 909-912, 914-916, 922-924, 929-935, 941-946, 948-950, 960-962, 966-968, 975-979, 981-988, 995-998, 1012-1017, 1019-1024, 1026-1031, 1038-1041, 1056-1062, 1072-1075, 1077-1081, 1083-1087, 1089-1094, 1099-1108, 1110-1115, 1119-1133, 1136-1140, 1143-1145, 1147-1149, 1151-1153, 1156-1159, 1165-1168, 1184-1189, 1191-1197, 1217-1219, 1238-1242, 1244, 1246, 1249-1252, 1265-1271, 1277-1283, 1285, 1290-1295, 1300-1308, 1316-1318, 1335-1341, 1343-1346, 1348-1352, 1355-1361, 1370-1377, 1379-1384, 1386-1389, 1391-1396, 1399-1403, 1410-1414, 1416, 1423-1428, 1430-1436, 1438-1446, 1448, 1451-1456, 1458-1468, 1470-1473, 1475-1480, 1482-1486, 1488-1493, 1498-1506, 1512-1517, 1521-1523, 1535, 1536, 1537, 1547-1550, 1566-1568, 1571-1573, 1581-1583, 1620-1623, 1629-1632, 1636-1638, 1686-1693, 1694, 1700
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.owner-toggle-thumb` | 183–212 | 30 |  |
| 2 | `.owner-badge-counter` | 817–837 | 21 |  |
| 3 | `.owner-error-entry-head` | 358–377 | 20 |  |
| 4 | `.owner-empty-rollup-head` | 480–495 | 16 |  |
| 5 | `.owner-timeline::before` | 15–29 | 15 |  |
| 6 | `.owner-kv-row input` | 332–346 | 15 |  |
| 7 | `.owner-detail-toggle` | 1119–1133 | 15 |  |
| 8 | `.owner-event-icon` | 55–68 | 14 |  |
| 9 | `.owner-toggle-track::before` | 142–155 | 14 |  |
| 10 | `.owner-toggle-track` | 129–140 | 12 |  |
| 11 | `.owner-error-entry-stack` | 420–431 | 12 |  |
| 12 | `.owner-meta-preview` | 637–648 | 12 |  |
| 13 | `.owner-timeline-item` | 31–41 | 11 |  |
| 14 | `.owner-brand-notice` | 1458–1468 | 11 |  |
| 15 | `.owner-event-icon.green` | 70–79 | 10 |  |
| 16 | `.owner-confirm-actions` | 273–282 | 10 |  |
| 17 | `.owner-kv-row` | 305–314 | 10 |  |
| 18 | `.owner-chart-container` | 543–552 | 10 |  |
| 19 | `.owner-health-dot.green::after` | 586–595 | 10 |  |
| 20 | `.owner-health-value` | 613–622 | 10 |  |
| 21 | `.owner-alert-card` | 723–732 | 10 |  |
| 22 | `.owner-timeline-id` | 1099–1108 | 10 |  |
| 23 | `.owner-toggle-label` | 223–231 | 9 |  |
| 24 | `.owner-page-gap` | 1300–1308 | 9 |  |
| 25 | `.owner-share-fill` | 1438–1446 | 9 |  |
| 26 | `.owner-swatch-chip` | 1498–1506 | 9 |  |
| 27 | `.owner-confirm-title` | 256–263 | 8 |  |
| 28 | `.owner-empty-rollup-row` | 510–517 | 8 |  |
| 29 | `.owner-live-tick` | 981–988 | 8 |  |
| 30 | `.owner-inst-admins` | 1370–1377 | 8 |  |
| 31 | `.owner-detail-scope` | 1686–1693 | 8 |  |
| 32 | `.owner-timeline` | 7–13 | 7 |  |
| 33 | `.owner-toggle-row` | 117–123 | 7 |  |
| 34 | `.owner-confirm-message` | 265–271 | 7 |  |
| 35 | `.owner-kv-row code` | 320–326 | 7 |  |
| 36 | `.owner-row-actions` | 461–467 | 7 |  |
| 37 | `.owner-health-row` | 555–561 | 7 |  |
| 38 | `.owner-health-dot` | 567–573 | 7 |  |
| 39 | `.owner-live-tools` | 929–935 | 7 |  |
| 40 | `.owner-timeline-item` | 1056–1062 | 7 |  |

## src/styles/teacher-quality.css — 394 dead rules, ~1802 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
49-52, 54-62, 67-69, 71-74, 76-79, 84-87, 91-101, 103-109, 111-118, 120-123, 125-132, 134-138, 140-145, 148-151, 161-164, 173-175, 182-185, 186-189, 190-192, 207-211, 213, 221-226, 228, 229-232, 247-252, 254, 257-264, 267, 269-277, 278-282, 283, 285-293, 294, 297-304, 305-311, 312-316, 319, 324-336, 337-342, 343-346, 347-353, 358, 359-364, 365-368, 372, 373-376, 385, 386-389, 390-393, 394, 400-402, 405, 406-414, 415, 416-425, 426-432, 433-438, 439-446, 447-456, 457-460, 462, 463, 470, 471-476, 477-480, 481, 482, 483-488, 490-494, 497-502, 503-508, 514, 515-521, 522-526, 527-533, 539-541, 542-544, 545, 569, 575-580, 581-587, 589, 596, 597, 598, 599, 600, 601, 602, 603, 607, 608, 609, 610, 611, 617, 618-623, 624, 630-638, 639, 640-643, 644-647, 648-657, 658-662, 663-669, 670-674, 675, 676-680, 681, 688-689, 690-694, 695-696, 698, 699-704, 710-714, 715, 716, 717-721, 727-733, 734, 741, 742-750, 751, 752, 753, 754, 755-760, 761-769, 770-774, 775-779, 780-787, 788-792, 798, 799-809, 810, 812, 814-824, 825-831, 832, 833, 834, 837-842, 849-851, 865-871, 872-878, 879-885, 886-891, 892-898, 900, 907-913, 916-919, 920-923, 924, 926-935, 940, 943-951, 953, 956-963, 966-969, 970-978, 979-983, 984-989, 992, 996-1002, 1003-1010, 1011-1019, 1025-1030, 1031-1036, 1037-1045, 1046, 1047-1050, 1057-1059, 1063, 1066-1079, 1080-1086, 1087-1096, 1097-1105, 1106-1114, 1115, 1116, 1118-1127, 1128-1134, 1135-1142, 1143-1152, 1153-1158, 1159-1166, 1169-1178, 1179, 1183-1190, 1197, 1198-1204, 1205-1211, 1212-1224, 1225-1232, 1233-1240, 1243-1254, 1255, 1257-1262, 1263-1268, 1269-1274, 1276, 1281-1291, 1292-1298, 1299-1303, 1304-1308, 1318-1334, 1337, 1346-1348, 1388-1394, 1397, 1400-1403, 1480, 1485-1491, 1493, 1495-1499, 1501-1504, 1513-1528, 1530-1536, 1538-1546, 1551-1562, 1564-1574, 1578-1594, 1599-1603, 1607-1612, 1614-1631, 1634-1637, 1640-1644, 1647-1651, 1655-1659, 1665-1672, 1674-1679, 1681, 1683, 1684, 1689, 1690, 1691, 1696-1700, 1704-1711, 1713-1718, 1723-1736, 1739, 1741, 1746-1754, 1756-1772, 1774-1778, 1781-1784, 1786-1790, 1797-1801, 1805-1808, 1811-1814, 1817, 1822-1826, 1831-1835, 1837-1844, 1846, 1847, 1848, 1855-1862, 1864, 1866-1872, 1874, 1875, 1878-1889, 1895, 1896, 1897, 1906, 1911-1914, 1916-1919, 1921, 1925, 1927-1932, 1934-1938, 1943-1949, 1954-1961, 1963-1972, 1988-1994, 1996-1998, 2000, 2002-2008, 2010-2017, 2019-2023, 2025-2030, 2032-2036, 2038, 2040-2043, 2045, 2047-2052, 2054, 2056, 2058-2063, 2065-2069, 2077-2080, 2082-2089, 2091, 2092, 2094-2097, 2099-2104, 2106-2114, 2117-2123, 2125-2129, 2131, 2133-2138, 2142-2149, 2151-2158, 2160, 2162, 2170-2173, 2197-2202, 2203-2216, 2217-2220, 2221, 2222-2234, 2235-2239, 2245-2256, 2257-2261, 2262, 2263, 2264, 2270, 2271, 2272, 2273, 2274-2275, 2276-2277, 2279, 2282-2284, 2290, 2291, 2299, 2300, 2301-2304, 2305-2309, 2310, 2311, 2318-2322, 2323-2331, 2332-2336, 2337-2341, 2347-2353, 2362-2366, 2370-2374, 2375-2380, 2381-2384, 2387-2393, 2394-2398, 2399, 2402-2409, 2410, 2411-2417, 2418, 2419, 2420-2425, 2428-2435, 2436-2443, 2444, 2445, 2446, 2449, 2450, 2451, 2452-2459, 2460, 2461-2464, 2467-2472, 2473-2479, 2488, 2489, 2492, 2493, 2494, 2495, 2496-2503, 2504, 2505, 2506, 2509, 2510-2517, 2518, 2519-2525, 2526, 2527, 2531-2538, 2539-2542, 2543-2555, 2556, 2557-2563, 2564-2569, 2572-2578, 2579-2584, 2585, 2586, 2587-2590
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.oex-qmap-dot` | 1614–1631 | 18 |  |
| 2 | `.exa-pick-order` | 1318–1334 | 17 |  |
| 3 | `.oex-timer` | 1578–1594 | 17 |  |
| 4 | `.oex-choice-check` | 1756–1772 | 17 |  |
| 5 | `.oex-bar` | 1513–1528 | 16 |  |
| 6 | `.exa-bank-toggle` | 1066–1079 | 14 |  |
| 7 | `.oex-choice` | 1723–1736 | 14 |  |
| 8 | `.tq-search` | 2203–2216 | 14 |  |
| 9 | `.tpg-att-summary` | 324–336 | 13 |  |
| 10 | `.exa-detail-title` | 1212–1224 | 13 |  |
| 11 | `.tq-search .tq-search-input` | 2222–2234 | 13 |  |
| 12 | `.cur-lec-select` | 2543–2555 | 13 |  |
| 13 | `.exa-note` | 1243–1254 | 12 |  |
| 14 | `.oex-bar-progress` | 1551–1562 | 12 |  |
| 15 | `.oex-submit-bar` | 1878–1889 | 12 |  |
| 16 | `.tpg-sort` | 2245–2256 | 12 |  |
| 17 | `.tq-row-icon` | 91–101 | 11 |  |
| 18 | `.qlt-link-row` | 799–809 | 11 |  |
| 19 | `.qlt-link-row-icon` | 814–824 | 11 |  |
| 20 | `.exa-panel` | 1281–1291 | 11 |  |
| 21 | `.oex-save-warn` | 1564–1574 | 11 |  |
| 22 | `.tpg-mat-icon` | 416–425 | 10 |  |
| 23 | `.tpg-mat-meta` | 447–456 | 10 |  |
| 24 | `.qlt-alert-row.qlt-sev-info` | 648–657 | 10 |  |
| 25 | `.exa-row` | 926–935 | 10 |  |
| 26 | `.exa-bank-prompt` | 1087–1096 | 10 |  |
| 27 | `.exa-bank-panel` | 1118–1127 | 10 |  |
| 28 | `.exa-choice` | 1143–1152 | 10 |  |
| 29 | `.exa-immutable` | 1169–1178 | 10 |  |
| 30 | `.oex-grade-value` | 1963–1972 | 10 |  |
| 31 | `.tq-row` | 54–62 | 9 |  |
| 32 | `.tpg-day-head` | 269–277 | 9 |  |
| 33 | `.tpg-lecture` | 285–293 | 9 |  |
| 34 | `.tpg-mat-row` | 406–414 | 9 |  |
| 35 | `.qlt-alert-row` | 630–638 | 9 |  |
| 36 | `.qlt-course-row` | 742–750 | 9 |  |
| 37 | `.qlt-course-title` | 761–769 | 9 |  |
| 38 | `.exa-row-main` | 943–951 | 9 |  |
| 39 | `.exa-row-sub` | 970–978 | 9 |  |
| 40 | `.exa-check` | 1011–1019 | 9 |  |

## src/styles/shared/research-heron.css — 206 dead rules, ~1045 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
84-93, 95-102, 108-113, 114, 115-120, 121-129, 130-136, 145-150, 151-155, 160-162, 163, 164-166, 174-186, 187-193, 194, 195, 196, 197, 198, 199, 200, 206-213, 214-219, 225-230, 231-236, 237-242, 243, 249-253, 256-264, 265, 266-271, 274-278, 280-284, 286-294, 295-300, 302-312, 328, 329-336, 337-340, 347, 348, 349-353, 355, 357, 358-361, 367, 368-375, 376, 378-383, 388-391, 398-404, 407-409, 410, 411-418, 419-425, 426-427, 431-439, 440, 446-452, 453-459, 460-464, 465-469, 476-482, 483-488, 489, 491, 493-498, 499, 500-504, 559-562, 563-578, 579, 581, 583-586, 587-590, 591-597, 598-604, 605, 608-615, 616-620, 621, 630-633, 634-640, 641-648, 649-658, 661-664, 665-668, 669-672, 676-681, 682-685, 686-689, 690-694, 699-705, 706-712, 713-720, 721-724, 725-729, 730-736, 737-742, 746-754, 757-763, 764-770, 796-800, 801-803, 809-813, 814-818, 821-824, 827-831, 832-835, 836-839, 840-843, 845-849, 850-852, 855-858, 860-863, 864-867, 869-881, 882-889, 894-899, 900-902, 905-916, 917-920, 921-927, 928-943, 944, 947-962, 963-972, 974-990, 992, 994, 995-1008, 1010, 1013, 1018-1021, 1022-1025, 1026-1029, 1030-1033, 1034-1036, 1037-1042, 1043-1045, 1046-1048, 1049-1051, 1060, 1061-1065, 1066, 1076-1081, 1086, 1087-1088, 1112-1117, 1118-1124, 1127-1131, 1132-1138, 1141-1145, 1146-1148, 1149-1153, 1156-1159, 1160-1166, 1167-1169, 1172, 1173-1180, 1181-1187, 1189-1199, 1200-1204, 1205-1211, 1213, 1214, 1215-1220, 1221, 1222, 1225-1239, 1240-1246, 1247-1250, 1251-1258, 1259, 1262-1267, 1268-1272, 1273-1276, 1279-1282, 1283-1288, 1289-1293, 1294-1312, 1313, 1314-1323, 1324-1327, 1328-1331, 1332-1343, 1344-1347, 1349-1353, 1355, 1358-1363, 1364-1375, 1376-1379, 1381, 1383-1387, 1388-1393, 1396-1399, 1400-1403, 1404-1407, 1411, 1412, 1413, 1427-1430, 1438-1444, 1446-1451, 1453-1457, 1459-1463
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.r305rp .chat-input` | 1294–1312 | 19 |  |
| 2 | `.r305pdf-selbar-btn` | 974–990 | 17 |  |
| 3 | `.r305rp .r305rp-rev-row` | 563–578 | 16 |  |
| 4 | `.r305pdf-progress-fill` | 928–943 | 16 |  |
| 5 | `.r305pdf-selbar` | 947–962 | 16 |  |
| 6 | `.r305rp .chat-error` | 1225–1239 | 15 |  |
| 7 | `.r305pdf-selbar-dismiss` | 995–1008 | 14 |  |
| 8 | `.r305rp-chip` | 174–186 | 13 |  |
| 9 | `.r305pdf-hitcount` | 869–881 | 13 |  |
| 10 | `.r305pdf-progress` | 905–916 | 12 |  |
| 11 | `.r305rp .ai-quick-chip` | 1332–1343 | 12 |  |
| 12 | `.r305rp .ai-gap-card` | 1364–1375 | 12 |  |
| 13 | `.r305rp-empty` | 302–312 | 11 |  |
| 14 | `.r305rp .chat-bubble` | 1189–1199 | 11 |  |
| 15 | `.r305rp-eyebrow` | 84–93 | 10 |  |
| 16 | `.r305rp .r305rp-rev-masthead-title,   body:has(.r305rp) .r305rp-rev-masthead-title` | 649–658 | 10 |  |
| 17 | `.r305pdf-selbar-quote` | 963–972 | 10 |  |
| 18 | `.r305rp .chat-send` | 1314–1323 | 10 |  |
| 19 | `.r305rp-rule-labeled` | 121–129 | 9 |  |
| 20 | `.r305rp-meta-row` | 256–264 | 9 |  |
| 21 | `.r305rp-toolbar` | 286–294 | 9 |  |
| 22 | `.r305rp-res-flag` | 431–439 | 9 |  |
| 23 | `.r305rp .r305rp-rev-err-code,   body:has(.r305rp) .r305rp-rev-err-code` | 746–754 | 9 |  |
| 24 | `.r305rp-eyebrow-rule::before,   .r305rp-eyebrow::before` | 95–102 | 8 |  |
| 25 | `.r305rp-metric` | 206–213 | 8 |  |
| 26 | `.r305rp .pf-row-title` | 329–336 | 8 |  |
| 27 | `.r305rp .rs-loans` | 368–375 | 8 |  |
| 28 | `.r305rp-lib-metrics,   .r305rp-res-metrics` | 411–418 | 8 |  |
| 29 | `.r305rp .r305rp-rev-row-tail` | 608–615 | 8 |  |
| 30 | `.r305rp .r305rp-rev-masthead-main,   body:has(.r305rp) .r305rp-rev-masthead-main` | 641–648 | 8 |  |
| 31 | `.r305rp .r305rp-rev-decision-state,   body:has(.r305rp) .r305rp-rev-decision-state` | 713–720 | 8 |  |
| 32 | `.r305pdf-hitcount::before` | 882–889 | 8 |  |
| 33 | `.r305rp .r305ai-role` | 1173–1180 | 8 |  |
| 34 | `.r305rp .r305ai-err-code` | 1251–1258 | 8 |  |
| 35 | `.r305rp-rule-labeled::before,   .r305rp-rule-labeled::after` | 130–136 | 7 |  |
| 36 | `.r305rp-chip-dot` | 187–193 | 7 |  |
| 37 | `.r305rp-lib-band,   .r305rp-res-band` | 398–404 | 7 |  |
| 38 | `.r305rp-lib-metrics > div,   .r305rp-res-metrics > div` | 419–425 | 7 |  |
| 39 | `.r305rp-res-cta` | 446–452 | 7 |  |
| 40 | `.r305rp-res-cta-body` | 453–459 | 7 |  |

## src/styles/research.css — 119 dead rules, ~601 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
21-26, 27-34, 35, 36-42, 43-49, 50-58, 59-66, 67-73, 74-82, 83-90, 91-96, 100, 101, 112-118, 119-127, 128-138, 139, 140-141, 142, 144-155, 156-160, 161-165, 166-170, 171-179, 180-183, 184, 185, 189, 199, 203-207, 212-217, 218-225, 226-233, 234-240, 241, 242, 243, 244-253, 254-260, 261, 262, 263-270, 271-274, 275-283, 287-296, 301-307, 317-324, 329-333, 337, 341-346, 347-353, 354-367, 368, 370, 372-386, 388, 391, 396-402, 415-426, 427-437, 445, 446, 455-460, 461, 462-467, 469, 470, 476-487, 493-502, 503-509, 510-518, 519-525, 526, 527, 528-533, 539-542, 544, 546-550, 554, 555-561, 562-567, 568, 569-573, 578-582, 587-593, 594, 598, 600, 608-613, 614-619, 620-636, 637-644, 647-660, 662, 664, 665-668, 669-672, 673-679, 680, 681-686, 687, 690-696, 697, 701-708, 711-715, 717, 718, 719, 722, 728-734, 735-746, 747, 751-771, 772, 775, 776, 777, 781, 782-783
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.doc-notes-fab` | 751–771 | 21 |  |
| 2 | `.rs-review-work` | 620–636 | 17 |  |
| 3 | `.rs-search .rs-search-clear` | 372–386 | 15 |  |
| 4 | `.rs-search input` | 354–367 | 14 |  |
| 5 | `.rs-queue-item` | 647–660 | 14 |  |
| 6 | `.rs-pipe-dot` | 144–155 | 12 |  |
| 7 | `.rs-book-cover` | 415–426 | 12 |  |
| 8 | `.rs-filter-chip` | 476–487 | 12 |  |
| 9 | `.doc-reader-main` | 735–746 | 12 |  |
| 10 | `.rs-pipeline li::before` | 128–138 | 11 |  |
| 11 | `.rs-book-cover .lib-cover-mark` | 427–437 | 11 |  |
| 12 | `.rs-scan-meter` | 244–253 | 10 |  |
| 13 | `.rs-scan-sim-tag` | 287–296 | 10 |  |
| 14 | `.rs-loans` | 493–502 | 10 |  |
| 15 | `.rs-row-alert` | 50–58 | 9 |  |
| 16 | `.rs-row-grade` | 74–82 | 9 |  |
| 17 | `.rs-pipeline li` | 119–127 | 9 |  |
| 18 | `.rs-pipe-label` | 171–179 | 9 |  |
| 19 | `.rs-scan-sim` | 275–283 | 9 |  |
| 20 | `.rs-loan-due-track` | 510–518 | 9 |  |
| 21 | `.rs-row-meta` | 27–34 | 8 |  |
| 22 | `.rs-row-alert-title` | 59–66 | 8 |  |
| 23 | `.rs-row-grade-head` | 83–90 | 8 |  |
| 24 | `.rs-scan-cell` | 218–225 | 8 |  |
| 25 | `.rs-scan-head` | 226–233 | 8 |  |
| 26 | `.rs-scan-meter-tick` | 263–270 | 8 |  |
| 27 | `.rs-hit-row mark` | 317–324 | 8 |  |
| 28 | `.rs-review-work-title` | 637–644 | 8 |  |
| 29 | `.rs-work-notes` | 701–708 | 8 |  |
| 30 | `.rs-row-snippet` | 36–42 | 7 |  |
| 31 | `.rs-row-actions` | 43–49 | 7 |  |
| 32 | `.rs-row-published` | 67–73 | 7 |  |
| 33 | `.rs-pipeline` | 112–118 | 7 |  |
| 34 | `.rs-scan-value` | 234–240 | 7 |  |
| 35 | `.rs-scan-meter-fill` | 254–260 | 7 |  |
| 36 | `.rs-scan-cell.is-live .rs-scan-meter-fill` | 301–307 | 7 |  |
| 37 | `.rs-search-icon` | 347–353 | 7 |  |
| 38 | `.rs-book-tail` | 396–402 | 7 |  |
| 39 | `.rs-loan-due` | 503–509 | 7 |  |
| 40 | `.rs-loan-due-fill` | 519–525 | 7 |  |

## src/styles/student.css — 491 dead rules, ~2719 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
20-25, 28, 35-40, 41-51, 53, 55-61, 62-65, 66-75, 76-81, 82-88, 93, 94-109, 110, 112, 114, 115-126, 127, 128, 129, 133-138, 142-152, 153-173, 176, 177-182, 183-194, 195-200, 201-205, 211-223, 224, 228-233, 238, 239-245, 246-253, 254-260, 261-277, 278, 279, 283-295, 296, 297-302, 303, 310-316, 319-321, 328, 329-348, 349, 351, 353, 354-364, 365-371, 372-377, 378-385, 388-395, 396-403, 406, 407-411, 412, 420, 421, 422, 425-430, 431-445, 446-453, 454-458, 459-478, 480-483, 485, 486, 489, 490, 492-510, 511-515, 516-520, 523-531, 532-536, 537-541, 542-546, 547, 548-551, 552, 553, 556-566, 567-570, 571-574, 575, 576, 577, 578-583, 584-592, 596, 600, 601, 623-628, 633, 634, 635, 672, 696-702, 738-743, 846-851, 852-859, 920-926, 927-931, 932, 933-945, 947, 950, 952-959, 960-963, 964, 965, 966-969, 970-977, 978-987, 988-995, 996, 1023, 1030-1035, 1036, 1042, 1048-1051, 1056-1065, 1071-1086, 1088-1091, 1093, 1094, 1095, 1099, 1100-1112, 1113-1117, 1118-1124, 1128-1139, 1140-1146, 1147, 1148, 1155-1169, 1170-1187, 1189-1192, 1194, 1203-1208, 1209, 1210, 1214, 1296, 1302, 1303, 1309, 1310-1315, 1316, 1320-1323, 1329-1334, 1335-1338, 1339-1344, 1345, 1346, 1356-1366, 1367-1370, 1371-1377, 1378-1384, 1386, 1387, 1388, 1396-1404, 1410-1413, 1414-1419, 1420-1433, 1434-1440, 1441-1445, 1446-1454, 1455-1459, 1463-1474, 1475-1480, 1481-1484, 1485-1493, 1494-1498, 1501-1511, 1512-1519, 1525-1530, 1532-1534, 1536-1540, 1542, 1552, 1553-1557, 1558, 1568-1577, 1578-1587, 1604-1608, 1610, 1617-1622, 1623-1631, 1632-1640, 1641-1645, 1649-1653, 1654-1656, 1666-1679, 1685-1688, 1690-1693, 1694-1702, 1703-1709, 1710-1716, 1717-1724, 1725-1729, 1736-1741, 1745, 1747-1751, 1773-1782, 1794-1799, 1800-1810, 1811-1816, 1817-1823, 1824-1827, 1828-1831, 1832-1838, 1870-1876, 1877, 1892-1900, 1901-1906, 1907-1912, 1913-1919, 1920-1925, 1926, 1927-1936, 1938, 1943-1951, 1952-1956, 1957-1963, 1964-1968, 1969-1974, 1977-1983, 1989-1996, 1997-2004, 2013-2019, 2020-2028, 2046-2050, 2056-2064, 2065-2073, 2074-2082, 2084-2087, 2090-2101, 2103-2105, 2107-2111, 2112-2128, 2129, 2130, 2134-2138, 2150-2157, 2161-2169, 2170-2176, 2177-2186, 2187-2197, 2198-2204, 2211-2222, 2225-2236, 2238-2240, 2242-2247, 2248-2253, 2254-2262, 2263-2271, 2272, 2278-2285, 2286-2294, 2302-2314, 2315-2322, 2330-2342, 2343-2348, 2351, 2357-2362, 2363-2368, 2369-2380, 2381-2391, 2400-2408, 2411-2422, 2423-2430, 2431, 2432, 2433, 2434, 2435, 2436-2441, 2442-2450, 2454-2459, 2462, 2464, 2466-2469, 2470-2478, 2490-2497, 2498-2503, 2506-2515, 2516-2518, 2519-2536, 2537-2541, 2544-2548, 2549-2556, 2557, 2558, 2559-2567, 2572-2577, 2582, 2583, 2584-2586, 2587, 2588, 2669-2675, 2677-2682, 2704-2712, 2714-2718, 2721-2733, 2734, 2738-2747, 2748-2755, 2756-2763, 2764-2768, 2772-2777, 2778-2782, 2783-2796, 2797-2800, 2801-2807, 2808-2812, 2813-2817, 2818-2822, 2823-2827, 2828-2834, 2835-2839, 2842-2849, 2853-2868, 2869-2880, 2881, 2882-2893, 2894-2897, 2900-2902, 2903, 2904, 2906-2912, 2918-2923, 2924, 2925-2932, 2933-2946, 2947-2957, 2959-2964, 2969-2976, 2977-2987, 2988-2992, 2995-3001, 3002-3008, 3020-3031, 3033-3035, 3039-3042, 3043-3048, 3049-3055, 3057-3067, 3070-3078, 3079-3084, 3085-3089, 3092-3106, 3107-3118, 3149-3153, 3154-3158, 3176-3181, 3182-3201, 3203-3207, 3212-3216, 3218-3222, 3226-3229, 3234-3244, 3245-3252, 3253, 3254, 3255, 3261, 3262, 3263, 3268-3272, 3277-3281, 3282-3289, 3290, 3291, 3292, 3300-3306, 3307, 3308-3314, 3315, 3316, 3318-3331, 3338, 3339, 3340, 3346, 3347-3352, 3353-3357, 3364-3370, 3371, 3372, 3373-3379, 3380-3387, 3388-3392, 3393-3398, 3399-3403, 3404, 3405-3408, 3409, 3410-3413, 3414, 3415, 3416-3421, 3422-3426, 3439, 3441, 3451, 3453, 3456, 3466, 3496-3505, 3510, 3530-3539, 3541-3545, 3546, 3547, 3549-3559, 3561-3572, 3578, 3584-3590, 3592, 3593, 3595-3602, 3603-3614, 3616-3620, 3623-3628, 3629-3647, 3648-3654, 3655-3669, 3671-3675, 3677, 3686-3690, 3691-3702, 3703, 3704-3711, 3712-3717, 3722-3731, 3732-3739, 3740-3745, 3755-3760, 3761-3766, 3767, 3768, 3775-3784, 3786-3791, 3793-3797, 3798-3808, 3809-3814, 3815-3826, 3827-3831, 3836-3840, 3841-3853, 3856-3859, 3865, 3866-3871, 3872-3875, 3876-3879, 3881, 3882, 3883, 3884, 3885, 3887-3891, 3897-3905, 3906-3910, 3911-3915, 3916-3919, 3920-3925, 3926-3932, 3933-3945, 3947, 3949-3952, 3956, 3961-3970, 3972-3975, 4030-4035, 4036-4039, 4040, 4042, 4043, 4080-4083, 4113, 4128, 4129-4134, 4136, 4143, 4145, 4147-4152, 4153-4158, 4159
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.lecture-video` | 153–173 | 21 |  |
| 2 | `.chapter-row` | 329–348 | 20 |  |
| 3 | `.checkpoint-option` | 459–478 | 20 |  |
| 4 | `.exam-qmap-dot` | 3182–3201 | 20 |  |
| 5 | `.checkpoint-mark` | 492–510 | 19 |  |
| 6 | `.chat-input` | 3629–3647 | 19 |  |
| 7 | `.chat-retry` | 1170–1187 | 18 |  |
| 8 | `.step-num` | 2519–2536 | 18 |  |
| 9 | `.lecture-progress-fill` | 261–277 | 17 |  |
| 10 | `.process-step-num` | 2112–2128 | 17 |  |
| 11 | `.cp-row` | 94–109 | 16 |  |
| 12 | `.ai-gap-card` | 1071–1086 | 16 |  |
| 13 | `.social-composer` | 2853–2868 | 16 |  |
| 14 | `.checkpoint-eyebrow` | 431–445 | 15 |  |
| 15 | `.chat-error` | 1155–1169 | 15 |  |
| 16 | `.announcement-pin` | 3092–3106 | 15 |  |
| 17 | `.chat-send` | 3655–3669 | 15 |  |
| 18 | `.course-hero-icon` | 1420–1433 | 14 |  |
| 19 | `.webinar-row` | 1666–1679 | 14 |  |
| 20 | `.profile-link-icon` | 2783–2796 | 14 |  |
| 21 | `.trend-tag` | 2933–2946 | 14 |  |
| 22 | `.exam-submit-bar` | 3318–3331 | 14 |  |
| 23 | `.lecture-report-retry` | 211–223 | 13 |  |
| 24 | `.lecture-progress-mark` | 283–295 | 13 |  |
| 25 | `.cal-event-row` | 933–945 | 13 |  |
| 26 | `.ai-gap-pct` | 1100–1112 | 13 |  |
| 27 | `.live-chip` | 2302–2314 | 13 |  |
| 28 | `.live-row-icon` | 2330–2342 | 13 |  |
| 29 | `.fact-error` | 2721–2733 | 13 |  |
| 30 | `.matrix-cell` | 3841–3853 | 13 |  |
| 31 | `.post-action` | 3933–3945 | 13 |  |
| 32 | `.cp-row-q` | 115–126 | 12 |  |
| 33 | `.lecture-meta-title` | 183–194 | 12 |  |
| 34 | `.chat-typing` | 1128–1139 | 12 |  |
| 35 | `.course-hero-progress` | 1463–1474 | 12 |  |
| 36 | `.process-step` | 2090–2101 | 12 |  |
| 37 | `.lib-cover-band` | 2211–2222 | 12 |  |
| 38 | `.research-card` | 2225–2236 | 12 |  |
| 39 | `.lab-hero-title` | 2369–2380 | 12 |  |
| 40 | `.terminal::after` | 2411–2422 | 12 |  |

## src/styles/colleges.css — 134 dead rules, ~805 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
140-154, 156, 182-195, 196-207, 208-215, 216-222, 232-235, 240-243, 250-252, 253-258, 259-263, 264-266, 267-269, 270-275, 276-281, 282-287, 288, 289, 354-365, 374-378, 379-393, 398-409, 410, 411-421, 422-437, 438-442, 445-449, 451, 455-466, 468-473, 474, 475-479, 480-484, 487-494, 495, 496-503, 504-510, 511-514, 517-524, 525-532, 535, 537-552, 553-559, 560, 561-565, 566-569, 570-577, 580-588, 589-591, 593-604, 606-608, 609-620, 621-631, 637-642, 645-650, 651-661, 662-665, 666, 667-671, 672-679, 680-685, 692-698, 702-704, 706-722, 724-728, 731, 759-762, 763-768, 769-782, 786-800, 804, 805, 807, 808-812, 817, 819-823, 824, 825-832, 835, 837-846, 847-852, 853-857, 858-861, 862-865, 868-870, 874-879, 880, 881, 882, 887, 888, 902-907, 908-910, 919, 921-929, 930-941, 942-948, 949-954, 955-960, 961-971, 972-983, 984-991, 992-996, 997-1001, 1003, 1004, 1007-1014, 1015-1021, 1022, 1023-1027, 1028-1032, 1036-1039, 1040-1045, 1046-1054, 1056, 1063-1070, 1076-1084, 1085-1094, 1095-1108, 1111, 1113-1119, 1123-1127, 1129, 1131-1135, 1136-1149, 1151, 1159-1165, 1166-1173, 1196-1203, 1208-1211, 1212-1226, 1227-1230, 1236-1238, 1239-1241
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.comp-go` | 706–722 | 17 | KEEP .comp-* borrow contract (PI-06) |
| 2 | `.college-hero-name` | 422–437 | 16 |  |
| 3 | `.student-rank-num` | 537–552 | 16 |  |
| 4 | `.gallery-clear` | 140–154 | 15 |  |
| 5 | `.college-hero::before, .comp-hero::before` | 379–393 | 15 | KEEP .comp-* borrow contract (PI-06) |
| 6 | `.leaderboard-sort` | 786–800 | 15 |  |
| 7 | `.college-hero-motif` | 1212–1226 | 15 |  |
| 8 | `.guest-cta-band` | 182–195 | 14 |  |
| 9 | `.leaderboard-table thead th` | 769–782 | 14 |  |
| 10 | `.comp-modal-close` | 1095–1108 | 14 | KEEP .comp-* borrow contract (PI-06) |
| 11 | `.comp-icon-btn` | 1136–1149 | 14 | KEEP .comp-* borrow contract (PI-06) |
| 12 | `.guest-cta-title` | 196–207 | 12 |  |
| 13 | `.college-hero` | 354–365 | 12 |  |
| 14 | `.college-hero-emoji` | 398–409 | 12 |  |
| 15 | `.leadership-list, .dept-list, .announce-list, .event-list, .live-list` | 455–466 | 12 |  |
| 16 | `.announce-emoji, .event-emoji` | 593–604 | 12 |  |
| 17 | `.announce-title, .event-title, .live-title` | 609–620 | 12 |  |
| 18 | `.comp-hero-emoji` | 930–941 | 12 | KEEP .comp-* borrow contract (PI-06) |
| 19 | `.comp-hero-desc` | 972–983 | 12 | KEEP .comp-* borrow contract (PI-06) |
| 20 | `.college-hero-eyebrow` | 411–421 | 11 |  |
| 21 | `.announce-meta, .event-meta, .live-meta` | 621–631 | 11 |  |
| 22 | `.comp-card` | 651–661 | 11 | KEEP .comp-* borrow contract (PI-06) |
| 23 | `.comp-hero-title` | 961–971 | 11 | KEEP .comp-* borrow contract (PI-06) |
| 24 | `.leaderboard-emoji` | 837–846 | 10 |  |
| 25 | `.comp-modal-head h2` | 1085–1094 | 10 | KEEP .comp-* borrow contract (PI-06) |
| 26 | `.announce-row, .event-row, .live-row` | 580–588 | 9 |  |
| 27 | `.comp-hero` | 921–929 | 9 | KEEP .comp-* borrow contract (PI-06) |
| 28 | `.comp-entry-file` | 1046–1054 | 9 | KEEP .comp-* borrow contract (PI-06) |
| 29 | `.comp-modal-head` | 1076–1084 | 9 | KEEP .comp-* borrow contract (PI-06) |
| 30 | `.guest-cta-note` | 208–215 | 8 |  |
| 31 | `.dept-row` | 487–494 | 8 |  |
| 32 | `.dept-row-name` | 496–503 | 8 |  |
| 33 | `.student-rank-list` | 517–524 | 8 |  |
| 34 | `.student-rank-row` | 525–532 | 8 |  |
| 35 | `.student-rank-xp` | 570–577 | 8 |  |
| 36 | `.comp-meta` | 672–679 | 8 | KEEP .comp-* borrow contract (PI-06) |
| 37 | `.leaderboard-college-link` | 825–832 | 8 |  |
| 38 | `.comp-hero-stats` | 984–991 | 8 | KEEP .comp-* borrow contract (PI-06) |
| 39 | `.comp-entry-list` | 1007–1014 | 8 | KEEP .comp-* borrow contract (PI-06) |
| 40 | `.comp-score-input` | 1063–1070 | 8 | KEEP .comp-* borrow contract (PI-06) |

## src/styles/shared/heron-admin-owner.css — 158 dead rules, ~527 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
124-128, 143-152, 154, 161-164, 189-192, 193-197, 198-203, 204-208, 210, 211, 216, 217, 226, 227-230, 237-239, 240, 244, 256-261, 265, 266-270, 299, 300, 305, 306-311, 313-318, 322-327, 331, 332-333, 336, 342-356, 357-362, 363-369, 386-391, 394-398, 402-403, 409-414, 418-422, 427, 432-436, 440-443, 447-452, 454-457, 459-464, 465, 469-471, 472, 478, 479-482, 483, 484-486, 525-529, 530-534, 539-542, 546-548, 554-558, 582-585, 587-590, 593-597, 598, 599, 603-608, 609-613, 614-617, 621-623, 625-628, 642-645, 646, 647, 648, 649, 650-651, 657-662, 677-682, 684-687, 689-693, 694-697, 698-700, 701-705, 713-716, 728-733, 734-738, 755-758, 771-779, 780-786, 787-792, 796-802, 804-807, 809-812, 815-817, 831-839, 840-846, 859-861, 862, 868, 870-874, 875, 879-881, 885-888, 893-895, 896-899, 903-905, 906-908, 909-912, 913-917, 921-924, 925-928, 929, 932-936, 950, 951, 952, 953, 967, 968, 969-975, 976, 977, 978-981, 986, 987-991, 992, 993, 999, 1000-1003, 1004, 1007, 1008, 1017, 1022, 1023, 1026, 1030, 1036, 1037-1040, 1041, 1044, 1048, 1051-1052, 1097-1103, 1113, 1115, 1117, 1118, 1120-1126, 1128-1135, 1136, 1137, 1138, 1139, 1141-1145, 1147, 1148-1158, 1159-1163, 1164, 1165, 1166, 1168, 1170-1176
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.r305ao .r305ao-bulkbar` | 342–356 | 15 |  |
| 2 | `.bimp-table th` | 1148–1158 | 11 |  |
| 3 | `.r305ao .back-link` | 143–152 | 10 |  |
| 4 | `.r305ao .r305ao-danger-zone` | 771–779 | 9 |  |
| 5 | `.r305ao .r305ao-panel` | 831–839 | 9 |  |
| 6 | `.bimp-summary` | 1128–1135 | 8 |  |
| 7 | `.r305ao .r305ao-bulkbar-actions` | 363–369 | 7 |  |
| 8 | `.r305ao .r305ao-danger-zone-title` | 780–786 | 7 |  |
| 9 | `.r305ao .r305ao-btn-danger` | 796–802 | 7 |  |
| 10 | `.r305ao .r305ao-panel-title` | 840–846 | 7 |  |
| 11 | `.r305ao .ws-table.tbl-stack td.ws-id` | 969–975 | 7 |  |
| 12 | `.r305ao .pf-filterbar.sticky,   .r305ao-bulkbar` | 1097–1103 | 7 |  |
| 13 | `.bimp-area` | 1120–1126 | 7 |  |
| 14 | `.bimp-foot` | 1170–1176 | 7 |  |
| 15 | `.r305ao .stat-value` | 198–203 | 6 |  |
| 16 | `.r305ao .r305ao-toolbar` | 256–261 | 6 |  |
| 17 | `.r305ao .pill` | 306–311 | 6 |  |
| 18 | `.r305ao .pill:hover` | 313–318 | 6 |  |
| 19 | `.r305ao .pill.on` | 322–327 | 6 |  |
| 20 | `.r305ao .r305ao-bulkbar-count` | 357–362 | 6 |  |
| 21 | `.r305ao .table thead th, .r305ao .ws-table thead th` | 386–391 | 6 |  |
| 22 | `.r305ao .ws-meta` | 409–414 | 6 |  |
| 23 | `.r305ao .table-pagination-actions button` | 447–452 | 6 |  |
| 24 | `.r305ao .table-pagination-actions button.active, .r305ao .table-pagination-actions button[ari…` | 459–464 | 6 |  |
| 25 | `body:has(.r305ao) .owner-confirm-title` | 603–608 | 6 |  |
| 26 | `.r305ao .alert` | 657–662 | 6 |  |
| 27 | `.r305ao .owner-alert-card` | 677–682 | 6 |  |
| 28 | `.r305ao .state-icon` | 728–733 | 6 |  |
| 29 | `.r305ao .r305ao-danger-zone-note` | 787–792 | 6 |  |
| 30 | `.r305ao .pf-eyebrow` | 124–128 | 5 |  |
| 31 | `.r305ao .stat-label` | 193–197 | 5 |  |
| 32 | `.r305ao .stat-trend` | 204–208 | 5 |  |
| 33 | `.r305ao .admin-students-search` | 266–270 | 5 |  |
| 34 | `.r305ao .table tbody td, .r305ao .ws-table tbody td` | 394–398 | 5 |  |
| 35 | `.r305ao .admin-table-num, .r305ao th.admin-table-num, .r305ao td.admin-table-num` | 418–422 | 5 |  |
| 36 | `.r305ao .table-wrap.sticky thead th` | 432–436 | 5 |  |
| 37 | `.r305ao .form-field-error` | 525–529 | 5 |  |
| 38 | `.r305ao .form-error-msg, .r305ao .form-error` | 530–534 | 5 |  |
| 39 | `.r305ao .gov-form-actions` | 554–558 | 5 |  |
| 40 | `body:has(.r305ao) .modal-title` | 593–597 | 5 |  |

## src/styles/teacher/heron.css — 142 dead rules, ~580 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
73-77, 105-114, 116-120, 122-136, 140-146, 151-167, 169-176, 178, 179-183, 184, 185-189, 190, 191-195, 196, 197-201, 202, 203-207, 208, 213-217, 219-232, 234-239, 241, 243-247, 250, 254-268, 270-273, 282, 283, 285, 289-299, 301-312, 314-321, 323, 324-327, 329-332, 333-336, 338, 339-342, 347-351, 353-359, 361, 363-366, 370-382, 384-396, 404-408, 412-414, 418-420, 425, 426, 427, 428, 429, 466-478, 480-486, 492-496, 498-501, 508-512, 518-520, 523-525, 528-530, 535-537, 544-547, 551-554, 559-565, 567-569, 574-577, 583-585, 587-589, 594-597, 608-611, 613-615, 648-652, 659-661, 664-667, 672-675, 687, 711-713, 724-726, 788-792, 799-801, 807-811, 813, 819-823, 831-834, 861, 862, 863, 864, 866, 867, 868, 869, 873-876, 883-890, 893, 904, 908, 920, 922-928, 930-945, 946, 948, 950-953, 954-958, 960, 962-976, 978, 980, 981, 983-990, 992-998, 999-1010, 1011, 1012, 1014-1027, 1029, 1031, 1033-1040, 1041, 1042-1053, 1054, 1056, 1057, 1060, 1063-1067, 1068, 1069, 1070, 1071, 1072, 1075, 1076, 1077-1086, 1087, 1088, 1089, 1090-1094, 1095, 1096-1103, 1104, 1105, 1106
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.hr-chip` | 151–167 | 17 |  |
| 2 | `.vid-up-tabs [role='tab']` | 930–945 | 16 |  |
| 3 | `.hr-section-count` | 122–136 | 15 |  |
| 4 | `.hr-sort-btn` | 254–268 | 15 |  |
| 5 | `.vid-up-pick` | 962–976 | 15 |  |
| 6 | `.hr-table thead th` | 219–232 | 14 |  |
| 7 | `.vid-up-stop` | 1014–1027 | 14 |  |
| 8 | `.hr-empty` | 370–382 | 13 |  |
| 9 | `.hr-note` | 384–396 | 13 |  |
| 10 | `.hr-scope .pf-eyebrow` | 466–478 | 13 | KEEP .hr-scope contract (PI-09) |
| 11 | `.hr-rail-step` | 301–312 | 12 |  |
| 12 | `.vid-up-meter-fill` | 999–1010 | 12 |  |
| 13 | `.vid-up-again` | 1042–1053 | 12 |  |
| 14 | `.hr-rail` | 289–299 | 11 |  |
| 15 | `.hr-section-head` | 105–114 | 10 |  |
| 16 | `.inv-field select, .inv-field input` | 1077–1086 | 10 |  |
| 17 | `.hr-chip::before` | 169–176 | 8 |  |
| 18 | `.hr-rail-step::before` | 314–321 | 8 |  |
| 19 | `.tax-kpis` | 883–890 | 8 |  |
| 20 | `.vid-up-progress` | 983–990 | 8 |  |
| 21 | `.vid-up-done` | 1033–1040 | 8 |  |
| 22 | `.inv-code` | 1096–1103 | 8 |  |
| 23 | `.hr-toolbar` | 140–146 | 7 |  |
| 24 | `.hr-kpi-value` | 353–359 | 7 |  |
| 25 | `.hr-scope .pf-eyebrow::before` | 480–486 | 7 | KEEP .hr-scope contract (PI-09) |
| 26 | `.hr-scope .att-toggle` | 559–565 | 7 | KEEP .hr-scope contract (PI-09) |
| 27 | `.vid-up-tabs` | 922–928 | 7 |  |
| 28 | `.vid-up-meter` | 992–998 | 7 |  |
| 29 | `.hr-table tbody td` | 234–239 | 6 |  |
| 30 | `[data-theme='dark'] .hr-scope` | 73–77 | 5 | KEEP .hr-scope contract (PI-09) |
| 31 | `.hr-section-head h2, .hr-section-head h3` | 116–120 | 5 |  |
| 32 | `.hr-chip[data-tone='ok']` | 179–183 | 5 |  |
| 33 | `.hr-chip[data-tone='warn']` | 185–189 | 5 |  |
| 34 | `.hr-chip[data-tone='danger']` | 191–195 | 5 |  |
| 35 | `.hr-chip[data-tone='info']` | 197–201 | 5 |  |
| 36 | `.hr-chip[data-tone='ember']` | 203–207 | 5 |  |
| 37 | `.hr-table` | 213–217 | 5 |  |
| 38 | `.hr-table .hr-num` | 243–247 | 5 |  |
| 39 | `.hr-kpi` | 347–351 | 5 |  |
| 40 | `.hr-scope .btn:disabled, .hr-scope .btn[aria-disabled='true']` | 404–408 | 5 | KEEP .hr-scope contract (PI-09) |

## src/styles/training.css — 101 dead rules, ~623 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
49-54, 94-97, 109-114, 115-121, 127-144, 146-149, 156, 162, 167-177, 178-191, 192-198, 199-204, 205-217, 218-227, 228-234, 239-244, 246-250, 252-253, 255, 256, 257, 261-275, 277, 279, 281-284, 286-288, 290, 291-293, 295, 297-299, 301-314, 315-318, 319-324, 325-329, 331-337, 338-345, 346-350, 351-357, 360-366, 367, 369-377, 378-385, 389-399, 400-410, 411-416, 417-420, 423-429, 435-446, 447-451, 452-456, 459-463, 468-471, 506-510, 512, 515-530, 533-537, 540, 548, 550-558, 559-566, 567-571, 573-578, 579-583, 584-591, 592-603, 606-609, 614-621, 622-633, 635, 649-668, 672-678, 679-682, 683-685, 686-688, 690-699, 700-707, 708-719, 722, 737-743, 744-753, 754, 758-775, 776, 777-781, 786-797, 799-801, 803-813, 814-818, 819-823, 826-838, 844-848, 849, 856-858, 860, 862-866, 872-875, 876-879, 880-886, 887-892, 895-898, 901-903
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.leaderboard-rank` | 649–668 | 20 |  |
| 2 | `.back-link` | 127–144 | 18 | KEEP export contract (PI-10) |
| 3 | `.tier-orb` | 758–775 | 18 |  |
| 4 | `.badge-tile` | 515–530 | 16 |  |
| 5 | `.lesson-row` | 261–275 | 15 |  |
| 6 | `.track-hero-icon` | 178–191 | 14 |  |
| 7 | `.lesson-row-num` | 301–314 | 14 |  |
| 8 | `.track-hero-title` | 205–217 | 13 |  |
| 9 | `.cert-icon` | 826–838 | 13 |  |
| 10 | `.reward-feedback` | 435–446 | 12 |  |
| 11 | `.badge-tile.earned .badge-tile-rarity` | 592–603 | 12 |  |
| 12 | `.leaderboard-row` | 622–633 | 12 |  |
| 13 | `.leaderboard-points` | 708–719 | 12 |  |
| 14 | `.achievement` | 786–797 | 12 |  |
| 15 | `.track-hero` | 167–177 | 11 |  |
| 16 | `.lesson-quiz` | 389–399 | 11 |  |
| 17 | `.lesson-quiz-eyebrow` | 400–410 | 11 |  |
| 18 | `.achievement-icon` | 803–813 | 11 |  |
| 19 | `.track-hero-summary` | 218–227 | 10 |  |
| 20 | `.leaderboard-name` | 690–699 | 10 |  |
| 21 | `.xp-fill` | 744–753 | 10 |  |
| 22 | `.lesson-kicker` | 369–377 | 9 |  |
| 23 | `.badge-tile-icon` | 550–558 | 9 |  |
| 24 | `.lesson-row-title` | 338–345 | 8 |  |
| 25 | `.lesson-title` | 378–385 | 8 |  |
| 26 | `.badge-tile.earned .badge-tile-icon` | 559–566 | 8 |  |
| 27 | `.badge-tile-rarity` | 584–591 | 8 |  |
| 28 | `.leaderboard-list` | 614–621 | 8 |  |
| 29 | `.leaderboard-tier` | 700–707 | 8 |  |
| 30 | `.level-band-main` | 115–121 | 7 |  |
| 31 | `.track-hero-main` | 192–198 | 7 |  |
| 32 | `.track-hero-meta` | 228–234 | 7 |  |
| 33 | `.lesson-row-body` | 331–337 | 7 |  |
| 34 | `.lesson-row-meta` | 351–357 | 7 |  |
| 35 | `.lesson-content` | 360–366 | 7 |  |
| 36 | `.lesson-actions` | 423–429 | 7 |  |
| 37 | `.leaderboard-rank.rank-1,   .leaderboard-rank.rank-2,   .leaderboard-rank.rank-3` | 672–678 | 7 |  |
| 38 | `.xp-track` | 737–743 | 7 |  |
| 39 | `.cert-title` | 880–886 | 7 |  |
| 40 | `.filter-pill-row` | 49–54 | 6 | KEEP export contract (PI-10) |

## src/styles/polish.css — 120 dead rules, ~471 lines

Complete dead-rule line ranges (delete whole blocks; interaction pseudos die with base):
```
42-49, 51-56, 126-128, 145-148, 177, 180, 202-205, 233-240, 246-248, 262-265, 273-277, 278-283, 290, 323-327, 632-636, 672-678, 679-685, 689-697, 698, 700-702, 705-713, 714-719, 720-731, 732-737, 740-743, 748-758, 761-764, 765-775, 781-785, 786-797, 798-800, 802-804, 831-836, 838-844, 848-857, 858-862, 1075-1079, 1080-1084, 1089-1093, 1145, 1148, 1149, 1342-1344, 1345, 1346, 1347, 1348, 1362-1364, 1392-1397, 1475-1481, 1483-1486, 1726-1728, 1820-1823, 1824-1834, 1839, 1842-1847, 2013-2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2046-2048, 2079-2081, 2106-2110, 2213-2215, 2216, 2217, 2218, 2219, 2220, 2221, 2222, 2283-2285, 2286-2288, 2289-2298, 2299-2301, 2312-2315, 2317-2327, 2328, 2395-2401, 2402-2405, 2406-2408, 2410-2414, 2415-2417, 2426-2429, 2450-2452, 2490-2495, 2516-2520, 2522-2530, 2608-2612, 2615, 2706-2709, 2710-2714, 2805-2812, 2828, 2854, 2880-2883, 2889, 2890, 2891-2896, 2898-2901, 2948, 2972, 2973, 2974, 2975, 2980, 2981, 2982-2983, 2985, 2986, 3049-3051, 3285-3294, 3295-3303, 3305-3309
```

Top 40 dead rules by span:

| # | selector | lines | span | guard |
|---|---|---|---|---|
| 1 | `.notif-item-desc` | 720–731 | 12 |  |
| 2 | `.notif-panel-viewall` | 786–797 | 12 |  |
| 3 | `.notif-item-dot` | 748–758 | 11 |  |
| 4 | `.notif-empty-icon` | 765–775 | 11 |  |
| 5 | `.metric::before` | 1824–1834 | 11 |  |
| 6 | `.list-row::before` | 2317–2327 | 11 |  |
| 7 | `.tab-count` | 848–857 | 10 |  |
| 8 | `.leaderboard-table tbody tr:hover td:first-child::before` | 2289–2298 | 10 |  |
| 9 | `.card.glass-premium,   .card-glass-premium` | 3285–3294 | 10 |  |
| 10 | `.notif-item` | 689–697 | 9 |  |
| 11 | `.notif-item-icon` | 705–713 | 9 |  |
| 12 | `.announce-row:hover .announce-emoji,     .event-row:hover .event-emoji,                      …` | 2522–2530 | 9 |  |
| 13 | `.card.glass-premium::before,   .card-glass-premium::before` | 3295–3303 | 9 |  |
| 14 | `a > .card,   button.card` | 42–49 | 8 |  |
| 15 | `.card.interactive:active,   a > .card:active,   button > .card:active` | 233–240 | 8 |  |
| 16 | `.modal-overlay,     .sheet-overlay,     .lightbox-overlay,     .cmd-palette-overlay,     .pop…` | 2805–2812 | 8 |  |
| 17 | `.notif-panel-head` | 672–678 | 7 |  |
| 18 | `.notif-panel-title` | 679–685 | 7 |  |
| 19 | `.post:hover,     .announcement-card:hover` | 838–844 | 7 |  |
| 20 | `.list-row,   .feed-item,   .owner-timeline-item` | 1475–1481 | 7 |  |
| 21 | `.thumb-card` | 2395–2401 | 7 |  |
| 22 | `a:hover > .card:not(.flush),     button.card:hover` | 51–56 | 6 |  |
| 23 | `.table-pagination-actions button:active:not(:disabled),   .toast-close:active,   .vpc-menu-it…` | 278–283 | 6 |  |
| 24 | `.notif-item-title` | 714–719 | 6 |  |
| 25 | `.notif-item-time` | 732–737 | 6 |  |
| 26 | `.post,   .announcement-card` | 831–836 | 6 |  |
| 27 | `a > .card:active,   button > .card:active,   .card.interactive:active` | 1392–1397 | 6 |  |
| 28 | `.metric-value` | 1842–1847 | 6 |  |
| 29 | `.vision-card,   .vision-detail-hero` | 2490–2495 | 6 |  |
| 30 | `*::-webkit-scrollbar-thumb` | 2891–2896 | 6 | GATE-ARTIFACT: pseudo-only probe (starts ::) — gate marks dead spuriously; verify manually, likely ALIVE |
| 31 | `.dropdown-item:active,   .search-row:active` | 273–277 | 5 |  |
| 32 | `.card.disabled,   .metric.disabled` | 323–327 | 5 |  |
| 33 | `.topbar-notif[aria-expanded="true"]` | 632–636 | 5 |  |
| 34 | `.notif-panel-foot` | 781–785 | 5 |  |
| 35 | `.tab.on .tab-count,   .tab[aria-selected="true"] .tab-count` | 858–862 | 5 |  |
| 36 | `.card.interactive:hover,     a > .card:hover,     button > .card:hover` | 1075–1079 | 5 |  |
| 37 | `.card.interactive:hover,     a > .card:hover,     button > .card:hover` | 1080–1084 | 5 |  |
| 38 | `.card.interactive:hover,       a > .card:hover,       button > .card:hover` | 1089–1093 | 5 |  |
| 39 | `.topbar .global-search:focus-within` | 2106–2110 | 5 |  |
| 40 | `.thumb-card:hover` | 2410–2414 | 5 |  |
