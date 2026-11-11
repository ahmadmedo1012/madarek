# R349 RESUME-ALL — LANE: ALL (one serial session; heartbeat per commit)

Spec: R349 master prompt (supersedes R347), written against `main@15fb3b48`. Owner tokens in
`/home/z/.madarek-env` (600, outside repo). Lane order: Q → M1/U/B → D/P/S/I/W/N → Z.

## done

### §0 stop-checks (2026-11-11)
- env saved (600) · clone OK (`--filter=blob:none`, .git 36 MB) · structure confirmed
  (apps/mobile, backend/prisma/schema.prisma, frontend/src, MASTER-CONSOLIDATION-RESUME.md, AGENTS.md).
- Push test `wip/all-hello` push+delete OK. §1 facts re-verified: 0 `'worklet'` directives in
  apps/mobile; `runOnJS` in CountUp.tsx:110; `useDerivedValue(() => formatter(...))` with a plain
  JS formatter = the M1 crash suspect confirmed in tree.
- Playwright chromium **1223** installed to `/home/z/.cache/ms-playwright` (sandbox had only 1200 —
  caused the first verify.sh conformance/overlap/e2e failures; environmental, not the tree).
- Tools: claude-mem/gstack/ruflo MCP plugins not available on this box (no claude code runtime) —
  logged, not blocking (spec §0.5). z-ai sub-agents available for read-only analysis instead.

### LANE Q — Q1 gate table on `main@15fb3b48` (measured this session, this box)
| gate | result |
|---|---|
| tsc frontend | ✓ |
| vitest frontend | ✓ 3036 passed |
| tsc backend | ✓ 0 errors |
| vitest backend | ✓ 2125 passed · 19 skipped |
| vite build + bundle | ✓ total 753.4 KB gz ≤ 770 · entry 64.3 ≤ 92 · pdf 95.7 ≤ 110 |
| stylelint + CSS ratchet | ✓ importantDeclarations 52 (held) |
| design gates ×7 (tokens/icons/motion/csp/parity/colors/raw-css) | ✓ all |
| eslint | ✓ |
| conformance `--gate` full matrix | ✓ **93.5%** (54748/58537) ≥ floor 91.6 — r347 close was 93.0 |
| qa:overlap (preview 4173, / × 1440/768/390 × light/dark) | ✓ stops-with-defects=0 |
| playwright e2e hermetic | ✓ (28 r309 specs green after browser install) |
| CI on 15fb3b48 | CI ✓ · Size gate ✓ · deadcode ✓ · **iOS-SideStore ✓ completed success** (run 42969927481) |

Conformance run needs the dev server on :5173 first (`cd frontend && npx vite --port 5173 &`);
overlap boots its own preview on 4173. Full verify.sh + dev-server boot exceeds one 10-min tool
call on this box — run conformance separately when scoping (evidence: /tmp/verify-full3.log).

## next (in order)
1. Q2 extended matrix (`--gate --scroll --interact`) like-with-like vs ratchet; fix causes.
2. Q3 r305 scroll-restore flake deterministic (wait on signal, not timer; 20/20 under 4-worker load).
3. Q4 `scripts/qa/identity-guard.mjs` + wire into verify.sh + CI.
4. Then M1 (crash), U (one logo), B (one logo), D, P, S, I, W, N, Z.

## gotchas
- Sandbox bash calls hard-cap at 10 min; background processes die at call boundaries — always
  boot vite + run the scoped gate in ONE call.
- verify.sh conformance step defaults to :5173 (dev), overlap/e2e are hermetic (own preview).
- Backend vitest prints intentional error-handler fixtures (level 40/50 logs) — suite green.

### LANE Q — Q2/Q3/Q4 (2026-11-11, all merged to main)
- **Q2 extended matrix**: `--gate --scroll --interact` full scope on the dev server →
  **93.0% (55384/59529) PASS** vs floor 91.6 (r347 close: 93.0 — like-with-like held);
  edge390 fails 0; top residual kinds y:255/x-mirror:178/h:145 (pre-existing, cross-section,
  owned by W3/D12 follow-ups). Evidence: /tmp/conform-extended.log (session box).
- **Q3 scroll-restore flake — FIXED at the cause (8b6fa9fc)**. Instrumented diagnosis under
  --workers=4: browser **scroll anchoring** on .content shifts scrollTop as late widgets land
  (measured: saved 664/596 instead of 600; sh swings 1683↔1677; one +64px jump) → ±60 window
  failed at its exact boundary. Fix (3 parts): (a) spec isolates anchoring
  (`overflow-anchor:none` on .content — browser behavior, orthogonal to the app feature under
  test); (b) spec waits on the scroll event itself (once-listener promise) instead of the
  150ms timer, and asserts the actually-persisted sessionStorage offset (the signal, not an
  assumption); (c) useScrollRestoration POP watcher budget is now two-legged — 60 SETTLED
  frames (clamp not binding) + 10s hard wall-clock cap — so late content height restores
  deterministically instead of racing a frame counter. **Proof: 20/20 green under
  --repeat-each=20 --workers=4** (was 10–14/20 with 6× waitForFunction timeouts);
  r305-shell-heron + r309-recovery full specs 52/52; unit tests 7/7; verify --fast green.
- **Q4 identity-guard.mjs — LANDED (this commit)**: `scripts/qa/identity-guard.mjs`
  (dependency-free) + `scripts/qa/identity-allow.json` (133 seeded entries = the measured
  LANE U workload: 1041 allowlisted hits, 0 drift, 1879 files scanned). Blocks: Libyan
  university proper names (35 Arabic compounds + English forms), zu-sync/inst-zawia/zawia,
  `showcase`, UniversityFact family, and mark-path twins outside the 12 sanctioned geometry
  sources (the lane-B single-mark guard). Structural exemptions: migrations (append-only),
  the gate itself, docs/redesign + docs/archive (round ledgers), audits/. Wired into
  `verify.sh` (both modes, before the --fast exit) AND `ci.yml` design-gates job.
  Red-box proven: injected جامعة الزاوية in a non-allowlisted file → exit 1; injected latin
  `zawia` → exit 1; injected the mark path into styles → exit 1; restored → exit 0.
  (Note: a file already on the allowlist can gain new hits — path-scope ratchet, same model
  as overlap-allow.json; Lane U empties it to zero product files, U5.)
- **ENVIRONMENT RESET between Q4-authoring and commit** (sandbox rebuilt): re-cloned from
  main (both Q1/Q3 commits intact), re-created the uncommitted Q4 files from the session
  transcript, re-ran the red-box proofs. Chromium-1223 + npm install re-provisioned.

## next (in order)
1. LANE M1 (iOS crash): CountUp worklet fix + worklet-audit.mjs + CI simulator smoke.
2. LANE U (university purge): the 133-file allowlist IS the inventory; U2 backend purge,
   U3 UniversityFact → my-institution, U4 docs, U5 empty the allowlist.
3. LANE B (one logo): B1-B4 on top of the mark-path guard.
4. Then D, P, S, I, W, N, Z.

### LANE U — U1+U2 backend purge (2026-11-11, this commit)
- U1 inventory = the Q4 allowlist (133 files, measured). U2 executed on the backend:
  - DELETED: `lib/zu-sync/` (2 files), `sync.routes.ts`, 4 test suites that tested the deleted
    pipeline (sync-institution-isolation, sync-routes-scope, zu-sync-run, scheduler-institution,
    scheduler-guard — 54 tests of the retired FEATURE, deleted with it per L3; suite totals moved
    2125→2071 green, nothing skipped to pass).
  - `scheduler.ts` rewritten: retention-ONLY (LoginEvent sweep kept verbatim; the zu-sync job,
    planScheduledSyncs, runSyncGuarded, and the registry are gone).
  - `app.ts`: the /api/v1 sync mount removed (mount-ordering comment preserved for catalog).
  - schema: UniversityFact + SyncRun models removed; `SHOWCASE_INSTITUTION_SLUG` →
    `DEMO_INSTITUTION_SLUG` (same value 'madarek-demo').
  - Migration `20261111080000_r349_u_neutral_tenant`: `UPDATE Institution SET id='inst-madarek-demo'
    WHERE id='inst-zawia-showcase'` (every FK carries ON UPDATE CASCADE — verified in 0_init + all
    AddForeignKey statements) + `DROP TABLE UniversityFact/SyncRun` + `DROP TYPE SyncRunStatus`,
    idempotent.
  - **Local-PG PROOF (PASS)**: fresh DB → baseline (all migrations minus the new one) → seeded the
    OLD state (retired id + Faculty FK child + UniversityFact + SyncRun rows) → applied the new
    migration TWICE → institution id renamed WITH the faculty FK cascaded, both tables dropped,
    zero errors. Fresh-seed proof: `prisma migrate reset` + seed → Institution rows read
    `inst-madarek-demo`/`madarek-demo`/«مؤسسة مدارك النموذجية». (Neon-branch test not available
    on this box — local embedded PG 16 is the evidence; the migration is idempotent + FK-cascade
    based, and `prisma migrate diff` vs the deployed schema will be exercised at deploy.)
  - Re-keyed every backend source/test fixture: `inst-zawia-showcase`→`inst-madarek-demo`,
    `zawia-showcase` slugs→`madarek-demo`, the `'zawia'|'alandalus'` union→`'madarek'|'alandalus'`,
    `UZ-2024-*` reg numbers→`UM-2024-*`, skeleton locals (zawiaItFaculty→madarekItFaculty …),
    `@zu.edu.ly`→`@test.ly`, 'University of Zawia' nameEn→'Madarek Model Institution',
    Salam-Zawiya-2026→Salam-Madarek-2026. The alandalus student's FIRST reg candidate stays
    UM-2024-00001 (the cross-institution uniqueness proof).
- Backend gates after the purge: tsc 0/0 (src + tests), vitest **2071 passed** · 19 skipped.
- identity-guard: backend residue now 0 outside migrations (659 allowlisted hits remain, all in
  frontend/mobile/docs — the U3/U4 workload).

### LANE U — U3 my-institution everywhere (2026-11-11, this commit)
- **web UniversityInfoPage** (MorePages.tsx): the curated showcase branch is DELETED — every
  institution (the demo tenant included) gets the same honest OWN page (session identity card +
  scoped faculties + the faculties KPI), with the honest empty state for a null institution.
  `data/university.facts.ts` deleted. Vocabulary neutralized (خدمات المؤسسة).
- **owner System page**: the `sync` block retired end-to-end — backend /owner/system no longer
  reads SyncRun (the feed + SyncFeedEntry mapping + the enum import deleted); the web page drops
  the «آخر مزامنة» KPI + the «سجلّ المزامنة» card; useOwner's OwnerSystem.sync removed.
- **AdminSyncPage**: deleted with its route (ROUTES.adminSync), nav item («مزامنة الجامعة»), the
  dashboard's stale-fields summary query + action row + header button, and its test suites
  (AdminConsolePages §7, r164i §3, r299 items 1-3, r305a8's sync-roots marker + MODULES entry).
- **mobile /student/university**: rewritten as the generic «عن المؤسّسة» page — session identity
  card + the caller's own faculties/departments (catalogApi.faculties with the institution slug)
  + the membership card; the /university/facts call + its defensive normalizer deleted;
  `universityFacts` dropped from catalog.ts; the profile menu label neutralized.
- **openapi regenerated** (the /admin/sync + /university/facts routes gone from docs/api/openapi.json
  and the mobile schema.generated.ts).
- Tests: web 3026 green (the U3 pins rewritten: r183-B3 now pins the unified page; the
  memberships suite pins the retirement), mobile 1184 green, tsc 0/0 everywhere,
  verify --fast green (identity CLEAN, allowlist hits 650, all remaining = docs/specs/frontend
  copy — the U4 workload).

### CI-RED RECOVERY — U3/M1 residue + workflow schema (2026-11-11, this commit)
The U3/M1b pushes left main RED (CI Typecheck ×2, Mobile gates, build-android 0-job,
iOS run 33). Environment had reset (sandbox rebuilt): re-cloned, npm install ×3,
all fixes re-measured on this box.
- **build-android.yml startup failure (runs 10–15, 0 jobs)**: the M1.4 smoke job's
  checkout step put `sparse-checkout`/`sparse-checkout-cone-mode`/`persist-credentials`
  as DIRECT step keys — GitHub's schema rejects the workflow file → instant 0-job
  failure on every wip push. Fixed: nested under `with:`. Also `android-emulator-runner@v9`
  never existed (latest v2.38.0) → pinned `@v2`; and publish now gates on
  `needs: [verify, smoke]` (a smoke that cannot block a release is not a defense).
- **Backend typecheck red**: 3 test files still mocked the deleted `prisma.syncRun` /
  imported `SyncRunStatus`/`syncRunAction`/`toSyncFeedEntry` (owner-schemas,
  owner-alerts-counts, owner-system-storage). Removed with the feature per L3;
  the storage test's probe-overlap assertion re-anchored on alertFindMany; the
  additive-siblings source-scan pin re-pinned to alerts/activity (sync block retired);
  the s3 siblings assertion drops `data.sync`. 59 tests green in the 3 files.
- **Mobile contract red**: `/admin/sync` + `/admin/sync/trigger` still consumed.
  Deleted the whole retired surface: `app/admin/sync.tsx` (screen), adminApi
  syncStatus/syncTrigger, the dashboard «المزامنة مع البيانات الرسمية» action row
  (+RefreshCw import), the governance sync kit (SYNC_STATUS_LABEL/TONE,
  syncStatusLabel, SyncStatusChip, SYNC_CATEGORY_LABEL, SystemRow.sync,
  'sync.run' + 'sync' label-map entries — backend emits neither), their 8 tests,
  and the owner System screen's «آخر مزامنة» StatLine. FE side: the stale
  'sync.run' labels in OwnerActivityPage/OwnerDashboardPage + the r299 fixture.
- **Maestro smoke-alive.yaml (iOS run 33 failed at step 1)**: the flow tapped
  «تسجيل الدخول» which does not exist — the guest entry is the Welcome's
  «ابدأ الآن» CTA (the failure log: Element not found after 66s). Flow rewritten:
  launchApp(clearState) → extendedWaitUntil «ابدأ الآن» (120s — Boot routes the
  guest after the version gate; covers a cold Render wake) → tap → login-email/
  password testIDs (verified in tree) → «دخول» → «مقرراتي» (120s) → the 60s
  alive window. Production login for student@test.ly verified live (200,
  inst-madarek-demo membership — the U2 keying is live).
- Gates on this box: backend tsc 0/0, mobile tsc 0/0, mobile jest 42/42 suites
  1176 green (1184−8 retired), contract-check 200 consumed/0 unmatched,
  verify --fast PASS (bundle 747.6/770, ratchet 52, identity CLEAN 650/133).
