import { type ReactNode, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { usePalette } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { T } from "./text";

import { InlineBusy, useStableFlag } from "./boot";
export type ButtonKind = "primary" | "accent" | "ghost" | "danger" | "plain";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Heron buttons: charcoal slab (primary), orange fill (accent),
 * hairline ghost. Loading never double-submits; 44px touch floor.
 */
export function Button({
  label,
  onPress,
  kind = "primary",
  loading = false,
  disabled = false,
  small = false,
  icon,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const p = usePalette();
  const busy = loading || disabled;
  // R327 B2: a busy flash shorter than 300ms reads as a glitch — hold it.
  const showBusy = useStableFlag(loading, 300);
  const height = small ? 36 : 48;
  const bg =
    kind === "primary" ? p.primary : kind === "accent" ? p.accent : kind === "danger" ? "#F15534" : "transparent";
  const fg =
    kind === "primary" ? p.primaryFg : kind === "accent" ? p.accentFg : kind === "danger" ? "#FFFFFF" : p.text;
  const border = kind === "ghost" ? p.rule : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={() => {
        if (busy) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: kind === "ghost" ? (pressed ? p.surfaceHover : "transparent") : pressed ? p.accentHover : bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: border,
          opacity: disabled && !loading ? 0.45 : 1,
        },
        style,
      ]}
    >
      {showBusy ? (
        <InlineBusy size={12} color={kind === "ghost" ? p.text : fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          {icon}
          <T
            variant={small ? "sm" : "body"}
            weight="bold"
            style={{ color: fg }}
          >
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

/** Square icon-only pressable (44px floor). */
export function IconButton({
  children,
  onPress,
  label,
  accessibilityLabel,
  style,
  disabled,
  tone = "default",
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  tone?: "default" | "accent" | "danger";
}) {
  const p = usePalette();
  const fg = tone === "accent" ? p.accentInk : tone === "danger" ? "#C72E00" : p.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress?.();
      }}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: touchFloor,
          height: touchFloor,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.55 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: sp[16],
    minHeight: touchFloor,
  },
});
