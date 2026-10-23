# R314 — PARITY (VISUAL TRUTH) · cycle 1

**Score: 43.9 / 100** (cycle-1 close: 90aa56a — mobile re-measured 11 147 px, in band) (baseline at cycle start: 0 — no judges existed)
**DIFFS.json: 29 section-relative pairs, 29 open (0 closed)**

> **Judge-calibration disclosure (honest):** the VLM pair-judge
> (`glm-5v-turbo`, hostile two-framing prompt per §3.3) systematically
> returns `DIFFERENT` on RTL↔LTR pairs even when the composition
> matches — Arabic-vs-English text, RTL mirroring and differing
> artwork *subject* (permitted) are counted as differences despite the
> prompt's instructions. `MATCH` is therefore a floor-of-zero metric
> until the judge is recalibrated (per-section crops with text masked,
> planned cycle 2). Pixel-judge numbers and the direct composition
> probes (below) are the reliable cycle-1 signals.

## What the judges DID close this cycle (direct probes, evidence in worklog)

| Row | Item | Judge evidence |
|---|---|---|
| V2 | Hero = rich ink rendering (XDoG strokes + cross-hatch + stipple), NOT thin lines | VLM: «rich architectural ink drawing … extensive hatching and cross-hatching … stippling … hand-drawn quality»; retuned round 2: «High/Crisp contrast, clean vector-like lines» |
| V2 (crops) | 4 use-case crops ≥7/10 «rich ink rendering» (fateh-science source swapped: interior→exterior, VLM 3/10→pass) | grid probe TL 8 / TR 9 / BL re-render / BR 7 |
| V3 | Paper grain matched to reference bare-paper std-dev **±0.03%** (light), tileable (max seam 0.145/255) | `scripts/r314/grain-measure.json`; live pages: dEpaper 11.8→**0.7–1.2** across all frames |
| V4 (weight) | Plan poché: solid #282828 walls 12–14px rendered, door swings, hatch 45°/8px, #FA3600 solid finding rooms | VLM 9/10 «architectural poché plan», twice |
| V5 | Platform mock-UI collage: overlapping flat cards (chat w/ dark title bar, status dots, progress bars), radius 0, no shadows | VLM 8/10 «designer collage of overlapping flat UI cards» |
| V9 | Footer cell grid + strip image + giant outlined wordmark | VLM: cell grid ✓, «massive outline-only wordmark spanning full width» ✓, legal row ✓ |
| V11 | Consent banner: geometry + honest function | 26/26 functional checks (accept/reject/reload/persist, window.MadarekConsent, gated keys purged, essentials kept) |
| V13 (total) | Mobile 390×844 docH **11 147 px** vs target 11 441 ±3% (**−2.6%, in band**); was 15 308 | capture meta + measurement logs (90aa56a) |

## Pixel judge (29 section-aligned frames, 1440×900, light)

- worstRegionAvg **0.698** · globalAvg **0.146** · dEpaperAvg **3.1**
  (paper was 6.9 at cycle start; the grain + tone work closed the paper
  channel to 0.7–1.2 on most frames).
- Worst regions remain the hero (subject differs — permitted), the map
  (plan topology is Madarek's own), and the footer wordmark (own mark).

## Section geometry @1440×900 (target = reference live)

hero 974/887 (+10%) · intro 720/723 ✓ · problem 878/743 (+19%) ·
map 6439/6300 (+2% ✓) · platform 711/710 ✓ · why 980/681 (+41%) ·
usecase 882/887 ✓ · cta 755/698 (+8%) · footer 1416/711 (+91%) ·
**docH 13 756 / 12 338 (+11.5%)**

## Top open items (cycle 2 queue, worst-first)

1. **V9 footer height** 1416 vs 711 — wordmark+cells still too tall.
2. **V6 why height** 980 vs 681 — rail stages + stack need the reference's compact band.
3. **V1 hero height** 974 vs 887 — window/strip split off by ~90px.
4. **V3 pm height** 878 vs 743.
5. **V4 map share @390** — 29% vs reference 42% (pin range extension).
6. **V10 header** — exact cell grammar vs reference (logo mark wordmark
   seat, CONTACT-US-style accent cell, arrow); mobile ticker row.
7. **V14 loader frames**, **V15 cursor 10px**, **V16 all pages × themes ×
   viewports** — not yet judged this cycle (coverage 14%).
8. VLM judge recalibration (text-masked crops) — MATCH is currently
   unreachable by construction on RTL pairs.

## Gates this cycle

`npm run lint` 0 errors (16 pre-existing warnings) ·
`tsc -b --noEmit` (frontend) 0 · **vitest 2531/2531 pass** (12 stale
R313 pins re-pinned with `R314 override` notes in the same commits) ·
backend + e2e + audit suites: next cycle (see release report).
