# R354 — session record (close every open gap from R353, then the carry-over queue)

Base: `99dfe800` (origin/main) → this session's HEAD. Owner P0s (R354 order): (1) copy diet to ≥40 % (≤ ~12,900 words), (2) page ledger verdict table to ZERO findings, (3) roles proven end-to-end, (4) AI provider live truth + tuned routing, (5) search production-scale proof, (6) push that delivers, (7) R352 carry-overs (accounts/student data, mail, alias, hosting truth). Chat replies to owner: Arabic. Code/commits/docs: English. UI copy: Arabic.

## What landed (chronological, evidence per claim)

### 1. LANE V1 — live pipeline truth verified on base `99dfe800` (no new code)
All checks via GitHub API + Vercel REST API + a dispatched workflow (this sandbox cannot curl the live hostname):

- **CI green on HEAD**: run `43694216023` (CI, success). Size gate `43694216087` success. deadcode `43694216067` success. ([runs list for head_sha=99dfe800…](https://github.com/ahmadmedo1012/madarek/actions/runs/43694216023))
- **Deploy Vercel green**: run `43694216035` success — the workflow now WAITS for CI, then polls the live `/api/v1/health` until `buildId == 99dfe8003e20` (the dead pin step is gone from `deploy-vercel.yml`; verified by reading the file).
- **Deploy smoke (dispatched fresh, run `43700817486`, success)**: `Wait for the Vercel deploy (buildId == 99dfe8003e202a05ab2859b8352225842eeac75e)` → success; Health (wake-aware) ok:true; login ×3 (student/teacher/registrar) tokens issued; `GET /me/dashboard` → 200; live OpenAPI vs committed contract holds; live web-vitals smoke green. So **buildId == HEAD on BOTH `/api/v1/status` (smoke) AND `/api/v1/health` (deploy-vercel)**.
- **Exactly ONE production deploy per push** (Vercel API `v6/deployments?target=production`): one READY deployment for each of `99dfe800`, `0ddf853b`, `7268672a`, `9e6ccfe5`, `1f81915f`, `915351af` — the double-deploy flapping ended at `69f4f12d` (which still shows two). No frozen lambda: `dpl_7ydZ5orT8wsZfdHjp3KRJWdikWof` READY for HEAD.
- **Android**: `Android — release APK` run `43694216007` success on HEAD (push-triggered); a second scheduled run `43700296707` (cron rebuild of `android-latest`) was in flight at session start — by design, not a flap.
- **Leftover sweep**: `/api/v1/build-debug` — zero references anywhere in the repo (route deleted in R353; only HOSTING.md/RESUME history mentions remain — grep clean). Dead pin step — gone (above). Stale `wip/*` branches — none; remote has only `main` + `gh-pages`.

### 2. LANE V2 — the provider REALITY probe (this commit)
The sandbox geo-block made provider validation impossible from here (Groq 403, Gemini FAILED_PRECONDITION — R353's open item #4). The only honest vantage point is the production function itself:

- `backend/src/lib/ai/selftest.ts` — the pure probe engine: for every provider in the resolved chain, `GET {baseUrl}/models` + a 1-token `chat/completions` (walking the spec's ≤3 models on a 404/400 model-not-found), 10 s AbortController deadlines, providers probed in PARALLEL, `aiMode`/`region`/`providerCount`/`totalBudgetMs` in the report. Keys NEVER leave the function: exact-match + shape-pattern redaction (`sk-…`/`gsk_…`/`AQ.…`/`Bearer …`/`key=…`), ≤180-char errors. Injectable fetch — fully unit-tested with zero network.
- `POST /api/v1/internal/ai-selftest` (internal.routes.ts) — same CRON_SECRET belt as the tick (503 fail-closed without the secret, 401 wrong secret, Bearer + `?key=` forms).
- `.github/workflows/ai-selftest.yml` — owner-only (workflow_dispatch = write access) trigger; POSTs with `secrets.CRON_SECRET` to `vars.TICK_TARGET_URL`, prints the table + step summary + 30-day artifact.
- Tests: 10 engine + 5 route-belt, all green (`npx vitest run tests/modules/ai-selftest*.test.ts` → 15 passed). `verify.sh --fast` PASS (tsc, vitest, bundle, css, identity, brand, copy-budget gates).

**RESULT TABLE (run after this commit deployed — filled in §3 below).**

### 3. LANE V2 — the live self-test run
- TODO (filled immediately after the deploy of the V2 commit goes READY).

## Open items (moving to lanes)
- Copy diet TRUE current: **19,637 Arabic words** (verify.sh copy-budget output on base `99dfe800`; baseline 21,504 → −8.7 %). Owner target ≥ 40 % ⇒ ≤ 12,902. Gap to cut: **~6,700 words**. Enforced ceilings sum: 18,522.
- Page ledger (`docs/QA/page-ledger.md`) — not yet published; overlap harvest started at `9e6ccfe5` only.
- `docs/PUSH-FIREBASE-CHECKLIST.md` — referenced by HOSTING.md but NOT committed to main (V3 finding; must land).
- Roles exhaustive route×permission enforcement tests — not yet reported (E2).
