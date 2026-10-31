// eslint.config.mjs — R326 M1: the mobile app gets its own self-contained
// flat config (standard Expo). Without this, ESLint walks up to the repo
// root whose config only covers frontend/src + backend/src, silently
// ignoring the entire app tree — `expo lint` was a no-op gate.
//
// R326 pin: the react-compiler purity rules (set-state-in-effect, purity,
// immutability, refs) are WARN for the pre-existing R325-era screens and
// tracked in docs/redesign/r326/HANDOFF.md — they are the same class of
// unsafety that made reactCompiler crash (cause b); M2 fixes them
// screen-by-screen. NEW files must stay error-clean.
import expoConfig from "eslint-config-expo/flat.js";

export default [
  ...expoConfig,
  {
    ignores: ["dist/**", "node_modules/**", ".expo/**", "web-output/**"],
  },
  {
    files: ["app/**", "src/**"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  // R327 C1 — the design system is the ONLY colour source: raw hex
  // literals outside design/ + brand/ are a drift risk (the Z3-class
  // bug the token pipeline exists to kill). WARN-ratcheted: the
  // remaining hits are pinned in docs/redesign/r327/HANDOFF.md and
  // retire screen-by-screen with the C2 wave. New code: zero.
  {
    files: ["app/**", "src/**"],
    ignores: [
      "src/design/**",
      "src/brand/**",
      "src/test/**",
      "**/*.test.*",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/#[0-9a-fA-F]{6}/]",
          message:
            "Raw hex colour — use the palette (usePalette) / tokens (design/tokens). If a seat is missing, add it to shared/design-tokens.json (never here).",
        },
      ],
    },
  },
  // R327 C4 — Metro does not tree-shake the lucide-react-native barrel:
  // a single value import ships ALL ~2000 icon modules (~1MB of mapped
  // JS ≈ 2.3MB of .hbc — the Z12 measurement). Icons must import their
  // own module directly (lucide-react-native/icons/<kebab-name>, alias-
  // resolved). `import type { LucideIcon }` stays allowed (types ship
  // zero bytes).
  {
    files: ["app/**", "src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react-native",
              message:
                "The barrel ships every icon in the library — import the icon's own module: import X from \"lucide-react-native/icons/<kebab-name>\" (see scripts/codemod-lucide-direct.mjs).",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // R327 C5 — test-infra exemptions: jest.mock factories need require()
  // (the mocked module must load lazily inside the factory), and the
  // useFocusEffect mock intentionally mounts once ([]) — the app tree
  // keeps both rules at full strength.
  {
    files: ["src/test/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
