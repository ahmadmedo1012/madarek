# R364 — Final Unification Report (`main` as the single development authority)

**Date:** 2026-11-17 · **Integrator:** the local integration agent (this machine, this worktree)
**Candidate branch:** `integration/r364-final-main` — base `origin/main@8f38b154`
**Code head at verification:** `1c75d7cc` (this report is committed on top of it; §3 lists every commit)

---

## 1 · Executive summary

Every open development branch in `ahmadmedo1012/madarek` was inspected, its
accepted work merged into one release candidate, the candidate's real gates were
run on this machine, and every red gate was repaired at its cause — no ceiling
raised, no budget widened, no ratchet lowered, no test weakened.

| | |
|---|---|
| Branches merged | 7 (`integration/r362-final-unification`, 5 × `agent/r362-*`, 2 × `agent/r363-*`) |
| Merge conflicts | **0** (all branches were children of the same measured baseline) |
| Local-only commits found and preserved | **2** (`dc835f29`, `e057c9b4` — never pushed, absent from origin) |
| Rejected work | `wip/r358-ui`'s compact navigation + its 6 deleted nav guards + 10 evidence PNGs + a debug `console.info` (reasons in §5) |
| Red gates found on the merged tree | 6 (motion token, web copy budget, 5 mobile copy budgets, dead-code ratchet, CSS-instrument portability, conformance browser build) |
| Red gates repaired | 6f — all at cause; 0 suppressed |
| Tests measured on the candidate | frontend **3155/3155** · backend **2658 passed / 19 documented skips** · mobile **1252/1252** |
| Bundle | **756.2 KB gz** total (ceiling 770) · entry 65.6 (92) · pdf 95.4 (110) |
| Conformance gate | **PASS** at the 91.6 floor (full run, 10 mapped sections × 5 breakpoints) |
| Production readiness | **NOT unrestricted.** 8 external blockers remain (§9); 2 repository-owned P1s were fixed here |

---

## 2 · Initial state (measured, not assumed)

Local repository (verified identity: `ahmadmedo1012/madarek`, one service,
Vercel + Neon):

| | |
|---|---|
| Root / worktree | `/home/rh2011/Projects/madarek` |
| Checked-out branch | `wip/r358-ui` @ `f2d3ab8b` — working tree **clean**, `+0/-0` vs its upstream |
| Second worktree | `/home/rh2011/Projects/madarek-heronai-uiux` — `feat/heronai-uiux-overhaul` @ `dc835f29`, **2 local commits ahead of origin**, 3 untracked scratch probes (`frontend/*.tmp.mjs`) left in place, not committed |
| Local `main` | `24dd949b` — 9 commits **behind** `origin/main` |

Remote refs after `git fetch --all --prune --tags`:

| Branch | Head | vs `origin/main` | Files |
|---|---|---|---|
| `main` | `8f38b154` | — | — |
| `integration/r362-final-unification` | `e98d6a0b` | 10 ahead / 0 behind | 36 |
| `agent/r362-shell-nav` | `3b9dea73` | 14 / 0 | 40 |
| `agent/r362-heron-experience` | `fabd1387` | 11 / 0 | 47 |
| `agent/r362-design-system` | `0b9b9b09` | 15 / 0 | 42 |
| `agent/r362-web-product` | `6de74253` | 15 / 0 | 57 |
| `agent/r362-native-mobile` | `ec2b5d14` | 15 / 0 | 62 |
| `agent/r363-backend-hardening` | `9213585c` | 14 / 0 | 48 |
| `agent/r363-operations-readiness` | `f25d417b` | 11 / 0 | 37 |
| `feat/heronai-uiux-overhaul` | `79659d8d` | 3 / 15 | 18 |
| `wip/r358-ui` | `ec712eb2` | 22 / 23 | 27 |
| `gh-pages` | `809d43d3` | publishing only | — |

**Structural finding** (this is what made the integration deterministic): every
agent branch contains the *same* 10-commit integration baseline as its first 10
commits — the agents each branched from `e98d6a0b` and added 1–5 commits of
their own. Merging them therefore re-uses the shared baseline and applies only
each agent's own delta.

Two documents governed the acceptance decisions:
`docs/redesign/r362-integration/INTEGRATION-RECORD.md` (merge map, accept/reject
ledger) and `R362-COORDINATION.md` (exclusive file ownership per agent).

---

## 3 · What was integrated

### 3.1 Merges (history preserved, `--no-ff`)

| Order | Source | Merge commit | Delta |
|---|---|---|---|
| 0 | `integration/r362-final-unification` | fast-forward to `e98d6a0b` | r359–r362 baseline: technical sheets/plates, heron seal, shared-table recipe restore, five-role mobile capture rig, r358 audit tooling, integration records, surface-drift fix |
| 1 | `agent/r362-shell-nav` | `a7145978` | nav.ts truth repair, B1 compact-spine verdict, census/spine/drift guard belt (19 → 30 tests), delivery + brief docs |
| 2 | `agent/r362-design-system` | `e83df4cf` | `--accent-fill-aa`, semantic state seats, four purged recipes restored, DESIGN.md truth repairs, 183-line contract test |
| 3 | `agent/r362-heron-experience` | `10064be8` | interactive drawing family (`drawKit`, `ConceptField`, `RouteSurvey`), scroll-draw engine, concepts band, 6 e2e tests |
| 4 | `agent/r362-web-product` | `717bb9a8` | 126-row route sweep + parity/guard tests, AI code rendering + streaming cancel, PDF drop zone, document/research fixes, `r362` playwright project |
| 5 | `agent/r362-native-mobile` | `f2e2d1b5` | settings seat for the three profile-less roles, pressed-seat chrome, exam exit guard, quality sector tools, Maestro flows, `ui-screens` rig |
| 6 | `agent/r363-backend-hardening` | `9cefa7a9` | takeover-chain closure (seed/devInbox gates, APP_ORIGIN reset URLs, institution-bound reset links), governance/import IDOR guards, upload presigner binding, lecture media authorization, +3 regression suites |
| 7 | `agent/r363-operations-readiness` | `f8eec814` | the read-only production readiness audit (documentation only) |

### 3.2 Local-only work preserved (never on origin)

| Commit | Content | Action |
|---|---|---|
| `e057c9b4` | `docs/heronai-overhaul/route-inventory.md` — mechanical 128-route/26-group inventory read from `App.tsx` | cherry-picked (`-x`) as `6a7c2b21` |
| `dc835f29` | `shell.css` — the desktop expanded rail wears the drawer's `[01]` mono gutter index (32 lines, one annotation voice across bands) | cherry-picked (`-x`) as `1c75d7cc`; verified by stylelint, raw-css, build and the 16 shell e2e tests |

The three untracked `frontend/*.tmp.mjs` probes in that worktree are scratch
capture harnesses, not product code; they were left untouched (not committed).

### 3.3 Fixes made by the integrator (cause, not symptom)

| Commit | Gate | Cause | Fix |
|---|---|---|---|
| `217d37ea` | copy budgets (web + mobile), motion tokens | Each agent added visible Arabic to screens already sitting at their ceiling; one raw `ease` keyword | Wording cuts only (duplicated a11y labels, verbose fallbacks, an English `copy`/`copied` label duplicating an Arabic aria-label). Ceilings untouched, no test changed, information kept |
| `0572bea8` | dead-code ratchet | `knip.unusedExportedTypes` 227 → 231 | Three test-support types are used only inside their own module → dropped the redundant `export`; `InlineSpan` is an exported function's return type → consumed at the call site. The same run *improved* `unusedExports` 46 → 45 and `jscpd` 196 → 191 → re-pinned in the same commit (the gate's own law) |
| `81d3a04e` | mobile copy budget | A wording cut collided with a pinned four-form Arabic counted-noun test | Reverted the plural forms (tests are law), took the two words from the un-pinned submit notice |
| `a353874e` | CSS instrument portability | `css-coverage.mjs` / `css-shots.mjs` defaulted to `/home/z/heron-lab` — the retired sandbox's home → `EACCES` on any other machine | Defaults now resolve into the OS temp dir; env overrides unchanged |
| `85ab2a70` | ops audit R363-06 / R363-08 | SPA document bypassed helmet (static rewrites); no request correlator | `vercel.json` now emits the same CSP (both pinned inline-script hashes) + `nosniff` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` for the SPA document; new `requestId` middleware echoes `x-request-id` and the 5xx log lines carry it, with 3 pinned unit tests |
| `83a7ccbf` | conformance evidence | The merged tree had no run of its own | Full `run.mjs --gate` on this worktree's own vite (`:5344`) — PASS; `results.json` + the dated provenance file committed per the directory's convention |

---

## 4 · Rejected / superseded work (with reasons)

| Item | Reason |
|---|---|
| `wip/r358-ui` `72aadb7e` compact role navigation (`nav.ts` spine + a 26-item «المزيد» overflow) | Regrows the junk drawer main's 9-item group gate documents as eliminated, destroys the r183-B7 collapsed families, and **deleted six drift-guard tests to fit**. `grep compactRoleNav frontend/src/lib/nav.ts` → 0 in the final tree |
| `wip/r358-ui` `nav-coverage.test.ts` rewrite (−64 net lines, 6 guards removed) | Part of the same rejection; main's coverage contract stands, the shell-nav branch *added* 11 guards on top of it (19 → 30) |
| `wip/r358-ui` ten evidence PNGs (~16.6 MB) | Size gate (file ≤ 500 KB, push ≤ 5 MB); the evidence lives in Actions artifacts and the rig is committed |
| `wip/r358-ui` `_layout.tsx` `console.info("R358_BOOT", …)` | Debug diagnostic from an emulator investigation, not product code |
| `wip/r358-ui` `components.css` / `13f1067c` | Already taken into the baseline as `d3ab3ce1` (the shared table recipe) — re-merging would duplicate |
| `feat/heronai-uiux-overhaul` r359/r360/r361 commits | Already cherry-picked into the baseline (`4e199e27`, `93a314a4`, `9c293f1f`); ancestry checked, not re-merged. Only its never-pushed tail (`dc835f29`, `e057c9b4`) was new |
| `archive/wip/{l2d,r343-D1,sec-map}` tags | Superseded by merged rounds (verified in the R362 record §1) |

---

## 5 · Verification actually run on this candidate

All commands ran in `/home/rh2011/Projects/madarek-r364` (Node 22.22.1, npm 9.2.0).

| Gate | Command | Result |
|---|---|---|
| Typecheck (4 configs) | `npm run typecheck` | **0 errors** |
| Frontend unit | `TZ=UTC npm test -w frontend` | **3155/3155**, 255 files |
| Backend unit | `npm test -w backend` | **2658 passed, 19 skipped**, 140 files |
| Mobile unit | `cd apps/mobile && npx jest` | **1252/1252**, 49 suites |
| Mobile typecheck | `cd apps/mobile && npm run typecheck` | **0 errors** |
| Build | `npm run build -w frontend` | success |
| Bundle ceiling | `node scripts/check-bundle-size.mjs` | **PASS** — 756.2 KB gz total (770) · entry 65.6 (92) · pdf 95.4 (110) |
| Copy budget (web) | `node scripts/gates/copy-budget.mjs` | **CLEAN** |
| Copy budget (mobile) | `node scripts/gates/copy-budget-mobile.mjs` | **CLEAN** |
| Dead code ratchet | `PATH=<pinned tools> bash scripts/deadcode/check.sh` | **0 regressed**, 2 improved, baseline re-pinned (knip 227 / jscpd 191 / depcruise 0) |
| Design gates | colors / raw-css / icons / motion / tokens / csp | **all PASS** |
| Stylelint ratchet | `bash scripts/gates/stylelint-gate.sh` | **green** (errors 45→40, `!important` 52→41, raw z-index 79→68, raw hex 36→29) |
| Conformance | `node scripts/conformance/run.mjs --url :5344 --gate` | **PASS** — floor 91.6, 10 mapped sections × 5 breakpoints |
| E2E landing + shell | `npx playwright test r308-landing-instruments r319-shell-chrome r319-shell-states` | **27/27** (11 + 16) |
| Conformance — chrome (after the local rail commit) | `run.mjs --sections chrome --bps 1440,390 --gate` | **PASS** — 94% @1440, 88% @390, 91.8% total (scoped run is report-only) |

### Checks NOT run here (declared, not implied)

* The full 177-test hermetic E2E suite and the iOS WebKit project — WebKit is not
  installed on this machine; both run in CI on the PR head.
* `db-integration` — needs a disposable localhost PostgreSQL; not provisioned here.
* Mobile Maestro flows and the Android/iOS builds — they require the emulator
  rig and EAS credentials; the workflows run on push.
* Lighthouse / axe sweeps — no measured numbers claimed in this report.
* Conformance used the locally available Chromium build (`1248`) under a
  compatibility symlink for the `1223` build the instrument requests; the gate
  verdict is a >= floor comparison, but the browser build is not the CI one.

---

## 6 · Security review notes

The r363 hardening branch was reviewed and its own regression suites run as part
of the backend suite (2658 green): `r363-auth-hardening` (reset/verification
takeover, devInbox + seed production gates, APP_ORIGIN reset links,
institution-bound links), `r363-tenancy-governance` (membership tenant context,
governance write scoping, import IDOR), `r363-lectures-serving` (lecture
media/transcript authorization, presigner binding). No assertion was relaxed and
no authorization path was weakened to make anything pass.

The integrator's own addition (`requestId`) is covered by 3 new tests that pin
the injection boundary: an inbound `x-request-id` is adopted only when it is a
bounded `[A-Za-z0-9._-]{8,128}` token.

---

## 7 · Database and migrations

No schema change, no migration, no seed run in this round. The production schema
was reported by the ops audit as matching the repository's 48 migrations; that
finding is **their** measurement, re-stated here as provenance, not re-verified
by this round.

---

## 8 · Product state carried by this candidate

* **Navigation** — five roles, census 34 / 23 / 15 / 13 / 16 preserved; the
  grouped collapsed-family contract kept; guard belt grown to 30 tests. The ≤8
  destination spine was adopted only where it already held (ADMIN 6, QUALITY 4,
  OWNER 5) and rejected for STUDENT/TEACHER on measured evidence.
* **Design system** — one token architecture (`shared/design-tokens.json` →
  generated CSS → hand-authored seats). No second model was introduced; the
  generated files were never hand-edited.
* **Landing** — the concepts band (drawing language made explicit) plus the r359
  technical sheets and r360 plates; JS-off and reduced-motion both ship the
  finished drawing by construction (progress vars default to 1).
* **Web product** — 126-row route sweep with a structural `App.tsx` parity pin,
  AI code rendering + Escape cancellation, PDF drop validation, document viewer
  fixes.
* **Mobile** — five roles, settings reachable from the three profile-less shells,
  exam exit confirmation, quality sector tools; 1252 unit tests green.

---

## 9 · Production readiness — external blockers (honest status)

The R363 audit's live findings were **not** re-verified from this machine (it has
no authenticated Vercel/Neon/Resend access); they are carried forward as the
audit's own measurements. Two of them were repository-owned and are now fixed in
code (§3.3). What remains is configuration only an owner with credentials can do:

| # | Blocker | Severity | Owner action |
|---|---|---|---|
| 1 | Runtime failure blindness — no external error tracking; 5xx visible only in the OWNER console | P0 | Choose an error-tracking service; add a DSN as a deployment secret |
| 2 | Transactional mail dead — Resend `onboarding@resend.dev` test sender, domain unverified, 118 dead-lettered mails | P1 (launch blocker) | Verify the sending domain in Resend, set the from-address, drain the dead-letter queue |
| 3 | Ungated production deploys — every `main` push deploys immediately; no branch protection / rulesets | P1 | Enable the ruleset (§10) |
| 4 | No scheduled off-site retained backup | P1 | Schedule `db-backup` + an off-site copy; prove one restore |
| 5 | Render standby suspended; rollback recipe contradicts itself; window lapses ~2026-11-28 | P1 | Renew or retire the standby deliberately |
| 6 | ~~No request correlator~~ | fixed in code (`85ab2a70`) | — |
| 7 | Monitoring cadence starved by GitHub cron | P1/P2 | Move to an external scheduler or accept the cadence in writing |
| 8 | ~~No security headers on the SPA document~~ | fixed in code (`85ab2a70`) | Redeploy to ship (see §11) |
| 9 | Repo homepage metadata still points at the suspended Render origin | P2 | One settings change: `https://madarek-app.vercel.app` |

**Verdict: the code release is integrable; the production service is not
"ready" in the unrestricted sense.** No backup, mail delivery or recovery is
claimed here.

---

## 10 · Promotion to `main`

The candidate is pushed as `integration/r364-final-main` and opened as one PR
against `main` with the verification table above. `main` promotion is **not
claimed** by this report unless §12 says so; the PR head is the release
candidate, and the merge waits for the CI matrix on that exact SHA.

Branch protection (recommended, owner-applied, using the check names from the
`ci.yml` jobs — never invented here): require `lint`, `typecheck`, `build`,
`test-frontend`, `test-backend`, `db-integration`, `e2e`, `ios-webkit`,
`design-gates`, `conform-gate`, `surface-drift`, plus `size-gate` and the dead-code
job, with "require branches to be up to date" on.

Cleanup is deliberately deferred until after `main` verification: deleting
`agent/r362-*`, `agent/r363-*`, `integration/r362-final-unification` and
`integration/r364-final-main` is safe only once every accepted commit is an
ancestor of `main`. `gh-pages` is retained (publishing), and all tags are kept.

---

## 11 · Provenance

| | |
|---|---|
| Base | `origin/main@8f38b154` |
| Candidate code head verified | `integration/r364-final-main@1c75d7cc` (48 commits ahead of base) |
| Node / npm | 22.22.1 / 9.2.0 |
| Conformance browser | Chromium 1248 (symlinked to the instrument's expected 1223) |
| Conformance target | this worktree's own vite `http://localhost:5344` |

Deployment state: **not verified in this round** — no deploy was triggered and
no Vercel/Render credential was used. The security-header fix and the request-id
header reach production only on the next deployment of the merged commit.
