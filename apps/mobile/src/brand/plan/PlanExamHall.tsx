/**
 * PlanExamHall — the exam hall in PLAN: a disciplined grid of single
 * desks in two banks split by a central aisle (the invigilation
 * sightline), chairs as hairline ticks, the entrance with its swing
 * arc, and the invigilator's table. Exactly ONE orange signal: the
 * checkpoint dot on the invigilator's table — محطة الفحص.
 *
 * Draw order: walls → desk grid → chairs → invigilator table → the
 * orange checkpoint dot.
 */
import { Line, Path } from "react-native-svg";
import { usePalette } from "@/design/theme";
import { AnimCircle, AnimG, AnimPath, AnimRect, DimChain, PlanSheet, perimeter } from "./primitives";
import { usePlanDraw } from "./usePlanDraw";
import type { PlanArtProps } from "./types";

// Room: outer 24..296 × 28..188; entrance on the right wall (reading start).
const DESK_W = 20;
const DESK_H = 10;
// Two banks of three columns, split by the central aisle (x 144..176).
const COLS = [44, 84, 124, 176, 216, 256] as const;
const ROWS = [52, 84, 116, 148] as const;

export function PlanExamHall({ color, dotColor, progress, autoplay, width, style, accessibilityLabel }: PlanArtProps) {
  const p = usePalette();
  const ink = color ?? p.text;
  const accent = dotColor ?? p.accent;
  const draw = usePlanDraw(progress, autoplay);

  const deskPhase = draw.seg(0.32, 0.78);

  return (
    <PlanSheet width={width} style={style} accessibilityLabel={accessibilityLabel ?? "مخطط قاعة اختبار"}>
      {/* walls — three sides in one path, then the right wall with the
          entrance gap (y 36..60) on the reading-start side */}
      <AnimPath
        d="M 24 28 H 296 M 24 28 V 188 M 24 188 H 296"
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        {...draw.dash(704, draw.seg(0, 0.36))}
      />
      <AnimPath
        d="M 296 28 V 36 M 296 60 V 188"
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        {...draw.dash(136, draw.seg(0.2, 0.42))}
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
        {...draw.dash(perimeter(264, 152), draw.seg(0.26, 0.5))}
      />

      {/* the desk grid — one shared dash node draws every desk */}
      <AnimG fill="none" stroke={ink} strokeWidth={1.2}>
        {COLS.map((x) =>
          ROWS.map((y) => (
            <AnimRect key={`d${x}-${y}`} x={x} y={y} width={DESK_W} height={DESK_H} {...draw.dash(perimeter(DESK_W, DESK_H), deskPhase)} />
          )),
        )}
      </AnimG>

      {/* chairs — hairline ticks behind each desk */}
      <AnimG stroke={ink} strokeWidth={1} strokeOpacity={0.55} opacity={draw.seg(0.6, 0.85)}>
        {COLS.map((x) =>
          ROWS.map((y) => (
            <Line key={`c${x}-${y}`} x1={x + 5} y1={y + 15} x2={x + 15} y2={y + 15} />
          )),
        )}
      </AnimG>

      {/* invigilator's table by the entrance */}
      <AnimRect
        x={220}
        y={38}
        width={36}
        height={10}
        fill="none"
        stroke={ink}
        strokeWidth={1.4}
        {...draw.dash(perimeter(36, 10), draw.seg(0.72, 0.9))}
      />

      {/* door swing — hinge on the top jamb, leaf open into the room */}
      <AnimG fill="none" stroke={ink} strokeWidth={1} strokeOpacity={0.7} opacity={draw.seg(0.6, 0.85)}>
        <Line x1={296} y1={36} x2={272} y2={36} />
        <Path d="M 272 36 A 24 24 0 0 0 296 60" fill="none" />
      </AnimG>

      {/* dimension chain under the sheet */}
      <DimChain draw={draw} x1={24} x2={296} y={200} color={ink} ticks={[144]} label="18.60" />

      {/* the ONE orange signal — the checkpoint dot */}
      <AnimG opacity={draw.seg(0.84, 1)}>
        <AnimCircle cx={238} cy={43} r={3.2} fill={accent} stroke="none" />
      </AnimG>
    </PlanSheet>
  );
}
