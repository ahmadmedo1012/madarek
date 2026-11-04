/**
 * R334 2-f — the SEMANTIC color layer.
 *
 * Role names for what screens actually mean, resolved per theme through the
 * EXISTING mechanism (heron palette + statusTones from ./tokens → the
 * generated shared source of truth). Screens should reach for these seats
 * instead of raw palette keys, so a future token reshuffle only edits this
 * one mapping.
 *
 * Heron discipline (unchanged, now testable):
 *   · Elevation WITHOUT shadows — cards rise by a surface step + a hairline
 *     frame. The presets below never emit any shadow or elevation key.
 *   · ONE orange accent per screen — `accent` is the only saturated brand
 *     hue (see the accent block below for the text-safe route).
 *   · success/warning/danger are FEEDBACK tones, never accents.
 *
 * Shared-JSON mapping notes (shared/design-tokens.json — read-only truth):
 *   · `surface`            = the page ground  (shared `bg`: paper/charcoal).
 *   · `surfaceElevated`    = cards & sheets   (shared light `surfaceElevated`
 *     = neutral.0 ✓). Dark maps to palette.surface (#2E2E2E = the Card
 *     component's existing ground), NOT the web's surface2 step (#353535) —
 *     the mobile app's dark card seat predates this layer and must not be
 *     repainted from under its 90+ consumers. Documented divergence.
 *   · `sunken`             = wells/tracks/inset fields (shared `bgSoft` =
 *     surface2 = palette.surfaceHover in BOTH themes ✓).
 *   · status seats         = shared successInk/warningInk/dangerInk exactly:
 *     light text-ink = the family `deep` (AA), dark text-ink = the family
 *     `ink` (the luminous rung).
 */
import { StyleSheet, type ViewStyle } from "react-native";
import { heron, statusTones, type StatusTone, type ThemeName } from "./tokens";

// ── status seats ───────────────────────────────────────────────────────────

/** A feedback tone's three seats: solid UI, tinted ground, AA text ink. */
export interface StatusSeat {
  /** Saturated tone — borders, icons, solid fills (not body text). */
  fill: string;
  /** Tinted ground — wells, badges, banners. */
  soft: string;
  /** AA-safe ink for text on surface/sunken grounds. */
  ink: string;
}

function statusSeat(name: ThemeName, tone: StatusTone): StatusSeat {
  return name === "light"
    ? { fill: tone.ink, soft: tone.bg, ink: tone.deep }
    : { fill: tone.ink, soft: tone.bg, ink: tone.ink };
}

// ── the semantic color seats ───────────────────────────────────────────────

export interface SemanticColors {
  /** Page ground — the paper itself (light #F6F6EE · dark #282828). */
  surface: string;
  /** Cards, sheets, popovers — one surface step up + hairline frame. */
  surfaceElevated: string;
  /** Sunken wells — inset fields, progress tracks, code grounds. */
  sunken: string;
  /** Primary ink — headings, values. */
  textPrimary: string;
  /** Secondary ink — supporting copy, labels. */
  textSecondary: string;
  /** Tertiary ink — metadata, timestamps. */
  textTertiary: string;
  /**
   * THE orange — the single accent seat (light #FA3600 · dark #FF5A1F).
   * UI/large-text tone only (light 3.53:1, dark 4.73:1); body-size accent
   * TEXT routes through `accentInk`. One accented element per screen.
   */
  accent: string;
  /** Text-safe accent (AA) — light #C72E00 · dark #FF6B33. */
  accentInk: string;
  /** Tinted accent ground — soft washes behind the accent moment. */
  accentSoft: string;
  /** Label ink on an `accent` fill (light #FFFFFF · dark warm ink). */
  accentFg: string;
  /** Success feedback (mint family). */
  success: StatusSeat;
  /** Warning feedback (yellow family). */
  warning: StatusSeat;
  /** Danger/destructive feedback (rose family). */
  danger: StatusSeat;
}

export function semanticColorsFor(name: ThemeName): SemanticColors {
  const p = heron[name];
  const t = statusTones[name];
  return {
    surface: p.bg,
    surfaceElevated: p.surface,
    sunken: p.surfaceHover,
    textPrimary: p.text,
    textSecondary: p.textSecondary,
    textTertiary: p.textMuted,
    accent: p.accent,
    accentInk: p.accentInk,
    accentSoft: p.accentSoft,
    accentFg: p.accentFg,
    success: statusSeat(name, t.mint),
    warning: statusSeat(name, t.yellow),
    danger: statusSeat(name, t.rose),
  };
}

// ── hairline presets — elevation without shadows ──────────────────────────

export interface Hairlines {
  /** Card/well frame — the thinnest physical line (≈0.5pt @2x). */
  border: ViewStyle;
  /** Strong 1px rule — section breaks, sheet frames. */
  borderStrong: ViewStyle;
  /** Separator FILL (height, not a border width). */
  separator: ViewStyle;
}

export function hairlinesFor(name: ThemeName): Hairlines {
  const p = heron[name];
  return {
    border: { borderWidth: StyleSheet.hairlineWidth, borderColor: p.border },
    borderStrong: { borderWidth: 1, borderColor: p.rule },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: p.border },
  };
}

// ── the bundle theme.tsx serves additively ────────────────────────────────

export interface SemanticTheme {
  name: ThemeName;
  colors: SemanticColors;
  hairlines: Hairlines;
}

export function semanticThemeFor(name: ThemeName): SemanticTheme {
  return { name, colors: semanticColorsFor(name), hairlines: hairlinesFor(name) };
}

/** The forbidden elevation keys — the no-shadows contract (kept testable). */
export const SHADOW_KEYS = [
  "shadowColor",
  "shadowOffset",
  "shadowOpacity",
  "shadowRadius",
  "elevation",
] as const;
