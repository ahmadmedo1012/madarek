# R362 — Final Unification: Integration Record

The integration branch `integration/r362-final-unification` is the single
baseline every r362 specialist agent branches from. This record is the
merge map, the accept/reject ledger, and the measured state of the
baseline. The Chief Integrator (Agent 1) owns this file.

## 0 · The baseline

| | |
|---|---|
| Integration branch | `integration/r362-final-unification` |
| Base (origin/main at integration start) | `8f38b154` — «docs(r357): the closing record» |
| Integration worktree | `madarek-r362-integration` |
| Source of truth for archaeology | fresh clone of `origin` (this machine had no prior local repo — see §4) |

## 1 · Branch archaeology (the complete census)

Remote heads at integration time — `main@8f38b154` (unmoved since the
audit), `feat/heronai-uiux-overhaul@79659d8d` (3 ahead / 15 behind),
`wip/r358-ui@ec712eb2` (22 ahead / 23 behind), `gh-pages@809d43d3`
(publishing only). **No third development branch exists.** The 49 PR
head refs are all prior rounds (R354 = #48, R357 = #49 — both merged;
zero open PRs). Of the archived `wip/*` tags, three are NOT ancestors
of main — `archive/wip/l2d`, `archive/wip/r343-D1`, `archive/wip/sec-map`
(Nov 7–8, R341–R343 era, 1–6 commits each, instrument-domain work):
each was inspected and each is superseded by merged rounds (sec-map's
excused double-count fix, e.g., is already in main as the r342-11
partition repair with its own fail-closed guard). If a local-only
third branch exists on the original author machine, it never reached
this clone and cannot be integrated from here.

## 2 · The merge map

### Accepted — `feat/heronai-uiux-overhaul` (cherry-picked with -x)

| Original | Integrated as | Content |
|---|---|---|
| `4dde78e0` (r359) | `4e199e27` | TechnicalSheet on the four auth surfaces + the RulerGauge RTL seal (positioning span inherits direction; `<bdi>` isolates digits only) |
| `0c60915f` (r360) | `93a314a4` | TechnicalPlate ×4 (knowledge/progress/pathway/document) on the student, quality, teacher and document-viewer surfaces |
| `79659d8d` (r361) | `9c293f1f` | the plates reach the oversight families (quality/teacher) |

Then `1eaad660` — **the heron integration seal** — pays the three debts
the branch carried (no gate weakened, no baseline re-pinned):

1. **TS18048** `r359-ruler-rtl.test.tsx(29,19)`: the `querySelectorAll[4]`
   index now sits behind a five-numeral census assert + honest guard.
2. **knip unusedExportedTypes 227→231**: the four new exported types are
   now consumed by Record-keyed variant censuses in the tests (a missing
   variant key is a compile error — a stronger contract than the branch's).
3. **jscpd duplicateBlocks 196→198**: the r359/r360 frame, grid, north
   marker, title block and surface wrapper are deduplicated into
   `sheetChrome.tsx` (`SheetSurface` / `SheetNorth` / `SheetTitleBlock`),
   byte-identical markup, public surface minimal so the knip ratchet
   stays at baseline.

### Accepted — `wip/r358-ui` (file-level selective take, net state)

| Commit | What was taken | Integrated as |
|---|---|---|
| `13f1067c` | components.css ONLY — the shared table recipe restore (`.table-wrap`, `.table`, `tbl-stack` phone cards, `.stat-strip`), pill/tab transition consolidation, card-title/state trims | `d3ab3ce1` |
| `57336576` + the emulator chain | fields.tsx Segmented testIDs, settings.tsx group numbering fix, ui-screens.yml five-role capture rig, 5 maestro role flows | `b5d58946` |
| `0eb86442` + audits | nav-audit.ts r358 seat, scripts/r358 audit + capture rigs, CHECKLIST/RESUME session docs, evidence README | `7bc6d5c9` |

**Why the CSS is a repair, not an addition:** main's components.css
still documents the Rung 1 STACK / emphasized-cell / sticky-header /
action-reveal contracts, but the r330-css dead-rule purge and r333
WAVE 7 deleted the rule bodies — 27+ pages render `.table`/
`.table-wrap`/`.tbl-stack` markup with no base styling (only scoped
islands `.r305ao`/`.hr-scope`/`.lg-*` stay styled). The r358 commit
restores the recipe the comments still promise.

### Rejected — with reasons

| Item | Reason |
|---|---|
| `72aadb7e` compact role navigation (`nav.ts` ALWAYS_VISIBLE spine + 26-item «المزيد» overflow) | Regrows the junk drawer main's r183-B6 gate documents as eliminated («no group > 9 items»); destroys the r183-B7 semantic collapsed families that already deliver ≤16 visible drawer rows at 390×844 with every route reachable; degrades desktop wayfinding; **deleted six drift-guard tests to fit** — the exact «weaken assertions to manufacture green» the R362 brief forbids. The mobile-overload GOAL (≤8 spine destinations, ≤2 interactions) is handed to the shell-nav agent as a design brief WITHIN the grouped contract. |
| `nav-coverage.test.ts` rewrite (−64 net lines, 6 guards deleted) | Part and parcel of the rejection above; main's coverage contract stands unchanged and green. |
| `13f1067c`'s nav.ts hunk (`groups[0]` guard) | Orphaned once compact nav is rejected — it guarded a `compactRoleNav` that no longer exists. |
| `_layout.tsx` `console.info("R358_BOOT", …)` | Debug diagnostic from the emulator investigation; not product code. |
| all ten evidence PNGs (~16.6 MB; nine > 500 KB) | Size gate: file ≤ 500 KB · docs ≤ 30 MB · push adds ≤ 5 MB. Evidence lives in Actions artifacts; `evidence/README.md` records the regeneration commands. |
| `archive/wip/{l2d,r343-D1,sec-map}` | Superseded by merged rounds (verified per §1). |

## 3 · Measured baseline state (all commands run on the integration HEAD)

| Gate | Command | Result |
|---|---|---|
| Typecheck (src) | `npm --prefix frontend run typecheck` | 0 errors |
| Typecheck (tests) | `npm --prefix frontend run typecheck:tests` | 0 errors |
| Frontend unit | `npm --prefix frontend run test` | **3113/3113** (main: 3094 + 19 new heron tests) |
| Backend unit | `npm --prefix backend run test` | **2617 passed, 19 skipped** (skips documented) |
| Deadcode ratchet | `bash scripts/deadcode/check.sh` | **10 at baseline, 0 regressed** (knip 227 / jscpd 196 / depcruise 0) |
| Colors | `scripts/check-colors.sh --strict` | PASS |
| Raw CSS | `scripts/check-raw-css.sh --strict` | PASS |
| Tokens | `scripts/tokens/build.mjs --check` | PASS (web/mobile/brand parity) |
| Icons | `scripts/check-icons.sh` | PASS |
| Stylelint | `npx stylelint src/styles/components.css` | 0 errors (5 pre-existing warnings) |
| Build + bundle | `npm --prefix frontend run build` + `scripts/check-bundle-size.mjs` | PASS — **754.0 KB gz total** vs 770 KB ceiling (heron branch was 754.4; the chrome extraction bought 0.4 KB back) |
| E2E (browser, full 177) | CI job «E2E (hermetic browser journeys)» on 4bdb9ae6 | **success** |
| E2E iOS (real WebKit) | CI job «E2E iOS (real WebKit, iPhone 13)» on 4bdb9ae6 | **success** — validates the retained grouped-nav contract (the r358 branch's 4 iOS failures were the compact-nav break) |
| Conformance gate | CI job on 4bdb9ae6 | **success** |
| Surface drift | CI job on 4bdb9ae6 | failed: ad-hoc-motion-duration × 444 — the tp-draw cascade consumes `--t-cinema`, whose generated value moved 720→900ms after the r164 list entry; fixed in 7f8db357 by folding the current rung per the list's own r164/r190/r331/R341 convention; detector unit tests 21/21 |

## 4 · Environment note (recorded for honesty)

The R362 brief addressed a machine whose local repository and worktrees
(`/home/rh2011/Projects/madarek*`) do not exist on this integration
host. The integration therefore runs from a fresh authenticated clone
of `origin` — every conclusion above is grounded in the remote's
advertised refs, the full object database, and the pushed CI history,
not in any unpushed local state. Nothing was overwritten anywhere; the
clone, the integration worktree, and the five agent worktrees are all
new paths.

## 5 · The agent hand-off

Five worktrees branch from the integration HEAD (see
`R362-COORDINATION.md` in this folder). No agent commits to the
integration branch; the integrator merges validated agent branches
one by one.
