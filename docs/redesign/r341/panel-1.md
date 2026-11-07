# R341 Panel #1 — aggregate (queen)

Judges: 3 independent blind agents (ports 5321-5323, live Heron reference, 3 viewports × 2 themes).
Scores: 59 + 43 + 38 = **140/252 (avg 46.7/84)** — target ≥76/84.

## Verdict: VOIDED IN HALF, REAL IN HALF
All three judges independently "found" the dark theme broken — pixel-identical to light. Root cause (verified by the queen): the T-16-era capture method (`localStorage.setItem('madarek-theme','dark')` — a raw string) is silently ignored by the boot script (index.html JSON.parses the zustand persist blob). The PRODUCT dark boot is CORRECT (verified: the zustand-shape boot renders `data-theme=dark`, bg rgb(40,40,40)). Panel #1's dark-half scores are invalid; the B1 brief now carries the verified boot method. The light-half findings STAND:

## Standing findings (the next queue — L2)
1. `.hro-art`/`.bp-svg` decorative layers intercept CTA pointer events ≤768px (elementFromPoint-measured) — REAL BUG, links unhittable on tablet/phone.
2. Mobile primary CTA reads as a 13.33px transparent text link; focus outline style:none at tablet/mobile (r162 discipline breach at width).
3. 76 elements in Times-New-Roman fallback (webfont coverage/paint bug) + 7 drifting H2 sizes.
4. 450–600px gallery voids at 25% scroll; clipped/colliding content at 25%/75%; hero/footer edge clipping; mobile footer collisions.
5. Color-only CTA hover (no secondary affordance seen by 2 judges — L1-d landed AFTER these judges captured; re-judge).

Panel #2 (with the corrected boot + L2 fixes + H1-c/d) is the arbiter for the ≥76/84 gate.
