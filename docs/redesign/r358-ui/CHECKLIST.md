# R358-UI Execution Checklist

Evidence is required on each checked line. Unticked items must be explicitly skipped with an owner/decision reason; no empty lanes.

## A1 — Mobile emulator evidence
- [ ] Dispatch `ui-screens.yml`; extend flows for teacher, registrar/admin, quality, supported owner; every tab/stop; dark mode, font scale 1.3, 360×640; keep manual-only.
- [ ] Download run artifacts and cut before contact sheets per role from last Android/main build and after sheets from branch build.
- [ ] Review sheets using A6 rubric; record every defect (screen → defect → fix).

## A2 — Navigation
- [x] New ≤8 always-visible destinations per role; all other census destinations reachable in ≤2 clicks; preserve census, labels, permissions; web/mobile parity; nested active state. `npx tsx scripts/qa/nav-audit.ts --json`: 8 destinations + one overflow toggle per role; original route census retained.
- [x] Rewrite `nav-coverage.test.ts` with stricter ≤8 and ≤2-click assertions; `cd frontend && TZ=UTC npx vitest run tests/unit/nav-coverage.test.ts` — 17 passed. Commit message will explain owner requirement and retained census/reachability.
- [x] `npx tsx scripts/qa/nav-audit.ts --json`: STUDENT 34/8/26/2/0/5; TEACHER 23/8/15/2/0/5; ADMIN 15/8/7/2/0/5; QUALITY 13/8/5/2/0/5; OWNER 16/8/8/2/0/5 (census/visible/overflow/max clicks/glyph drift/duplicate destinations). Web sidebar and 390 drawer, both themes: [desktop sheet](evidence/web/A2-nav-desktop-light-dark.png), [drawer sheet](evidence/web/A2-nav-drawers-light-dark-390.png).

## A3 — Web component consistency
- [ ] Buttons: sizes, states, loading, icon-only, disabled, danger/success slabs in both themes.
- [ ] Inputs/select/textarea/date/search: dimensions, focus, errors/helpers, RTL caret/icons.
- [ ] Checkbox/radio/switch; tabs/segmented; badges/chips/status palette and AA.
- [ ] Cards/surfaces: radius, border, shadow, padding scale.
- [ ] Tables: sticky header, row height, numeric alignment, small-screen scroll/shadow cue, empty state.
- [ ] Dialogs/sheets scroll/pinned regions/mobile bottom sheet; toasts avoid composer/FAB; tooltips/popovers flip and scroll.
- [ ] Pagination/filter wrapping/forms responsive columns/empty-loading-error illustration rule/skeleton alignment.
- [ ] Record variant/override and dead/duplicate CSS before→after; bundle under 773 KB; CSS/stylelint ratchets held or improved.

## A4 — Arabic type, icons, single logo
- [ ] Arabic type scale, line-height, no Arabic letter-spacing, tashkeel, consistent numeral contexts, font fallback/FOUT/CLS, shared truncation.
- [ ] Icon size/stroke/alignment; RTL directional mirroring; no emoji UI icons; icon gate green.
- [ ] ONE-logo audit table for web header/footer/auth, favicon, PWA/theme, OG, 404/500, email, mobile icons/splash/in-app; fix owned issues and route email ownership to COPY-REQUESTS.

## A5 — Real web UI aesthetic review
- [ ] Contact sheets ≤12: each role dashboard + 3 key pages + auth + landing, 390/1440, light/dark; rubric scores (grid, rhythm, hierarchy, density, consistency, contrast, states, motion, RTL); fix every score ≤3.
- [ ] Root fixes and matching after crops; record before/after paths.

## A6 — Mobile fixes
- [ ] Fix every A1 defect in UI kit/shell; touch targets ≥44; font scale/dark/safe areas/keyboard/status/nav; migrate worst inline-style screens; avoid push/FCM; worklet audit and mobile jest ≥1250.
- [ ] Re-run emulator workflow and record after sheets.

## A7 — Accessibility/stress
- [ ] `hover-guard-lint`: fix real sticky hover; document legitimate probe-hover/focus-within exceptions; before→after count.
- [ ] Visible unclipped focus ring for every interactive in both themes; add focus check to stress harness.
- [ ] axe on five headline pages + each dashboard: zero serious/critical; contrast 0 except named Heron exemption.
- [ ] Stress harness covers open popover/dialog/sheet and 320px keyboard height; zero findings all roles × widths × themes.

## A8 — Closing gates
- [ ] Run unpiped `bash scripts/verify.sh --fast`, frontend unit, mobile jest, e2e, CSS gates, size, contrast, stress, worklet, identity; record results.
- [ ] Recapture visual drift baseline once using documented procedure.
- [ ] Completeness audit: print checklist and rerun evidence for five random checked items; fix failures; all items checked or explicitly skipped.

## Part B — integration and merge
- [ ] B1 compare base/main commits, overlapping files, and main CI state; confirm typecheck green.
- [ ] B2 merge main into `merge/r358-ui` using no-ff; preserve main intent and regenerate ratchets as required.
- [ ] B3 write MERGE-REPORT: parity hash, scoped diff, metrics, ~12 before/after views, merged-tree gates.
- [ ] B4 push/open PR; wait CI; merge commit only when green or identical preexisting main failures proven.
- [ ] B5 verify deploy/smoke, health/status buildId, Android artifact commit/download; delete work branches after success.

## Definition of done
- [ ] All checklist lines evidenced or explicitly skipped with owner/decision reason; no empty RESUME sections.
- [ ] Nav ≤8 with 34 census and ≤2-click pinned; mobile sheets all roles; A3/A4 measured; axe zero; stress zero; contrast named exception only.
- [ ] Part B complete; parity identical; merged, post-merge verified, branches deleted.
- [ ] Contact sheet budget ≤30; single image budget ≤8.
