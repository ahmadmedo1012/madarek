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
