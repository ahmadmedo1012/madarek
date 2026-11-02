# R332 — HERON TWIN · HANDOFF (lead ledger)

**Mission:** make the Madarek home page a structural / rhythm / motion **twin** of
https://heronaiapp.com/ — section by section, judged by an automated Twin harness plus a blind
3-reviewer panel — then push the same grammar into inner public + authenticated pages and
consolidate CSS to owner-named layers. The Twin is the judge; self-authored scores are void.

- **Spec of record:** `docs/redesign/r331/heron-program.json` (+ `.md`) — measured Lenis/GSAP,
  rem ladder (0.5787vw ≥992 / 1.199vw ≤991 / 2.5445vw ≤767), type ladder, trigger table.
- **Baseline:** `main` @ `39e748fe` — CI ✅ + Size gate ✅ (Actions API, R331 close-out).
- **Branches:** one — `main`. Local working branches only for repair lanes; lead merges.
- **Live local build:** vite `:5173` (shared checkout `/home/z/madarek`).

## Named defects to kill (supervisor §1, re-verified by A-Twin run-001)
1. Hero: inner framed box (~900px, window-in-window) + stray squares + caption overlaps → full-bleed.
2. Pains 390px: 4-up squeezed one row — mono labels collide, titles overlap, «الجواب:» overprints.
3. Statement 390px: ~40px headline over ~12 lines, edge-clipped — rem ladder not applied.
4. Journey: ≈45% page height pin; «الخلاصة» draws over plan's left wall; tiny room labels; half-faded
   section title; mobile plan ~300px wide with voids.
5. Post-pin: tiny low-contrast type («أربعة أوجاع», roles `[01]…[08]`, FAQ), 120–220px voids, tiny CTA.

## Operating adaptations (recorded honestly)
1. **Worktrees → shared checkout with exclusive-file ownership.** 9.9 GB disk (≈4.7 G free) cannot
   hold 14 node_modules copies (R331 postmortem: duplication blew the disk). Sub-agents never run
   git; **the lead is the only committer/pusher to `main`** (pull --rebase first, local gate, then
   Actions-API check recorded below).
2. **Heavy evidence out of git:** full-frame PNGs / videos / traces → `/home/z/evidence-r332/`
   (outside the repo). Git receives numbers, md, and ≤150 KB thumbnails. Release: `evidence-r332`.
3. **Pre-push gate:** `tsc -b --noEmit`, targeted `vitest run` contract files, `stylelint`,
   size-gate script — per changed scope.

## The Twin (A-Twin) — build first; nothing else ships without it
`scripts/twin/`:
- `driver.py` — identical input script (slow/fast wheel, touch fling, PageDown, anchor/menu clicks,
  hover paths) at 1920/1440/1024/768/390. Heron: real scroller `.main-inner` (never `window`);
  Madarek: `window.__mdrkLenis` (immediate seeks for stills, real wheel for motion).
- `capture.py` — one session, two pages (live heronaiapp.com + local :5173); at every 2% of each
  section's own progress: full-frame screenshot, DOM-geometry dump (headings/images/cells/gutters),
  computed type (size/weight/line-height/letter-spacing), best-effort GSAP/ScrollTrigger + Lenis
  state (direct introspection when exposed; computed-transform sampling otherwise).
- `report.py` — per-section Twin Report: side-by-side strip, odiff/pixelmatch heatmap, geometry
  deltas (px + %), motion deltas, **verdict vs thresholds**: section height ±3% · heading size ±4% ·
  vertical rhythm ±8px · trigger start/end ±40px · easing numerically equal.
- `blind.py` — blind-test sheet generator: two images per section, brand/text blurred, randomized
  order → sheets for A-QA-1/2/3 (independent; pass = ≤1 identifies Heron, or every named
  difference is pure content).
Loop: build → twin → fix → twin. **The Twin Report decides.**

## Ownership map (exclusive files · lead merges)
| Agent | Owns | Deliverable |
|---|---|---|
| A-Scout | `docs/redesign/r332/arsenal-delta.md` | tooling currency re-check + adoptions |
| A-Twin | `scripts/twin/**` · `docs/redesign/r332/twin/**` | harness + run reports + blind sheets |
| A-CSS | `docs/redesign/r332/css-baseline.md` (later `src/styles/**`) | baseline + consolidation plan |
| W1 Hero | `hero/Hero.tsx`, `landing/hero.css`, r331/hero.css retirement | full-bleed hero, no inner box |
| W2 Statement | statement block, `landing/statement.css` | rem-ladder display type, ≤6 lines @390 |
| W3 Pains | `#live` block, `landing/pains.css` | real grid, `min-inline-size:0`, no overprint |
| W4 Journey | `#chapters` block, `landing/journey.css` | pin length per spec, no panel overprint |
| W5 Roles/FAQ/CTA | `#roles`/`#vision` blocks, `landing/cta.css` | rhythm ladder 96/128/160, display CTA |
| W6 Footer | footer block, `landing/footer.css` | wordmark never clipped, uniform strips |
| W7 Nav/cursor | `SheetNav.tsx`, `landing/nav.css` | thresholds/menu/toggle re-verified vs Twin |
| W8 Consent | `ConsentBanner.tsx`, `landing/consent.css` | hairline corner cell, no overprint |
| W9 Scroll engine | `lib/motion/**`, Lenis wiring | one ticker, refresh gates, ≥55fps@4×, CLS<0.02 |
| W10 Inner public | public pages, `landing/inner.css` | grammar + dead links fixed |
| W11 Authenticated | role shells + top pages | density grammar, six states each |
| W12 CSS consolidation | `src/styles/**` | ≤33k lines, `!important`=0, no `rNNN-*` names |
| A-QA-1/2/3 | `docs/redesign/r332/qa/**` | blind reviews ≥9/10 with per-point reasons |

## Ledger (CI API-checked per push)
| sha | subject | CI | Size gate | note |
|---|---|---|---|---|
| 39e748fe | R331 final (baseline) | ✅ | ✅ | Actions API at R331 close |

## Tools actually used (unproven claims are void)
| tool | invoked | commit | artifact |
|---|---|---|---|
| Actions API CI check | kickoff | (this commit) | ledger row above |
| (fill per use) | | | |

## Exit criteria tracker
- [ ] Twin Report: every home section passes thresholds @1440/1024/768/390 · blind test pass
- [ ] Defects §1.1–1.5 gone with before/after proof · no overlapping text at 320–1920
- [ ] Inner public pages + each role's top pages pass reviewers ≥9/10
- [ ] CSS ≤33k lines · `!important`=0 · no per-round names · stylelint+size gates green
- [ ] CI green on last 30 commits · `docs/redesign/r332/REPORT.md` honest gaps included

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
