# Agent C — Product (public pages · app pages · mobile) — R369 Checklist

Branch `agent/r369-product` · start `origin/wip/r368-t6` (`5925fabd`) · records `docs/redesign/r369/C/`
A box is ticked ONLY with proof on the same line (command + real output / metric before→after / artifact path).
Legend: `[ ]` open · `[x]` done (proof on line) · `[~]` in progress · `SKIPPED — reason — needs X`.
Base rule: merge `origin/agent/r369-integrate` when A's `docs/redesign/r369/BASE-READY.md` lands.

## Lane C1 — finish the authenticated web app (all 108 routes, every role)

- [ ] C1.0 CHECKLIST created (this file) from §5 role list. — PROOF: file exists on `agent/r369-product`.
- [ ] C1.1 Ledger v3 `docs/QA/page-ledger-v3.md` (108 rows) from the wave-6 inventory; per-family status columns (student/teacher/owner/quality done on t6; admin+exams+shared+auth-adjacent finished this round). — PROOF: file committed + full-matrix JSONs under `docs/audit/evidence/r369/`.
- [ ] C1.2 Admin/registrar family: ALL routes × {1440,768,390} × light+dark matrix, every cell ≥ 90, defects fixed at root. — PROOF: `pages-registrar.mjs` outputs (light AND dark runs) with worst-cell line; results JSON committed.
- [ ] C1.3 Exams family: `/student/online-exams`, `/student/online-exams/:id` (taker), `/quality/exam-moderation` × {1440,768,390} × light+dark, cells ≥ 90. — PROOF: harness outputs + JSON.
- [ ] C1.4 Student/teacher/owner/quality families re-verified on this base (3bp × light+dark worst cell recorded). — PROOF: re-run outputs (worst-cell lines per family).
- [ ] C1.5 Rubric 1–5 per page family from paired-style contact sheets (page vs landing language), ≤ 40 sheets; every page ≤ 3 fixed at the root; before/after table published. — PROOF: `docs/redesign/r369/C/RUBRIC.md` + sheets under `docs/audit/evidence/r369/` (≤ 1.5 MB per push).
- [ ] C1.6 `overlap.mjs --stress --seed <role>` all 5 roles × headline routes × {360×640,1440×900} × light+dark (+320 + landscape for top-25 pages) → ZERO findings. — PROOF: artifacts `/tmp/r369/stress-*.json` + ledger table (findings 0).
- [ ] C1.7 Popovers/dialogs/sheets open, scroll-to-bottom sticky bars, keyboard-open 320, 200 % zoom, long names, 100+ rows, broken images, 99+ badges → ZERO overlap findings. — PROOF: overlap `--stress --popovers --fontscale 2` + hostile-fixture runs clean; failing-before e2e where a defect is found+fixed.
- [ ] C1.8 Shell & bars on all sizes: no overlap, safe areas, 44 px targets, focus ring never clipped, nav spine ≤ 8 visible items. — PROOF: overlap `--focus 3` clean per role; shell e2e green.
- [ ] C1.9 Dashboards lane (R366 L3.9 residual): card rhythm, charts at 360, colour-blind-safe palettes on the 5 role dashboards. — PROOF: seeded overlap + contrast/axe runs on dashboards; fix commits if defects.
- [ ] C1.10 Service surfaces already pinned in R366 (AI/search/notifications/messages/PDF/exams/calendar/tables/forms) — re-verify on this base, no regression. — PROOF: focused e2e suites green on this tree.
- [ ] C1.11 Smoothness: worst LoAF < 50 ms under 4× CPU on `/student/dashboard`, `/student/courses`, `/student/library` @1440 and 390; CLS ≤ 0.05 top-10 pages; skeletons match. — PROOF: `loaf.mjs`/`cls-axe.mjs` outputs.

## Lane C2 — public non-landing pages (T5)

- [ ] C2.1 Public pages (`/about /features /help /contact /app /capabilities /colleges /community /competitions /training /vision /legal/* /auth /403 /404 /500 /maintenance`) surveyed at {320,390,768,1440} × light/dark; defects (overlap/clip/overflow/type ladder/mono indices) fixed at root in my files. — PROOF: overlap runs per page family (findings 0) + sheets.
- [ ] C2.2 Public words −25 % (legal substance intact), ceilings ratcheted in-commit. — PROOF: copy-budget gate CLEAN with lowered ceilings + before/after table.
- [ ] C2.3 Lighthouse mobile ≥ 90/95/95/95 on `/features`, `/app`, `/auth`, `/help`. — PROOF: lighthouse run outputs (JSON) committed under `docs/audit/evidence/r369/lighthouse/`.
- [ ] C2.4 Shared art assets: REQUESTS to B for any new scene (B owns `public/media/**`). — PROOF: `docs/redesign/r369/REQUESTS-C-to-B.md` entries.

## Lane C3 — the mobile app (T7) on every device size

- [ ] C3.1 Evidence pipeline: dispatch `ui-screens.yml` (roles × core+extended profiles) for BEFORE=main and AFTER=branch; download contact sheets via `gh run download`. — PROOF: run URLs + sheet artifacts path.
- [ ] C3.2 Every defect from the sheets fixed at root (TabBar/AppTopBar, sheets, forms, rows, empty/loading/error, tablet/foldable/landscape max-width 640 dp, font scale 2.0, tokens-only styling). — PROOF: before/after sheet pairs + fix commits.
- [ ] C3.3 Heron language on mobile (plate/hairline/mono-index, calm density, original illustrations via REQUESTS to B), boot hand-off per MOBILE-BOOT-SPEC (no flicker). — PROOF: boot spec checklist + visual sheets.
- [ ] C3.4 Worklet law green (`scripts/qa/worklet-audit.mjs`), jank ≤ 5 % on 5 heaviest screens (CI/emulator numbers or recorded limitation), cold start ≤ 2.5 s, APK growth ≤ +1 MB. — PROOF: worklet-audit output + CI APK artifacts size diff.
- [ ] C3.5 Mobile jest ≥ 1252 green, `expo-doctor` clean (or recorded limitation), no push/FCM files touched. — PROOF: jest output lines + expo-doctor output.
- [ ] C3.6 Mobile copy ≥ −20 % vs base. — PROOF: copy-budget-mobile gate with ratcheted ceilings + word table.

## Lane C4 — less text & simplicity (web app + mobile)

- [ ] C4.1 Authed web words ≥ −20 % vs base (densest pages first), ceilings ratcheted in-commit, action-critical info intact; Arabic read-through table of the 60 most-changed strings. — PROOF: copy-budget gate CLEAN + `docs/QA/copy-review/r369-pack.md`.
- [ ] C4.2 Non-landing CSS −10 % bytes (dup sheets merged/deleted with computed-style proof); stylelint errors in my files = 0; no baseline raised. — PROOF: byte counts before→after + stylelint output.

## Close-out

- [ ] C5.1 All gates green on the final tree (typecheck, lint, focused suites, copy budgets, stylelint ratchet, bundle size); red-from-root fixes listed. — PROOF: command outputs in RESUME.md.
- [ ] C5.2 DELIVERY.md written; branch pushed with all work; 5 random ticked boxes re-verified (§5-pre.5). — PROOF: DELIVERY.md + re-run evidence lines.
