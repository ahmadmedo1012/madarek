# R314 — PARITY (VISUAL TRUTH) · cycle 2

**Score: 56.6 / 100** (cycle-1 close: 43.9 — baseline at program start: 0)
**DIFFS.json: 29 desktop pairs · 27 open (0 closed) · 2 deferred-quota** · pixel judge: 58 pairs (1440×900 + 390×844, light)

> **Judge recalibration LANDED (v2-text-masked):** the cycle-1 VLM floor is
> retired. Both sites now go through the SAME DOM-greeking masker
> (`scripts/r314/vlm-mask.mjs` — per-line bars of each text node's own colour
> + a transparent-text CSS net; Madarek re-captured LIVE section-relative,
> Heron from the single drift-proven pass, disclosed in the script header),
> and the prompts state the neutralized categories (text, RTL mirroring,
> artwork subject, brand marks) as hard rules. **Calibration ladder passes
> before any run is trusted** (`vlm-judge.mjs --calibrate`): self-pairs →
> MATCH (proves MATCH is reachable), trap-pairs → DIFFERENT (proves the
> judge is not lenient) — `_local/vlm-calibration.json`. Residual limits,
> disclosed: Heron's cookie banner / award badge / artwork-baked text stay
> readable (outside the DOM text layer) and the prompt forbids judging any
> surviving text; 2 footer pairs are **deferred-quota** (sustained 429s on
> the shared glm-5v-turbo quota — `--cached-only` merge, excluded from the
> VLM fraction, not scored as open).

## What cycle 2 closed (direct probes, evidence in worklog + commits)

| Row | Item | Evidence |
|---|---|---|
| V1/V3/V6/V9 heights | **Every desktop section now within ±1 px of the reference**: hero 887/887 · pm 743/743 · why 680/681 · cta 698/698 · footer 712/711 · docH 12 470 / 12 338 (+1.1%) | capture meta re-measured @930258a; head area-grids + 3-band footer colophon |
| V4 map share @390 | **29% → 42.1%** (reference 42.4%): camera windows re-proportioned 480×500 w/ next-zone previews, 48svh frame, equal 64svh stage bands (traversal 774→2209px); .chapters 4813 vs reference-live 4819 | @ea4d01c |
| V13 mobile distribution | **docH@390 = 11 430 vs reference-live 11 363 (+0.6%)**; every section ±5% of the live mobile reference (hero 826/828 · pm 857/869 · pr 538/517 · wy 825/806 · rl 982/948 · cta 512/500 · footer 1256/1239); fixed pre-existing V13 footer-sliver + pr-caption-fold bugs | fresh Heron mobile capture (2nd live load, `_local/captures/heron/390x844/`) @ea4d01c |
| V14 loader frames | Counter re-pinned to the reference's frame-captured beats: quiet boot ≤~1.0s (measured 995ms), crawl, 60% plateau, **100%@5.36s vs ref 5.65s** (±250ms sampling), exit window ≈ ref 6366–7201; draw ladder spreads across the whole run (ref's own 88% beat) | @5cf6653 + motion re-measure |
| V15 cursor | 10px square (r313 pixel-read: 10×10 bbox, 100 opaque px, solid #FA3600); ground-plate retired (was reading as 13px); ring 2.8rem w/ measured #FC724D border | @5cf6653 |
| V16 coverage | **40/40 public-page probes PASS** (10 routes × 2 viewports × 2 themes — no blanks, 0 pageerrors) + landing pair-judged at both viewports | `_local/pages-smoke.json` |
| Production | **madarek.onrender.com live-verified**: latest code deployed (docH matches HEAD exactly), consent accept/reject, dark toggle, mobile in band, 0 console/page errors, VLM: fully rendered no defects | worklog task 1 + `_local/prod/` |
| Red team | **7/7 adversarial checks hold**: consent purge honesty, heights at untested windows (1366/1920), content survival (H1 copy, aria newsletter seat, 14 footer links), map camera sync 16/16, stage flips 0–3, no test skips/loosening in cycle-2 diffs | `_local/redteam.json` |

## Pixel judge (58 section-aligned pairs, 2 viewports, light)

- desktop 1440×900: worstRegionAvg 0.709 · globalAvg 0.152 · dEpaperAvg 2.77
- mobile 390×844: worstRegionAvg 0.711 · globalAvg 0.234 · dEpaperAvg 3.89
- Worst regions remain the hero artwork (subject differs — permitted), the
  map (plan topology is Madarek's own), and the intro/statement section
  (Heron carries a large line-art illustration where Madarek's statement is
  list-structured — a REAL open compositional difference, queued).

## VLM judge (v2-text-masked, 27 judged desktop pairs)

- 0 MATCH / 27 DIFFERENT, but **severity-scores rose from cycle-1's ~15 to
  25–59** (avg ≈40): partial credit now reflects genuine compositional
  distance instead of the RTL artifact. VLM component 25 → **40.7**.
- Honesty guard: the ladder's traps stay DIFFERENT, and the surviving opens
  carry real compositional reasons (hero subject/framing, intro
  illustration-vs-list, map topology).
- **Deferred-quota (2 pairs, footer s08-50/s08-100):** sustained 429s;
  excluded from the fraction until the quota clears (`vlm-judge.mjs` re-run
  completes them from cache + 3 live calls).

## Section geometry (target = reference live)

**Desktop 1440×900** — hero 887/887 ✓ · intro 720/723 ✓ · problem 743/743 ✓ ·
map 6439/6300 (+2% ✓) · platform 711/710 ✓ · why 680/681 ✓ · usecase 882/887 ✓ ·
cta 698/698 ✓ · footer 712/711 ✓ · **docH 12 470 / 12 338 (+1.1%)**

**Mobile 390×844** (fresh live reference capture) — hero 826/828 ✓ ·
intro 821/837 ✓ · problem 857/869 ✓ · map 4813/4819 ✓ (share 42.1%/42.4%) ·
platform 538/517 (+4.1%) · why 825/806 (+2.4%) · usecase 982/948 (+3.6%) ·
cta 512/500 (+2.4%) · footer 1256/1239 (+1.4%) · **docH 11 430 / 11 363 (+0.6%)**

## Score components

vlm 40.7 (×30) — v2 calibration, 2 deferred · pixel 43.7 (×20) — 58 pairs ·
census 41 (×15) — carried r313 · motion 78 (×15) — loader re-measured
(V14 beats), route/lenis carried · behaviour 90 (×10) — consent 26/26,
funnel intact, gates 0-error · coverage 88 (×10) — 1 full + 1 pixel-only
pair-combo of 2, pages-smoke 40/40.

## Top open items (cycle 3 queue, worst-first)

1. **V-statement (intro §5.2)** — Heron's intro carries a large line-art
   illustration; Madarek's statement is list-structured. The biggest REAL
   compositional gap the v2 judge surfaced (scores 45–59).
2. **V16 remaining depth** — mobile VLM pairs (needs a 3rd Heron live load
   for DOM-greeked mobile crops — quota + third-party-load policy), dark-theme
   pair judging (Heron is light-only — may be structurally impossible),
   authed-surface quality belt.
3. **V10 header cell grammar** — still open from cycle 1 (exact cell
   grammar + mobile ticker row).
4. **V7 usecase grid crops wiring** — crops exist, wiring not judged.
5. **Deferred-quota pairs** (2) — complete when the shared quota clears.
6. **Backend/e2e/audit suites** — same deferred set as cycle 1 (capacity).

## Gates this cycle

`npm run lint` 0 errors (16 pre-existing warnings) ·
`tsc -b --noEmit` (frontend) 0 · **vitest 2531/2531** (cycle-2 re-pins
carry `R314 cycle-2 override` notes: r308 loader curve, r312 mobile camera) ·
check:icons OK · check:colors OK (25 allow-comments) ·
check:motion-tokens OK · **red team 7/7** · production live-verified.
