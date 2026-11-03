/**
 * R334 2-f — Arabic typography helpers.
 *
 * Four composing roles (display / title / body / numeric) on the LOADED
 * IBM Plex Sans Arabic weights (400 Regular · 500 Medium · 600 SemiBold ·
 * 700 Bold — see ./fonts). Hierarchy = weight + size rungs, never tracking
 * or uppercase (Heron). These are TextStyle building blocks for direct
 * composition; the <T> component (ui/text) stays the default way to render
 * prose — its `display` variant keeps the Alexandria brand face, this
 * module's display role is the Plex Arabic hero when the brand voice is
 * NOT wanted.
 *
 * ── Font-scale tolerance (Dynamic Type 100–200%) ─────────────────────────
 * RN <Text> scales by default (`allowFontScaling` is ON): every explicit
 * fontSize is multiplied by the OS font scale — Android Settings › Font
 * size (1.0–2.0) and iOS Dynamic Type (content sizes up to ~200%, with
 * accessibility categories going beyond). Policy:
 *   · NEVER disable allowFontScaling app-wide. Cap per element with
 *     `maxFontSizeMultiplier` ONLY where overflow is genuinely catastrophic
 *     — and prefer a layout that survives 200% (wrap, minHeight, scroll).
 *   · lineHeight: Android multiplies a fixed lineHeight by the font scale,
 *     iOS does NOT — so a tight iOS lineHeight clips glyphs at large
 *     scales. The role styles below keep ≥1.5× leading on body text (the
 *     readability rung); long-form may drop lineHeight entirely.
 *   · Containers: minHeight, never fixed height. Hit areas: the 44px
 *     touchFloor is the 100% floor — rows that must stay tappable scale
 *     via `scaledTouchFloor()` below.
 *   · QA: check screens at Settings › Font size = Largest (2.0) before
 *     shipping a screen (device pass — labeled UNVERIFIED from this
 *     sandbox, no emulator).
 *
 * ── Mixed-direction strings (writingDirection) ───────────────────────────
 * The app is force-RTL. `writingDirection` is an iOS-only TextStyle prop;
 * Android derives paragraph direction from layout direction — writing it
 * is a no-op there. Rules:
 *   · Arabic prose: rely on the forced-RTL context; pin with `rtlText`
 *     when a string could start with Latin and confuse the paragraph run.
 *   · Inline Latin/digit runs inside Arabic (codes, «XP 42»): the Unicode
 *     bidi algorithm orders them correctly — do NOT hand-insert RLM/LRM
 *     marks and do NOT split the sentence.
 *   · Genuinely-LTR islands (emails, URLs, mono drafting labels): isolate
 *     them in their own <Text> with `ltrText` (the ui/text MonoLabel
 *     pattern) so they never inherit an RTL paragraph direction.
 *   · Numerals: digits carry no strong direction — both 0-9 and ٠-٩ sit
 *     inline inside RTL runs without wrappers.
 */
import { PixelRatio, type TextStyle } from "react-native";
import { fonts } from "./fonts";
import { touchFloor, type } from "./tokens";

/** The composing role styles (families = the loaded Plex Arabic weights). */
export const typeStyles = {
  /** Hero statements — 36/48, Bold (700). Plex Arabic; brand moments use <T variant="display"> (Alexandria) instead. */
  display: { fontFamily: fonts.bodyBold, fontSize: type.display, lineHeight: 48 } as TextStyle,
  /** Section titles — 20/28, SemiBold (600). */
  title: { fontFamily: fonts.bodySemiBold, fontSize: type.sectionTitle, lineHeight: 28 } as TextStyle,
  /** The readability floor — 13/20, Regular (400). Byte-compatible with <T variant="body">. */
  body: { fontFamily: fonts.body, fontSize: type.body, lineHeight: 20 } as TextStyle,
  /** KPI hero numerals — 44/52, SemiBold (600). Consider maxFontSizeMultiplier on cramped dashboards. */
  numeric: { fontFamily: fonts.bodySemiBold, fontSize: type.statNumber, lineHeight: 52 } as TextStyle,
} as const;

export type TypeRole = keyof typeof typeStyles;

/** Pin an iOS paragraph to RTL (Arabic strings that may start with Latin). */
export const rtlText: TextStyle = { writingDirection: "rtl" };

/** Isolate an LTR island (emails, URLs, mono labels) inside the RTL app. */
export const ltrText: TextStyle = { writingDirection: "ltr", textAlign: "left" };

/** The policy range this module is designed and QA'd against. */
export const FONT_SCALE_RANGE = {
  min: 1,
  /** Dynamic Type up to 200% must not break a screen (see module doc). */
  max: 2,
} as const;

/**
 * The touch floor that actually holds: 44 at 100%, scaled by the OS font
 * scale (rounded), never below the raw floor. Use for tappable rows; for
 * fixed chrome (tab bars) the unscaled `touchFloor` stays the minimum.
 */
export function scaledTouchFloor(): number {
  const scale = PixelRatio.getFontScale();
  if (!Number.isFinite(scale) || scale <= 1) return touchFloor;
  return Math.max(touchFloor, Math.round(touchFloor * scale));
}
