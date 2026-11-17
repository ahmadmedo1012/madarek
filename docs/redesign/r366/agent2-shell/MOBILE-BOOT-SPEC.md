# MOBILE-BOOT-SPEC — R366 Agent 2 → Agent 5 · the native boot, one material

The asset contract for the boot sequence the mobile app owns. You own the
boot component (`apps/mobile/app/_layout.tsx`, the animated splash
handoff); I own every asset + static identity referenced below. Nothing
here requires a change on the web side — this is the parity contract.

## 1 · The native splash (the pre-JS frame)

| field | value | source |
|---|---|---|
| image | `apps/mobile/assets/images/splash-icon.png` — 1024, transparent, the mark at box 0.8, hairline stroke (the in-app construction) | `scripts/brand/build-app-icons.mjs` (byte-pinned by `scripts/brand/asset-manifest.json` + `build-app-icons.mjs --check`) |
| imageWidth | 120 (dp) | `app.config.ts` → `expo-splash-screen` |
| backgroundColor (light) | `#F6F6EE` — the paper | same |
| backgroundColor (dark) | `#282828` — the ink | same (the ONLY sanctioned dark-ground pair — `dark: { backgroundColor }`) |
| Android status-bar tint | notification colour `#FA3600` | `expo-notifications` plugin |

The icon is geometry-identical to the web `<Logo variant="mark">`
(cross-tree twin pinned by `r323-brand-system.test.ts` + verified by
`scripts/r318/logo-audit.mjs` — IoU 1.0000). Never regenerate it from a
screenshot; only `build-app-icons.mjs --png` writes it.

## 2 · The handoff (native splash → first screen, no flicker)

The rule the web boot already proves (see LOADERS.md): **the ground
colour never changes between the native frame and the first JS frame.**

1. Native splash paints paper `#F6F6EE` (dark: `#282828`) + the mark at
   120dp.
2. Your boot component's FIRST frame must paint the SAME ground
   (`src/design/`'s theme ground resolves to the same two values) with
   the mark at the SAME seat and scale — the perceived handoff is then
   motion-only (the mark's entrance), never a colour/geometry jump.
3. Timing: the splash's `preventAutoHide` window should overlap the
   first JS frame by ≥ 0 (hide only after the first frame is committed
   — `react-native-splash-screen`/`expo-splash-screen`'s native hide
   on layout). The web's measured reference: the boot plate → splash →
   app chain keeps every full-screen layer ≤ 250 ms of exit overlap and
   NEVER stacks two logos (the `r323-loader-overlap` e2e pin).
4. Reduced-motion / offline: no entrance animation on the mark; the
   static splash hands off to the static first frame.

## 3 · The notification + launcher identity (already pinned)

- launcher: `icon.png` 1024 paper tile, mark box 0.74, favicon-ratio
  stroke (Android mipmaps / iOS AppIcon generated at `expo prebuild`)
- adaptive: foreground 0.55 transparent + background paper +
  monochrome white silhouette (Android 13+ themed icons)
- notification: `notification-icon.png` 96 white silhouette

All byte-pinned — `logo-audit.mjs` fails on any drift (IoU ≥ 0.965 +
point-presence + dimension + manifest legs).

## 4 · The in-app header logo

`apps/mobile/src/brand/Logo.tsx` renders from the mobile `mark.ts` twin
— the same geometry, `tone="auto"` semantics (ink = `currentColor`, the
point = the accent token). Do NOT introduce a second mark anywhere
(notifications, empty states, About screens): render `<Logo>` or request
a new static seat through the generators (docs/LOGO-SPEC.md §7).
