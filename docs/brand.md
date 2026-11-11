# docs/brand.md — the Madarek brand system: the ONE logo, provably

> R349 LANE B's canon. The owner's word: **«شعار واحد في كل مكان — واحد فقط»** —
> website, footer, mobile app, icons, favicon, splash, OG, exports. Never
> three different marks. This document is the lock-up rule (B4); the gates
> below ENFORCE it in CI.

## 1. The mark (the geometry)

«نقطة تصبح مدارًا» — one 32-unit grid (`viewBox 0 0 32 32`):

- **TWO squares sharing one centre (16,16)** — the khatam idea:
  - the axis square `x=8, y=8, size=16` (corners on grid intersections);
  - the rotated square as the explicit path `M16 5L27 16L16 27L5 16Z`
    (vertices on the grid axes — the √2 tax snapped, a permanent 2.8% side
    difference, invisible);
- **ONE solid orange point** — the 4×4 square `x=22, y=6` seated on the
  north-east grid intersection (the «نقطة» the brand copy begins from);
- hairline ink strokes, UNIFORM weight, MITER joins (never round), radius 0,
  no fills except the point, no gradients, no shadows.

**Colours — the only three**: paper `#F6F6EE` · ink `#282828` · orange `#FA3600`.
In the app the ink rides `currentColor` and the point rides `var(--accent)`
(`#FA3600` light / `#FF5A1F` dark — the sanctioned dark-theme swap).

## 2. The ONE source (and its two pinned twins)

The geometry lives in **two deliberate twins** (each tree's toolchain reads
its own):

| tree | file | rendered by |
|---|---|---|
| web | `frontend/src/brand/mark.ts` | the `<Logo>` component (`frontend/src/brand/Logo.tsx`) |
| mobile | `apps/mobile/src/brand/mark.ts` | the mobile `<Logo>` (`apps/mobile/src/brand/`) |

**The cross-tree pin** (`frontend/tests/unit/r323-brand-system.test.ts`,
"the ONE geometry across BOTH trees"): every `MARK_*` constant must be
byte-equal between the twins. A drift in either fails CI. Never edit one
without the other.

## 3. The generators (the only writers of brand files)

| generator | writes |
|---|---|
| `scripts/r323/brand-assets.mjs` | `shared/brand/mark.svg`, `frontend/public/favicon.svg`, `frontend/public/brand/{mark,madarek-mark,lockup,lockup-stacked}.svg`, `brand/icon-{180,192,512}.png`, `brand/madarek-og.jpg` |
| `scripts/r323/wordmark-build-r323.mjs` | `frontend/public/brand/wordmark.svg` (Plex 600 sheet, ink-height 100) |
| `scripts/brand/build-app-icons.mjs` | every `apps/mobile/assets/images/*.png` (icon, adaptive ×3, splash, favicon, notification) |

**The single door**: `scripts/brand/build-assets.mjs`
- `--web` / `--mobile` — regenerate (Chromium / sharp respectively);
- `--manifest` — rewrite `scripts/brand/asset-manifest.json`;
- `--check` — dependency-free: every committed asset's SHA-256 vs the
  manifest. **Wired into `verify.sh` (both modes) and the CI design-gates
  job.** A hand-edited logo file can never ship silently.

Native launcher icons (Android mipmaps, iOS AppIcon) are produced at build
time by `expo prebuild` from `apps/mobile/assets/images/` — the same source,
by construction.

## 4. The lock-up rule (spacing, size, clear space)

- **Mark + wordmark**: the wordmark's ink-height defines the unit. The
  horizontal lock-up seats the mark so its ink box (5..27 on the 32-grid)
  matches the wordmark's cap-height; the gap is half the mark's side
  (8 grid units at design size). The stacked lock-up centres the mark above
  the wordmark with the same half-side gap.
- **Minimum sizes**: the mark alone ≥ 16 px (use the favicon ratio stroke
  2.25 below 24 px); the lock-up ≥ 96 px wide (below that, the mark alone).
- **Clear space**: on every side, ≥ the point's size (4/32 of the mark's
  side) — the «نقطة» is the ruler.
- **Never**: re-stroke, round the joins, add gradients/shadows/outline
  variants, recolour outside the three colours (the dark-theme accent swap
  is the one exception), or stretch non-uniformly.

## 5. Sanctioned seats (the inventory)

| seat | source |
|---|---|
| web header / role chrome / preloader / loading / empty / error / 404 / login / register | the `<Logo>` component (same-source by construction) |
| web footer | `<Logo>` (r323 test pins Footer.tsx derives from brand/mark) |
| favicon (SVG) + PWA icons (192/512) + apple-touch (180) + OG/Twitter card | the r323 generator outputs (manifest-checked) |
| email + offline pages | the TEXT wordmark «مدارك<span style="color:#FA3600">.</span>» — the sanctioned text form (Plex 700, the orange point) |
| Expo icon / adaptive / splash / notification | build-app-icons.mjs (mobile `icons:check`) |
| Android launcher / iOS AppIcon | expo prebuild from the same assets |
| GitHub social preview | the repository setting points at `madarek-og.jpg` (the same card) |

Anything new that shows the mark: render it from `<Logo>` (in-app) or add
it to a generator output + the manifest (static). The `mark-path-twin`
guard (identity-guard.mjs) already fails CI on any file carrying the mark's
literal diamond path outside the twelve sanctioned sources.
