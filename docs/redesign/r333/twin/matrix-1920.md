# Twin matrix @1920 — P-F sweep (R333)

Harness `scripts/twin/` (r332) · chromium headless · heron live + madarek vite :5173 ·
evidence `/home/z/evidence-r333/twin/run-matrix/1920/` (26 frames/side/section, `--step 4`) ·
full tables `report.md`/`report.json` next to it · date 2026-02 (run 2025-11-03).

Thresholds: height Δ≤3% · heading fs Δ≤4% · rhythm Δ≤8px · trigger Δ≤40px ·
PASS = all within / FAIL = any >2× / else PARTIAL.

## Verdicts

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| journey | PARTIAL | 1.14 | 0.0 | n/a (pinned) | 4.3 | h 7560.0 vs 7475.0 — clean |
| statement | PARTIAL | 0.0 | 0.0 | n/a (layered) | 4.1 | h 963.3 vs 963.3, fs 44.44 both — clean |
| cta | FAIL | 0.04 | **14.29** | 0.0 | **2522.9** | fs 53.33 vs 62.22 (3.6×); trigger = cascade (see below) |
| footer | FAIL | **38.60** | 0.0 | 0.0 | **2523.3** | h 947.6 vs **1543.3** (madarek +63%); trigger = cascade |

Note: journey/statement PARTIAL is a verdict-rule artifact — rhythm is n/a on pinned/layered
bands, so `len(within) < len(deltas)` prevents PASS; every measured metric is inside threshold.

## FAIL details

- **footer height (local, real)**: madarek footer 1543.3px vs heron 947.6px (+62.8%). Same defect
  family as r332 @1440 (+24.1%); worse as viewport widens (1024: +76%, see matrix-1024).
  Thumb: `thumbs/footer-1920-p48-heronLEFT-madarekRIGHT.jpg`.
- **cta heading fs (local, real)**: madarek 62.22px vs heron 53.33px (Δ14.29% = 3.6× the 4% cap).
  Madarek's cta display type is not stepping down between 1920 and tablet (see matrix-768: it is
  larger at 768 than at 1024 — non-monotonic rem ladder).
- **cta/footer trigger-start ~2523px — CASCADE, not local**: section tops agree through journey
  (Δtop 4.3px) and diverge only in the unswept platform/why/roles region. Two components:
  1. fresh-load baseline (probe `scripts/r333/pf-gap-probe.py --vp 1920`): heron cta.top 13524.5 vs
     madarek 13351.8 → **+172.7px** heron-side pre-cta stack offset (4.3× threshold).
  2. post-sweep heron-only growth: capture measured heron cta.top **15909.2** vs fresh 13524.5 →
     heron's platform/why/roles region adds **~2385px** of document height after being scrolled
     through; madarek is stable (13386.3 capture vs 13351.8 fresh, +34.5px). Until platform/why/roles
     are swept (MISSING below), treat the 2523px trigger number as upstream cascade + harness
     activation-order artifact, not a cta/footer defect.

## MISSING at this vp (not captured — budget)

`hero, pains, platform, why, roles` (5 of 9 sections). platform/why/roles are also where the
trigger cascade originates — highest-value next captures. WebKit sweep = later task.

---

# P-F2 completion — hero, pains, platform, why, roles @1920

Swept by P-F2 (twin matrix completion): same harness, same vps, `--step 4`, evidence in
`1920/{why,roles,platform,hero,pains}/`; full 9-section tables regenerated in `report.md` /
`report.json`; this sweep's run stats in `pf2-capture-summary.json` (note: per-run
`capture-summary.json` only reflects the last invocation).

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| hero | PARTIAL* | 0.45 | 0.0 | n/a | 8.9 | h 1062.2 vs 1067.0, fs 62.22 both — all measured metrics within; *rhythm-n/a artifact |
| pains | PARTIAL* | 0.02 | 0.0 | n/a | 4.1 | h 990.2 vs 990.0, fs 53.33 both — clean; *artifact |
| platform | FAIL | 0.01 | 0.0 | n/a | **89.2** | h 946.6 vs 946.7, fs 35.56 both; trigger 2.2× = start of heron-side stack offset (upstream) |
| why | FAIL | **275.94** | 0.0 | 0.0 | 89.2 | h **3315.8 vs 882.0** — heron post-activation growth, see attribution below |
| roles | FAIL | 0.0 | 0.0 | n/a | **2523.0** | h 1062.2 both, fs 53.33 both — trigger is pure cascade |

\* PARTIAL = verdict-rule artifact (rhythm n/a on one/both sides); every measured metric inside threshold.

## Cascade RESOLVED (completes P-F's attribution above)

P-F's pf-gap-probe @1920: fresh heron cta.top 13524.5 vs madarek 13351.8 (+172.7 fresh offset).
This sweep: heron roles.top 14847.0 + roles h 1062.2 = cta.top 15909.2 — matches P-F's
post-sweep measurement exactly, and roles trig Δ (2523.0) ≈ cta/footer's (2522.9/2523.3).
Decomposition of the 2523px:

1. **+89.2 accumulated by platform.top** (fresh heron-side stack offset; platform h agrees
   946.6 ≈ 946.7, so nothing local yet) — 2.2× threshold, minor.
2. **+2433.8 more between platform.top and roles.top**, of which only ~83.5 is fresh
   (172.7 − 89.2) → **~2350px is heron's why band growing after scroll activation** (lazy
   images; P-F's ~2385 estimate confirmed within run-to-run variance).
3. Roles h identical (1062.2 = 1062.2) and cta.top = roles.top + roles.h on heron → the growth
   sits entirely inside heron why. Implied fresh heron why ≈ 931–965px vs madarek 882.0
   (+6–10% real residual) — so the 275.94% why height Δ is predominantly a capture-side
   artifact (harness measures post-activation heights), with a small real over-height.

Thumb: `thumbs/why-1920-p48-heronLEFT-madarekRIGHT.jpg`.

## MISSING after P-F2

None at this vp — all 9 sections captured @1920 (chromium). Remaining matrix gap: WebKit.
