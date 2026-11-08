# Task A-I2 (v2, tight) — Intro media/pill/ticker structural seats → measured bindings
Worktree /home/z/wt/A-I2 · Branch wip/r343-A-I2 · NO browsers

## Inputs
`tasks/_README.md` (v2 preamble) · your slice `tasks/slices/I2.json` (82 targets: the non-word structural seats — the 374×374/713×723 image + media wrappers, the 41×41 pill icon boxes at y≈761, the 1×41 vertical rules, section[1] containers, misc wrapper seats) · `Statement.tsx` pill + ticker + media regions (~lines 141-160, 208-260) + `StatementArt.tsx` (232 lines) · mapping header from `mapping/home-intro-wrap.json` (lines 1-12).

## Do
1. Mirror the reference seats honestly: media image wrappers, pill icon frames (41×41 + inner glyph boxes), ticker window wrappers + rules. Report-only for tween residue.
2. `data-spec="intro.ai2.<name>"`; bindings in `mapping/home-intro-wrap-A-I2.json` — structural seats full checks (no skip); per-bp object paths where 390≠1440.
3. CSS `landing/statement-ai2.css` + one @import in `landing/home.css`; geometry to slice ±2px at 390 + 1440; pill hover + ticker animation unchanged.

## Acceptance
≥25 of 82 bound, gates green, report per preamble.

## Files you own
`Statement.tsx` (media/pill/ticker regions ONLY) · `StatementArt.tsx` · `mapping/home-intro-wrap-A-I2.json` · `landing/statement-ai2.css` · one @import line. Nothing else.
