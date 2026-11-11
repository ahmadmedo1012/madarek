# Native CI builds — iOS + Android

Two GitHub-hosted native pipelines build installable artifacts without EAS
Build quota, a Mac, or an Android SDK on the developer machine:

| Platform | Workflow | Output | Stable link |
|---|---|---|---|
| iOS | `.github/workflows/build-ios-sidestore.yml` | unsigned `iphoneos` IPA | [sidestore-latest/Madarek.ipa](https://github.com/ahmadmedo1012/madarek/releases/download/sidestore-latest/Madarek.ipa) |
| Android | `.github/workflows/build-android.yml` | release APK + Play AAB | [android-latest/Madarek.apk](https://github.com/ahmadmedo1012/madarek/releases/download/android-latest/Madarek.apk) |

Both pipelines have the same three-stage shape:

```
build (native toolchain)
  └─ upload signed/unsigned candidate artifact
verify (separate Ubuntu job, fresh download)
  └─ re-run the committed verifier on the artifact bytes
publish (only on main)
  └─ update a rolling prerelease with --clobber
```

The verify job is intentionally independent: it downloads the candidate from
the artifact store and checks the actual IPA/APK bytes again. A build cannot
publish simply because the build job exited successfully.

## When they run

Android release builds are automatic on pushes to `main` that touch anything
meaningful for the installed app: `apps/mobile/app/**`, `apps/mobile/src/**`,
`package.json` / `package-lock.json`, `app.config.ts`, `app.json`, `eas.json`,
`assets/**`, `plugins/**`, native folders, `shared/**`, the token/brand
generators (`scripts/tokens/**`, `scripts/brand/**`), `docs/api/openapi.json`
(mobile API client), or the CI scripts and workflow itself. The official
public download (`/app` → the `android-latest` rolling release) therefore
never lags the source. JS-only changes also ship to already-installed apps
through the EAS OTA job in `mobile.yml` — OTA and a fresh APK are
complementary, not alternatives.

To force a self-contained native artifact at any other time, dispatch the
workflow manually:

```bash
gh workflow run build-ios-sidestore.yml -f ref=main
gh workflow run build-android.yml -f ref=main
```

The `Mobile` workflow's `eas-build` job is manual-only now. It remains useful
for an explicit EAS preview or store cut, but it no longer races the native
pipelines or consumes EAS build quota on every native push.

## OTA channel

Raw Xcode/Gradle builds do not get an EAS Build channel automatically, so both
native workflows set `EXPO_UPDATES_CHANNEL=production`. `app.config.ts` turns
that into the `expo-channel-name` request header embedded in the binary. The
installed app therefore requests the same `production` branch that
`mobile.yml` publishes with `eas update --auto`; the production publish step
sets the same env var so its fingerprint matches the binary, while the preview
publish step stays channel-free for EAS preview builds. The channel and runtime
version are recorded in every `build-info.json`.

The Android build also recomputes the fingerprint after Expo prebuild and passes
it to the verifier; the APK's `assets/fingerprint` must match exactly. The
independent verify job re-downloads the artifact and re-checks that runtime
version, the compile SDK, and the build metadata before publishing.

## Verification

The verifiers are committed and can be run locally:

```bash
# iOS: structure, device-only Mach-O, bundle id, Hermes, unsigned
python3 apps/mobile/scripts/verify-ipa.py Madarek.ipa --json-out /tmp/ipa.json

# Android: package/version/SDK, ABIs, signature, debug/release mode, AAB
ANDROID_HOME="$ANDROID_HOME" BUILD_TOOLS_VERSION=37.0.0 \
  python3 apps/mobile/scripts/verify-apk.py \
    --apk Madarek.apk --aab Madarek.aab --json-out /tmp/apk.json
```

Each verified artifact contains:

- the installable binary (`.ipa` / `.apk`),
- `SHA256SUMS.txt`,
- `build-info.json` (commit, runner, versions, signature, verification time),
- the verifier's `verify.json` — also published as a release asset on
  `android-latest` (independent re-verification evidence for the public
  download).

## Android signing

The Android workflow uses release signing when these repository secrets exist:

| Secret | Meaning |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | base64 of a PKCS#12 release keystore |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias inside the keystore |
| `ANDROID_KEY_PASSWORD` | key password; for PKCS#12 it must equal the store password (omit it to use the store password automatically) |

If the keystore secret is absent, the workflow still produces an installable
**internal** APK/AAB using Expo's stable template debug keystore. The release
notes and `build-info.json` label it `signing_mode: debug`; do not publish that
artifact to Google Play.

To generate a release key and register it:

```bash
mkdir -p ~/.madarek-android-signing
cd ~/.madarek-android-signing
keytool -genkeypair -storetype PKCS12 \
  -keystore madarek-release.keystore -alias madarek \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Madarek, O=Madarek, L=Tripoli, C=LY"
# Use the same password for the store and private key when keytool prompts.
# Store the password in a password manager; then:
base64 -w0 madarek-release.keystore | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body madarek
gh secret set ANDROID_KEY_PASSWORD
```

Back up the keystore and passwords offline. Android only accepts updates signed
by the **same** key; losing it prevents in-place upgrades of an already
published app. If the app is already registered in Play Console, use its
existing upload key instead of generating a new one.

The workflow deletes the temporary keystore and `android/key.properties` after
the Gradle build. Only the public certificate SHA-256 is recorded.

## iOS install

The IPA is unsigned and built for a real iPhone (`iphoneos`, arm64), never the
Simulator. SideStore re-signs it with a free Apple ID; no paid Apple Developer
account is involved. Open SideStore → **My Apps** → **+**, select the IPA, sign,
and trust the developer certificate if iOS asks.

## Release titles

- `sidestore-latest` → **Madarek.ipa — latest unsigned SideStore build**
- `android-latest` → **Madarek.apk — latest Android release build**

Both are prereleases, so they never replace the repository's “Latest” release.
Assets are uploaded with `--clobber`; the download URLs stay stable.
