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
    ["expo-document-picker", { iCloudDirectoryEnabled: false }],
    "expo-video",
    ["expo-updates", { username: "rh2011" }],
  ],
  experiments: {
    typedRoutes: true,
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
