# R305 — auth/public/shared-surfaces + independent QA test area

Isolated Playwright area for `redesign/r305-heron-auth-public-qa` (R305-A9).

- Project: `r305` in `frontend/playwright.config.ts` (testDir `./tests/r305`).
- Run: `npm run test:r305` (from `frontend/`) — boots the Vite dev server
  via the shared `webServer` hook, no backend/DB needed (specs use the
  same mock-transport approach as `tests/e2e/fixtures/`).
- Suffix: every file is `*.e2e.ts` so vitest (include
  `tests/**/*.{test,spec}.{ts,tsx}`) never collects Playwright specs.
- Scope: guest/authenticated layout basics, mobile overflow/collisions,
  focus + keyboard navigation, theme + reduced-motion, button/link
  interaction feedback, broken images/requests + JS errors, route
  loading/empty/error behavior, representative responsive screenshots
  (1440×1000, 768×1024, 390×844, 360×800, 320px).

R305-A9 contract: do not rebaseline `tests/audit/surface-baseline.json`
from here; do not weaken existing gates. Obsolete assertions are
reported, never silently re-pinned.
