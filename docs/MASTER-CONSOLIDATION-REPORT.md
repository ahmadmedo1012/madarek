# MASTER CONSOLIDATION REPORT — session 1 close-out

Round: `master` (session 1 of N). Baseline `86c9d615` → close `188f700f`
(+8 merges, all pushed to main; per-wave fast gates PASS; CI green through
`3864224d`, later runs in progress at close). This report separates what is
**completed and verified** from what remains — no fabricated percentages.

## GitHub

- main advanced `86c9d615 → 188f700f` via verified merges:
  `7f258193` (board) · `5f7c9878` (M2 android-release) · `5601fe79` (M1
  brand-neutralization) · `f7570335` (E1 academic-profiles) · `3864224d`
  (typecheck fix) · `47a6893c` (F1 bulk-import) · `188f700f` (G1
  global-search) + the RESUME doc commits.
- Branches: `wip/android-release`, `wip/brand-neutralization`,
  `wip/academic-profiles`, `wip/bulk-import`, `wip/global-search` (all
  merged; kept as the audit trail).
- CI: **full matrix GREEN on the M1 tree (`3864224d`)** — lint, typecheck,
  build, frontend+backend tests, e2e, iOS-webkit, design-gates,
  **conform-gate** (the risk point — PASSED), surface-drift, size-gate,
  deadcode, deploy-smoke, Mobile, iOS SideStore.

## Android (M2 — COMPLETE)

- `/app` primary CTA →
  `https://github.com/ahmadmedo1012/madarek/releases/download/android-latest/Madarek.apk`
  (direct download, no sign-in, no EAS); live build metadata read from the
  release `build-info.json` (never blocks the CTA, honest fallback); iOS
  section = honest non-clickable «قريبًا» (no TestFlight/SideStore/IPA).
- `build-android.yml`: triggers now cover `apps/mobile/app/**`, `apps/mobile/src/**`,
  token/brand generators, openapi — JS-only changes rebuild the APK; `verify.json`
  joined the publish assets.
- **Release live-verified**: `android-latest` rebuilt from `5601fe79`
  (2026-11-11T03:56Z) with all 5 assets — APK 59 MB (release-signed, cert
  `746196e6…ce12`), AAB, build-info, SHA256SUMS, verify.json (`verified: true`).
  The rolling release now carries the university-showcase-free app.
- Signing identity preserved (established release key, untouched).

## Identity (M1 — COMPLETE)

- University showcase retired: 13 files deleted, ~120 modified (web route/page,
  MediaFrame/VideoCard/InkSketch, the shared card system + mobile twins + sync
  script, 462 lines of showcase CSS families, manifest/robots/sitemap/
  index.html registers, CSP frame-src back to self-only).
- The landing statement crawl is now OUR OWN capability register
  (typographic svg cells) — no external institutions anywhere; r307 rewritten
  as the retirement contract (showcase cannot return: registry/source/route/
  CSS/CSP pins).
- The synthetic tenant re-keyed: «جامعة مدارك التجريبية» → «مؤسسة مدارك
  النموذجية» across ~50 files (web+backend+mobile+tests+docs); FK anchors
  (`inst-zawia-showcase`, `madarek-demo`) preserved by design; hard-coded
  campus counts now derived from live data.
- **Brand**: the footer's MARK_PATHS bypass re-sourced from the ONE
  `brand/mark` geometry (Option A — 8-path census contract + data-specs kept,
  orange point on the accent seat, anti-rot pins in r323); the mobile
  BrandMark double-scaling/skew FIXED (viewBox-unit rendering + X11 ramp
  from `@/brand/mark`, 21 brand tests).

## Academic data (M4 — FOUNDATION COMPLETE)

- InstitutionKind (school/university/college/training/other) + controlled
  academicConfig; school-mode student fields (stage/grade/section/transfer);
  identity/contact/guardian columns with **normalized phone indexes**;
  teacher employeeId/phones; the STRUCTURED custom-field system
  (InstitutionFieldDefinition + FieldValue — controlled options/validation,
  never a Json blob); phones.ts (Libyan+international, 20 tests) and the
  §9.4 import-alias mapper (25 tests). Additive-only migration, replay-verified
  on live local PG. **API surface for profile CRUD + the emailless-login
  activation flow: REMAINING (M4 phase 2).**

## Import (M5 — ENGINE COMPLETE)

- XLSX (exceljs) + CSV UTF-8, Arabic/English/mixed headers; the §9.4 alias
  mapping engine with saveable/replayable mapping profiles; honest row
  validation (emailless students, sibling-phone warnings, school/university
  duality, custom fields through the controlled validator); ImportJob/
  ImportRow/ImportMappingProfile models; the `/api/v1/import` route family
  (parse · preview · chunked idempotent commit with duplicate policy ·
  progress · REAL .xlsx templates · per-line report workbook · profiles);
  10,000-row synthetic load through the pure layer ≈ 1 s. The r323 CSV
  workflow untouched and compatible. **The admin wizard UI: REMAINING (F2).**

## Search (M6 — CORE COMPLETE)

- `GET /search/global`: permission-scoped categories (students/teachers/
  institutions/faculties/departments/courses/announcements) — students
  discover NO people; teacher/admin/quality/owner scoping per §10.4 with
  cross-institution isolation; phone search rides E1's normalized columns
  (admin-scope only); Arabic fold + ال-prefix tolerance + exact>prefix>
  substring ranking; pg_trgm + 7 GIN trigram indexes (live-verified).
  77 search tests; the existing course-dropdown search untouched.
  **The global-search UI wiring + P95 measurement on representative data:
  REMAINING (G2).**

## Website / conformance

- Bundle 760.0 → **753.2 KB gz** (showcase retirement paid for itself);
  CSS ratchet held (52 `!important`); intro conformance ≥ the R347 baseline
  at EVERY breakpoint (390: 87.2→88 · 768: 89.4→90 · 1024: 96.9→98);
  footer stable 89–90; coverage 37.6% ≥ 37 floor (full-matrix union math);
  zero no-counterpart fails (the DOM contract preservation worked).

## Honest status (§21)

**Completed and verified (this session):** M0 audit+board · M2 in full ·
M1 in full · M4 schema foundation · M5 engine · M6 core · CI green on the
identity tree · the 5-asset rolling release live.

**Implemented, verification pending:** CI runs on `f7570335`/`47a6893c`/
`188f700f` were queued/in-progress at session close (all earlier trees green;
fast gates passed locally on every wave).

**Not completed (the honest remainder):** F2 import wizard UI · G2 search UI
+ P95 measurement · M3 mobile crash root-cause (needs the owner's device/
simulator logs — the React-Compiler-OFF protection stays) · M7 web role-journey
polish · M8 D9/D10 corpora export glue + D12 CSS demolition (46,591 → ≤33,000)
· M9 extended-matrix re-measure + final acceptance sweep.

**Blocked by owner-controlled dependencies:** Apple Developer account config
(iOS public distribution — honestly marked «قريبًا» everywhere); Play Console
service-key step for the AAB store upload (documented in RELEASE.md); the
iOS crash report re-supply.
