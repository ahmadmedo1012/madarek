# R334 Mobile Mission — MERGE PACKAGE (for the lead)

Branch: `feat/mobile-r334-pro` · Base: `origin/main` @ `7d4ba8b` · **Final head: `92dc49c` (rebased on latest `origin/main` @ `ca5a5ad`, 72 commits, force-pushed)** · Android quota blocked (see §6/8).

## 1. Changed paths outside `apps/mobile/**` & `docs/mobile/**`
- **None.** Verified: `git diff origin/main...HEAD -- ':!apps/mobile' ':!docs/mobile'` is empty. LR-001 (`expo-navigation-bar` decision) is the only open request.

## 2. Native-change list (new EAS Build / fingerprint needed?)
- **NONE.** No new native modules, no `app.config.ts` changes, no permission changes — the branch is JS-only over the existing fingerprint (`d8246c7287a119f1b5ce28e8bbb7e9473bb059fe`). The lead can roll out via **EAS Update (OTA)** without a new build.
- Recommended FOLLOW-UP native change for the lead (not done here, to keep OTA-only): enable Android predictive back (`app.config.ts` → `android.predictiveBackGestureEnabled: true`) — requires a new EAS Build + fingerprint bump. Also LR-001 (`expo-navigation-bar`) if the gesture-bar contrast bothers the owner in dark mode.

## 3. CI/workflow changes needed
- None. No workflow files touched; no gates/baselines/budgets weakened. Note: main added `ci(ios)` unsigned-IPA automation during the mission (6110759) — orthogonal to this branch.

## 4. Known conflict hot-spots with `main`
- Main's 12 new commits touch **zero** `apps/mobile` files — the rebase was conflict-free. Watch-outs if main moves again: `src/components/ui/{toast,data,fields,states}.tsx`, `src/design/theme.tsx`, `src/lib/{queryClient,format}.ts` were modified **additively** (all pre-existing exports/signatures preserved; grep-verified + tsc + render-net green). Prefer this branch's versions and re-apply main's deltas if main touches them.

## 5. Test / gate results (final, sandbox-verified)
- `tsc --noEmit` → **0 errors**
- `jest` full suite → **1154/1154 passed (38 suites)** — baseline at mission start was 726 tests; +428 new tests (motion 52, haptics 24, sheets/toast 16, lists 25, forms 23, theming/numerals 40, resilience 42, screens ~170, boot 6, exam-runner 18, lecture 23, assistant streams, teacher wire 11, governance kit 13…)
- `expo lint` → **0 errors, 15 warnings** (2 pre-existing on main in `src/brand/plan/*`; the rest are documented-intentional latches/timers with in-code comments; 3 known-debt mount-gate latches ticketed in reviews)
- `contract-check` → no drift · `tokens:check` → green (icons byte-identical) · `export:web` → green
- Navigation-stability net (tab-bar identity/immersive hide/RTL indicator math) → green, extended with new source-contract tests
- `knip`: crashed in-sandbox on memory (documented in audit-static.md) — manual unused-dep pass done; **`react-hook-form` + `@hookform/resolvers` + `netinfo` flagged unused-by-app** (netinfo now used via resilience; RHF kept for form.tsx RHF-compat mode — decision for lead)

### Bundle budget — **missed, with full accounting (lead decision)**
- `expo export --platform web`: main **8.61 MB** → branch **9.81 MB** = **+13.9%** (budget was ≤ +8%).
- **+1.14 MB of the +1.19 MB is entirely in the `__common` shared chunk** — i.e. reanimated 4.7 + react-native-worklets + @gorhom/bottom-sheet + flash-list v2 + keyboard-controller expanding into the bundle. On main these were **installed but 0% used** (reanimated: 0 production importers), so absent from the bundle; the mission's Phase B mandates adopting exactly this stack. Per-route chunks grew ≤ 15 KB each.
- Lead options: accept (recommended — the delta is the sanctioned native-feel foundation, paid once, not per-route), or trim by lazy-loading sheets/motion per-route (diminishing returns).

## 6. Rollout plan
- **OTA first**: JS-only diff over fingerprint `d8246c…` → `eas update` on the production channel **by the lead** after merge. This branch never published to production/preview.
- iOS preview builds for device QA: baseline `1cd3219d` (bootstrap head) + final `bd254942` (post-merge head `8a6390e`, content-identical to final head for `apps/mobile` — rebase only added main's non-mobile commits).
- **Android preview: BLOCKED** — Free-plan Android quota exhausted this month (resets ~Dec 1 2026). Retry: `cd apps/mobile && EXPO_TOKEN=… npx eas-cli@latest build --platform android --profile preview --no-wait --non-interactive`.

## 7. Verification matrix (final — honest labels)
| Area | Status |
|---|---|
| Typecheck / jest / lint / contract / tokens / export | **sandbox-verified green** (numbers above) |
| Foundations (motion/haptics/sheets/lists/forms/theming/resilience/errors) | **jest+typecheck-verified**; device feel **unverified** (no emulator — /dev/kvm absent) |
| Top-30 screens | **code+doc-verified; RN-web-verified via captures+VLM for ~15 screens** (student core, teacher/owner/quality dashboards); the rest code-review-only. **Review panel: R1 8.47 · R2 8.73 · R3 7.95 (code-only) — avg ≈ 8.4, BELOW the ≥9 bar** → remaining tickets in `docs/mobile/review/*.md` + `FIXES.md` (4 consensus P0s applied post-panel: dashboards motion/haptics/a11y/state-grammar, sparse-surface a11y, RingProgress labels, quality wire typing; review-3 T1 pressables haptics-bypass fixed) |
| Shell claims (persistent bar, immersive hide, transform-only RTL indicator) | **code-verified + test-pinned** (R3 verdict: all three hold) |
| Boot→home, one logo/one loader, no overlay layers | **code-verified + RN-web-verified** (boot capture walk) |
| Visual defects found by VLM captures | tab-label clipping, 768px stats overflow, CountUp web overflow, assistant raw model ids — **all fixed + re-captured + VLM-re-verified** |
| Remaining known gaps (tickets) | bidi isolation for mixed Ar↔Latin strings (P1) · sparse-state dead-space redesign (P1) · exams accent-chip hierarchy (P1) · ~10 low-traffic screens still motionless (P1) · EmptyState scroll-centering (P2) — full lists in review docs |
| Device/emulator | **unavailable in sandbox** (no /dev/kvm; cloud simulators blocked by Expo plan) — owner validates on EAS preview builds |

## 8. Before/after gallery index
- `docs/mobile/screens/captures/*.png` — 12 committed thumbnails (≤150 KB each; full set + 360/430/768/dark variants in the working session, regenerate via the pinned commands in HANDOFF).
- Per-screen decisions/checklists: `docs/mobile/screens/*.md` (shell, boot-auth, student-home-profile-settings, courses, lecture-library, assistant, exams-results, comms-agenda, teacher, governance, longtail-student, longtail-public).

## 9. Adoption KPIs (mission exit metric — before → after, production files)
| System | Before | After |
|---|---|---|
| react-native-reanimated | 0 production files | **17 direct + 18 via `@/motion`** |
| FlashList (via DataList) | 1 | **22 consumer files** (+4 long-tail migrations) |
| @gorhom/bottom-sheet | 0 | **3 infra + 20 files using sheet presets** |
| haptics (gated module) | 2 raw | **28 files** (raw `impactAsync` bypasses eliminated — incl. pressables) |
| expo-image | 1 | **6 files** |
| keyboard-controller | 3 | **6 files** (FormScreen + composers) |
| humanizeError | 0 | **73 files** (raw `e.message` class eliminated) |
| Technical strings visible to users | ~30 sites + raw enums | **30 governance sites killed + label maps**; raw model ids removed |
