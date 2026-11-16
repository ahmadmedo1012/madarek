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

(the follow-up sha's runs appended once concluded)

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

## LANE 2 — accounts & student data on production

### 2.1 The surface build (commit 00ad0aa3, this session)

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

(e2e-on-production evidence: §2.2, once the workflow runs)

## LANE 3 — mail

(placeholder)

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
