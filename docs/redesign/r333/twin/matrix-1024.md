# Twin matrix @1024 — P-F sweep (R333)

Harness `scripts/twin/` (r332) · chromium headless · heron live + madarek vite :5173 ·
evidence `/home/z/evidence-r333/twin/run-matrix/1024/` (26 frames/side/section, `--step 4`) ·
full tables `report.md`/`report.json` next to it.

Thresholds: height Δ≤3% · heading fs Δ≤4% · rhythm Δ≤8px · trigger Δ≤40px ·
PASS = all within / FAIL = any >2× / else PARTIAL.

## Verdicts

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| journey | PARTIAL | 0.32 | 0.0 | n/a (pinned) | 8.2 | h 5376.0 vs 5393.1, fs 33.19 both — clean |
| statement | PARTIAL | 0.0 | 0.0 | n/a (layered) | 8.3 | h 513.8 vs 513.8, fs 23.70 both — clean |
| cta | FAIL | 0.02 | **14.29** | **14.2** | **1288.5** | fs 28.44 vs 33.19 (3.6×); rhythm 1.8×; trigger = cascade |
| footer | FAIL | **43.22** | 0.0 | 0.0 | **1288.6** | h **505.4 vs 890.1** (madarek +76%); trigger = cascade |

journey/statement PARTIAL = verdict-rule artifact (rhythm n/a on pinned/layered bands); all
measured metrics within threshold.

## FAIL details

- **footer height (local, real) — worst in matrix**: heron compacts its footer at 1024 (505.4px,
  tablet layout) while madarek keeps the desktop footer (890.1px, +76.1%). Breakpoint mismatch,
  not scale: thumb `thumbs/footer-1024-p48-heronLEFT-madarekRIGHT.jpg`.
- **cta heading fs (local)**: madarek 33.19px vs heron 28.44px (Δ14.29%, 3.6×) — same pattern as
  1920: heron steps cta type down at tablet, madarek keeps the larger step.
- **cta rhythm**: madarek median gap 14.2px vs heron 0 (1.8× threshold) — minor.
- **cta/footer trigger-start ~1288px — CASCADE**: tops agree through journey (Δ 8.2px), diverge in
  the unswept platform/why/roles region (heron-side pre-cta offset; at 1920 the fresh-load baseline
  is +172.7px and post-sweep heron adds ~2385px there — see matrix-1920 for attribution). Not a
  cta/footer-local defect.

## MISSING at this vp (not captured — budget)

`hero, pains, platform, why, roles` (5 of 9 sections). WebKit sweep = later task.
