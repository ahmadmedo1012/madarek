# Task A-I1 (v2, tight) — Intro headline word-window mirrors → measured bindings (biggest mass)
Worktree /home/z/wt/A-I1 · Branch wip/r343-A-I1 · NO browsers

## Inputs
`tasks/_README.md` (v2 preamble) · your slice `tasks/slices/I1.json` (219 targets: every unbound word/char split window — tc=short, grouped per headline line; at 390 under `home-intro-wrap > div[2]`, at 1440 spread across `div[2]`…`div[8]` = one div per headline line) · `Statement.tsx` title block (~lines 165-206: titlebox > h2 > scrub > line.N > linein.N > linemask.N > words) · the canonical word-binding example `intro.word.1` and `intro.wchar.3.3` in `mapping/home-intro-wrap.json` (grep for them; read those two entries only).

## Do
1. Extend the existing split-text mirror so each slice word window has an honest counterpart element (the component already splits into lines/masks/words — deepen it: word wrapper + word-in twin where the reference parks the roll copy). Masked/overflow-hidden twins only — zero visual change.
2. `data-spec="intro.ai1.<name>"`; bindings in `mapping/home-intro-wrap-A-I1.json` with `skip: ["tag","geometry"]` + the r338 census note (copy the note wording from intro.word.1) — tc + the 5 unskippable fields stay measured. Use per-bp object paths (`"heron": {"390": …, "1440": …}`) whenever the same seat's paths differ between bps.
3. CSS `landing/statement-ai1.css` only if genuinely needed (most twins reuse existing classes) + one @import in `landing/home.css` if the file exists.

## Acceptance
≥45 of 219 bound (each ≈ 6-7 measured checks — tag+geometry skipped, tc/type/color/line-height/font-weight/font-size measured), gates green, report per preamble.

## Files you own
`Statement.tsx` (title block ONLY) · `mapping/home-intro-wrap-A-I1.json` · `landing/statement-ai1.css` (optional) · one @import line if created. Nothing else.
