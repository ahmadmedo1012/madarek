# R347 REPORT-A — Lane A exit table (honest; branch wip/r347-A, 9 commits, push BLOCKED on the redacted GITHUB_TOKEN)

| criterion | state | evidence |
|---|---|---|
| detector committed + in verify | **✓** | scripts/qa/overlap.mjs (appendix + the one sanctioned adjustment: allowlist filtering for provably-intentional fixed layers) + overlap-allow.json (1 entry, written reason) + `npm run qa:overlap` + verify.sh step 6.5 (hermetic preview sweep, exit ≠ 0 on any finding) |
| detector in CI (required) | **deferred by design** | §2's own clause: "as a required step **once it is green**" — / still carries Lane B's in-flight D6/D7 findings; the verbatim step block sits commented in ci.yml for the lane that empties / (Lane Z). Never continue-on-error. |
| D1 fixed | **✓ VLM 8/10** (gate ≥8 met) | twins + A-I1 mapping deleted at the cause; pitch = computed lh; detector: statement **0**; transcript in DEFECTS-A.md |
| D2 fixed | **✓** | EdgeTab/ScrollRule/BootLog deleted; the 227-finding fixed masthead is in flow; fixed-over-text 656→44 (all residual = Lane B) |
| D3 fixed | **✓** | removed with ScrollRule (no text-free gutter existed for the edge-tick alternative — detector-proved, furniture text reaches x20–60) |
| D4 fixed | **✓ at cause; VLM 6/10 (below gate, disclosed)** | ONE calm artwork (grid/chrome/rulers/marks/deco/frame deleted, 198 bindings with them); fold holds the whole collage (27px air @1440×900, probe); ONE login; hero text-overlap probe **0**. The judge's items are kept-by-directive (in-flow nav = D2's fix and Heron's own; work strip = Heron's numbered-list anatomy; flags/texture inside the authored SVG) — and Lane B's fixed wy-cap captions still sit over the hero at scroll 0 (excluded by instruction, disclosed) |
| D5 fixed | **✓ (geometry record)** | census pull-ups retired at every band; socials 530 < strip 544 (14px seam), textOverImage **[]**; the [08]·REGISTRY overlap was the BootLog's fixed seat (D2) |
| detector = 0 on `/` @1440/768/390 × light/dark | **Lane A scope: 0 ✓** — page totals: fixedText 44 / text 400 / bigFixed 38, every finding attributed to B (wy-cap, jt-map, jt/pm) or C (product spans) | /tmp/r347/final2.json + the per-lane table in DEFECTS-A.md |
| hero VLM ≥ 8 | **6/10 — NOT met** (honest) | transcript + cross-check log in DEFECTS-A.md |
| no fixed element covers >1.5% viewport over text | **✓** | only the allowlisted sheet-frame remains (1px hairlines, pointer-transparent); every other fixed overlay is deleted |
| unit/backend/E2E counts held | **✓ with re-keys** | unit 3042→**3038** (−4 = the retired EdgeTab year test, reason D2; every other re-key listed per file); e2e r309+r308 **28/28**; backend untouched |
| bundle ≤ 770 KB gz | **✓ 760.4** | check-bundle-size PASS |
| size gate / stylelint ratchet | **✓** | `!important` 52 held (zero added), rawZ 79→71, no new infrastructure |
| conformance ratchet | **✓ re-pinned 93.1→92.2** (own commit, reasons) | give-back 0.9 ≤ 1.5, floor 91.6 held; gate **PASS** at 92.2 on the full 9×5 matrix with --scroll --interact; per-section re-keys each with its written reason (COVERAGE_FLOORS intro 37/hero 11, HEURISTIC_CAPS hero 80, coverage-review T-347, interact retirement — hero 104/104) |
| CI green | **unprovable** — push blocked (the upload pipeline redacted GITHUB_TOKEN; the owner must supply it). The conformance job is expected green at the re-pinned floor; the detector step is deferred by design | — |

## What changed (files)
`frontend/src/components/landing/{hero/Hero.tsx (rewritten), sections/{Statement,Footer-adjacent cta.css}.tsx/css, chrome/SheetNav.tsx}` · deleted: `hero/{HeroGrid,HeroChrome}.tsx`, `chrome/{EdgeTab,ScrollRule,BootLog}.tsx`, `cursor/` untouched (HeroInspect kept), `styles/landing/{boot-log,scroll-rule}.css`, `lib/progressRegistry.ts`, `tests/unit/r315-edge-tab-year.test.tsx`, `mapping/home-intro-wrap-A-I1.json` · edited: `pages/LandingPage.tsx`, `styles/landing/{nav,hero,hero-mechanics,statement,statement-ai1,consent-edge,cta,footer}.css`, `scripts/conformance/{run,interact,panel}.mjs`, `ratchet.json`, `coverage-review.json`, `mapping/home-hero-wrap.json`, `tests/audit/surface-baseline.json`, `package.json`, `scripts/verify.sh`, `.github/workflows/ci.yml` (deferred-step comment), tests re-keyed: `landing-funnel`, `r306-landing-sheet`, `r307-landing-media`, `r321-decor-innertext`, `landing-scrollspy-grain`, `r323-brand-system` · new: `scripts/qa/overlap.mjs`, `scripts/qa/overlap-allow.json`, `docs/redesign/r347/*`.

## Residuals / rollback
- Residuals on / are B/C-owned (listed in DEFECTS-A.md); the hero VLM 6/10 is capped by B's fixed wy-cap captions over the hero at scroll 0 plus kept-by-directive elements.
- Rollback: `git revert` the lane's merge (Render redeploys main); the ratchet/coverage re-keys revert with it.
- DONE-A is intentionally NOT committed (the exit table is not fully green). If the owner accepts the honest 6/10 + B-owned residuals as Lane A's finish line, DONE-A is one commit away.
