# AGENT 5 · R366 — Native Mobile (Android APK + iOS internal) — CHECKLIST

Branch `agent/r366-native-mobile` · baselined from `origin/main` @ `7a097457`.
A box is ticked ONLY with proof on the same line (command + real output, CI run
URL, metric before→after, or artifact path). Written/pushed ≠ done; executed and
measured = done.

Baseline (measured on this branch before any change):
- `npx tsc --noEmit` (apps/mobile) → exit 0
- `CI=1 npx jest --ci` → **1252/1252 passed, 49 suites**
- `node scripts/gates/copy-budget-mobile.mjs` → CLEAN, **13043 Arabic words / 174 screens**, ceilings sum 13056
- `node scripts/qa/worklet-audit.mjs` → see L3 box (needs root node_modules)

## L1 — Evidence pipeline first (cheap, drives everything)

- [ ] Dispatch ui-screens before-set on `main` (all roles) via `gh`-equivalent REST dispatch; record run URLs
- [ ] Extend `ui-screens.yml` matrix: profiles for normal 390×844, large 412×915, tablet 800×1280, landscape phone, font scale 2.0, RTL locale (existing: light/dark standard, 360×640 @1.3)
- [ ] Extend `.maestro/screens-*.yaml` to walk EVERY tab/stop per role (audit which stops are missing vs the router tree; add them)
- [ ] Download before-set artifacts, cut contact sheets, record per-screen defect list in RESUME.md (screen → defect → fix)
- [ ] After-set: dispatch extended workflow on this branch; download artifacts; contact sheets; defect re-check

## L2 — UI kit & shell at the root

- [ ] TabBar + AppTopBar audit: heights, safe areas, icon/label alignment, active state, badge placement RTL, ≥ 44pt targets — measured via component tests + emulator sheets; fixes at the shell root
- [ ] Drawers/sheets: keyboard avoidance, max height, drag handle, bottom safe area — fixes in `src/components/ui/sheet.tsx`/shell
- [ ] Forms: field heights, error text, keyboard next/done, scroll-into-view on focus (KeyboardAvoidingView seats)
- [ ] List rows/cards/avatars/skeletons + empty/loading/error states from the kit (no bespoke rows)
- [ ] Magic-number sweep: grep inline styles vs `tokens.ts`; migrate the worst offenders (count before→after)
- [ ] Dark mode + status/navigation bar colours verified across roles (evidence from L1 sheets)
- [ ] Tablet/foldable/landscape: responsive rules (max content width, two-pane where natural, rail vs tabs on wide) — code + emulator proof on tablet profile
- [ ] Font scale 2.0 without truncating primary actions (evidence from L1 a11y profile + code guards)
- [ ] Small phones 360×640 without overlap (evidence from L1 small profile)

## L3 — Smoothness, transitions, boot

- [ ] `scripts/qa/worklet-audit.mjs` green (baseline first, after any motion change)
- [ ] Lists: virtualisation audit (FlashList vs FlatList, estimatedItemSize, stable keys, memoised rows) — fix the worst 5 screens; document choice per screen
- [ ] `adb shell dumpsys gfxinfo` jank measurement on the 5 heaviest screens via the extended workflow (janky ≤ 5%) — CI evidence
- [ ] Navigation transitions: consistent, interruptible, correct RTL back gesture, tab state preserved, no white flash (contentStyle from tokens — verify every stack/screen)
- [ ] Reduced-motion respected on mobile (no parallax/entering loops when OS reduces motion)
- [ ] Boot/splash: flicker-free hand-off implemented natively (splash bg == first screen bg from tokens); cold-start crumbs recorded; ≤ 2.5 s target evidenced via emulator timeline (logcat crumbs in L1 logs)
- [ ] No layout jump when auth state resolves (session hydrate happens behind splash)

## L4 — Copy diet on mobile

- [ ] Identify screens above/nearest ceiling via copy-budget-mobile; cut ≥ 20 % words overall (13043 → ≤ 10434) with no loss of action-critical info; lower ceilings in the same commits; Arabic-correct Libyan-education terms

## L5 — Quality gates & parity

- [ ] Jest mobile all green (≥ 1252) after changes; typecheck clean
- [ ] `expo-doctor` clean (or recorded deviations with reasons)
- [ ] APK size not growing > +1 MB (before/after via build artifacts)
- [ ] Accessibility: `accessibilityLabel`/`role` on all touchables (audit script or grep count before→after), contrast per tokens, TalkBack smoke via Maestro where possible
- [ ] Web↔mobile parity table for the 20 most important flows (docs/redesign/r366/agent5-mobile/PARITY.md)

## L6 — Closing

- [ ] All mobile gates green (baseline shifts listed in DELIVERY.md)
- [ ] Before/after sheets for all roles × device profiles (≤ 40 sheets, contact-sheet format)
- [ ] Jank/startup numbers recorded (before→after)
- [ ] DELIVERY.md written; branch pushed; REQUESTS files written (Agent 2 boot spec, Agent 3 tokens if needed)
