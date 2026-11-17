# R366 · Agent 3 · Design System — CHECKLIST

Branch `agent/r366-design-system` · owner Ahmed · records in this folder.
A box is ticked ONLY with proof on the same line (command + output / metric
before→after / artifact path). "Pushed" is not done; "executed and
measured" is done.

## L0 — EARLY deliverables
- [ ] `docs/DESIGN-COPY-GUIDE-AR.md` written (the Arabic microcopy standard: verbs, patterns, glossary, formats, tone, never-cut list) — proof: file path + `git log --oneline` SHA
- [ ] Token ADDITIONS (semantic state/surface/border colours, elevation steps, motion, z-ladder) + `TOKENS-CHANGELOG.md` — proof: `npm run tokens:build` output + `npm run tokens:check` PASS

## L1 — Colour & contrast to a provable standard
- [ ] Token-pair audit script computes EVERY text/surface/border pair in light, dark AND `prefers-contrast: more` with WCAG 2.2 AA AND APCA Lc — proof: `node scripts/r323/color-audit.mjs` output table, artifact `audits/evidence/r366/color-audit.json`
- [ ] Failing pairs fixed at token level (before→after ratios listed); the Heron seat exemption stays named + measured — proof: audit re-run PASS with 0 findings outside the named seat
- [ ] `scripts/r323/contrast-gate.mjs` extended to disabled / error / selected / read-only states, overlays/scrims, chart palettes with CVD simulation (protan/deuteran/tritan), text-on-image — proof: gate run output with new states in `meta.states`
- [ ] APCA Lc reported alongside WCAG per finding + in the audit artifact — proof: artifact JSON contains `apca.lc` fields
- [ ] Dark-mode completeness: elevation by surface steps, `color-scheme` set, selection/scrollbar styled, borders visible, no pure #000/#FFF seats — proof: computed-style probe output or CSS diff + gate PASS

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
