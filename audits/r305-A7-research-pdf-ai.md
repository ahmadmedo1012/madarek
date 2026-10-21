# R305-A7 — Independent regression QA (research · PDF reader · library · AI assistant)

Task 5 of the R305-A7 wave · audit-only (no production edits — this file is the sole artifact).
**Branch:** `redesign/r305-heron-research-pdf-ai` · **Baseline:** `1b766512` (r304 follow-up) → **Final:** `f7a9f99b` (`git rev-parse HEAD` at audit time; tree clean).
**Commits on the branch:** 11 — 4 feature (`208372f9` ai · `9cc34eb6` lib · `4d9e083f` teach · `ce8da5e3` pdf) + 4 section-union merges + 1 integration typecheck:tests fix (`01dede6e`) + 1 a11y commit (`f7a9f99b`).
**Method:** full re-run of every mandated check on the integration head (real outputs, real exit codes), defect classification against a fresh baseline worktree at `1b766512` (hard-linked node_modules, identical recipes), CI-equivalent mock-mode surface capture + drift detection, full-diff scope/secrets audit. Every number below is from *this* run, not copied from worklogs.

## Verdict in one line

All floors the branch owns are green — lint 0 errors, both typecheck pairs clean, **2181/2181 frontend unit across 194 files, 1783/1783 backend across 76 files**, 4/4 design gates, build + bundle 886.5/900 KB gz — and the diff is perfectly scoped with zero secrets; **but the battery caught 1 genuine A7 E2E regression** (the library chip swap orphaned `library-borrow.e2e.ts`'s `.badge` locators — a CI hard-gate failure), while the parity export gate (76/190, exit 1), 3 E2E selector-rot failures and 6 drift findings on `/` are **proven identical at baseline** (inherited repo conditions, not A7 regressions).

## Conventions audited against

- **Scoped sheet contract** (sibling A8 pattern): one marker class `r305rp` on each page root, `@layer pages`, single sheet `frontend/src/styles/r305-research-pdf-ai.css` imported immediately after each family sheet; sections §A (lib/res), §B (rev), §C (pdf), §D (ai), §9 portal reach-through via `body:has(.r305rp)`; final sheet 1416 lines.
- **R305-A5 Heron grammar**: eyebrow micro-labels, hairline rules/labeled rules, surface bands with **exactly one deep band per page**, dot+label chips (tone rides the dot only), mono metric register, kicker rows, one-action `.r305rp-next` copper rail, meta rows.
- **Gate law**: colors via `var()`/`color-mix()` only; type/radius/spacing token ladders (1px hairlines sanctioned); Lucide via `Icon`; motion tokens only, hover guarded, reduced-motion safe; Arabic-RTL with logical properties.

## Per-surface summary (confirmed defects fixed, pulled from the branch commits)

**1. Student library — `LibraryPage.tsx` (+129/−).** Honesty defect fixed: the research tab's «لا توجد نتائج للبحث» empty state keyed off the *raw* `q` and flashed before the debounce resolved; now keyed on `debouncedQ` + `researchInUse` (regression-pinned in `r305a7-lib-heron.test.tsx`). Loans section flattened to panel + kicker + technical empty; availability/loan-state/search-match `Badge`s → dot+label chips. Deliberate *no-sort* decision preserved: `GET /library/books` has no sort param (`backend/src/http/routes/catalog.routes.ts:91-125`, fixed `orderBy: { title: 'asc' }`) — a page-local sort over a 24/page envelope would be a fake. All capabilities pinned: debounce+trim, pagination fold-back, filter Sheet draft/apply/clear, borrow/return with server `dueAt` + verbatim Arabic 409s, reader deep links, toolbar count now `aria-live="polite"`.

**2. Student research — `ResearchPage.tsx` (+148/−).** Three defects fixed: (1) KPI `StatLine` received raw array lengths → now the one deep-band metric register with `formatInt` values; (2) `paper.reviewer` existed in the API shape (`hooks/resources/research.ts:31`) but was never rendered → grade head shows the reviewer name when the API sends one; (3) the scan button vanished mid-flight → stays mounted, `disabled={isScanning}`, «جارٍ بدء الفحص…», no double-fire (upload/scan `aria-disabled` pairings from the a11y commit). Status ladder stays canonical (`PAPER_STATUS_TONE` → `BADGE_TONE_TO_CHIP`), upload modal left canonical.

**3. Teacher research review — `ResearchReviewPage.tsx` (+608/−).** Heron transform: status chips (gold/warning) on queue rows, publish loop reachable from the workspace, margin-notes thread rendered as `role=list`/`listitem`, publications «فتح» link carries `aria-label="فتح — يفتح في نافذة جديدة"` (G201 off-app disclosure). ⚠️ This surface is the one place a **pre-existing pin file was edited** (see Defects D5).

**4. PDF reader — `PdfViewer.tsx` (+239/−), `AnnotationsPanel.tsx`, `searchFold.ts` (new, 260 LOC), `DocumentViewerPage.tsx`.** New Arabic-aware in-document search: per-character fold with a provenance map (folding deletes chars — a folded offset alone can't be painted), «ال» tolerance at match time with a ≥3-letter remainder floor, snippets taken from original text; the fold chain byte-mirrors `backend/src/modules/search/normalize.ts`. Progress is real pdf.js `onProgress` bytes, honest KiB when total unknown, fill rides `transform:scaleX` with an RTL origin flip (a `check-motion-tokens` FAIL on the inherited diff, fixed in `ce8da5e3`). Selection→note is gated to the text layer + TEACHER/ADMIN/OWNER (mirrors the backend `requireRole`); persisted payload stays `{page, comment, color}` — no invented highlight model. A11y commit added Escape→focus-restore for thumbs rail/selbar, a dismiss button that restores viewer focus, and `aria-disabled` pairings.

**5. AI assistant — `AiAssistantPage.tsx` (+916/− net rewrite).** Defects fixed: (1) error rows now carry the envelope's `error.code` as a verbatim mono chip (backend Arabic message + UPPER_SNAKE code + real retry; nothing invented for codeless failures — pinned both ways); (2) composer upgraded from single-line `<input>` to a `TEXTAREA` (maxLength 4000 preserved, Enter sends / Shift+Enter newlines / IME-safe); (3) reply typography moved from TSX inline styles to §D classes; (4) pending state is a visible truthful «المساعد يجهّز الردّ…» line — non-streaming truth, **no stop/cancel control** (the API has none; faking one is forbidden), no citation/attachment chrome (the chat envelope has none). Engine tag, mastery chip, quick-chip r168b gating, greeting honesty in all 4 modes, two-step delete, `role=log`/`aria-busy` all preserved; the 5 pre-existing pinned test files pass **unmodified**.

## Test evidence (all numbers from this run)

| # | Check | Result | Exit |
|---|---|---|---|
| 1 | `npm run lint` | **0 errors**, 15 warnings (pre-existing `react-hooks/exhaustive-deps`, none in branch files) | 0 |
| 2 | `npm --prefix frontend run typecheck` + `typecheck:tests` | clean ×2 | 0, 0 |
| 3 | `npm --prefix backend run prisma:generate` + `typecheck` + `typecheck:tests` | clean ×3 | 0, 0, 0 |
| 4 | `npm --prefix frontend run test` | **2181/2181 passed · 194 files** (187.49s) | 0 |
| 5 | `npm --prefix backend run test` | **1783/1783 passed · 76 files** (32.74s) — untouched tree, no cross-tree regression | 0 |
| 6 | `check-colors.sh` (22 line-suppressions) · `check-raw-css.sh` (TYPE 0 / RADIUS 0 / SPACING 0 · 37 allows · 0 TSX-inline in 148 tsx) · `check-motion-tokens.sh` · `check-icons.sh` | all OK/PASS | 0 ×4 |
| 7 | `node scripts/verify-parity-export.mjs` · `bash scripts/check-csp-hash.sh` | parity **FAIL 76/190** (see D2) · CSP OK (theme-bootstrap + json-ld pins present) | **1**, 0 |
| 8 | `npm --prefix frontend run build` · `node scripts/check-bundle-size.mjs` | build green (7.85s) · **886.5 KB gz / 900** total, entry 71.4/80, pdf worker 95.7/110 — 142 chunks, 2931.8 KB raw | 0, 0 |
| 9 | `npm --prefix frontend run test:e2e` | **24 passed / 4 failed of 28** (1.9m) — 1 A7 regression + 3 pre-existing (see D1/D3) | 1 |
| 10 | CI-equivalent mock capture + `run-drift.ts` | 72 captures → **6 drift findings, all on `/`** — identical at baseline (see D4) | 0 capture, 1 drift |
| 11 | Scope/secrets diff audit | 16 files, all in mission scope; **0 secrets**; frozen files untouched | — |

Baseline-vs-head classification was done by re-running the failing specs and the drift pair on a fresh `1b766512` worktree — not inferred.

## E2E — the one true regression (D1) and the inherited rot (D3)

**D1 · `frontend/tests/e2e/library-borrow.e2e.ts:94, 111, 121` — A7 regression, CI-blocking.** The library rebuild retired `.badge` for `.r305rp-chip` (`LibraryPage.tsx:58-59`); the E2E journey still locates `bookCard.locator('.badge')` → «متاح»/«مستعار». **Passed at baseline `1b766512`, fails at `f7a9f99b`** (row locators `[aria-label="قائمة الكتب"] .pf-row` and `section[aria-label="استعاراتي النشطة"]` still resolve — the failure is exactly the chip class). CI runs this suite as a hard step (`ci.yml:211`), so the branch cannot push green until the parent re-points the three locators at `.r305rp-chip` (the Arabic label pins themselves need no change). The unit suite caught nothing because all six `r305a7-*-heron` files are new tests; this is precisely the gap E2E exists for.

**D3 · inherited at baseline (not A7):** `admin-confirm.e2e.ts:46` (both tests) waits for `.page-subtitle`, but the admin courses page renders its count through the r304 patterns `PageHeader` → `.pf-page-desc` (`AdminPages.tsx:1656`, `components/patterns/PageHeader.tsx:75`) — DOM snapshot shows the correct text «مقرّران في الجامعة» in a non-matching element. `student-dashboard.e2e.ts:48` pins the resume card as `li.pf-today-item`, but `DashboardPage.tsx:363/397` renders «أكمل من حيث توقفت» as a `dash-resume-eyebrow` span, not a TodayList row. Both reproduce byte-identically at `1b766512`; neither touches an A7 file. (Merge message at baseline claims "CI floors green" — reconcile with CI before pushing; here they fail deterministically at both SHAs.)

**Infra note:** the repo's pinned `playwright-core` 1.60.0 expects browser build **1223**; the sandbox cache shipped rev 1200 (global playwright 1.57.0) → first run failed all 28 tests in ~1ms (`browserType.launch: Executable doesn't exist`). Fixed by `npx playwright install chromium` (Chrome Headless Shell 148.0.7778.96, rev 1223, no repo changes). The suite itself needs no Postgres — the `e2e` project is hermetic (fixture transport per `playwright.config.ts` header), webServer self-starts Vite only.

## Parity export gate (D2) — inherited red, proven at baseline

`verify-parity-export.mjs` exits 1 with **76/190 token checks** at `f7a9f99b`. Re-running the same dependency-free script against a baseline snapshot of its three inputs (`tokens.css`, `unified-parity.css`, `shared-design-system.css` at `1b766512`) yields the **identical 76/190 and exit 1**. The divergence set (radius ladder −2px per rung, copper `#b57438` vs ultramarine `#2e45e6` accent era, warm neutral ramp, single-shadow elevation grammar) is the export sitting behind the r197/copper re-key of `tokens.css` — a repo-wide condition. All four gate inputs are untouched by this branch (`git diff --stat 1b766512..HEAD` on them is empty). AGENTS.md §4 documents the gate as 190/190; it is red before A7 starts. **Out of A7 scope** (tokens/parity pair frozen for this branch) — the parent should triage it as its own intentional re-key per the gate's own message («update the export AND this pin together»).

## Drift audit (item 10) — read-only run, no baseline promotion

`tests/audit/run-drift.ts` was inspected first: it **only reads** the committed `surface-baseline.json` (72 captures) plus a fresh `surface-inventory.json` and reports; it never writes a baseline (promotion is the separate `promote-baseline.ts`, not run). The capture artifacts are gitignored (`.gitignore:84-85`) — no tracked baseline touched. The CI `surface-drift` job was reproduced exactly: production build → `vite preview :4173` → `AUDIT_BASELINE=1 AUDIT_API_MOCK=1 AUDIT_BASELINE_SLICE=1 AUDIT_FCP_RATIO=4 npx playwright test tests/audit/surface-inventory.spec.ts` → `npx tsx tests/audit/run-drift.ts`.

- **At `f7a9f99b`:** 72 captures, **6 findings — `bundle-regression ×6`, all on `/`** (landing transfers 826,980 B > 800,000 B budget at every viewport/theme). With strict FCP (no `AUDIT_FCP_RATIO`), 2 additional `fcp-regression` findings on `/` dark (256/332ms vs 224ms baseline — the documented hardware-dependent axis).
- **At `1b766512` (same recipe, same machine):** identical 6 findings at 826,909 B — **100% inherited; the branch adds +71 B** of landing transfer and zero new findings.
- **Structural gap:** `BASELINE_ROUTES` (`routes.ts:165-181`) contains **no A7 surface** — `/student/library`, `/student/research`, the review page, `/document/:file` and `/student/ai` are invisible to the committed drift gate. Bringing them under the gate requires a mock-mode baseline promotion — explicitly out of this audit's mandate, flagged for the parent.

## Screenshot evidence

Captured by the item-10 CI-equivalent sweep into `frontend/tests/audit/screenshots/` (gitignored, untracked) — 12 files, all `1280-light`, one per committed baseline route:
`root-1280-light.png`, `auth-1280-light.png`, `auth-register-1280-light.png`, `404-1280-light.png`, `colleges-1280-light.png`, `student-dashboard-1280-light.png`, `student-courses-1280-light.png`, `student-courses-offeringId-1280-light.png`, `student-lectures-lectureId-1280-light.png`, `student-online-exams-1280-light.png`, `student-alerts-1280-light.png`, `student-calendar-1280-light.png`.
**None of these shows an A7 surface** (they are outside `BASELINE_ROUTES`) — the visual evidence for the Heron grammar itself (deep bands, chip wells, hitmarks, selbar, ledger rows, in real RTL × light/dark) remains **the parent's Task 6, pending**.

## Backend-dependent blockers (no Postgres in this sandbox)

Every check above ran DB-less by design (AGENTS.md §5.2). Unverified on live API round-trips: research upload→scan→grade lifecycle including the scan transition and reviewer attribution; library borrow/return against real `dueAt` and Arabic 409s; `POST /ai/chat` real-LLM envelope (`provider`/`model` attribution) and conversation list/delete; `/me/gaps` strip; PDF upload through the storage drivers (local/s3/postgres) and `files` gating; teacher review actions with governance guards. Unit suites cover these via mocks and pure decision functions, and the hermetic E2E drives library borrow + the AI journey against the fixture transport — but no live-DB golden path was exercised on this branch. The `test:integration` belt (12 files) was likewise out of reach.

## Honest untested items

Real-browser RTL light/dark rendering of the Heron grammar (jsdom has no layout — deep-band contrast, clamp behavior, well geometry, hitmark paint); the `:has()` selbar↔touch-hint mutual exclusion (CSS-asserted only); hover transitions and 44px coarse-pointer floors; live-region announcement timing in a real AT (library count, page-change status); Escape focus-restore under real disable-drops-focus semantics; `onProgress` with chunked/streamed responses; `document.getSelection` on exotic embeds; CI-runner parity for the 3 baseline E2E failures (deterministic selector rot here — timing/rot reconciliation with remote CI belongs to the parent).

## Coordination notes

1. **Library sort** still needs a backend `sort` param on `GET /library/books` first (`catalog.routes.ts` pins `orderBy: { title: 'asc' }`); until then the honest no-sort decision must stand — do not add a client-side sort over a paginated envelope.
2. **No CHANGELOG entry**, matching the sibling r305-a8 precedent (redesign round, not a functional round per `CONTRIBUTING.md`); AGENTS.md §8's CHANGELOG clause is arguably functional-round-scoped — parent should confirm and keep the precedent consistent.
3. **Fix D1 before push** — 3 locator updates in `library-borrow.e2e.ts` (`:94/:111/:121`, `.badge` → `.r305rp-chip`); label pins unchanged; then re-run the E2E project.
4. **D5 (process):** `frontend/tests/unit/ResearchReviewPage.test.tsx` is the branch's only pre-existing test edit (18 lines — two badge assertions re-targeted to `.r305rp-chip--gold/--warning`, behavior-preserving, labels kept). It is defensible (the pinned classes were retired by the same commit) but it breaks the branch-wide "Pins updated: NONE" pattern and was declared nowhere: the `4d9e083f` commit body is empty and the a7-teach agent has **no worklog entry (Task 3-b missing from worklog.md)**. Parent should either declare it or re-home the assertions into `r305a7-rev-heron.test.tsx`.
5. **D2/D4 are repo conditions, not A7 defects** — parity re-key and the `/` bundle budget (826.9 KB > 800 KB drift budget on the landing transfer) both predate the branch; schedule them as their own intentional changes.
6. **Drift coverage for A7 surfaces** needs a mock-mode baseline promotion (parent's call; explicitly not done here).
7. Browser-revision mismatch (project playwright 1.60.0 vs sandbox cache rev 1200) is an environment footgun worth a line in the onboarding docs — CI installs its own matching chromium so it is unaffected.

## Post-audit parent verification (Task 6) — browser evidence + one blocking defect

**D1 (QA) fixed:** `library-borrow.e2e.ts` re-pointed to `.r305rp-chip` (`:94/:111/:121`); the file re-ran green (1/1, 3.7s).

**New blocking defect found and fixed — the scoped sheet parsed to ZERO rules in a real browser:**
- Symptom (live-DOM probe on `/student/research`): `.r305rp-res-band` computed `background-color: rgba(0,0,0,0)`, radius 0, and the sheet's `<style>` node held the full 48,616-char text yet `cssRules.length === 0`; `CSSStyleSheet.replaceSync(sheetText)` → 0 rules. jsdom never parses CSS, so the whole unit suite (2181/2181) was blind to it; the grep-based design gates were blind to it; the production build embedded the text verbatim, so the bundle check was blind too.
- Root cause: the shared scaffold header (inherited from the R305-A5 sheet's prose) contained literal `*/` sequences inside the comment — `var(--fs-*/--r-*/--sp-*)` (:54) and `--t-*/--motion-*` (:58). The first `*/` terminated the header comment early; the stray token soup ran to `@layer pages {`, which the parser then consumed as the block of one bogus top-level qualified rule and dropped — the entire sheet, every section, all five pages.
- Fix: reworded the two header lines (`--fs-*, --r-* and --sp-* families` / `the --t-* and --motion-* tokens`); repo-wide scan confirms no other mid-comment `*/`. Re-probe: `cssRules.length = 1` (the `@layer pages` block), deep band computes `rgb(25, 25, 24)` in light theme.
- Note for upstream: **`r305-student.css` on `redesign/r305-heron-student` carries the identical latent defect** (same prose at its :30/:33) — it has never been imported by any page, which is why it went undetected; fix before wiring it.

**Re-verification after the fix (all real outputs):** 4 design gates green (raw-css strict 0/0/0) · full FE suite **2181/2181** (194 files) · FE build green · bundle **886.4/900 KB gz** (entry 71.4, pdf 95.7) · lint 0 errors.

**Real-browser evidence (19 captures, isolated fixture PDF + the repo's own DB-less mock transport, untracked harness removed after capture):** `/home/z/r305a7-shots/01–19-*.png` — library (light/dark/mobile + in-page Arabic search probe «البرمجه»), student research (light/dark/mobile: copper submission rail, deep-band KPI register, pipeline timeline, status chips with dots+labels), teacher review (light/dark: deep-band workspace head, scan meters with honest «تخبرية فقط» note, triage queue with copper selection rail), PDF reader (light/dark: real pdf.js render of the 3-page fixture, toolbar, page nav «صفحة 1 من 3», zoom, **search with hitmarks + counter + auto-jump verified interactively**, honest empty-notes panel, mobile stacked toolbar + floating notes trigger), AI assistant (light/dark/mobile: deep-band status head with engine/config chips, ledger with role micro-labels, honest error panel with support-code chip + real retry, composer rail). Inconclusive: selection→note-bar via synthetic mouse drag (flow is unit-pinned in `r305a7-pdf-heron`); live AT announcements.
