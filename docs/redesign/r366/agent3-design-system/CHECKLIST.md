# R366 · Agent 3 · Design System — CHECKLIST

Branch `agent/r366-design-system` · owner Ahmed · records in this folder.
A box is ticked ONLY with proof on the same line (command + output / metric
before→after / artifact path). "Pushed" is not done; "executed and
measured" is done.

## L0 — EARLY deliverables
- [x] `docs/DESIGN-COPY-GUIDE-AR.md` written (the Arabic microcopy standard: verbs, patterns, glossary, formats, tone, never-cut list) — proof: docs/DESIGN-COPY-GUIDE-AR.md · commit 733de894 (pushed)
- [x] Token ADDITIONS (semantic state/surface/border colours, elevation steps, motion, z-ladder) + `TOKENS-CHANGELOG.md` — proof: `npm run tokens:build` → "✔ tokens:build — PASS (9 triads · 41→43 semantic seats)" + `npm run tokens:check` PASS · commit de396c7d

## L1 — Colour & contrast to a provable standard
- [x] Token-pair audit script computes EVERY text/surface/border pair in light, dark AND `prefers-contrast: more` with WCAG 2.2 AA AND APCA Lc — proof: `node scripts/r323/color-audit.mjs` → "swept 768 pairs · 764 pass · 0 FAIL · 4 exempted (named) · 19 reported"; artifact audits/evidence/r366/color-audit.json (APCA: body Lc 96, muted 75, faint 73, accent-ink-on-soft 64)
- [x] Failing pairs fixed at token level (before→after ratios listed); the Heron seat exemption stays named + measured — proof: 10 fixes committed 90432f23 — accent-ink 4.48→4.74, text-faint-dark 4.24→4.83, peach/rose ink 2.86/2.80→3.30/3.23, sand ink 2.33→3.50, danger-fg 4.42→4.78, chart-1 deutan 2.91→3.20, chart-4 deutan 2.76→5.70 (ΔE vs series1 5.4→23.9), chart-7 ΔE 7.1/8.6→20.5/25.2, NEW --input-border seats 2.1→4.83 (light); audit re-run 0 FAIL
- [x] `scripts/r323/contrast-gate.mjs` extended to disabled / error / selected / read-only states (+ overlays/scrims, chart CVD, text-on-image at token level in color-audit.mjs) — proof: gate run "verdict: PASS — 0 findings over 774 samples"; meta.states = default,hover,active,focus-visible,disabled,read-only,error,selected; stateHistogram {default:184,hover:184,active:184,focus-visible:184,disabled:14,read-only:8,error:8,selected:8}
- [x] APCA Lc reported alongside WCAG per finding + in the audit artifact — proof: color-audit.json rows carry ratio+lc (e.g. text×bg Lc 96); contrast-gate.json rows carry apcaLc; commit de0cbfaf
- [x] Dark-mode completeness: elevation by surface steps, `color-scheme` set, selection/scrollbar styled, borders visible, no pure #000/#FFF seats — proof: color-scheme light/dark in base.css:34/40; ::selection polish.css:2454 (token-aware); scrollbar via --scrollbar-thumb tokens (polish.css:2459+); dark text=#F6F6EE/bg=#282828 (audit, no #000/#FFF); input boundary dark neutral-400 3.13:1 on surface-3 (was 2.93); token audit dark rows 0 FAIL

## L2 — Typography & fonts (Arabic-first, measured)
- [ ] `docs/TYPOGRAPHY.md` — type scale, Arabic line-heights, no letter-spacing on Arabic, word-spacing, tashkeel rule, numeral policy, truncation, `text-wrap`, mono gutter index — proof: file path + SHA
- [ ] Font strategy numbers: current-family audit vs 2–3 OFL alternatives (legibility 12–16px, weights, pairing), subset census, preload, metric-compatible fallback with `size-adjust`/`ascent-override`, payload ≤ 120 KB critical, CLS target — proof: numbers table in `docs/TYPOGRAPHY.md` + measurement script output
- [ ] Applied: fallback metrics wired in `fonts.css`; hard-coded font sizes/line-heights swept in owned sheets; stress pass (long words, mixed RTL/LTR, 130 %/200 %) — proof: before→after counter + screenshot contact sheet

## L3 — Component library & states
- [ ] `/__design` matrix completed for missing states (disabled, error, selected, read-only, loading) — proof: section list diff or rendered lab output
- [ ] Playwright component-level suite `frontend/tests/design-lab/` (deterministic screenshots, component × state × light/dark × RTL) — proof: `npx playwright test tests/design-lab` exit 0 + artifact count
- [ ] Root fixes: touch targets ≥ 44 px coarse, one focus-ring style never clipped, hover-guard real issues fixed / legit twins documented — proof: lint output before→after
- [ ] Hygiene counters before→after (raw values, `!important`, raw z-index, duplicate/dead CSS, stylelint) — improve or hold, never raise — proof: counters table

## L4 — Mobile token parity & copy enforcement
- [ ] Parity test web ↔ `tokens.generated.ts` (colour/spacing/radius/type/motion) fails on drift — proof: `node scripts/tokens/parity.mjs` PASS output + forced-drift negative test
- [ ] Copy gates strengthened with machine-checkable style rules (title ≤ 4 words, helper ≤ 12, button ≤ 2, double spaces, banned fillers) — report mode numbers, then enforced on owned files — proof: gate output before→after

## L5 — Closing
- [ ] Gates green (baseline shifts listed), contrast table before→after, font numbers, contact sheets ≤ 40, DELIVERY.md written, branch pushed — proof: DELIVERY.md + `git log origin/agent/r366-design-system`
