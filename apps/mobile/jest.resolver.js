/**
 * R331 A-App-Shell — jest resolver chain (reanimated 4 + worklets).
 *
 * reanimated's jest resolver rewrites its web-only-in-jest module paths
 * (initializers, mutables, css/component/AnimatedComponent…) to the
 * non-.native variants, then delegates to the worklets resolver → the
 * default resolver. The @react-native/jest-preset resolver (previously the
 * active one via the jest-expo preset) only adds a react-native package
 * filter — kept as the fallback so nothing else changes resolution.
 */
const reanimatedResolver = require("react-native-reanimated/jest/resolver");
const rnResolver = require("@react-native/jest-preset/jest/resolver");

module.exports = (request, options) => {
  try {
    return reanimatedResolver(request, options);
  } catch {
    return rnResolver(request, options);
  }
};
