import type { ExpoConfig } from "expo/config";

/**
 * مدارك — Madarek mobile (Expo / React Native).
 *
 * Brand: the Heron system — paper #F6F6EE · ink #282828 · orange #FA3600.
 * The API base URL is public configuration (EXPO_PUBLIC_API_BASE_URL);
 * secrets never belong in this file or in the app bundle.
 */
const config: ExpoConfig = {
  name: "مدارك",
  slug: "madarek-mobile",
  version: "1.0.0",
  scheme: "madarek",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  description: "مدارك — منصّة التعليم الذكي (تطبيق الجوال الرسمي)",
  backgroundColor: "#F6F6EE",
  primaryColor: "#FA3600",
  ios: {
    bundleIdentifier: "ly.madarek.mobile",
    supportsTablet: true,
    infoPlist: {
      CFBundleDisplayName: "مدارك",
      CFBundleLocalizations: ["ar"],
      CFBundleDevelopmentRegion: "ar",
      SupportsRTL: true,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "ly.madarek.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-foreground.png",
      backgroundImage: "./assets/images/adaptive-background.png",
      monochromeImage: "./assets/images/adaptive-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F6F6EE",
        dark: { backgroundColor: "#282828" },
        image: "./assets/images/splash-icon.png",
        imageWidth: 120,
      },
    ],
    ["expo-secure-store", {}],
    // R327 C3 — the push notification icon (the brand's white silhouette)
    // + the orange accent for the Android status-bar tint.
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#FA3600",
      },
    ],
    ["expo-document-picker", { iCloudDirectoryEnabled: false }],
    "expo-video",
    // R327 C3 — the biometric app-lock (cold-start gate; the
    // faceID permission prompt on iOS).
    "expo-local-authentication",
    // R326 M0.5 — real OTA: the project's update endpoint, not a username
    // placeholder. runtimeVersion uses the fingerprint policy so any native
    // dependency/plugin/config change produces a new binary+update pairing.
    [
      "expo-updates",
      {
        url: "https://u.expo.dev/afc4265f-664e-4325-a0ff-b621b81fe1b0",
      },
    ],
  ],
  updates: {
    url: "https://u.expo.dev/afc4265f-664e-4325-a0ff-b621b81fe1b0",
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: "fingerprint",
  },
  experiments: {
    typedRoutes: true,
    // R327 C5 — reactCompiler ON: the M1.3 crash suspect (reanimated ×
    // compiler) left the tree in C4, and the 87-warning purity ratchet is
    // at zero (every set-state-in-effect / purity / immutability finding
    // fixed by refactor, not suppression). With the plugin on: tsc 0 ·
    // jest 726/726 · export green (4.51 MB, −27% vs the R327-open
    // baseline). D2 fresh device builds are the confirmation step; the
    // rollback is this one flag.
    reactCompiler: true,
  },
  extra: {
    // Public configuration — safe to inline. The default targets the deployed
    // production API at all times so a bare clone works out of the box.
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://madarek.onrender.com/api/v1",
    eas: {
      projectId: "afc4265f-664e-4325-a0ff-b621b81fe1b0",
    },
  },
};

export default config;
