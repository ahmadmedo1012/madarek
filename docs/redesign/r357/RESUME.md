# R357 — RESUME (the master record)

Agent: main agent, R357 delta brief (finish R356's remaining lanes, then university-demo
readiness). Session start: main = `dce338aa`. Rules carry over from R355/R356: evidence over
claims (command + real output / run URL); unverified = UNVERIFIED; small Conventional Commits;
`bash scripts/verify.sh --fast` before every push; ONE push at a time, wait for that SHA's CI;
never force-push main; never weaken tests/ratchets; Groq/Gemini/Expo live checks ride GitHub
workflows (the sandbox edge-blocks them); display eats `` sequences — verify bytes with
`od -c` before "fixing" anything that looks corrupted.

Scope note: lane 2d (visual polish/menus) moved to the UI agent (`wip/r357-ui`); main agent
does not touch CSS/layout/tokens — visual findings go to `docs/redesign/r357/UI-FINDINGS.md`.

## LANE 1 — pipeline hygiene

### 1.1 The Deploy Vercel red-on-stacked-pushes defect (root cause)

`ci.yml` triggers on EVERY push with `concurrency: CI-<ref>, cancel-in-progress: true`.
`deploy-vercel.yml` triggers only on code paths — so a docs-only main push (no Deploy Vercel
run of its own) CANCELS the previous code sha's CI run, and the old verify gate matched
`completed cancelled` as "concluded without success" → the previous sha's Deploy Vercel went
red while its git-integration deploy was perfectly fine. Reds observed by the R357 review on
`c83f6d67`, `600c943a`, `aa7cb126`.

### 1.2 The fix (commit `<SHA>`, this session)

- `scripts/qa/await-ci.mjs` (+ `await-ci.d.mts`, fixtures `scripts/qa/fixtures/await-ci/`):
  the law as a pure `decide()` — cancelled runs are not conclusions; a sha superseded on
  main (push events on main only — PRs and non-main branches never are) exits green with a
  `::notice::`; otherwise the latest non-cancelled CI run decides (failure stays red).
- `frontend/tests/unit/r357-await-ci.test.ts`: 8 decide() cases + 5 CLI dry-run cases —
  including the exact red scenarios above (failing-before by construction: the old inline
  jq loop had no code path that could return superseded/pass for a cancelled latest run).
- `.github/workflows/deploy-vercel.yml`: verify job now calls the script; the buildId wait is
  supersede-tolerant (accepts this sha's deployment OR the current main tip's — main only
  moves forward, so that deployment contains this push as an ancestor); the smoke always
  proves the LIVE production build.
- Local proof before push: `bash scripts/verify.sh --fast` (tsc + vitest + bundle gate).

(evidence: run URLs for the fix SHA — filled in §1.4 once CI concludes)

### 1.3 Audit: the last 5 main SHAs (Deploy Vercel + Deploy smoke, green or superseded)

Command: `actions/runs?head_sha=<full>` filtered to CI / Deploy Vercel / Deploy smoke / Size gate / deadcode (2026-11-16, this session):

- `dce338aa` (docs, tip): CI **success** (run 43798314304), Size gate success, deadcode success. No Deploy Vercel run (docs-only push — correct, its paths never fire). No Deploy smoke run (no backend change — correct). → GREEN.
- `aa7cb126` (qa): CI **cancelled** — all 11 jobs cancelled (run 43798283494) by the `dce338aa` push (per-ref concurrency). Deploy Vercel **failure** (run 43798283486) — THE defect: the old gate read the cancel as "concluded without success". Classification: **superseded**; the deploy itself was fine (buildId reached dce338aa). Fixed for the future by this commit (the gate would now exit green with a `::notice::`).
- `600c943a` (merge PR #48): CI **failure** — job `Design gates` failed (run 43783905685). Deploy Vercel failure (run 43783905711) — a TRUE red, not a stacking artifact; repaired by `aa7cb126` (proven green via `dce338aa`'s CI — same tree + docs-only). History stays red: correct.
- `78af1edd` (docs on the PR branch, pushed as a batch tip): CI failure ×2 runs (Design gates, runs 43782839623/43782846183), Deploy Vercel cancelled (43782846131, stacked) — true-red CI, repaired later. `6500775f` never fired a run (non-tip batch commit).
- Deploy smoke: zero runs on all five (no `backend/**` change — its paths never fire). Nothing to classify.

### 1.4 buildId == HEAD on production (live, this session)

```
$ curl -s https://madarek-nine.vercel.app/api/v1/health | jq -c '{ok,buildId}'
{"ok":true,"buildId":"dce338aaffba","version":null}
$ curl -s https://madarek-nine.vercel.app/api/v1/status | jq -c '{buildId:.data.buildId,db:.data.db,ok:.data.ok}'
{"buildId":"dce338aaffba","db":{"ok":true,"latencyMs":7},"ok":true}
```

main HEAD `dce338aa` == buildId `dce338aaffba`. DB ok, 7 ms.

### 1.5 The fix sha's own runs

`09d50535` (the fix itself) went **CI red once**: `Typecheck (src + tests)` —
`tests/unit/r357-await-ci.test.ts(27): TS7006 ×4` (implicit-any params on a test helper).
Root cause: `verify.sh --fast` typechecked the base tsconfig (src only) — the tests tree was
never covered locally, so the error sailed through (and `| tail` on my verify run masked the
exit code — the "no pipe" law exists for exactly this). Repairs in the follow-up commit: typed helper + `verify.sh` step 1 now runs BOTH `tsconfig.json` and
`tsconfig.test.json` (matches CI's `typecheck:tests`; the stale "tests tree included" comment
was false — fixed). Deploy Vercel on `09d50535` correctly stayed red (CI failed → real signal;
the new gate did NOT excuse it — the law works both ways).

### 1.6 The follow-up sha's runs (1aa08883, rebased over the UI agent's PR #49 merge)

- CI **success** (run 43812830583) — the typecheck repair landed green.
- **Deploy Vercel success** (run 43812830590) — the FIRST live exercise of the new law:
  verify job log shows `attempt 28/84: pass — CI green on this sha` (the new script's output),
  then the buildId wait + live smoke green. Run URL:
  https://github.com/ahmadmedo1012/madarek/actions/runs/43812830590
- Size gate success (43812830514), deadcode success (43812830533).
- `buildId` on production: `{"ok":true,"buildId":"1aa088837f73"}` == HEAD (2026-11-16 06:0x UTC).
- Android — release APK: in progress at check time (no apps/mobile change in these shas;
  final all-green check happens in L9).
- NOT MINE, recorded for coordination: "UI screens (emulator, manual)" run 43813713084 failed
  on 1aa08883 — `maestro test "$FLOW"` saw an empty FLOW ("Flow path does not exist:
  …/madarek/"). That workflow is the UI agent's own QA deliverable (R357-UI A5); they are
  actively iterating (new branch `wip/r358-ui`, fresh dispatches at 06:03 UTC). Left to them;
  L7 needs its APK screens — revisit there if still broken.

### 1.7 The remaining-session runs (all green, stacked pushes included)

| sha | what | CI | Deploy Vercel | deadcode | live buildId |
|---|---|---|---|---|---|
| `0e0c2370` | deadcode ratchet fix | success | success (run 43863921790) | success | `0e0c23707d87` == HEAD |
| `42afd03c` | e2e script fix (columnMap + bash) | success | success | success | `42afd03c690d` == HEAD |
| `a2c36f8e` | test-push (item 5) | success | success | success | — (next sha carries it) |
| `743767f5` | e2e race+contract fix | success | success | success | `743767f5e277` == HEAD |

Deploy smoke green on `a2c36f8e` (the only backend-touching sha). Android
release APK green on every sha (the `0e0c2370` build repopulated
`android-latest`). No red Deploy Vercel on any superseded SHA — the L1 law
held through four consecutive stacked pushes.

## LANE 2 — accounts & student data on production

### 2.1 The surface build (commit 00ad0aa3, this session — the prior R357 slice)

Everything the R357 review found missing (its L2 map), closed in one commit:

- `/auth/verify-email` SPA page — the API route existed since R350 E3; the emailed link 404'd
  on the SPA. Now a real page (PAGE_TITLES + copy-budget born under the law 43/45).
- Student photo: client WebP (canvas 640px/0.82, PNG fallback) → presigned client-direct PUT
  (`profile-media` namespace) → confirm sniffs actual bytes; reads stream through
  auth-checked routes (`/me/profile/photo`, `/people/:id/photo`) — no public URL, by design.
- Important documents: `StudentDocument` model + migration
  `20261116120000_r357_l2_student_documents`; ticket/confirm/list/delete + SHORT-LIVED
  SIGNED read URLs — HMAC-SHA256(`doc:<id>:<exp>`) keyed by `JWT_ACCESS_SECRET`, 5-min TTL,
  constant-time compare (`lib/doc-urls.ts`); the consumer mounts in `public-doc.routes.ts`
  BEFORE the bare-/api/v1 routers (profiles/search would 401 a sessionless request).
- Photo-ZIP bulk attach (registrar): presigned zip transport (20 MB, ImportUpload ticket
  gate — an arbitrary key is a read primitive over the store and dies at the gate),
  adm-zip unpack, pure planner `lib/photo-zip.ts` (stem = university-id; ambiguous =
  refusal, never last-wins), one `photos-zip.apply` audit row.
- Phone-search audit (the r356 gap): `/directory?phone=` + `/search/discover` phone queries
  write `search.phone` rows — LENGTHS ONLY, never the number.
- Deliberate NON-builds, stated once: guardian accounts stay contact-fields only (the
  owner has not confirmed guardian accounts); phone LOGIN is not built — phone is a
  search/directory identifier, not a credential (unverified-phone login would be a
  takeover vector; needs SMS verification first — none exists today); staff registration
  stays invitation/admin-created (the register guard is by design).

Local gates: `verify.sh --fast` FAST PASS; backend vitest **2588 passed / 19 skipped**;
23 new tests (`r357-l2-pure` 12: the doc-URL law, the zip planner, the sniffers;
`r357-l2-routes` 11: honest 503s, key-shape gates, audit rows, signed-consumer 403/404).

### 2.2 The production e2e — 17/17 GREEN (run 3, 2026-11-16)

Two defect rounds, then green. The workflow
`.github/workflows/prod-accounts-e2e.yml` runs `scripts/qa/prod-accounts-e2e.mjs`
against the live deployment with throwaway `@demo.madarek.ly` accounts and a
read-only `PROD_DATABASE_URL` (outbox token extraction + audit asserts).

Run 1 (on `58bc5ebe`, 17 ✗) — cascade from ONE missing secret: `PROD_DATABASE_URL`
was never set, so every direct-DB step died ("URL must start with postgresql://")
and the org lookup never populated `ctx` (registration 400 `institutionId`, login
401s, `/users/undefined/...` 404s). Plus two real script bugs surfaced once the
secret landed: the Excel step sent `mapping` where the API contract is
`columnMap` (400), and the issue-step body had `${GITHUB_RUN_NUMBER }` (bash bad
substitution). Fixed in `42afd03c`; the secret was set via the GitHub API
(libsodium sealed-box, 204).

Run 2 (on `42afd03c`, 15/17) — two REAL findings, both fixed in `743767f5`:
1. **The verify-email outbox race**: registration's mail events are fire-and-forget
   AFTER the 201; on serverless the row lands ~0.5 s later (measured: +488 ms).
   The script read the outbox once at +294 ms → "no row". Fix: poll honestly
   for up to 8 s (step 3 went 4.6 s green in run 3).
2. **The phone step asserted a field the API never exposes**: the self view
   shapes phones as `{access, display}` (privacy.ts) — the raw
   `studentPhoneNormalized` column is a search INDEX, not a display surface.
   Fix: the step now asserts the real contract (Arabic-Indic digits round-trip
   as ASCII `0912345678`; every format PATCHes cleanly) and the ONE-key fold is
   proven by the SEARCH arm (step 11 finds the student from a differently-
   formatted phone query, with the audit rows).

Run 3 (on `743767f5`) — **17/17 ✓**:
https://github.com/ahmadmedo1012/madarek/actions/runs/43878385821
(1 org lookups · 2 registration · 3 activation via outbox token · 4 login email ·
5 login reg-number · 6 password change · 7 forgot-password outbox reset · 8
assisted reset · 9 Libyan phone folding · 10 DOB · 11 audited phone search ·
12 audited people read · 13 photo ticket→PUT→confirm→reads · 14 documents +
signed URL (sessionless 200, tamper 403) · 15 photo-ZIP · 16 Excel dry-run +
error report · 17 demo-cohort cleanup — 0 throwaway users left, verified).

Guardian note: stayed contact-fields only (owner has not confirmed — §5).
Phone login: NOT built (stated once, 2.1 — an SMS-verified credential lane,
none exists today).

## LANE 3 — mail

DONE 2026-11-16 (this session). The platform side is fully proven; the
owner-side items are exactly two clicks and stay open by design (§5).

- **From-domain decision**: `onboarding@resend.dev` (Resend's shared dev sender).
  The owner has NO custom domain (production rides vercel.app) — the switch is
  staged as ONE MAIL_FROM change + DNS records, zero code (MAIL.md carries the
  exact SPF/DKIM/DMARC records and the BIMI state-once: Gmail avatar needs
  BIMI + DMARC enforcement + usually a paid VMC ~$1,000+/yr).
- **Production-function send PROVEN**: `POST /auth/forgot-password` for
  ahmadmedo1012@gmail.com → outbox row `reset-password` → `status=sent`,
  `attempts=1`, **sentAt +2.1 s**, providerId `01a1e499-258a-78c6-9cf6-ccd547edb189`
  (2026-11-16 13:43 UTC). The ONE test send the brief allows — nothing else was sent.
- **SPF/DKIM receipt**: owner-side one click (Gmail → إظهار الأصل → spf=pass/dkim=pass
  for resend.dev via amazonses) — recorded in MAIL.md as the final delivery receipt.
- **Templates/logo/unsubscribe/webhook**: already shipped (R350 E5: RTL shell,
  dark-mode safe, plain-text part, List-Unsubscribe, the ONE logo at
  `${APP_ORIGIN}/brand/icon-192.png` — hash-pinned; suppression + webhook events).
- `docs/MAIL.md` updated with the R357 row + the click instruction.

## LANE 3.5 — push acceptance (problem 5, folded here — it shipped with L2's session)

- `POST /admin/test-push` (admin-extras.routes.ts): admin/OWNER-only; counts the
  CALLER's registered devices, fan-out via the production `fanOutPush`, honest 400
  («لا يوجد جهاز مسجّل…») when none. `a2c36f8e`, CI+Deploy Vercel green.
- ONE button «إشعار تجريبي» on إعدادات المنصّة (عمليّات النظام card) — toast
  «تمّ»/error, no new copy beyond the label (copy-budget held at 199/199).
- `docs/PUSH-FIREBASE-CHECKLIST.md` — the 5-line «جرّبها على جوّالك» section
  (install latest APK → login → allow notifications → the button → closed-app
  announcement on the lock screen).

## LANE 4 — search at 20k scale

DONE 2026-11-16 (this session). One REAL defect found and fixed; the
metrics recorded; the harnesses committed for replay.

### 4.1 The environment (and the one stated blocker)

The Neon branch API needs an `org_id` the API key does not expose
(`GET /organizations` is POST-only; every project call 404s "not an
organization member") — stated once, routed around: **local PG 16**
(`tools/boot-pg.sh`, the embedded binaries), database `madarek_scale`,
which is exactly what `docs/redesign/r350/SEARCH-DESIGN.md` §3
prescribed for the scale proof. The Neon-hardware numbers remain one
console-click away for the owner if wanted.
(Update, later the same session: the blocker FELL — `GET
/users/me/organizations` exposes the org; see LANE 8's demo-dataset
record for the full Neon branch/PITR machinery now in use. The L4
numbers below stay local-PG-honest.)

`scripts/qa/search-scale-seed.mjs` (committed): deterministic corpus
(mulberry32(357)) — 2 institutions (A=20k-student tenant, B=leak-test
tenant), 5 faculties/20 departments, **20,000 students** (User +
Membership + StudentProfile; Libyan name pools, reg-numbers SU-2026-…,
60% E.164 phone pairs, DOBs), 40 teachers, **2,000 courses + offerings**,
6 documented seats (3×ADMIN, TEACHER, STUDENT-A, STUDENT-B; password
`Madarek#Scale-2026`). Seeded in 5.6 s. REFUSES to run off-localhost or
off `madarek_scale` (the L8 demo-data law applied here too).

### 4.2 THE DEFECT (found at scale, invisible in CI)

**Multiword name queries returned ZERO results at 20k** (R@5=0.000 over
120 full-name probes; single-word queries worked). Root cause: the
people scans fetched with a FLAT OR over all plan variants, ordered
`firstName ASC, lastName ASC` into a 100-row window — «أحمد المصري»
fetched the alphabetically-first 100 single-word matches (all
«X أبوذر»), the strict multiword re-verify (multiwordHit) killed every
row, and the true targets sat BEYOND the window (measured: 1,144
matching rows, the window's first 100 = zero full matches). The CI
golden set never saw it: its in-memory corpus fits inside one window.

The fix (`11eb369f`): `plan.wordVariants` (per-word fold groups — the
same arms `variants` carried flat) + `multiwordNameArm()` — for ≥2
long-word queries the fetch is CONJUNCTIVE (every word's fold group must
match some name field; OR inside a group, AND across). The conjunction
is a superset of what the re-verify keeps (2-letter words stay
verify-only — the «بن» law holds). Single-word queries keep the flat OR
+ identifier arms. 4 failing-before tests
(`search-discover-registrar.test.ts`, the r357 L4 describe: conjunctive
where shape, single-word unchanged, teachers scan, wordVariants law).

**After: R@5(name)=0.967, MRR(name)=0.967** over 120 full-name probes
(id-level: 100/120 exact-id hits — the misses are pure name collisions
at 20k, ≈33 students share «أحمد المصري»; the id-MRR 0.312 is the
alphabetical position among identical names, not a ranking defect).

### 4.3 The load + correctness numbers (`scripts/qa/search-scale-load.mjs`)

Corpus: the seeded 20k/2k. 660 mixed-shape queries @ **50 concurrency**
(full names, family names, first-half prefixes, reg-numbers, phone trunk
`091…` + intl `+218…`, course codes, 1-edit typos, guaranteed-zero),
seat-spread under the 1000/15-min/user limiter; server booted compiled
(`node dist/server.js`, `connection_limit=20`, memory limiter store):

- **errors: 0** across all three final runs.
- **Serial warm (the ≤150 ms target): p50 = 9 ms, p95 = 13 ms, max = 27 ms** — MET with an order of magnitude of headroom.
- 50-concurrency on THIS box: server tookMs p50 ≈ 2.3 s — 2 CPUs shared
  by node + PG + the load generator starve the box (the k6 precedent
  caps VUs for exactly this reason — `scripts/load/k6.js` header). The
  serverless production shape (per-instance pools, DB off-box) does not
  have this topology; the serial-warm number is the honest target measure.
- **Leaks: NONE** — institution-A student never sees the B seat (and
  vice versa); the STUDENT role receives zero people rows (the matrix
  held at 20k, both directions).
- **Zero-result law**: a nonsense query answers a clean empty envelope
  (200, all totals 0, ~990 ms cold / instant warm) — never an error.
- "Zero-result AI rewrite via Groq": **no such surface exists** — stated
  once. The empty state rides the client-side `withinOneEdit` suggestion
  law (`frontend/src/lib/search.ts`); the Groq path is the AI chat RAG.
  Nothing was invented to satisfy the phrase.

Ratchet: the committed golden-set baseline is UNTOUCHED (763 queries,
R@5=0.9908/MRR=0.9613 — pure engine, unchanged); the route-level tests
gained the 4 new laws. Full backend suite after the fix: **2592 passed /
19 skipped**. `verify.sh --fast` FAST PASS.

Run evidence: the harness output above (this file, 2026-11-16 14:1x UTC);
`/tmp/search-scale.json` carries the machine-readable copy of the final
run. The scale database is dropped once this lane's CI is green
(throwaway, re-seedable in ~6 s by the committed script).

## LANE 5 — AI hardening

DONE 2026-11-16 (this session) — problem 4 of the review, closed end to
end. Commits `d0b2a2d6` (core), `c925dd88` (the long-conversation pin),
`0ed404e7` + `5e60947a` (the gate/lint repairs its CI caught).

### 5.1 Retry-After-aware routing (the free-tier throttling fix)

- `AiProviderError.retryAfterMs` + `parseRetryAfterMs()` (ai.ts): the
  provider's own `Retry-After` (delta-seconds or HTTP-date) parsed and
  clamped [1 s, 10 min] — on BOTH transports (JSON + SSE).
- `AiProviderBreakers.recordFailure(id, now, retryAfterMs?)`: a 429's
  Retry-After opens the breaker with cooldown = **max(jittered base,
  Retry-After)** — the chain skips the provider until the SERVER said
  it may be asked again (a shorter Retry-After never shortens the base).
- `runProviderChain` carries the last error's Retry-After to the breaker
  (the skip is visible in the log line).
- The Groq shift: already the chain's second arm
  (`openai/gpt-oss-120b` then `-20b`, the R355 live-eval order); with
  Retry-After honored, a Gemini free-tier 429 means the NEXT turns go to
  Groq for exactly as long as Gemini asked to wait.
- Tests (failing before by construction — none of this existed):
  `r353-ai-provider-chain.test.ts` +8: parseRetryAfterMs ×3, the
  breaker-honors-Retry-After ×3, snapshot, and the chain-level proof
  (gemini 429+Retry-After 120 s → the next turn never dials gemini and
  groq answers).

### 5.2 The per-institution daily budget

- `AiInstitutionQuota` model + hand-written migration
  `20261116143000_r357_l5_institution_ai_quota` (applied cleanly; the
  migrate-dev diff was rejected — it wanted to "fix" the repo's raw-SQL
  trgm indexes, the hand-write keeps the file surgical).
- `consumeInstitutionAskQuota` (quota.ts): the per-user CAS law, per
  campus. Default **1000/day** (`AI_INST_DAILY_LIMIT_DEFAULT`, clamp
  10 000) — a 40-seat demo campus at the per-user cap of 25 must not
  trip it; it stops ONE campus from eating the whole free tier.
- The chat route gates it AFTER the per-user gate (both transports —
  the stream path shares the handler head); OWNER/platform chat (no
  institution context) is exempt by design. Fail-open on a store
  outage, the consumeQuotaBestEffort ruling.
- Tests: quota pure ×6 (`r323-ai-quota.test.ts`) + route-level ×2
  (`ai-chat-routes.test.ts`) — the over-budget campus gets the honest
  Arabic 429 («وصلت مؤسّستك الحدّ اليوميّ…») BEFORE any provider call or
  DB write, and the healthy campus chats normally.

### 5.3 Quota state in /status (no secrets)

The live `/api/v1/status` now carries an `ai` block (verified on
production, buildId c925dd88):
`{ mode: 'chain', providers: [gemini(1 model), groq(2), openrouter(2)],
breakers: {per-instance verdicts}, dailyAskLimitPerUser: 25,
monthBudget: {monthKey, usedTokens}, allProvidersDownSince: null }` —
ids, counts, and verdicts only; no keys, no endpoints, no user data.

### 5.4 Issue-on-all-providers-down > 5 min

- `lib/ai/provider-health.ts` (NEW): the CROSS-INSTANCE verdict the
  in-process breakers cannot give on serverless — the last 15 min of
  AiTelemetry (provider ≠ null/'local'): failures-only with the oldest
  ≥ 5 min old = DOWN (downSince + the failed provider list as
  evidence). Local-composer rows prove nothing and are excluded; a
  quiet platform is vacuously healthy.
- The tick's fast slot runs the guard every cycle
  (tick-jobs.ts, allSettled with the outbox drain) and raises the
  throttled `AI_ALL_PROVIDERS_DOWN` OperationalAlert (the owner's
  /owner/alerts surface).
- The tick WORKFLOW (issues: write, added) reads
  `/status .ai.allProvidersDownSince` every 5 min and opens ONE GitHub
  issue (Arabic title, deduped by the `ai-providers-down` label +
  open state). No secret reaches the backend.
- Tests: `r357-ai-provider-health.test.ts` ×8 (failing before: the
  module did not exist) — the verdict table, the local-row exclusion,
  the 5-min threshold, the constants, the alert raise, and the
  fail-open store outage.

### 5.5 The chat proofs

- **The 55-turn long-Arabic conversation** (`ai-chat-routes.test.ts`,
  new): a 55-message conversation (~500 chars/turn) continues — the
  provider sees system + the NEWEST 12 turns (chronological, first =
  #44, last = #55) + the new ask; every history turn stays under the
  1600-char clip; the reply lands in the SAME conversation (no
  re-create). **A PIN, not a fix** — the window law already held; the
  test now guarantees it under volume (honest label, no invented
  defect).
- Grounded answers via StudentContextPack + citations: already shipped
  and pinned (R353 C3/R323 B1.2 — the RAG block, the exam-active
  guard, the citation law; `ai-context-pack.test.ts` 18 its).
- Leakage/jailbreak: the 16-case live suite rides
  `scripts/qa/ai-eval-providers.mjs` (R355) — sandbox-blocked vendors
  mean it runs in workflows only; the offline golden set (42) is
  CI-gated. Nothing to add here without burning live quota; the live
  table stays the R355 evidence.

### 5.6 The gate lesson (recorded honestly)

`c925dd88` went CI RED on two counts the local fast gate did not cover:
(1) the BACKEND tests tree typecheck (`verify.sh --fast` ran only the
frontend's — the R357 1aa08883 lesson, one workspace over; now step 1
runs all four tsconfigs) and (2) eslint (fast mode never lints; the
two `no-useless-assignment` errors in status.routes.ts were mine and
are fixed). Repairs: `0ed404e7` + `5e60947a`.

## LANE 6 — roles E4 + alias

DONE 2026-11-16 (this session). Commits `514cd7a9` (the alias flip +
E4) and `5b13cc4d` (the deadcode re-pin its CI demanded).

### 6.1 E4 — one seat, one honest day (`frontend/tests/e2e/r357-e4-day-in-life.e2e.ts`)

Nine journeys, one per documented seat, through the REAL SPA (the
hermetic mock transport): المسجل العام + مسجل الكلية (ADMIN — the
faculty scope is backend-side, stated in the spec header), أستاذ +
رئيس قسم + عميد (TEACHER — the seats share the SPA day), مراقب
الامتحانات + موظف الجودة (QUALITY), طالب + طالب المدرسة (STUDENT).
Each: land on the seat's home → its signature surface → no error
state. 9/9 green locally (38 s) — the deep interactions stay in their
own specs (quality-moderation, online-exams, courses-journey…).

Honest scoping notes (in the spec header): **معيد is NOT a platform
seat today** (no TA role exists — the owner's uncertain-seats table
owns that decision); OWNER stays audit-sweep-only (the fixtures'
standing ruling).

**The nightly runner** (`.github/workflows/e4-nightly.yml`): every
night 02:41 UTC — the E4 suite + the FULL hermetic e2e replay (L8's
nightly-replay leg), rolling-issue law (`e4-nightly` label: open once,
comment on repeats, auto-close on green).

### 6.2 The alias decision — `madarek-app.vercel.app` is the canonical

Decided and applied in ONE commit (`514cd7a9`), exactly as the brief
ordered:

- **canonical/OG/sitemap/robots** (frontend/index.html ×6,
  sitemap.xml ×15+comment, robots.txt, LegalSheet CANONICAL_BASE).
- **CORS defaults** (backend env.ts): `[madarek-app, madarek-nine,
  localhost:5173]` — the **dead Render origin dropped** from the
  defaults (it stays HOSTING §6's suspended rollback path only).
- **Backend fallbacks**: status updateUrl, mail-admin ctaUrl, the
  mail preview sample, mail-events APP_ORIGIN, OPENROUTER_REFERER.
- **Mobile**: client/telemetry/updates bases, app.config.ts, eas.json
  ×3, contract-check; the remote-config FALLBACK_ORIGINS now walk
  **app → nine** (render gone) — the failover test updated, 11/11.
- **The config mirror**: `frontend/public/config/app.json` apiOrigins
  = [app, nine] — the Config Pages workflow republished gh-pages
  (green on the flip SHA).
- **Workflows**: build-android ×2, build-ios, deploy-smoke ×3,
  deploy-vercel ×2, mobile ×2, prod-accounts-e2e BASE,
  push-firebase-proof, tick-watch default, r352-k1/k5 targets.
- **Vercel env**: `APP_ORIGIN` → https://madarek-app.vercel.app
  (PATCHed via the API; the flip's own deploy picked it up).
- **Repo variable**: `TICK_TARGET_URL` → madarek-app (204).
- `docs/HOSTING.md`: the map row states the R357 decision; the Neon
  row carries the live latency (dbLatency median 2–13 ms); the Hobby
  non-commercial verdict + upgrade paths were already §2's.

**Live verification**: `madarek-app.vercel.app/api/v1/health` →
buildId `514cd7a9838a` == the flip SHA; Deploy smoke green against
the NEW origin; `madarek-nine` still serves (the failover). The
flip SHA's deadcode CI demanded one re-pin (the E4 spec joins the
35-strong e2e known-debt class, 63→64 — `5b13cc4d`).

Historical evidence (RESUME run URLs, the R353–R356 tables)
deliberately keeps pointing at madarek-nine — those runs HAPPENED
there; only the living surfaces flipped.

## LANE 7 — real-app proof (top-20 + APK screens)

DONE 2026-11-16 (this session), on the NEW canonical origin.

### 7.1 The top-20 production crawl — ZERO findings (`scripts/qa/prod-top20-crawl.mjs`, committed)

4 roles (guest/STUDENT/TEACHER/ADMIN/QUALITY/OWNER — the documented
@test.ly seats) × 20 headline routes on `madarek-app.vercel.app`,
Playwright-chromium, real login API + the SPA's real localStorage
substrate. Per page: every /api/ call ≥ 400, every console error,
visible Arabic error states. **Final run: 20/20 ✓, ZERO findings**
(transcript `/tmp/prod-top20-final.json`, 6 contact-sheet shots).

THREE real findings on the way (all fixed):
1. **The exams@test.ly seat (مراقب الامتحانات) was MISSING on
   production** — the other 10 seats existed. Fixed by running the
   documented idempotent heal pass (`ensureTestAccounts` — the seed's
   one deliberate write exception) against production: 11/11 seats now
   (exams@ active, QUALITY).
2. **The ulara drift**: 8 demo seats carried a second membership in
   `inst-ulara-showcase` (the Nov-9 playground experiment) — with two
   active memberships the login returns NO institution context and the
   SPA (correctly) shows the institution picker, breaking the demo
   auto-login contract. The heal pass also revealed student@test.ly's
   madarek-demo membership had DRIFTED AWAY entirely (recreated
   2026-11-16 15:52). Fix: deactivated the 8 ulara rows on the @test.ly
   seats only (isActive=false — reversible; the playground's own 39
   users untouched). Single-membership auto-login restored.
3. The training catalog lives at `/training` (my plan said
   /training/catalog — that URL correctly 404s as a track slug).

### 7.2 The APK screens via the CI emulator

The emulator + production-login + screenshot capability is PROVEN
(push-firebase-proof run 43774275945 — dumpsys + logcat + لقطات). The
dedicated `ui-screens.yml` job is the UI agent's own QA deliverable
(R357-UI A5) and was failing at hand-over (empty FLOW var); they are
iterating on `wip/r358-ui`. Left to them, noted here + in
UI-FINDINGS.md — not re-piped by the main agent to avoid duplicating
their lane.

## LANE 8 — university-demo readiness

Part done 2026-11-16 (this session); the honest remainder stated.

DONE:
- **`docs/UAT.md`** — the 30-minute per-seat walkthrough (student,
  teacher, head/dean, registrar ×2, exams watcher, quality, owner,
  the Android app) + the automatic nightly leg.
- **`docs/DEMO-HANDOVER-AR.md`** — the Arabic handover pack, one page
  each: the 15-minute demo script, deploy/rollback, where every key
  lives (names only), costs (0$ today) + the first upgrade (Vercel Pro
  ~20$/seat — Hobby is non-commercial), and the post-approval roadmap
  (custom domain → mail verification → Apple Developer → real staff
  accounts → Pro).
- **The standing soak** (`.github/workflows/soak.yml`): every 15 min —
  health + a REAL login + a role-scoped search + the AI config surface
  on the canonical origin; rolling-issue law (`soak` label). The 24-h
  soak's evidence accumulates in the run history from the merge.
- **The rollback drill** (read-only): 5 production-ready deployments
  are promotable rollback targets (listed 5926d11f → 0ed404e7) — one
  click each in the Vercel console; the handover pack documents it.
- The nightly UAT replay = the e4-nightly workflow (L6).

DONE (continued, the same session's second wind — the "blocked" verdicts below were revisited and closed):
- **The Neon org_id blocker (§4.1) RESOLVED**: `GET /users/me/organizations`
  works with the same key — org `org-frosty-salad-58512824` ("SubNation").
  From there the full branch API opened: production lives in project
  **ULARA** (`patient-sound-66225485`, eu-central-1, main branch
  `br-aged-surf-b9ebjpna`, endpoint `ep-icy-mode-b9d573ot`).
- **The demo dataset — BUILT, SEEDED, PROVEN** (`scripts/qa/demo-dataset.mjs`):
  - Neon branch `demo-dataset` (`br-empty-rice-b9j8wgbw`, endpoint
    `ep-still-wildflower-b9w5zc5q`) created off main — a copy-on-write
    snapshot, so it inherited schema + the fictional corpus + the @test.ly
    seats; the script then TOPS UP the body to demo scale.
  - ONE command (`DATABASE_URL=<branch> node scripts/qa/demo-dataset.mjs`):
    migrate deploy (no-op on the branch) → curated seed only if the DB is
    empty (local rehearsal) → deterministic top-up (mulberry32(2026)):
    +3 faculties/6 departments, +16 teachers, +36 courses + offerings,
    **380 university + 60 school students** (emails `bulk*@demo.madarek.ly`,
    reg `DM26-#####`/`AD26-#####`, phones in the 0915xxxxxx demo block,
    guardians, DOBs, study types, school stage/grade/section), 2–4
    enrollments each (1120 total).
  - Seeded 60.8 s: `{users: 501, students: 475, teachers: 26, courses: 45,
    offerings: 45, enrollments: 1337}`; re-seeded after the reset drill with
    IDENTICAL counts (determinism proven).
  - **Idempotence**: second run = "already present (456 bulk users)…
    Nothing written" — verified.
  - **Reset drill**: `--reset` deleted EXACTLY the cohort in 4.0 s
    (1120 enrollments, 456 users, 36 courses…), baseline untouched
    (45 users/35 students/9 courses/13 @test.ly seats/217 pilot
    enrollments — zero bulk orphans left, verified by count).
  - **Safety**: refuses production BY NAME (`ep-icy-mode-b9d573ot` →
    "REFUSING: this is PRODUCTION"), refuses any non-localhost /
    non-branch host, refuses a missing URL (all three exits = 2, tested).
  - The handover pack (§٢ب) documents the one-command fill/reset + how to
    point a preview deployment at the branch.
- **The Neon snapshot + PITR restore drill — PROVEN LIVE** (this is the
  R356 §G drill; the pg_dump operator scripts stay documented, their
  sandbox drill still needs a machine with pg_dump — stated once):
  1. Snapshot = branch: `demo-dataset` off main (full COW copy) — done above.
  2. Marker `pitr-probe@drill.madarek.ly` written on the branch at
     **16:43:42Z**, deleted at **16:45:21Z**.
  3. PITR branch `br-orange-mud-b97ifye7` created with
     `parent_timestamp: 16:44:30Z` (the correct API field — the documented
     `point_of_time` shape is silently IGNORED by the current API, proven
     with garbage probes; the shape comes from
     neon.com/docs/reference/api/branches/create-project-branch).
  4. The PITR branch **contains the deleted marker** (`cmwjhtanh0000amowr5r3b9bz`,
     createdAt 16:43:42.509) + the full dataset (475 students) — the state
     as of the requested minute is fully recoverable. Drill branches
     deleted after; the marker is gone from demo-dataset (its state =
     exactly the seeded dataset).

The CSP-red repair (recorded for honesty): the alias-flip's pinned
witnesses commit `c362f3a8` pasted the json-ld hash into
`THEME_BOOTSTRAP_SHA256` (the json-ld check passed only accidentally
through the wrong constant) — Design gates red. Repaired `e8490cac`:
each hash back in its own constant + the R357 pin-refresh comment.
CI + Deploy Vercel green on `e8490cac`.

DONE (Lighthouse, the same session — measured with the REAL mobile
preset on the canonical origin, two pages AUTHED via the login API +
the mdrk-auth substrate, the same law as the top-20 crawl;
`lighthouse@13.6.0` + puppeteer-core over the playwright chromium):

| page (mobile) | perf | a11y | best-practices | seo | LCP | TBT |
|---|---|---|---|---|---|---|
| `/` landing | 78 | 87 | 100 | 100 | 3.0 s | 670 ms |
| `/auth/login` | **95** | 100 | 100 | 92 | 3.0 s | 40 ms |
| `/colleges` | **97** | 100 | 100 | 92 | 2.3 s | 130 ms |
| `/student/dashboard` | 78 | 100 | 100 | 57* | 3.9 s | 410 ms |
| `/admin/people` | **94** | 100 | 100 | 57* | 3.0 s | 20 ms |

3/5 meet the ≥ 90 bar. The two below (landing, student-dashboard) are
TBT-bound (hydration main-thread work; opportunities are modest —
unused-css −150/−250 ms, unused-js −150 ms each) — **record-only per the
brief; both handed to the UI agent** in UI-FINDINGS.md. (*the 57 SEO on
authed pages is by-design — a dashboard is not a public document; the
SPA's public SEO story lives on the guest pages, which score 92–100.)

OPEN (stated honestly, not hidden):
- **The pg_dump operator drill**: `db-backup.mjs`/`db-restore.mjs` logic
  is CI-pinned but running them needs pg_dump/pg_restore on a real
  operator machine (absent here; the Neon-native drill above covers the
  R356 §G ask).

## LANE 9 — branch sweep (last)

DONE 2026-11-16 (this session). The brief's 9 stale branches
(`wip/r354-ui`, `wip/all-d-ci-abi-order`, `wip/p1-profiles-foundation`,
`wip/r349-smoke-diagnostics`, `wip/x0-keepwarm-window`, `wip/x1-vercel-spike`,
`wip/x3-remote-config`, `wip/x4-cutover`, `pr/45`) were ALREADY gone when
this session reached the sweep (verified via the GitHub API
`GET /branches?per_page=100` + a pruned fetch — the remote holds exactly
four refs). The four, with verdicts:

- `main` — the trunk.
- `gh-pages` — the config-pages mirror; KEPT per the brief.
- `wip/r358-ui` — the UI agent's ACTIVE branch (19 unique commits: the
  emulator-capture QA line, responsive shared-table fixes, navigation
  evidence). No open PR. NOT deleted — §3: their lane, they merge via PR.
- `feat/heronai-uiux-overhaul` — the UI program's next rounds
  (r359/r360/r361 «working drawings», pushed 2026-11-16). Active,
  unmerged (3 unique commits). NOT mine to delete or merge.

Open PRs at sweep time: ZERO (verified). The historical merges for the
record: #48 (`merge/r354-ui`) and #49 (`merge/r357-ui`) both merged;
`pr/45`'s head `wip/r342-integration` merged in #45.

### 9.1 The final all-green check

Runs on this record's OWN sha once its workflows conclude — verdict
table appended in the closing commit (the last edit of the file).
Verified so far this session: every pushed sha went green individually
(`e8490cac` CI+Deploy Vercel green — the CSP repair; `f923d224` CI+Size+
deadcode green, docs/workflow-only so Deploy paths correctly did not
fire); `android-latest` freshness is checked in the closing commit
against the final HEAD.
