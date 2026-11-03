# LEAD-REQUESTS (R334 mobile mission)

Requests from branch `feat/mobile-r334-pro` for changes **outside** `apps/mobile/**` and `docs/mobile/**`.
The lead applies these at merge. Format: what / why / exact diff / blocked-by.

## Requests

### LR-001: decision — `expo-navigation-bar` for gesture-bar contrast (Android edge-to-edge)
- **What:** Optionally add `expo-navigation-bar` to `apps/mobile/package.json` + plugin config for Android gesture-handle contrast under edge-to-edge.
- **Why:** SDK-58 edge-to-edge makes Android system bars transparent; without it the gesture handle can sit on low-contrast content in dark mode.
- **Exact diff:** none prepared — this is a lead decision; R334 works without it (status-bar handled via `expo-status-bar` + root-view tint via `expo-system-ui`, already installed).
- **Status:** open — deferred; not required for Round 1 (no native change made).
- **Raised by:** 2-f Theming (see `docs/mobile/foundations/theming.md`).

<!-- Template:
### LR-001: <title>
- **What:** ...
- **Why:** ...
- **Exact diff:** ...
- **Status:** open
-->
