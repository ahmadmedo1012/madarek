# R327 E5 — P2.4/P2.6 verification evidence (the 29 ink candidates + the courses wedge)

> Task ID 5 (row E — the R325 web remainder). Produced against the LIVE
> stack (Vite :5173 · API :4000 · PG16 :5433, re-seeded since the r325
> capture). Nothing here overwrites the r325 originals.

## Folder map

| Path | What it is |
|------|------------|
| `ink-app/ink-island-probe.json` | the batch re-probe of all 29 candidates (`scripts/r325/ink-island-probe.mjs --base :5173 --out …/r327/p2p6/ink-app`): elementFromPoint grid + computed backgrounds + luminance per flagged box |
| `ink-app/<role>-<slug>-<bp>-ink-after.webp` | 29 fresh AFTER shots (10 routes × bp, top scroll, ink) |
| `ink-app/ink-island-reprobe.json` | the targeted re-probe for the 3 candidates the batch run could not settle: dashboard ×2 (the fresh seed re-armed the onboarding modal over the flagged boxes) + lecture-player (the ledger's recorded `:lectureId` is a pre-reseed cuid → honest not-found). The modal was skipped and the lecture re-resolved live, then the ORIGINAL boxes sampled |
| `ink-app/<key>-<bp>-ink-reprobe.webp` | 9 evidence shots for those re-probes |
| `routes/` | targeted re-capture of all 10 candidate routes @1440-ink via the r325 harness (`capture-routes.mjs --out …`), instrument-identical to the r325 "before" shots — 10/10 done, 0 console errors, 0 horizontal overflow |
| `p2p4/student-courses-settle.json` | the student/courses wedged-thread re-verification (Y7-class): 3 consecutive attempts, same inspectors() contract as the original dom-probe + the rAF/longtask instrument |
| `p2p4/student-courses-1440-paper-a{1,2,3}.webp` | the three settle-probe shots (byte-identical — deterministic page) |

## The verdict — 0 real islands, 29 false-positives (one designed family)

Every flagged light mass resolves to the §R305 **deep-band inversion**
family (`.r305s-band--deep`, `.r305rp-band--deep`, and their consumers
`.dash-resume-card`/`.stu-hero`, `.r305p-hero`, `.ai-surface-head`,
`.r305g-level`, `.r305rp-res-band`, `.results-summary`, `.lecture-meta`,
`.r305u-facts`). The canon (r305-student.css §3, r305-research-pdf-ai.css
§3): *«.r305s-band--deep : the Heron inversion — ink ground in light
theme, paper ground in dark (the neutral scale flips), so the band always
contrasts its page»* — the same register the Y5-landing closure accepted
(«st-poché and the slide rules correctly INVERT to paper in Ink»,
commit `d07a6966`).

Proof per instrument:

1. **Token flip (live, `/student/results`):**
   `light → bandBg rgb(40,40,40) / fg rgb(255,255,255)`
   `dark → bandBg rgb(246,246,238) / fg rgb(46,46,46)`
   The ground is `var(--neutral-900)` and the ink `var(--neutral-0)` —
   both poles of one flipping ramp, zero literals (grep across the
   serving sheets: every `#F6F6EE`/`#fff` hit is a token definition
   site, a comment, a `color-mix` on `--danger`, or the `/__brand`
   specimen exhibit).
2. **Computed-style probe (all 29):** the flagged boxes land on the band
   family with `ownBg 246,246,238` (the paper pole) and DARK band text
   (`textLum ≈ .027`) — a coherent inverted panel, not a stuck light
   fragment. Remaining samples are ink-ramp text masses or the player's
   raster poster (honest content).
3. **Contrast on the paper pole (live, dashboard resume card):**
   main 12.5:1 · course name 12.5:1 · eyebrow (the band-safe
   `color-mix` recipe) 7.92:1 — every seat clears the 4.5 floor.
4. **VLM review (4 representative AFTER shots):** dashboard, teacher/ai,
   results, research — every verdict «deliberate high-contrast inverted
   callout, dark readable text, clean layout; no other light surfaces
   out of place».
5. **Bonus (not in the 29):** the onboarding modal the fresh seed
   re-armed over the student dashboard is itself ink-themed
   (modal-card lum .013–.027, light text, orange CTA) — no island.

## Per-route verdict table

| Route (bps) | Element at the flagged box | Verdict |
|-------|------|---------|
| student/ai (1440/768/390) | `.ai-surface-head.r305rp-band--deep` (+chips) | false-positive — designed inversion |
| student/dashboard (1440/768/390) | `.dash-resume-card.stu-hero.r305s-band--deep` | false-positive — designed inversion |
| student/forbidden-owner-users (1440/768/390) | the 403-bounce dashboard's same resume card | false-positive — designed inversion |
| student/gamification (1440/768/390) | `.r305g-level-*` inside `.r305s-band--deep` (+ink-ramp text) | false-positive — designed inversion |
| student/lecture-player (1440/768/390) | `.lecture-meta.r305s-band--deep.r305c-now` under the player (poster = raster content) | false-positive — designed inversion (+content) |
| student/profile (1440/768/390) | `.r305p-hero.r305s-band--deep` | false-positive — designed inversion |
| student/research (1440/768/390) | `section.r305rp-band--deep.r305rp-res-band` | false-positive — designed inversion |
| student/results (1440/768/390) | `.results-summary.r305s-band--deep` | false-positive — designed inversion |
| student/university (1440/768) | `.r305u-facts` inside `.r305s-band--deep` | false-positive — designed inversion |
| teacher/ai (1440/768/390) | `.ai-surface-head.r305rp-band--deep` | false-positive — designed inversion |

**Counts: island 0 · content 0 (dominant) · false-positive 29.**

## student/courses wedged thread (P2.4) — SETTLED

`route-dom-probe.mjs` recorded `probe-timeout` at capture time (the
20-s-raced inspectors() evaluate never returned). Re-verified live with
the SAME contract + the Y7 instruments, 3 consecutive attempts:

| attempt | inspectors | shot | rAF frames / 3 s | long tasks |
|---------|-----------|------|------------------|------------|
| 1 | 7 ms | 273 ms | 135 | 0 |
| 2 | 34 ms | 456 ms | 151 | 0 |
| 3 | 5 ms | 317 ms | 133 | 0 |

0 stuck skeletons, 0 error text, 0 jargon; the fixed-overlap pairs are
the documented `sheet-frame × chrome` backdrop noise (route-ledger.md).
The three screenshots are byte-identical. **Not reproduced — the wedge
signature is gone.** (The Y7 fix `e7301d94` landed after the capture;
the wedge was never root-caused on THIS route, so the closure is
"verified settled, not root-caused".)

## Reconciliation of the queue's 66 MISSING findings (P2.4)

`ledger-findings.json` was generated MID-SWEEP: 56 of its 66 MISSING
rows were completed later in the same sweep (the final manifest records
774 done + 6 honest skips; every authenticated role×route×bp×theme
capture exists on disk — verified). The 10 that remain absent are
`system/403` + `system/design` beyond their single 390-ink shot each;
the guest family was a @1440-paper spot-check by design (the guest
surfaces are covered by the Y4 census — 351 captures — and Y5-landing —
48 sheets). Recorded as gaps, not defects.

— verified 2026-10-31 · re-runnable: `node scripts/r325/ink-island-probe.mjs
--base http://localhost:5173 --out audits/evidence/r327/p2p6/ink-app` ·
`node scripts/r327/ink-island-reprobe.mjs` · `node
scripts/r327/student-courses-settle.mjs`
