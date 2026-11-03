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
| 298dbb7e | r332 kickoff scaffold | ✅ 11/11 (lint·typecheck·build·unit×2·db·e2e·e2e-ios·design·surface·size) | ✅ | API-checked check-runs |
| 8b624ad0 | arsenal delta + css baseline + twin harness v0 | ✅ 11/11 | ✅ | API-checked |
| 43620711 | twin run-001 verdicts + defect confirmation | ✅ 11/11 | ✅ | API-checked |
| 0d5dce20 | landing.css→per-section sheets; W1 hero full-bleed; gates re-keyed | ✅ 12/12 | ✅ | API-checked |
| dc68420d | W2+W3 twin-PASS; W4/W5/W6 dissolution partials | ⚠ E2E flake→rerun ✅ 12/12 | ✅ | runner-load timeout (r309 drag), local greens ×2, flake named |
| bd55775c | W5c why PASS; W4c+W6c display rungs — all 9 in threshold @1440 | ✅ 12/12 (rerun; first run auto-cancelled) | ✅ | API-checked |
| d90eff11 | W7/W8/W9/W10a/W10b (re-landed post-reset) | ⚠ E2E flake→rerun ✅ 12/12 | ✅ | distinct test (r305 active-mark), same signature; flake named |
| 152d06a7 | W390a/W390b phone tier | ✅ 11/11 | ✅ | API-checked |
| ccfeab7b | HANDOFF ledger update | ✅ 1/1 (size) | ✅ | docs-only |
| 133e2afc | REPORT.md draft | ✅ 1/1 (size) | ✅ | docs-only |
| 7947a735 | blind panel runs 1-2 verdicts | ✅ 12/12 | ✅ | API-checked |
| de9e0d7e | BLIND PANEL PASSED 3/3 INDISTINGUISHABLE | ✅ 12/12 | ✅ | API-checked |
| 220d7530 | W12a renames complete + W11 dashboards | ⚠ E2E flake → rerun (3rd occurrence, same canary r309 drag, load-correlated, local green ×3) | ✅ | named per rules |

## Tools actually used (unproven claims are void)
| tool | invoked | commit | artifact |
|---|---|---|---|
| Actions API CI check | kickoff | 298dbb7e | ledger row 11/11 ✅ |
| Python Playwright (chromium) twin harness | run-001 | 8b624ad0 | 9 sec × 51 fr × 2 sides @1440 + 3 sec @390 → report.json/md |
| PIL (thumbnails + mean-diff) | run-001 | (this commit) | 8 thumbs ≤150KB in twin/thumbs/ |
| eyes-on frame review (Read) | run-001 | (this commit) | hero inner-box + statement-390 confirmed |
| npm registry + GitHub API currency scan | A-Scout | 8b624ad0 | arsenal-delta.md |
| stylelint@16 -f json census | A-CSS | 8b624ad0 | css-baseline.md (78e/104w) |
| twin capture/report ×6 runs | run-001→003 + w390a-e | 43620711→152d06a7 | per-section verdicts, all-9 @1440 in threshold |
| Vite dep re-optimization (vite --force) | W10a | d90eff11 | /auth Invalid-hook crash cleared (dev-server graph, not product) |
| environment reset ×2 recovery | — | d90eff11, 152d06a7 | clone+install+server in ≈5 min; zero committed work lost |

## Twin run-001 verdicts (judge — full numbers in `twin/run-001.md`)
1440 PASS-side: heights hero/pains/roles/platform/journey/cta ≤0.45% Δ; hero fs identical.
1440 FAIL: statement (h 5.33% · fs 24.1%) · journey fs 66.7% · platform fs 66.7% · why (h 10.18% ·
rhythm 24px) · cta (rhythm 20px · trigger 58px) · footer h 24.14% · roles trigger 58px.
390 FAIL: statement h +39.8%/fs 2× (1408 vs 847px) · pains 4-up squeezed to 74.5px cols ·
journey fs 2× + 555px trigger cascade. Hero inner-box confirmed eyes-on.
**Wave 1 = W1–W6 CSS-first against these targets (see run-001.md table).**

## Exit criteria tracker
- [ ] Twin Report: every home section passes thresholds @1440/1024/768/390 · blind test pass
- [ ] Defects §1.1–1.5 gone with before/after proof · no overlapping text at 320–1920
- [ ] Inner public pages + each role's top pages pass reviewers ≥9/10
- [ ] CSS ≤33k lines · `!important`=0 · no per-round names · stylelint+size gates green
- [ ] CI green on last 30 commits · `docs/redesign/r332/REPORT.md` honest gaps included

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
