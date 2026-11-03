# Twin matrix @390 — P-F sweep (R333)

Harness `scripts/twin/` (r332) · chromium headless · heron live + madarek vite :5173 ·
evidence `/home/z/evidence-r333/twin/run-matrix/390/` (26 frames/side/section, `--step 4`) ·
full tables `report.md`/`report.json` next to it.

NOTE: the P-F brief named viewport "360", but `scripts/twin/config.json` defines the mobile
viewport as **390×844** (`--vp 360` is rejected by the harness). 390 was swept; 360 does not exist
in the harness config.

Thresholds: height Δ≤3% · heading fs Δ≤4% · rhythm Δ≤8px · trigger Δ≤40px ·
PASS = all within / FAIL = any >2× / else PARTIAL.

## Verdicts

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| statement | **PASS** | 1.52 | 0.0 | 0.0 | 6.0 | h 847.2 vs 860.3, fs 23.82 both — fixed since r332 (was +39.8% h, 2× fs) |
| journey | PARTIAL | 0.39 | 0.0 | n/a (pinned) | 7.3 | h 4819.4 vs 4838.2, fs 39.69 both — clean; r332's +5.2% h / 50% fs gone |
| cta | FAIL | 0.02 | 0.0 | **12.0** | **105.2** | rhythm 1.5×; trigger 2.6× |
| footer | FAIL | 2.08 | 0.0 | 0.0 | **105.2** | h 1265.3 vs 1239.5 (within 3%); FAIL driver is trigger 2.6× |

footer FAIL driver is trigger 105.2px (2.6×); height 2.08% is within the 3% cap. journey/statement
PARTIAL/PASS: statement reaches full PASS; journey PARTIAL is the rhythm-n/a verdict artifact only.

## FAIL details

- **Mobile is the healthiest vp** — the r332 mobile catastrophes (statement +66% height, journey
  type 2×, pains 4-across overprint cascade) no longer reproduce on the swept sections.
- **cta/footer trigger-start 105.2px (2.6×) — CASCADE, mostly upstream**: tops agree through
  journey (Δ 7.3px); the offset accumulates across unswept platform/why/roles (heron-side pre-cta
  offset, see matrix-1920 attribution) plus a small residual: heron footer.top − cta.top gap vs
  madarek's differs slightly (heron 500.2→10645.5, madarek 500.1→10540.3: inter-gap 1265.3 vs
  1239.5+... ≈ 25.8px extra on heron side). Not a cta/footer-local geometry defect (heights
  500.2/500.1 and 1265.3/1239.5 both within 3%).
- **cta rhythm**: madarek median gap 12px vs heron 0 (1.5×) — minor, same family as 768's 40px.

## MISSING at this vp (not captured — budget)

`hero, pains, platform, why, roles` (5 of 9 sections). pains @390 was the worst r332 defect
(4-across overprint) and is the highest-value re-check here. WebKit sweep = later task.

---

# P-F2 completion — hero, pains, platform, why, roles @390

Swept by P-F2 (twin matrix completion): same harness, `--step 4`, evidence in
`390/{why,roles,platform,hero,pains}/`; full 9-section tables regenerated in `report.md` /
`report.json`; run stats in `pf2-capture-summary.json`.

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| hero | PARTIAL* | 0.23 | 0.05 | n/a | 7.9 | h 828.1 vs 830.0 — clean; *rhythm-n/a artifact |
| pains | PARTIAL* | 0.03 | 0.05 | n/a | 7.0 | h 869.5 vs 869.8, fs 31.74 both — **r332's 4-across overprint confirmed gone**; *artifact |
| platform | FAIL | **65.18** | 0.0 | n/a | 26.1 | h **968.6 vs 586.4** — heron's mobile platform band +382px; REAL |
| why | FAIL | 0.75 | 0.05 | 0.0 | **356.0** | h 807.5 vs 801.5 — height clean; trigger is upstream cascade |
| roles | FAIL | **15.41** | 0.05 | 10.0 | **362.0** | h 1060.6 vs 1253.8 — madarek's mobile roles +193px; REAL |

\* PARTIAL = verdict-rule artifact (rhythm n/a); all measured metrics within threshold.

## P-F2 notes — mobile redistribution, not the desktop artifact

- **The heron why lazy-growth artifact does NOT reproduce @390**: why height Δ is 0.75%
  (807.5 vs 801.5). The post-activation growth is a desktop/tablet why-layout artifact
  (side-by-side image columns); mobile why is stacked and stable. So @390 the FAILs are real
  structure, not the capture artifact.
- **Two real mobile divergences offset each other**: heron platform +382px taller (65.18%,
  968.6 vs 586.4 — 21.7× the cap) pushes everything below down (why/roles trigger 356/362 =
  4.5×/9×, cascade), then madarek roles +193px taller (15.41%, 1253.8 vs 1060.6) gives most of
  it back — net offset by cta.top = heron +105.2, exactly the trigger Δ P-F recorded on
  cta/footer. maxScroll agrees (heron 10613.0 vs madarek 10630.0): total document heights
  match @390; it is internal redistribution between platform and roles.
- pains @390 (the r332 red flag): heights 869.5/869.8, fs 31.74 both, trigger 7.0 — fully
  repaired on the swept build.
Thumbs: `thumbs/platform-390-p48-heronLEFT-madarekRIGHT.jpg`,
`thumbs/roles-390-p48-heronLEFT-madarekRIGHT.jpg`.

## MISSING after P-F2

None at this vp — all 9 sections captured @390 (chromium). Remaining matrix gap: WebKit.
