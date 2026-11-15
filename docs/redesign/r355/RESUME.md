# R355 — RESUME (the master record)

Agent: DeepSeek v4.1 (the R355 hand-off brief). Session start: main = `2c763f9c`.
Session end: main = `103a0897` (all evidence below names its SHA/run).
Owner-facing summary: the Arabic final report (§J of the brief) — this file is the evidence.

## 0. Environment truth (decisions recorded per §C.1)

- The sandbox reaches github.com / api.vercel.com / the live site / Neon / Resend / Expo — BUT Groq answers `403 Forbidden` at the edge (IP-range block) and Gemini is geo-flaky. Live provider checks therefore run from GitHub Actions runners (the R354 pattern): `ai-selftest.yml` (through the production function) + the new `ai-eval-live.yml` (direct, repo secrets).
- One display-layer hazard cost real debugging time and is recorded so the next agent does not repeat it: **the tool output pipeline eats ANSI-like `[m` sequences**. `[main]` displays as `ain]`, `TIER_LABEL[me.x]` as `TIER_LABELe.x]`. `od -c` / `base64` / python-repr are the immune views; never "fix" a `[m`-looking corruption without byte-level proof (the `branches: [main]` filter was NEVER corrupted — the display lied twice).
- Sub-agent launches are unreliable at high parallelism (9 simultaneous → all timed out on REPORT while their edits landed — the working tree carried their half-finished work). Recovery: verify everything centrally (tsc + suites), reconcile, and re-dispatch in smaller batches (4 parallel worked).

## 1. LANE A — the Android release outage (P0) — CLOSED

**Root cause (proven from run 43712478604's publish log, not theorized):** the R353 R1 purge in
`scripts/ci/publish-rolling-release.sh` built its keep-list from the FILE PATHS it was handed
(`verified/Madarek.apk`) and compared them (`grep -qxF`) against asset BASENAMES (`Madarek.apk`).
Nothing matched → every freshly uploaded asset was purged as "stale" → `android-latest` AND
`sidestore-latest` left with zero assets while the publish job stayed green. The log lines:

```
==> Uploading 4 asset(s) with --clobber
    purge stale asset: build-info.json (not in this build's upload list)
    purge stale asset: Madarek.apk (not in this build's upload list)
    purge stale asset: SHA256SUMS.txt (not in this build's upload list)
    purge stale asset: verify.json (not in this build's upload list)
RELEASE_URL=… {"assets":[],…}
```

**The fix (commit `9537102a`)** — the publish law, now encoded:
upload → **verify the upload landed** (every expected basename present, non-zero size — fail HERE,
before pruning, while the old assets still exist) → prune stale by BASENAME (retried, loud) →
**final assertion** (the release ends with EXACTLY this build's assets or exit non-zero).
`scripts/ci/publish-rolling-release.test.sh`: 10 hermetic assertions (stubbed `gh`, no network)
covering upload-before-prune ordering, the basename rule, the outage shape (silent no-op upload),
the failed-upload path (prune never runs), the size-0 guard. Run against the PRE-FIX script it
reproduces the outage (`final assets: []`); against the fix: ALL GREEN. Wired into `ci.yml`
(release-scripts job) + `verify.sh --fast` (step 3.8).

**Concurrency (commit `d9fe495f`)**: `cancel-in-progress` was push-true on both release
workflows — a newer push could kill a run inside the publish window (runs 43711103347 /
43700296707 were cancelled exactly this way). Now `false` on ALL events (queue, never cancel).
`release-freshness.yml`: an EMPTY release (or missing binary) is an OUTAGE → the nightly watch
exits RED; the issue-net stays for stale-commit only.

**Acceptance evidence (all on record):**
- run 43737995185 (9537102a): all four jobs success — build, verify, emulator smoke (pass),
  publish. `android-latest` now: `Madarek.apk` 59,063,480 B + `build-info.json` +
  `SHA256SUMS.txt` + `verify.json`.
- Download proof: HTTP 200, 59,063,480 bytes in 10.7s; `unzip -l` = valid APK (1,680 entries);
  sha256 `76ebea2f…` == SHA256SUMS.txt.
- `build-info.json.commit == main HEAD` (`9537102a1f60…`, smoke pass, verified, release-signed).
- `sidestore-latest` repopulated by run 43744747755 (d9fe495f): `Madarek.ipa` + build-info +
  SHA256SUMS.
- The /app page already degrades honestly when build-info is unreadable (verified in
  `AppDownloadPage.tsx`); the primary CTA is the stable `android-latest` asset URL.

## 2. LANE C — the AI brain — CLOSED (groq ✅, routing tuned from live numbers)

- **Code default fixed** (`6ebb8379`): `providers.ts` still defaulted groq to the decommissioned
  `llama-3.3-70b-versatile`. Now the live gpt-oss family; `AI_GROQ_MODELS` on Vercel re-patched
  (production+preview) in the same window; `docs/06-configuration.md` synced.
- **Self-test proof** (run 43751966513, through the production function): gemini models+completion
  200; **groq modelsList 200 (196ms, 11 models) + completion 200 (124ms, openai/gpt-oss-20b)**;
  openrouter modelsList 200 (completion = free-tier daily quota, documented tertiary).
- **The 54-case live-only golden set materialized + run** (`6ebb8379` + `103a0897`):
  `scripts/qa/ai-eval-providers.mjs` (16 leakage/jailbreak, 10 role-boundary, 18 hallucination
  traps, 6 short curriculum, 2 context, 2 Arabic-quality — deterministic checks) fired at each
  provider arm directly from a GitHub runner (run 43751968730):

  | arm | answered | check pass | avg | p95 |
  |---|---:|---:|---:|---:|
  | gemini-2.5-flash | 4/54 (free-tier RPM) | 100% | 1239ms | 1515ms |
  | groq/gpt-oss-20b | 50/54 | 84.0% | 479ms | 1078ms |
  | groq/gpt-oss-120b | 54/54 | 92.6% | 726ms | 1801ms |

  Per-category (120b): leak 16/16, role 10/10, traps 14/18, curriculum 6/6.
- **Routing tuned from the numbers** (`103a0897`): within-provider order flips to **120b-first**
  (accuracy wins, still fast); gemini stays primary (Arabic quality + grounding; its quota is the
  chain ceiling, as R353 documented); openrouter tertiary.
- Chat clip/scroll behavior: the R354 fix is on main and covered by tests (verified in the
  AiAssistantPage suites during reconciliation) — no regression found.

## 3. LANE P — the copy diet — TARGET CROSSED

**21,504 → 12,753 Arabic words = −40.7%** (target ≥ 40 %, ≈ ≤ 12,900). Commit `e83a3da6`
(122 files) + the reconciliation commit `b81c3768`.

- Biggest cuts (before → after): LegalPages 1309→848 (bulletized, deduped, legal substance +
  all nine links intact), ExamAuthorPages 1261→707, TeacherPages 974→589, AdminPages 886→470,
  QualityPages 681→396, MorePages 660→410, OnlineExamsPages 543→405, AiAssistantPage 473→244,
  + 54 more pages at their landed counts (the per-page table is `docs/QA/copy-budget.json` —
  every ceiling now sits at the measured count, ratchet only moves down).
- Side effect: bundle 768.5 → **745.6 KB gz** (the diet removed real bytes).
- **Mobile copy ratchet EXISTS** (`26fba1da`): `scripts/gates/copy-budget-mobile.mjs` — the same
  lexer law over `apps/mobile/app/**` + `apps/mobile/src/**` (174 screens, 13,056 words censused,
  ceilings at current counts, `--census` bootstrap for future diet waves). Wired into CI
  design-gates + `verify.sh --fast` (step 3.75). First law: NO GROWTH.
- Tests reconciled deliberately: 3,072/3,072 frontend unit tests green; e2e: 149 passed / 0
  failed (six specs re-pinned to the surviving copy; two cut-explainer expectations removed
  inline with `// R355 copy diet` comments — no test deleted, no assertion weakened). The drift
  baseline re-captured + promoted (72 captures, clean under CI's documented FCP headroom); the
  emoji-placeholder regression the diet introduced was caught by the icon gate and fixed.
- **Ledger re-run after the cuts**: the hermetic page-ledger class (route crawl × roles × widths)
  is the CI conform-gate + overlap jobs — both green on `103a0897`'s CI run. The real-app ledger
  sweep on an emulator + fixtures for the 17 param routes: NOT re-run this session (needs the
  emulator soak block) — recorded as the next session's first P-item, honestly UNVERIFIED
  post-diet beyond the CI hermetic gates.

## 4. LANE E — roles proven end-to-end — CLOSED (the exhaustive belt)

Commit `7f89903d`: `backend/tests/modules/r355-routes-permissions-exhaustive.test.ts` —
28 tests, all green; full backend suite 2,565 passed; tsc clean.

- **A. The inventory**: a source scanner (comment/string-aware tokenizer — apostrophes in English
  comments must not desync arg extraction; path-scoped `router.use` handled; module routers with
  named receivers; app-level declarations) enumerates every route with its EFFECTIVE gate.
  Every route must be GATED / OPTIONAL / or in the documented PUBLIC allowlist (each public
  entry says WHY: svix-signed webhooks, RFC 8058 unsubscribe, dev-only mail preview,
  CRON_SECRET probes, the service-token milestone hook…).
- **B. The matrix map**: every gated route maps to a `shared/permissions-matrix.ts` resource
  (specific-before-generic, ~70 real path families) or documented SELF-service; phantom entries
  and dead matrix rows both fail.
- **C. The behavioral matrix**: one representative route per DISTINCT gate signature, fired live
  with a signed token per role: disallowed → 401/403 never 2xx; allowed → the guard's 403 copy
  never fires; anonymous → 401. Capabilities resolve through `DEFAULT_ROLE_CAPABILITIES`.
- Found + mapped along the way (previously undocumented): library loans, mooc, jobs, community
  posts, labs/AR, notifications, field-definitions, client-error review, the
  `/owner/institutions` console.
- Seat-level scoping (dean vs department-head vs college-registrar) is enforced by
  `assertOfferingAccess` / `buildScopedUserWhere` — covered by the existing scope suites
  (enrollments-scope, permissions-access) + the frontend matrix test's overlap detector with
  documented equivalence notes. `enum Role` stays coarse (authN) with precision in
  staffRole/position — now PROVABLE, per the brief.
- E4 (per-seat demo users + scripted day-in-the-life e2e): the demo-dataset work of §I will
  carry it (the seats and seed accounts exist); recorded as next-phase, not silently skipped.

## 5. LANE B — production truth

- main `103a0897`: CI / Size / deadcode / Deploy / Android / iOS all green (the e83a3da6 red —
  icon gate + drift + e2e pins — was root-caused and reconciled in `b81c3768`; the rerun on
  `103a0897` is the green proof).
- `/api/v1/health`: `{"ok":true,"buildId":"d9fe495f0403","env":"production"}` — buildId == the
  then-HEAD; the post-103a0897 deploy re-verifies on its own run.
- Branches: only `main` + `gh-pages` (kept — config mirror) — the sweep was already done.
- The `verify.sh --fast` local gates all green before every push (release regression, copy
  budget, mobile budget, bundle, css, identity, brand).

## 6. What remains open (owner-only §G + honest leftovers)

1. **Firebase files** for Android push (google-services.json + service-account JSON) —
   `docs/PUSH-FIREBASE-CHECKLIST.md` stays the top item; the in-app center + polling fallback
   shipped (PUSH_ENABLED=true).
2. **Mail domain DNS** (Lane M): Resend key verified from production; `docs/MAIL.md` documents
   the exact SPF/DKIM/DMARC records for the chosen domain; a test send needs the owner's
   domain decision (the From on the verified resend domain works today — recorded in HOSTING).
3. **Uncertain roles table** (E1) — see §7 below; needs owner confirmations.
4. Leftovers recorded honestly: the real-app/emulator ledger sweep post-diet (§3), E4
   day-in-the-life scripts (§4), §I demo-dataset/UAT/soak/lighthouse phases (next phase by
   design — §I starts "only after §H is green").

## 7. The uncertain-roles table (E1 — for the owner)

Reviewed against `docs/ROLES-LIBYA.md` (built from the Libyan ministries' published structure)
and the live matrix:

| seat | assumption on main today | what to confirm |
|---|---|---|
| المسجل العام (ADMIN+REGISTRAR_GENERAL) | institution-wide registrar; grades visible, never writable | does the general registrar also mint college-registrar accounts, or is that owner-only? |
| مسجل الكلية (ADMIN+COLLEGE_REGISTRAR) | scopeFacultyId narrows every roster/list | are college registrars appointed per college or per department in the target university? |
| وكيل الكلية (TEACHER+ASSOCIATE_DEAN) | identical platform powers to the dean (documented equivalence) | the exam-cycle supervision split becomes an approval workflow when results sign-off ships — confirm the vice dean owns exam committees |
| مراقب الامتحانات (QUALITY+EXAMS_CONTROLLER) | owns exam-moderation (EXAMS_MODERATE grant) | confirm the seat sits in قسم الدراسة والامتحانات, not the quality office, in the pilot university |
| موظف الجودة (QUALITY+QUALITY_OFFICER) | read + report only, no control | any pilot-specific reporting duty (ministry templates)? |
| ولي أمر (guardian) | NOT a seat on main (no guardian role in enum) | the brief names it in leakage tests — confirm whether the pilot needs guardian accounts or parent-contact fields suffice |

## 8. Decision log (short)

- Publish law: upload→verify-landed→prune→assert; serialize publishes; fail loudly on empty.
- Copy: ratchet ceilings = measured counts (only down); mobile gate born with a census.
- AI: gemini primary; groq 120b-first (evidence above); openrouter tertiary.
- The 25-universities idea stays deleted (identity guard CLEAN, 2,000 files).
- Render stays suspended (untouched); Vercel remains the single deployment.
