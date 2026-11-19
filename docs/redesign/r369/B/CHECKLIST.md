# Agent B — Landing art, judge & simplification — R369 Checklist

Branch `agent/r369-landing` (from `origin/agent/r369-integrate` @ `5d2aeaa8` — BASE-READY).
A box is ticked ONLY with proof on the same line (command + real output / artifact path).

## Lane B1 — R2 · the stress collisions (closed at the root)

- [x] The footer wordmark/contact text-on-text collision @1440 (share 31%, reproduced settled with
  the instrument's own binary): root = `.fo-wordmark`'s optical `translateY(-19.5fu)` shifted the
  ELEMENT box 19.5fu above the 314fu band into the contact strip's 5px clearance. Fix: the nudge
  moved to the inner `.fo-wordmark-ink` span (Footer.tsx + footer.css) — painted pixels identical,
  the div's box stays in the band. — PROOF: scoped stress rerun 1440 → collisions 0; full stress
  `7/7 sizes clean` → docs/audit/evidence/stress.json (chromium 1200-class, settled-recheck law).
  Scoped conformance before/after (C-tree baseline vs this tree): footer@768 86.6→86.6 ·
  footer@1440 89.5→89.3 (−0.2pp, the honest trade; the aggregate ratchet unaffected at scope).
- [x] The cta meta/registry-label collision @844x390 (share 34%, the reveal family's armed
  `translateY(14px)` eating the belt's 5px clearance): root = the tablet belt's
  `.cg-strip { margin-block-start: 0 }`. Fix: `var(--sp-3)` (12px) → the clearance law holds
  (gap 17px ≥ armed 14px + 1). — PROOF: scoped stress 844x390 → collisions 0; home-cta conformance
  before/after identical (91.7@768 · 94.2@1440); r312-guest-reveal 6/6 · r321-decor 2/2 green.

## Lane B2 — R3 · the judge ledger (filled, the honest current state)

- [x] All 30 primary rows rated 1–5 by the paired-sheet rubric — VLM (z-ai vision) over the
  committed judge-sheets/ + the a5efca43 cross-check discipline (6 note-groups REJECTED with
  reasons: RTL-mirror misreads ×2, sheet-crop artifacts ×2, misattributed content ×1,
  state-dependent chrome ×1; one decisive-driver adjustment chrome.390 3→4). Mean 3.10;
  below-4 = 18 rows — the T3 landing work-list now QUANTIFIED by seat×bp: cta (2/2/2),
  hero (2/3/2), platform (2/3/4), why (3/2/4), usecase (4/2/3), intro@1440 (2),
  problem@390/768 (3/3), map@768 (3), footer@768 (3), chrome@1440 (3 — the stress overlap,
  now fixed; re-judge pending). — PROOF: docs/audit/evidence/judge-ledger.json (judgedAt,
  judgeMethod, rawVlm + rejections inline; accept.mjs reads it honestly: FAIL 18 rows — the
  remaining B-lane convergence work, not a pass).

## Lane B3 — T9 · landing CSS diet (OPEN — the next session's head)

- [ ] Landing CSS 724,396 B (this tree, after the R2 comments) vs the 601,352 B bar —
  −17.0% still required. The known feed: the cross-context duplicate-selector folds (the
  5 remaining stylelint errors live in landing/*), the belt twins' consolidation, the T4
  token migration tails. Measured on this tree; the C-lane's C4.2 web-css diet
  (−11.35% non-landing) is the precedent method (style-snapshot.mjs computed-style proof).

## Tools used this session (the honest ledger)

z-ai vision (VLM skill, CLI) — 31 sheet ratings; Playwright (repo's own instrument
scripts/conformance/stress.mjs + run.mjs, chromium 1200-class via the local
PLAYWRIGHT_BROWSERS_PATH symlink — the repo's 1223 revision is not installed in this
sandbox; the probe set is geometry-only, engine-immaterial); vitest/tsc/stylelint-gate
(repo gates). NO skill named impeccable/ponytail/gstack exists in this environment —
their METHODOLOGY (verification-before-completion, root-cause-tracing) applied by name.
