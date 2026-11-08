# Task A-F1 (v2, tight) — Footer col1: brand/about/text rows → measured bindings
Worktree /home/z/wt/A-F1 · Branch wip/r343-A-F1 · NO browsers

## Inputs (read these, nothing else big)
`tasks/_README.md` (v2 preamble — binding grammar, laws) · your slice `tasks/slices/F1.json` (29 spec targets: the col-1 brand/about/text-line seats — mostly `div` rows with tc short/long under `footer > div[1]`, excluding form/input/button) · `frontend/src/components/landing/sections/Footer.tsx` region `fo-c1-top` (~lines 178-201) · the `ourSection`/`heronPageKey` values from `scripts/conformance/mapping/footer.json` (read just the header, lines 1-12).

## Do
1. For each slice target: add the real wrapper seat to the col1 JSX (semantic: about-text line rows, brand stack wrappers, hairline rule seats), `data-spec="footer.af1.<name>"`, styled to the slice's geometry/fs/color within ±2px at 390 AND 1440 (bp-scoped media queries in your own css).
2. Bindings: `scripts/conformance/mapping/footer-A-F1.json` — structural seats no skip; text rows whose Arabic width can't honestly match → leave unbound + report (do NOT skip geometry on structural rows; word-split seats may take tag+geometry skip with the r338 census note).
3. CSS: `frontend/src/styles/landing/footer-af1.css` (tokens only; radius 0; hairlines) + one `@import "./footer-af1.css";` line in `frontend/src/styles/landing/home.css`.

## Acceptance
≥15 of the 29 targets bound (each ≈ 12 measured checks; full-check bindings preferred), typecheck + eslint + JSON-validity gates green, report per preamble.

## Files you own
`Footer.tsx` (fo-c1-top region ONLY) · `mapping/footer-A-F1.json` · `landing/footer-af1.css` · one @import line in `landing/home.css`. Nothing else.
