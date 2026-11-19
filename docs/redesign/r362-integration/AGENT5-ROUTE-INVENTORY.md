# R362 · Agent 5 — The Complete Route Inventory (recalculated)

**Branch**: `agent/r362-web-product` · **Base**: `integration/r362-final-unification`
**Machine source**: `frontend/tests/r362/sweep-routes.ts` (the 126-row table) — pinned
against `src/App.tsx` by `frontend/tests/unit/r362-sweep-table.test.ts` (a structural
parser that reads the wrapper-`<Route>` guard stack, including the 11 multi-line
`<Route>` declarations the legacy single-line regex cannot see). The audit table
(`frontend/tests/audit/routes.ts`) was recalibrated in the same wave and now matches
the router 1:1.

## 1. The recalculated numbers

The historical report said "approximately 140 routes and 76 page files." Recalculated
from the actual source:

| Measure | Count | Derivation |
|---|---|---|
| Route registrations in `App.tsx` | **141** | every `<Route path=…>` row, single-line and multi-line |
| Redirect-only rows | **12** | `Navigate`/`ParamRedirect`/`HomeRedirect` bodies (bookmarks keep working) |
| Dev-plate + catch-all carve-outs | **4** | `/__brand`, `/__design`, `/__plates`, `*` |
| **Renderable product routes** | **125** | the sweepable surface |
| + the guest root `/` | 1 | `HomeRedirect` renders the landing for guests |
| **Sweep table rows** | **126** | what `npm run test:r362` proves, route by route |
| Physical page files | 76 | `frontend/src/pages/**` (94 files incl. helpers/filters) |
| Unique page components mounted | 109 | distinct elements in the route table |

## 2. Per-role inventory

Role = the `ProtectedRoute allow=[…]` wrapper that mounts the route (the client mirror
of the backend capability contract). "Swept" = visited by its owning role against the
live stack (seeded Neon, real API) with render + title + no-page-error + no-console-error
+ no-5xx assertions (`tests/r362/route-sweep.spec.ts`).

### GUEST — 24 routes (public, chrome-less or shell-lite)

| Route | Page component | Workflow |
|---|---|---|
| `/` | HomeRedirect → landing | guest landing / role-home redirect |
| `/auth` · `/auth/register` | AuthPage · RegisterPage | login · registration (+ demo-account panel) |
| `/auth/forgot-password` · `/auth/reset-password` · `/auth/verify-email` | auth/ pages | recovery + verification sheets |
| `/capabilities` | CapabilitiesPage | the product capability sheet |
| `/legal/{privacy,terms,cookies,accessibility,security,data}` | LegalPages | the six public policy sheets |
| `/about` · `/help` · `/contact` · `/app` | PublicPages/AppDownloadPage | info · help · contact · app download |
| `/colleges` · `/colleges/leaderboard` · `/colleges/:id` | CollegePages | public college gallery/leaderboard/detail |
| `/404` · `/500` · `/403` · `/maintenance` | error pages | the routed error sheets |

### STUDENT — 34 routes + the labs widening

Dashboard · schedule · calendar · courses · course detail (`:offeringId`) · lecture
player (`:lectureId`) · catalog · results · library · research (+ upload) · MOOC ·
jobs · AI assistant · gamification · skills · alerts · messages · AR/VR · social ·
downloads · university info · live · payment · campus map · matrix · profile ·
webinars · online exams · exam taker (`:id`) · training catalog/track/lesson ·
achievements · community — plus `/student/labs` (STUDENT **and** TEACHER, the one
documented widening, r155c).

### TEACHER — 21 routes

Dashboard · schedule · attendance · grades · materials (+ PDF upload) · research ·
students · performance · assignments · exam bank · template detail (`:templateId`) ·
messages · AI assistant · library · alerts · academic intelligence · offering detail
(`:offeringId`) · profile · live management · labs · community.

### ADMIN (registrar general) — 16 routes

Dashboard · students · contact directory · person file (`:id`) · teachers ·
permissions console (`:id`) · faculties & departments · courses · digital
transformation · reports · platform settings · mail · import wizard · alerts ·
community — plus `/admin/analysis` (the in-page redirect to `/admin/reports?trend=table`).

### QUALITY — 10 routes

Dashboard · course quality · professor evaluation · engagement & attendance ·
reports · curriculum review · personal notifications inbox · operational alerts ·
exam moderation (capability-gated for the exams seat, R353 E2) · community.

### OWNER — 14 routes

Dashboard · users · institutions console · institution detail (`:slug`, the academic
setup context) · activity log · content & brand · system & operations · education
view · realtime monitoring · AI center · personal notifications · operational alerts
· advanced governance · pilot feedback inbox.

### ANY authenticated — 6 routes

Vision gallery + detail (`:slug`) · account settings · document viewer
(`:filename`) · competitions + detail (`:id`).

## 3. Page-state coverage (the §12 completion bar)

Every renderable route was exercised by its owning role; per route the sweep proves
**resolution** (no guard bounce), **render** (visible `h1`/main/state node — an
eternally-pending skeleton fails as a hang), **title** (`document.title`, the shell
resolver contract), **API error handling** (zero 5xx), and **client hygiene** (zero
page errors, zero app console errors). The states pass additionally proves, on the
representative slice (every role dashboard + AI + courses + grades + settings):
mobile-360 layout integrity (RTL lock, no horizontal overflow, bottom-nav present,
first Tab stop = skip link), dark-theme re-render, and the cold-paint loading surface.
Access integrity: all 5 role-prefixes × all 4 foreign roles bounce to the visitor's
own home; guests bounce to `/auth`; the any-auth surfaces stay reachable for all
roles (`tests/r362/guard-matrix.spec.ts`).

## 4. Fixes landed in this wave

| # | Defect | Where | Fix |
|---|---|---|---|
| 1 | The conversation rail rendered `<aside>` inside the shell's `<main>` landmark — axe `landmark-complementary-is-top-level` fired at 360px | `AiAssistantPage.tsx` | labeled `<section aria-label>` (the Sidebar/AnnotationsPanel precedent) |
| 2 | Same landmark nesting on the exam-template detail rail | `ExamAuthorPages.tsx` | same conversion |
| 3 | The `.upload-file-field/-name/-remove` CSS family had been swept out while both upload modals kept consuming the classes — the picked-file chip rendered unstyled | `student.css` | family restored (surface-2 chip, LTR filename, 44px remove target) |
| 4 | No drag-and-drop on either PDF upload surface | `components/pdf/UploadDropZone.tsx` | drop = pick (same validation pipeline); wired into the research + materials modals |
| 5 | AI code answers rendered as literal backtick lines in the RTL paragraph rhythm | `aiReplyFormat.ts` + `AiAssistantPage.tsx` | fenced blocks → verbatim LTR mono `<pre>` + language chip + copy verb; inline `` `code` `` → LTR mono chips; streaming-safe (unclosed fence closes at end-of-input) |
| 6 | No keyboard parity for stopping a stream | `AiAssistantPage.tsx` | Esc aborts an in-flight stream (listener mounted only while streaming); the stop verb carries the `(Esc)` hint |
| 7 | The audit route table was stale: fictional `/admin/sync`, 24 missing routes (the auth-recovery + public sheets, the newer admin/owner surfaces, `/settings`) | `tests/audit/routes.ts` | recalibrated to match the router 1:1; `roleForRoute` mirrors the rulings |
| 8 | The legacy route-coverage regex could not see the 11 multi-line `<Route>` rows | new parity parser in `r362-sweep-table.test.ts` | structural parse (guard stack + multi-line rows); both-direction set equality |

## 5. Known defects (honest, tracked)

1. **Intermittent 13px gray-on-dark contrast flash on `/owner/dashboard`** (dark
   theme, mobile) — the dev-mode axe reporter caught `#868683`-family foregrounds on
   `#2c2c2c`-family surfaces at ~3.2–4.0:1 during load; the element is transient
   (present during the pending window, gone from the settled DOM — deterministic
   reproduction attempts against the live stack came back clean). Suspect family:
   a muted text token (or an opacity blend of one) consumed at the 13px metadata
   register on a dark surface. Needs a dedicated axe pass with element capture
   (recommendation: extend `tests/audit` to pin `color-contrast` violations per
   route rather than the debounced dev reporter).
2. **The dev-mode axe reporter races sweep assertions** — it logs through
   `console.error` with a 1s debounce, so a hard console gate in timing-sensitive
   specs is flaky by construction. The r362 states spec filters it (documented at
   the filter) while tracking what it surfaced (defects 1–2 above are the findings
   it contributed).

## 6. Re-running the coverage

```bash
# the full stack (embedded PG or DATABASE_URL + seeded DB + test accounts)
npm run dev:full             # or the Neon DATABASE_URL variant used for this wave

# every route, every role — 176 tests
cd frontend
MADAREK_E2E_BASE_URL=http://localhost:5173 \
MADAREK_E2E_EXECUTABLE=/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome \
  npm run test:r362

# slices: R362_ONLY=<route-path[,…]> · R362_ROLE=STUDENT,OWNER
```

The parity gate and the formatter/drop-zone unit pins ride the normal vitest suite
(`npm test -w frontend`); CI is untouched (the r362 project is opt-in like `flows`).

## 7. R368 T5 addendum — the public route inventory, reviewed state (wave5)

The r368 Task 5 wave (branch `wip/r368-t5`, commits 83749b03…fac668c3) visually reviewed
every public route below against the 6-axis `scripts/conformance/pages.mjs` gate (floor 90,
light+dark, bps 1440/390). Evidence + raw JSON: `docs/audit/evidence/wave5-notes/` (NOTES.md
is the index). The auth-only families were probed with a seeded `mdrk-auth` STUDENT session
against a read-only fixture API (no postgres in that sandbox — disclosed in NOTES.md).

| family | routes | state | pages.mjs after (1440/390, L+D) |
|---|---|---|---|
| auth | /auth, /auth/register, /auth/forgot-password, /auth/reset-password | already conformant | 100/99.6 · 99.1/99.1 · 100/98.8 · 100/100 |
| auth | /auth/verify-email | **rebuilt** (83749b03) | 70/53.3 → **100/100** |
| colleges | /colleges, /colleges/leaderboard, /colleges/:id | **family pass** (d04bd992) + sweep repair (fac668c3: the leaderboard table rejoined the `.table.tbl-stack` ladder rung 1) | 80/63.3 · 80/63.3 · 79.8/63.3 → **100/100 · 100/100 · 99.8/100** |
| capabilities | /capabilities (+ /features alias) | already conformant (meta/a11y owned by `wip/r368-t5-public` line, not duplicated) | 100/100 |
| community | /community | already conformant (authed probe) | 99.2/99.6 |
| competitions | /competitions, /competitions/:id | **family pass** (b6149b51) | 91.9/76.7-ish → **100/100 · 98.7/100** |
| vision + document | /vision, /vision/:slug, /document/:fn | **family pass** (82ddb693; incl. the undefined `.flex-wrap` overflow fix) | → **100/100 · 100/100 · 100/100** |
| about/help/contact | /about, /help, /contact | already conformant | 100/100 ×3 |
| legal | /legal/{privacy,terms,cookies,accessibility,security,data} | already conformant (cookies 96.7 = single-CTA sheet by design, R366 L4) | 100 ×5 · 96.7 (cookies) |
| download | /app | already conformant | 100/100 |
| errors | /404, /403, /500, /maintenance, `*` | **/404 rebuilt** (7d3b8404); 403/500/maintenance hold 96.7 — the eyebrow seat lives in the shared ErrorSheetPage (components/error/, lead follow-up) | /404 96.7 → **100/100**; rest 96.7 ≥ floor |
| dev specimens | /__brand, /__design, /__plates | **EXEMPT** — dev-plate carve-outs (§1; App.tsx SPECIMEN_SURFACE_PREFIXES); measured 72.9/55.8 · 79.6/63.1 · 69.8/55.5, not gamed | n/a |

Redirect-only aliases (no visual surface): /login→/auth, /register→/auth/register,
/universities→/colleges, /features→/capabilities. Overflow sweep (320/390/768/1440 +
390@200%/768@200%): pageOverflowX=0 on every route × cell; all rect escapes are evidenced
designed scroll seats, lead-owned cursor chrome, or the pre-existing pdf.js canvas seat
(NOTES.md §FINAL ACCEPTANCE SWEEP). axe: 0 critical/serious on 13 routes × 2 themes.
Lighthouse mobile on /auth, /capabilities, /legal/privacy: a11y/best-practices/SEO 100×3;
PERF 78/80/82 — the LCP render-delay diagnosis + lead handoff is in NOTES.md.
