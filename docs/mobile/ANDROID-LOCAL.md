# Android local builds — بناء أندرويد محلياً (r340/T-M5)

The Android LOCAL build path for `apps/mobile`: produce a signed release
APK on your own machine — **no EAS cloud quota, no CI minutes**. The cloud
quota blocked the R334 Android artifact (see `docs/mobile/MERGE.md` §6/8);
this is the escape hatch.

- Script: `scripts/build-android-local.sh` (repo root, idempotent, fails loud)
- Quick start (prereqs met + keystore in env): `scripts/build-android-local.sh`
- Artifact: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

Verification labels: script phases 0–2 **sandbox-verified** (JDK/SDK gates,
prebuild, key.properties, gradle patch, loud aborts); the gradle
`assembleRelease` step itself is **sandbox-BLOCKED** (maven + disk — §8) and
device/owner-machine VERIFIED only once run end to end.

---

## 1. Prerequisites

| Requirement | Version | Why |
|---|---|---|
| JDK | **17+** (17 or 21) | Expo SDK 58 · Gradle 9.4.1 · AGP 8/9 |
| Android SDK | `platforms;android-37` · `build-tools;37.0.0` · `platform-tools` | RN 0.88 `gradle/libs.versions.toml` (compileSdk 37, targetSdk 36, minSdk 24) |
| NDK | 27.1.12297006 | auto-fetched by gradle when a native module compiles C++ (reanimated/worklets) — ~2 GB |
| Node | ≥ 20 | `apps/mobile/package.json` engines |
| Disk | ~10 GB free | SDK + NDK + `~/.gradle` caches + first-run maven deps |
| First build | ~10–25 min | gradle dist + dependency resolution; subsequent builds are incremental |

Install the SDK pieces once (the script never does this for you — it only
checks and prints):

```bash
mkdir -p ~/android-sdk/cmdline-tools
curl -Lo /tmp/clt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip /tmp/clt.zip -d ~/android-sdk/cmdline-tools
mv ~/android-sdk/cmdline-tools/cmdline-tools ~/android-sdk/cmdline-tools/latest

# ~/.bashrc (then open a NEW shell):
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

sdkmanager "platform-tools" "platforms;android-37" "build-tools;37.0.0"
yes | sdkmanager --licenses        # gradle refuses to auto-fetch components with unaccepted licenses
```

JDK 17 (Temurin): `sudo apt install openjdk-17-jdk` ·
`sdk install java 17.0.13-tem` (sdkman) · `brew install --cask temurin@17`.

## 2. Keystore generation (one keystore, FOREVER)

The release keystore IS the app's identity on Play — lose it and you can
never update the same listing (unless Play App Signing is enabled, §5).
Generate once, back it up, never commit it:

```bash
mkdir -p ~/.madarek && keytool -genkeypair -v \
  -keystore ~/.madarek/madarek-release.keystore \
  -alias madarek -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12 \
  -dname "CN=Madarek, OU=Mobile, O=Madarek, L=Tripoli, ST=Tripoli, C=LY"
```

keytool prompts for the passwords — keep them OFF the command line (shell
history). Then export before building:

```bash
export MADAREK_ANDROID_KEYSTORE=~/.madarek/madarek-release.keystore
export MADAREK_ANDROID_KEYSTORE_ALIAS=madarek
export MADAREK_ANDROID_KEYSTORE_PASSWORD='…'          # keystore password
export MADAREK_ANDROID_KEYSTORE_KEY_PASSWORD='…'      # optional; defaults to the store password
```

The script turns these into `android/key.properties` (chmod 600, gitignored
— the repo ignores the whole generated `android/` dir) and patches
`android/app/build.gradle` to sign `release` with it. Without credentials
the script exits loud with the keytool command above; with
`ALLOW_DEBUG_KEYSTORE=1` it builds a debug-signed APK (emulator only —
**Play rejects it**).

## 3. The three build paths

### A. Local gradle (the script — zero quota)

```bash
scripts/build-android-local.sh              # prereqs + keystore env as above
# → apps/mobile/android/app/build/outputs/apk/release/app-release.apk
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

What it does, in order: preflight (Node ≥20, JDK 17+, ANDROID_HOME with the
exact platform/build-tools — printing install commands and **aborting**
otherwise, never auto-downloading the SDK) → `npx expo prebuild -p android
--no-install` (clean regen of `android/`; the repo's committed
`android`/`ios` npm scripts are restored afterward — prebuild rewrites them
to `expo run:*`) → key.properties + signing patch → `./gradlew
assembleRelease` → prints the APK path. Idempotent: every run regenerates
`android/` from `app.config.ts` and re-applies the patch (the patcher
anchors on the SDK-58 template text and fails loud on template drift
instead of silently building an unsigned "release"). Extra gradle args pass
through: `scripts/build-android-local.sh --stacktrace --info`.

For Play's AAB: `cd apps/mobile/android && ./gradlew bundleRelease` →
`android/app/build/outputs/bundle/release/app-release.aab`.

### B. `eas build --local` (EAS tooling, still your machine)

Linux requires **Docker** running (EAS executes the build in its image);
macOS runs natively. Credentials come from the EAS servers — upload the SAME
keystore once so both paths sign identically:

```bash
npm i -g eas-cli && eas login                 # or EXPO_TOKEN=… headless
eas credentials -p android                    # upload ~/.madarek/madarek-release.keystore
cd apps/mobile
eas build --platform android --profile preview --local
```

Slower than raw gradle (image + credential handshake) but you keep EAS's
environment, artifact upload, and `eas.json` profiles (`preview` = internal
APK, `production` = app-bundle).

### C. Classic EAS cloud

```bash
cd apps/mobile && EXPO_TOKEN=… npx eas-cli@latest build --platform android --profile preview --no-wait --non-interactive
```

The default when quota allows (`eas.json`: `preview`→APK internal,
`production`→app-bundle; `autoIncrement` on). Consumes the account's build
quota — the very constraint that birthed paths A/B.

| | A. gradle local | B. eas --local | C. eas cloud |
|---|---|---|---|
| EAS quota | none | none | consumed |
| Machine | yours (JDK+SDK) | yours (Docker) | Expo's |
| Credentials | `MADAREK_ANDROID_*` env | EAS servers | EAS servers |
| Best for | quota-free releases, full control | EAS-parity without quota | default, zero setup |

## 4. Signing for Play

- Play requires an **AAB** for new listings: `./gradlew bundleRelease`
  (path A) or the `production` profile (paths B/C).
- Enable **Play App Signing** (default for new apps): you upload once with
  your upload key; Play re-signs distributions. Even then, keep the upload
  keystore safe — losing it means a support-ticket reset.
- `versionCode`: local builds read `app.config.ts` (prebuild bakes
  `versionCode 1` / `version 1.0.0` — bump `version` and, for Play, set
  `android.versionCode` explicitly). EAS cloud builds with
  `appVersionSource: "remote"` auto-increment (`eas.json` `autoIncrement`).
  Never ship two different binaries with the same `versionCode`.
- One keystore per listing, forever: `ly.madarek.mobile` is signed by
  `~/.madarek/madarek-release.keystore` (alias `madarek`) on every path.

## 5. Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `Unsupported class file major version` / gradle daemon dies at startup | JDK ≠ 17+ (often 11) → `java -version`; install JDK 17/21, export `JAVA_HOME` |
| `failed to find target with hash string 'android-37'` / license prompt mid-build | SDK component or licenses missing → `sdkmanager "platforms;android-37" "build-tools;37.0.0"` then `yes \| sdkmanager --licenses` |
| Script exits `Android SDK missing` | `ANDROID_HOME` unset or not a dir → §1 step 2, new shell |
| Script exits `template drift: …` | Expo changed the prebuild gradle template → inspect `android/app/build.gradle`, update the patcher anchors in `scripts/build-android-local.sh` |
| Script exits `keystore file not found` | env points at a missing path → re-check `MADAREK_ANDROID_KEYSTORE` (§2 keytool command is printed by the script) |
| `git status` dirty after a build | unexpected — the script restores `package.json` scripts post-prebuild; the whole `android/` dir is gitignored (CNG). Commit nothing from `android/`. |
| Gradle OOM (4 GB machines) | raise `org.gradle.jvmargs` in `android/gradle.properties` (e.g. `-Xmx4096m`) or `--no-daemon` |
| First build "hangs" | downloading gradle 9.4.1 + maven deps + NDK (~2 GB) — watch `~/.gradle`; later builds are incremental |
| `eas build --local` can't find docker | Linux requires the daemon: `systemctl start docker` + group membership |

## 6. OTA: `eas update` does NOT need a new build

The app uses `expo-updates` with `runtimeVersion.policy: "fingerprint"`
(`app.config.ts`). Consequences:

- **JS-only changes** (screens, logic, assets via Metro) ship over the air —
  `eas update --branch <channel>` — no APK, no quota, seconds not minutes.
- **Native changes** (new dependency, plugin, `app.config.ts` native keys)
  change the fingerprint → a NEW BINARY must be built once (this doc's
  paths), and subsequent `eas update`s then target the new runtime.
- This branch (r340/T-M5) adds the native dep `expo-navigation-bar`
  (LR-001) → **new fingerprint**: build once via path A/B/C, then
  `eas update` carries the JS stream forward. Old installed binaries stay
  pinned to the old runtime (their fallback: the `BlockingUpdateGate` /
  `useVersionGate` floor in `src/lib/updates`).
- Channels map to `eas.json`: `development` / `preview` / `production` —
  same runtime pairing rules per channel.

## 7. LR-001 wiring recap (what the local build will contain)

`expo-navigation-bar@~58.0.4`: plugin `[ "expo-navigation-bar",
{ enforceContrast: true } ]` in `app.config.ts` (gesture-handle scrim
contrast under enforced SDK-58 edge-to-edge) + `AppNavigationBar`
(`src/design/navbar.tsx`) mounted at the root beside `AppStatusBar` — bar
style derived from the EFFECTIVE theme (paper→light bar/dark handle,
charcoal→dark bar/light handle). iOS/web: no-op. Fingerprint changes — see §6.

## 8. Sandbox status (r340, this author's machine)

Executed here to the extent the sandbox allows:

- ✅ prebuild regen, package.json script restore, key.properties + signing
  patch (against the REAL generated `android/app/build.gradle`), loud
  aborts for missing JDK/SDK/keystore (`exit 1`, exact install commands).
- ✅ gradle wrapper 9.4.1 downloads and starts.
- ❌ `assembleRelease` cannot finish here: `repo.maven.org` is DNS-blocked
  (kotlin gradle plugin 2.2.0 unresolvable — observed: "could not resolve
  plugin artifact"), and only ~2.4 GB free disk vs the ~10 GB an RN 0.88
  release build (NDK 27.1 + gradle caches) wants. `ANDROID_HOME` is also
  absent. `dl.google.com` SDK URLs themselves ARE reachable (HTTP 200) —
  the script therefore stops at its SDK gate by design: **abort cleanly,
  never auto-download**. The owner (or any machine with §1) runs the real
  build; nothing here is claimed device-verified.
