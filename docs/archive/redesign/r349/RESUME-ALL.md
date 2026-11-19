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

### LANE U — U4+U5 the full neutralization (2026-11-11, this commit)
**Measured: 650 allowlisted hits → 0; allowlist 133 entries → 0 (U5 exit met).**
- **Single source of banned identity**: `scripts/qa/identity-banned.json` (35 Arabic
  compounds + 2 English forms + fragments قاريونس/zu.edu.ly) — read by
  identity-guard.mjs (ARABIC_NAMES + the new FRAGMENT_PATTERNS now load from it)
  AND by the brand tests (r177/r188/r183/r307 import it; their poison fixtures
  are ASSEMBLED from it — deliberate consumers spell nothing). Structurally
  exempt like the gate itself.
- **seed.ts**: the local `zawia` variable renamed `demoInst` (22 refs) + comments
  neutralized. **schema/app/scheduler comments** reworded. **backend fixtures**
  (auth-institution-context, catalog-structure-create) re-keyed to the neutral
  tenant name. Search normalize/search-logic/visibility fixtures → neutral
  compounds (taa-marbuta pin re-anchored with the route's pre-normalized query —
  the new compound carries a hamza the raw form didn't).
- **@zu.edu.ly → @test.ly everywhere** (72 files: fixtures, e2e, docs, scripts) —
  the provision script's STALE owner anchor fixed to the seed's owner@test.ly
  (db-ops pin updated). 6 tests that used the old domain as their "real-domain"
  contrast re-anchored on @gmail.com (rotation, test-accounts, password-reset,
  login-timing, db-ops, + taa-marbuta).
- **FE src**: index.html/manifest/App/Statement/colleges.config/product-media/
  ownerLabels/MorePages/4 CSS files + mobile university.tsx + feature-parity —
  comments and copy neutralized ("showcase" → curated/demo/tenant wording).
- **FE tests**: compound sweep (inst-zawia-showcase→inst-madarek-demo,
  zawia-showcase→madarek-demo, جامعة الزاوية→مؤسسة مدارك النموذجية,
  University of Zawia→Madarek Model Institution) + ZAWIA consts→DEMO +
  zawiaGroup→campusGroup + prose fixes across ~30 files. r177/r188 REWRITTEN to
  the shared-list model (the sweep had corrupted their BANNED heads — the
  corruption is what motivated the JSON design); r183's university-pin now
  iterates all 35 compounds (stronger than the single old pin); r307's banned
  list likewise.
- **Docs**: every active doc neutralized (BACKEND/CHANGELOG/DESIGN/LICENSE/
  README.en + docs/02-16, architecture/multi-institution ×4, DATABASE-REFERENCE,
  modules ×2, mobile ×5, history/audits ×9, runbooks, MASTER-CONSOLIDATION ×3,
  PROJECT/SPECS-REFERENCE, releases/R307, superpowers, specs/ ×10). The
  zu-sync/UniversityFact features are documented as RETIRED (they were still
  documented as live — a real doc bug). The brand-audit ledger's quoted old copy
  elided to «الجامعة السابقة». Stale conformance per-role captures moved to
  audits/evidence/r349/u4-stale-conformance/ (regenerated by the next run).
- **LICENSE/README.en**: "showcase/reference data" → "fictional demo/reference
  data" (r177's pins updated to match).
- Gates: backend 2062 passed · 19 skipped (6 re-anchored fixtures green),
  frontend 3026 green, mobile tsc 0/0, verify --fast PASS, identity-guard
  **CLEAN — 0 allowlisted, 0 drift, 0 entries**.
- Open: live-deploy proof (landing/footer text after this deploy) + the U exit
  table lands with the Z-lane report; screenshots ride the W-lane browser work.

### LANE B — one logo, provably (2026-11-11, this commit)
- **Inventory (B1)**: the placements are either (a) the <Logo> component (header,
  chrome, preloader, states, 404, auth, footer — same-source by construction),
  (b) generator outputs (favicon.svg, PWA 192/512, apple-touch 180, OG card,
  wordmark/lockups, all 7 mobile rasters), (c) the sanctioned TEXT wordmark
  «مدارك.» (email + offline pages), or (d) expo-prebuild native launchers
  (from the same assets at build time). docs/brand.md §5 records the table.
- **Cross-tree pin (new test)**: frontend/src/brand/mark.ts ≡ apps/mobile/
  src/brand/mark.ts — every MARK_* constant byte-equal (the two-twin
  architecture, now ratcheted). 20/20 green in r323-brand-system.
- **B2 the single door**: scripts/brand/build-assets.mjs (--web/--mobile/
  --manifest/--check) + scripts/brand/asset-manifest.json (SHA-256 ×18
  assets) — dependency-free --check wired into verify.sh (BOTH modes,
  step 3.6) AND the CI design-gates job. A hand-edited logo file can
  never ship silently.
- **B4 the lock-up rule**: docs/brand.md — geometry canon, the three
  colours + the dark accent swap, lock-up spacing/min-size/clear-space,
  the sanctioned seats, the never-list.
- **Honest scope note (B3)**: the raster-tolerance cross-render of every
  PLACEMENT (screenshots vs canonical) rides the W-lane browser captures —
  the byte-pins (SVG twins + PNG manifest + icons:check) + the jsdom Logo
  contract cover every drift channel short of a browser raster today.

### Session close — main@b4a56fbf, the live proofs (2026-11-11)
- **main fast-forwarded** 341e4f9c → b4a56fbf (CI-red recovery + U4/U5 + KVM fix +
  LANE B + the brand-canon sanction). Branch sweep run: 14 wip branches archived
  (archive/* tags) and deleted — **only main remains on origin**.
- **D1 live (structure)**: APK URL → 302 → 200, content-length 59,019,376;
  build-info.json live from the release (commit/run fields from the run, not
  hard-coded); the /app CTA renders («تحميل»). The full browser-rendered proof
  rides the W/N captures.
- **D2 freshness proof in flight**: the release served run-9 (ecd67298, the last
  green before the smoke gate); Android run 17 on b4a56fbf rebuilds + replaces it
  (and proves the KVM fix + the rewritten Maestro flow end-to-end — publish now
  gated on [verify, smoke]).
- **U exit live**: deployed landing = 0 forbidden names; deployed login shows
  مؤسسة مدارك النموذجية / madarek-demo; deployed buildId = b4a56fbf03c1.
- Deploy smoke 16 ✓ on b4a56fbf. CI 1121 / Mobile 58 / Android 17 running at
  session close (all prior SHAs green: 12629db9 CI ✓, b4a56fbf branch CI ✓).

## next (in order) — WAVE 2
1. Confirm Android 17 + Mobile 58 + CI 1121 green on main (the KVM + maestro proof);
   record run 17's artifacts (smoke green + publish + the new build-info commit).
2. **LANE P** (profiles UI): read E1's schema (InstitutionKind, school-mode fields,
   identity/contact/guardian columns, phones.ts/fields.ts), then P1 gap analysis →
   P2 API (GET/PATCH /me/profile, /directory, contact-request) → P3 web profile
   page → P4 mobile → P5 seed. PRIVACY-MATRIX.md + per-cell tests.
3. **LANE S** (search UI on G1): S1 design doc → S2 normalisation v2 → S3 indexes
   (own migration) → S4 golden set ≥250 queries → S5 command palette + /search →
   S6 mobile. Mind the 770 KB bundle ceiling (GlobalSearch is eager).
4. **LANE I** (import wizard on F1): I1 audit → I2 mapping presets → I3 cleaning →
   I4 duplicates → I5 pipeline (dry-run/preview/commit/rollback) → I6 the 5-step
   web wizard → I7 fixtures → I8 e2e.
5. **LANE W** (website: detector sweep × roles, product walk, CSS demolition,
   budgets, VLM panel, SEO/meta) and **LANE N** (mobile parity on the new screens).
6. **LANE Z**: the integrator (migration-order conflicts, full gates, OWNER-GUIDE-AR,
   ADRs, final report). D5 (OTA) needs the EXPO token — §5 question for the owner.

### Session 2 resume (2026-11-11 — sandbox was RESET; this box rebuilt from zero)
- Environment: root workspaces + tools (embedded PG 16) installed; mobile NOT installed
  (only schema.generated.ts regenerated via npx openapi-typescript — no mobile jest run).
  **No `/home/z/.madarek-env`**: the platform redacts tokens from uploaded context —
  the PAT must be re-supplied before ANY push; all work committed locally until then.
- main was at **46c807e5** (3 post-heartbeat CI-fix commits): CI/Size/deadcode ✓ but
  Android run 20 failed at "Collect and verify the artifacts" — the x86_64 smoke pass
  (46c807e5 itself) overwrote app-release.apk with a single-ABI lib set before the
  verify step read it (verify-apk.py defaults to arm64-v8a,armeabi-v7a).

Branch `wip/all-d-ci-abi-order` (from main 46c807e):
- **a96cbedb** the Android fix: step reorder — collect+verify immediately after the
  multi-ABI build, the x86_64 pass moved after it (before metadata+upload), invariant
  comments pinned on both steps, gradle-x86.log joins the failure uploads.
  YAML safe_load + step table verified. NOT PUSHED (no PAT).

Branch `wip/p1-profiles-foundation` (LANE P executed; 5 commits):
- **PROFILES-RESEARCH.md** (P0): every field sourced (owner words / E1's §9.4 alias
  dictionary / documented Libyan facts); web verification walled on this box
  (DDG empty, Bing junk, Google JS-walled, admission.ly SPA, uot.edu.ly placeholder —
  all logged); unknowns declared (منظومة الغويل sample, quadruple-name strictness,
  school nationalId, mask depth) — nothing invented.
- **9ef94dfb (P1)**: migration `20261111220000_r349_p1_profile_fields` — additive
  nullable-first: fatherName/grandfatherName/motherName, birthPlace, nationalId +
  nationalIdHash (SHA-256, indexed — raw access-controlled, display masked by
  default), StudyType/EnrollmentStatus/PhoneVisibility/PreferredContact enums,
  secondary-school admission data (school/branch/percent/year), per-phone
  PhoneVisibility defaults INSTITUTION_STAFF, teacher preferredContact +
  personalPhoneVisibility. Proof: fresh embedded-PG deploy of all 35 migrations ✓;
  columns/enums/index verified in information_schema; migrate status up-to-date;
  P1 drift count 0 (only the pre-existing documented GIN-trgm raw-SQL diff).
  national-id.ts pure service (normalize/hash/mask/prepare) + 13 tests.
- **5c84826a (P2)**: `profiles.routes.ts` — GET /me/profile MOVED from
  learning.routes.ts and extended (shaped self views + customFields; the pre-P2
  consumer contract keys untouched); PATCH /me/profile (contact lane only, strict
  zod, phones folded via normalizePhone, audits FIELD NAMES); GET /people/:id
  (TEACHER roster-scoped / cross-institution 404 / PII-read audits with saw* booleans
  — no values); PATCH /people/:id (registrar lane ADMIN/OWNER; nationalId stored as
  the raw+hash pair); GET /directory (kind/q/faculty/year/stage/grade/studyType/
  status/phone-digits filters, pagination, json|xlsx|csv with the OWASP
  formula-injection escape + UTF-8 BOM; exports audited); POST /people/:id/
  contact-request (per-user hourly gate + 24h per-target dedup VIA the audit trail;
  SYSTEM notification to the owner; audited). privacy.ts pure matrix engine +
  PRIVACY-MATRIX.md (role × field, the write lanes, audit events, rate limits,
  isolation rules); 25 per-cell privacy tests + 19 route-contract tests.
  openapi.json + mobile schema.generated.ts regenerated.
- **49e9273a (P3a)**: MyProfileData (components/student) — the student's six sections
  (البيانات الشخصية · الاتصال · الأكاديمية · ولي الأمر · الوثائق · الأمان) over
  the shaped self view; inline Libyan phone validation (lib/phone-validation.ts,
  the documented mirror of phones.ts — 09X/9X/+218/00218, Eastern-Arabic folded,
  no carrier names); the plain-Arabic visibility radiogroup; ProfilePage's data tab
  leads; the completion meter counts REAL profile signals (the R305 hero meter test
  re-pinned 70→50% with the rationale in-file). phoneVisibility (the SETTING) rides
  the shaped views for the owner's selector.
- **b7c1fd9e (P3b)**: /admin/directory «دليل التواصل» (nav, unique Phone icon) —
  the contact sheet (server search + study-type/status filters + pagination; tel:/
  wa.me/copy verbs on the normalized form; طلب تواصل on PRIVATE; audited xlsx/csv
  blob downloads) + /admin/people/:id «ملف الطالب» — five tabs (الملف = the
  registrar's full edit form incl. nationalId pair/guardian/admission/school-mode ·
  المقررات = GET /enrollments?studentId · الدرجات/الحضور = per-offering reads
  filtered to the student · الملاحظات = the file's own audit trail via the new
  GET /people/:id/history). Field-definitions CRUD API (GET/POST/PATCH/DELETE —
  controlled-JSON guards, seat uniqueness, audited). DYNAMIC_TITLES + admin nav
  wired; route-titles coverage green.

Gates measured this session: backend tsc 0/0 · vitest **2119 passed · 19 skipped**;
frontend tsc 0/0 · vitest **3028 passed** · vite build ✓ · bundle **758.8/770 KB gz**
(entry 64.7/92, pdf 95.7/110) · icons/colors/raw-css gates ✓ on the new files.
**Pre-existing on main (flagged for W)**: `npm run lint:css` (npx -y stylelint@16,
unpinned) reports 46 no-duplicate-selectors errors on main@46c807e TOO — zero from
this session's files (profile-data.css: 1 warning). CI design-gates is green on
main → the local npx resolves a newer 16.x than the lockfile's; W-lane pins it.

## next (in order) — after session 2
1. **PUSH (needs the PAT re-supplied once)**: push `wip/all-d-ci-abi-order` →
   fast-forward main (fixes the Android pipeline — its push retriggers the workflow
   by the .yml path filter); then `wip/p1-profiles-foundation` → merge to main and
   watch CI (the Android run on that SHA finally exercises the emulator smoke live).
2. LANE P residue: **P4 mobile UI** (tap-to-call/WhatsApp on the same shaped
   payloads — the people.ts contract types exist; mobile deps NOT installed here) ·
   **P5 seed** enrichment (realistic Libyan names + clearly-fake phones on the new
   columns; the E1 seed already carries the demo tenant) · the field-definitions
   EDITOR UI (API shipped in P3b; host it on the directory page) · screenshots
   390/1440 × light/dark + the overlap detector on the new routes.
3. LANE S (S1-S6), LANE I (I1-I8), LANE W (detector sweep × roles, CSS demolition,
   the stylelint pin, VLM panel), LANE N, LANE Z per the Wave-2 order above.

### Session 3 — the push + the CI-red set + P5 (2026-11-12, PAT re-supplied)
- **PUSHED** (PAT re-supplied by the owner, saved to /home/z/.madarek-env 600):
  `wip/all-d-ci-abi-order` + `wip/p1-profiles-foundation` → main fast-forwarded
  to a96cbedb (the Android ABI fix) → LANE P merged as 0bcf1d59 (the heartbeat
  conflict resolved on the lane-P side — the later, superset ledger).
- **The merge went red in 4 places — each fixed at the cause (a22a0992)**:
  1. **deadcode** (knip 49→53 / types 229→234): the P3b CRUD hooks + contract
     types had no consumer. **The field-definitions EDITOR now ships** on
     /admin/directory (ADMIN/OWNER-gated toggle in the header; groups by
     entity; inline create/edit with client validation mirroring the zod
     schema — key regex, options dedup, 0–999 order; two-step delete) —
     consumes the 4 hooks + FieldDefinition; DirectoryParams types the
     directory filter state; PatchPersonInput types the registrar save;
     PatchMyProfileInput types the self-edit mapper; DirectoryMeta +
     PhoneCheck un-exported (in-file only). Baseline re-pinned: exports 49
     (held) · types 227 (−2) · jscpd 250 (−2: the fe-meta/dir-meta selector
     merge + ONE form-initial literal in StudentFileTab instead of the
     twin literals).
  2. **typecheck:tests** (45 errors, all profiles-routes.test.ts): vitest
     never typechecks — the Prisma-delegate mocks needed the whole-fn
     `as never` cast (the file's own 355/356/384 pattern, applied to all
     27 call sites); the json helper's body typed; two indexed-access
     non-nulls. The session-2 claim «tsc 0/0 src+tests» was src-only.
  3. **design-gates motion** (6 violations in profile-data.css): the
     literal fallbacks (`var(--t-fast, 150ms)` / `--e-out` — a token that
     does not exist / `1.4s ease-in-out`) → the canonical tokens
     (`--t-fast`/`--ease-out` bare; the skeleton rides
     `--motion-duration-ambient-pulse` + `--motion-ease-standard`).
  4. **e2e r319 profile pin**: P3a made the data tab the DEFAULT —
     re-pinned to the six-section sheet [01]–[06] + a legacy academic-tab
     [01]+[04] assertion. **Design correction**: the account-level
     password block now renders on every tab EXCEPT data (its own [06]
     الأمان section carries the pointer — the P3a comment said «kept for
     the legacy tabs» but it rendered unconditionally, putting two [04]s
     on one sheet against the §B2 unique-index grammar). MY_PROFILE e2e
     fixture enriched with the P2 shaped self view + customFields.
- **Android smoke (run 43122827163)**: the **ABI-order fix WORKED** — build +
  verify-apk green for the first time since run 20 (the collect step reads the
  multi-ABI APK before the x86_64 pass overwrites it). The smoke itself failed
  at «ابدأ الآن» not visible in 120s: on the runner's 320×640 AVD the CTA
  (marginTop:auto under the fixed 348pt hero) lands BELOW the fold — the flow
  now anchors on the title stack («رحلة تعلم واحدة») and
  `scrollUntilVisible`s the CTA; **mkdir -p apps/mobile/build** before the
  maestro call (the junit report write crashed even on a green flow — the
  directory never existed, so failure diagnostics never uploaded either).
- **P5 — the seed enrichment (3fa38f40)**: the demo student carries the FULL
  Libyan documentary file (quadruple name, national-id pair via
  hashNationalId/normalizeNationalId — the route services, never hand-rolled —
  guardian, emergency contact, MORNING/ACTIVE, ثانوية طرابلس للعلوم · علمي ·
  88.5 · 2023); the Al-Andalus student rides the OTHER side of every filter
  (EVENING · أدبي · بنغازي); both teachers seed preferredContact (WHATSAPP /
  EMAIL) + personal-phone pairs. Phones DELIBERATELY clearly-fake
  (09X000000X). Proof on the embedded PG: fresh madarek_dev → deploy (36) →
  FORCE seed → rows verified → re-run idempotent → identity-guard CLEAN.
- Gates this session: fe tsc 0/0 · vitest 3028 ✓ · profile e2e ✓ (chromium
  1223 reinstalled on this box) · be tsc src+tests 0/0 · vitest 2119 ✓ ·
  bundle 758.8/770 · identity CLEAN · brand/icons/colors/raw-css/motion ✓ ·
  deadcode re-pinned green. CI on a22a0992: deadcode/Size/Deploy-smoke ✓✓✓,
  CI/Mobile/Android green-pending at heartbeat-write time.

## next (in order) — after session 3
1. Watch a22a0992 + 3fa38f40 CI to full green (Android = the maestro fold-fix
   live proof; the publish gate rides [verify, smoke]).
2. LANE P residue: **P4 mobile UI** (mobile deps NOT installed on this box) ·
   screenshots 390/1440 × light/dark + the overlap detector on /admin/directory,
   /admin/people/:id, the profile data tab.
3. LANE S (S1-S6), LANE I (I1-I8), LANE W (detector sweep × roles, CSS
   demolition, the stylelint pin, VLM panel), LANE N, LANE Z per Wave-2.

### Session 3½ — the P5 sweep runs, two real bugs it caught (2026-11-12)
- **The evidence sweep infrastructure** (scripts/r349/p5-sweep.mjs + overlap.mjs
  extensions): overlap.mjs gained `--storage` (Playwright storageState — real-API
  login states per the auth-storage.ts pattern) and `--shots` (evidence PNGs
  per route×bp×theme, taken AFTER the data settles — the first run shot the
  directory's skeleton at 1200ms). The sweep logs in registrar+student against
  the LOCAL STACK (embedded PG :5433 migrated+seeded, backend :4000, vite :5173 —
  backend/.env.local points at the tools/boot-pg.sh cluster, user `madarek`).
- **Bug 1 — useDirectory's unwrap** (P2): /directory paginates with meta
  SIBLING of data in the body; unwrap() drills to body.data and drops the
  siblings — the hook held the bare rows array, `.data`/`.meta` undefined, the
  page rendered «لا نتائج» while the API returned 25 rows. Fixed with the
  admin.ts paginated pattern (read the ApiResponse envelope directly). The
  sweep caught it LIVE (VLM read + DOM debug confirmed; now 25 rows + the
  pagination footer).
- **Bug 2 — the savebar/FAB collision** (P3b CSS): the r349p-savebar's sticky
  actions rode the same inline-end bottom corner as the fixed feedback FAB —
  the detector's fixed-over-text + the VLM read both caught the save button
  under the FAB on /admin/people/:id. Fixed: padding-inline-end 76px clears
  the lane (re-verified by sweep + VLM).
- **The sweep verdict** (12 shots, /admin/directory + /admin/people/:id +
  /student/profile × light/dark × 1440/390): text-on-text 0 · text-on-media 0 ·
  hoverflow 0. Remaining finding classes are the app-shell chrome
  (header.topbar / nav.bottom-nav sticky by design; fb-fab floats by design)
  + span.sr-only clipped (the a11y pattern — invisible BY DESIGN) + the sticky
  savebar with its OPAQUE background over scrolled labels. **These classes are
  the W-lane detector-policy workload** (the allowlist ledger covers `fixed`
  only; fixed-over-text/clipped are never allowlisted — the W sweep × roles
  must adjudicate the chrome layering + teach the probe the sr-only exemption).
- **The maestro fold-fix was insufficient** (run 43131697814: the new title
  anchor «رحلة تعلم واحدة» failed exactly like «ابدأ الآن» — 120s never
  visible): two INDEPENDENT Arabic anchors failing while the id-based login
  testIDs matched in the SAME flow = **RTL text matching in
  Maestro-on-Android is the unreliable channel**. **The smoke is id-first
  now** (510ce208): welcome-title / welcome-cta / login-submit / tab-courses
  (Button gains testID, FormScreen gains submitTestID, TabBar pins
  tab-<route>); the screencap-on-failure ships with the junit in the
  diagnostics artifact; the iOS workflow's path filter gains .maestro/** (the
  flow exercised Android only — the gap). Mobile gates on this box: tsc 0/0 ·
  jest 42/42 suites 1176 green · contract-check no drift.
- **The rename-ledger off-list hit** (CI design-gates on 1830aaf1): P3a's
  «راجع الإدارة» in MyProfileData → the R321 vocabulary («يُدخلها المسجّل
  العام… راجعه») — scan rc=0 now.
- Stray: the daemon pid files (backend-dev/frontend-dev.pid) rode 510ce208 —
  removed + gitignored in cb5fecd3.

## next (in order) — after session 3½
1. Watch 510ce208's Android run — the id-first smoke's live proof (build+verify
   already green twice; publish rides [verify, smoke]). iOS re-enters via the
   .maestro path filter.
2. **P4 mobile UI** (tap-to-call/WhatsApp on the shaped payloads — deps NOW
   installed on this box: tsc+jest+contract all green).
3. LANE S (S1-S6), LANE I (I1-I8), LANE W (owns the detector policy for the
   chrome/sr-only classes above + the stylelint pin + VLM panel), LANE N, Z.
