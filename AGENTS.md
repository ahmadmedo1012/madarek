# AGENTS.md — Madarek repo guide (for humans and AI agents)

Madarek (مدارك) is an independent, Arabic-first smart-learning platform: one service —
Express + TypeScript + Prisma backend that also serves the built React 18 + Vite SPA —
deployed to Vercel (web + API as one project) with Neon PostgreSQL; Render is the suspended standby (the rollback path). The UI is fully Arabic RTL. **Code wins over
docs**: on any conflict, fix the doc in the same change. Platform docs (docs/01–16,
docs/modules/) are Arabic; generated references (docs/*-REFERENCE.md) are English.

## 1. Repo map (one line per directory)

| path | what lives there |
|---|---|
| `frontend/` | `@madarek/frontend` — React 18 + Vite SPA: `src/App.tsx` shell, `src/pages/` (incl. `LandingPage.tsx`), `src/components/landing/sections/*.tsx` (landing seats), `src/styles/` (token + layer + feature CSS), `stores/` (zustand), `tests/` (vitest + Playwright e2e/audit/r305) |
| `backend/` | Express + TS + Prisma workspace: `src/app.ts`, `src/http/routes/*.ts` (API), `src/modules/*`, `src/lib/` (permissions, governance, storage), `prisma/schema.prisma` + `migrations/` + `seed.ts` |
| `apps/mobile/` | Expo ~58 (React Native) app with its own lockfile — see `apps/mobile/README.md` |
| `scripts/` | `verify.sh` (the ONE gate set) + gates: `check-bundle-size.mjs`, `check-{icons,colors,raw-css,motion-tokens,csp-hash}.sh`, `tokens/build.mjs`, `verify-parity-export.mjs`, `spec/extract-heron.mjs`, round dirs (`r314…r333`, history), `gates/` (stylelint ratchet + css-counts/coverage), `deadcode/` (knip/jscpd ratchet) |
| `scripts/conformance/` | visual conformance instrument: `run.mjs`, `pages.mjs` (per-page ≥90 gate), `panel.mjs` (blind panel judging), `scroll.mjs`, `interact.mjs`, `tween.mjs`, `mapping/*.json` (section→DOM binding), `ratchet.json` (monotonic floor — 91.8), `results.json` |
| `shared/` | `design-tokens.json` (source of generated tokens), `brand/`, `testAccounts.ts` |
| `specs/` | SpeckKit feature specs (001–012); live status is `docs/SPECS-REFERENCE.md`, **not** `specs/*/spec.md` |
| `tools/` | `boot-pg.sh` (local postgres), `daemon.js` |
| `docs/` | Arabic platform docs 01–16 + `modules/` + `architecture/` + `redesign/` (round history r305…r341; `redesign/r335/heron-spec/*.json` = frozen reference; `redesign/r341/` = current program: QUEUE/HANDOFF/OWNERSHIP/tasks/arsenal; r338–r340 = closed rounds still on disk — r333/r335/r337 docs already under `docs/archive/redesign/`) |
| `.github/workflows/` | `ci.yml` (full gate matrix), `size-gate.yml`, `mobile.yml`, `deploy-smoke.yml`, `deploy-vercel.yml`, `build-android.yml`, `build-ios-sidestore.yml`, `mobile-builds-ledger.yml`, `tick.yml` + `tick-watch.yml` (R352 K4 self-healing probe), `vercel-usage-watch.yml`, `config-pages.yml`, `deadcode.yml` — runners pinned to `ubuntu-24.04` (the Render-era `keep-warm.yml` was deleted at R352 L3) |

Sources of truth (don't guess, read): endpoints → `backend/src/app.ts` + `http/routes/`
(full table: `docs/API-REFERENCE.md`); models → `backend/prisma/schema.prisma`
(`docs/DATABASE-REFERENCE.md`); env vars → `backend/src/env.ts` (`docs/06-configuration.md`);
design tokens → `frontend/src/styles/tokens.css` (wins over `DESIGN.md`) +
`shared/design-tokens.json`; route strings → `frontend/src/lib/routes.ts` (the
r341/Y2 single source); commands → the three `package.json` files; deploy →
  `vercel.json` + `.github/workflows/deploy-vercel.yml` (Render's `render.yaml` stays as the standby recipe).

## 2. Commands

Package manager is **npm only** (no pnpm/yarn). Node `>=20 <25`. Workspaces: `backend`, `frontend`.

```bash
npm install                    # both workspaces (root)
npm run dev                    # backend on :4000 (tsx watch)
npm run dev:web                # frontend vite on :5173, /api proxied → :4000
npm run dev:full               # scripts/r319/dev-full.mjs (both + local pg)
npm run lint                   # eslint frontend/src backend/src — 0 errors required
npm run typecheck              # tsc both sides + tests — needs no database
npm test                       # vitest both sides, no DB — measure your count from the current tree
# single test file / case:
cd frontend && TZ=UTC npx vitest run src/lib/foo.test.ts [-t "case name"]
cd backend && npx vitest run src/modules/bar.test.ts
npm run build -w frontend      # tsc -b && vite build — needs no DB
# NEVER run root `npm run build` without a live DATABASE_URL (it migrates + seeds)
cd frontend && npx playwright test tests/e2e/<file>.ts   # single e2e spec
```

Verification — the ONE local gate set (run before every push):

```bash
bash scripts/verify.sh                       # full set = what CI runs (~8 min)
bash scripts/verify.sh --fast                # tsc + vitest + bundle + stylelint/CSS-ratchet gate (~4 min)
bash scripts/verify.sh --sections home-why-wrap   # scope conformance by section keys
bash scripts/verify.sh --specs r305-shell-heron   # scope e2e by spec file stem
```

Conformance instrument (`scripts/conformance/run.mjs`) — always point it at YOUR OWN dev
server, never a shared one:

```bash
cd frontend && npx vite --port 5320 --strictPort &        # your own port
node scripts/conformance/run.mjs --url http://localhost:5320 \
     --sections home-why-wrap,footer --bps 1440,390        # default: all 9 sections × 5 bps
```

Flags: `--url <base>` (default `:5173`) · `--sections <keys>` · `--bps <list>` ·
`--gate` (check vs `ratchet.json`) · `--ratchet` (raise floor to current — NEVER lower) ·
`--dark` (re-assert the same pairs under the site's own `html[data-theme=dark]` flip +
token-flip census + WCAG contrast ≥3.0) · `--scroll` / `--interact` (scroll-feel curves,
hover/focus-visible deltas). Section keys: `home-{hero,intro,problem,why,platform,map,
usecase,cta}-wrap`, `footer` (+ `_chrome` for chrome specs).

CSS: `npm run lint:css -w frontend` (stylelint 16), `npm run gate:css-coverage -w frontend`.

## 3. Gates & ceilings

CI (`ci.yml` jobs: lint, typecheck, build, test-frontend, test-backend, db-integration,
e2e, ios-webkit, design-gates, conform-gate, surface-drift; plus `size-gate.yml`) mirrors
these local gates — all runners pinned `ubuntu-24.04`:

- **Bundle** — `scripts/check-bundle-size.mjs`, gz, `dist/assets/*.js` ONLY (CSS is not in
  the gate): **total ≤ 770 KB HARD** (R339 restored r337's 777 — 13 KB slack invited
  bloat; measured 764.1 at the re-pin), entry ≤ 92, pdf ≤ 110. It
  sums ALL js chunks **including async chunks** — lazy-splitting only moves weight; the
  honest lever is real code cuts (e.g. the axios→native-fetch diet, −17.9 KB).
- **Conformance ratchet** — `scripts/conformance/ratchet.json` is monotonic: `--gate`
  checks, `--ratchet` raises, never lower. Section target = ≥90% on ALL 5 breakpoints +
  dark (+ WebKit where available). No-counterpart = FAIL. Skipped plumbing (defs/mask/
  filter scaffolding) must be declared in the mapping's `plumbing: [{section, heron,
  skip, reason}]` — skipped cells are counted, never silent.
- **Design gates** — `check-icons.sh` (Lucide icons only, via `Icon.tsx`),
  `check-colors.sh --strict` (no raw hex/rgb), `check-raw-css.sh --strict` (no raw
  type/radius/spacing), `check-motion-tokens.sh`, `check-csp-hash.sh` (update the CSP
  hash in `backend/src/app.ts` whenever `frontend/index.html` changes),
  `tokens/build.mjs --check` (generated-token drift), `verify-parity-export.mjs`.
- **E2E / contract tests are LAW** (e.g. r162 focus-visible, r168 aria-labels, r177,
  r307 funnel 5+5 counts, r320 `/contact`, r321 legal-row nine links, landing-funnel six
  surfaces): reconcile the markup, never the tests.
- Test counts and conformance numbers are measured from the current tree — never copied
  from a previous round.

## 4. Ownership (current wave)

Binding: `docs/redesign/r341/OWNERSHIP.md` + `scripts/conformance/mapping/*.json`.
Own ONLY the files your task names; everything else is a merge block. Historical seat
map (the R338 rulings; each wave's OWNERSHIP.md supersedes it per-task):

| section key | component(s) | CSS sheet(s) |
|---|---|---|
| `home-hero-wrap` | `sections/Hero.tsx` (+ `landing/hero/*`) | `hero.css` + `hero-mechanics.css` |
| `home-intro-wrap` | `sections/Statement.tsx` | `statement.css` |
| `home-problem-wrap` | `sections/Chapters.tsx` | `pains.css` |
| `home-why-wrap` | `sections/Why.tsx` + `WhyScene.tsx` | `why.css` |
| `home-platform-wrap` | `sections/Product.tsx` + `sections/Live.tsx` (R338 ruling) | `platform.css` |
| `home-map-wrap` | `landing/journey/JourneyScene.tsx` + `journey/*.tsx` (R338 ruling) | `journey.css` |
| `home-usecase-wrap` | `sections/Roles.tsx` | `roles.css` |
| `home-cta-wrap` | `sections/Vision.tsx` | `cta.css` + `colleges.css` (R338: colleges.css = cta) |
| `footer` | `sections/Footer.tsx` | `footer.css` |
| `_chrome` | `frontend/src/lib/motion/*` | `preloader.css`, `nav.css`, `consent-edge.css` |

Other zones: inner pages (`pages/{auth,about,help,app}*`, `styles/auth.css`…) have a
dedicated owner; `apps/mobile/**` + mobile workflows belong to the mobile track;
`scripts/conformance/run.mjs` is the **lead-controlled shared instrument** — section
agents never edit it; `.github/workflows`, ceilings and baselines are lead-only.
Cross-dependency: problem's copy-driven line-counts live in platform-owned `Live.tsx`.
Current round state (wave log, merges, rulings): `docs/redesign/r341/HANDOFF.md` + task
briefs in `docs/redesign/r341/tasks/`.

## 5. Adding a section / page / mobile screen

- **Landing section**: create `frontend/src/components/landing/sections/X.tsx` +
  `frontend/src/styles/landing/x.css` (component imports its own sheet — see
  `LandingPage.tsx` header note); add the seat + import in `pages/LandingPage.tsx`; add
  `scripts/conformance/mapping/<key>.json` (ourSection/seat ids must match the DOM);
  measure with `run.mjs`; total bundle must stay ≤770 KB.
- **App page**: `frontend/src/pages/X.tsx` + route in `App.tsx` — mind entry-chunk weight
  (`App.tsx`, `GlobalSearch` are eager; prefer lazy routes); light+dark themes, RTL and
  a11y are contract, and `check-csp-hash.sh` must stay green.
- **Mobile screen**: `apps/mobile/app/**` (Expo ~58, expo-router, own lockfile) — start
  from `apps/mobile/README.md`; builds go through the `mobile.yml` / EAS workflows.
- **Backend route**: `backend/src/http/routes/*.ts` following the envelope + error-code
  conventions (`BACKEND.md`, `docs/08-api-reference.md`); keep decision logic in pure
  DB-free functions (tests mock `../../src/db.js`); schema change = edit
  `schema.prisma`, `npm run db:migrate` locally, attach the generated migration.

## 6. CSS layer & token conventions

- Order: `tokens.css` (+ `tokens.generated.css`, generated from
  `shared/design-tokens.json` by `scripts/tokens/build.mjs` — never hand-edit) →
  `motion.css` (durations/easings) → `layers.css` → `base/layout/patterns` → per-feature
  sheets → per-section landing sheets in `styles/landing/`.
- No raw colors, raw type/radius/spacing, or raw motion values anywhere outside the
  token sheets (CI design gates reject them). `tokens.css` wins over `DESIGN.md`;
  document token values as loaded from the sheet.
- Icons: Lucide only, imported through `Icon.tsx`.
- Arabic-first rules: letter-spacing 0, RTL mirrors are transformed expectations, Arabic
  line-height floor pattern `max(heronLh, 1.35×fs)`.
- Measured color deltas vs the frozen spec: define a **section-scoped** CSS var in the
  section's own sheet set to the MEASURED value (e.g. platform CTA orange
  `rgb(250,54,0)` in `platform.css`) — never mutate global tokens ad hoc (global token
  unification is a dedicated task).
- `npm run lint:css -w frontend` (stylelint 16) must pass.

## 7. Never-do list

- Never raise a ceiling (770 / 92 / 110), re-pin the Heron spec baseline
  (`scripts/spec/extract-heron.mjs`), weaken an assertion or test, lower the ratchet, or
  add `continue-on-error`.
- Never paste Heron (heronaiapp.com) source, text, images or fonts — reproduce MEASURED
  parameters (geometry, type, colour, durations, easings, triggers) in our own code.
  Fonts are Alexandria/IBM Plex (BT Grotesk is banned).
- Never commit secrets (`GITHUB_TOKEN`, `EXPO_TOKEN`, `DATABASE_URL`…), never print
  `.git/config` or remote URLs; `.env` stays ignored.
- Never touch other agents' exclusive files, gates, baselines or `.github/workflows`
  unless your task says so. Never force-push.
- Never run root `npm run build`, `db:seed` or migrations against a production DB; seed
  wipes demo content and refuses to run at `NODE_ENV=production`.
- Never report conformance/test numbers you did not measure yourself; never self-close
  audit rows (r314 judges close them); impossible conformance cells are excused only
  with a written reason in `docs/redesign/r338/excusals.md` (section target stays ≥90%).
- No cosmetic renames of routes/fields/models — names are part of the API contract.
- Never write into `node_modules` (worktree installs are hardlink copies — re-copy from
  the main clone if broken).

## 8. Environment notes (sandbox fleet)

- 2 CPUs, ~7 GB disk: no parallel builds inside a task; ≤4 concurrent agents.
- One worktree per task (`/home/z/wt/<task-id>`, branch `wip/<task-id>` — the r341 law;
  older rounds used `rNNN/<task-id>`), commit AND push after every completed sub-step
  (agents die without warning); never force-push; continue a dead agent's branch
  instead of redoing landed work.
- Dev servers: each task runs its OWN vite on port 53NN (t04 → 5304) with
  `--strictPort` and points the instrument at it via `run.mjs --url`; never a
  shared/global server; `pkill -f 'vite.*53NN'` when done. `flock` is broken on this box.
- `verify.sh` is heavy — only lead/lander/medic runs it (guarded by `/tmp/verify.busy`);
  section agents mirror individual gates instead.
- Playwright browsers are shared in `~/.cache/ms-playwright`; if the instrument demands
  a missing build, use the symlink fallback: `PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers`
  with the requested build name symlinked to `chromium-1200`. WebKit is often absent →
  report it as RESIDUAL, never fake the number.
- Dark cells: measure with `run.mjs --dark` (site's own `html[data-theme=dark]` flip).
- `madarek.onrender.com` is NOT reachable from the sandbox — take product-UI crops from
  the local dev server/build; `heronaiapp.com` IS reachable.
- No `gh` CLI, no pnpm/yarn on PATH; GitHub API via `curl` + token header. git identity
  is preset in `/home/z/madarek` (worktrees inherit it).
- Commits: `type(rNNN): subject` (feat|fix|chore|docs); section rewrites carry
  `conformance <section>: a% → b%` in the message.
