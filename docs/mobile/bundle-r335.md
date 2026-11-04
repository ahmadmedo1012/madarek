# R335 P0-7 — Mobile web bundle budget (branch `r335/bundle-budget`)

Mission: R334 grew the Expo web export from **8.61 MiB (main)** to **9.82 MiB (+13.9%)** — over the ≤+8% budget — with +1.14 MB of the +1.19 MB sitting in the shared `__common` chunk (reanimated 4.7 + worklets + bottom-sheet + flash-list v2 + keyboard-controller foundations). Those foundations stay installed and used; this pass cut what was cuttable and measured the real native cost.

## Result

| Measurement | main (118afa1f) | R334 head | **R335 P0-7 (this branch)** |
|---|---|---|---|
| Web export total (`du -sb`) | 8.61 MiB | 9.82 MiB (+13.9%) | **6.58 MiB (6,900,110 B) — −23.6% vs main** |
| Budget | — | ≤ +8% (≤ 9.30 MiB) | **PASS with 2.72 MiB headroom** |

Gates: `tsc --noEmit` 0 errors · `jest` **1154/1154** (38 suites) · `expo lint` 0 errors (15 pre-existing warnings) · `expo export --platform web` green (`/tmp/export-bb`). No ADR/budget change is needed — the export is now *below* the main baseline; the R334 ≤+8% budget file stays as written.

## The cut that mattered: the font barrels (−3.24 MiB)

`src/design/fonts.ts` imported 9 font weights from the three `@expo-google-fonts` **package barrels**. Each barrel `require()`s every weight's `.ttf`, and Metro ships every asset in the graph — so the export carried **34 font files (5.03 MB)** for the 9 weights `fontMap` actually references (IBM Plex Sans Arabic 400/500/600/700 · Alexandria 500/600/700 · Geist Mono 400/500). This is the font-side twin of the lucide barrel problem `codemod-lucide-direct.mjs` fixed in R327.

Fix (commit `52cd3414`): deep per-weight imports (`@expo-google-fonts/alexandria/500Medium` etc. — each subpath is a one-line module exporting the asset require, with its own `.d.ts`). Exported assets: 5,048,961 → **1,670,705 B**. JS also shrank 13.5 kB (34 barrel re-export modules gone). This waste pre-dated R334 (main shipped the same 34 weights) — the R334 regression was pure JS growth; this pass removes pre-existing asset bloat *and* the regression in one move.

### Chunk breakdown after the cut (`du -sb /tmp/export-bb`)

| Chunk | Bytes | Notes |
|---|---|---|
| `assets/` (9 used `.ttf` + router error.png) | 1,670,705 | was 5,048,961 (34 `.ttf`) |
| `__common-*.js` (shared, on first paint) | 2,789,665 | was 2,830,377 |
| `entry-*.js` (router + RN-web + react-dom boot) | 1,133,609 | unchanged |
| 124 per-route chunks + metro runtime + css | 1,289,868 | unchanged count (128 files) |
| **Total** | **6,900,110** | was 10,291,834 |

`__common` composition (new `scripts/analyze-sections.mjs` on `expo export -s external` maps — Metro emits index maps the old analyzer can't read): react-native-reanimated 654 kB · zod 515 kB · gesture-handler 263 kB · bottom-sheet 139 kB · keyboard-controller 93 kB · flash-list 72 kB · query-core 60 kB · svg 52 kB · lucide (90 icons) 46 kB · shared app data (legalData 46 kB, visionData 42 kB, governance 35 kB…). **All sanctioned foundations or live app code — nothing left to cut there.** `entry`: expo-router 423 kB + react-native-web 291 kB + react-dom 203 kB — irreducible web runtime.

## Cuts tried, applied, reverted (mission list)

| Cut | Verdict |
|---|---|
| a. `inlineRequires: true` | **Tried, REVERTED.** Expo SDK 58 defaults it to `false` (`@expo/metro-config` `ExpoMetroConfig.js`). Enabled via a project `metro.config.js` → export **grew +27.4 kB** (5,213,246 → 5,240,657 B JS; the inline lazy getters add bytes) with no size win for static web export. Removed the config; re-export byte-identical to the committed tree. |
| b. Lucide direct imports | **Already applied (R327/R334), verified.** `codemod-lucide-direct.mjs --check` → 0 rewrites. The only barrel references left are `import type { LucideIcon }` (2 files) — types ship zero bytes. |
| c. Lazy heavy screens | **Already lazy — no change.** Expo Router SDK 58 auto code-splits web routes (128 chunks): lecture player is its own 58 kB `[lectureId]-*.js` chunk, both exam navigators their own `[templateId]-*.js` chunks. The markdown renderers sit in `__common` because several routes share them — moving them via `React.lazy` would relocate bytes between files, not shrink the export total. Navigation tests untouched (1154/1154). |
| d. Unused deps | **None removed — verified none ride the bundle.** Grep pass over all 45 deps: zero-prod-import deps are `@hookform/resolvers`, `expo-crypto`, `expo-dev-client`, `expo-document-picker` (referenced as an app.config plugin — not removable), `expo-linking` (expo-router transitive), `react-dom` (RN-web peer — not removable), `react-native-webview`. None appear in `__common` (verified by grep) → removal saves 0 bundle bytes, churns the native fingerprint (new runtimeVersion → forced binary/OTA re-pairing), and the R334 audit (docs/mobile/audit-static.md §8) reserves dep removals for LEAD sign-off. Mission decisions respected: netinfo is imported by `src/lib/resilience/network.tsx` (2 prod refs), react-hook-form kept for the `form.tsx` RNF-compat mode (its one import is `form.test.tsx`). |
| e. `experiments.asyncRoutes` | **Not needed.** Web route-level code splitting is already on by default in SDK 58 (the 128 chunks above); the experiment targets native. |
| **Fonts barrel → 9 deep weight imports** | **APPLIED — the only cut that moved the number (−3.24 MiB).** Commit `52cd3414`. |

## Real native cost (EAS iOS-simulator preview artifacts)

| Build | Commit | Artifact | Compressed size |
|---|---|---|---|
| R334 baseline `1cd3219d-e8a3-4510-a6b5-67783802cdcd` (FINISHED 2026-11-03 20:43Z) | `d610a62` | [tar.gz](https://expo.dev/artifacts/eas/gzH2LyPlEwVa6MpBMljqDnGlLZIjRoW7Adpt7_Bu084.tar.gz) | 33,770,837 B = **32.2 MiB** |
| R334 final `bd254942-f2a1-4a47-9a78-7e8a4a8ec3ce` (FINISHED 2026-11-04 02:12Z) | `8a6390e` | [tar.gz](https://expo.dev/artifacts/eas/UvCjvuWsO5fC3oxEhC0tDdVtNgkPmpx8OnSdgpznmCE.tar.gz) | 34,378,081 B = **32.8 MiB** |
| **R334 native cost** | — | — | **+607,244 B = +0.58 MiB = +1.8%** |

The whole R334 native-feel foundation stack (reanimated 4.7 + worklets + bottom-sheet + flash-list v2 + keyboard-controller + top-30 screens) costs **+1.8%** on the iOS simulator artifact — the web bundle regression (+13.9%) was the outlier, not the native side. Build links/logs: [1cd3219d](https://expo.dev/accounts/rh2011/projects/madarek-mobile/builds/1cd3219d-e8a3-4510-a6b5-67783802cdcd) · [bd254942](https://expo.dev/accounts/rh2011/projects/madarek-mobile/builds/bd254942-f2a1-4a47-9a78-7e8a4a8ec3ce). (Both `--json` payloads fetched to /tmp; artifact size via signed-URL `Content-Length` — EAS's JSON carries no size field.)

**Projected native effect of the font cut (not built — out of timebox, Android quota exhausted):** the R334 binaries embed the same 34 font weights; this branch embeds 9 → the *next* iOS/Android build should shed ~3.4 MB of uncompressed embedded assets (~3 MB compressed). Verify on the next preview build.

## ADR — not required

The mission asked for an ADR proposing a budget change *if the export still exceeds +8% growth*. Final: **−23.6% vs main** — under budget with margin. No budget-file change proposed; nothing for the lead to review on that front.

## Tooling added

- `apps/mobile/scripts/analyze-sections.mjs` — per-module attribution for the Metro *sections* (index) source maps that `expo export -s external` emits per chunk; `analyze-bundle.mjs` (R327) only reads plain maps. Usage pinned in its header. Chunk rollups above come from it.

## Reproduce

```bash
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=http://localhost:8900/api/v1 npx expo export --platform web --output-dir /tmp/export-bb
du -sb /tmp/export-bb            # 6900110
npx expo export --platform web -s external --output-dir /tmp/export-bb3
node scripts/analyze-sections.mjs /tmp/export-bb3/_expo/static/js/web/__common-*.map --top 25
```
