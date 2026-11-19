# T5 wave5 notes — r368-t5 (public pages visual pass)

Worktree `/home/z/wt/r368-t5`, branch `wip/r368-t5`, base 76de5a8c.
Instruments: own vite on :5305 (`cd frontend && npx vite --port 5305 --strictPort`),
`node scripts/conformance/pages.mjs … --url http://localhost:5305/` (light + `--dark`),
`PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers` for every browser run.

## Measurement environment (honest disclosure)

This sandbox has **no postgres and no backend** (`tools/boot-pg.sh` documents that the
embedded-PG binaries are not installed here). The public pages whose content comes
from the API would otherwise be measured in their ERROR state. A read-only **fixture
API stub** runs on :4000 (`/home/z/t5-fixture/t5-stub-api.mjs`, outside the repo) —
it mirrors the backend envelope `{ data }` and the exact interface shapes from
`frontend/src/hooks/resources/*` + `backend/src/http/routes/colleges.routes.ts`
(25-college registry from `frontend/src/data/colleges.config.ts`). The vite proxy
forwards `/api/v1` to it. All GET fixtures are listed in that file; no repo file
depends on it. Numbers below are measured against this fixture data.

## Route inventory (refreshed — T5 families)

PUBLIC/guest (measured directly by pages.mjs): `/auth`, `/auth/register`,
`/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`,
`/capabilities`, `/about`, `/help`, `/contact`, `/app`, `/legal/{privacy,terms,
cookies,accessibility,security,data}`, `/colleges`, `/colleges/leaderboard`,
`/colleges/:id` (sample `fac01`), `/404`, `/500`, `/403`, `/maintenance`, `*`→404.

AUTH-ONLY families owned by T5 (pages.mjs is a guest instrument — no login support —
so their cells are measured with a seeded `mdrk-auth` localStorage session against
the same stub; see the community/competitions/vision section): `/community`,
`/competitions`, `/competitions/:id`, `/vision`, `/vision/:slug`,
`/document/:filename`.

Aliases (redirect-only, no visual surface): `/login`→`/auth`, `/register`→
`/auth/register`, `/universities`→`/colleges`, `/features`→`/capabilities`.

## Baseline (before any T5 edit) — pages.mjs, bps 1440,390

Full table in `baseline/pages-results-ALL-GUEST.LIGHT.json` +
`baseline/pages-results-ALL-GUEST.DARK.json` (raw instrument output). Worst cells:

| route | 1440 light | 390 light | 1440/390 dark | failing axes |
|---|---|---|---|---|
| /auth/verify-email | 70.0 | 53.3 | 70.0 / 53.3 | pattern 20 (bare .auth-page card: no eyebrow/numeral/CTA-pair), hover 0, edge390 0 @390 (20px gutters) |
| /colleges | 80.0 | 63.3 | 80.0 / 63.3 | pattern 80 (eyebrow ✗), hover 0 (CTA 1 channel), edge390 0 @390 (20px gutters) |
| /colleges/leaderboard | 80.0 | 63.3 | 80.0 / 63.3 | same as /colleges |
| /colleges/fac01 (detail) | 79.8 | 63.3 | 79.8 / 63.3 | same + typeRungs 99 |

All other guest routes ≥ 96.7 both themes (floor 90): /auth 100/99.6 ·
/auth/register 99.1 (darkInk 94 — muted demo-panel text, still ≥90 gate) ·
/auth/forgot 100/98.8 · /auth/reset 100 · /capabilities 100 · /about 100 ·
/help 100 · /contact 100 · /app 100 · legal six 100 (cookies 96.7, pattern 80:
no CTA pair — it is the storage-policy sheet, single link out) ·
errors 96.7 (pattern 80: numeral row yes, CTA pair yes, hairline yes, eyebrow yes… axis 4/5).

## Increment 1 — auth family: /auth/verify-email rebuilt on the family grammar

`frontend/src/pages/auth/VerifyEmailPage.tsx` — the only auth sheet still on the
retired bare `.auth-page/.auth-card` card. Rebuilt on the r341/D1 guest-door recipe
the forgot/reset sheets ride (`auth-shell` frame + grain + TechnicalSheet,
`.auth-meta` phase eyebrow, `[01]` ruled row, `.auth-submit.auth-primary-link`
fill-wipe door, register-prompt second door). r357 unit contract preserved
byte-for-byte (testid message row, verbatim backend refusal, missing-token guard).

- `cd frontend && TZ=UTC npx vitest run tests/unit/r357-verify-email.test.tsx`
  → 3 passed.
- pages.mjs after: **100.0 / 100.0 light, 100.0 / 100.0 dark** (was 70.0/53.3).
- No CSS change (all classes pre-exist in patterns.css — global).

## Increment 2 — colleges family (see colleges section below)

(added after the work lands)
