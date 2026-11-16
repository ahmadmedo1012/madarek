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

(placeholder)

## LANE 5 — AI hardening

(placeholder)

## LANE 6 — roles E4 + alias

(placeholder)

## LANE 7 — real-app proof (top-20 + APK screens)

(placeholder)

## LANE 8 — university-demo readiness

(placeholder)

## LANE 9 — branch sweep (last)

(placeholder)
