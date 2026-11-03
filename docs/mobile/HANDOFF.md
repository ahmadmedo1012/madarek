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
- Baseline Android preview from branch head: _pending_
- Final iOS-simulator + Android APK from final head: _pending_

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
