/**
 * R326 M1.2 — the render-test net. jest-expo preset + one suite that
 * mounts EVERY route screen with the API/telemetry transports mocked:
 * an import-time or render-time crash (module-scope Intl, undefined
 * fields, missing providers) fails CI in seconds — the crash class the
 * owner saw on device, caught before any build.
 */
module.exports = {
  preset: "jest-expo",
  // R331 A-App-Shell — reanimated 4 + worklets jest support: their resolver
  // rewrites web-only-in-jest paths (see ./jest.resolver.js); the RN preset
  // resolver stays as fallback.
  resolver: "<rootDir>/jest.resolver.js",
  roots: ["<rootDir>/src", "<rootDir>/app"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|native-base|react-native-svg|zustand.*|@tanstack/.*|lucide-react-native|@shopify/.*|@gorhom/.*))",
  ],
  // R327 C4 — the app imports icons via the ./icons/* subpath (Metro rides
  // the ESM "react-native" condition); jest resolves the same subpath to
  // .mjs which its transform pipeline can't execute. Map to the package's
  // CJS icon build — same components, zero ESM friction in tests.
  moduleNameMapper: {
    "^lucide-react-native/icons/(.*)$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js",
  },
  maxWorkers: 2,
  testTimeout: 30000,
};
