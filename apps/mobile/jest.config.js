/**
 * R326 M1.2 — the render-test net. jest-expo preset + one suite that
 * mounts EVERY route screen with the API/telemetry transports mocked:
 * an import-time or render-time crash (module-scope Intl, undefined
 * fields, missing providers) fails CI in seconds — the crash class the
 * owner saw on device, caught before any build.
 */
module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/src", "<rootDir>/app"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|native-base|react-native-svg|zustand.*|@tanstack/.*|lucide-react-native|@shopify/.*))",
  ],
  maxWorkers: 2,
  testTimeout: 30000,
};
