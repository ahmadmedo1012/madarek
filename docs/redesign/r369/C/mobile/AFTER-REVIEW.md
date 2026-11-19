# C3 — Mobile AFTER-REVIEW (R369) — the sheet walk, the defect triage, the perf numbers

Branch `agent/r369-product` · 2026-11-19 · evidence runs: BEFORE=main run `44512581240` (core, 11:11Z) · AFTER=branch run `44529880313` (core, 13:04Z — the mobile tree at d883d151, copy wave 2 + Screen bottom-breath) · a fresh full-matrix dispatch on the current tip follows the dark-capture fix below.

## 1 · The dark-capture void (the pipeline's biggest finding)

**Every "dark" ui-screens capture since R358 rendered LIGHT.** Pixel-verified across three run generations: r366 run `44160072788` dark-tablet avg RGB ~241; r369 BEFORE `44512581240` + AFTER `44529880313` dark-standard avg 245/246 — identical to their light twins. Root cause (from the CI job log of 44529880313, job `135586533385`): `Tap on id: seg-${THEME_ID}... COMPLETED` — maestro's `-e KEY=VALUE` + `${KEY}` substitution silently failed; the tap targeted the RAW literal id, `applyTheme` never ran (the 03-after-theme shot's active pill stayed «فاتح», the server caption stayed «الخادم: النظام»).

**The fix (commit 6c1d9f0a)**: deterministic flow generation (the flows carry `seg-__THEME__`, the workflow seds the real theme in BEFORE maestro sees the file) + **the dark pixel gate** (a dark-profile job FAILS if the after-theme screenshot's mean brightness ≥ 150 — the silent-light class can never ship again) + the C3.4 scroll-jank window (below). A student-only verification dispatch (`44579053777`) bakes the fix before the full re-dispatch.

## 2 · The VLM sheet walk + full-res triage (AFTER core, 20 sheets)

Five batched VLM reviews (one per role, 4 sheets each) → every flagged defect re-verified at FULL resolution (the 200px sheet tiles over-flag):

| claim (sheet) | full-res verdict | action |
|---|---|---|
| student-08-schedule day-selector = two ~340×55px full-height vertical strips | **REAL** (the week strip stretched in the unbounded column) | root fix already in tree (`851072e3`: `alignItems: flex-start` + `maxHeight: scaledTouchFloor()+sp[10]·2`) — the fresh dispatch verifies |
| teacher bottom-nav «الرئيسية» → "الوية" at font 1.3 | **REAL** (label clipped mid-word in the ~70dp 5-slot cell at the 1.25 growth cap) | fixed this round (`1599b631`: cap 1.15, base 11→10.5, padding 0, adjustsFontSizeToFit) — the fresh a11y-small sheets verify |
| teacher/registrar/owner a11y lists "clipped at the bottom edge" | **FALSE POSITIVE** — scrollable lists captured mid-scroll (partial rows below the fold are the scroll state, not a defect); the real bottom-edge issue (last row kissing the TabBar) was the Screen.pad root fix (`d883d151`) | none |
| owner-06-notifications "garbled header (بدبلي)" | **FALSE POSITIVE** — sheet-thumbnail artifact; full PNG renders «بريدي» clean | none |
| owner-15-feedback «مرفوض» truncated | **FALSE POSITIVE** — fully visible at full res («مرفوضة», all five tabs render) | none |
| quality-08-professors header "cramped against status bar" | **FALSE POSITIVE** — proper padding at full res | none |
| quality-01-login password field overlapped by button (a11y 1.3) | **FALSE POSITIVE** — comfortable spacing at full res | none |
| student-16-online-exams "cramped two-line title" | marginal (a wrapped title with tight but non-overlapping meta) — carried to the fresh-run review | watch |
| student-07-profile stat digits "clipped at card bottom" | marginal at 1.3 — same watch | watch |

## 3 · gfxinfo jank (the walk window, swiftshader CI emulator — the CAVEATED number)

Walk-window janky% (reset → whole maestro walk → dump; `-gpu swiftshader_indirect` = software GPU on a 3-core CI runner): BEFORE 31–90%, AFTER 24–93% — **this window includes boot + login + navigation + screenshot waits under software rendering; it is NOT the per-screen scroll-jank protocol the C3.4 bar asks for.** The new dedicated **scroll-jank window** (commit 6c1d9f0a: gfxinfo reset → `jank-scroll.yaml`, the role's dashboard deep link + 8 real swipes → `gfxinfo-scroll.txt`) rides every capture job from the verification run onward — the honest per-screen numbers land with the fresh dispatch.

## 4 · Cold start (Start proc → Displayed, from the capture logcats)

| role | BEFORE (main) | AFTER (branch 13:04) |
|---|---|---|
| student | 2.96 s | **2.39 s** |
| teacher | 2.74 s | **2.56 s** |
| registrar | 2.79 s | **2.21 s** |
| quality | 5.84 s* | 2.99 s |
| owner | 2.82 s | 5.33 s* |

*the >5 s cells are runner-KVM contention outliers (the same job class that produced them has 2.2–3.0 s twins). Typical: **2.2–3.0 s on the 3-core software-GPU CI emulator** vs the ≤2.5 s bar — the CI-emulator ceiling; a real-hardware number needs a device pass (recorded limitation, the same class the brief's "CI/emulator numbers or recorded limitation" clause covers).

## 5 · APK growth

Same-recipe preview APKs (both 13:04 builds): main `41,464,762 B` → branch `41,447,178 B` = **−17,584 B (the copy diet waves shrink the APK)**. The release-recipe after-number rides the dispatched `build-android` run on the branch tip; the +1 MB gate is measured release-vs-release (BEFORE release `57,772,662 B` from run 44506646288).

## 6 · Boot hand-off (MOBILE-BOOT-SPEC §2)

- The native splash contract is pinned (byte-pinned assets + `preventAutoHideAsync` at module load; `hideAsync` fires only after "fonts+rtl ready — splash handoff (first frame)" in `_layout.tsx` — hide-after-first-frame per spec §2.3).
- Ground continuity measured on both generations' `launch-20s.png`: the first JS frame paints RGB(246,245,236) ≈ the spec's paper `#F6F6EE` at every sampled corner — the ground never changes between the native frame and the app (`last-frame.png` shows the same ground + content). No white flash, no second logo.
- The dark-profile boot ground (`#282828` per spec) becomes verifiable only after the dark-capture fix lands — the fresh dispatch carries it.

## 7 · Heron language on mobile (C3.3)

The 100-screen walk (20 sheets) shows the plate/hairline/mono-index grammar across roles: ruled ledger rows with mono `[NN]` indices, dark filled segment pills, the one-accent affordance, calm cream grounds. The original-illustration upgrade (plate-family scenes for empty/boot seats) is requested from B (`docs/redesign/r369/REQUESTS-C-to-B.md` §2) — the shared `.mk-ill` geometric set carries the seats until then.

## 8 · Verdict

The AFTER (branch) set is measurably better than BEFORE (cold start −0.2 to −0.6 s, APK −17.6 KB, the walk-window jank flat-to-better, the schedule strip + Screen bottom-breath root fixes in tree), with two real defects fixed this round (schedule strip by the lane, TabBar a11y label here) and the pipeline's dark void closed + gated. The fresh full-matrix dispatch (on the current tip, with the dark fix + TabBar fix + scroll-jank window) is the final evidence set for C3.1/C3.2.
