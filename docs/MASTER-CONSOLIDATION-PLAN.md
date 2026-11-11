# MASTER CONSOLIDATION PLAN — the mission board

Round ID: `master` (supersedes r347 backlog tracking; r347 RESUME stays as history).
Baseline: `main@86c9d615` (verified 2026-11-11 · CI green · single `main` branch).
Owner directive: institution-neutral product · one brand · GitHub-Actions-only Android
distribution · complete academic data model · XLSX/CSV import · global search ·
finish web + native · retire R347 debt safely · commit and push continuously.

## Verified baseline (M0 — measured this session)

- main = `86c9d615`, working tree clean, only `refs/heads/main` on origin.
- CI on main: CI / Size gate / deadcode = success; iOS SideStore in progress (normal).
- `android-latest` release exists (id 440953782, prerelease, rolling): has `Madarek.apk`
  (59 MB), `Madarek.aab` (46 MB), `build-info.json`, `SHA256SUMS.txt` —
  **`verify.json` MISSING** (publish arg-list omission, build-android.yml:646-649).
  Signing is LIVE release mode (cert `746196e6…ce12`, `ly.madarek.mobile`, v1.0.0/1).
- `frontend/src/styles` = 46,591 CSS lines (D12 target ≤33,000).
- AppDownloadPage.tsx still points at the EAS tar.gz + builds page + hard-coded 1.0.0 +
  TestFlight copy (verified by read).

## Audit facts driving the plan (from the three M0 inventory agents)

### Curated university section (M1)
- DELETE 13 files; MODIFY ≈90 (19 frontend src, 7 mobile, 5 backend, ~19 scripts, ~25 tests, ~20 docs).
- Removal ORDER is load-bearing (compile + gates):
  1. extract generic exports from `university-media.ts` → `product-media.ts` (WhyScene/ProductFrame repoint)
  2. Statement crawl + nav/footer seats + conformance `home-intro-wrap` mapping regen
  3. the `/campus` surface set + pinned tests
  4. card system + mobile twins + sync script
  5. manifest/robots/sitemap/index.html + legal-page pins (16→15 URLs)
  6. synthetic identity neutralization («جامعة مدارك التجريبية» → «مؤسسة مدارك التعليمية النموذجية»)
  7. CSP frame-src tighten (after videos gone + r307 CSP pins updated)
  8. scripts/docs last
- **KEEP**: the legacy tenant id + `madarek-demo` slug (FK anchors through applied
  migrations + tests) — display names only. Generic institution/faculty/
  department/colleges systems, /student/university + map, product captures, r342
  illustrations: all preserved. (The facts-sync pipeline was later retired at R349 U2.)

### Brand (M1)
- Footer bypass: `MARK_PATHS` (Footer.tsx:100-111, usage 374-390) = orbit construction,
  NOT the khatam mark. Repair Option A first (re-source geometry from `brand/mark`,
  keep the 8-path DOM contract + data-specs → footer conformance mapping stays valid),
  then decide on Option B (true `<Logo>` mount + mapping regen) with the owner.
- Mobile bypass (worse): `apps/mobile/src/components/ui/brand.tsx` `BrandMark` —
  double-scaling + skewed diamond at size≠32, used by ALL live mobile chrome surfaces;
  the correct ported `<Logo>` (R326) has zero production call-sites. Fix: make BrandMark
  a thin wrapper over `@/brand/mark` constants (or migrate call-sites to `<Logo>`),
  keep `testID` contract.

### Android distribution (M2)
- `build-android.yml` triggers EXCLUDE `apps/mobile/app/**` + `apps/mobile/src/**`
  (JS-only changes never rebuild the APK — the core owner complaint). Also missing
  root `scripts/tokens/**`, `scripts/brand/**`, `docs/api/openapi.json`.
- verify.json: already inside the publish job's downloaded artifact — one-line arg add.
- /app page: replace EAS tar.gz URL with
  `https://github.com/ahmadmedo1012/madarek/releases/download/android-latest/Madarek.apk`,
  drop builds-page link, read version/date from the release `build-info.json`
  (never blocking the CTA, honest fallback), iOS section = «قريبًا» non-clickable.
- Docs to sync: CI-BUILDS.md (trigger policy + asset list), RELEASE.md (EAS table,
  phantom docs/releases.json claim).
- Re-arm: `workflow_dispatch` a fresh build after merge; verify all 5 assets live.

## The board (owner → task → files)

| ID | Task | Owner | Branch |
|----|------|------|--------|
| A1 | /app page rebuild (GitHub APK + build-info + iOS قريبًا) | lead | `wip/android-release` |
| A2 | build-android.yml: verify.json asset + app/src triggers + comment | lead | `wip/android-release` |
| A3 | CI-BUILDS.md + RELEASE.md sync | lead | `wip/android-release` |
| D1 | product-media.ts extraction + repoint | lead | `wip/brand-neutralization` |
| D2 | Statement crawl + SheetNav/Footer/Capabilities seats + mapping regen | lead | `wip/brand-neutralization` |
| D3 | /campus surface set + test pins | lead | `wip/brand-neutralization` |
| D4 | card system + mobile twins + sync script | lead | `wip/brand-neutralization` |
| D5 | manifest/robots/sitemap/index.html + legal pins | lead | `wip/brand-neutralization` |
| D6 | synthetic identity neutralization (web+backend+mobile+tests) | lead | `wip/brand-neutralization` |
| D7 | CSP tighten + r307 rework | lead | `wip/brand-neutralization` |
| D8 | scripts + docs sweep | lead | `wip/brand-neutralization` |
| B1 | Footer MARK_PATHS → brand/mark geometry (Option A) + pin test | lead | `wip/brand-neutralization` |
| B2 | mobile BrandMark repair | lead | `wip/brand-neutralization` |
| E1 | academic schema (student/teacher profiles, phones, guardians, custom fields) | agent-E | `wip/academic-profiles` |
| F1 | XLSX/CSV import engine (templates, mapping, dupes, 10k) | agent-F | `wip/bulk-import` |
| G1 | global search (normalization, indexes, permissions, UX) | agent-G | `wip/global-search` |
| C1 | web product completion (role journeys polish) | agent-C | `wip/web-product` |
| H1 | D9/D10 corpora export glue + D12 safe CSS demolition | agent-H | `wip/quality-debt` |
| Z1 | final integration + verify + report | lead | main |

## Gate discipline (unchanged, binding)

- `bash scripts/verify.sh --fast` before EVERY push (~4 min; full set at milestones).
- Bundle ≤770 KB gz; conformance ratchet ≥91.6 (floor 91.8 file value; never lower).
- Tests are law — update pins WITH the markup, never weaken assertions.
- No force-push. One worktree per task under `/home/z/wt/`. npm only.
- Never run root `npm run build` / db:seed / migrations against production.
