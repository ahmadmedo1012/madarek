# R305 FINAL — Release Worklog (integration, verification, release, deployment, cleanup)

**Release program:** R305 — Heron-inspired, complete Madarek redesign
**Integration branch:** `integration/r305-heron-release` (from `origin/main` @ `7af16fe208d0627f3bc5cb05255dbd9378373bb3`)
**Date (UTC):** 2026-10-21
**Integrator:** Agent 10 — final release engineer

---

## 1. Baseline (Phase A) — recorded facts

| Fact | Value |
|---|---|
| UTC start | 2026-10-21T20:34:04Z |
| `origin/main` | `7af16fe2` (Merge PR #39, R304 integration) |
| Remote branches | 40 (9 × `redesign/r305-heron-*`, 12 × r304, 7 × final-*, 2 × phase-*, 8 × redesign misc, main) |
| Tags | 13 (`r134`, `archive/*`) |
| Working tree | clean on fresh clone |
| `main` protection | required checks (strict): lint, typecheck, build, test-frontend, test-backend, design-gates · no required reviews · no force-push/deletion · merge commit allowed |
| Merge bases | 8 R305 branches share base `1b766512` (each −3 behind main); `redesign/r305-heron-landing` has **NO merge base** |
| Open PRs at start | none |

### Special investigation — `redesign/r305-heron-landing`

**Diagnosis (evidence):** single orphan root commit `8da3411c` ("Initial commit", no parents). Its tree **deletes the entire repository** (1,263 files, −301,767 lines) and adds only sandbox junk: `.env` containing `DATABASE_URL=file:/home/z/my-project/db/custom.db` (a local sandbox path), `download/README.md` ("Here are all the generated files."), and a gutted 2-line `.gitignore`. **It contains zero landing-page implementation work.**

**Decision:** REJECTED for integration. Not merged, not cherry-picked, not reconstructed — there is no implementation to recover. The branch and its history are preserved verbatim in the verified backup (§2). Workstream A3 (public landing redesign) is **undelivered** by this program; the landing page ships with the R304 markup re-keyed to the R305 token canon (foundation) — measured live during acceptance (§6).

## 2. Backup (Phase B) — verified

| Artifact | Path / detail |
|---|---|
| Mirror clone | `backup/madarek-mirror.git` — 91 refs, all branches + tags |
| Bundle | `backup/madarek-full-backup-20261021T203532Z.bundle` — 76 MB, 92 refs, `git bundle verify` PASS |
| Independent recovery test | fresh clone from the bundle → 40 branches, `main`/landing/auth-qa SHAs byte-identical → PASS |

## 3. Branch inventory (Phase B) — unique-work audit

- **17 branches fully merged into main** (0 unique commits): all `phase-*`, `redesign/4a–4e`, `redesign/r304-*` (×11), `redesign/illustrations`, `redesign/integration`, `redesign/shell`, `redesign/superlist-optikka`, `redesign/final-integration`.
- **6 `redesign/final-*` branches** (r299 program): 1 unique commit each — **patch-id identical** to commits already in main (`5cd37de9`≡`8df2e856`, `b8c101c0`≡main's "الملصق يكتمل بصريًا" commit, etc.) → rebased duplicates, zero unique work.
- **8 R305 branches** with real unique work → integrated (§4).
- **`redesign/r305-heron-landing`** → orphan junk (§1), preserved in backup only.

## 4. Integration (Phases C–D)

Audit executed by 5 independent read-only auditors (design canon, shell/QA, student/teacher, research/admin, security) before merging. Integration order and conflict resolutions:

| # | Branch | Result |
|---|---|---|
| 1 | foundation | 2-file conflict (`unified-parity.css`, `verify-parity-export.mjs`) vs main's interim r304 fix → took the branch's complete r305 export-v2 pair; **parity gate re-run before commit: 191/191 PASS** |
| 2 | interactions | clean (merge-tree predicted + verified) |
| 3 | shell | `CHANGELOG.md` prepend conflict → both sections kept (foundation first); `surface-baseline.json` → deferred to final regeneration (§5) |
| 4 | student | clean |
| 5 | teacher-quality | `OnlineExamsPages.tsx` import-block conflict → kept all 4 import lines (complementary class vocabularies, disjoint regions — audit-verified) |
| 6 | research-pdf-ai | clean |
| 7 | admin-owner | clean |
| 8 | auth-public-qa | clean (`TrainingPages.tsx` auto-merged — disjoint regions, audit-verified) |

### Integration fixes (committed on the integration branch)

1. `lib/motion/tokens.ts` `DURATION_FALLBACKS_MS` re-keyed to the r305 ladder (80/**200/400/500/400/480**/700/1200) + test pins — cross-branch drift (interactions authored against the pre-r305 ladder; foundation re-keyed it; CI could not catch it because live DOM reads win).
2. `E2eOptions.reducedMotion` declared in the e2e fixtures interface (TS2353 — shell's fixture addition), `Page` type re-imported from `@playwright/test`, unused render var dropped (interactions).
3. `MorePages.tsx` duplicate `r305-student.css` import collapsed (handoff N1) + its pin test re-pinned to the collapsed block.
4. A9 full-motion spec re-pinned to the r305 ladder (`--motion-duration-medium` 240→400ms, CTA `0.16s`→`0.2s`) — cross-branch drift the per-branch suites could not see.
5. `KNOWN_DURATIONS_MS` (audit drift allowlist) updated to the r305 ladder; retired rungs (160/240/320/360/380 — measured: zero occurrences in 72 fresh captures) removed per the file's one-cycle convention; 200/400/480/500/650 added.
6. Surface baseline re-promoted from the integrated tree (72 captures, vite preview + mock transport, CI-parity env) → drift gate **CLEAN**.
7. **21 third-party reference-site captures removed** (`docs/redesign/assets/r305-heron/2a-*/2b-*/2c-*.png` — live screenshots of heronaiapp.com incl. team photos; no redistribution rights). Preserved in the backup + on the branch; `MANIFEST.md` documents the decision. The 4 `madarek-after-*.png` (Madarek's own app) ship.
8. Doc truth fixes: parity needle count 133→132 (runtime truth), interactions doc motion values + module attribution, `/home/z/r305a7-shots/` local path scrubbed from the A7 audit doc.
9. CI: the A9 QA belt (`tests/r305`, 73 hermetic specs) wired into the E2E job.

## 5. Test evidence (Phase F) — exact results on the integration branch

| Check | Command | Result |
|---|---|---|
| Lint | `npm run lint` | **0 errors**, 15 warnings (documented exhaustive-deps allowance) |
| Typecheck | `npm run typecheck` (4 projects) | **PASS** (after fix #2) |
| Unit (frontend) | `npm test -w frontend` | **212 files / 2,448 tests passed** (after fixes #1, #3) |
| Unit (backend) | `npm test -w backend` | **76 files / 1,783 tests passed** |
| DB integration | `npm run test:integration` on disposable embedded PostgreSQL 16 (port 5433, guard-verified local) | **12 files / 116 tests passed** (migrations applied via `prisma migrate deploy`) |
| E2E journeys | `npm --prefix frontend run test:e2e` | **57/57 passed** (3.4m, incl. the new 29-spec shell suite) |
| A9 QA belt | `npm --prefix frontend run test:r305` | **73/73 passed** (2.9m, after fix #4) |
| Parity export | `node scripts/verify-parity-export.mjs` | **191/191 PASS** |
| Colleges | `npm run validate:colleges` | **25/25 OK** |
| Motion tokens | `npm run check:motion-tokens` | OK |
| Icons | `npm run check:icons` | OK |
| Colors | `npm run check:colors` | OK (22 documented inline allows) |
| Raw CSS | `npm run check:raw-css` | PASS (0 findings / 149 tsx files) |
| CSP hash | `bash scripts/check-csp-hash.sh` | both pins OK (byte-exact) |
| Bundle | `node scripts/check-bundle-size.mjs` | PASS — 890.8 KB gz total / 900 ceiling |
| Build (frontend) | `npm run build -w frontend` | OK |
| Build (backend) | `npm run build -w backend` | OK |
| Surface drift | capture (preview+mock, 72 captures) + `run-drift.ts` (CI env `AUDIT_FCP_RATIO=4`) | **CLEAN across 72 captures** (after fixes #5–6) |

Root `npm run build` was **not** run (it deploys DB migrations + seed — AGENTS.md safety rule); workspace builds used instead, matching CI.

### Regression classification

- **Newly introduced by integration, found & fixed:** #1–#6 above (all re-tested green; commits on the integration branch).
- **Inherited, verified as already fixed on main:** parity 76/190 (branch-side observation; main's `7d5fb098` fixed it differently, superseded by the r305 191/191 pair), 3 stale E2E pins (main's `abbad2e9` re-pinned them).
- **A7's reported `.badge` e2e regression:** CONFIRMED as real at the branch's parent, and **already fixed at the branch head** (`22403d3b` re-pointed the locators to the `.r305rp-chip` contract — correct resolution: the chip anatomy is design-governed and a11y-motivated). Suite re-run green in the 57/57.
- **Known non-reproducible observation:** during one cold-load of `/student/research` the dev-mode axe checker logged 15 identical contrast findings (13px meta `#7c7c7b` on `#fdfefe`, 4.13:1) in a transient state that could not be reproduced across reloads, SPA navigation, or cold-cache loads; the settled page passes a direct `axe.run` contrast scan with **zero violations** and an independent computed-contrast audit. Logged for the next a11y sweep; not release-blocking.

## 6. Visual & product acceptance (Phase E) — measured

Live stack: backend (`node backend/dist/index.js`, :4000) + disposable seeded PG16 + Vite dev (:5173). Evidence set: **31 screenshots** (kept in the release workspace, not committed — the branches' own 100+ committed evidence frames cover the same matrix).

- **Routes exercised live:** `/`, `/auth`, `/register` (via link), 404 (unknown route), student (dashboard, courses, online-exams, library, research, ai, calendar, messages), teacher (dashboard, research, exam author, intelligence), quality dashboard, admin (dashboard), owner (dashboard, institutions, users), onboarding tour.
- **Viewports:** 1440×1000, 768×1024, 390×844 (light+dark), 360 (E2E suite), 320×800 stress. **No horizontal overflow at any width** (measured `scrollWidth` = viewport).
- **Themes:** light + dark verified on landing, shell, dashboard (toggle + persistence — also pinned by the 73-spec QA belt and the theme-persistence E2E).
- **VLM pixel review:** every FAIL verdict was investigated and **objectively disproved**: 404 eyebrow measures **7.09:1** (`#B4B4B0` on `#282828`); the exams-page "red square artifact" is the designed `.hr-edge` severity marker; RTL input-icon placement follows the start-side convention; the fixed bottom-nav leaves the last item fully clear at full scroll (measured: last-item bottom 764 vs nav-top 766, `.content` scroll container with 80px bottom padding).
- **Console health:** zero JS errors across all exercised routes (only pre-existing React Router v7 future-flag warnings).
- **Onboarding tour:** renders correctly at 390/320/768 (both themes), skip/finish server-persisted (idempotent `POST /me/onboarding/complete`), replays from the help menu without re-persisting.

## 7. Security & dependency review (Phase G) — verdicts

- **Secrets:** zero real secrets in the integrated diff (fixture demo credential is the documented public seed value; CSP pins are public integrity hashes). No `.env` files, no private keys, no DB URLs.
- **Dependencies:** zero additions/removals — the only package.json change is the `test:r305` script.
- **Backend surface:** 11 lines in `backend/src/app.ts` (comment + CSP pin refresh, hash byte-exact, gate-verified). No routes/middleware/guards/schema changes in any R305 branch.
- **Licensing:** no font changes (OFL faces unchanged; the reference's proprietary BT Grotesk was never reused); third-party reference captures stripped (§4.7); all shipped imagery is Madarek's own product.
- **CI:** protection untouched; the E2E job gained the QA belt (additive).

## 8. Release (Phase H) — recorded in §10 below after execution

## 9. Cleanup (Phase J) — recorded in §11 below after execution

## 10. Deployment verification (Phase I) — recorded after merge

## 11. Final acceptance gates

- [x] Latest repository state fetched and recorded
- [x] Nine R305 branches independently inspected (8 integrated; landing rejected with evidence)
- [x] No-common-ancestor landing branch diagnosed and resolved safely
- [x] All relevant old branches inventoried (17 merged, 6 patch-identical duplicates, others)
- [x] Full Git backup created and verified outside the repository
- [x] Integration branch based on the verified latest main
- [x] All eight real workstreams integrated; landing exclusion justified (no implementation existed)
- [x] Shared-file conflicts and route ownership gaps resolved (route inventory: 115 routes, zero unowned)
- [x] A7 E2E regression independently verified (fixed at head; suite green)
- [x] Lint, typecheck, unit, integration, design gates, workspace builds — real recorded results (§5)
- [x] Full route inventory + browser acceptance completed (§6)
- [x] Required viewport/theme screenshots inspected; material defects fixed (§5, §6)
- [x] RTL, accessibility, reduced motion, security, real API behavior checked
- [x] Full final diff + dependency/secrets review completed (§7)
- [ ] Release PR merged to protected main via the permitted workflow *(§8, pending)*
- [ ] Required checks on final main commit green *(pending)*
- [ ] Production deployment verified against the release SHA *(§10, pending)*
- [ ] Safely deletable non-main branches removed *(§9, pending)*
- [ ] Final remote branch list verified *(pending)*
- [ ] Local repository clean and synchronized *(pending)*
