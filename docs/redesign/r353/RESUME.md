# R353 — session record (simplify the product, exact Libyan roles, world-class search, working AI chat + push, APK-only)

Base: `c89f80fd` → this session's HEAD. Owner P0s: (1) too much text everywhere, (2) search must be comprehensive/fast/accurate, (3) exact Libyan-education roles, (4) post-login overlaps + AI chat clipping, (5) mobile push dead, (6) APK-only Android, (7) Gemini+Groq AI chain. Chat replies to owner: Arabic. Code/commits/docs: English.

## What landed (chronological, evidence per claim)

### 0. Production build restored (the first push)
- `be1365c3` (E2/E3, prior session) failed the Vercel build: TS6133 unused imports in `backend/src/lib/__tests__/roleLabels.test.ts` — deployment `dpl_2TjDWTaneGijwFsDm2uyY1B4QcL2` ERROR. Fixed in `0060fd10` by USING the imports (the extracted source map must equal the imported runtime map + the Prisma enum — a stronger zero-drift lock). Verified: backend `tsc -p tsconfig.json` exit 0, roleLabels tests 8/8, deploy READY.
- CI red on main since `be1365c3` (typecheck:tests — TS2698 spread-of-never in `permissions-access.test.ts`): fixed `56dd95d8`. Verified: `tsc --noEmit -p tsconfig.test.json` exit 0, 22/22 tests.

### 1. The buildId saga (fully root-caused, 3 layers + a rename)
Symptom: `/api/v1/status` reported `03717fca8b92` (an R352 sha) across three R353 deploys.
- Root cause 1: a project-level `RENDER_GIT_COMMIT` env var synced at release time shadowed every deploy (and `VERCEL_GIT_COMMIT_SHA` is build-time only, not runtime). Deleted from the Vercel project.
- Root cause 2 (the real one): `status.routes.ts:23` had its OWN boot-frozen `buildIdFromEnv(env.RENDER_GIT_COMMIT ?? env.GIT_SHA)` — a SECOND computation nobody updated. `/api/v1/health` (app.ts) was correct all along once the bake existed.
- Fix: `backend/scripts/bake-build-sha.mjs` bakes the deployment sha at BUILD time into three layers — (1) `src/lib/build-sha.generated.ts` (tsc constant), (2) `api/build-sha.json` (runtime-read by the function entry → `process.env.GIT_SHA`), (3) `frontend/public/build-sha.txt` (CDN asset at `/build-sha.txt`). `resolveBuildId()` prefers baked, then the env chain, then `local-dev`. The function entry renamed `api/index.mjs` → `api/main.mjs` (fresh function identity after the cache confusion; vercel.json updated).
- Live proof (final): `/api/v1/status` buildId = `1f81915ff258` = main HEAD; `/build-sha.txt` = same; `aiMode: chain`.
- Lesson recorded in the file headers: `git checkout -- <path>` cannot restore an UNTRACKED file (the accidental baked-sha commit `63cbf144`, reverted in `1f81915f`).

### 2. LANE F — the search engine (merged, `c03c5e44`..`29b7480c`)
- Reverse-fold fetch arms: «احمد» now finds stored «أحمد» (hamza/ta-marbuta/ya variants both directions, per-word), ال-clitic arms (الشبكات finds شبكات الحاسوب). `planGlobalQuery` variants pinned by tests.
- Exact-key fast paths: `universityId` (the registrar's #1 lookup — was MISSING), email, course-code exact; Arabic-Indic digits ٠-٩ folded before every arm («٣٠١» finds «301»).
- Faculty scoping (E5-P0): a مسجل الكلية (scopeFacultyId) no longer sees the whole institution's roster in people search; phone fields seat to ADMIN/OWNER only (byte-pinned).
- Latency: the two sequential facts queries parallelized (−1-2 cross-region RTTs).
- UI: web (pill + command palette) AND mobile now ride `/search/discover` — 15 typed categories, role-filtered, 300ms debounce, abortable, 1-line rows.
- Eval: golden set 352 → **763 realistic queries** (student numbers, phones, emails, typos, name-order, hamza shapes) + a FETCH-recall gate (the rank-stage-only blind spot is closed). Metrics: R@5 0.983→**0.9908**, MRR 0.9467→**0.9613**, fetchRecall **1.000** (old engine on the new set: 0.587 — the witness).
- Not done (deliberate, documented): pgvector semantic rerank (installable on the Neon plan but unjustified at this data scale — 28 users, 22MB); FTS/tsvector (trgm+tiers covers the ≤120-char contract).

### 3. LANE C — the AI chain + chat parity (merged, `962f7f19`..`a1bdecf6` + `efb260b4`)
- `AI_PROVIDERS` ordered chain: gemini → groq → openrouter → legacy → local composer. Config from `AI_PROVIDERS` JSON or individual keys (`GEMINI_API_KEY`+`AI_GEMINI_MODELS`, `GROQ_API_KEY`+`AI_GROQ_MODELS`, `OPENROUTER_API_KEY`+`AI_OPENROUTER_MODELS`); legacy `AI_*` rides as the last entry. Fail-open: no keys = local composer, never a boot crash.
- One OpenAI-compatible adapter; per-provider circuit breaker (3 consecutive failures → 60s jittered cooldown → half-open probe); total turn budget 50s (Vercel Hobby 60s cap); per-vendor timeouts (gemini 25s / groq 15s / openrouter 20s); OpenRouter's `models[]` quirk stays gated.
- `AiTelemetry.provider` column (additive migration) — which provider+model actually answered; `/ai/config` reports the chain summary (no secrets); `/status` `aiMode: chain` when ≥2 providers.
- Exam-leak guard (C3): mid-exam RAG excludes checkpoint question/explanation chunks + the prompt states exam integrity. Found by audit: `knowledge/reindex` indexes checkpoint answers verbatim — a student mid-exam could retrieve them.
- Web citations parity: «المصادر» block under grounded replies (mobile had it, web didn't). The transcript-scroller contract (R353 C1) holds — pinned by the auto-scroll tests.
- Keys: GEMINI_API_KEY + GROQ_API_KEY pushed to Vercel env (production + preview). **Could NOT be validated from this sandbox** (geo-blocked: Groq 403 Forbidden, Gemini FAILED_PRECONDITION "location not supported") — the chain is fully covered by local mock-provider tests; the live table must be produced from Vercel/the owner's machine (see open items).

### 4. LANE E4 — onboarding greets the exact seat (merged, `8e1ac9c0`)
- Frame 4 keyed by (role, staffRole, position): المسجل العام، مسجل الكلية، مراقب الامتحانات، موظف الجودة، أستاذ، رئيس قسم، عميد، وكيل كلية، طالب، مالك المنصة — titles built from the canonical label stores (no re-hardcoding). 21/21 tests.
- RegisterPage leadership paragraph → one line.

### 5. LANE P2 — the copy diet (wave 1 merged; wave 2 in flight)
- The gate: `scripts/gates/copy-budget.mjs` + `docs/QA/copy-budget.json` ratchet (page → max Arabic words; the ratchet only moves DOWN) wired into `verify.sh` step 3.7 AND ci.yml. Baseline measured: **21,504 Arabic words** across 76 pages.
- Wave 1 (merged): 21,504 → 19,646 (−8.6%), all enforced pages under ceiling.
- Wave 2 (this session, `wip/r353-copy2`): teacher cluster done (ExamAuthorPages 1261→795); admin/quality/exams/public/student clusters running. Target: ≥40% on logged-in pages.
- Rules enforced by the gate: title ≤4 words; subtitle ≤12 or none; no paragraph >2 lines; empty state 1 line + 1 button; buttons verb ≤2 words; no marketing in-app.

### 6. LANE R3 — mobile polish (merged, `ca9e5d3b`..`1f7fa0b8`)
- Safe areas: MessagesUI header clears the status bar (`Math.max(insets.top, 16)`); the legacy `surfaces.Sheet` clears the gesture bar (paddingBottom insets.bottom — covers ~25 screens).
- `eas.json` production `app-bundle` → **apk** (the raw-gradle CI was already APK-only; EAS now matches).
- Font-scale caps: 28 caps across the 5 worst truncating files (titles 1.3, body 1.5, chrome 1.25 per TabBar precedent).
- 6 input-heavy legacy sheets migrated to AppSheet + SheetTextInput (homework submit, community composer + study-room, teacher bio, admin course CRUD + offering).
- select-institution logout now unregisters push devices. Mobile jest 1222→1228 green; worklet audit 0 violations.

### 7. LANE N — push (in flight, `wip/r353-n-push`)
- Root causes (verified live): NO FCM v1 credentials on the Expo project (`androidFcm: null` via the Expo GraphQL API), no google-services.json anywhere, AND `PUSH_ENABLED` defaulted false with the client swallowing token failures.
- Shipping without Firebase: NotificationPreference model + `/me/push-preferences`, receipts processing + dead-token pruning + collapse keys, PUSH_ENABLED default true, assignment-due reminders also create Notification rows, mobile honest-failure UX + cold-start deep link + badge clear. `docs/PUSH-FIREBASE-CHECKLIST.md` (Arabic) = the ONE owner checklist.
- BLOCKED on the owner: Firebase project + `ly.madarek.mobile` app + google-services.json + service-account JSON → then we upload FCM v1 to EAS, add `googleServicesFile`, rebuild.

### 8. LANE P1 — the page ledger + the crawl harness (this session)
- `scripts/qa/overlap.mjs` grew `--seed student|teacher|registrar|quality|owner`: hermetic per-role crawl (esbuild-bundles the e2e mock transport, installs the mock API + seeds the role session + a per-role `/auth/me` override — the pages-*.mjs method, no backend needed).
- Calibration: `.sr-only` never counts as clipped (deliberate a11y hiding); `header.topbar` allowlisted for big-fixed (the AppShell's own chrome, written reason in overlap-allow.json).
- Full crawl: public + 5 roles × 5 widths (360/390/768/1024/1440) × light/dark → `docs/QA/page-ledger.md` (results below when the crawl lands).

### 9. LANE C4 — the AI eval harness (`wip/r353-ai-eval`)
- **96 golden Arabic cases** (target ≥80): A curriculum Q&A 20, B student-context 12, C leakage/jailbreak 16, D role boundaries 10, E hallucination traps 18, F Arabic-quality shapes 20. **42 scored offline** (the local composer + guards — CI-ratcheted), 54 live-only (the golden-run runner, exit-2 BLOCKED without creds — the ai-eval-live convention).
- The deterministic AI seams (composer, guards, prompt builders) exported and pinned; 11/11 suite green.

### 10. The completion session (2026-11-15, commits 7268672..2ecba74+)
**CI red → green (three onion layers):**
- `7268672` — parity gate RETIRES (the export pair was deliberately deleted in P4; the script now exits 0 with a loud message, re-activates if the pair returns) + 3 E2E realignments (copy-diet dialog texts) + ai.css gap token. CI on 9e6ccfe had: parity ENOENT, admin-confirm, quality-moderation ×2.
- `0ddf853` — the gates the parity fix unmasked: RegisterPage note joins the one-term law («مالك المنصة»), r305 vision assertion rides the diet copy. rename-ledger + all 8 design gates PASS.
- `99dfe80` — **deploy-vercel.yml rebuilt on reality**: every recent production deployment was created by the Vercel GitHub integration (proof: one READY deployment per sha incl. shas whose workflow died pre-deploy); the workflow's pin step 404'd since RENDER_GIT_COMMIT was deleted (obsolete — the bake works). Now: CI-wait → poll /health until buildId == sha → live smoke. No double deploy.
- `2ecba74` merge family — R354's V2/V3 integrated (selftest route + the richer Firebase checklist won the add/add), lint touch-up (`_lifecycleSchema`).

**LANE N — the whole lane landed (backend `d63df6a`-family + mobile):**
- Backend: receipts processing + dead-token pruning via receipt errors, NotificationPreference += pushEnabled/quietStart/quietEnd (migration `20261116090000_r353_n_push_prefs`, additive, applied by the deploy — pre-migration backup: NotificationPreference was EMPTY, 46-migration ledger recorded), GET/PUT /me/push-preferences, quiet hours [start,end) UTC with wrap-around (pure isQuietHour, branch-pinned), PUSH_ENABLED default true, the reminder sweep now writes bell rows + pushes (it was mail-ONLY), collapseId + subtitle + stable data.link. 61/61 new/adjacent tests; backend 2537 passed on the merged tree.
- Mobile: channels-before-ask (alerts=HIGH+sound+PUBLIC, default=DEFAULT fallback — Android 8+ auto-creation would bake silent settings exactly when FCM lands), honest registration outcomes (granted-but-unregistered → retry card; OS denial → one line + open-settings button), guarded deep links (cold-start parked → entry routers consume via resolveEntryDestination; warm tap routes/parks), badge law (inbox open = eraser, foreground re-clear), foreground presentation unmuted. 22 new tests; mobile 1250 passed.
- **The push truth (R354 V3 ratified + this session's evidence)**: Android pushes remain BLOCKED on FCM v1 credentials — the ONE owner page is docs/PUSH-FIREBASE-CHECKLIST.md (Arabic, ~15 min). Everything else ships.

**LANE P1 — the page ledger COMPLETED (`d71969b`):**
- **110 route-crawls** (public 28 incl. the 5 headline surfaces at the FULL 5 widths, student 36, teacher 19, admin/registrar 14, quality 10, owner 13) × light+dark, hermetic per-role seeds, 981 evidence screenshots → `docs/QA/page-ledger.md`.
- **Verdict: ZERO overlaps/clips/horizontal-scroll on every crawled page, every role, every width.** The ONE real defect (landing anno-2 title kissing the plan's «المكتبة والبحوث» label at 1024×768) FIXED in journey.css (the 992-1439 band moves anno-2 down one rung; the conformance spec skips annotation geometry) and re-verified clean at all 5 widths × both themes.
- 4 probe false-positive classes closed in the probe (closed `<details>` phantoms ×1266 on /help, sr-only/visually-hidden in the text set, 2 more), 3 intentional-chrome allowlist entries with written reasons (8 total).

**LANE C4 live — the provider table (48 golden turns through production):**
- `scripts/qa/ai-eval-prod.mjs` + `docs/redesign/r353/AI-EVAL-LIVE.md`: gemini-2.5-flash WORKS from Vercel (16 turns, ~5.4s avg, best Arabic) — **the owner's unusual-shape key is VALID; NO new key needed**. Gemini free-tier 429s under load → breaker → chain walks (as designed). OpenRouter free 50/day wall. 12/12 hallucination traps refused politely across both arms. Local composer: honest terminal fallback, always answers.
- **The Groq mystery CLOSED (R354 V2 selftest + this session)**: the key is VALID (models list 200 from inside the production function) — `llama-3.3-70b-versatile` is DECOMMISSIONED (404). Fixed: `AI_GROQ_MODELS=openai/gpt-oss-20b,qwen/qwen3.8-27b` set on Vercel (production+preview) — live ids from the selftest's own sample. The legacy `AI_MODELS` dead slug (`nvidia/nemotron-3-super-120b-a12b:free` → 404) also removed (REST-API patched after a CLI-stdin corruption was caught and repaired).

## Verification summary (this session's gates)
- `verify.sh --fast`: PASS on the merged main (frontend tsc + vitest 3072 + bundle 768.5/774 KB + CSS ratchet + identity + brand + copy-budget).
- Backend full suite: **2537 passed | 19 skipped** (129 files + the DB-gated contract suite) on the merged tree.
- Mobile jest: **1250 passed** (49 suites).
- Production: buildId = HEAD, `aiMode: chain`, db ok, migration applied.

## Open items (owner actions first)
1. **Firebase checklist** (push on Android): the ONE page — docs/PUSH-FIREBASE-CHECKLIST.md. ~15 minutes in the Firebase console; then we do the EAS upload + rebuild + emulator proof.
2. ~~A fresh Gemini key~~ CLOSED — the key is valid from production (16 live turns + the R354 selftest from fra1). Groq: key valid, models fixed (live ids now set).
3. Copy wave 2: enforced at −8.7% (19,637 Arabic words vs 21,504 baseline); the ratchet protects every cut. The ≥40% target stays open for the next diet wave.
4. ~~The full P1 ledger~~ COMPLETED — docs/QA/page-ledger.md (110 crawls, zero defects).
5. Param-route fixtures for the ledger's 13 unresolved detail routes (honest 501 states today).
6. R352 carry-over queue (lane G accounts, remaining A, W/T/V/Q, Z alias) — untouched this round by priority.
