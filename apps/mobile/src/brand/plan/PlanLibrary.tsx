/**
 * PlanLibrary — the library in PLAN: shelf runs along the walls (the
 * double-line racks with spine ticks), two reading tables with chairs,
 * the circulation desk by the entrance, and the double-drafted walls.
 * Exactly ONE orange signal: the dot at the circulation desk — where
 * every book passes.
 *
 * Draw order: walls → shelf runs → spine ticks → tables & chairs →
 * circulation desk → the orange dot.
 */
import { Line } from "react-native-svg";
import { usePalette } from "@/design/theme";
import { AnimCircle, AnimG, AnimPath, AnimRect, PlanSheet, perimeter } from "./primitives";
import { usePlanDraw } from "./usePlanDraw";
import type { PlanArtProps } from "./types";

// Room: outer 24..296 × 28..188; entrance gap on the bottom wall (x 252..280).
// Shelf runs along the top wall (y 44..54) and down the left wall (x 40..50).
const TOP_RUNS = [40, 128, 216] as const; // each 72 wide
const RUN_W = 72;
const RUN_H = 10;
const LEFT_RUN = { x: 40, y: 64, w: 10, h: 92 } as const;
const TABLES = [84, 184] as const; // each 84 wide, y 108..128

export function PlanLibrary({ color, dotColor, progress, autoplay, width, style, accessibilityLabel }: PlanArtProps) {
  const p = usePalette();
  const ink = color ?? p.text;
  const accent = dotColor ?? p.accent;
  const draw = usePlanDraw(progress, autoplay);

  const shelfPhase = draw.seg(0.3, 0.62);
  const tablePhase = draw.seg(0.48, 0.8);

  return (
    <PlanSheet width={width} style={style} accessibilityLabel={accessibilityLabel ?? "مخطط المكتبة"}>
      {/* walls with the entrance gap on the bottom wall */}
      <AnimPath
        d="M 24 28 H 296 M 24 28 V 188"
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        {...draw.dash(432, draw.seg(0, 0.35))}
      />
      <AnimPath
        d="M 24 188 H 252 M 280 188 H 296 M 296 28 V 188"
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        {...draw.dash(404, draw.seg(0.15, 0.4))}
      />
      <AnimRect
        x={28}
        y={32}
        width={264}
        height={152}
        fill="none"
        stroke={ink}
        strokeWidth={1}
        strokeOpacity={0.4}
        {...draw.dash(perimeter(264, 152), draw.seg(0.25, 0.5))}
      />

      {/* shelf runs along the top wall */}
      <AnimG fill="none" stroke={ink} strokeWidth={1.2}>
        {TOP_RUNS.map((x) => (
          <AnimRect key={`t${x}`} x={x} y={44} width={RUN_W} height={RUN_H} {...draw.dash(perimeter(RUN_W, RUN_H), shelfPhase)} />
        ))}
        <AnimRect x={LEFT_RUN.x} y={LEFT_RUN.y} width={LEFT_RUN.w} height={LEFT_RUN.h} {...draw.dash(perimeter(LEFT_RUN.w, LEFT_RUN.h), shelfPhase)} />
      </AnimG>

      {/* spine ticks — the books, as a faded detail */}
      <AnimG stroke={ink} strokeWidth={1} strokeOpacity={0.5} opacity={draw.seg(0.55, 0.8)}>
        {TOP_RUNS.map((x0) =>
          Array.from({ length: 5 }, (_, i) => x0 + 12 * (i + 1)).map((x) => (
            <Line key={`st${x0}-${x}`} x1={x} y1={44} x2={x} y2={54} />
          )),
        )}
        {Array.from({ length: 7 }, (_, i) => LEFT_RUN.y + 12 * (i + 1)).map((y) => (
          <Line key={`sl${y}`} x1={40} y1={y} x2={50} y2={y} />
        ))}
      </AnimG>

      {/* reading tables + chairs */}
      <AnimG fill="none" stroke={ink} strokeWidth={1.4}>
        {TABLES.map((x) => (
          <AnimRect key={`tab${x}`} x={x} y={108} width={84} height={20} {...draw.dash(perimeter(84, 20), tablePhase)} />
        ))}
      </AnimG>
      <AnimG fill="none" stroke={ink} strokeWidth={1} strokeOpacity={0.6} opacity={draw.seg(0.65, 0.88)}>
        {TABLES.map((x0) =>
          [14, 42, 70].map((off) => (
            <Line key={`tc${x0}-${off}`} x1={x0 + off} y1={96} x2={x0 + off} y2={104} />
          )),
        )}
        {TABLES.map((x0) =>
          [14, 42, 70].map((off) => (
            <Line key={`tb${x0}-${off}`} x1={x0 + off} y1={132} x2={x0 + off} y2={140} />
          )),
        )}
      </AnimG>

      {/* circulation desk by the entrance */}
      <AnimRect
        x={224}
        y={152}
        width={56}
        height={12}
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        {...draw.dash(perimeter(56, 12), draw.seg(0.72, 0.9))}
      />

      {/* door swing */}
      <AnimG fill="none" stroke={ink} strokeWidth={1} strokeOpacity={0.7} opacity={draw.seg(0.6, 0.85)}>
        <Line x1={252} y1={188} x2={252} y2={162} />
        <AnimPath d="M 252 162 A 26 26 0 0 1 278 188" />
      </AnimG>

      {/* the ONE orange signal — the circulation dot */}
      <AnimG opacity={draw.seg(0.84, 1)}>
        <AnimCircle cx={252} cy={158} r={3.2} fill={accent} stroke="none" />
      </AnimG>
    </PlanSheet>
  );
}
