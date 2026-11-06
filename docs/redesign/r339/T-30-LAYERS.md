# T-30 — CSS layer foundation + stylelint gate (TRACK C)

Branch `r339/t30` off main `9c7661b3`. Scope: the styles entry/structure,
a NEW ratchet gate, folder moves ONLY where provably safe. No rule
deletions, no section-CSS content edits (import paths only).

## 1. Layer statement — already landed (R331 pass 1), verified intact

`frontend/src/styles/layers.css` ships EXACTLY the required constitution,
imported FIRST in `main.tsx` (line 14, before fonts):

```css
@layer reset, tokens, base, layout, components, pages, utilities;
```

Cascade-neutral by construction (two EMPTY slots: `reset`, `utilities`;
the pre-existing six names keep their relative order) — proven by R331's
BEFORE/AFTER pairs (docs/redesign/r331/css-pass1.md §5) and re-proven by
T-30's computed-style snapshot (§5 below). Re-wrapping whole files into
`@import … layer()` was deliberately NOT done: layers.css documents live
unlayered escape hatches (base.css §loader, components.css 38px,
r321-player-page) that whole-file wrapping would invert — that is the
T-31/T-33 file-by-file pass with the css-shots harness.

## 2. Folder layout — `tokens/` seated; the rest mapped, queued

Landed (the one zero-ambiguity family, full reference sweep updated):

| old | new | refs updated |
|---|---|---|
| styles/tokens.css | styles/tokens/tokens.css | 19 files |
| styles/tokens.generated.css | styles/tokens/tokens.generated.css | (main.tsx, 10 test files incl. 3 join-args builders caught by the full vitest run, build.mjs OUT_CSS + labels, check-colors/-motion/-raw-css sanctioned zones, verify-parity-export, motion/tokens.ts, shared/design-tokens.json $doc, feature-parity.md) |

Not moved (queued for T-31+, per the layers.css seating map): `base.css
fonts.css → base/`, `layout.css shell/* → layout/`, `components.css
patterns.css polish.css → components/`, page sheets → `pages/`, landing/
→ `pages/landing/`. Each move is ~10-40 reference updates (tests read
file paths via fs; gates hardcode WHOLESALE zones) — mechanical but each
needs the full verify + snapshot cycle. `css-counts.mjs` sanctions by
BASENAME so the gate is already move-stable.

## 3. stylelint gate — live, wired into verify.sh

- `scripts/gates/stylelint-gate.sh` (+ `css-counts.mjs`, baseline JSON):
  stylelint@16 run (frontend/.stylelintrc.json) + comment-stripped axis
  counts; FAILS ONLY ON GROWTH vs the committed baseline; `--update`
  re-baselines (for legitimate drops — commit with the reason).
- Wired into `scripts/verify.sh` after tsc+vitest+bundle, BOTH modes
  (~5 s warm).
- Baseline (frozen at T-30): stylelint **errors 45** / warnings 57
  (tracked, not enforced — repo policy), **live !important 52** (the
  brief's 109 is the raw grep incl. comments — 57 prose mentions), raw
  z-index **79**, raw hex outside sanctioned homes **36**. T-34 target:
  !important 0.
- Raw hex + durations already have STRICT gates (check-colors.sh /
  check-motion-tokens.sh) — but both are currently RED on clean main
  (5 identical findings each, verified via git stash; pre-existing rot,
  curated findings: landing/cta, preloader, hero-mechanics, hero,
  journey, why). Flagged for the round's medic.
- stylelint-order (selector ordering): QUEUED — needs the devDependency
  decision (current policy: pinned `npx -y stylelint@16`, zero
  devDeps; plugins cannot load via npx).

## 4. Renames away from rNNN-/wave-/patch-

None needed: ZERO style files carry those prefixes (verified `find
-name`); prior rounds already renamed (shell/, student/, shared/,
landing/). rg hits were comment prose only.

## 5. Proof

- Snapshot: `/tmp/t30/snapshot.mjs` — getComputedStyle × 26 props on 26
  key elements (hero, nav, footer, cards, buttons, chips…) at 1440,
  reduced-motion, fonts-ready. BEFORE (clean tree) vs AFTER (all T-30
  changes): **byte-identical** (`diff -q` ✓).
- tsc ✓ · 10 tokens-referencing test files 281/281 ✓ · FULL vitest 3051/3051
  ✓ (first run caught 3 join-args path builders the contiguous-string
  sweep missed — r324-type-gate, r325-shell-css-contract,
  token-snapshot; fixed + green) · vite build + bundle gate 765.3 KB gz
  ≤ 770 ✓ ·
  stylelint-gate green at baseline ✓ · raw-css/parity/tokens-drift/
  icons/csp gates ✓ · footer conformance 87.7% (90/90/91/84/83 across
  1920→390) — unchanged by construction (identical computed styles).
