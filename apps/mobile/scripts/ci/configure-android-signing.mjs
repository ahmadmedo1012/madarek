#!/usr/bin/env node
/**
 * Configure Android release signing after `expo prebuild`.
 *
 * Two modes:
 *   release — ANDROID_KEYSTORE_BASE64 is present. Materializes the keystore
 *             from the GitHub secret, writes android/key.properties, patches
 *             app/build.gradle, and exports SIGNING_MODE=release.
 *   debug   — no release secrets. The Expo template signs release builds
 *             with its stable debug keystore; exports SIGNING_MODE=debug and
 *             the verifier labels the artifact as internal/debug-signed.
 *
 * Never prints keystore bytes or passwords. The workflow deletes the
 * temporary keystore and key.properties after the build.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const marker = "madarekReleaseSigning";
const androidDir = path.join(process.cwd(), "android");
const gradleFile = path.join(androidDir, "app", "build.gradle");
const keyPropertiesFile = path.join(androidDir, "key.properties");
const buildDir = path.join(process.cwd(), "build");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function setEnv(name, value) {
  const file = process.env.GITHUB_ENV;
  if (file) fs.appendFileSync(file, `${name}=${value}\n`, "utf8");
  console.log(`${name}=${value}`);
}

function writeSigningInfo(info) {
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, "signing.json"), JSON.stringify(info, null, 2) + "\n");
}

function buildTypeBlock(source, name) {
  const buildTypesAt = source.indexOf("buildTypes {");
  if (buildTypesAt < 0) return "";
  const match = source
    .slice(buildTypesAt)
    .match(new RegExp(`\\n {8}${name} \\{[\\s\\S]*?\\n {8}\\}`));
  return match?.[0] || "";
}

function assertReleaseSigningWiring(source) {
  const debugBlock = buildTypeBlock(source, "debug");
  const releaseBlock = buildTypeBlock(source, "release");
  if (!debugBlock.includes("signingConfig signingConfigs.debug")) {
    fail("debug build type is not wired to signingConfigs.debug");
  }
  if (!releaseBlock.includes("signingConfig signingConfigs.release")) {
    fail("release build type is not wired to signingConfigs.release");
  }
}

if (!fs.existsSync(gradleFile)) {
  fail(`missing generated Gradle file: ${gradleFile}`);
}

let gradle = fs.readFileSync(gradleFile, "utf8");
const base64 = process.env.ANDROID_KEYSTORE_BASE64 || "";

if (!base64) {
  if (gradle.includes(marker)) {
    fail(
      "this native project was already configured for release signing; re-run " +
        "`npx expo prebuild --platform android` before building without secrets"
    );
  }
  const releaseBlock = buildTypeBlock(gradle, "release");
  if (!releaseBlock.includes("signingConfig signingConfigs.debug")) {
    fail(
      "no Android signing secrets are configured, and the Expo template no longer " +
        "release-signs with signingConfigs.debug; add the ANDROID_* secrets"
    );
  }
  fs.rmSync(keyPropertiesFile, { force: true });
  setEnv("SIGNING_MODE", "debug");
  writeSigningInfo({ mode: "debug", note: "Expo template debug keystore (internal build)" });
  console.log("Android signing: debug keystore (no ANDROID_KEYSTORE_BASE64 secret)");
  process.exit(0);
}

const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || "";
const keyAlias = process.env.ANDROID_KEY_ALIAS || "";
const keyPassword = process.env.ANDROID_KEY_PASSWORD || storePassword;
if (!storePassword || !keyAlias) {
  fail(
    "ANDROID_KEYSTORE_BASE64 is set but ANDROID_KEYSTORE_PASSWORD and " +
      "ANDROID_KEY_ALIAS must also be set"
  );
}
if (!keyPassword) {
  fail("ANDROID_KEY_PASSWORD (or the store password fallback) is empty");
}
// Android's apksigner and Gradle read PKCS#12 private keys with the same
// password as the store; a distinct key password silently fails at build time.
if (keyPassword !== storePassword) {
  fail(
    "PKCS#12 signing requires ANDROID_KEY_PASSWORD to equal " +
      "ANDROID_KEYSTORE_PASSWORD (or be omitted so the store password is used)"
  );
}

const keystorePath =
  process.env.ANDROID_KEYSTORE_PATH ||
  path.join(process.env.RUNNER_TEMP || os.tmpdir(), "madarek-release.keystore");
const keystore = Buffer.from(base64, "base64");
if (keystore.length < 1000) fail("decoded Android keystore is suspiciously small");
if (!(keystore[0] === 0x30 && keystore[1] === 0x82)) {
  fail("decoded Android keystore is not a PKCS#12 file");
}
fs.mkdirSync(path.dirname(keystorePath), { recursive: true });
fs.writeFileSync(keystorePath, keystore, { mode: 0o600 });

function propertiesEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

const keyProperties = [
  `storeFile=${propertiesEscape(path.resolve(keystorePath))}`,
  `storeType=PKCS12`,
  `storePassword=${propertiesEscape(storePassword)}`,
  `keyAlias=${propertiesEscape(keyAlias)}`,
  `keyPassword=${propertiesEscape(keyPassword)}`,
].join("\n");
fs.writeFileSync(keyPropertiesFile, keyProperties + "\n", { mode: 0o600 });

if (!gradle.includes(marker)) {
  const templateSigningConfigs = /(    signingConfigs \{\n        debug \{\n            storeFile file\('debug\.keystore'\)\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        \}\n)(    \})/;
  if (!templateSigningConfigs.test(gradle)) {
    fail(
      "Expo Android template drift: the template signingConfigs block changed. " +
        "Update apps/mobile/scripts/ci/configure-android-signing.mjs."
    );
  }

  gradle = gradle.replace(
    /^android\s*\{/m,
    `// ${marker}: release signing material is written by CI, never committed.\n` +
      `def keystoreProperties = new Properties()\n` +
      `def keystorePropertiesFile = rootProject.file("key.properties")\n` +
      `if (keystorePropertiesFile.exists()) {\n` +
      `    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))\n` +
      `}\n\nandroid {`
  );

  const releaseSigningConfig = `        release {
            if (!keystorePropertiesFile.exists()) {
                throw new GradleException("Missing android/key.properties for release signing")
            }
            storeFile file(keystoreProperties["storeFile"])
            storeType keystoreProperties["storeType"] ?: "PKCS12"
            storePassword keystoreProperties["storePassword"]
            keyAlias keystoreProperties["keyAlias"]
            keyPassword keystoreProperties["keyPassword"]
        }
`;
  gradle = gradle.replace(templateSigningConfigs, `$1${releaseSigningConfig}$2`);

  // Patch only the release build type inside `buildTypes`. Matching the first
  // `release {` in the file would hit signingConfigs.release and silently wire
  // the debug build type to the release key (and leave release on debug).
  const releaseBuildType =
    /(buildTypes\s*\{[\s\S]*?\n {8}release \{[\s\S]*?\n {12})signingConfig signingConfigs\.debug/;
  if (!releaseBuildType.test(gradle)) {
    fail(
      "Expo Android template drift: release build type no longer uses " +
        "signingConfigs.debug. Update apps/mobile/scripts/ci/configure-android-signing.mjs."
    );
  }
  gradle = gradle.replace(releaseBuildType, `$1signingConfig signingConfigs.release`);
  assertReleaseSigningWiring(gradle);
  fs.writeFileSync(gradleFile, gradle, "utf8");
}

assertReleaseSigningWiring(gradle);

let keytoolOutput;
try {
  keytoolOutput = execFileSync(
    "keytool",
    ["-list", "-v", "-keystore", keystorePath, "-alias", keyAlias, "-storepass", storePassword],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch (error) {
  const detail = error?.stderr?.toString?.() || error?.message || "unknown keytool error";
  fail(`keytool could not read the configured keystore: ${detail.trim()}`);
}
const certMatch = keytoolOutput.match(/SHA256:\s*([0-9A-F:]+)/i);
if (!certMatch) fail("keytool did not print the certificate SHA-256 fingerprint");
const certSha256 = certMatch[1].replace(/:/g, "").toLowerCase();

setEnv("SIGNING_MODE", "release");
setEnv("EXPECTED_CERT_SHA256", certSha256);
writeSigningInfo({ mode: "release", certificate_sha256: certSha256, key_alias: keyAlias });
console.log("Android signing: release keystore configured from GitHub secrets");
