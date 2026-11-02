/**
 * plan/primitives — the drafting furniture shared by every sheet:
 * the animated ink elements (the seam where react-native-svg meets
 * Animated), the sheet seat, the lettered axis grid, the ground line
 * with its 45° hatch, and the dimension chain. Stroke discipline is
 * 1–1.5 everywhere; ink opacity carries the hierarchy.
 */
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Circle, G, Line, Path, Rect, Svg, Text as SvgText } from "react-native-svg";
import { PLAN_ASPECT, PLAN_VIEWBOX, type PlanDrawHandle, type PlanProgress } from "./types";

/**
 * The draw reveal is a plain-number progress resolved per frame by the
 * rAF engine in usePlanDraw — there is no Animated seam to hold
 * (react-native-svg's published types expose no Animated member), so
 * these bind the library's own elements under their historical draw
 * names; every `draw.*` value they receive is a plain number.
 */
export const AnimRect = Rect;
export const AnimLine = Line;
export const AnimPath = Path;
export const AnimCircle = Circle;
export const AnimG = G;

// ---------- geometry ----------
/** Perimeter of an axis-aligned rectangle (its drawable stroke length). */
export const perimeter = (w: number, h: number) => 2 * (w + h);
/** Length of a straight segment. */
export const segLen = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

// ---------- the sheet seat ----------
/** The 320×220 drafting sheet every plan drawing renders into. */
export function PlanSheet({
  children,
  width = "100%",
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  width?: number | string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <View
      style={[{ width, aspectRatio: PLAN_ASPECT }, style]}
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
    >
      <Svg viewBox={PLAN_VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        {children}
      </Svg>
    </View>
  );
}

// ---------- drafting furniture ----------
/**
 * AxisGrid — the lettered structural grid (bubbles A… on the reading
 * start side, dashed drop-lines to the ground). The scaffold EXISTS
 * before the building draws itself on it, so it is intentionally
 * static at a faint ink.
 */
export function AxisGrid({
  xs,
  letters,
  top = 12,
  bottom,
  color,
}: {
  xs: readonly number[];
  letters: readonly string[];
  top?: number;
  bottom: number;
  color: string;
}) {
  return (
    <G fill="none" stroke={color}>
      {xs.map((x, i) => (
        <Line key={`ax-${i}`} x1={x} y1={top + 8} x2={x} y2={bottom} strokeWidth={1} strokeOpacity={0.28} strokeDasharray="2 4" />
      ))}
      {xs.map((x, i) => (
        <G key={`ab-${i}`}>
          <Circle cx={x} cy={top} r={6} strokeWidth={1} strokeOpacity={0.75} />
          <SvgText x={x} y={top + 2.4} fontSize={6.5} fill={color} fillOpacity={0.85} stroke="none" textAnchor="middle">
            {letters[i]}
          </SvgText>
        </G>
      ))}
    </G>
  );
}

/**
 * Ground — the datum line the elevation stands on, with the 45°
 * hatch ticks below it (the earth cut). Line draws in; hatch fades.
 */
export function Ground({
  draw,
  x1,
  x2,
  y,
  color,
  phase = [0.05, 0.32],
}: {
  draw: PlanDrawHandle;
  x1: number;
  x2: number;
  y: number;
  color: string;
  phase?: [number, number];
}) {
  const ticks: number[] = [];
  for (let x = x2; x > x1 + 6; x -= 14) ticks.push(x);
  return (
    <G>
      <AnimLine
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={color}
        strokeWidth={1.5}
        {...draw.dash(segLen(x1, y, x2, y), draw.seg(phase[0], phase[1]))}
      />
      <AnimG fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.45} opacity={draw.seg(0.55, 0.85)}>
        {ticks.map((x) => (
          <Line key={x} x1={x} y1={y} x2={x - 5} y2={y + 5} />
        ))}
      </AnimG>
    </G>
  );
}

/**
 * DimChain — the dimension line under the sheet: end ticks, optional
 * break ticks, one tiny surveyor's figure. Fades in as a detail.
 */
export function DimChain({
  draw,
  x1,
  x2,
  y,
  color,
  ticks = [],
  label,
  phase = [0.68, 0.94],
}: {
  draw: PlanDrawHandle;
  x1: number;
  x2: number;
  y: number;
  color: string;
  ticks?: readonly number[];
  label?: string;
  phase?: [number, number];
}) {
  return (
    <AnimG fill="none" stroke={color} strokeWidth={1} opacity={draw.seg(phase[0], phase[1])}>
      <Line x1={x1} y1={y} x2={x2} y2={y} />
      <Line x1={x1} y1={y - 4} x2={x1} y2={y + 4} />
      <Line x1={x2} y1={y - 4} x2={x2} y2={y + 4} />
      {ticks.map((x) => (
        <Line key={x} x1={x} y1={y - 3} x2={x} y2={y + 3} strokeOpacity={0.65} />
      ))}
      {label ? (
        <SvgText x={(x1 + x2) / 2} y={y - 3} fontSize={6.5} fill={color} fillOpacity={0.7} stroke="none" textAnchor="middle">
          {label}
        </SvgText>
      ) : null}
    </AnimG>
  );
}
