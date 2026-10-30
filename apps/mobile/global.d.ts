/*
 * Madarek Mobile — ambient module declarations.
 * `src/global.css` is a web-only stylesheet consumed by the react-native-web
 * export (see `npm run export:web`). Metro ignores CSS imports on native
 * platforms; TypeScript still needs an ambient declaration for the
 * side-effect import in `app/_layout.tsx`.
 */
declare module "*.css";
