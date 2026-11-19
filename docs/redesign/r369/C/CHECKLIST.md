# Agent C — Product (public pages · app pages · mobile) — R369 Checklist

Branch `agent/r369-product` · start `origin/wip/r368-t6` (`5925fabd`) · records `docs/redesign/r369/C/`
A box is ticked ONLY with proof on the same line (command + real output / metric before→after / artifact path).
Legend: `[ ]` open · `[x]` done (proof on line) · `[~]` in progress · `SKIPPED — reason — needs X`.
Base rule: merge `origin/agent/r369-integrate` when A's `docs/redesign/r369/BASE-READY.md` lands.

## Lane C1 — finish the authenticated web app (all 108 routes, every role)

- [x] C1.0 CHECKLIST created (this file) from §5 role list. — PROOF: file exists on `agent/r369-product` (commit 05cbc35f, pushed 2026-11-19 ~10:05).
- [x] C1.1 Ledger v3 `docs/QA/page-ledger-v3.md` (109 rows incl. 7 redirect rows) from the wave-6 inventory; per-family current-state worst cells. — PROOF: file committed 851072e3 — 94 route-mounts matrix-measured, every cell ≥ 95.1; evidence `docs/audit/evidence/r369/**`.
- [x] C1.2 Admin/registrar family: ALL routes × {1440,768,390} × light+dark matrix, every cell ≥ 90, defects fixed at root. — PROOF: harness runs `pages-registrar.mjs --routes <16 admin routes> --bps 1440,768,390` light worst 95.1 / dark worst 95.1 (baseline light worst 72.9); after A's fixture follow-up (aa450d8f) the mail/directory cells sit 99.8+ on real-surface states; JSONs `docs/audit/evidence/r369/{pages-registrar-admin-family-*,admin-family-*}.json` + `docs/redesign/r369/C/after-*.json`; fixes committed df57897a (avatar rung root fix, D11 numerals/eyebrows/CTAs, AA text seats, ladder rules).
- [x] C1.3 Exams family: `/student/online-exams`, `/student/online-exams/:id` (taker), `/quality/exam-moderation` × {1440,768,390} × light+dark, cells ≥ 90. — PROOF: list 98.9 both themes 3bp · taker (first-ever measurement) 100 both themes 3bp · moderation 100 light + 100 dark re-run; JSONs `docs/audit/evidence/r369/exams-*.json` (commit 6c8354fc).
- [x] C1.4 Student/teacher/owner/quality families re-verified on this base (3bp × light+dark worst cell recorded). — PROOF: student 32 routes × light+dark worst 96.7 (three first-viewport CTA defects fixed en route — mooc/webinars/vision, commit 6c8354fc); teacher 21 worst 99.0; owner 14 worst 99.4; quality 10 worst 99.3 — JSONs `docs/audit/evidence/r369/{student,teacher,owner,quality}-family-*.json`.
- [x] C1.5 Rubric 1–5 per page family from paired-style contact sheets (page vs landing language), ≤ 40 sheets; every page ≤ 3 fixed at the root; before/after table published. — PROOF: `docs/redesign/r369/C/RUBRIC.md` + 12 sheets (780 KB) under `docs/audit/evidence/r369/rubric/` — mean 4.04, every page ≥ 3.8, zero ≤ 3, one root fix (ChangePasswordCard measure cap 1050px→560px measured); commit a5efca43.
- [x] C1.6 stress all 5 roles. — PROOF: `--stress --popovers --workers 2` × {360×640,1440×900} × light+dark → 0/0/0/0/0 findings per role; top-25 pages × {320×568, 640×360, 844×390} × light+dark → 0; artifacts `docs/audit/evidence/r369/stress/*.json` (commit 6d891493).
- [x] C1.7 hostile-content zero. — PROOF: `--fontscale 2` on the 5 dashboards + form-heavy routes (taker/payment/attendance/import) at {320,360} → 0 (the stress walker clones 100+ rows, breaks images, injects hostile strings per its documented STRESS pass); keyboard-open 320 + 99+ badges already pinned by messages/notifications e2e (re-verified green this round, 73/73).
- [x] C1.8 Shell & bars. — PROOF: `--focus 3` per role × {360×640,1440×900} × light+dark → focus-clip 0 everywhere; r305-shell-heron.e2e 37/37 green on this tree (with pdf+library); nav spine maps are the frozen lib/nav.ts registers (≤ 8 visible per group).
- [x] C1.9 Dashboards. — PROOF: the 5 dashboards × {320×568,360×640} × light+dark × stress + 200 % fontscale → 0 findings; charts ride the R366 CVD-audited --chart-* series (chart-4 left the rose triad, tokens.css documented ratios); cls-axe on all 5 dashboards: CLS 0.0000, axe serious/critical 0.
- [x] C1.10 service surfaces re-verified. — PROOF: 73/73 e2e green on this tree — ai-assistant+global-search+notifications 17, messages+calendar+online-exams 19, document-viewer+library-borrow+r305-shell-heron 37 (commit 6d891493 run).
- [x] C1.11 Smoothness. — PROOF: new lane instrument `scripts/qa/loaf-authed.mjs` (real wheel input, scroll window, 4× CPU): production build × 3 runs × {1440,390} × 3 pages → worst 0 ms, 0 frames > 50 ms; root cause of the library's flaky 51–62 ms frames found+fixed (the unwired LIBRARY_BOOKS fixture's 501-retry storm); cls-axe top-16 pages: CLS 0.0000 max.

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
