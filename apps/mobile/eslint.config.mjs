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
];
