# R334 Mobile Mission — HANDOFF (branch `feat/mobile-r334-pro`)

Owner-facing handoff for the mobile-pro branch. Kept current as work lands.

## Environment facts (this sandbox — stated once per mission)
- **No Android emulator / iOS simulator**: `/dev/kvm` is absent; cloud simulators and Maestro Cloud are blocked by the Expo plan. All emulator/device claims are therefore impossible from here — everything is labeled honestly (`device-verified / emulator-verified / RN-web-verified / unverified`).
- Available verification channels: `tsc --noEmit`, `jest` (render-net / poisoned-net / navigation-stability / role-session), `expo lint`, `contract-check`, `tokens:check`, `expo export --platform web` + browser captures, EAS cloud builds (owner runs the artifacts on his devices/simulators).

## Pinned commands (mobile)
- Typecheck: `cd apps/mobile && npm run typecheck`
- Lint: `cd apps/mobile && npm run lint`
- Tests: `cd apps/mobile && npm test`
- Contract/tokens: `cd apps/mobile && npm run contract-check && npm run tokens:check`
- RN-web export (capture baseline): `cd apps/mobile && npm run export:web` → `dist/`
- EAS preview builds (from branch only, never publish OTA to production/preview channels):
  - Android APK: `EXPO_TOKEN=… npx eas-cli@latest build --platform android --profile preview --no-wait --non-interactive`
  - iOS simulator: `EXPO_TOKEN=… npx eas-cli@latest build --platform ios --profile preview --no-wait --non-interactive`
- OTA tests (own channel only): `eas update --branch r334 --channel r334`

## Baseline (branch start)
- Base: `origin/main` @ `7d4ba8b` (docs(r333): kickoff)
- Deps confirmed installed: reanimated 4.7.1 · gesture-handler 3.3.0 · @gorhom/bottom-sheet 5.2.14 · flash-list 2.3.2 · expo-haptics/image/video 58.x · keyboard-controller 1.22.7 · react-native-svg 15.16 · worklets 0.13 → **Round 1 adds NO new native modules** (fingerprint unchanged for JS-only work).

## EAS builds
- Baseline iOS-simulator preview (bootstrap head `d610a62`): **FINISHED — ID `1cd3219d-e8a3-4510-a6b5-67783802cdcd`** · runtime `d8246c7287a119f1b5ce28e8bbb7e9473bb059fe` · **Artifact (simulator .tar.gz): https://expo.dev/artifacts/eas/gzH2LyPlEwVa6MpBMljqDnGlLZIjRoW7Adpt7_Bu084.tar.gz** · logs: https://expo.dev/accounts/rh2011/projects/madarek-mobile/builds/1cd3219d-e8a3-4510-a6b5-67783802cdcd
- **Final iOS-simulator preview (mission head): ID `bd254942-f2a1-4a47-9a78-7e8a4a8ec3ce`** · submitted from `8a6390e` (content-identical to final head `92dc49c` for `apps/mobile/**` — the later rebase only added main's non-mobile commits) · logs: https://expo.dev/accounts/rh2011/projects/madarek-mobile/builds/bd254942-f2a1-4a47-9a78-7e8a4a8ec3ce
- Baseline + final Android preview: **BLOCKED — Free-plan Android quota exhausted this month (resets ~Dec 1 2026)**. Retry command for the owner/lead:
  `cd apps/mobile && EXPO_TOKEN=… npx eas-cli@latest build --platform android --profile preview --no-wait --non-interactive`
  (or upgrade: `eas billing:subscribe starter --account rh2011`).

## RN-web capture pipeline (pinned, reproducible — used for the VLM verification + review panel)
1. `cd apps/mobile && EXPO_PUBLIC_API_BASE_URL=http://localhost:8900/api/v1 npx expo export --platform web --output-dir /tmp/export-branch`
2. Serve with SPA fallback (plain `http.server` 404s deep links — `output: "single"`): tiny node server mapping unknown paths → `index.html` on :8899.
3. CORS-open reverse proxy on :8900 → `https://madarek-nine.vercel.app` (echoes Origin, answers preflights) — the prod API does not allow localhost origins.
4. Playwright walks: login (`student|teacher|admin|quality|owner@test.ly` / `12345678`) via `[role="button"]:has-text("دخول")`, then route captures at 360/390/430/768 + `colorScheme: dark`.
5. Visual review: `z-ai vision -p "<question>" -i <png>` (VLM) — Arabic-string claims always re-verified against code (VLM misreads Arabic ligatures at small sizes).

## Worktree / agent map (Round 1)
| Task ID | Agent | Worktree | Branch | Owns |
|---|---|---|---|---|
| 1-a | Scout | /home/z/wt-scout | r334/scout | docs/mobile/arsenal.md |
| 1-b | Audit-Routes | /home/z/wt-audit-routes | r334/audit-routes | docs/mobile/route-inventory.md |
| 1-c | Audit-Static | /home/z/wt-audit-static | r334/audit-static | docs/mobile/audit-static.md |
| 2-a | Motion | /home/z/wt-motion | r334/motion | apps/mobile/src/motion/** + docs |
| 2-b | Haptics | /home/z/wt-haptics | r334/haptics | apps/mobile/src/haptics.ts + docs |
| 2-c | Sheets | /home/z/wt-sheets | r334/sheets | src/components/ui/sheet.tsx, toast.tsx + docs |
| 2-d | Lists | /home/z/wt-lists | r334/lists | src/components/ui/data.tsx + docs |
| 2-e | Forms | /home/z/wt-forms | r334/forms | src/components/ui/fields.tsx, form.tsx + docs |
| 2-f | Theming | /home/z/wt-theming | r334/theming | apps/mobile/src/design/** (additions) + docs |
| 2-g | Resilience | /home/z/wt-resilience | r334/resilience | src/components/ui/states.tsx, src/lib/resilience/** + docs |

## Work log
- Branch created from `origin/main` @ `7d4ba8b`; environment verified (git 2.47.3, node 24, npm registry + expo.dev reachable, no KVM); docs skeleton committed.

## Work log (final)
- Round 1 (10 agents): foundations + audits — merged conflict-free, gates green (984/984).
- Round 2 (10 agents + continuations): shell/nav, boot/auth signature moment, all top-30 screens — merged, 1154/1154.
- Round 2.5 (2 agents): long-tail L2 sweep (student + public) — 27 raw-error kills, 5 DataList migrations, campus L1→L2.
- Round 3: RN-web export + Playwright + VLM verification (28 captures; 4 real defects found → fixed → re-verified), bundle budget analysis (+13.9%, all in shared chunk — see MERGE §5).
- Review panel: 3 independent reviewers (8.47 / 8.73 / 7.95) + consensus-P0 fix pass (dashboards motion/haptics/a11y/state-grammar, wire typing, pressables haptics bypass).
- Final iOS preview build bd254942 submitted; branch rebased on origin/main @ ca5a5ad, force-pushed as 92dc49c.
