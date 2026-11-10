#!/usr/bin/env node
/**
 * Validate the evaluated Expo public config before spending CI time on a
 * native build. Fails on the things a native artifact must never get wrong:
 * SDK major, app version, and the platform bundle/package identifier.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const platformIndex = args.indexOf("--platform");
const configIndex = args.indexOf("--config");
const platform = platformIndex >= 0 ? args[platformIndex + 1] : "";
const configPath = configIndex >= 0 ? args[configIndex + 1] : "build/expo-config.json";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!["ios", "android"].includes(platform)) fail("--platform must be ios or android");
if (!fs.existsSync(configPath)) fail(`missing Expo config: ${configPath}`);

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const expectedId = "ly.madarek.mobile";
const actualId = platform === "ios" ? config?.ios?.bundleIdentifier : config?.android?.package;

console.log(`Expo SDK:        ${config.sdkVersion}`);
console.log(`App:             ${config.name} (${config.slug})`);
console.log(`Version:         ${config.version}`);
console.log(`${platform} id:      ${actualId}`);
console.log(`Runtime:         ${JSON.stringify(config.runtimeVersion)}`);
console.log(`OTA channel:     ${config.updates?.requestHeaders?.["expo-channel-name"] ?? "<none>"}`);
console.log(`OTA URL:         ${config.updates?.url ?? "<none>"}`);

if (!String(config.sdkVersion || "").startsWith("58.")) {
  fail(`unexpected Expo SDK version: ${config.sdkVersion}`);
}
if (actualId !== expectedId) fail(`unexpected ${platform} identifier: ${actualId}`);
if (!config.version) fail("app version is missing");
if (!config.updates?.url) fail("updates.url is missing");
if (JSON.stringify(config.runtimeVersion) !== JSON.stringify({ policy: "fingerprint" })) {
  fail(`unexpected runtimeVersion policy: ${JSON.stringify(config.runtimeVersion)}`);
}
if (process.env.EXPO_UPDATES_CHANNEL) {
  const channel = config.updates?.requestHeaders?.["expo-channel-name"];
  if (channel !== process.env.EXPO_UPDATES_CHANNEL) {
    fail(
      `OTA channel ${channel ?? "<none>"} does not match ` +
        `EXPO_UPDATES_CHANNEL=${process.env.EXPO_UPDATES_CHANNEL}`
    );
  }
}
if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  fail("EXPO_PUBLIC_API_BASE_URL is not set in the build environment");
}
if (!config.extra?.eas?.projectId) {
  console.log("WARN: no EAS projectId in public config (native build does not need it)");
}

const out = {
  platform,
  expected_id: expectedId,
  actual_id: actualId,
  sdk_version: config.sdkVersion,
  version: config.version,
};
fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(
  path.join(path.dirname(configPath), `expo-config-check-${platform}.json`),
  JSON.stringify(out, null, 2) + "\n"
);
console.log("Expo config validation passed");
