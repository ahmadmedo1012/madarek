# W7-L2E — CTA affordance, focus rings, 44px touch floor

Worktree `/home/z/wt/l2e`, branch `wip/l2e` (at merged main). Dev port **5315**: `cd /home/z/wt/l2e/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5315 --strictPort &` (kill when done).

## Mission — kill the blind judge's CTA/focus/touch findings (panel-1-judge-1.md)
1. **Desktop primary CTA "112×64 radius-0 transparent text link, hover color-only"** — L1-d invert-to-ink landed AFTER judging (commit 5ce16066); VERIFY now: hover ≥2 measured channels incl. secondary affordance (arrow nudge / underline sweep) @1440.
2. **Mobile (390) primary CTA = 13.33px transparent text link** — give it a visible affordance consistent with the desktop language.
3. **Focus outline style:none ≤768** — restore r162 focus-visible discipline (2px solid accent rgb(199,46,0)) through the Tab order @768+390.
4. **Nav "تسجيل الدخول" touch target ≈20px** — ≥44px hit area @390 (padding/hit-slop, no visual bloat).

## Owns (exclusive)
`frontend/src/styles/landing/cta.css` · `components/landing/patterns/CtaPair.tsx` · CTA seats in `components/landing/sections/{Footer,Statement,Product,Vision}.tsx` + `chrome/SheetNav.tsx` + `ProductFrame.tsx` · `styles/landing/nav.css` (login touch-target seat ONLY).
Do NOT touch `components/landing/hero/**` or `styles/landing/hero*.css` (sibling owns them) — if a fix needs them, note it in the report.

## Method
1. /tmp playwright probe: primary CTA at 1440/768/390 — computed rest/:hover/:focus-visible styles; Tab ×8 stops @768+390 focus rings; login hit rect @390.
2. `node scripts/conformance/interact.mjs` (read CLI header) + `node scripts/conformance/run.mjs --url http://localhost:5315 --sections home-cta-wrap,footer --bps 1440,390` (+`--dark`) — keep ≥90.
3. Fix: tokens only, NO !important, logical properties. Re-probe. `bash scripts/verify.sh --fast > /tmp/l2e-verify.log 2>&1; echo $?` (NEVER piped).

## Laws
Tests are law — especially r162 focus-visible + r305 cursor pins. Nothing gets worse. Commit ≤5 min; push after first commit `git push -u origin wip/l2e` and after each commit. Do NOT merge to main.

## Acceptance
CTA hover ≥2 channels @1440 · CTA @390 visible affordance + ≥44px target · focus rings on all probed stops @768+390 · login ≥44px @390 · conformance cta/footer ≥90 · verify --fast exit 0.

## Report ≤10 lines
Before→after per item · files · commits · verify result.
