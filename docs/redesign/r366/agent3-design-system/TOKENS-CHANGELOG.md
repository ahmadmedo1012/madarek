# TOKENS-CHANGELOG — R366 · Agent 3 · Design System

**Law (unchanged):** tokens are ADDITIVE or value-tuned only — never
renamed, never removed. Consume by name. Need a seat that is not here?
File `REQUESTS-<you>-to-agent3.md`; until it lands use the nearest
existing token. Source of truth: `shared/design-tokens.json`
(→ `scripts/tokens/build.mjs` → `tokens.generated.css` +
`tokens.generated.ts`).

## R366 additions (this branch)

| Token | Value | Theme | Consumers |
|---|---|---|---|
| `--t-page` / `motion.page` | `500ms` | both (web + mobile) | page/route transitions, stack pushes. Joined the `prefers-reduced-motion` kill. |
| `--touch-target` | `44px` | both | coarse-pointer hit areas — the ONE 44px floor seat (equals `touchFloor` in the shared source) |
| `--text-on-image-ink` | `#FFFFFF` | theme-invariant | text painted over imagery — MUST be paired with `--scrim-text` |
| `--scrim-text` | `rgb(20 20 20 / 0.62)` | theme-invariant | the guaranteed-legibility scrim: 0.62×#141414 over the worst legal pixel (#FFFFFF) composites #6D6D6D → **5.15:1** with the ink. Gradients may exceed, never dip below. |
| `--surface-sunken` | light `var(--neutral-100)` · dark `var(--neutral-50)` | per-theme | the ONE inset surface (read-only digests, code/quota wells) |

## Existing seats you may not know you already have (do not re-invent)

- **State map (complete):** `--state-focus-ring-{color,width,offset}` +
  `--state-focus-ring` + `--state-input-focus-halo` (the ONE focus
  language) · `--state-selected-{bg,ink,border}` · `--state-hover-bg` ·
  `--state-disabled-{bg,ink,border}` + `--state-{btn,input}-disabled-opacity`
  · `--state-input-{focus,error}-border` + `--input-focus-signal` ·
  press register `--press-scale` / `--state-card-pressed-scale` /
  `--state-nav-pressed-scale` · `--state-card-selected-ring`.
- **Z-ladder (complete, append-only):** base 0 · header 90 · dropdown
  100 · frame 150 · popover 200 · tooltip 250 · sheet 300 · modal 400 ·
  toast 500 · consent 510 · dialog 520 · menu-drawer 530 · lightbox
  600 · loader 700 · splash 800.
- **Motion raw ladder:** `--t-micro 80 · fast 200 · base 400 · slow 500
  · page 500 · slower 650 · sheet-exit 835 · guest-reveal 700 · cinema
  900` + `--ease` (.23,1,.32,1) / `--ease-in` (.625,.05,0,1) roll curve.
- **Elevation:** decorative shadows are RETIRED (R313) — depth via
  hairlines + surface steps (`--surface-1/2/3`, `--surface-sunken`);
  `--elev-1..5` resolve outline rings ONLY under `prefers-contrast:
  more`.
- **Overlays:** `--overlay-veil` (-deep / -max) + `--scrim-blur` —
  modal/sheet scrims; `--scrim-text` is the TEXT-over-image contract
  (different job, do not swap).
- **Type (L2 doc):** `--fs-d1/d2/d3/st` narrative ladder ·
  `--fs-app-h1/h2/h3` density ladder · `--lh-tight 1.05 / snug 1.20 /
  base 1.65 / loose 1.85` · roles `--type-*` (locked size+weight+lh).

## Value tunes

None this round (nothing re-keyed).

## Requests received / status

- (none yet — file `REQUESTS-<agent>-to-agent3.md` in this folder)
