# Task A-F2 (v2, tight) — Footer form cluster → measured bindings
Worktree /home/z/wt/A-F2 · Branch wip/r343-A-F2 · NO browsers

## Inputs
`tasks/_README.md` (v2 preamble) · your slice `tasks/slices/F2.json` (46 targets: every form-ish seat — paths containing `form[`, tags input/button/svg, the label/copy/input-row/button-icon chains wherever they live under div[1]/div[2]/form[1]) · `Footer.tsx` region `fo-c1-sub` (~lines 203-268) · mapping header from `mapping/footer.json` (lines 1-12).

## Do
1. Mirror the reference's form chain: label zone rows, form shell, copy lines, input row, the 48×48 submit button with its inner 20×20 svg icon frame (see slice paths `footer > form[1]` and the div[1]/div[2] form nests; per-bp object paths where 390≠1440).
2. `data-spec="footer.af2.<name>"` on each; bind in `mapping/footer-A-F2.json`. Structural seats full checks. Keep the form working (submit handler, ids, existing data-spec names intact — only ADD).
3. CSS `landing/footer-af2.css` + one @import in `landing/home.css`; geometry to slice values ±2px at 390 + 1440.

## Acceptance
≥18 of 46 bound, gates green (typecheck/eslint/JSON), report per preamble.

## Files you own
`Footer.tsx` (fo-c1-sub region ONLY) · `mapping/footer-A-F2.json` · `landing/footer-af2.css` · one @import line. Nothing else.
