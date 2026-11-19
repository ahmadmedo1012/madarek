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

## Increment 2 — colleges family (commit d04bd992, pushed)

`frontend/src/pages/colleges/CollegePages.tsx` + new `frontend/src/styles/colleges-guest.css`
(scoped to `main.content-inner`): pf-eyebrow registry classification on gallery+leaderboard,
`[01]` gutter index on the detail hero eyebrow, the guest join row at the detail masthead
(r183 A12 census gap), the 2-channel CTA hover seat, the guest mount's 8px phone inset.
Surgical className-level edits only (the `wip/r368-t5-public` line owns meta/SEO there).

- pages.mjs after: /colleges 100/100, /colleges/leaderboard 100/100,
  /colleges/fac01 99.8/100 light+dark @1440,390 (was 80/63.3, 80/63.3, 79.8/63.3).
- `TZ=UTC npx vitest run` r183 (B5+student pins, public-funnel, B8) + r312 + landing-funnel
  → 25 passed at commit time; 58 green after increment 7 (see below).

## Increment 3 — competitions family (commit b6149b51, pushed)

`frontend/src/pages/competitions/CompetitionsPages.tsx`: the reciprocal «المجتمع والفرص»
pair on both surfaces (index header + detail hero action row — R342-11 always-on phone-band
primary) + detail hero pf-eyebrow classification + `[01]` mono gutter index.

- pages.mjs (authed STUDENT, stub): /competitions 100/100 (390 was 83.3 — hover 0),
  /competitions/comp01 98.7/98.7 @1440 + 100/100 @390 (was 91.9/76.7).
- Competitions + landing-funnel unit 20 green; axe 0 critical/serious light @390,1440.

## Increment 4 — vision + document families (commit 82ddb693, pushed)

`frontend/src/pages/vision/VisionPages.tsx` + `frontend/src/pages/DocumentViewerPage.tsx`:
gallery header `[01]` + standing pair, detail hero eyebrow/index/pair, doc-reader head
eyebrow/index/pair as one trailing cluster. Real overflow bug fixed: the useCases badge row
rode the UNDEFINED `.flex-wrap` utility (components.css never defined it) and rendered
off-canvas at 320/390 (badges [-231..-57]) — now on `.pf-page-actions` (flex-wrap).

- pages.mjs (authed STUDENT, stub): /vision 96.7/80 → 100/100, /vision/ai-predictor
  93.3/76.7 → 100/100, /document/sample.pdf 93.3/76.7 → 100/100 light+dark @1440,390.
- vision+doc unit 23 green; axe 0 critical/serious on vision light+dark.

## Increment 5 — errors family (commit 7d3b8404, pushed)

`frontend/src/pages/NotFoundPage.tsx` + `frontend/src/styles/errors.css`: the 404 sheet
joins the numbered-sheet law — `[01]` mono gutter index on the eyebrow (`.nf-index` seat in
errors.css, the inner.css `.inx-head` recipe).

- pages.mjs: /404 96.7 → 100.0 light+dark @1440,390. /403,/500,/maintenance hold 96.7
  (≥ floor; see residuals — their eyebrow seat lives in the SHARED ErrorSheetPage,
  components/error/, outside T5 ownership). /legal/cookies holds 96.7 (single-CTA sheet
  by design — R366 L4 copy diet retired the second CTA).
- r324 text/type gates + titles + funnel 150 green.

## Increment 6 — families reviewed, NO edit needed (already ≥ floor at baseline)

Measured ≥96.7 both themes from the start; reviewed, no file touched:
`/auth` 100/99.6 · `/auth/register` 99.1 (darkInk 94 — muted demo-panel text, ≥90 gate) ·
`/auth/forgot-password` 100/98.8 · `/auth/reset-password` 100 · `/capabilities` 100 ·
`/about` 100 · `/help` 100 · `/contact` 100 · `/app` 100 · legal six ≥96.7 (cookies 96.7) ·
`/community` 99.2/99.6 (authed probe). PublicPages.tsx, CapabilityPages.tsx,
AppDownloadPage.tsx, CommunityPages.tsx, LegalPages: zero changes this wave (the
`wip/r368-t5-public` line already hardened /capabilities meta + a11y; not duplicated).

## Increment 7 — colleges sweep repair (commit fac668c3, pushed)

The final sweep found the leaderboard table at ≤640 had silently fallen to the §TABLE
ladder rung 2 (scroll): the R362 restore re-keyed rung 1 on `.table.tbl-stack` and this
table rode `.leaderboard-table.tbl-stack` only — measured 898px wide inside the wrap at
320/390. Fix: join the `table` class (like all 19 sibling consumers).

- Sweep after: /colleges/leaderboard 320/390/390@200%/768@200% clean, pageOverflowX=0
  (768 keeps the designed rung-2 wrap scroll — `.leaderboard-table-wrap` overflow-x:auto,
  scrollable 898>694, verified live).
- pages.mjs holds 100/100 light+dark @1440,390; r183+r312+landing-funnel unit 58 green;
  axe 0 critical/serious light+dark @390,1440 after the change.

## Dev specimens — /__brand, /__design, /__plates: EXEMPT (evidenced)

The r362 inventory (AGENT5-ROUTE-INVENTORY.md §1) carves these out as "Dev-plate +
catch-all carve-outs" — not renderable product routes; App.tsx:863 defines
`SPECIMEN_SURFACE_PREFIXES = ['/__design','/__brand','/__plates']`. Measured anyway this
run (probe @1440,390 light+dark): /__brand 72.9/55.8, /__design 79.6/63.1,
/__plates 69.8/55.5 — below floor by design (raw specimen surfaces, no guest-sheet
grammar). EXEMPT from the ≥90 gate per the task brief; not spent on.

## FINAL ACCEPTANCE SWEEP (all measured this run, vite :5305 + stub :4000)

### pages.mjs per-route — every inventoried public route ≥ floor 90, light+dark @1440,390

Raw: `final-guest-LIGHT.json`, `final-guest-DARK.json` (guest, 23 routes),
`final-authed-BOTH.json` (authed, 6 routes — seeded mdrk-auth STUDENT session, the
harness mirrors the pages.mjs probe verbatim). Worst cells:

| route | 1440 L/D | 390 L/D | note |
|---|---|---|---|
| /legal/cookies | 96.7 / 96.7 | 96.7 / 96.7 | single-CTA sheet by design (R366 L4) |
| /403 · /500 · /maintenance | 96.7 / 96.7 | 96.7 / 96.7 | eyebrow seat in shared ErrorSheetPage (lead) |
| /competitions/comp01 | 98.7 / 98.7 | 100 / 100 | typeRungs 92.1 (mono ط1/ط2/ط3 specimens) |
| /colleges/fac01 | 99.8 / 99.8 | 100 / 100 | |
| /community | 99.2 / 99.2 | 99.6 / 99.6 | |
| everything else (18 guest + 4 authed) | 100 / 100 | ≥98.8 / ≥98.8 | |

### axe — 0 critical/serious violations

`axe/final-guest-LIGHT.json` + DARK (10 routes × 390,1440), `axe/final-authed-LIGHT.json`
+ DARK (community/competitions/vision × 390,1440) — all cells 0 critical/serious.
Re-run after increment 7 on /colleges/leaderboard: 0 critical/serious light+dark @390,1440.

### Overflow sweep 320/390/768/1440 + 200% zoom — pageOverflowX=0 on every route × cell

BATCH1 (guest 10 routes): `sweeps/final-guest-BATCH1.json`. BATCH2 (this session,
12 guest + 6 authed routes): `sweeps/final-BATCH2.json`. 200% zoom = 390@200% (780 css px)
and 768@200% (1536 css px). Every recorded "offender" is evidenced as one of:
- designed scroll seats (page never widens, container scrollable, verified live):
  /colleges `.gallery-chip-strip` (R333 P-G3a, scrollable 394>374 @390),
  /colleges/leaderboard `.leaderboard-table-wrap` @768 (rung-2, 898>694),
  /community `.tabs` (r169a tablist scroller, 428>350 @390);
- lead-owned chrome: `cursor-dot-core`[-3..3] / `cursor-readout`[-9985..] at 1440 on every
  route (global custom cursor, `_chrome` zone — not T5 files);
- pre-existing, documented in 82ddb693: /document CANVAS[29..327] @320 inside
  `.pdf-canvas-wrap` (pdf.js stub-404 render; tabindex fix = PdfViewer.tsx, lead handoff).

### Lighthouse mobile (LH 12.8, mobile preset = 4x CPU + simulated 1.6Mbps/150ms RTT)

Against the production build (`frontend/dist`, `npm run build -w frontend`) served by a
local static server on :5307 with `/api` proxied to the stub and **gzip** mirroring
Vercel's content-encoding (uncompressed localhost numbers are meaningless: /auth = 60
without gzip — `lighthouse/nogzip-auth.json`). Reports in `lighthouse/`:

| route | PERF | FCP | LCP | TBT | CLS | a11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| /auth | 78 | 2.0s | 4.7s | 200ms | 0 | 100 | 100 | 100 |
| /capabilities | 80 | 2.0s | 4.1s | 260ms | 0.019 | 100 | 100 | 100 |
| /legal/privacy | 82 | 2.1s | 4.5s | 50ms | 0.005 | 100 | 100 | 100 |
| / (landing control, NOT T5) | 60 | 2.2s | 4.5s | 940ms | 0 | — | — | — |

**PERF < 90 residual — evidenced diagnosis, lead handoff.** The deficit is LCP render
delay, not weight: /auth LCP phases = TTFB 458ms, Load ~0ms, **Render Delay 4,224ms**
(LCP element = auth footer paragraph; nothing paints until the React SPA boots).
Transfer sizes are small (CSS 43KB gz, entry 68KB gz, react 54KB gz, fonts 20-46KB gz),
TBT 50-260ms, CLS ≤0.019 — all inside budgets. The levers (public-route prerender/SSG,
entry diet, preloader/guest-reveal timing, per-route CSS split) live in App.tsx shell /
vite config / `lib/motion/*` / landing sheets — all outside T5 file ownership. The
landing control (60, TBT 940ms) shows the property is shell-wide and worse outside T5's
families; T5's public routes are the app's best-scoring pages. Not gamed; not fixable
from the T5 file list.

## Residuals + lead handoffs (with evidence)

1. Lighthouse mobile PERF 78-82 < 90 on the 3 sampled public routes — shell boot render
   delay (above). Levers outside T5 ownership.
2. /403,/500,/maintenance pattern axis capped at 96.7 — the eyebrow/`[01]` seat for these
   sheets lives in the SHARED `ErrorSheetPage` (components/error/, not T5-owned). 2-line
   follow-up for the lead; /404 (T5-owned NotFoundPage) reached 100 as proof of recipe.
3. /legal/cookies 96.7 — single link per intent after R366 L4 copy diet; by design.
4. `/document` @320 CANVAS[-327..29] + scrollable-region-focusable (`.pdf-canvas-wrap`)
   — pre-existing pdf.js seat; one-word tabindex fix in PdfViewer.tsx (lead handoff).
5. `cursor-dot-core`/`cursor-readout` rects escape the 1440 viewport on every route —
   global custom-cursor chrome (`_chrome` zone, lead-owned), pageOverflowX=0 everywhere.
6. /auth/register darkInk 94 — muted demo-panel text (≥90 gate; deliberate quiet panel).
7. WebKit absent from this sandbox — dark cells measured via the site's own
   html[data-theme=dark] flip (the documented fallback); WebKit numbers not claimed.

## Gates mirrored this run (verify.sh is lead-only)

- `npm run typecheck` (root) — see final report line in the task message.
- `TZ=UTC` focused frontend suites: r357 (3) · r183+r312+landing-funnel (58) ·
  competitions+funnel (20) · vision+doc (23) · r324 errors+titles+funnel (150).
- `npm run lint:css -w frontend` — 20 errors, all in landing sheets (baseline held).
- `bash scripts/gates/stylelint-gate.sh` — ratchet-green.

## Reproduction

```bash
# fixture stub API (outside the repo):        node /home/z/t5-fixture/t5-stub-api.mjs
# own vite:  cd frontend && npx vite --port 5305 --strictPort
# probe:     node scripts/conformance/pages.mjs --routes /auth,/about --bps 1440,390 \
#              --url http://localhost:5305/            (+ --dark for the dark pass)
# authed probe/sweep/axe (harness mirrors pages.mjs verbatim + seeds the session):
#            node /home/z/t5-fixture/t5-capture.mjs --probe --auth --routes /community
# lighthouse: npm run build -w frontend && node /home/z/t5-fixture/static-server.mjs &
#            CHROME_PATH=/tmp/pw-browsers/chromium-1223/chrome-linux64/chrome \
#            npx lighthouse http://localhost:5307/auth --preset=… (see lighthouse/)
```
