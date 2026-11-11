import Svg, { G, Path, Rect } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { usePalette } from "@/design/theme";
import {
  MARK_AXIS,
  MARK_DIAMOND_PATH,
  MARK_POINT,
  MARK_VIEWBOX,
  markStrokePx,
} from "@/brand/mark";
import { T } from "./text";

/**
 * The Madarek brand mark — geometry imported verbatim from @/brand/mark
 * (the R323 single source of truth, the same constants <Logo> renders):
 * square + rotated-square (compass) hairlines in ink, one orange node.
 *
 * The 32-unit viewBox maps the grid onto the pixel canvas, so coordinates
 * render in viewBox units directly — NEVER pre-multiplied by size (the
 * double-scaling bug that shrank the mark toward the top-left corner and
 * clipped it at size 72). react-native-svg has no
 * vector-effect:non-scaling-stroke, so the X11 optical hairline ramp
 * reproduces the web's non-scaling stroke in viewBox units —
 * markStrokePx(size) × 32/size — exactly what <Logo> does.
 */
export function BrandMark({
  size = 32,
  ink,
  orange,
  testID,
}: {
  size?: number;
  ink?: string;
  orange?: string;
  testID?: string;
}) {
  const p = usePalette();
  const stroke = ink ?? p.text;
  const accent = orange ?? p.accent;
  const markStrokeUnits = +((markStrokePx(size) * 32) / size).toFixed(3);
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="شعار مدارك">
      <Svg width={size} height={size} viewBox={MARK_VIEWBOX} testID={testID}>
        <G stroke={stroke} fill="none" strokeWidth={markStrokeUnits} strokeLinejoin="miter">
          <Rect x={MARK_AXIS.x} y={MARK_AXIS.y} width={MARK_AXIS.size} height={MARK_AXIS.size} />
          <Path d={MARK_DIAMOND_PATH} />
          <Rect
            x={MARK_POINT.x}
            y={MARK_POINT.y}
            width={MARK_POINT.size}
            height={MARK_POINT.size}
            fill={accent}
            stroke="none"
          />
        </G>
      </Svg>
    </View>
  );
}

/** Wordmark row — mark + مدارك word in display weight. */
export function BrandLockup({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <BrandMark size={size} />
      <T variant="h3" weight="bold">
        مدارك
      </T>
    </View>
  );
}

/** Launch sheet: paper ground, mark, and the drafting frame corners. */
export function LaunchSheet({ label }: { label?: string }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <View
        style={{
          padding: 40,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          position: "relative",
        }}
      >
        <BrandMark size={72} />
        <View style={{ position: "absolute", top: -1, right: -1, width: 8, height: 8, backgroundColor: p.accent }} />
        <View style={{ position: "absolute", bottom: -1, left: -1, width: 8, height: 8, backgroundColor: p.accent }} />
      </View>
      <T variant="h3" weight="bold">
        {label ?? "مدارك"}
      </T>
      <T variant="sm" color="muted">
        منصّة التعليم الذكي
      </T>
    </View>
  );
}
