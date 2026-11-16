# R354-UI — RESUME (lane log, evidence only)

Branch `wip/r354-ui` (2 rounds) · merged as `merge/r354-ui` into `main` @ `c83f6d67`.
Base `c1273d80`.

## Round 1 — the cascade slabs (commit 3a5eab87)

`contrast-gate.mjs`: **40 → 14 findings.**

1. `patterns.css` — the guest-sheet root `.ab, .ap, .hp, .lg` (pages layer) also
   matched the `.btn.lg` size variant, so its paper ground beat the
   components-layer button slab on every large CTA. Guarded to `.lg:not(.btn)`.
   Measured live: `/404` light `#FFF` on `rgb(219,58,0)` (4.55:1), dark
   `rgb(29,29,28)` on `rgb(254,89,30)`; the legal root's paint unchanged.
2. `components.css` — `.btn.danger` / `.btn.success` declared only their dark
   wipes, never the resting `--_btn-bg` their comments promise (`--danger-fg`
   ink on the page ground = 1.19:1 in dark). Both variants now carry the slab.
3. `preloader.css` — `.pl-skip` hover ink `--accent` → `--accent-ink`
   (3.46:1 → 5.2:1); the border keeps the raw accent (1px UI edge, 3:1).

## Round 2 — the stress crawl (commit 551f2f2f)

### A0 · `scripts/qa/overlap.mjs --stress`

The happy-path crawl was blind to real content shapes, so the detector grew a
hostile pass, applied in-page before the same probes:

- text: every non-numeric node lengthened with a 60-char Arabic clause, a
  48-char unbroken email, or Arabic-Indic digits; headings get the clause;
- data: +100 cloned `<tr>` per table (last row), +20 cloned list rows, every
   third `<img>` broken, every ninth forced to 320×320, childless count chips
  → `99+`;
- environment: `--fontscale 1.3|2` (root font-size), any `--bps`
  (360×640, 640×360, 768×1024, 1024×600, 1440×900 used);
- evidence: `res.overflowEls` names the widest offenders when the document
  grows (both edges — **RTL overflows to the LEFT**, the rects go negative);
- the landing is excluded from TEXT mutation (its labels live in measured
  art seats; lengthening them fabricates overlaps the art direction cannot
  absorb). Data/images still stressed there.

### A1 · the harvest — topbar (the owner's #1 class)

At **1024×600** a long user name grew `.topbar-user` to 586px and
`.topbar-actions` to 1185px: the document overflowed **305px** and the whole
shell slid sideways (12 stops, both themes, 3/3 teacher routes). Fixed at the
root in `layout.css`: `.topbar-user-name` clamps at 22ch with an ellipsis
(the `.topbar-scope` precedent), `.topbar-actions` / `.topbar-user` /
`.topbar-user-trigger` shrink (`min-inline-size: 0`).
Re-measured after the fix: **0 stops-with-defects** at 360 / 768 / 1024 × light+dark.

### A5 · mobile shell

`apps/mobile` AppTopBar's unread badge was the only 8dp pill in the shell —
TabBar's badge and the web `.nav-badge` are square chips; it is now square.
**UNVERIFIED-ON-DEVICE**: no emulator here, and mobile jest cannot boot in this
clone (`jest-expo` needs `@react-native/jest-preset`, absent from the
lockfile). One radius literal, no logic.

## Residuals (documented, not hidden)

- `contrast-gate` 14: 10 are the hero `.hro-alt` rest/hover ink — the
  **measured Heron seat** `rgb(250,54,0)` (3.46:1), frozen by the spec; 4 are
  the `.st-pill` container colour the probe reads (its labels paint
  `--text`; the accent is container-only).
- Stress at `/` on a **1024×600** viewport: the journey `<svg>` label
  «المكتبة والبحوث» (0.4–1.0 frac) over `.jt-anno-t` «[04] المكتبة» — the
  R353 ledger's anno class, at a height the ledger never crawled. Left for
  the map owner: the seat is conformance-measured and journey.css owns it.
- `hover-guard-lint` 45: dominated by conformance `:hover, .probe-hover`
  twins and `:focus-within` combos that must stay outside `@media (hover)`;
  blanket-guarding them breaks the probe. Needs a per-rule pass.
- `hoverflow` at 1024×600 does not reproduce without `--stress` (the shell is
  clean with real content); the topbar fix makes it clean with stress too.

## Gates (merge tree)

- `npm run build -w frontend` ✓ · bundle **741.9 KB gz** (ceiling 773), entry
  65.5, pdf 95.4 ✓
- `check-colors --strict` ✓ · `check-raw-css --strict` ✓ · `tokens --check` ✓
- stylelint ratchet ✓ (45 errors = baseline; counts 76 files / 41 important /
  66 raw z-index / 35 raw hex, all held)
- `verify.sh --fast` — see MERGE-REPORT (command log `/tmp/p1/verify-fast.log`)
- string parity vs `main`: **identical** — 11 525 Arabic literals, sha1
  `43ba9b282195b6cd7701c3de6929dd4a6f0aaffb` on both trees
- diff vs `main`: 8 files — CSS only, `scripts/qa/overlap.mjs` (QA tool),
  `AppTopBar.tsx` (one radius literal), this doc. No routes, copy, logic, API.
