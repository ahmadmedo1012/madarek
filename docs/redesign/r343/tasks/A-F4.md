# Task A-F4 — Footer col3 + strip subtree: mark, caption, bottom strip
Section: `footer` · Port 5204 · Worktree /home/z/wt/A-F4 · Branch wip/r343-A-F4

## Goal
Mirror the reference wrapper-chain for **col3** (the mark/wordmark SVG block `fo-mark/fo-markin/fo-mark-svg/fo-mark-p.N/fo-mark-cap/fo-mark-img`, ~lines 354-392) and the **bottom strip** (`fo-fstrip/fo-strip-in/fo-strip-media` + the strip's rows, ~lines 394-440+; read to end of file).

1. Reference: `heron-spec/footer.{390,1440}.json` — the third column (right-most in LTR geometry) + the full-width strip below the grid. The reference's mark block and strip rows carry staged-duplicate window captures and svg defs internals — mirror only the REAL seats (the svg path wrappers, caption line rows, strip media zone, copyright/legal rows). Report (do not bind) reference paths that are pure tween residue.
2. Hooks `footer.af4.*`; bindings in NEW `mapping/footer-A-F4.json`.

## Owned files
`Footer.tsx` (ONLY col3 + strip JSX regions) · `mapping/footer-A-F4.json` (new) · `landing/footer-af4.css` (new) · one @import in `landing/home.css`.

## Numeric acceptance
- ≥12 new bound elements, ≥140 measured checks, green at 390 + 1440.
- The strip is where responsive disclosure rows live — nothing may visually break at 390.
- No new fails/excused.

## Commands
Preamble flow; two chunks; kill vite.
