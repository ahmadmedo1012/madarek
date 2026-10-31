import { type ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { WifiOff } from "lucide-react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "./text";
import { Button } from "./pressables";
import { Boot, usePulseStyle } from "./boot";
import { useReduceMotion } from "@/hooks/useReduceMotion";

/** Skeleton — drafting pulse block (paper rhythm, reduced-motion safe). */
export function Skeleton({ w = "100%", h = 16, style }: { w?: number | string; h?: number; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const pulse = usePulseStyle(reduced);
  if (reduced) {
    return <View style={[{ width: w, height: h, backgroundColor: p.border, opacity: 0.7 }, style]} />;
  }
  return (
    <Animated.View
      style={[
        {
          width: w,
          height: h,
          backgroundColor: p.border,
        },
        pulse,
        style as StyleProp<never>,
      ]}
    />
  );
}

/** SkeletonList — page-shaped placeholder. */
export function SkeletonList({ rows = 5, rowHeight = 64 }: { rows?: number; rowHeight?: number }) {
  return (
    <View style={{ gap: sp[12], paddingTop: sp[8] }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            height: rowHeight,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(0,0,0,0.08)",
            padding: sp[12],
            gap: sp[8],
            justifyContent: "center",
          }}
        >
          <Skeleton w="55%" h={14} />
          <Skeleton w="30%" h={11} />
        </View>
      ))}
    </View>
  );
}

/**
 * LoadingScreen — R327 B2: the ONE boot state (mark at splash position,
 * converging squares, honest 6s «الخادم يستيقظ…» slow label). Every
 * transient full-screen wait routes here — no generic spinner survives.
 */
export function LoadingScreen({ label = "جارٍ التحميل…", onRetry }: { label?: string; onRetry?: () => void }) {
  return <Boot label={label} onRetry={onRetry} />;
}

/** EmptyState — honest emptiness with an optional action. */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  const p = usePalette();
  return (
    <View style={{ alignItems: "center", paddingVertical: sp[40], gap: sp[8], paddingHorizontal: sp[24] }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <T variant="h4" weight="bold" align="center">
        {title}
      </T>
      {message ? (
        <T variant="body" color="muted" align="center">
          {message}
        </T>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: sp[8], minWidth: 200 }}>
          <Button label={actionLabel} kind="ghost" onPress={onAction} small />
        </View>
      ) : null}
    </View>
  );
}

/** ErrorState — normalized failures with a retry affordance. */
export function ErrorState({
  message,
  onRetry,
  compact,
}: {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          backgroundColor: p.surface,
          padding: sp[16],
          gap: sp[8],
          alignItems: compact ? "flex-start" : "center",
        },
        !compact && { paddingVertical: sp[32] },
      ]}
    >
      <T variant="h4" weight="bold" color="danger" align={compact ? "right" : "center"}>
        تعذّر تحميل البيانات
      </T>
      <T variant="body" color="muted" align={compact ? "right" : "center"}>
        {message ?? "حدث خطأ أثناء الاتصال بالخادم."}
      </T>
      {onRetry ? (
        <View style={{ alignSelf: compact ? "flex-start" : "center", marginTop: sp[4] }}>
          <Button label="إعادة المحاولة" kind="ghost" onPress={onRetry} small />
        </View>
      ) : null}
    </View>
  );
}

/** Offline banner — real connectivity state via NetInfo. */
export function OfflineBanner({ visible }: { visible: boolean }) {
  const p = usePalette();
  if (!visible) return null;
  return (
    <View
      accessibilityLabel="لا يوجد اتصال بالإنترنت"
      style={{
        backgroundColor: "#F5EBD6",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#A8750F",
        paddingVertical: 6,
        paddingHorizontal: sp[16],
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
      }}
    >
      <WifiOff size={16} color="#5E420C" />
      <T variant="sm" style={{ color: "#5E420C" }}>
        لا يوجد اتصال — تُعرض بيانات محفوظة قد تكون قديمة، ولن تُرسَل أي عمليات كتابة.
      </T>
    </View>
  );
}

/** Pull-to-refresh wrapper for scroll pages. */
export function Refreshable({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const p = usePalette();
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.accent} colors={[p.accent]} />
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
