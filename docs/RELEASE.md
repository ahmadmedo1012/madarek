# RELEASE — how Madarek ships (web + app, one repo, one branch)

> R326 M0.6. One branch (`main`), one project. Every change lands on main
> in small verified commits; automation decides what deploys where.

## What triggers what

| You push to `main`… | Render (web) | GitHub Actions | EAS |
|---|---|---|---|
| `backend/**` | ✅ deploys | CI + **deploy-smoke** (waits for buildId == SHA, then health + 3 logins + dashboard + live-vs-committed OpenAPI additive check; failure opens an issue) | — |
| `frontend/**`, `shared/**` (web side) | ✅ deploys | CI | — (unless `apps/mobile/**`/`shared/**` also changed → see below) |
| `apps/mobile/**` or `shared/**` | ❌ never (render.yaml `buildFilter`) | **Mobile** workflow: gates (typecheck · expo lint · contract-check · `expo export` android+ios · bundle ≤ 8 MB) | **EAS Update** (`--auto`) to `production` **and** `preview` branches — reaches every installed build whose runtime fingerprint matches |
| …and the change is **native-affecting** (`apps/mobile/package.json`/lock, `app.config.ts`, `eas.json`, `assets/`, or `shared/` brand assets) | ❌ | same gates | + **EAS Build** preview profile (internal APK + iOS simulator), `--no-wait`, links in the run summary |
| `docs/**`, `audits/**`, `*.md` | ❌ | CI only | — |

Channels: `development` (dev-client) · `preview` (internal APK/simulator) ·
`production` (store). `runtimeVersion` policy = **fingerprint** — any
native dependency/plugin/config change silently produces a new fingerprint:
OTA updates then wait for the matching build (the workflow queues it
automatically).

## The one-time setup that is already done

- `EXPO_TOKEN` is set as the GitHub Actions secret `EXPO_TOKEN`
  (repo → Settings → Secrets and variables → Actions). Rotation: create a
  new token at expo.dev/accounts/rh2011/settings/access-tokens, then
  update the secret.
- `app.config.ts` carries `updates.url` (u.expo.dev/afc4265f-…) +
  `runtimeVersion: { policy: "fingerprint" }` + `checkAutomatically: ON_LOAD`.
- Render `buildFilter` excludes mobile/docs commits.

## Owner-only steps (things automation cannot do)

1. **Rotate the GitHub PAT + Expo token if they were ever exposed** (both
   were pasted in chat during R326 setup):
   - PAT: github.com → Settings → Developer settings → Fine-grained tokens.
   - Expo: expo.dev/accounts/rh2011/settings/access-tokens → then update
     the `EXPO_TOKEN` Actions secret.
2. **Apple side (iOS)**: no Apple Developer account is linked yet. To ship
   TestFlight/App Store the owner must provide an **Apple team id** + an
   **App Store Connect API key** (`eas credentials` → sign in with Apple;
   or set `ASC_KEY_ID`/`ASC_ISSUER_ID`/`ASC_KEY_CONTENT` as EAS secrets —
   expo.dev → project → Credentials). Until then iOS ships simulator
   builds (preview profile) only. `eas device:create` registers ad-hoc
   devices if internal distribution is preferred.
3. **Store submission (Android)**: `npx eas submit --platform android
   --profile production` needs the Play service-account JSON uploaded to
   EAS credentials (one-time, expo.dev → Credentials → Google Play).

## Manual commands (the owner's release console)

```bash
# see what's live
npx eas-cli update:list --branch production
npx eas-cli channel:view production

# roll BACK a bad OTA (users get the previous update on next launch)
npx eas-cli update:republish --branch production <update-id-of-the-good-one>
# or hard-rollback (marks everything after a point as rolled back):
npx eas-cli update:rollback --branch production

# force a store build now (native change or a release)
npx eas-cli build --profile production --platform android --non-interactive
npx eas-cli build --profile preview   --platform all --non-interactive --no-wait

# bump the minimum app version (blocks outdated installs with a blocking
# «يلزم تحديث التطبيق» screen):
#   Render dashboard → madarek → Environment → MIN_APP_VERSION=1.1.0 (+ optional
#   APP_DOWNLOAD_URL). The app reads /api/v1/status minAppVersion on cold start.
```

## The min-version gate

`GET /api/v1/status` → `{ minAppVersion, updateUrl }`. The native app
compares semver on cold start + foreground: below `minAppVersion` → the
blocking update screen with the `/app` download link. Unset → no gate.

## Distribution page

`/app` on the website: latest APK (EAS artifact URL from
`docs/releases.json`, updated by the build workflow), QR, changelog,
«ما الجديد», iOS status. Link lives in the landing footer + help.

## In-app update UX

Cold start + foreground: `expo-updates` checks silently (ON_LOAD) →
downloads → toast «تحديث جاهز — أعد التشغيل» → reload. The feedback
payload and `/client-errors` telemetry carry the running `updateId`, so
the owner inbox shows exactly which OTA a crash came from.
