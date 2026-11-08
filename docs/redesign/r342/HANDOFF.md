# R342 HANDOFF — the integrated release candidate and what remains

Updated by **R342-11** (final integration). Companion to `REPORT.md` (the
authoritative close-out). State at handoff: `wip/r342-integration` at the
round-report commit, one PR open against `main` @ `620a31ec`.

## Final PR link

- **<https://github.com/ahmadmedo1012/madarek/pull/45>** — «R342: integrate redesign
  workstreams and close release quality gates» (the round's single final PR against
  main; head `wip/r342-integration`).

## Final integration SHA

- The round-report commit (head of `wip/r342-integration` after `82b6d758`;
  `git log -1` on the branch at handoff time). Base: `main` @ `620a31ec`.

## Merge status

- **UNMERGED — intentionally.** Two coverage floors (footer 36.7%, intro 37% vs the
  40% no-escape floor) remain; measured honestly after the r337 excused
  double-count repair. Exact remaining actions in REPORT.md §5. Everything else on
  the candidate is green (rate 93.3% ≥ ratchet 91.8; unit 3040 + 1998(+19 skip);
  E2E 157 + 76; build/bundle 758.9 KB gz; all design gates; size gate GREEN).

## Required deployment action and safe sequence (when the floors clear)

1. A closure round lifts footer/intro over 40% with the wrapper-mirror work
   (REPORT.md §5 has the element budgets: ~45 / ~64 bound elements).
2. The final PR merges with the repository's supported merge strategy (merge
   commits allowed; no branch protection on main at round time — re-check).
3. Post-merge: verify main points at the merge result and re-run CI on the merged
   commit (the brief's step 8).
4. **No deployment occurred in this round.** Production was not touched; the deploy
   pipeline (deploy-smoke workflow) is the authorized path — do not deploy or alter
   live production resources without explicit authorization.

## Production verification steps (after an authorized deployment)

- The deploy-smoke workflow's own checks on the deployed build identity.
- The surface audit baseline: `npm --prefix frontend run audit:baseline` refresh
  cadence per specs/012 (T142) so the surface-drift gate stays meaningful.
- Manual: homepage journey (hero → intro → problems → map → why → footer) at
  390/1440 light+dark; one login per role (student/teacher/registrar/quality/owner).

## Rollback considerations

- The PR is one merge commit — revert the merge to restore `main` @ `620a31ec`
  (all ten worker branches stay intact, untouched by this round).
- No database migrations shipped in this round (frontend + conformance tooling +
  docs only); no backend schema changes → no rollback data steps.

## Remaining operational risks

- The 800-row conformance work-list (footer cells weakest at 85–91% passRate) —
  polish backlog, ordered by delta, in `scripts/conformance/results.json`.
- Auth dark FCP: loaded-box artifact class; watch surface-drift on the PR head.
- Playwright 1.60 requires `chromium_headless_shell-1223` (sandbox caches shipped
  1200) — `npx playwright install chromium` in `frontend/` with
  `PLAYWRIGHT_BROWSERS_PATH` set at runtime; conformance and E2E both need it and
  the vite dev server on :5173 (`reuseExistingServer` locally).

## For the next round

- The wrapper-mirror work is the only thing between this candidate and merge; from
  the R342-07 footer experience (85 bindings ≈ +11.5 honest points) the remaining
  collision-residue tail is harder — budget a full round for both sections.
- Round artifacts: REPORT.md (this dir) · provenance
  `scripts/conformance/results/chromium-20261108-160627-full.json` + the scoped
  truth-repair blobs (154433/154544/154655) · regression belts
  `scripts/conformance/test-rung-harvest.sh` (CI) and the in-run excused-partition
  guard (`run.mjs`, fail-closed).
