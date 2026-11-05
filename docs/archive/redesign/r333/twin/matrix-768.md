# Twin matrix @768 — P-F sweep (R333)

Harness `scripts/twin/` (r332) · chromium headless · heron live + madarek vite :5173 ·
evidence `/home/z/evidence-r333/twin/run-matrix/768/` (26 frames/side/section, `--step 4`) ·
full tables `report.md`/`report.json` next to it. Viewport = 768×900 per config.

Thresholds: height Δ≤3% · heading fs Δ≤4% · rhythm Δ≤8px · trigger Δ≤40px ·
PASS = all within / FAIL = any >2× / else PARTIAL.

## Verdicts

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| journey | FAIL | 1.22 | **20.00** | n/a (pinned) | 6.3 | fs **44.20 vs 36.83** (5×) — only vp where journey type breaks |
| statement | PARTIAL | 0.06 | 0.0 | n/a (layered) | 6.6 | h 527.0 vs 526.7, fs 22.10 both — clean |
| cta | FAIL | 0.02 | **20.06** | **40.0** | **1326.3** | fs 29.47 vs 36.86 (5×); rhythm 5×; trigger = cascade |
| footer | FAIL | **11.09** | **98.34** | 8.0 | **1326.2** | h 967.8 vs 1088.5; fs **25.78 vs 13.00** (24.6×); trigger = cascade |

statement PARTIAL = verdict-rule artifact (rhythm n/a, layered band); all measured metrics within.

## FAIL details

- **768 is the worst viewport for type**: three of four swept sections break the fs cap ≥5×.
  - journey: madarek section-title 36.83px vs heron 44.20px — madarek's rem ladder skips the 768
    step (matches heron at 1920/1024/390, only 768 diverges).
  - cta: madarek 36.86px vs heron 29.47px — madarek's cta type is **larger at 768 than at 1024**
    (36.86 > 33.19) while heron steps down 53.33 → 28.44 → 29.47 → 23.82; non-monotonic ladder.
  - footer: madarek drops footer text to 13.0px vs heron 25.78px — over-shrink at tablet.
- **cta rhythm**: madarek median gap 40px vs heron 0 (5×) — largest rhythm miss in matrix;
  thumb `thumbs/cta-768-p48-heronLEFT-madarekRIGHT.jpg`.
- **footer height**: madarek 1088.5px vs heron 967.8px (+12.5%, 3.7×) — desktop-ish footer persists
  on madarek at 768; thumb `thumbs/footer-768-p48-heronLEFT-madarekRIGHT.jpg`.
- **cta/footer trigger-start ~1326px — CASCADE**: tops agree through journey (Δ 6.3px), diverge in
  unswept platform/why/roles (heron-side pre-cta offset; attribution in matrix-1920). Not local.

## MISSING at this vp (not captured — budget)

`hero, pains, platform, why, roles` (5 of 9 sections). WebKit sweep = later task.

---

# P-F2 completion — hero, pains, platform, why, roles @768

Swept by P-F2 (twin matrix completion): same harness, `--step 4`, evidence in
`768/{why,roles,platform,hero,pains}/`; full 9-section tables regenerated in `report.md` /
`report.json`; run stats in `pf2-capture-summary.json`.

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| hero | PARTIAL* | 0.08 | 0.08 | n/a | 7.4 | h 885.3 vs 886.0, fs 36.83 both — clean; *rhythm-n/a artifact |
| pains | PARTIAL* | 0.04 | 0.08 | n/a | 6.9 | h 1332.8 vs 1333.4, fs 36.83 both — clean; *artifact |
| platform | FAIL | 0.71 | **25.0** | n/a | 64.9 | fs heron 22.10 vs madarek 29.47 (6.25×) — REAL; trigger 1.6× upstream |
| why | FAIL | **187.97** | **20.06** | **24.0** | 68.4 | h **1881.9 vs 653.5** — heron post-activation growth (attribution in matrix-1920); fs 5× REAL |
| roles | FAIL | 2.21 | **20.06** | **40.0** | **1296.8** | h 1366.6 vs 1337.1 (within 3%); fs 5× REAL; trigger = cascade |

\* PARTIAL = verdict-rule artifact (rhythm n/a); all measured metrics within threshold.

## P-F2 notes

- **768 remains the worst type viewport — now 5 of 9 sections break the fs cap ≥5×**: platform
  (22.10 vs 29.47) and roles (29.47 vs 36.86) join journey/cta/footer. Heron steps display type
  down at 768; madarek holds the larger step (same non-monotonic rem-ladder family P-F found).
- **roles trigger 1296.8 ≈ cta/footer's 1326.3/1326.2** → divergence is upstream, not
  roles-local: heron why measured 1881.9 vs madarek 653.5 post-activation (artifact mechanism
  per matrix-1920), plus the fresh tablet offset. Roles heights themselves are within 3%
  (1366.6 vs 1337.1).
- madarek why rhythm 24px and roles rhythm 40px vs heron 0 (3×/5×) — minor gaps P-F's cta
  rhythm finding (40px @768) also exhibits.
Thumb: `thumbs/platform-768-p48-heronLEFT-madarekRIGHT.jpg`.

## MISSING after P-F2

None at this vp — all 9 sections captured @768 (chromium). Remaining matrix gap: WebKit.
