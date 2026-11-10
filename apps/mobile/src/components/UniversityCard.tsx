/**
 * UniversityCard — R345 F · the native twin of the web's typographic/
 * architectural university card, drawn from the ONE shared geometry
 * source (`src/media/university-cards.generated.ts` — byte-synced from
 * shared/media/university-cards.ts; never forked).
 *
 * Composition (native-safe, per the F-0 survey): the ELEVATION rides a
 * react-native-svg sheet (viewBox "0 4 100 92" — the full composition
 * span at uniform scale, hairlines recomputed in viewBox units because
 * react-native-svg has no vector-effect), while every WORD rides the
 * app's own RN text primitives (T/MonoLabel — Arabic shaping, RTL and
 * a11y proven across the app; SvgText is not native-trustworthy for
 * Arabic). Paper/ink/accent come from the palette — light/dark flips
 * for free; radius 0, hairline border, no shadow (the Heron law).
 */
import { StyleSheet, View } from "react-native";
import { Line, Path, Rect, Svg } from "react-native-svg";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { cardById, drawComposition } from "@/media/university-cards.generated";

/** The composition band's viewBox (y 4..96 = the full drawing span). */
const VB_X = 0;
const VB_Y = 4;
const VB_W = 100;
const VB_H = 92;

export interface UniversityCardProps {
  /** the documented registry id (manifest.json cards[] lineage) */
  id: string;
  /** rendered card width (pt) — the elevation band and type scale from it */
  width: number;
  /** accessible Arabic description (defaults to the spec's name + sub) */
  accessibilityLabel?: string;
  /** short display name for compact seats (defaults to the full name) */
  shortName?: string;
}

export function UniversityCard({ id, width, accessibilityLabel, shortName }: UniversityCardProps) {
  const spec = cardById(id);
  const p = usePalette();
  if (!spec) return null;

  const draw = drawComposition(spec.composition, spec.ratio);
  const artW = width - sp[12] * 2 - StyleSheet.hairlineWidth * 2; // the content-box art band
  const stroke = Math.max(0.5, VB_W / Math.max(artW, 1)); // ≈1px at the rendered width
  const sy = (y: number) => y - VB_Y;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? `${spec.nameAr} — ${spec.subAr} — بطاقة تخطيطية`}
      style={{
        width,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        padding: sp[12],
        gap: sp[8],
      }}
    >
      {/* the top row: [nn] + the Latin mono label (LTR — Latin may be tracked) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: sp[8] }}>
        <MonoLabel>{`[${spec.nn}]`}</MonoLabel>
        <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
          <MonoLabel style={{ letterSpacing: 1.2, textAlign: "right" }}>{spec.nameEn}</MonoLabel>
        </View>
      </View>

      {/* the Arabic display name + sub-line (RTL, never tracked) */}
      <T variant="h4" weight="semibold" align="right">
        {shortName ?? spec.nameAr}
      </T>
      <T variant="sm" color="secondary" align="right">
        {spec.subAr}
      </T>

      {/* the elevation composition — the ONE shared draw list */}
      <View style={{ width: "100%", aspectRatio: VB_W / VB_H }}>
        <Svg viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          {draw.strokes.map((s, i) => (
            <Line
              key={`s${i}`}
              x1={s[0]}
              y1={sy(s[1])}
              x2={s[2]}
              y2={sy(s[3])}
              stroke={p.text}
              strokeWidth={stroke}
              strokeLinecap="square"
            />
          ))}
          {draw.arcs.map((a, i) => (
            <Path
              key={`a${i}`}
              d={`M ${a[0].toFixed(2)} ${sy(a[1]).toFixed(2)} A ${a[2].toFixed(2)} ${a[3].toFixed(2)} ${a[4]} ${a[5]} ${a[6]} ${a[7].toFixed(2)} ${sy(a[8]).toFixed(2)}`}
              fill="none"
              stroke={p.text}
              strokeWidth={stroke}
            />
          ))}
          {/* the one accent element (gate / flag / door / threshold) */}
          <Rect x={draw.accent[0]} y={sy(draw.accent[1])} width={draw.accent[2]} height={draw.accent[3]} fill={p.accent} />
        </Svg>
      </View>

      {/* the city, on the base rule */}
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: sp[6], flexDirection: "row", justifyContent: "flex-start" }}>
        <T variant="sm" color="secondary">
          {spec.cityAr}
        </T>
      </View>
    </View>
  );
}
