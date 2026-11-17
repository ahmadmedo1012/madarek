# R366 · Agent 3 · Design System — CHECKLIST

Branch `agent/r366-design-system` · owner Ahmed · records in this folder.
A box is ticked ONLY with proof on the same line (command + output / metric
before→after / artifact path). "Pushed" is not done; "executed and
measured" is done.

## L0 — EARLY deliverables
- [x] `docs/DESIGN-COPY-GUIDE-AR.md` written (the Arabic microcopy standard: verbs, patterns, glossary, formats, tone, never-cut list) — proof: docs/DESIGN-COPY-GUIDE-AR.md · commit 733de894 (pushed)
- [x] Token ADDITIONS (semantic state/surface/border colours, elevation steps, motion, z-ladder) + `TOKENS-CHANGELOG.md` — proof: `npm run tokens:build` → "✔ tokens:build — PASS (9 triads · 41→43 semantic seats)" + `npm run tokens:check` PASS · commit de396c7d

## L1 — Colour & contrast to a provable standard
- [x] Token-pair audit script computes EVERY text/surface/border pair in light, dark AND `prefers-contrast: more` with WCAG 2.2 AA AND APCA Lc — proof: `node scripts/gates/color-audit.mjs` → "swept 768 pairs · 764 pass · 0 FAIL · 4 exempted (named) · 19 reported"; artifact audits/evidence/r366/color-audit.json (APCA: body Lc 96, muted 75, faint 73, accent-ink-on-soft 64)
- [x] Failing pairs fixed at token level (before→after ratios listed); the Heron seat exemption stays named + measured — proof: 10 fixes committed 90432f23 — accent-ink 4.48→4.74, text-faint-dark 4.24→4.83, peach/rose ink 2.86/2.80→3.30/3.23, sand ink 2.33→3.50, danger-fg 4.42→4.78, chart-1 deutan 2.91→3.20, chart-4 deutan 2.76→5.70 (ΔE vs series1 5.4→23.9), chart-7 ΔE 7.1/8.6→20.5/25.2, NEW --input-border seats 2.1→4.83 (light); audit re-run 0 FAIL
- [x] `scripts/r323/contrast-gate.mjs` extended to disabled / error / selected / read-only states (+ overlays/scrims, chart CVD, text-on-image at token level in color-audit.mjs) — proof: gate run "verdict: PASS — 0 findings over 774 samples"; meta.states = default,hover,active,focus-visible,disabled,read-only,error,selected; stateHistogram {default:184,hover:184,active:184,focus-visible:184,disabled:14,read-only:8,error:8,selected:8}
- [x] APCA Lc reported alongside WCAG per finding + in the audit artifact — proof: color-audit.json rows carry ratio+lc (e.g. text×bg Lc 96); contrast-gate.json rows carry apcaLc; commit de0cbfaf
- [x] Dark-mode completeness: elevation by surface steps, `color-scheme` set, selection/scrollbar styled, borders visible, no pure #000/#FFF seats — proof: color-scheme light/dark in base.css:34/40; ::selection polish.css:2454 (token-aware); scrollbar via --scrollbar-thumb tokens (polish.css:2459+); dark text=#F6F6EE/bg=#282828 (audit, no #000/#FFF); input boundary dark neutral-400 3.13:1 on surface-3 (was 2.93); token audit dark rows 0 FAIL

## L2 — Typography & fonts (Arabic-first, measured)
- [x] `docs/TYPOGRAPHY.md` — type scale, Arabic line-heights, no letter-spacing on Arabic, word-spacing, tashkeel rule, numeral policy, truncation, `text-wrap`, mono gutter index — proof: docs/TYPOGRAPHY.md · commit ad5c9509
- [x] Font strategy numbers: 3 OFL alternatives measured (Readex Pro/Cairo/Rubik arabic subsets + line-box metrics via fontTools), preload census (88.5KB critical, budget 120), fallback belt with ascent/descent-override (Plex 108.5/41.5, Alexandria 96.8/25.1) — proof: scripts/gates/cls-probe.mjs → font-attributed CLS 0.0002 on `/` (budget 0.02), /auth 0.0118 PASS; table in TYPOGRAPHY.md §1
- [x] Applied: fallback faces wired in fonts.css; sweep: 219 font-size declarations in owned sheets — 207 tokenised, 12 documented type-gate allows (zero new raws); stress: scripts/gates/type-stress.mjs → 36 probes (4 widths × 3 scales × 3 routes) 0 overflow; contact sheet docs/redesign/r366/agent3-design-system/shots/CS-TYPE-1.png

## L3 — Component library & states
- [x] `/__design` matrix completed: read-only digest specimen (readOnly field + the --surface-sunken well) + aria-selected chip row inside the first viewport band — proof: contrast-gate stateHistogram read-only:8 selected:8; commit de0cbfaf
- [x] Playwright suite frontend/tests/design-lab/lab.spec.ts — 27 tests over 4 matrix cells: structure (17 sections), type floor, radius discipline, focus ring, disabled honesty, 44px touch floor, theme flip + 68 deterministic baselines — proof: `npx playwright test --project=design-lab` → 27 passed, exit 0 (update AND assert modes); the suite FOUND and FIXED 4 real defects (lab chrome floors, .pill 37px→44px coarse, LedgerRow subtitle 11.1px→13px, the readonly-well size)
- [x] Root fixes: .pill joins the coarse 44px floor via --touch-target (measured 37px by the new suite); the ONE focus ring asserted ×4 cells; hover-guard: own finding fixed (patterns.css:1446 twin split, 49→48), the remaining 48 live in other agents' files → REQUESTS-agent3-to-{1,4,2}.md with per-file lists + the two recipes — proof: node scripts/r320/hover-guard-lint.mjs (48, zero owned)
- [x] Hygiene counters before→after: importantDeclarations 41→41, rawZIndex 68→68, rawHex 29→29 (HELD — zero new raw values across ~600 added lines of gates/tokens/tests; baseline never re-pinned) — proof: node scripts/gates/css-counts.mjs + stylelint-gate ratchet green

## L4 — Mobile token parity & copy enforcement
- [x] Parity test web ↔ tokens.generated.ts (24 colour seats × 2 themes, 19 spacing rungs, radius, 9 motion rungs + ease) — proof: node scripts/tokens/parity.mjs → PASS; negative --self-test → exit 1
- [x] Copy gates: copy-budget.mjs --style [report|enforce] — the 10 machine-checkable rules of DESIGN-COPY-GUIDE-AR.md §7; owned findings fixed (DesignPage specimen titles, SplitView empty-state title); enforce PASS on design-system files; census 35 findings in other agents' files → appended to REQUESTS — proof: --style enforce → design-system files clean; budget mode CLEAN (ceilings untouched)

## L5 — Closing
- [x] Gates green (baseline shifts listed), contrast table before→after, font numbers, contact sheets ≤ 40, DELIVERY.md written, branch pushed — proof: DELIVERY.md (the full gate table re-run after the last commit: tokens:check/parity PASS · color-audit 0 FAIL · contrast-gate PASS 758 samples · design-lab 27/27 · unit 3155/3155 · lint 0 errors · stylelint ratchet green · copy-style enforce clean · type-stress 0 overflow · font-CLS 0.0002); completeness audit re-ran 6 evidence commands, all green

## L6 — The owner-ordered audit pass (commit f323ce16)
- [x] Every claimed gate re-executed — three real defects found and root-fixed — proof: typecheck:tests was RED (TS18046 x4, the DELIVERY's "typecheck clean" claim was wrong for the tests project) → typed LabProbe, full typecheck green; the design-lab screenshots were nondeterministic (Lenis on /__design ignoring CDP scrolls mid-glide + the total 0px→175px readout re-wrap + the fixed banner/fab occluding other sections' captures, 100% template match) → SPECIMEN_SURFACE_PREFIXES in App.tsx + the settle-wait + the hide/show contract in the spec; all 68 baselines were stale-contaminated (the banner's 0.39% diff sat under the 0.02 ratio, so update mode never rewrote) → regenerated clean via the full-invocation compare path and template-scanned (zero signatures in [01..16])
- [x] The full gate belt re-run green — proof: design-lab 27/27 ×2 consecutive full runs · unit 3155/3155 + backend 2658 · typecheck + eslint 0 errors · stylelint ratchet green (41/68/29 held) · tokens:check/parity PASS · color-audit 0 FAIL · contrast-gate PASS · copy gates clean · type-stress 36/36 · cls-probe 0.0204 unchanged (Agent-2's, R1) · hover-guard 48 unchanged (other agents', by design)
