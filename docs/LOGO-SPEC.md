# LOGO-SPEC — Madarek «مدارك» · the ONE mark, every seat, audited

> R366 Agent 2 · L1. This is the operational logo specification: what the
> mark IS, how it scales, which asset serves which surface, and the gates
> that keep every surface pinned to the one master. The brand canon
> (story, variants history, Arabic-first rules) lives in
> `docs/archive/redesign/r323/brand/BRAND.md` (AR/EN) and `docs/brand.md`;
> this document is the R366 completion: the optical ramps, the full
> surface inventory (web + mobile + e-mail + social + install surfaces),
> the dark-mode rules, and the audit that fails on drift.

## 1 · Construction (the 32-grid)

`viewBox 0 0 32 32` — two squares sharing the centre (16,16):

| element | value |
|---|---|
| axis square | `x=8, y=8, size=16` — corners on grid intersections |
| rotated square | `M16 5L27 16L16 27L5 16Z` — vertices on the grid axes (√2 tax snapped, 2.8% side difference, invisible) |
| the point | solid 4×4 orange at `x=22, y=6` — centre ON the NE grid intersection (24,8) |
| strokes | UNIFORM hairline, `stroke-linejoin="miter"`, radius 0, no fills except the point, no gradients, no shadows |
| colours | paper `#F6F6EE` · ink `#282828` · orange `#FA3600` — the only three |

Master source: `frontend/src/brand/mark.ts` (web) + `apps/mobile/src/brand/mark.ts`
(mobile) — byte-pinned twins (`r323-brand-system.test.ts`, the cross-tree pin).
Never edit one without the other.

## 2 · Optical size ramps (16 / 24 / 32 / 48 / 96+)

The component's stroke is **non-scaling**; below the 32-grid design size a
constant 1.5 px screen stroke reads progressively heavier (12.5% of height
at 12 px = 2.7× the designed 4.7%), so the ramp tapers
(`markStrokePx()`, `mark.ts`):

| mark height (px) | stroke (px) | note |
|---|---|---|
| 96+ | 1.500 | the design ratio — 4.7% of height |
| 48 | 1.500 | design size |
| 32 | 1.500 | design size |
| 26 | 1.359 | ramp |
| 24 | 1.313 | ramp |
| 22 | 1.266 | ramp |
| 16 | 1.125 | **= the favicon's sanctioned 2.25/32 ratio** |
| 14 | 1.078 | ramp (0.9 px floor below) |
| 12 | 1.031 | ramp floor territory |

- The **favicon ratio 2.25/32 (proportional)** is the ONLY sanctioned
  static deviation (`BRAND.md §min-sizes`): at a true 16 px seat the
  1.5/32 ratio dissolves.
- Minimums: **mark ≥ 16 px**; **horizontal lockup ≥ 88 px mark-height**
  (below that, the mark alone or nothing).
- Wordmark: stroke-only, ink height = the `size` prop; the wordmark's
  stroke is PROPORTIONAL (3.5 sheet units) so counters stay open at
  small sizes; below ~24 px ink the counters close — use the mark alone.

## 3 · Clear space

**½ mark height on every side** — no text, no card edge, no table rule
inside it. The «نقطة» (4/32 of the mark's side) is the quick ruler: the
clear space is 4× the point's size. Lockup clear space is measured from
the mark's ink box (5..27 on the 32-grid), not the viewBox.

## 4 · Colour variants & dark mode

| tone | ink | point | use |
|---|---|---|---|
| `auto` (default) | `currentColor` | `var(--accent)` | every themed surface — themes without props |
| `ink` | `#282828` | `#282828` | fixed light grounds (paper, photos) |
| `paper` | `#F6F6EE` | `#F6F6EE` | ink/dark grounds |
| `orange` | `#FA3600` | `#FA3600` | the one signal plate — rare |

Dark-mode rules (the sanctioned swap, and the only one):
- the point rides `var(--accent)`: `#FA3600` on light, the luminous ember
  `#FF5A1F` on dark — one `var()` and every `<Logo>` themes;
- static rasters are LIGHT-theme pinned (paper plates) by design: favicons,
  PWA icons, apple-touch, OG card, e-mail logo, mobile launcher icons —
  they ride the paper ground on any OS surface; the mobile adaptive
  `monochrome` + `notification-icon` are the WHITE silhouettes (Android
  13+ themed icons + status bar tint them itself);
- never box the mark in an orange background; never re-stroke, round
  joins, gradient, shadow, outline or non-uniformly stretch it.

## 5 · Wordmark vs symbol — usage per surface

| surface | asset | size rule |
|---|---|---|
| app sidebar rail (web) | `<Logo variant="mark" size={24}>` | ramp stroke |
| landing chrome (SheetNav) | `<Logo variant="mark" size={26}>` | ramp stroke |
| preloader (first paint) | `<Logo variant="mark" size={40}>` + wordmark 64 | animated draw, RM = complete |
| boot splash (hydration) | `<Logo variant="mark" size={96}>` | the largest seat |
| slow-server card | `<Logo variant="mark" size={40}>` | static |
| footer (landing) | `<Logo variant="wordmark">` | ink-height = prop |
| public page headers | `<Logo variant="mark" size={22}>` | ramp stroke |
| favicon (browser tab) | `favicon.svg` → PNG ladder → ICO | §6 ladder |
| apple-touch (iOS home) | `brand/icon-180.png` | maskable recipe 62% |
| PWA install (Android/iOS) | `brand/icon-192.png` · `icon-512.png` (maskable + any) | 62% centred, paper tile |
| OG / Twitter card | `brand/madarek-og.jpg` | 1200×630, lockup + tagline |
| e-mail header | `brand/email-logo.png` | 600×160 plate, lockup h=120 |
| mobile app icon | `apps/mobile/.../icon.png` | 1024, box 0.74, paper |
| Android adaptive | `adaptive-foreground` 0.55 transparent + `adaptive-background` paper + `monochrome` white | launcher shapes |
| mobile splash | `splash-icon.png` | 1024 transparent, hairline (the in-app construction) |
| notification (Android) | `notification-icon.png` | 96, white silhouette |
| in-app header (mobile) | mobile `<Logo>` from the mobile twin | same geometry |

**ONE-logo law**: never add a second mark. Gates:
`identity-guard.mjs` (the diamond-path twin guard) ·
`scripts/brand/build-assets.mjs --check` (byte manifest) ·
`scripts/r318/logo-audit.mjs` (this spec's audit: geometry twins, SVG
geometry, raster IoU + point presence, wiring, orphans —
`audits/evidence/r318/logo-audit.md` is the surface table).

## 6 · The favicon ladder (R366)

`index.html` declares, in order: SVG → PNG 48/32/16 → ICO (16/32/48
PNG-in-ICO frames). Modern engines take the SVG; Safari/legacy take the
best PNG; the long tail reads the ICO. The PNG seats are paper-plated
(legible on dark tabs) with the favicon stroke ratio and box 0.86 — the
same recipe as the mobile `favicon.png`.

## 7 · Pipeline (who writes what)

| asset | writer |
|---|---|
| `favicon.svg`, `brand/mark.svg`, `madarek-mark.svg`, `lockup*.svg`, `icon-{180,192,512}.png`, `madarek-og.jpg` | `scripts/r323/brand-assets.mjs` |
| `brand/wordmark.svg` + `src/brand/wordmark.generated.ts` | `scripts/r323/wordmark-build-r323.mjs` |
| mobile rasters (`icon/adaptive×3/splash/favicon/notification`) | `scripts/brand/build-app-icons.mjs` |
| `brand/email-logo.png`, `favicon-{16,32,48}.png`, `favicon.ico` | `scripts/r318/logo-audit.mjs --emit` (R366) |

The single door stays `scripts/brand/build-assets.mjs`
(`--web/--mobile/--manifest/--check`); the manifest now carries 23 assets
including the R366 emission set. After any legitimate regeneration:
`node scripts/brand/build-assets.mjs --manifest`, commit.

## 8 · Audit command

```bash
node scripts/r318/logo-audit.mjs          # audit — exit 1 on any drift
node scripts/r318/logo-audit.mjs --emit  # regenerate the R366 emission set
```

Verified: 23 surfaces · 0 failures (see
`audits/evidence/r318/logo-audit.md`); drift-injection test — a
corrupted `favicon-32.png` fails BOTH the raster IoU/point-presence leg
and the byte-manifest leg, and the restored file passes again.
