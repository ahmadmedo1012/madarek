# R357-UI — resume log (UI lane, visual only)

Branch `wip/r357-ui` from `main` @ `dce338aa`. Code/commits English, chat Arabic.
Rule: no copy/route/logic/API changes; ratchets only improve; string parity with
`main` must stay identical.

## A1 — environment + harness
Mobile jest now runs on this clone: `npm ci` inside `apps/mobile` (its own
lockfile; nothing was added or changed in the repo to make it pass).
**49 suites / 1250 tests pass** — the same 1250 CI reports, so the round-2
"UNVERIFIED on device because jest cannot boot" blocker is closed without
touching a dependency.

## A2 — menus & navigation (measured)
`scripts/qa/nav-audit.ts` (new) compares the three menus per role — `lib/nav.ts`
(sidebar/drawer), `layout/BottomNav.tsx`, the app's `shell/roleTabs.ts` — and
reports default visible rows, duplicate reachability, icon drift, label
variants and path-prefix nesting → `audits/evidence/r357/nav-audit.md`.

| role | destinations | default visible rows before → after | icon drift before → after |
|---|---|---|---|
| STUDENT | 34 | 19 → 19 | 4 → 0 |
| TEACHER | 23 | 23 → 12 | 5 → 0 |
| ADMIN | 15 | 15 → 7 | 5 → 0 |
| QUALITY | 13 | 13 → 5 | 5 → 0 |
| OWNER | 16 | 16 → 7 | 4 → 0 |

- Icon drift fixed at the source: the mobile tab bar now imports the same
  lucide glyph each route carries in `nav.ts` (bot, brain, calendar, network,
  graduation-cap, school, file-text, list-checks, radio, shield-check,
  circle-user). One glyph per destination across every menu.
- Visible rows cut with the mechanism that already exists (the student
  drawer's r183-B7 accordion): four low-frequency families now collapse to a
  toggle row in the teacher/admin/quality/owner sidebars, auto-expanding while
  one of their routes is the active page.
- Label variants (bar short form vs sidebar full name) are by design (5-B5
  "shortening is fine, renaming is not") and are reported separately.

### The ≤7 target: what is reachable and what is not
Admin 7 · quality 5 · owner 7 hit ≤7. Teacher sits at 12 and student at 19
because **existing pinned tests forbid going lower**:
`frontend/tests/unit/nav-coverage.test.ts` requires 12 named high-frequency
routes to stay always-visible, and pins the student's four collapsed families
and 34-destination census. Student has 7 groups, so even fully-collapsed it
would show 7 toggle rows. Reaching ≤7 for student/teacher means deleting that
spine contract — an IA + test decision for the main agent, not a visual one.
Recorded in `COPY-REQUESTS.md` as a decision request, not silently ignored.

## A3 — component consistency


## A4 — typography / icons / brand

## A5 — mobile UI + CI-emulator evidence
- `apps/mobile/.maestro/screens-student.yaml` — walks the student shell
  (login → the five tabs) and screenshots every stop.
- `.github/workflows/ui-screens.yml` — **manual dispatch only**: takes the
  x86_64 APK the Android release workflow already built and verified
  (`android-release-candidate` artifact, no rebuild, no re-sign), boots the
  same API-34 emulator image, runs the flow, uploads `ui-screens-<n>`.
- Status: written and pushed, **not executed** (this box has no emulator and
  the workflow cannot run until dispatched). `navigator`/`adb` evidence stays
  owed until a dispatch produces the artifact — reported as such, not claimed.

## A6 — landing & public pages
The «[04] المكتبة» collision at 1024×600 (open since round 2) is fixed at the
callout, not at a measured parameter: `@media (min-width:992px) and
(max-width:1439px) and (max-height:700px)` moves `.jt-anno-2` one rung up
(75.7% → 70.2%) in the short tablet window only. Probe at 1024×600, scroll
5040: the card's mono title (right edge x=618) sat on the plan's
«المكتبة والبحوث» label (x 596–693, y 1988–1998) — a 22×10px kiss.
Re-measured after the change at 1024×600 **and** 1024×768: text-on-text 6 → 0,
stops-with-defects 2 → 0. Frozen hero/conformance seats untouched.

## A7 — hover / focus / contrast
Contrast gate: **14 findings → 0**, with the two justified exceptions handled
the honest way instead of being blurred:
1. the `.st-pill` "false positive" (4 findings) was **the probe's fault** — it
   measured the `<a>`'s accent colour while the label is painted by a `--text`
   span. The gate now measures the colour of the PAINTED TEXT NODE and the
   effective background of that node (walking ancestor wipe slabs), which is
   the honest subject. Result: /__design 0, /auth 0, / 0 real findings.
2. the Heron hero seat (10 findings) is a **named exemption**,
   `scripts/r323/contrast-exemptions.json`: measured 3.46:1 light / 3.93:1 dark
   hover, `--accent` ink on paper, frozen by the landing conformance record.
   The gate still sweeps it, still writes it under `exempted`, and prints drift
   when the measured value stops matching the documented one.

## A8 — closing gate
- `stylelint-gate.sh`: ratchet green (stylelint errors 45 = baseline, warnings
  68 vs 57 tracked-not-enforced; important 41, raw-z 66, raw-hex 35 — all held
  or down).
- `check-colors.sh --strict` ✓ · `check-raw-css.sh --strict` ✓ ·
  `css-counts` unchanged (76 files).
- frontend build ✓ (bundle measured in the merge report).
- nav unit suite (nav-coverage, r305-nav-maps, route-titles, rename-belt):
  78/78 ✓. Mobile jest 1250/1250 ✓.
- contrast gate PASS (0 findings, 10 documented exemption hits) —
  `audits/evidence/r323/contrast-gate.json`.
- stress/overlap on the changed landing seat: 0 at 1024×600 and 1024×768.

## Part B — merge
