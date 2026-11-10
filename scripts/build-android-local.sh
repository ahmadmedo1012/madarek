#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# build-android-local.sh — R340 T-M5: the Android LOCAL build path.
#
# Builds a release APK of apps/mobile on YOUR machine — no EAS quota, no
# CI minutes. Full documentation: docs/mobile/ANDROID-LOCAL.md.
#
# What it does (idempotent — safe to re-run end to end):
#   0. Preflight: JDK 17+ · Android SDK (ANDROID_HOME) · Node 20+ · deps.
#      FAILS LOUD on anything missing, printing exactly what to install.
#      It NEVER auto-downloads the Android SDK or accepts licenses for you.
#   1. npx expo prebuild -p android --no-install   (clean regen of android/)
#      → restores the repo's committed `android`/`ios` npm scripts that
#        prebuild rewrites to `expo run:*` (repo state stays clean).
#   2. Materializes android/key.properties from MADAREK_ANDROID_* env vars
#      and patches android/app/build.gradle with a release signingConfig
#      (the SDK-58 prebuild template release-signs with the DEBUG keystore —
#      see the patcher's drift checks).
#   3. cd android && ./gradlew assembleRelease
#   4. Prints the APK path (…/android/app/build/outputs/apk/release/).
#
# Keystore env vars (release signing; see §Keystore generation below):
#   MADAREK_ANDROID_KEYSTORE            path to the .keystore (REQUIRED)
#   MADAREK_ANDROID_KEYSTORE_ALIAS      key alias inside it            (REQUIRED)
#   MADAREK_ANDROID_KEYSTORE_PASSWORD   keystore password              (REQUIRED)
#   MADAREK_ANDROID_KEYSTORE_KEY_PASSWORD  key password (DEFAULT: = store password)
#
# Keystore generation (once, if you don't have one):
#   mkdir -p ~/.madarek && keytool -genkeypair -v \
#     -keystore ~/.madarek/madarek-release.keystore \
#     -alias madarek -keyalg RSA -keysize 2048 -validity 10000 \
#     -storetype PKCS12 \
#     -dname "CN=Madarek, OU=Mobile, O=Madarek, L=Tripoli, ST=Tripoli, C=LY"
#   (keytool prompts for the passwords — do NOT put them on the command line;
#    they would land in your shell history.)
#
# Testing the build path WITHOUT a release keystore (APK is DEBUG-signed —
# fine for a local emulator, rejected by Play):
#   ALLOW_DEBUG_KEYSTORE=1 scripts/build-android-local.sh
#
# ── ALTERNATIVE: `eas build --local` (commented on purpose) ────────────
# Same "no cloud quota" goal, EAS-CLI-driven (Linux needs Docker running;
# macOS runs natively). Credentials are fetched from the EAS servers, so
# upload the SAME keystore once: `eas credentials -p android`.
#
#   npm i -g eas-cli && eas login            # or EXPO_TOKEN=… for headless
#   cd apps/mobile
#   EXPO_TOKEN=… eas build --platform android --profile preview --local
#   # add --non-interactive --no-wait for scripted use; ~2× slower than
#   # raw gradle on the same machine but reuses EAS's environment image,
#   # credentials handling and artifact upload.
#
# NOTE on OTA: this build changes the runtime fingerprint whenever native
# deps/plugins/config change (runtimeVersion policy = "fingerprint").
# JS-only changes ship via `eas update` WITHOUT a new build — but ONLY to
# binaries whose fingerprint matches; after THIS branch (new native dep
# expo-navigation-bar) an OTA update must target the NEW runtime (build
# once, then `eas update`). See docs/mobile/ANDROID-LOCAL.md §OTA.
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
APK_PATH="$MOBILE_DIR/android/app/build/outputs/apk/release/app-release.apk"

# SDK components required by Expo SDK 58 / RN 0.88 (react-native/gradle
# libs.versions.toml): compileSdk 37 · targetSdk 36 · buildTools 37.0.0.
SDK_PLATFORM="platforms;android-37.0"
SDK_BUILD_TOOLS="build-tools;37.0.0"
SDK_PLATFORM_DIR="platforms/android-37.0"
SDK_BUILD_TOOLS_DIR="build-tools/37.0.0"

say()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32m✔\033[0m %s\n' "$*"; }
warn() { printf '  \033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m✘ %s\033[0m\n\n' "$*" >&2; exit 1; }

# ── 0a. Node + dependencies ────────────────────────────────────────────
say "Node + dependencies"
command -v node >/dev/null 2>&1 || die "node not found — install Node ≥ 20 (https://nodejs.org)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$NODE_MAJOR" -ge 20 ]] || die "node $NODE_MAJOR found — apps/mobile requires ≥ 20 (package.json engines)"
ok "node $(node --version)"
[[ -d "$MOBILE_DIR/node_modules" ]] || {
  warn "node_modules missing — running npm ci (package-lock.json, ~2 min)…"
  (cd "$MOBILE_DIR" && npm ci --no-audit --no-fund)
}
ok "dependencies installed"

# ── 0b. JDK 17+ ────────────────────────────────────────────────────────
say "JDK (requirement: 17 or newer — Expo SDK 58 / Gradle 9)"
JAVA_BIN="${JAVA_HOME:+$JAVA_HOME/bin/java}"
[[ -x "$JAVA_BIN" ]] || JAVA_BIN="$(command -v java || true)"
if [[ -z "$JAVA_BIN" ]]; then
  cat >&2 <<'EOF'
  java NOT found. Install JDK 17 (Temurin recommended):

    Debian/Ubuntu:  sudo apt install -y openjdk-17-jdk
    Any Linux:      curl -s "https://get.sdkman.io" | bash && sdk install java 17.0.13-tem
    macOS:          brew install --cask temurin@17

  Then export JAVA_HOME (e.g. ~/.sdkman/candidates/java/current) and re-run.
EOF
  die "JDK missing — see the install commands above"
fi
JAVA_RAW="$("$JAVA_BIN" -version 2>&1 | head -1)"
JAVA_VERSION="$(sed -E 's/.*version "([^"]*)".*/\1/' <<<"$JAVA_RAW")"
JAVA_MAJOR="$(cut -d. -f1 <<<"$JAVA_VERSION")"
[[ "$JAVA_MAJOR" == "1" ]] && JAVA_MAJOR="$(cut -d. -f2 <<<"$JAVA_VERSION")"   # old style 1.8.0_x
[[ "$JAVA_MAJOR" =~ ^[0-9]+$ ]] || die "could not parse the java version from '$JAVA_RAW' — is $JAVA_BIN really a JDK?"
[[ "$JAVA_MAJOR" -ge 17 ]] || die "JDK $JAVA_MAJOR found ($JAVA_RAW) — need 17+. Install: apt install openjdk-17-jdk  |  sdk install java 17.0.13-tem  |  brew install --cask temurin@17"
[[ -n "${JAVA_HOME:-}" ]] || {
  export JAVA_HOME="$(cd "$(dirname "$JAVA_BIN")/.." && pwd)"
  warn "JAVA_HOME was unset — exported it as $JAVA_HOME (gradlew prefers it)"
}
ok "$JAVA_RAW (JAVA_HOME=$JAVA_HOME)"

# ── 0c. Android SDK (never auto-downloaded — print, then fail) ─────────
say "Android SDK (ANDROID_HOME)"
ANDROID_HOME_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$ANDROID_HOME_DIR" || ! -d "$ANDROID_HOME_DIR" ]]; then
  cat >&2 <<EOF
  ANDROID_HOME not set (or missing). What the script needs and how to install it:

    1) Command-line tools (Linux; macOS: commandlinetools-mac-…_latest.zip):
       mkdir -p ~/android-sdk/cmdline-tools
       curl -Lo /tmp/clt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
       unzip /tmp/clt.zip -d ~/android-sdk/cmdline-tools
       mv ~/android-sdk/cmdline-tools/cmdline-tools ~/android-sdk/cmdline-tools/latest

    2) Env (add to ~/.bashrc / ~/.zshrc, then open a NEW shell):
       export ANDROID_HOME=\$HOME/android-sdk
       export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools

    3) Components + licenses (this script never runs these for you):
       sdkmanager "platform-tools" "$SDK_PLATFORM" "$SDK_BUILD_TOOLS"
       yes | sdkmanager --licenses

  Detected: ANDROID_HOME='${ANDROID_HOME:-unset}' ANDROID_SDK_ROOT='${ANDROID_SDK_ROOT:-unset}'
  (Newest commandline-tools URL: https://developer.android.com/studio#command-line-tools-only)
EOF
  die "Android SDK missing — follow the 3 steps above, then re-run"
fi
[[ -x "$ANDROID_HOME_DIR/platform-tools/adb" ]] || warn "platform-tools/adb not found — gradle needs it for device installs (sdkmanager \"platform-tools\")"
[[ -d "$ANDROID_HOME_DIR/$SDK_PLATFORM_DIR" ]] || die "$SDK_PLATFORM missing under ANDROID_HOME — install it: sdkmanager \"$SDK_PLATFORM\""
[[ -d "$ANDROID_HOME_DIR/$SDK_BUILD_TOOLS_DIR" ]] || die "$SDK_BUILD_TOOLS missing under ANDROID_HOME — install it: sdkmanager \"$SDK_BUILD_TOOLS\""
warn "If gradle later fails with 'failed to find target with hash string' or license prompts: yes | sdkmanager --licenses"
ok "ANDROID_HOME=$ANDROID_HOME_DIR ($SDK_PLATFORM + $SDK_BUILD_TOOLS present)"

# ── 0d. Release keystore (env-provided; opt out with ALLOW_DEBUG_KEYSTORE=1) ──
say "Release keystore (MADAREK_ANDROID_KEYSTORE, …_ALIAS, …_PASSWORD[, …_KEY_PASSWORD])"
KEYSTORE="${MADAREK_ANDROID_KEYSTORE:-}"
ALIAS="${MADAREK_ANDROID_KEYSTORE_ALIAS:-}"
STORE_PASS="${MADAREK_ANDROID_KEYSTORE_PASSWORD:-}"
KEY_PASS="${MADAREK_ANDROID_KEYSTORE_KEY_PASSWORD:-$STORE_PASS}"   # keytool defaults keypass=storepass
if [[ -n "$KEYSTORE" || -n "$ALIAS" || -n "$STORE_PASS" ]]; then
  [[ -n "$KEYSTORE" && -n "$ALIAS" && -n "$STORE_PASS" ]] || die "partial keystore env — set ALL of MADAREK_ANDROID_KEYSTORE, MADAREK_ANDROID_KEYSTORE_ALIAS, MADAREK_ANDROID_KEYSTORE_PASSWORD (…_KEY_PASSWORD optional)"
  [[ -f "$KEYSTORE" ]] || {
    cat >&2 <<EOF
  MADAREK_ANDROID_KEYSTORE='$KEYSTORE' — file not found. Generate one (exact command):

    mkdir -p ~/.madarek && keytool -genkeypair -v \\
      -keystore ~/.madarek/madarek-release.keystore \\
      -alias madarek -keyalg RSA -keysize 2048 -validity 10000 \\
      -storetype PKCS12 \\
      -dname "CN=Madarek, OU=Mobile, O=Madarek, L=Tripoli, ST=Tripoli, C=LY"

  (keytool prompts for the passwords — never put them on the command line.)
  Then: export MADAREK_ANDROID_KEYSTORE=~/.madarek/madarek-release.keystore \\
              MADAREK_ANDROID_KEYSTORE_ALIAS=madarek \\
              MADAREK_ANDROID_KEYSTORE_PASSWORD='…'
EOF
    die "keystore file not found — see the keytool command above"
  }
  ok "keystore: $KEYSTORE (alias: $ALIAS)"
elif [[ "${ALLOW_DEBUG_KEYSTORE:-0}" == "1" ]]; then
  warn "ALLOW_DEBUG_KEYSTORE=1 → release APK will be signed with the DEBUG keystore (emulator/local installs only — Play rejects it)"
else
  cat >&1 <<'EOF'
  No MADAREK_ANDROID_* credentials in the environment. Generate a keystore (exact command):

    mkdir -p ~/.madarek && keytool -genkeypair -v \
      -keystore ~/.madarek/madarek-release.keystore \
      -alias madarek -keyalg RSA -keysize 2048 -validity 10000 \
      -storetype PKCS12 \
      -dname "CN=Madarek, OU=Mobile, O=Madarek, L=Tripoli, ST=Tripoli, C=LY"

  Then export MADAREK_ANDROID_KEYSTORE / _ALIAS / _PASSWORD (and optionally
  _KEY_PASSWORD, default = store password) and re-run.
  Just want to exercise the build path on an emulator? Re-run with:
    ALLOW_DEBUG_KEYSTORE=1 scripts/build-android-local.sh
EOF
  die "release keystore not configured — see the keytool command above"
fi

# ── 1. expo prebuild (clean regen of android/) ──────────────────────────
say "expo prebuild -p android --no-install (regenerates android/ from app.config.ts)"
(cd "$MOBILE_DIR" && npx expo prebuild -p android --no-install)
ok "android/ regenerated"

# prebuild rewrites the `android`/`ios` npm scripts to `expo run:*`; restore
# the repo's committed CNG scripts so `git status` stays clean.
(cd "$MOBILE_DIR" && npm pkg set scripts.android="expo start --android" scripts.ios="expo start --ios")
ok "package.json android/ios scripts restored (prebuild side effect reverted)"

# ── 2. key.properties + release signingConfig patch ─────────────────────
say "Release signing (android/key.properties + app/build.gradle patch)"
if [[ -n "$KEYSTORE" ]]; then
  KEYSTORE_ABS="$(cd "$(dirname "$KEYSTORE")" && pwd)/$(basename "$KEYSTORE")"
  # Absolute storeFile path → no ambiguity for `file()` inside app/build.gradle.
  # chmod 600 + gitignore guards: this file carries the store password.
  printf 'storeFile=%s\nkeyAlias=%s\nstorePassword=%s\nkeyPassword=%s\n' \
    "$KEYSTORE_ABS" "$ALIAS" "$STORE_PASS" "$KEY_PASS" \
    > "$MOBILE_DIR/android/key.properties"
  chmod 600 "$MOBILE_DIR/android/key.properties"
  grep -q '^key.properties$' "$MOBILE_DIR/android/.gitignore" 2>/dev/null || \
    printf '\n# MADAREK local release signing (build-android-local.sh)\nkey.properties\n' >> "$MOBILE_DIR/android/.gitignore"
  ok "android/key.properties written (gitignored, chmod 600)"
else
  ok "no credentials — leaving the template's debug-keystore signing in place"
fi

GRADLE_FILE="$MOBILE_DIR/android/app/build.gradle"
GRADLE_FILE="$GRADLE_FILE" node <<'PATCHER'
// Patches the SDK-58 prebuild template so `release` uses key.properties when
// present (else falls back to the template's debug signing). Exact-string
// anchors + drift checks: if Expo changes the template, this FAILS LOUD
// instead of silently building an unsigned/debug-signed "release".
const fs = require("fs");
const file = process.env.GRADLE_FILE;
let s = fs.readFileSync(file, "utf8");
if (s.includes("MADAREK local release signing")) {
  console.log("  ✔ app/build.gradle already patched (idempotent)");
  process.exit(0);
}
const PREAMBLE = [
  "// ── MADAREK local release signing (scripts/build-android-local.sh) ──",
  "// Reads android/key.properties (written from MADAREK_ANDROID_* env vars).",
  "def keystoreProperties = new Properties()",
  'def keystorePropertiesFile = rootProject.file("key.properties")',
  "if (keystorePropertiesFile.exists()) {",
  "    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))",
  "}",
  "",
].join("\n");
const RELEASE_CFG = [
  "        // MADAREK local release signing (key.properties present → sign; else debug fallback)",
  "        if (keystorePropertiesFile.exists()) {",
  "            release {",
  '                storeFile file(keystoreProperties["storeFile"])',
  '                keyAlias keystoreProperties["keyAlias"]',
  '                storePassword keystoreProperties["storePassword"]',
  '                keyPassword keystoreProperties["keyPassword"]',
  "            }",
  "        }",
].join("\n");
const FROM = [
  "        release {",
  "            // Caution! In production, you need to generate your own keystore file.",
  "            // see https://reactnative.dev/docs/signed-apk-android.",
  "            signingConfig signingConfigs.debug",
].join("\n");
const TO = [
  "        release {",
  "            // Caution! In production, you need to generate your own keystore file.",
  "            // see https://reactnative.dev/docs/signed-apk-android.",
  "            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug",
].join("\n");
if (!/^android \{$/m.test(s)) { console.error("  ✘ template drift: top-level `android {` not found"); process.exit(1); }
if (!/^    signingConfigs \{$/m.test(s)) { console.error("  ✘ template drift: `signingConfigs {` not found"); process.exit(1); }
if (!s.includes(FROM)) { console.error("  ✘ template drift: release signingConfig anchor not found — inspect android/app/build.gradle and update scripts/build-android-local.sh"); process.exit(1); }
s = s.replace(/^android \{$/m, PREAMBLE + "android {");
s = s.replace(/^    signingConfigs \{$/m, "    signingConfigs {\n" + RELEASE_CFG);
s = s.replace(FROM, TO);
fs.writeFileSync(file, s);
console.log("  ✔ app/build.gradle patched: release signs via key.properties when present");
PATCHER
ok "release signing wired"

# local.properties pins the SDK dir for the gradle daemon (gitignored).
printf 'sdk.dir=%s\n' "$(printf '%s' "$ANDROID_HOME_DIR" | sed 's/\\/\\\\/g')" \
  > "$MOBILE_DIR/android/local.properties"
ok "android/local.properties → sdk.dir=$ANDROID_HOME_DIR"

# ── 3. gradle assembleRelease ───────────────────────────────────────────
say "gradlew assembleRelease (first run: downloads gradle 9.4.1 + deps — several minutes)"
(cd "$MOBILE_DIR/android" && ./gradlew assembleRelease "$@")
ok "assembleRelease finished"

# ── 4. The artifact ─────────────────────────────────────────────────────
say "APK"
[[ -f "$APK_PATH" ]] || die "assembleRelease reported success but $APK_PATH is missing — check android/app/build/outputs/apk/release/"
APK_SIZE="$(du -h "$APK_PATH" | cut -f1)"
printf '  \033[1;32m✔\033[0m %s (%s)\n' "$APK_PATH" "$APK_SIZE"
echo ""
echo "  Install on a connected device:   adb install -r \"$APK_PATH\""
if [[ -z "$KEYSTORE" ]]; then
  echo "  ⚠ DEBUG-signed (ALLOW_DEBUG_KEYSTORE) — do NOT upload to Play."
else
  echo "  Release-signed with: $KEYSTORE (alias $ALIAS)"
  echo "  Play upload wants an AAB instead: cd apps/mobile/android && ./gradlew bundleRelease"
  echo "  → android/app/build/outputs/bundle/release/app-release.aab"
fi
echo ""
echo "  OTA reminder: this binary embeds the CURRENT runtime fingerprint."
echo "  JS-only changes still ship via 'eas update' WITHOUT a new build, but"
echo "  only to binaries whose fingerprint matches — see"
echo "  docs/mobile/ANDROID-LOCAL.md §OTA."
