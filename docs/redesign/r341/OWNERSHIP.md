# R341 OWNERSHIP — disjoint file sets per task (the concurrency contract)

Two agents may NEVER own the same file in the same wave. JSON/TSSX conflicts resolve by merge ORDER (queued); CSS conflicts resolve by file split. Dev-server ports: each browser agent gets its own `53NN` (H1:5311 · L1a:5312 · L1b:5313 · L1c:5314 · L1d:5315 · L1e:5316 · L1f:5317 · I1:5318 · B1 judges: 5321-5323 · D-tasks: 5341+<n> · M: none (jest/tsc only) · C: 5361+<n>).

| Task | Owns (exclusive) |
|---|---|
| H1 | `scripts/conformance/mapping/home-hero-wrap.json`, `frontend/src/components/landing/hero/**` |
| L1-a | `frontend/src/styles/landing/why.css`, `frontend/src/components/landing/sections/*Why*` |
| L1-b | `@media (max-width: …390/phone)` blocks in `styles/landing/{hero,intro,problem,platform,map,usecase,statement,footer,journey,strata}.css` (NOT why/cta) |
| L1-c | `styles/landing/consent-edge.css`, `components/**/Consent*` |
| L1-d | `styles/landing/cta.css`, CTA components in `components/landing/**` |
| L1-e | type-scale rules in `styles/landing/nav.css` + index-numeral components + `styles/tokens/tokens.css` landing rungs (coordinate via queen) |
| L1-f | `frontend/src/lib/progressRegistry.ts`, `components/landing/**/BootLog*`, `ScrollRule*` |
| I1 | `scripts/conformance/panel.mjs` (+ run.mjs wiring, queen-reviewed) |
| D1 | `frontend/src/pages/AuthPage.tsx`, `pages/auth/**`, `styles/auth.css` (delete), its tests |
| D2 | about seat files (`PublicPages.tsx` about parts → split if shared: queen arbitrates), `styles/` about rules |
| D3 | help seat files, help rules |
| D4 | `pages/AppDownloadPage.tsx`, app/download rules |
| D5 | `pages/legal/**`, error pages (`Error403Page/Error500Page/NotFoundPage/MaintenancePage`), `styles/legal.css` |
| D6 | `components/shell/**` (AppShell/nav), `styles/student.css` shell rules, `styles/shell/**` |
| D7a | `pages/student/{Dashboard,Courses,CourseDetail,Catalog,Calendar}*`, `styles/student/*` those rules |
| D7b | `pages/student/*Exams*`, `styles/student/exams.css` |
| D7c | `pages/student/{Results,Schedule,Alerts,Messages}*`, their rules |
| D7d | remaining `pages/student/*`, their rules |
| D8 | `pages/teacher/**`, `styles/teacher/**` |
| D9 | `pages/campus/**` (registrar), `styles/campus.css` |
| D10 | `pages/quality/**`, `styles/teacher-quality.css` |
| D11 | `pages/owner/**`, `styles/owner.css` |
| D12 | `pages/student/*Notification*`, pdf viewer rules, `styles/{notifications,pdf}.css` |
| C1 | `styles/polish.css` (line-range split C1a 1-982, C1b 983-1964, C1c 1965-end) |
| C2 | `styles/components.css` (line-range split C2a/b/c) |
| C3 | `styles/{base,layout,unified-parity}.css` |
| C5 | CSS folder structure + import graph (`styles/index.css` or equivalent), file renames |
| M1–M11 | `apps/mobile/**` disjoint screens (see tasks/M*.md) |
| Y1 | non-landing `frontend/src` + `backend/src` + `scripts/` (dead code; NO overlap with D-task page files in the same wave) |
| Y2 | `frontend/src/lib/copy*`, tokens sources, route constants |
| Y4 | `AGENTS.md`, `scripts/README.md`, `docs/INDEX.md` |

Shared (queen-only): `docs/redesign/r341/**`, `scripts/conformance/ratchet.json`, `scripts/gates/stylelint-baseline.json`, `package.json`/lockfiles (workers request via report).
