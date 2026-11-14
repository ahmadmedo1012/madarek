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
    // R350 R5 — monotonically increasing with every CI build: the release
    // workflow exports MADAREK_VERSION_CODE=$(github.run_number) before
    // prebuild; local/dev builds stay at 1.
    versionCode: Number(process.env.MADAREK_VERSION_CODE ?? 1),
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-foreground.png",
      backgroundImage: "./assets/images/adaptive-background.png",
      monochromeImage: "./assets/images/adaptive-monochrome.png",
    },
    // T-50 (P1-d): Android 14+ predictive back — the app has ZERO
    // BackHandler.preventDefault() calls (grep-verified), so enabling the
    // gesture is safe: sheets/dialogs close with the system cross-activity
    // back animation. Takes effect with the next EAS/gradle build (T-51
    // owns the build + fingerprint bump; OTA alone cannot ship this flag).
    predictiveBackGestureEnabled: true,
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    // r349-P4 — RTL baked natively BEFORE the first React root: the
    // JS-side controlled reload (lib/rtl.ts) is retired — reloading the
    // context mid-boot left the reloaded tree with a dead render
    // pipeline (views mounted, zero frames painted — the CI smoke's
    // bare-paper screen across all 13 anchor generations).
    "./plugins/force-rtl-android",
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
    // R340 T-M5 (LR-001) — expo-navigation-bar for Android gesture-handle
    // contrast under enforced edge-to-edge: `enforceContrast` keeps the OS's
    // translucent scrim behind the gesture handle / 3-button bar so it never
    // sits on low-contrast content in dark mode. The concrete bar STYLE is
    // derived at runtime from the effective app theme (src/design/navbar.tsx
    // → AppNavigationBar in app/_layout.tsx); this plugin entry covers the
    // pre-JS cold-boot moment. NEW NATIVE DEP → new fingerprint → needs a
    // new binary build (local gradle path: scripts/build-android-local.sh,
    // docs/mobile/ANDROID-LOCAL.md); OTA alone cannot ship this.
    ["expo-navigation-bar", { enforceContrast: true }],
    ["expo-document-picker", { iCloudDirectoryEnabled: false }],
    "expo-video",
    // R327 C3 — the biometric app-lock (cold-start gate). D3: the
    // FaceID prompt in Arabic (the plugin's default is English).
    [
      "expo-local-authentication",
      { faceIDPermission: "يستخدم التطبيق Face ID للتحقق من هويتك عند فتح التطبيق." },
    ],
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
    // Raw Xcode/Gradle CI builds have no EAS Build channel injection. The
    // native workflows set EXPO_UPDATES_CHANNEL=production so the installed
    // binary requests the same channel that mobile.yml publishes to. EAS
    // Builds leave this unset and keep using their eas.json channel.
    requestHeaders: process.env.EXPO_UPDATES_CHANNEL
      ? { "expo-channel-name": process.env.EXPO_UPDATES_CHANNEL }
      : undefined,
  },
  runtimeVersion: {
    policy: "fingerprint",
  },
  experiments: {
    typedRoutes: true,
    // R327 C5 — reactCompiler OFF. The fresh-device builds from the D2
    // open (the confirmation step that was left unverified) terminate the
    // app immediately after login. The React Compiler is incompatible with
    // several reanimated UI-thread patterns used on login-adjacent screens
    // (AnimatedCircle/AnimatedTextInput + useAnimatedProps/useDerivedValue)
    // and the resulting failure is a native crash, not a JS error boundary.
    // tsc/jest stay green either way, so the safety net was useless here.
    // Re-enable only after a production-stable verification pass; revert
    // this flag (rather than shipping a workaround) if it regresses again.
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
