# Task A-F2 — Footer col1-sub subtree: early-signup form chain
Section: `footer` · Port 5202 · Worktree /home/z/wt/A-F2 · Branch wip/r343-A-F2

## Goal
Mirror the reference wrapper-chain for the **newsletter / early-signup form block** in `Footer.tsx` (`fo-c1-sub` region ~lines 203-268: formzone, formlabel, formwrap, form, formcopy, formline.N, formrow, input, go button + its `fo-go-ic > fo-go-ic-in` icon chain).

1. Reference: `heron-spec/footer.{390,1440}.json` — the form subtree (`footer > div[1] > … > form[1] > …`, incl. the reference's `div[2] > button[2] > div[1]`-style button nests — the reference wraps the submit affordance in multiple real seats). The sample spec path `footer > div[2] > div[1] > form[1] > div[2] > button[2] > div[1]` (20×20 icon box) is in your area.
2. Rebuild so every real reference seat exists: label zone, form shell, copy lines, the input row, the submit button's inner boxes (icon frame, ink, glyph). Visual output unchanged.
3. Hooks `data-spec="footer.af2.*"`; bindings in NEW file `mapping/footer-A-F2.json`.

## Owned files
`Footer.tsx` (ONLY the fo-c1-sub JSX region) · `mapping/footer-A-F2.json` (new) · `landing/footer-af2.css` (new) · one @import in `landing/home.css`.

## Numeric acceptance
- ≥8 new bound elements, ≥90 measured checks, green at 390 + 1440; form still submits (existing e2e form selectors must keep working — do not rename existing data-spec hooks, only ADD).
- No new fails/excused.

## Commands
Preamble flow; two chunks; kill vite.
