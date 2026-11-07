# LEAD-REQUESTS (R334 mobile mission)

Requests from branch `feat/mobile-r334-pro` for changes **outside** `apps/mobile/**` and `docs/mobile/**`.
The lead applies these at merge. Format: what / why / exact diff / blocked-by.

## Requests

### LR-001: decision — `expo-navigation-bar` for gesture-bar contrast (Android edge-to-edge)
- **What:** Optionally add `expo-navigation-bar` to `apps/mobile/package.json` + plugin config for Android gesture-handle contrast under edge-to-edge.
- **Why:** SDK-58 edge-to-edge makes Android system bars transparent; without it the gesture handle can sit on low-contrast content in dark mode.
- **Exact diff:** none prepared — this is a lead decision; R334 works without it (status-bar handled via `expo-status-bar` + root-view tint via `expo-system-ui`, already installed).
- **Status:** **RESOLVED by r340/T-M5** — `expo-navigation-bar@~58.0.4` installed; plugin `enforceContrast: true` in `app.config.ts`; theme-derived `AppNavigationBar` (`src/design/navbar.tsx`) mounted at the root (`app/_layout.tsx`). New native dep → new runtime fingerprint → needs a binary build (see `scripts/build-android-local.sh` + `docs/mobile/ANDROID-LOCAL.md`); OTA alone cannot ship it.
- **Raised by:** 2-f Theming (see `docs/mobile/foundations/theming.md`).

<!-- Template:
### LR-001: <title>
- **What:** ...
- **Why:** ...
- **Exact diff:** ...
- **Status:** open
-->

### LR-002: URGENT — main is red on its own `check-icons.sh` gate (r333 WAVE 5 regression)
- **What:** `frontend/src/pages/LandingPage.tsx:402` contains a raw `<svg>` (inline SVG outside the documented allowlist) — introduced by main's `d58a29e` (r333 WAVE 5). It fails the `Design gates` CI job on **main itself** and therefore on this branch (rebased superset; the file is byte-identical to `origin/main`).
- **Why:** CI on `feat/mobile-r334-pro` shows one failure from this; every other job is green (typecheck, E2E ×2, lint, DB integration, frontend/backend tests, build, drift, size gate).
- **Exact diff (lead's choice):** either convert the inline SVG at `LandingPage.tsx:402` to the documented `Illustration`/`Icon` primitives, or add the file to the allowlist in `scripts/check-icons.sh` with a category comment.
- **Status:** open — **cannot be fixed from the mobile branch** (`frontend/**` and `scripts/` are read-only for R334 by mission rules).
- **Raised by:** R334 lead-of-mission, final CI verification pass.
