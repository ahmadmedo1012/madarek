# Task A-F3 (v2, tight) — Footer link/contact/social seats → measured bindings (biggest mass)
Worktree /home/z/wt/A-F3 · Branch wip/r343-A-F3 · NO browsers

## Inputs
`tasks/_README.md` (v2 preamble) · your slice `tasks/slices/F3.json` (115 targets: link seats (`> a[` paths + their inner div chains — the reference's 4-div nests per seat), group headers, contact biglink, socials row under `footer > div[2]` minus the form cluster) · `Footer.tsx` col2 region (~lines 271-352) · mapping header from `mapping/footer.json` (lines 1-12).

## Do
1. Mirror each link seat's inner chain honestly (text wrapper, hover-ink twin where the reference has one, arrow/icon box where present). Arabic link text; existing `data-spec` names stay; hover logic (data-spec-hover ~line 142) stays.
2. `data-spec="footer.af3.<name>"`; bindings in `mapping/footer-A-F3.json` (per-bp object paths where 390≠1440 — col2's recorded subtree differs between bps, check each slice row's bp).
3. CSS `landing/footer-af3.css` + one @import in `landing/home.css`.

## Acceptance
≥25 of 115 bound (prefer full-check structural seats; icon boxes and rules are the safest), gates green, report per preamble.

## Files you own
`Footer.tsx` (col2 region ONLY) · `mapping/footer-A-F3.json` · `landing/footer-af3.css` · one @import line. Nothing else.
