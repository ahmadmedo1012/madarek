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

---

# P-F2 completion — hero, pains, platform, why, roles @1024

Swept by P-F2 (twin matrix completion): same harness, `--step 4`, evidence in
`1024/{why,roles,platform,hero,pains}/`; full 9-section tables regenerated in `report.md` /
`report.json`; run stats in `pf2-capture-summary.json`.

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| hero | PARTIAL* | 0.46 | 0.0 | n/a | 4.7 | h 758.5 vs 755.0, fs 33.19 both — clean; *rhythm-n/a artifact |
| pains | FAIL | 0.0 | **10.38** | n/a | 8.2 | h 528.0 both; fs heron 28.44 vs madarek 31.74 (2.6×) — REAL |
| platform | PARTIAL* | 0.0 | 0.0 | n/a | 8.8 | h 504.9 both, fs 18.96 both — effectively clean; *artifact |
| why | FAIL | **275.38** | **10.38** | 8.5 | 8.8 | h **1768.4 vs 471.1** — heron post-activation growth (attribution in matrix-1920); fs 2.6× REAL |
| roles | FAIL | 0.0 | **10.38** | n/a | **1288.5** | h 758.5 both; trigger = cascade; fs 2.6× REAL |

\* PARTIAL = verdict-rule artifact (rhythm n/a); all measured metrics within threshold.

## P-F2 notes

- **pains @1024 is a real type defect** (new finding): heron steps pains display type down at
  tablet (53.33 → 28.44) while madarek jumps to 31.74 — the same size it uses at 390 — skipping
  heron's tablet step. pains/why/roles @1024 share this one rem-ladder family (all Δ10.38%,
  2.6×), matching cta's 14.29% above.
- **why height 275% = the same heron lazy-activation artifact** quantified @1920 (see
  matrix-1920 cascade resolution): heron why balloons after the pre-capture sweep while
  madarek is stable; heron platform (504.9 = 504.9) and roles (758.5 = 758.5) heights agree
  exactly, so the growth sits in heron why and drives the roles trigger offset (1288.5 ≈
  cta/footer's 1288.5/1288.6). No fresh-load probe was run @1024 — attribution is by mechanism
  + exact platform/roles height agreement.
- madarek why rhythm 8.5px vs heron 0 (1.06×) — marginal.
Thumb: `thumbs/pains-1024-p48-heronLEFT-madarekRIGHT.jpg`.

## MISSING after P-F2

None at this vp — all 9 sections captured @1024 (chromium). Remaining matrix gap: WebKit.
