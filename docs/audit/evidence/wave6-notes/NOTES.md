# Wave 6 notes — r368 Task 6-a (wave 1) session log

Worktree `/home/z/wt/r368-t6`, branch `wip/r368-t6` (base `76de5a8c`).
Instrument: `scripts/conformance/pages-{student,teacher}.mjs --url http://localhost:5306/`
(own vite `5306 --strictPort`, hermetic e2e fixture transport; hermetic stub API on :4000
for manual browsing). All numbers below are MY OWN runs from this tree.

## N1 · Student family — /training + /achievements lifted off the floor

**Baseline (committed `dc046b26`, see `baselines/pages-student-light+dark-2026W1.json`):**
`/training` 96.7 @1440 / **80.0 @390** (light + dark); `/achievements` same. Axes:
pattern 80 (page-family numeral absent) + hover 0 @390 (no header CTA at small widths).

**Root cause (both routes):** the r333 batch-A sweep (`ca5a5ad0`) deleted the
training/achievements/gamification ANATOMY rules from the shared `training.css`
(level band, badge grid/tiles, leaderboard rows, tier orb, XP track, achievement
rows, reward banner, `.cp-*` row helpers) as "0-live-match" — but the sweep probed
routes whose `/training/me*` queries had NO fixtures, so those nodes rendered
nothing on the measured pages while the markup kept consuming the classes. Every
data-state surface since shipped unstyled (VLM evidence:
`screenshots/training-full-before-1440.png` — level band = stacked bare text, no
orb, no bar; `screenshots/achievements-full-before-1440.png` — badges = plain
list). The header-CTA/pattern-numeral axes failed because the only CTA lived in
the (unstyled) level band and the numeral was never drawn.

**Fix (smallest change, verbatim restoration):**
- NEW sheet `frontend/src/styles/student/training-anatomy.css` — the pre-r333
  rules restored verbatim (`ca5a5ad0^`, tokens only, same `@layer pages`, same
  order except one adjacent swap for stylelint no-descending-specificity). Not
  restored: selectors r333 kept in `training.css` (`.leaderboard-rank`, the
  `.badge-tile-rarity` earned/locked variants, `.cert-row`) — duplicate-selector
  ratchet. Reduced-motion off-switches restored with them.
  `training.css` itself is a SHARED sheet (competitions/colleges import it) and
  outside this task's ownership — hence a new task-owned family sheet.
- `pages/student/TrainingPages.tsx`: the «عرض الإنجازات» ghost CTA moved from
  the level band into the `PageHeader` actions seat (primary, sm) so it survives
  every state + width; `index="01"` numeral added to both page headers
  (the family contract — CatalogPage idiom). `AchievementsPage` gains the
  reciprocal «تصفّح المسارات» header CTA.
- `pages/student/{MorePages,ProfilePage}.tsx`: import the restoration sheet (they
  consume `.tier-orb`/`.xp-*`/`.leaderboard-*`/`.achievement-*`).

**After (own stack, 1440/390, light + dark identical):**

| route | before | after |
|---|---|---|
| `/training` | 96.7 / **80.0** | **99.5 / 100** |
| `/achievements` | 96.7 / **80.0** | **100 / 100** |

Full family re-measured light + dark (all 32 harness routes):
worst W1-owned cell 97.5 (`/student/university` @390 dark); every other W1 cell
≥ 98.0. Snapshots: `baselines/pages-student-after-{light,dark}-2026W1.json`.
`/vision` 96.7/80 is a T5-owned file — recorded in the handoff (§N4), not fixed.

**Gates:** focused vitest (7 files, 84 tests) green; root `npm run typecheck`
green; `lint:css` zero NEW errors (my sheet clean); `stylelint-gate.sh` ratchet
green (errors 20 held, warnings 87 tracked).

## N2 · Residuals (student family)

- `/student/payment` 98.1 — typeRungs axis only (single-rung page); ≥ floor,
  left as-is (no token-legal change available without new type tokens).
- `/student/social` 98.4 @1440 — typeRungs; same class.
- `/student/university` darkInk 88–89 in dark (97.5–97.7 overall, ≥ floor).
- VLM noted the level-band ProgressBar reads faint at 1440 — measured score
  99.5 with spacing/pattern 100; the bar uses the shared `ProgressBar`
  primitive (`polish.css` vocabulary). No change (shared primitive, not mine).
- Cross-family: `pages/competitions` + community consume `.leaderboard-list`/
  `.cp-*` and stay unstyled until their owner imports the restoration sheet
  (T5/wave-2 handoff item, not fixed here).

## N3 · Shared app-shell pass — verification + one measured fix

**Method.** The shell already carries the r305 Heron shell layer + R313/R320/R325/
R345/R352/R353/r360 grammar (`styles/shell/*.css` discipline sheets). This wave's
shell pass was therefore a STATE audit, not a rewrite: a dedicated probe
(`/home/z/t6a/t6a-shell-audit.mjs`, same hermetic session method as the
instruments) audited the nine shell STATES the per-page matrices don't reach —
drawer-open @390 (light+dark), palette-open @390/1440, notification dropdown
@1440, collapsed rail @1440 (light+dark), plain shell dark @390/1440 — for
horizontal overflow (+ offender elements), focus-visible rings on the first 5
tab stops per state, touch targets <40px on chrome at 390, and axe
critical/serious. Plus 768 spot states (plain/palette/drawer/dark: 0px overflow
each). Result snapshot: `screenshots/audit-SHELL.json`.

**Finding (measured, fixed):** axe `color-contrast` SERIOUS on the deep band's
indicator seats in EVERY dark state — `.ind-ruler-num` numerals at **1.84:1**
on the night band (`#666663` on `#3D3D3D`, 11px). Root cause: the R327 F
override in `styles/shared/indicators.css` (AppShell-exclusive seat — caller
grep, recorded in inventory §7) mixed the deep-band fg "theme-proof by
construction", but that proof assumed the band INVERTS poles; R345 E1 re-based
the night band on the elevated rung (neutral-150 ground, neutral-800 ink), so
the neutral-0/neutral-900 mix resolved toward the wrong pole in dark. Fix: the
dark counterpart rule riding the same 72/28 recipe the band's own dark eyebrow
uses — measured after: **#B2B2AF on #3D3D3D = 4.95:1** (AA), light pole
untouched (7.7:1). All nine shell states re-audited CLEAN (overflow, focus
rings, touch targets, axe).

**Grammar verification (no change needed):** tokens — no raw values in shell
sheets (stylelint gates); density/responsive — the R353 P4 contract
(`--topbar-h`, dvh, scroll ownership, z-ladder) holds at 390/768/1440 in all
states; Arabic labels — every chrome control carries an Arabic aria-label with
`dir="ltr"` isolates on Latin runs (component scan + audit labels); focus
states — zero missing focus-visible rings across all states' tab stops
(the r162 focus-visible contract holds); reduced motion — the shell sheets'
RM belts re-verified by grep (press transforms, accordion reveal, tooltip
fades all gated).

**Gates:** shell battery 15 files / 186 tests green; route/permission battery
(App-routes, permissions-matrix, route-titles-coverage) 43 tests green;
stylelint-gate ratchet green; my-sheet clean.

## N5 · Teacher family pass + the dark-contrast harvest (resumed session)

The teacher family needed no anatomy restoration — its 21 harness routes already
carry the r305 Heron grammar (`styles/teacher/heron.css` + shared primitives);
the baseline (committed `dc046b26`) was worst-cell 99.0 light. This session
completed the family pass: the full 3-breakpoint matrix (1440/768/390) in BOTH
themes, axe on representative routes, and the two real defects the dark matrix
surfaced.

**Teacher matrix (own stack, after fixes):** 21 routes × 3 bps × 2 themes =
126 cells, worst cell **98.3** (`/teacher/ai` @768, typeRungs residual — see
N6), every cell ≥ floor 90. Light worst 98.3, dark worst 98.3. Snapshots:
`baselines/pages-teacher-after-{light,dark}-3bp-2026W1.json` (before-dark:
`pages-teacher-before-dark-3bp-2026W1.json`).

**Fix T1 — the ember seats on the night ELEVATED ground (axe serious).**
`/teacher/schedule` + `/teacher/attendance` in dark: patterns.css routes the
«today» weekday numeral (`.tpg-day[data-today] .tpg-day-index`) and the
attendance brand-tone summary value through `--accent-ink`, which the generated
night tokens set to **#FF6B33 — documented 4.79:1 on --surface but 4.32:1 on the
worst RAISED surface these seats sit on** (#353535 today card / summary strip);
axe `color-contrast` SERIOUS. Fix: two unlayered night rules in
`styles/teacher/heron.css` routing both seats through `--accent-strong`
(the tokens' own light ember tier #FFC5AE — **8.09:1 measured on #353535**).
Measured: schedule dark 99.6/99.3/99.6 → **100/99.7/100** (darkInk 97.8→100),
attendance dark 99.4/99.2/99.4 → **100/99.8/100** (darkInk 96.7→100); axe clean
@768 dark. Light untouched (verified). NOTE for wave 2: quality/exams pages
import this sheet and share the `.tpg-` grammar — they inherit the fix.

**Fix S1 — the student deep-band children's NIGHT pole (axe serious).**
`/student/{profile,gamification,university}` in dark: the r305 supplemental
sheet (`styles/student/heron-supplemental.css`) hardcodes the LIGHT pole
(`--neutral-0` + mixes) for the deep-band children (profile hero name/mail/
meter, gamification level title/sub/foot, university fact labels/values) —
"theme-proof by construction" only while the band pole-INVERTED. R345 E1
re-based the night band on neutral-150 + neutral-800, and every seat went
dark-on-dark: **#2E2E2E on #3D3D3D = 1.25:1**, axe serious ×3 pages. Fix: a
§9 night-pole block mirroring the E1 recipe (neutral-800 + the same 85/72 mix
strengths toward neutral-150; measured 8.21 / 6.47 / 5.11:1), plus the meter/
xp-track translucent wells and the ghost-retry border/hover re-poled.

**Fix S2 — the level medallion (light, 1.09:1).** `/student/gamification`
light: the `.tier-orb.lg` numeral measured **white on #F6F6EE = 1.09:1**. Two
stacked causes: (a) the guest-root grammar `.lg:not(.btn)` (patterns.css §G,
same (0,2,0) in @layer pages but an earlier import) repaints the `.lg` size
variant as guest paper (`--bg` ground, `--text` ink, sans); (b) the shared
`.tier-orb` recipe (training-anatomy.css) mixes toward the PAGE poles, which
the deep band re-derives to the band's light pole — light-on-light. Fix: a
band-scoped `.r305g-level .tier-orb` seat in heron-supplemental.css (same
layer, later import — wins the tie) re-poles the medallion like the xp-track
(translucent pole well + band-pole numeral + tier ring + mono re-assert), with
the night counterpart in §9. VLM-verified both themes (screenshots
`gamification-after-{light,dark}-1440.png`; `vlm-*` responses on file).

**Student before/after (this session, 1440/390):**

| route | light before → after | dark before → after |
|---|---|---|
| `/student/profile` | 99.1/99.1 → 99.1/99.1 (unchanged, ink 100) | 98.4/98.4 (ink 96) → **99.1/99.1 (ink 100)** |
| `/student/gamification` | 99.1/99.0 (ink 98.6/98.3) → **99.2/99.2 (ink 100)** | 99.1/99.0 (ink 98.6/98.4) → **99.4/99.2 (ink 100)** |
| `/student/university` | 99.5/99.5 → 99.5/99.5 (unchanged, ink 100) | 97.7/97.5 (ink 88.9/88.0) → **99.5/99.5 (ink 100)** |

axe re-run in dark on all three + `/teacher/{schedule,attendance}`: **clean**
(critical/serious zero). Light spot-runs unchanged. Full-family student dark
matrix not re-run wholesale — the three touched routes re-measured; the other
29 routes' committed after-dark cells (`pages-student-after-dark-2026W1.json`)
are untouched by [data-theme='dark']-scoped + band-scoped rules that no other
route mounts (`.r305g-level`/`.r305u-fact`/`.r305p-hero` are single-page seats;
`.tpg-*` is teacher/quality-only).

**Gates (this session):** root `npm run typecheck` green; focused vitest 17
files / 204 tests green (route/permission battery 4 files/67 + teacher battery
10 files/137); `lint:css` zero NEW errors (my three sheets clean; repo held at
20 errors — all pre-existing, none in my regions); `bash
scripts/gates/stylelint-gate.sh` **ratchet green** (baseline held).

## N6 · Residuals (teacher family + shared)

- `/teacher/ai` 98.3 @768 (worst teacher cell) — typeRungs only: the shared
  chat-surface fluid headings (26.67/40.52/19.85px clamp rungs) + the 12px
  mono micro-labels. Same systemic class as the student residuals (N2): fluid
  clamp type resolves off-rung at intermediate widths by design; no
  token-legal change without new type tokens (out of scope — tokens are
  read-only this wave).
- The 12px mono "لف" seats (avatar monograms, `UserAvatar`'s
  `Math.round(size*0.4)` formula) — shared primitive, used by every family
  incl. T5 files; off-rung by construction. Handed to the owners, not fixed.
- `/teacher/{messages,library,alerts,community}` 98.3–99.0 @768 — same
  typeRungs class on the shared seats.
- `.tier-orb` on-band ignores the parent's `--tier-color` (the orb's own
  `--tier-color: var(--accent)` default shadows the inherited inline value) —
  pre-existing since the r305 markup; verbatim-restored behavior, left as-is
  (the ring reads accent ember, the numeral band-pole).
- `[data-empty]` presence-matching (`:where([data-empty])` matches
  `data-empty="false"`) — pre-existing markup/CSS mismatch; harmless now (the
  band-scoped seat outranks it) but the OFF-band orb would paint its empty
  recipe when full; only consumer (`/training` catalog Card orb) sets no
  `data-empty` attribute, so no live surface is affected. Recorded for the
  anatomy owner.

## N4 · Wave-2 handoff (files NOT touched this wave)

See `inventory.md` §3–§5 for the full route lists. Current measured state of the
shared seats wave 2 will inherit: AlertsPage (student harness) 99.5/99.4 ·
`/community` 99.0/99.5 · `/settings` 98.0/97.9 (typeRungs-only dips 87.7/87.3
on that axis — fluid headings, N6 class) · AiAssistantPage 99.3 ·
LibraryPage 99.2/99.0. `/vision` 96.7/80.0 (pattern 80 + hover 0 @390 — same two
axes /training had) is T5-owned. Wave-2 families to measure + pass:
admin (16 routes), owner (15), quality (10), exams (3 seats). Wave 2 also
inherits: the `.tpg-` dark ember fix (quality/exams import teacher/heron.css)
and the §9 night-pole recipe as the pattern for any deep-band children their
pages mount.

---

# Wave 6 notes — r368 Task 6-b (wave 2) session log

Worktree `/home/z/wt/r368-t6`, branch `wip/r368-t6` (base `c0e3fbef` — wave 1
landed). Instruments: `scripts/conformance/pages-{owner,quality,registrar,admin}.mjs
--url http://localhost:5306/` (own vite `5306 --strictPort`, hermetic seeded
session + mock transport — no backend). All numbers below are MY OWN runs from
this tree. `PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers` for every browser run.

## N7 · Owner family (14 mounted routes) — baseline matrix + one ink fix

**Baseline (pre-fix, committed with this note:
`baselines/pages-owner-before-{light,dark}-3bp-W2.json`):** 14 routes ×
{1440,768,390} × {light,dark} = 84 cells, worst cell **98.4** — every cell ≥
floor 90 with no work done. The r305/r341 grammar (`styles/owner.css` +
`styles/shared/heron-admin-owner.css`, the `.r305ao` scoped sheet) already
carries the family. Commands:

```
node scripts/conformance/pages-owner.mjs --url http://localhost:5306/ \
  --routes /owner/dashboard,/owner/realtime,/owner/users,/owner/institutions,\
/owner/institutions/zu,/owner/activity,/owner/content,/owner/system,\
/owner/education,/owner/ai,/owner/notifications,/owner/alerts,/owner/governance,\
/owner/feedback --bps 1440,768,390           # light, then again --dark
```

| route | light 1440/768/390 | dark 1440/768/390 | note |
|---|---|---|---|
| dashboard | 100/99.8/100 | 100/99.8/100 | |
| realtime | 100/99.5/100 | 100/99.5/100 | |
| users | 98.8/98.6/100 | 98.8/98.6/100 | typeRungs 93/92 @1440/768 — avatar monograms (N6 class) |
| institutions | 100/99.7/100 | 100/99.7/100 | |
| institutions/zu | 100/99.8/100 | 100/99.8/100 | |
| activity | 100/99.7/100 | 100/99.7/100 | |
| content | 100/99.5/100 | 100/99.5/100 | |
| system | 99.7/99.4/99.7 | 100/99.7/100 | **light darkInk 98 — the fix below** |
| education | 100/99.8/100 | 100/99.8/100 | |
| ai | 100/99.8/100 | 100/99.8/100 | |
| notifications | 99.5/**98.4**/99.4 | 99.5/**98.4**/99.4 | shared AlertsPage (W1 file) @768 typeRungs 90 |
| alerts | 100/99.6/100 | 100/99.6/100 | |
| governance | 100/99.8/100 | 100/99.8/100 | |
| feedback | 100/99.7/100 | 100/99.7/100 | |

**Fix W2-O1 — the alert counter on the rose fill (light, 4.42:1).**
`/owner/system` light: the page-title alert counter (`.owner-badge-counter`,
OwnerSystemPage) paints `--warm-ink` #191918 on `--danger` #E5481F — the T3-F4
comment predates the R366 danger re-tune and its 5.51:1 math no longer holds:
**measured 4.42:1**, darkInk axis 98. Fix: the tokens' own label-on-danger seat
`--danger-fg` (#101010, 4.78:1 — tokens.css documents this exact pair), one
declaration in `styles/owner.css` (owner-exclusive class; caller grep: only
OwnerSystemPage renders it). Dark unchanged (night `--danger-fg ≡ --warm-ink`,
7.81:1 documented). Re-measured: system light 100/99.7/100 (darkInk 100 all
bps), dark 100/99.7/100 — darkInk 100 both themes. Full post-fix matrices:
`baselines/pages-owner-after-{light,dark}-3bp-W2.json` (family worst cell
unchanged at 98.4 — the shared AlertsPage @768 cell; every W2-owned cell
≥ 98.6).

**Axe (post-fix):** `/home/z/t6b/axe-owner.mjs` (the instrument's hermetic
OWNER session + axe-core 4.10.3 injected; script outside the repo, wave-1
`t6a-shell-audit.mjs` precedent) on 6 representative routes × {1440,390} ×
{light,dark} = 24 audit cells — **critical/serious zero everywhere**
(`screenshots/audit-OWNER.json`).

**Overflow probe:** all 14 routes × {1440,768,390} — horizontal overflow zero
(`screenshots/overflow-OWNER.json`). VLM spot-check on the fixed seat
(`screenshots/vlm-owner-system-light.json`): layout coherent; its "prefer
white digits" note is REJECTED by measurement — white on #E5481F ≈ 3.9:1
(fails AA at 13px), the shipped --danger-fg 4.78:1 passes.

**Gates:** route/permission + owner battery 10 files / 105 tests green
(App-routes, permissions-matrix, route-titles-coverage, nav-routes-consistency,
Owner* unit files) — unchanged files, unchanged assertions; root
`npm run typecheck` green; `lint:css` zero NEW problems (owner.css clean;
repo held at 20 errors/86 warnings); `bash scripts/gates/stylelint-gate.sh`
ratchet green (baseline held).

**Residuals (owner):** `/owner/users` typeRungs 93/92 @1440/768 — the
UserAvatar monogram seats (14px/12px Geist Mono, `Math.round(size*0.4)`),
N6's shared-primitive class, out of ownership (components/UserAvatar);
`/owner/notifications` @768 98.4 — the shared AlertsPage (W1 file) on the
same N6 fluid-heading class; both ≥ floor.

## N8 · Quality family (10 routes) — baseline matrix, verification pass, zero fixes needed

**Baseline (committed with this note:
`baselines/pages-quality-before-{light,dark}-3bp-W2.json`):** 10 routes ×
{1440,768,390} × {light,dark} = 60 cells, worst cell **98.4** — every cell ≥
floor 90, dark mirrors light cell-for-cell, darkInk **100 on every cell in
both themes**. The r305/r341 grammar (`styles/teacher/heron.css` — the
`tq-/qlt-/oex-` family seats — + shared primitives) already carries the
family; NO code change was required. Commands (both themes):

```
node scripts/conformance/pages-quality.mjs --url http://localhost:5306/ \
  --routes /quality/dashboard,/quality/courses,/quality/professors,\
/quality/engagement,/quality/reports,/quality/curriculum,/quality/notifications,\
/quality/alerts,/quality/exam-moderation,/quality/community --bps 1440,768,390
  # light, then again with --dark
```

| route | light 1440/768/390 | dark 1440/768/390 | note |
|---|---|---|---|
| dashboard | 100/99.8/100 | 100/99.8/100 | |
| courses | 100/99.7/100 | 100/99.7/100 | |
| professors | 100/99.7/100 | 100/99.7/100 | |
| engagement | 100/99.7/100 | 100/99.7/100 | |
| reports | 100/99.3/100 | 100/99.3/100 | typeRungs 96 @768 — N6 class |
| curriculum | 100/99.7/100 | 100/99.7/100 | |
| notifications | 99.4/**98.4**/99.4 | 99.4/**98.4**/99.4 | shared AlertsPage (W1 file) @768 typeRungs 90 |
| alerts | 100/99.6/100 | 100/99.6/100 | |
| exam-moderation | 100/99.5/100 | 100/99.5/100 | exams file (N9 measures its student mounts too) |
| community | 99.3/98.9/99.6 | 99.3/98.9/99.6 | T5 file (CommunityPages) — inherited mount |

**typeRungs residuals (all N6's systemic class, exact failing seats):** the
12px Geist Mono avatar monograms («عب», UserAvatar's `Math.round(size*0.4)`
formula, shared primitive, out of ownership) on dashboard/courses/professors/
engagement/reports/curriculum/alerts/exam-moderation @768; the fluid clamp
Alexandria headings resolving off-rung at intermediate widths (40.52px
«الإشعارات», 26.67/25.78px «آخر الإشعارات», 19.85px @390 — AlertsPage;
31.5px «[01]المجتمع الجامعي», 27.63px, 25.78px «الإعلانات» — community, T5
file). No token-legal fix without new type tokens (tokens read-only this
wave).

**`.tpg-` dark ember inheritance (verified, not re-fixed):** quality/exams
pages import `styles/teacher/heron.css` for the family grammar but mount NO
`.tpg-` seats themselves (grep: the only `tpg-` mention in the family is the
sheet-header comment in QualityPages.tsx:35) — the N5-T1 fix has no seat to
cover here, and the dark matrix's darkInk 100 across the family is the
measured proof the sheet cascade is clean in dark.

**Axe (post-baseline):** `/home/z/t6b/axe-quality.mjs` (the instrument's
hermetic QUALITY session + axe-core 4.10.3 injected; script outside the repo,
the N7 axe-owner precedent) on 5 representative routes (dashboard, professors,
reports, exam-moderation, alerts) × {1440,390} × {light,dark} = 20 audit
cells — **critical/serious zero everywhere** (`screenshots/audit-QUALITY.json`).

**Overflow probe:** all 10 routes × {1440,768,390} — horizontal overflow zero
(`screenshots/overflow-QUALITY.json`).

**VLM spot-check (verification, no fix):** reports + exam-moderation @1440
light+dark (`screenshots/vlm-quality-{reports-light,exam-moderation}.json`).
Its two FAIL notes are both REJECTED by measurement, the N7 precedent: (a)
«the brand course chip is dark-on-dark illegible» — the
`.oex-mod-meta .badge.brand` seat measures **6.10:1** light
(rgb(163,36,0) on rgb(252,227,217)) and **9.51:1** dark
(#FFC5AE on #432015), AA-clean both themes (corroborated by darkInk 100 +
axe clean); (b) «the export card looks like a stub» — it IS the honest
pending disclosure («التصدير قيد التطوير», QualityPages.tsx:1692, the
documented D10 copy), a content state, not a visual defect. The minor
spacing notes (gap above «قائمة الانتظار», header CTA alignment) measure
spacing 100 at every bp.

**Gates (no code changed — confirmation runs):** quality battery 13 files /
139 tests green (App-routes, permissions-matrix, route-titles-coverage,
nav-routes-consistency, QualityDashboard, QualityPages-rosters,
ExamModerationPage ×3, OnlineExamsPages, r165a ×2, r176e) — unchanged files,
unchanged assertions; root `npm run typecheck` green; `lint:css` zero NEW
problems (no file touched; repo held at 20 errors/86 warnings);
`bash scripts/gates/stylelint-gate.sh` ratchet green (baseline held).

**Residuals (quality):** the N6 typeRungs cells listed above; both inherited
mounts (notifications=W1 file, community=T5 file) sit ≥ 98.4 — handed to
their owners, not fixed here.
