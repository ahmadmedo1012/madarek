# Native rebuild list — next EAS build window (quota resets ≈ Dec 1)

The R345 OTA (group `b1e661a6-1f73-427d-a767-94b1d4da426e` · iOS
`01a1c31b-268e-7959-a67f-e699ddfa876d` · Android
`01a1c31b-268e-7c53-b1ca-ebb9a86fff2d`, branch `production`, commit
`c28464ae`) shipped everything JS-only. The next native build
(`eas build --profile production --platform all`) should ALSO land:

1. **Dependency re-pin (expo-doctor's 1 failed check — 19/20 pass):**
   `npx expo install --check` upgrades patch drift to SDK 58 expected:
   expo ~58.0.23 · expo-constants ~58.0.15 · expo-dev-client ~58.0.18 ·
   expo-linking ~58.0.16 · expo-notifications ~58.1.8 · expo-router
   ~58.0.30 · expo-sharing ~58.0.22 · expo-splash-screen ~58.0.13 ·
   expo-updates ~58.0.21 · jest-expo ~58.0.14; and the minor:
   react-native-safe-area-context ~5.11.1 (found 5.10.1).
2. **Runtime version decision:** the pin upgrades above may or may not
   bump the runtime fingerprint — run `npx expo install --check` then
   `eas update:configure` and confirm the runtime version; if it
   changes, the production OTA channel starts from the new binary.
3. **Regenerate app icons/splash from the ONE art source** after any
   mark/brand change: `npm run icons` (`scripts/brand/build-app-icons.mjs
   --png`) + `npm run tokens:check` + `npm run cards:check` + `npm run
   illus:check` (the four drift gates now wired in package.json).
4. **Post-build OTA:** re-run `eas update --branch production` from the
   same commit so the update channel carries the release JS.
