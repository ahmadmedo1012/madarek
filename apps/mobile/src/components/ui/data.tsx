import { type ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn, num } from "@/lib/format";
import { T } from "./text";

/** StatLine — mono drafting metric row: label · value. */
export function StatLine({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number | null | undefined;
  hint?: string | null;
  tone?: "accent" | "danger" | "gold";
}) {
  const p = usePalette();
  const color =
    tone === "accent" ? p.accentInk : tone === "gold" ? p.goldInk : tone === "danger" ? "#C72E00" : p.text;
  return (
    <View style={{ minHeight: 44, justifyContent: "center", paddingVertical: sp[6] }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <T variant="sm" color="muted">
            {label}
          </T>
        </View>
        <T variant="bodyLg" weight="bold" style={{ color }}>
          {typeof value === "number" ? latn(value) : (value ?? "—")}
        </T>
      </View>
      {hint ? (
        <T variant="sm" color="faint">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/** KPI card — square metric slab for dashboards. */
export function KpiCard({
  label,
  value,
  suffix,
  tone,
  style,
}: {
  label: string;
  value: string | number | null | undefined;
  suffix?: string;
  tone?: "accent" | "gold";
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
          flex: 1,
        },
        style,
      ]}
    >
      <T variant="sm" color="muted" numberOfLines={1}>
        {label}
      </T>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
        <T
          variant="h3"
          weight="bold"
          style={{ color: tone === "accent" ? p.accentInk : tone === "gold" ? p.goldInk : p.text }}
        >
          {typeof value === "number" ? num(value) : (value ?? "—")}
        </T>
        {suffix ? (
          <T variant="sm" color="muted">
            {suffix}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/** Hairline progress bar (Heron: ink bar + hairline track). */
export function ProgressBar({
  ratio,
  height = 4,
  accent,
  label,
}: {
  ratio: number;
  height?: number;
  accent?: boolean;
  label?: string;
}) {
  const p = usePalette();
  const w = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return (
    <View accessibilityLabel={label} style={{ height, backgroundColor: p.border, overflow: "hidden" }}>
      <View
        style={{
          height,
          width: `${w * 100}%`,
          backgroundColor: accent ? p.accent : p.primary,
        }}
      />
    </View>
  );
}

/** Initials avatar — circle (the one Heron round primitive). */
export function Avatar({
  initials,
  color,
    size = 44,
}: {
  initials: string;
  color?: string | null;
  size?: number;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? p.accentSoft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.rule,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T variant="sm" weight="bold" style={{ color: color ? "#FFFFFF" : p.text }}>
        {initials}
      </T>
    </View>
  );
}

/** RowList — bordered ledger of rows separated by hairlines. */
export function RowList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View style={[{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.border, backgroundColor: p.surface }, style]}>
      {children}
    </View>
  );
}

/** LedgerRow — one row inside a RowList (hairline separated, optional press). */
export function LedgerRow({
  children,
  onPress,
  accessibilityLabel,
  last,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const base: StyleProp<ViewStyle> = [
    {
      paddingHorizontal: sp[16],
      paddingVertical: sp[12],
      minHeight: 48,
      gap: sp[4],
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, { backgroundColor: pressed ? p.surfaceHover : "transparent" }]}
    >
      {children}
    </Pressable>
  );
}
