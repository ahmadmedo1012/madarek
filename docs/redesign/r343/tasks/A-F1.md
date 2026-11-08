# Task A-F1 — Footer col1-top subtree: brand + wordmark + about + brow rows
Section: `footer` · Port 5201 · Worktree /home/z/wt/A-F1 · Branch wip/r343-A-F1

## Goal
Mirror the reference's wrapper-chain topology for the **col1 top block** (brand/name/sub + about paragraph + brow rows) in `frontend/src/components/landing/sections/Footer.tsx` (the `fo-c1-top` region, ~lines 178-201), then bind the new elements so they are MEASURED.

1. Read the frozen reference subtree: `docs/redesign/r335/heron-spec/footer.390.json` + `footer.1440.json` — all elements under the reference's col-1 top (the brand/wordmark stack and the text rows; identify them by geometry x < 33% width, y within footer top half, and paths branching from the first column container). Cross-check against `mapping/footer.json` `explicit`/`noCounterpart`/`plumbing` to see which of those paths are already bound/excused.
2. Rebuild the region so each real reference wrapper seat exists in our DOM (semantic: wordmark letters/rows if the reference splits them, about-text line rows, hairline rule seats). Keep Arabic content and current visual output — the mirror must not change what users see beyond hairline-level alignment.
3. `data-spec="footer.af1.*"` hooks on every new element; new bindings in `scripts/conformance/mapping/footer-A-F1.json` (preamble shape).

## Owned files (touch NOTHING else)
`frontend/src/components/landing/sections/Footer.tsx` (ONLY the fo-c1-top JSX region) · `scripts/conformance/mapping/footer-A-F1.json` (new) · `frontend/src/styles/landing/footer-af1.css` (new) · one @import line in `frontend/src/styles/landing/home.css`.

## Numeric acceptance
- ≥8 new bound elements in your subtree, ≥90 measured checks added (each element ≈ 12 checks), all green at bp 390 and 1440 (`node scripts/conformance/run.mjs --url http://localhost:5201/ --sections footer --bps 390 --out` — your subtree's rows in the per-section output).
- No new fails, no new excused paths, coverage floor logic untouched.

## Commands
Preamble flow. Verify with the two chunks (390, 1440). Kill your vite at the end.
