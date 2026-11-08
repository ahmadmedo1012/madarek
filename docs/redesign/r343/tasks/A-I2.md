# Task A-I2 — Intro CTA pill chain + ticker rows
Section: `home-intro-wrap` · Port 5206 · Worktree /home/z/wt/A-I2 · Branch wip/r343-A-I2

## Goal
Mirror the reference wrapper-chains for the **statement CTA pill** and the **ticker band** in `Statement.tsx` (~lines 208-260: the `st-pill` chain — ctaink > ctaspan > ctaspanin > ctatext, the twin ctaspan2, ctaicons > ctaicon/ctaiconin/ctaiconbox + twins — and `st-ticker` with its rule and row/window structure to the end of the component; also `StatementArt.tsx` ONLY if the reference's media-side seats belong to the ticker/media chain you own).

1. Reference: `heron-spec/home-intro-wrap.{390,1440}.json` — the pill region (small interactive cluster at title-below y-range: `a[1]` with nested div chain, arrow icon boxes) and the ticker (the full-width row band at section bottom: repeated window boxes). Cross-check `mapping/home-intro-wrap.json` explicit/noCounterpart for what's unbound.
2. Rebuild so every REAL reference seat exists (pill ink twin, icon frames, ticker window wrappers, rule seats). Report-only for tween residue.
3. Hooks `data-spec="intro.ai2.*"`; bindings in NEW `mapping/home-intro-wrap-A-I2.json`.

## Owned files
`Statement.tsx` (ONLY pill + ticker + media regions) · `StatementArt.tsx` (if needed) · `mapping/home-intro-wrap-A-I2.json` (new) · `frontend/src/styles/landing/statement-ai2.css` (new) · one @import in `landing/home.css`.

## Numeric acceptance
- ≥20 new bound elements, ≥230 measured checks, green at 390 + 1440.
- Pill hover + ticker animation unchanged; no new fails/excused.

## Commands
Preamble flow; two chunks; kill vite.
