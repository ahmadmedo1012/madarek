# Task A-I1 — Intro statement headline: split-text word/char window mirrors (THE BIG MASS)
Section: `home-intro-wrap` · Port 5205 · Worktree /home/z/wt/A-I1 · Branch wip/r343-A-I1

## Goal
The intro's off-book mass is the reference's **text-roll tween plumbing**: the h2's per-word/per-char split boxes (96-127 `div.short` per bp), parked roll copies, loop duplicates. coverage-review names the honest lift: "deepening the split-text mirror in Statement.tsx to bind the remaining word-wrapper windows". Do exactly that.

1. Reference: `docs/redesign/r335/heron-spec/home-intro-wrap.{390,1440}.json` — the h2 region (paths under the title container with word/char windows; small boxes with text content, `tc` != none, stacked at title y-range). `mapping/home-intro-wrap.json` has 326 explicit `intro.line/word/wordin/wchar.N.M` bindings — find the word-wrapper windows still unbound (noCounterpart: 360) and mirror + bind the REAL ones.
2. In `frontend/src/components/landing/sections/Statement.tsx` (the title block ~lines 165-206: titlebox > h2 > scrub > line.N > linein.N > linemask.N > words): extend the existing split so each reference word window has an honest counterpart (word wrapper, word-in twin where the reference parks the roll copy — the component already has mask/line structure; extend, don't redesign). Visual output unchanged.
3. Hooks `data-spec="intro.ai1.*"`; bindings in NEW `mapping/home-intro-wrap-A-I1.json` (preamble shape, section key `home-intro-wrap`).

## Owned files
`Statement.tsx` (ONLY the title-block region) · `mapping/home-intro-wrap-A-I1.json` (new) · `frontend/src/styles/landing/statement-ai1.css` (new) · one @import in `landing/home.css`.

## Numeric acceptance
- ≥30 new bound elements (word windows are small — each still ≈12 checks), ≥340 measured checks, green at 390 + 1440 (`node scripts/conformance/run.mjs --url http://localhost:5205/ --sections home-intro-wrap --bps 390 --out`).
- Zero visual change (split twins are masked/overflow-hidden as the reference does).
- No new fails/excused; the tween logic (scrub) must keep working.

## Commands
Preamble flow; two chunks; kill vite.
