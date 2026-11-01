/**
 * PlanLectureHall — the lecture hall in PLAN (top view): the screen
 * wall on the reading-start side (right), three concentric rows of
 * desks arcing away from it, the entrance with its swing arc, and the
 * double-drafted walls. Exactly ONE orange signal: the dot at the
 * screen's centre — where every sightline converges.
 *
 * Draw order: walls → screen wall → the row arcs → the desks → door
 * swing → the orange focus dot.
 */
import { Line, Path } from "react-native-svg";
import { usePalette } from "@/design/theme";
import { AnimCircle, AnimG, AnimLine, AnimPath, AnimRect, PlanSheet, perimeter } from "./primitives";
import { usePlanDraw } from "./usePlanDraw";
import type { PlanArtProps } from "./types";

// Room: outer walls 28..292 × 40..180; the screen seat sits at (296, 110).
const ROOM = { x1: 28, y1: 40, x2: 292, y2: 180 } as const;
const SCREEN = { cx: 296, cy: 110, x: 282 } as const;
const ROW_RADII = [66, 92, 118] as const;
const DESK = { w: 13, h: 8 } as const;

/** One arced row: the path of the row + the desks seated along it. */
function deskRow(radius: number) {
  // Max sweep keeps every seat inside the room (inner floor y ∈ 44..176).
  const aMax = Math.min(1.012, Math.asin(Math.min(1, 64 / radius)));
  const arcLen = radius * 2 * aMax;
  const count = Math.max(4, Math.floor(arcLen / 17));
  const step = (2 * aMax) / count;
  const px = (a: number) => SCREEN.cx - radius * Math.cos(a);
  const py = (a: number) => SCREEN.cy + radius * Math.sin(a);
  const d = `M ${px(-aMax).toFixed(2)} ${py(-aMax).toFixed(2)} A ${radius} ${radius} 0 0 0 ${px(aMax).toFixed(2)} ${py(aMax).toFixed(2)}`;
  const desks = Array.from({ length: count }, (_, i) => {
    const a = -aMax + (i + 0.5) * step;
    return { x: px(a), y: py(a), rot: 90 - (a * 180) / Math.PI };
  });
  return { d, desks, len: arcLen };
}

const ROWS = ROW_RADII.map(deskRow);

export function PlanLectureHall({ color, dotColor, progress, autoplay, width, style, accessibilityLabel }: PlanArtProps) {
  const p = usePalette();
  const ink = color ?? p.text;
  const accent = dotColor ?? p.accent;
  const draw = usePlanDraw(progress, autoplay);

  const wallPhase = draw.seg(0, 0.4);
  const deskPhase = draw.seg(0.5, 0.88);

  return (
    <PlanSheet width={width} style={style} accessibilityLabel={accessibilityLabel ?? "مخطط قاعة محاضرات"}>
      {/* outer walls — one path around, then the entrance gap on the
          leading (bottom) wall; inner face as a faint double wall */}
      <AnimPath
        d={`M ${ROOM.x1} ${ROOM.y2} L ${ROOM.x1} ${ROOM.y1} L ${ROOM.x2} ${ROOM.y1} L ${ROOM.x2} ${ROOM.y2}`}
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        {...draw.dash(544, wallPhase)}
      />
      <AnimPath
        d={`M ${ROOM.x1} ${ROOM.y2} H 44 M 72 ${ROOM.y2} H ${ROOM.x2}`}
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        {...draw.dash(236, draw.seg(0.22, 0.45))}
      />
      <AnimRect
        x={32}
        y={44}
        width={256}
        height={132}
        fill="none"
        stroke={ink}
        strokeWidth={1}
        strokeOpacity={0.4}
        {...draw.dash(perimeter(256, 132), draw.seg(0.3, 0.55))}
      />

      {/* the screen wall — double line on the reading-start side */}
      <AnimG stroke={ink} fill="none">
        <AnimLine x1={SCREEN.x} y1={64} x2={SCREEN.x} y2={156} strokeWidth={1.5} {...draw.dash(92, draw.seg(0.3, 0.5))} />
        <AnimLine x1={286} y1={68} x2={286} y2={152} strokeWidth={1} strokeOpacity={0.55} {...draw.dash(84, draw.seg(0.35, 0.55))} />
      </AnimG>

      {/* desk rows — the guide arcs fade in, then the desks seat themselves */}
      <AnimG fill="none" stroke={ink} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="3 4" opacity={draw.seg(0.38, 0.6)}>
        {ROWS.map((row, i) => (
          <Path key={`row-${i}`} d={row.d} />
        ))}
      </AnimG>
      <AnimG fill="none" stroke={ink} strokeWidth={1}>
        {ROWS.map((row, i) =>
          row.desks.map((desk, j) => (
            <AnimRect
              key={`desk-${i}-${j}`}
              x={desk.x - DESK.w / 2}
              y={desk.y - DESK.h / 2}
              width={DESK.w}
              height={DESK.h}
              transform={`rotate(${desk.rot.toFixed(1)} ${desk.x.toFixed(2)} ${desk.y.toFixed(2)})`}
              {...draw.dash(perimeter(DESK.w, DESK.h), deskPhase)}
            />
          )),
        )}
      </AnimG>

      {/* door swing + the ONE orange focus dot at the screen centre */}
      <AnimG fill="none" opacity={draw.seg(0.75, 0.95)} stroke={ink} strokeWidth={1}>
        <Line x1={44} y1={180} x2={44} y2={154} />
        <Path d="M 44 154 A 26 26 0 0 1 70 180" />
      </AnimG>
      <AnimG opacity={draw.seg(0.82, 1)}>
        <AnimCircle cx={SCREEN.x} cy={SCREEN.cy} r={3.2} fill={accent} stroke="none" />
      </AnimG>
    </PlanSheet>
  );
}
