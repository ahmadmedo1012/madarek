# Task A-F4 (v2, tight) — Footer strip + col3 → measured bindings
Worktree /home/z/wt/A-F4 · Branch wip/r343-A-F4 · NO browsers

## Inputs
`tasks/_README.md` (v2 preamble) · your slice `tasks/slices/F4.json` (30 targets: the nested `footer > footer[1]` strip block — top zone 374×274, the 374×1 hairline, the 334×48 and 374×46 rows — plus `footer > div[3]` (link rows) and any leftover non-form/non-link seats) · `Footer.tsx` regions `fo-col3` (~lines 354-392) + `fo-fstrip` (~lines 394-end) · mapping header (lines 1-12).

## Do
1. Mirror the strip's real seats (zone wrappers, rule rows, copyright/legal rows, the media zone) and col3's mark/caption wrappers. Report-only for svg defs/filter internals and 0×0 tween residue (already excluded from your slice).
2. `data-spec="footer.af4.<name>"`; bindings in `mapping/footer-A-F4.json`; CSS `landing/footer-af4.css` + one @import in `landing/home.css`.

## Acceptance
≥15 of 30 bound, gates green, report per preamble.

## Files you own
`Footer.tsx` (fo-col3 + fo-fstrip regions ONLY) · `mapping/footer-A-F4.json` · `landing/footer-af4.css` · one @import line. Nothing else.
