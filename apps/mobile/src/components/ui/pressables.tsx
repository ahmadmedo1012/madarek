import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { haptics } from "@/haptics";
import { usePalette, useSemanticTheme } from "@/design/theme";
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
  /** Stable e2e anchor (Maestro/RTL text matching is unreliable —
   * the R349 smoke now pins every step by id). */
  testID?: string;
}

/**
 * Heron buttons: charcoal slab (primary), orange fill (accent),
 * hairline ghost, rose destructive. Loading never double-submits;
 * 44px touch floor.
 *
 * R362 — two semantic corrections:
 *   · kind="danger" renders the ROSE feedback seat (semantic.danger),
 *     not the orange accent — the design system's own law (semantic.ts:
 *     "success/warning/danger are FEEDBACK tones, never accents") was
 *     violated by the old `danger → p.accent` mapping, making
 *     destructive actions visually identical to the brand accent.
 *   · pressed states no longer flatten: primary/danger keep their fill
 *     and dim slightly (the old universal accentHover flash turned a
 *     charcoal primary button orange mid-press — indistinguishable
 *     from the accent kind); ghost/plain wash with surfaceHover.
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
  testID,
}: ButtonProps) {
  const p = usePalette();
  const sem = useSemanticTheme();
  const busy = loading || disabled;
  // R327 B2: a busy flash shorter than 300ms reads as a glitch — hold it.
  const showBusy = useStableFlag(loading, 300);
  const height = small ? 36 : 48;
  const bg =
    kind === "primary"
      ? p.primary
      : kind === "accent"
        ? p.accent
        : kind === "danger"
          ? sem.colors.danger.fill
          : "transparent";
  const fg =
    kind === "primary" || kind === "danger"
      ? p.primaryFg
      : kind === "accent"
        ? p.accentFg
        : p.text;
  const border = kind === "ghost" ? p.rule : "transparent";
  const dimOnPress = kind === "primary" || kind === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      /* R362 — `busy` joins `disabled`: screen readers now announce the
         in-flight state (LoadingState already did; the button that
         CAUSES the work did not). */
      accessibilityState={{ disabled: busy, busy: showBusy }}
      disabled={busy}
      testID={testID}
      onPress={() => {
        if (busy) return;
        // R334 review-3 T1 — through the gated, throttled module (kill-switch + spam guard)
        haptics.impact("light");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor:
            kind === "ghost" || kind === "plain"
              ? pressed
                ? p.surfaceHover
                : "transparent"
              : kind === "accent"
                ? pressed
                  ? p.accentHover
                  : bg
                : bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: border,
          opacity: disabled && !loading ? 0.45 : dimOnPress && pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {showBusy ? (
        <InlineBusy size={12} color={kind === "ghost" || kind === "plain" ? p.text : fg} />
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

/** Square icon-only pressable (44px floor). Icons carry their own colour.
 * R362 — `disabled` is now a STATE, not just a pointer gate: the old
 * prop only blocked touches (no visual change, no accessibilityState),
 * so a disabled icon button looked fully active to both sighted users
 * and screen readers. */
export function IconButton({
  children,
  onPress,
  label,
  accessibilityLabel,
  style,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={() => {
        // R334 review-3 T1 — through the gated, throttled module (kill-switch + spam guard)
        haptics.impact("light");
        onPress?.();
      }}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: touchFloor,
          height: touchFloor,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : pressed ? 0.55 : 1,
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
