# MASTER CONSOLIDATION RESUME — living state

Update after every substantial commit/integration. Format: done / next / gotchas.

## done

- **M0 complete**: baseline verified `main@86c9d615`, CI green, release audited
  (verify.json gap found), three inventories landed. Board =
  `MASTER-CONSOLIDATION-PLAN.md`.
- **M2 complete — MERGED `5f7c9878`**: /app rebuilt on the rolling android-latest
  release (direct APK CTA, live build-info.json, iOS «قريبًا»), build-android.yml
  triggers cover apps/mobile/app+src JS changes, verify.json joined the release
  assets. **LIVE-VERIFIED**: the release rebuilt from `5601fe79` at 03:56 with
  all 5 assets, `verified: true` — the distribution chain self-updates.
- **M1 complete — MERGED `5601fe79`**: university showcase retired (13 files
  deleted, ~120 modified), Statement crawl = OUR capability register (svg
  canvas, census box grammar kept), synthetic tenant re-keyed to «مؤسسة مدارك
  النموذجية», CSP frame-src self-only, r307 rewritten as the retirement
  contract, footer MARK_PATHS re-sourced from brand/mark, mobile BrandMark
  un-skewed. **CI FULL GREEN on `3864224d`** (incl. conform-gate — intro ≥R347
  baseline at every bp, coverage 37.6% ≥ 37 floor).
- **M4 foundation — MERGED `f7570335` (E1)**: InstitutionKind + school-mode
  student fields + identity/contact/guardian columns with normalized phone
  indexes, teacher employeeId/phones, the STRUCTURED custom-field system
  (InstitutionFieldDefinition + FieldValue), phones.ts (20 tests) + fields.ts
  (25 tests, §9.4 aliases). Additive-only migration, replay-verified.
- **M5 core — MERGED `47a6893c` (F1)**: the XLSX/CSV import engine — exceljs
  detection/reading, the alias mapping engine with saveable replay profiles,
  honest row validation (emailless §8.6, sibling-phone warnings, school/
  university duality), ImportJob/ImportRow/ImportMappingProfile models, the
  /api/v1/import route family (parse/preview/chunked-idempotent-commit/jobs/
  templates.xlsx/report.xlsx/profiles), 18 new tests incl. the 10k synthetic
  load (~1s pure layer). Backend 1757+323 green.
- **M6 core — MERGED `188f700f` (G1)**: GET /search/global — permission-scoped
  category planner (students discover NO people; cross-institution isolation;
  phone search on E1's normalized columns, admin-scope only), planGlobalQuery
  (Arabic fold + al-prefix + phone detection) + rankHit (exact>prefix>
  substring), pg_trgm + 7 GIN trgm indexes (live-verified on local PG),
  77 search tests green; the existing course-dropdown search untouched.

## next (in order)

1. **Watch CI on `188f700f`** (queued at session close — all prior merges green).
2. **F2/G2 frontend**: the import wizard UI (upload → map → preview → commit →
   report) on /api/v1/import; the global-search box wired to /search/global
   (the GlobalSearch component is eager — mind the 770 KB bundle ceiling).
3. **M3 mobile completion**: the iOS crash investigation needs real device/
   simulator logs (owner-supplied crash report pending re-supply); JS-side
   role journeys + the BrandMark fix already shipped via the new APK.
4. **M8 debt**: D9/D10 per-role corpora export glue (pages-*.mjs exist, the
   dead.mjs/overlap harness needs the export), then D12 safe CSS demolition
   (46,591 → ≤33,000 lines; the patterns.css showcase families already took
   −462 this round).
5. **M9 final**: full verify.sh + extended conformance re-measure + the
   report's honest-status refresh.

## gotchas (additions)

- `tsc -b` incremental caching can mask `typecheck:tests` errors locally —
  CI caught one the local fast gate passed (r307 manifest annotation); when
  in doubt run `npm --prefix frontend run typecheck:tests` directly.
- The scoped conformance runs compute coverage per-bp-subset — only the
  full-matrix union is the gate number (37.6% ≥ 37 floor proven by union math).
- Subagents exceed turn limits on >2h tasks — the F/G agents each landed
  ~80% and the lead finished the remainder; keep briefs scoped to one wave.
- `prisma db execute` prints no SELECT output — use a node script with
  `$queryRawUnsafe` for verification queries.
- Local PG (port 5433) may stay resident between worktree sessions —
  `local-db.mjs` detects and reuses it; shadow-db URL trick fails (P1010).
