import { useWindowDimensions } from "react-native";

/**
 * R366 A5 — window size classes for the responsive shell.
 *
 * Material 3 window width classes (compact / medium / expanded), the same
 * thresholds the web breakpoints use, so a tablet, a foldable-open and a
 * landscape phone all resolve predictably:
 *
 *   compact  <  600dp — phones portrait (the app's historical assumption)
 *   medium   ≥  600dp — small tablets portrait, foldables open, phones landscape
 *   expanded ≥  840dp — tablets landscape, desktop-class widths
 *
 * Consumers (the root fixes, R366):
 *   · `Screen`/`FormScreen` — the readable content column (CONTENT_MAX_WIDTH)
 *   · the `(tabs)` layouts + RoleTabBar — bottom bar on compact, side rail
 *     on medium+ (rail when width ≥ 600dp, M3's navigation-rail guidance).
 *
 * Token law note: CONTENT_MAX_WIDTH is a LAYOUT constant living here until
 * Agent 3 seats it in shared/design-tokens.json (REQUESTS-agent5-to-agent3);
 * every spacing it composes with comes from `sp`/`touchFloor` by name.
 */

export const WIDTH_MEDIUM = 600;
export const WIDTH_EXPANDED = 840;

/**
 * The readable Arabic prose column on wide viewports. Beyond this width a
 * full-bleed text line runs 600–800dp+ and reading comfort collapses; the
 * paper background stays full-bleed, only the CONTENT column centres.
 * Deliberately NOT a font-size-relative value: the type scale already
 * carries accessibility scaling; this is the geometric column of the
 * drafting sheet (matches the web's `--t-page`-era container rhythm).
 */
export const CONTENT_MAX_WIDTH = 640;

export type WindowWidthClass = "compact" | "medium" | "expanded";

/** Pure classifier (unit-tested) — the hook's only logic. */
export function widthClassFor(width: number): WindowWidthClass {
  if (width >= WIDTH_EXPANDED) return "expanded";
  if (width >= WIDTH_MEDIUM) return "medium";
  return "compact";
}

export interface ResponsiveState {
  /** Current window dimensions in dp. */
  width: number;
  height: number;
  windowClass: WindowWidthClass;
  compact: boolean;
  medium: boolean;
  expanded: boolean;
  /** ≥ 600dp — the rail / content-column tier. */
  wide: boolean;
  landscape: boolean;
}

/**
 * The one responsive hook. Subscribes to rotation, fold/unfold, multi-window
 * and split-screen resize; every consumer re-renders on the same
 * useWindowDimensions event, so class flips stay in the same frame.
 */
export function useResponsive(): ResponsiveState {
  const { width, height } = useWindowDimensions();
  const windowClass = widthClassFor(width);
  return {
    width,
    height,
    windowClass,
    compact: windowClass === "compact",
    medium: windowClass === "medium",
    expanded: windowClass === "expanded",
    wide: windowClass !== "compact",
    landscape: width > height,
  };
}
