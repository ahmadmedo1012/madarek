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

## LANE 2 — accounts & student data on production

(placeholder — evidence recorded as the lane lands)

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
