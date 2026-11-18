# Heron-inspired product fidelity implementation plan

**Status:** Planned for review only; no implementation authorized or started by this plan
**Specification:** [`docs/specs/heron-fidelity.md`](../../specs/heron-fidelity.md)
**Audit:** [`docs/audit/project-audit.md`](../../audit/project-audit.md)
**Current audit branch:** `exec/r368-heron-fidelity` (contains earlier executor code commits outside the audit-only scope; do not use it as the implementation branch)

## Execution contract

Use a new execution branch/worktree after specification approval, following `AGENTS.md` and the then-current `docs/redesign/r341/OWNERSHIP.md`. Each task must have a valid before measurement, a focused after measurement, a separate commit, and a push. No force-push or merge to `main` in this plan. Stop and report a blocker when evidence cannot be made valid; never lower thresholds to get a pass. Shared gates, mappings, ceilings, workflows, tokens and conformance instrumentation have one lead owner. Section owners work only in assigned files.

Every task handoff records: branch and SHA; files changed; before/after scorecard and relevant project gates; exact commands and outputs; screenshot/trace paths; known residuals; and rollback commit. Use separate worktrees for parallel tasks. Do not run heavy builds in parallel on this 2-CPU/7-GB host. Do not use production credentials, database, or deployment.

### Program completion gates

- Scorecard meets the E/T/Q targets in the spec on valid captures; every section target and measured motion family meets its individual floor.
- Zero responsive overflow, overlap, clipping or unreachable primary actions across the declared matrix; all app roles and mobile screen families sampled.
- Lighthouse mobile ≥90 on `/` and representative public/auth/app routes; record LCP/CLS/INP, no >50 ms LoAF on the pinned production trace.
- WCAG 2.2 AA and reduced-motion/keyboard checks pass; bundle ≤770 KB gzip; current project gates pass without weakening.
- Landing copy reduced ≥20% and audited landing CSS bytes reduced ≥10%, with no lost meaning, workflow or design fidelity.
- Evidence, asset provenance, residuals and rollback references committed. If an acceptance condition proves unmeasurable, revise only through owner review and retain the reason; no silent substitution.

## Ordered tasks

### 0. Repair measurement and establish a trustworthy baseline

**Goal:** Make the visual/motion scorecard valid before product work. Current diagnostic E=56.7 and Q=85; nominal T=100% counts files. Only 3/20 screenshot root pairs are aligned within ±2 px, so none is a release baseline.

**Files:** `scripts/conformance/fidelity.mjs`, `scripts/conformance/stress.mjs`, `scripts/conformance/gates.mjs`, their focused tests and `scripts/conformance/mapping/*.json` (lead-owned only); `docs/audit/evidence/{manifest.json,scorecard.json,capture.json}` and new evidence beneath `docs/audit/evidence/`.

**Changes:** Pin supported Node 20–24, browser build, DPR and fonts; fix section-root alignment and crop definition; define a wheel-driven reference state protocol for Heron's staged page; make manifest validation reject invalid coordinates, heuristic-only coverage and missing traces. Capture all 10 targets × 390/1440 first, plus 768/1024/1920 for high-impact targets; collect 6–10 named states where reference movement can be reproduced. Score E/T/Q independently. Rerun responsive matrix baseline. Do not edit product sections.

**Checks/commands:** `node --version`; `node --test scripts/conformance/*test.mjs`; launch task-owned Vite on strict 53NN and run `node scripts/conformance/fidelity.mjs --url http://localhost:53NN --validate --out docs/audit/evidence`; `node scripts/conformance/stress.mjs --url http://localhost:53NN`; run paired capture twice.

**Done when:** all required target pairs have valid coordinates/state provenance or explicitly recorded inaccessible states; repeat E variance ≤1 point; T derives from verified rows; 100% of confirmed trigger families have a baseline or named measurement gap; no validator accepts the current offset error.

**Dependencies:** none. **Parallel:** no; shared instrument has one owner. **Tools:** agent-browser, Playwright, pixelmatch/SSIM, systematic-debugging, root-cause-tracing. **Rollback:** revert only instrumentation commit and retain failed run evidence.

### 1. Match shared scroll, transitions, preloader and pointer behavior

**Goal:** Align measured landing scroll and chrome behavior with reference while preserving accessibility and bundle limits.

**Files:** `frontend/src/lib/motion/sheetLenis.ts`, `sheetConductor.ts`, `frontend/src/lib/reveals.ts`, relevant `frontend/src/styles/landing/{preloader,nav,consent-edge}.css`, assigned shell components and focused tests in `frontend/tests/`.

**Changes:** Use Task 0 traces to tune only verified Lenis parameters, reveal triggers, durations/easing, page transitions, loader sequence and fine-pointer effects. Confirm touch and reduced-motion paths separately. Keep current architecture unless measured parity and bundle results justify a replacement. Do not add a new animation dependency on assumption.

**Checks/commands:** focused Vitest motion tests; `TZ=UTC npm test --workspace=frontend -- <focused-file>` (use the repo's documented test invocation); `npm run typecheck`; paired browser traces for mouse, touch emulation, keyboard and reduced motion; `npm run build -w frontend`; `node scripts/check-bundle-size.mjs`.

**Done when:** each measured motion family Q≥85 and aggregate Q≥90 after affected captures; zero >50 ms LoAF, reduced-motion bypasses nonessential motion, route/back/scroll restoration tests pass, aggregate bundle ≤770 KB gzip.

**Dependencies:** Task 0. **Parallel:** no; shared motion owner only. **Tools:** agent-browser/Playwright, performance trace, systematic-debugging, review-animations. **Rollback:** revert this task if any scroll, route, a11y, performance or bundle check regresses.

### 2. Build an owned raster/SVG asset system

**Goal:** Match depth, layering, crop and geometry using Madarek-owned artwork with appropriate fidelity at 1× and 2×.

**Files:** assigned assets under `frontend/public/` or existing asset directories; relevant landing component files and their owned sheets; `docs/GRAPHICS-PIPELINE.md` only if the documented pipeline changes; asset provenance in `docs/audit/evidence/`.

**Changes:** Use live inventory and section reference measurements to identify each layered scene; recreate images/shapes as original assets and SVG/CSS layers. Audit alpha, dimensions, crop, z-order, filters, blend modes, transforms and transfer bytes. Re-evaluate the R366 ≤60 KB policy per asset; restore dimensions/quality where before/after proof shows softness. Do not copy Heron media or fonts.

**Checks/commands:** graphics verifier from `docs/GRAPHICS-PIPELINE.md`; paired 1×/2× browser crops and pixel/edge review; `npm run build -w frontend`; `node scripts/check-bundle-size.mjs`; affected section E/T capture.

**Done when:** every replaced asset has source/license, dimensions, alpha, byte count and before/after evidence; no visible 2× softness; affected sections do not regress E by >1 point; bundle remains ≤770 KB.

**Dependencies:** Tasks 0–1. **Parallel:** yes, disjoint asset/section owners after lead approves asset list; shared asset pipeline remains single-owner. **Tools:** impeccable critique, image inspection, agent-browser, ponytail. **Rollback:** restore previous owned assets/components if quality or budget fails.

### 3. Rework the ten landing targets in score order

**Goal:** Bring hero, intro, problem, why, usecase, platform, map, CTA, footer and chrome to spec floors, starting from lowest valid E.

**Files:** follow active section ownership in `docs/redesign/r341/OWNERSHIP.md`; current seats include `frontend/src/components/landing/sections/{Hero,Statement,Chapters,Why,Roles,Product,Live,Vision,Footer}.tsx`, journey components under `frontend/src/components/landing/journey/`, and their matching sheets in `frontend/src/styles/landing/`. Edit only one owned seat per task/commit.

**Changes:** For each seat, compare the same valid state and correct geometry, scale, whitespace, grid, type hierarchy, color, crop, depth and trigger deltas. Keep Arabic content and Madarek identity. No speculative polish; record one concrete observed gap per change.

**Checks/commands:** focused component/unit tests; `npm run lint:css -w frontend`; section-scoped conformance runner against task-owned strict 53NN server; paired screenshot sheet and stress checks for the owned section; full bundle checker after each integrated wave.

**Done when:** E≥88 for that seat at 390/768/1024/1440/1920 where valid paired references exist; T≥90; measured motion samples pass Q tolerances; no responsive issue in the full declared matrix; no more than 2-point regression elsewhere. Continue in ascending score order until every target passes.

**Dependencies:** Tasks 0–2. **Parallel:** yes, separate worktrees only for non-overlapping seat owners; no concurrent shared token, map, chrome or instrument edits. **Tools:** agent-browser, impeccable, root-cause-tracing, accessibility. **Rollback:** revert that seat's commit if score, gates or behavior regress.

### 4. Unify color, typography and spacing tokens

**Goal:** Carry accepted landing language through existing token architecture without violating measured section exceptions.

**Files:** `frontend/src/styles/tokens.css`, `shared/design-tokens.json` and generated token outputs only with lead approval; assigned feature sheets and `frontend/src/styles/landing/*.css`.

**Changes:** Inventory repeated values and map them to existing tokens; add or adjust a shared token only when evidence shows a true cross-product value. Keep measured color exceptions section-scoped. Ensure Arabic line-height, zero letter spacing, RTL mirroring, light/dark contrast and focus states.

**Checks/commands:** `node scripts/tokens/build.mjs --check`; `bash scripts/check-colors.sh --strict`; `bash scripts/check-raw-css.sh --strict`; `bash scripts/check-motion-tokens.sh`; `npm run lint:css -w frontend`; before/after captures and contrast checks.

**Done when:** token drift and raw-value gates pass; all changed target scores stay within 1 point or improve; contrast AA passes; no gate or token generated file is hand-edited.

**Dependencies:** Task 3 approved styles. **Parallel:** no for shared tokens; feature-sheet migration may be parallel only with explicit disjoint ownership. **Tools:** design-token source, impeccable, accessibility. **Rollback:** revert token group and its migration together.

### 5. Extend the design language to other public web pages

**Goal:** Apply the accepted hierarchy and motion restraint to public routes outside the landing page.

**Files:** route inventory from `docs/redesign/r362-integration/AGENT5-ROUTE-INVENTORY.md`; assigned files in `frontend/src/pages/` (about, help, contact, features, legal, auth) and their page-specific styles. Do not alter `frontend/src/lib/routes.ts` strings.

**Changes:** Group routes by page family, identify shared shell and page-specific hierarchy, reduce duplicated visual patterns, and apply tokens, Arabic RTL, responsive and accessibility behavior. Preserve all route content needed for legal/help/auth and every existing interaction.

**Checks/commands:** route inventory refresh; focused Vitest/Playwright route tests; page screenshots at 390/768/1440 and stress widths; axe/WCAG review; Lighthouse mobile on `/features`, `/auth` and representative public route; lint/typecheck/build/bundle.

**Done when:** every public route in inventory is assigned and visually reviewed; zero clipping/overlap/overflow; WCAG AA and existing behavior tests pass; Lighthouse mobile ≥90 on sampled routes; no routing/CSP changes.

**Dependencies:** Task 4. **Parallel:** yes, by disjoint page family with separate files/worktrees. **Tools:** impeccable, accessibility, agent-browser, Playwright. **Rollback:** revert only affected page-family commits.

### 6. Apply the visual system to every authenticated web role

**Goal:** Improve shell and page family consistency for all existing roles without changing authorization or workflows.

**Files:** inventory-derived `frontend/src/pages/app*`, `frontend/src/pages/`, shared app-shell components, and their assigned style files; existing role/route tests. Exact list must be generated from current tree before execution.

**Changes:** Map all routes to student, teacher, admin/owner, quality and registrar/exams role families; sample dashboard, list, detail, form, empty, loading and error states. Apply tokens, density, responsive layout, Arabic labels and interaction affordances. Do not change permission predicates, API payloads or data operations.

**Checks/commands:** inventory script/report; role route tests with existing fixtures; Playwright for each role and page family at 390/768/1440; axe; `npm run typecheck`; frontend tests; bundle check.

**Done when:** 100% of inventoried role routes map to an owner and page family; each role is exercised; visual changes pass accessibility and behavior; no route is newly accessible to an unauthorized role.

**Dependencies:** Task 4. **Parallel:** yes, separate role/page-family owners where shared shell is frozen; shell has one owner. **Tools:** agent-browser, accessibility, systematic-debugging. **Rollback:** revert visual-only role family change if any permission or workflow test differs.

### 7. Adapt the language to Expo mobile

**Goal:** Bring the existing Android app to the same visual craft while using native interaction and respecting mobile product boundaries.

**Files:** assigned `apps/mobile/app/**`, shared mobile components/styles and assets; `apps/mobile/package.json` only when an evidence-backed dependency change is approved. Follow `apps/mobile/README.md` and mobile ownership.

**Changes:** Inventory current 125 route files and screen families; map visual tokens and owned assets; adapt navigation, gestures, safe areas, keyboard, dark mode and reduced motion to native conventions. Keep Android APK output; leave iOS “coming soon”; do not introduce WebView or web-only smooth scrolling.

**Checks/commands:** documented mobile typecheck/unit checks; `npx expo export` or the project-prescribed validation; mobile workflow checks where available; Android emulator/device screenshots for representative routes and role families; APK size and accessibility review. Do not wait on cloud CI for this planning task.

**Done when:** all mobile route files are assigned by family; representative screens for every available role and key state pass on small/large devices; no navigation/API behavior changes; APK-only constraint holds; reduced motion and system font scaling work.

**Dependencies:** Tasks 4 and 6's shared tokens. **Parallel:** yes, mobile worktree can run separately once token contract is stable; no shared asset/token edits. **Tools:** Expo tooling, mobile accessibility, visual review. **Rollback:** revert screen-family commits independently; do not change build workflow to hide failure.

### 8. Reduce copy without removing product meaning

**Goal:** Make Arabic product copy more direct while preserving user guidance, legal requirements and educational terminology.

**Files:** audited public copy in `frontend/src/`; role-page copy only with product owner confirmation; Arabic content tests and snapshots when present.

**Changes:** Record word/character baseline per page family; remove duplicate claims, filler and repeated labels; preserve Libyan education terms, instructions, error explanations, consent/legal text and accessibility names. No automatic bulk rewrite.

**Checks/commands:** reproducible Arabic word-count script/report; grep for changed strings; affected route screenshots; localization/content tests; keyboard/screen-reader label review.

**Done when:** landing word count is at least 20% below measured baseline; every deletion has a meaning check; no legal/help/role instruction is removed; all content tests and route checks pass.

**Dependencies:** Tasks 5–7 stable. **Parallel:** yes, by disjoint page family with an Arabic reviewer; avoid shared strings. **Tools:** Arabic editorial review, ponytail, accessibility. **Rollback:** restore any copy that loses meaning or increases support/task failure.

### 9. Consolidate and archive safely

**Goal:** Reduce proven duplication and documentation noise without breaking consumers, gates or provenance.

**Files:** owned `frontend/src/styles/**` and duplicate components confirmed by imports; relevant scripts/docs under `scripts/` and `docs/redesign/`; archive destination under `docs/archive/`. Never touch gates/baselines/workflows without lead assignment.

**Changes:** Use import/caller inventory and computed-style comparison to remove obsolete CSS layers, merge only equivalent selectors, deduplicate components only where behavior matches, and move superseded round records to archive while preserving indexes/links. Record before/after CSS bytes, duplicate files, line counts and generated/reference status. No broad deletion by age.

**Checks/commands:** `rg` callers/imports; `npm run lint:css -w frontend`; CSS coverage/count gates; `node --test` for relevant script tests; docs-link check if available; before/after computed-style snapshots across affected breakpoints; full route smoke.

**Done when:** CSS bytes are at least 10% below 668,169-byte baseline; lint errors zero; no increase to CSS/file ceilings; every removed/moved file has no broken caller/link and preserves provenance; affected E/T/Q stay within 1 point.

**Dependencies:** Tasks 3–8 accepted. **Parallel:** limited to independent sheets/docs; archive index and shared cleanup have one owner. **Tools:** ponytail, impeccable simplify, `rg`, stylelint and snapshot comparison. **Rollback:** revert cleanup batch if any caller, gate, link or visual output changes unexpectedly.

### 10. Full acceptance, scorecard and handoff

**Goal:** Produce a reproducible closeout for all web and mobile surfaces.

**Files:** evidence and scorecard under `docs/audit/evidence/`; update `docs/audit/project-audit.md`, `docs/specs/heron-fidelity.md`, this plan's status; no product changes in this acceptance task.

**Changes:** Run full paired landing matrix, responsive stress, page/role route samples, Lighthouse/Web Vitals, WCAG/axe, bundle/design gates, backend contract tests (to prove no behavior drift), and mobile checks. Record actual environment, commands, outputs, skips and residuals. Do not copy historic results into current status.

**Checks/commands:** `bash scripts/verify.sh --fast` and lead-owned `bash scripts/verify.sh` without piping; `npm run lint`; `npm run typecheck`; `npm test`; `node scripts/check-bundle-size.mjs`; design/CSS/graphics/conformance gates; pinned Playwright matrix; Lighthouse and axe commands documented with versions; mobile project checks.

**Done when:** every spec checklist item passes or has an owner-reviewed exception; all measured targets meet their numeric floors; all non-passing historical/pre-existing results are resolved or explicitly isolated; complete evidence and final SHA are linked. If not, report incomplete and route to the owning task.

**Dependencies:** Tasks 0–9. **Parallel:** no; one lead aggregates. **Tools:** verification-before-completion, agent-browser, project gates and mobile validation. **Rollback:** no metric/status promotion on failure; keep failed artifacts and return to the first failing owner task.

## Review and git sequence

Review and approve this spec/plan first. Then create a separate implementation branch/worktree; do not continue implementation on `exec/r368-heron-fidelity`. For each task, collect before evidence, implement only assigned files, run focused checks, record scorecard deltas, review the diff, commit with the project's `type(rNNN): subject` convention, and push that task branch. A separate integration decision/branch handles merging after all acceptance criteria pass. Never force-push or change a gate to obtain a green result.
