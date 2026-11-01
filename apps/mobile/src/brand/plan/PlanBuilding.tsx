/**
 * PlanBuilding — the frontal FACADE ELEVATION, the app's hero sheet.
 *
 * The website's hero drawing, re-drafted for the sheet: a lettered
 * structural axis (RTL — A sits at the reading start), three connected
 * volumes (low wing, main block, mastery tower) on a hatched ground
 * datum, parapet double-lines, a window grid, the entrance, and a
 * dimension chain with end ticks. Exactly ONE orange signal: the
 * mastery pinnacle dot above the tower.
 *
 * Draw order (the way a hand drafts): the axis scaffold exists; the
 * ground draws → the three masses rise → parapets → the window grid
 * and door → hatch, dimension chain → the orange pinnacle arrives last.
 */
import { Line } from "react-native-svg";
import { usePalette } from "@/design/theme";
import { AnimCircle, AnimG, AnimLine, AnimRect, AxisGrid, DimChain, Ground, PlanSheet, perimeter } from "./primitives";
import { usePlanDraw } from "./usePlanDraw";
import type { PlanArtProps } from "./types";

// Axis scaffold — letters read right-to-left (A at the reading start).
const AXIS_XS = [56, 100, 144, 188, 232, 276] as const;
const AXIS_LETTERS = ["F", "E", "D", "C", "B", "A"] as const;
const GROUND_Y = 176;

export function PlanBuilding({ color, dotColor, progress, autoplay, width, style, accessibilityLabel }: PlanArtProps) {
  const p = usePalette();
  const ink = color ?? p.text;
  const accent = dotColor ?? p.accent;
  const draw = usePlanDraw(progress, autoplay);

  // Main-block window grid: 3 rows × 5 columns (cx = column centre).
  const windows: [number, number][] = [];
  for (const y of [78, 104, 130]) {
    for (const cx of [112, 138, 164, 190, 216]) windows.push([cx - 6, y]);
  }
  // Tower slits: 3 columns × 4 rows.
  const slits: [number, number][] = [];
  for (const y of [56, 84, 112, 140]) {
    for (const cx of [243, 257, 271]) slits.push([cx - 3, y]);
  }

  const winPhase = draw.seg(0.55, 0.85);
  const slitPhase = draw.seg(0.5, 0.8);

  return (
    <PlanSheet width={width} style={style} accessibilityLabel={accessibilityLabel ?? "رسم معماري لواجهة مبنى التعلم"}>
      <AxisGrid xs={AXIS_XS} letters={AXIS_LETTERS} bottom={GROUND_Y} color={ink} />

      {/* masses — wing, main block, mastery tower */}
      <AnimRect
        x={40}
        y={118}
        width={56}
        height={58}
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        {...draw.dash(perimeter(56, 58), draw.seg(0.15, 0.4))}
      />
      <AnimRect
        x={96}
        y={64}
        width={136}
        height={112}
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        {...draw.dash(perimeter(136, 112), draw.seg(0.25, 0.55))}
      />
      <AnimRect
        x={232}
        y={40}
        width={48}
        height={136}
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        {...draw.dash(perimeter(48, 136), draw.seg(0.35, 0.6))}
      />

      {/* parapet double-lines */}
      <AnimG stroke={ink} strokeWidth={1} fill="none">
        <AnimLine x1={40} y1={122} x2={96} y2={122} {...draw.dash(56, draw.seg(0.4, 0.58))} />
        <AnimLine x1={96} y1={68} x2={232} y2={68} {...draw.dash(136, draw.seg(0.42, 0.6))} />
        <AnimLine x1={232} y1={44} x2={280} y2={44} {...draw.dash(48, draw.seg(0.44, 0.62))} />
      </AnimG>

      {/* window grids */}
      <AnimG fill="none" stroke={ink} strokeWidth={1}>
        {windows.map(([x, y]) => (
          <AnimRect key={`w${x}-${y}`} x={x} y={y} width={12} height={16} {...draw.dash(perimeter(12, 16), winPhase)} />
        ))}
        {slits.map(([x, y]) => (
          <AnimRect key={`s${x}-${y}`} x={x} y={y} width={6} height={18} {...draw.dash(perimeter(6, 18), slitPhase)} />
        ))}
        {([[48, 128], [66, 128], [48, 148], [66, 148]] as const).map(([x, y]) => (
          <AnimRect key={`g${x}-${y}`} x={x} y={y} width={10} height={14} {...draw.dash(perimeter(10, 14), winPhase)} />
        ))}
      </AnimG>

      {/* entrance + canopy */}
      <AnimG fill="none" stroke={ink}>
        <AnimRect
          x={152}
          y={148}
          width={24}
          height={28}
          strokeWidth={1.4}
          {...draw.dash(perimeter(24, 28), draw.seg(0.6, 0.78))}
        />
        <AnimG strokeWidth={1} strokeOpacity={0.7} opacity={draw.seg(0.7, 0.9)}>
          <AnimLine x1={148} y1={145} x2={180} y2={145} {...draw.dash(32, draw.seg(0.7, 0.85))} />
          <Line x1={164} y1={148} x2={164} y2={176} strokeOpacity={0.5} />
        </AnimG>
      </AnimG>

      {/* ground datum + hatch */}
      <Ground draw={draw} x1={28} x2={292} y={GROUND_Y} color={ink} />

      {/* dimension chain under the datum */}
      <DimChain draw={draw} x1={40} x2={280} y={190} color={ink} ticks={[96, 232]} label="64.40" />

      {/* the ONE orange signal — the mastery pinnacle, last to arrive */}
      <AnimG opacity={draw.seg(0.82, 1)}>
        <Line x1={256} y1={40} x2={256} y2={30} stroke={ink} strokeWidth={1.2} />
        <AnimCircle cx={256} cy={26.5} r={3.2} fill={accent} stroke="none" />
      </AnimG>
    </PlanSheet>
  );
}
