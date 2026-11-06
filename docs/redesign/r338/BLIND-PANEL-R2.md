# R338 — T-90b Blind Panel RE-RUN (honest, measurement only — no fixes)

Round: R338 · Task: T-90b · Branch: `r338/t90b-panel` · Base: `origin/main` @ c69d0625 (all 9 sections ≥90 light+dark per dispatch; NOT re-measured here — this panel is the visual check only).
Rubric: `docs/archive/redesign/r333/rubric.md` (12 criteria, 0–10 integers, anchors 3/6/9). Round-1 comparison: `docs/redesign/r338/BLIND-PANEL.md` (base ba88d910).

## Method note (honest)

- Served the worktree on `localhost:5390` (vite dev, strictPort). Playwright chromium (PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers, chromium-1200 symlink per ADDENDUM 3). 40 PNGs: 9 sections × light/dark × 1440/390 (scrollIntoView + 2×900ms settles) + 4 reshoots of `home-intro-wrap` + 4 of the CTA sheet.
- **Selector drift caught:** mapping `home-intro-wrap` still says `section#statement.st-section`; the DOM at c69d0625 renders `section.st-band` (mapping key stale vs landed code — flagged for the section owner). All other 8 keys' selectors resolved.
- **Theme:** the site's own segmented control exists at 1440 (`.theme-toggle-option` "داكن" → `html[data-theme=dark]`, verified by click). At 390 the toggle is **not present in the DOM** ("no-toggle-visible" — same as round 1), so dark@390 was applied by setting the same `html[data-theme=dark]` attribute the toggle sets; applied-state verified per run. Dark shots differ from light at byte level in every cell (no duplicated cells this round).
- **Scoring method: programmatic** (no human image viewer in this harness): in-page ComputedStyle + WCAG contrast (corrected after a first-pass alpha-blend bug — first-pass per-section counts discarded, re-measured), PNG byte/geometry stats, in-DOM media census (img naturalWidth, svg sizes, innerText), static CSS census via rg over `frontend/src` (302 `:hover` · 84 `:focus-visible` · 93 `:active` · 110 `prefers-reduced-motion` · 16 distinct cubic-beziers, 4 overshoot · durations tokenized `--motion-duration-*`), console capture (0 errors in all 4 runs).
- **Protocol deviation (same cap as round 1 for comparability):** no frame sequences/video captured → motion criteria (#6/#7) judged from code+static evidence only and capped low; stills did not move them.
- **Scroll-jump caveat:** jump-to + 2 settles under-advance scrub-driven reveals — `why`@1440 (16KB shot despite 8 loaded photos 2880×1740/720×450 + 1 large SVG) and `cta` (9KB/1332px + sheet 30KB/698px, no innerText at capture) read thinner than a human scroll-through would show. Flagged, not double-penalized.

## Scores (12 criteria, rubric order) — round-1 → round-2

| # | criterion | R1 | R2 | Δ | one-line justification (evidence) |
|---|-----------|----|----|---|-----------------------------------|
| 1 | composition | 5 | **6** | +1 | All 9 sections stage real content at 1440+390 both themes (hero 279K/963px, intro 414K/723px, platform 233K, map 192K/6516px, footer 370K); why@1440 + cta render thin at jump-to capture (scrub caveat) and only 2 viewports sampled — solidly at 6, not 9. |
| 2 | typography_craft | 5 | **5** | 0 | Single family (IBM Plex Sans Arabic) still does everything; display lh=1.0×fs persists on platform/map/usecase headings (measured lhRatios [1,1,1]/[1,1.3]/[1]) while 6/9 sections honor the 1.35 ar-floor — below anchor-6 "type system". |
| 3 | spacing_rhythm | 5 | **5** | 0 | Cadence/no-overflow fixed vs R1 (0px horizontal overflow at 390 on all 9; healthy heights 807–1239px) but mobile inline clearance is 7–8px on 8/9 sections (why 1px, map 24px) — misses anchor-6's ≥16px mobile edge bar. |
| 4 | imagery | 5 | **6** | +1 | Authored inline-SVG line-art + real product crops (why carries 8 genuine photos 2880×1740/720×450, 23 SVGs), no stock/filler visible, one treatment language; cta visually thin at capture — at 6, not 9. |
| 5 | storytelling | 6 | **6** | 0 | 9-section arc intact (statement→live→why→product→journey→roles→vision CTA), journey large on mobile (4655px@390), intro statement rich (302 chars + 6 img + 5 svg); "stranger narrates back" and CTA loop unverifiable without panel viewing — 6 held. |
| 6 | motion_quality | 4 | **4** | 0 | CAPPED (no sequences — same deviation/cap as R1): static census shows durations tokenized (`--motion-duration-*`) but 16 distinct cubic-beziers incl. 4 overshoot curves — still more than "one easing vocabulary". |
| 7 | scroll_feel | 5 | **5** | 0 | Lenis wired (`lenis` in DOM, body overscroll `auto none`), no dead zones/overflow at 390; pin economy unmeasured (map pin 6516px@1440), no sequence evidence, WebKit host-blocked — between 3 and 6. |
| 8 | micro_interactions | 6 | **6** | 0 | 302 `:hover` · 84 `:focus-visible` · 93 `:active` · 110 `prefers-reduced-motion` blocks, tokenized durations — one vocabulary at anchor-6 coverage; delight-level (#9) unprovable without interaction sequences. |
| 9 | density_contrast_legibility | 3 | **4** | +1 | Light nearly clean (1 fail page-wide: login link rgb(250,54,0) 3.46:1 @13.3px on cream) but **dark still carries ≥6 invisible 1.0:1 labels** (rgb(40,40,40) on rgb(40,40,40): "تسجيل الدخول", "أنشئ حسابك", "لتجربها حيّة", "ابدأ بجلسة", "محاضرة حيّة الآن", "صفحة القدرات") and the intro statement headline measures ~1.9:1 (rgb(180,180,176)/cream, 33.3px — persists from R1, visibility-unverified flag) — anchor-3 dark clause persists, narrower. |
| 10 | consistency | 6 | **7** | +1 | The R1 in-flight divergence is resolved — all 9 sections landed on one instrument/token system (why/footer/cta/map merged; check-colors gate enforced); inner pages + role dashboards not sampled this run — between 6 and 9. |
| 11 | arabic_rtl_craft | 6 | **6** | 0 | `dir=rtl` + `lang=ar` page-wide, native Arabic family, ar lh-floor honored on 6/9 sections' display type (1.35 measured), but platform/map/usecase display lh 1.0 and letter-spacing residual unmeasured — 6 held. |
| 12 | polish_finish | 5 | **6** | +1 | Console clean in all 4 runs, fonts `loaded` (no flash observed in-shot), zero 390 overflow, dark@390 evidence valid this round; theme toggle absent from DOM at 390 (residual), WebKit host-blocked, frame pacing unmeasured — at 6. |

**Totals: R1 58 → R2 66 (+8).** Deltas: composition +1 · imagery +1 · density +1 · consistency +1 · polish +1 · all others 0.

## Honest summary

- **What actually moved (measured):** the R1 "in-flight" sections are no longer blank — intro is a rich 414KB statement band, why carries real photography, map/journey holds 6516px@1440 and 4655px@390, footer 370K; light-mode body contrast is now 1 fail page-wide (was: 1.92:1 headings + broad fails); no horizontal overflow anywhere at 390; console clean across all runs.
- **What did not move (measured):** dark-mode invisible ink (≥6 labels at 1.0:1) survives on problem/platform/login surfaces despite all-dark-instrument ≥90 — these labels sit outside the instrumented spec cells; display line-height 1.0 on 3 sections; mobile 7–8px edge clearance; motion vocabulary plurality (16 beziers); dark toggle unreachable at 390.
- **Method artifacts to keep in mind:** jump-to screenshots under-settle scrub reveals (why@1440, cta) — a human scroll-through would show more; motion/scroll scores remain capped by the no-sequence deviation (same cap as R1, kept for comparability).
- **Weakest 3 (next levers):** #9 dark ink (invisible labels — the only sub-5 besides capped #6), #6 motion (capped; needs sequence evidence + bezier consolidation), #3/#2 (7–8px mobile edge + lh-1.0 display type on 3 sections).
- Raw evidence: `/tmp/t90b-shots/{light,dark}-{1440,390}/*.png` (40), `/tmp/t90b-evidence.json`, `/tmp/vite-t90b.log`. No code was modified (measurement-only task).
