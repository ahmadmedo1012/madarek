# Theming — الطبقة الدلالية للألوان (R334 2-f)

Mobile foundations reference: the semantic color layer, the status bar, the
numerals policy, and the Arabic typography scale. Everything lives in
`apps/mobile/src/design/` (+ `src/lib/format.ts` for numerals). The token
DATA is untouchable: `tokens.generated.ts` regenerates from
`shared/design-tokens.json` (repo root `npm run tokens:build`, drift-gated
by `npm run tokens:check`). This layer adds MEANING on top of that data —
it never edits it.

Verification labels (this sandbox has NO emulator — KVM absent):
`tsc`-verified · `jest`-verified · **device-UNVERIFIED** (EAS preview builds
are the owner's channel).

---

## 1. The semantic color layer — `src/design/semantic.ts`

```ts
import { useSemanticTheme } from "@/design/theme";

const { colors, hairlines } = useSemanticTheme();
// colors.surface · colors.surfaceElevated · colors.sunken
// colors.textPrimary · textSecondary · textTertiary
// colors.accent (THE orange) · accentInk · accentSoft · accentFg
// colors.success / warning / danger — each { fill, soft, ink }
// hairlines.border (≈0.5px) · hairlines.borderStrong (1px) · hairlines.separator
```

`useTheme()` and `themeFor(name)` now ALSO return `semantic` (additive —
the 90+ existing `usePalette`/`useStatusTones` consumers are untouched;
pinned by `semantic.test.ts`).

### Surfaces — elevation WITHOUT shadows

| Seat | Light | Dark | Meaning |
|---|---|---|---|
| `surface` | `#F6F6EE` paper | `#282828` | the page ground |
| `surfaceElevated` | `#FFFFFF` | `#2E2E2E` | cards, sheets, popovers |
| `sunken` | `#F0F0E6` | `#353535` | wells, tracks, inset fields |

A card rises by a **surface step + hairline frame** — never a shadow. The
hairline presets are `StyleSheet.hairlineWidth` (thinnest physical line)
and a `1px` strong rule; `SHADOW_KEYS` is exported and the tests assert no
preset ever carries `shadow*`/`elevation`. Mapping notes: `sunken` ≡ the
shared JSON's `bgSoft`/surface2 in both themes; dark `surfaceElevated`
maps to the mobile palette's card seat (`#2E2E2E` — what `Card` paints
today), deliberately NOT the web's `#353535` elevated step (documented
divergence: repainting existing cards is not this layer's job).

### Text tiers

`textPrimary` (headings/values) → `textSecondary` (supporting) →
`textTertiary` (metadata). The raw palette's `textFaint` stays available
for the faintest captions via `usePalette()`.

### THE one accent — قاعدة اللون الواحد

- `colors.accent` is the **single** saturated brand hue per screen:
  `#FA3600` light · `#FF5A1F` dark (the luminous ember).
- **One accented element per screen** — the primary action, the single
  highlighted stat, or the active state. Never a second orange moment.
- It is a UI/large-text tone (light 3.53:1, dark 4.73:1): body-size accent
  TEXT routes through `colors.accentInk` (`#C72E00` light / `#FF6B33`
  dark, AA). Labels ON an accent fill use `colors.accentFg`.
- `success`/`warning`/`danger` are **feedback tones, not accents** — each a
  triple `{ fill, soft, ink }` mapped exactly like the shared JSON's
  `*Ink` seats (light text-ink = family `deep`; dark = family `ink`):

```tsx
// صحّح الحقل — danger as feedback, not a second accent:
<T style={{ color: colors.danger.ink }}>انتهت صلاحية الجلسة</T>
<View style={{ backgroundColor: colors.danger.soft, ...hairlines.border }} />
```

---

## 2. Status bar — `src/design/statusbar.tsx`

The root layout's single `<StatusBar style="auto" />` follows the DEVICE
scheme, but this app's theme is a USER preference (فاتح/داكن/النظام) —
`auto` is wrong the moment they diverge. Mount `AppStatusBar` per screen:

```tsx
import { AppStatusBar } from "@/design/statusbar";

<AppStatusBar />                     // style derived from the effective theme
<AppStatusBar style="light" />       // override for ink/accent hero bands
```

- `statusStyleFor(theme)`: paper → dark icons, charcoal → light icons
  (`dark` ↔ `light`, never `auto`). expo-status-bar merges instances in
  mount order — the newest screen wins, which is the per-screen behavior
  we want under expo-router.
- **Android edge-to-edge (SDK 58 / RN 0.88, API 35 target)**: system bars
  are transparent and content draws behind them. Verified from the
  installed packages: `expo-status-bar@58` has NO `backgroundColor` prop
  (only `style`/`animated`/`hidden`/`hideTransitionAnimation`/
  `verticalBarBehaviorIOS`), and RN 0.88's `StatusBar` carries no
  `setBackgroundColor`. So the "navigation-bar color" is achieved the
  edge-to-edge way: the screen ground IS what shows through the bars.
  `AppStatusBar` tints the Android ROOT VIEW to the theme's page ground
  via `expo-system-ui.setBackgroundColorAsync` (lazy import, non-fatal)
  so overscroll/cold-boot gaps never flash white in dark mode.
- **Types + module code verified; the native Android path is
  device-UNVERIFIED from this sandbox.**
- `expo-navigation-bar` (contrast enforcement for the gesture-handle
  scrim) is NOT a dependency — adding it is a LEAD decision (new dep),
  see LEAD-REQUESTS.
- iOS: unchanged behavior; `style` is the same prop the root layout uses.

---

## 3. Numerals policy — `src/lib/format.ts`

The app's default is **LATIN digits** (`0123`): that is what `latn()`/
`num()`/`pct()` have always forced, and the web renders via
`ar-LY-u-nu-latn`. No behavior changed. New opt-in:

```ts
import { formatNumber, useNumerals, NUMERALS_OPTIONS } from "@/lib/format";

formatNumber(42);                                  // "42"  (default latin)
formatNumber(42, { numerals: "arabic-indic" });    // "٤٢"
formatNumber("42%", { numerals: "arabic-indic" }); // "٤٢%" (fragments too)
formatNumber(null);                                // "—" (never throws)

const { numerals, formatNumber: fmt, setNumerals } = useNumerals();
<T>{fmt(kpi.courseCount)}</T>   // follows the user's persisted preference
```

- `arabic-indic` maps 0-9 → **٠١٢٣٤٥٦٧٨٩** (pure string transform — no
  `Intl.NumberFormat` on purpose; Hermes Intl is the R326 crash class).
- Persisted preference: zustand + `AsyncStorage`
  (`"madarek-mobile-numerals"`) — the exact pattern of the theme store in
  `src/design/theme.tsx`. Default `"latin"` until the user opts in.
- `NUMERALS_OPTIONS` carries Arabic labels («0123 لاتينية» /
  «٠١٢٣ عربية-هندية») ready for the /settings appearance card.
- Legacy helpers (`num`, `pct`, `fromNow`, `sizeLabel`…) keep latin —
  their screens are owned by other branches; new UI adopts `useNumerals()`.

---

## 4. Arabic typography — `src/design/type.ts`

Loaded weights: **IBM Plex Sans Arabic 400/500/600/700** (+ Alexandria
500/600/700 brand face, Geist Mono technical). Hierarchy = weight + size,
never tracking/uppercase.

```ts
import { typeStyles, rtlText, ltrText, scaledTouchFloor } from "@/design/type";

<T style={typeStyles.title}>الفجوات ذات الأولوية</T>   // 20/28 SemiBold
<T style={typeStyles.numeric}>{fmt(totalXp)}</T>       // 44/52 SemiBold
```

| Role | Size/Leading | Weight | Use |
|---|---|---|---|
| `display` | 36/48 | Bold 700 | hero statements (Plex — `<T variant="display">` keeps Alexandria) |
| `title` | 20/28 | SemiBold 600 | section titles |
| `body` | 13/20 | Regular 400 | the readability floor (= `<T variant="body">`) |
| `numeric` | 44/52 | SemiBold 600 | KPI hero numerals |

**Font-scale tolerance (Dynamic Type 100–200%):** `<Text>` scales by
default — never disable `allowFontScaling` app-wide; cap per-element with
`maxFontSizeMultiplier` only where overflow is catastrophic. Android
multiplies a fixed `lineHeight` by the font scale, iOS does not — body
leading stays ≥1.5× so glyphs don't clip. Containers use `minHeight`
(never fixed height); tappable rows use `scaledTouchFloor()` (44 at 100%,
scaled by the OS font scale). QA screens at Largest (2.0) —
device-UNVERIFIED from this sandbox.

**Mixed-direction strings:** `writingDirection` is iOS-only (Android
derives from layout direction — writing it is a no-op there). Inline
Latin/digit runs inside Arabic prose are ordered by the Unicode bidi
algorithm — never hand-insert RLM/LRM marks. Isolate genuinely-LTR
islands (emails, URLs, mono labels) with `ltrText` in their own `<Text>`;
pin Arabic paragraphs that may start with Latin using `rtlText`. Digits
(0-9 and ٠-٩) carry no strong direction and sit inline safely.

---

## 5. The one-accent discipline — ملخّص القاعدة

1. ONE orange element per screen (`colors.accent`) — primary action, the
   single highlighted stat, or the active state. Choose ONE.
2. Accent body-size text → `colors.accentInk` (AA). On-accent labels →
   `colors.accentFg`.
3. Success/warning/danger are feedback, not decoration — and never a
   second accent.
4. Elevation = surface step + hairline (`hairlines.*`). No shadows,
   anywhere, ever.
5. When in doubt, remove the orange — «الورقة تكفي».

## Files

| File | Owns |
|---|---|
| `src/design/semantic.ts` (+ test) | semantic seats, hairline presets, SHADOW_KEYS |
| `src/design/statusbar.tsx` (+ test) | AppStatusBar, statusStyleFor |
| `src/design/type.ts` (+ test) | typeStyles roles, rtlText/ltrText, scaledTouchFloor |
| `src/lib/format.ts` (+ test) | formatNumber, arabicIndic, useNumerals, NUMERALS_OPTIONS |
| `src/design/theme.tsx` | additive: `semantic` on useTheme/themeFor + `useSemanticTheme()` |

Run the net: `cd apps/mobile && npx jest --no-cache src/design src/lib`
(40 tests) · `npm run typecheck` (0).
