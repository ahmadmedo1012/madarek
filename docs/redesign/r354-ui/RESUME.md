# R354-UI — RESUME (lane log, evidence only)

Branch `wip/r354-ui` · base `origin/main` @ `c1273d80` · started 2026-11-15.

## Lane 1 — token / CSS audit (measured, not changed-away)

| counter | value | note |
|---|---|---|
| css files | 76 | |
| `!important` | 41 | ratchet 52 → 41 held |
| raw `z-index` | 66 | ratchet 79 → 66 held; the listed ones are documented local paint order |
| raw hex | 35 | colour gate: 0 violations outside sanctioned zones |
| raw type/radius/spacing | 0 | `check-raw-css.sh --strict` PASS |
| physical properties in layout CSS | 2 hits, both in comments | RTL-safe |

`stylelint-gate.sh`: errors 45 (= baseline), ratchet green.

## Lane 2/4 — shell, menus, overlap (verified, no edit needed)

Hermetic per-role crawl (`scripts/qa/overlap.mjs --seed …`, 360×640 / 1024×768 /
1440×900 × light+dark): **stops-with-defects = 0** for student, teacher, registrar,
owner, quality; public `/`, `/help`, `/auth`, `/features` at 360/390/1024/1440 ×
light+dark also 0. Ran against a fresh `vite preview` of this branch's build.
Tables + AI chat + profile/data surfaces included in the student set.

## Lane 3/5 — component + contrast fixes (the actual work)

`contrast-gate.mjs` (r323 instrument, 1440 + 390 × light/dark): **40 → 14 findings.**

1. `patterns.css` — the guest-sheet root `.ab, .ap, .hp, .lg` (pages layer) also
   matched the `.btn.lg` size variant, so its paper ground beat the
   components-layer button slab on every large CTA. Measured on `/404` light:
   accent button painting `rgb(246,246,238)` instead of the ember. Guarded to
   `.lg:not(.btn)`; verified live — light `#FFF` on `rgb(219,58,0)` (4.55:1),
   dark `rgb(29,29,28)` on `rgb(254,89,30)`, and the legal root's paint unchanged.
2. `components.css` — `.btn.danger` / `.btn.success` declared only their dark
   wipes, never the resting `--_btn-bg` their own comments promise, so
   `--danger-fg` ink painted on the page ground (1.19:1 dark at `/__design`, and
   on the AI delete / moderation approve-reject / people-delete rows). Both
   variants now carry the documented slab; all `/__design` findings closed.
3. `preloader.css` — `.pl-skip` hover ink moved `--accent` → `--accent-ink`
   (3.46:1 → 5.2:1); border keeps the raw accent (1px UI edge, 3:1).

Residual contrast findings (deliberate): the hero `.hro-alt` rest ink is the
**measured Heron seat** `rgb(250,54,0)` — changing it trades a frozen
conformance parameter for a token, so it stays; `.st-pill` is a probe artifact
(the anchor paints `--text` labels inside, the accent is container-only).

## Gates run on this branch

`npm run build -w frontend` ✓ · `check-colors --strict` ✓ · `check-raw-css --strict` ✓ ·
`tokens/build.mjs --check` ✓ · `check-bundle-size` ✓ 741.8 KB gz ≤ 773 · stylelint
ratchet ✓ · `landing-funnel` + `r320-settings` + `primitives-a11y` (36 tests) ✓ ·
scoped conformance `home-hero-wrap,home-intro-wrap` report-only (88.3%, no hero edit
landed).

## Skipped (low value / out of lane)

- `hover-guard-lint` 45 findings: mostly conformance `:hover, .probe-hover` twins and
  `:focus-within` combos that must stay outside `@media (hover)` — a blanket fix
  breaks the probe; needs a per-rule judgment pass.
- Mobile (`apps/mobile`) lane 6 and landing dedupe lane 7: untouched this pass.
- `/__design` is a design-system showcase page; its remaining failures were the
  variant slabs fixed above.
