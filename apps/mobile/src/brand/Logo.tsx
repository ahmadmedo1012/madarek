/**
 * Logo.tsx — the R326 M0.4 RN port of the R323 <Logo>
 * (frontend/src/brand/Logo.tsx — the web implementation of record).
 *
 * The GEOMETRY is shared byte-identical (mark.ts · lockups.ts ·
 * wordmark.generated.ts are verbatim copies — enforced by
 * `npm run tokens:check`), and the variant math below mirrors the web
 * implementation line for line: lockup (RTL: mark right, «مدارك» left) ·
 * mark · wordmark · stacked (mark / «مدارك» / MADAREK).
 *
 * Two documented platform differences:
 *  · react-native-svg has no vector-effect:non-scaling-stroke — the
 *    mark's hairline reproduces the web's optical ramp (R324 X11) by
 *    scaling the strokeWidth in viewBox units: markStrokePx(size) ×
 *    32/size renders the exact same screen-px stroke at every size.
 *  · no CSS keyframes on RN — the web's stroke-draw `animated` prop is
 *    web-only for now (M2.2 may bring it via Reanimated).
 */
import type { ReactNode } from "react";
import Svg, { G, Path, Rect } from "react-native-svg";
import { useTheme } from "../design/theme";
import {
  MARK_AXIS,
  MARK_DIAMOND_PATH,
  MARK_POINT,
  MARK_VIEWBOX,
  markStrokePx,
} from "./mark";
import { LOCKUP, STACKED, WORDMARK_STROKE_SHEET } from "./lockups";
import { WORDMARK_AR, WORDMARK_LATIN } from "./wordmark.generated";

export type LogoVariant = "lockup" | "mark" | "wordmark" | "stacked";
export type LogoTone = "auto" | "ink" | "paper" | "orange";

export function Logo({
  variant = "lockup",
  size = 32,
  tone = "auto",
  testID,
}: {
  /** default 'lockup' (horizontal, RTL order: mark right, wordmark left) */
  variant?: LogoVariant;
  /** mark height in px; lockup/stacked scale from it. In the 'wordmark'
   * variant it is the wordmark's ink height in px. */
  size?: number;
  /** 'auto' = the live palette (ink text · accent point — themes with
   * the app); 'ink'/'paper'/'orange' are literal one-colour settings
   * for fixed backgrounds (BRAND.md §tones). */
  tone?: LogoTone;
  testID?: string;
}): ReactNode {
  const { palette } = useTheme();
  const ink =
    tone === "paper"
      ? "#F6F6EE"
      : tone === "orange"
        ? "#FA3600"
        : tone === "ink"
          ? "#282828"
          : palette.text;
  const point = tone === "auto" ? palette.accent : ink;

  /* the web's non-scaling hairline, reproduced in viewBox units (X11):
   * at size 32 → 1.5 units ≈ 1.5px; at size 16 the taper keeps the same
   * rendered px weight the web's vector-effect guarantees. */
  const markStrokeUnits = +((markStrokePx(size) * 32) / size).toFixed(3);

  /* ── the mark (shared by mark/lockup/stacked) ─────────────────────── */
  const markShape = (
    <G stroke={ink} fill="none" strokeWidth={markStrokeUnits} strokeLinejoin="miter">
      <Rect x={MARK_AXIS.x} y={MARK_AXIS.y} width={MARK_AXIS.size} height={MARK_AXIS.size} />
      <Path d={MARK_DIAMOND_PATH} />
      <Rect
        x={MARK_POINT.x}
        y={MARK_POINT.y}
        width={MARK_POINT.size}
        height={MARK_POINT.size}
        fill={point}
        stroke="none"
      />
    </G>
  );

  /* ── the wordmark sheet (stroke-only outlined connected letterforms) ─ */
  const wordPath = (transform: string) => (
    <Path
      d={WORDMARK_AR.d}
      transform={transform}
      fill="none"
      stroke={ink}
      strokeWidth={WORDMARK_STROKE_SHEET}
      strokeLinejoin="miter"
    />
  );
  const latinPath = (transform: string) => (
    <Path d={WORDMARK_LATIN.d} transform={transform} fill={ink} stroke="none" />
  );

  /* ── variant canvases (size = mark height; wordmark: ink height) ──── */
  let viewBox: string;
  let width: number;
  let height: number;
  let body: ReactNode;

  if (variant === "mark") {
    viewBox = MARK_VIEWBOX;
    width = size;
    height = size;
    body = markShape;
  } else if (variant === "wordmark") {
    viewBox = WORDMARK_AR.viewBox;
    width = +((size * WORDMARK_AR.ink.w) / WORDMARK_AR.ink.h).toFixed(2);
    height = size;
    body = wordPath("");
  } else if (variant === "stacked") {
    viewBox = STACKED.viewBox;
    width = size;
    height = +((size * STACKED.h) / 32).toFixed(2);
    body = (
      <G>
        <G transform={`translate(${STACKED.mark.x} ${STACKED.mark.y})`}>{markShape}</G>
        {wordPath(`translate(${STACKED.ar.x} ${STACKED.ar.y}) scale(${STACKED.ar.scale})`)}
        {latinPath(`translate(${STACKED.latin.x} ${STACKED.latin.y}) scale(${STACKED.latin.scale})`)}
      </G>
    );
  } else {
    viewBox = LOCKUP.viewBox;
    width = +((size * LOCKUP.w) / 32).toFixed(2);
    height = size;
    body = (
      <G>
        {wordPath(`translate(${LOCKUP.ar.x} ${LOCKUP.ar.y}) scale(${LOCKUP.ar.scale})`)}
        <G transform={`translate(${LOCKUP.mark.x} ${LOCKUP.mark.y})`}>{markShape}</G>
      </G>
    );
  }

  return (
    <Svg
      viewBox={viewBox}
      width={width}
      height={height}
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel="مدارك"
    >
      {body}
    </Svg>
  );
}
