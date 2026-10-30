import Svg, { Path, Rect } from "react-native-svg";
import { StyleSheet, View } from "react-native";
import { usePalette } from "@/design/theme";
import { T } from "./text";

/**
 * The Madarek brand mark — geometry from frontend/src/brand/mark.ts:
 * square + rotated-square (compass) hairlines in ink, one orange node.
 */
export function BrandMark({ size = 32, ink, orange }: { size?: number; ink?: string; orange?: string }) {
  const p = usePalette();
  const stroke = ink ?? p.text;
  const accent = orange ?? p.accent;
  const sw = 1;
  const scale = size / 32;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="شعار مدارك">
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Rect x={8 * scale} y={8 * scale} width={16 * scale} height={16 * scale} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="miter" />
        <Path
          d={`M16 ${5 * scale}L${27 * scale} 16L16 ${27 * scale}L${5 * scale} 16Z`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="miter"
        />
        <Rect x={22 * scale} y={6 * scale} width={4 * scale} height={4 * scale} fill={accent} />
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
