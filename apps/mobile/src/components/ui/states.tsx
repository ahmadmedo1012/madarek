import { type ReactNode } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import WifiOff from "lucide-react-native/icons/wifi-off";
import { PlanBuilding, PlanExamHall, PlanLectureHall, PlanLibrary } from "@/brand/plan";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "./text";
import { Button } from "./pressables";
import { Boot, InlineBusy, usePulseStyle } from "./boot";
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
        style,
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

/**
 * LoadingState — R334 B8: the COMPACT loading seat for in-page waits
 * (a section refreshing under an already-rendered screen). One hairline
 * row: three stepping squares + an honest Arabic label. Full-screen waits
 * keep routing to LoadingScreen; this never replaces it.
 */
export function LoadingState({ label = "جارٍ التحميل…" }: { label?: string }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: sp[12],
        paddingVertical: sp[24],
        minHeight: 56,
      }}
    >
      <InlineBusy size={10} color={p.textSecondary} />
      <T variant="sm" color="muted">
        {label}
      </T>
    </View>
  );
}

/* ── R334 B8: blueprint-room empty states ─────────────────────────────── */

/** The four signature rooms an empty screen can stage itself as. */
export type EmptyRoom = "exam-hall" | "library" | "lecture-hall" | "building";

interface RoomSheet {
  Art: (props: { width?: number | string; accessibilityLabel?: string }) => ReactNode;
  title: string;
  message: string;
  a11y: string;
}

/**
 * Room → sheet + copy. The plan sheets render with NO progress/autoplay
 * (fully drawn, static — verified against usePlanDraw: «neither → fully
 * drawn, static»), so empty states cost zero animation and honour
 * reduced-motion by construction.
 */
const ROOMS: Record<EmptyRoom, RoomSheet> = {
  "exam-hall": {
    Art: PlanExamHall,
    title: "لا توجد امتحانات بعد",
    message: "عند نشر الامتحانات ستظهر هنا.",
    a11y: "مخطط قاعة اختبار فارغة",
  },
  library: {
    Art: PlanLibrary,
    title: "لا توجد ملفات",
    message: "الملفات المشتركة معك ستظهر هنا.",
    a11y: "مخطط مكتبة فارغة",
  },
  "lecture-hall": {
    Art: PlanLectureHall,
    title: "لا توجد محاضرات",
    message: "ستظهر المحاضرات هنا بمجرد إضافتها.",
    a11y: "مخطط قاعة محاضرات فارغة",
  },
  building: {
    Art: PlanBuilding,
    title: "لا يوجد محتوى",
    message: "سيظهر المحتوى هنا بمجرد إضافته.",
    a11y: "مخطط مبنى فارغ",
  },
};

/** EmptyState — honest emptiness with an optional action.
 *
 * R334 B8: `room` stages the state as one of the four blueprint rooms
 * (exam hall «لا توجد امتحانات بعد», library «لا توجد ملفات», lecture
 * hall «لا توجد محاضرات», building «لا يوجد محتوى») — the R330 plan art
 * drawn statically above the copy, with room-default title/message that
 * explicit props override. Pre-R334 call sites (title + message + icon)
 * render exactly as before.
 */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  art,
  room,
  fill,
}: {
  /** Optional when `room` carries its default; overrides the room copy. */
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  /**
   * R330: optional illustration slot (e.g. a brand/plan sheet) — seats
   * above the title; screens that want signature art pass it here.
   */
  art?: ReactNode;
  /** R334 B8: stage the state inside one of the four blueprint rooms. */
  room?: EmptyRoom;
  /**
   * T-50 (review-2 P1-4 / review-3 P0-2): grow + optically center in the
   * leftover viewport — the sparse-state fix for the 40–70% dead band
   * below top-stuck empties. Opt-in so inline section empties (small
   * variants inside populated screens) keep their scroll-flow seat.
   */
  fill?: boolean;
}) {
  const p = usePalette();
  const sheet = room ? ROOMS[room] : undefined;
  const resolvedTitle = title ?? sheet?.title ?? "لا يوجد محتوى بعد";
  const resolvedMessage = message ?? sheet?.message;
  const resolvedArt = art ?? (sheet ? <sheet.Art width={216} accessibilityLabel={sheet.a11y} /> : null);
  return (
    <View
      style={[
        { alignItems: "center", paddingVertical: sp[40], gap: sp[8], paddingHorizontal: sp[24] },
        fill ? { flexGrow: 1, justifyContent: "center" } : null,
      ]}
    >
      {resolvedArt}
      {/* B4 re-review (R2+R3, three panels): the icon frame rendered even
          with NO icon — a blank 56×56 bordered square that every reviewer
          read as «a broken/unloaded component». The frame exists to seat
          an icon; no icon, no frame — the title + message carry the empty
          state cleanly. */}
      {icon ? (
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
      ) : null}
      <T variant="h4" weight="bold" align="center">
        {resolvedTitle}
      </T>
      {resolvedMessage ? (
        <T variant="body" color="muted" align="center">
          {resolvedMessage}
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

/** ErrorState — normalized failures with a retry affordance.
 *
 * R334 B8: optional `onReport` adds «إبلاغ عن مشكلة» (a second ghost
 * action under the retry). Pre-R334 call sites render exactly as before.
 */
export function ErrorState({
  message,
  onRetry,
  onReport,
  compact,
}: {
  message?: string;
  onRetry?: () => void;
  /** R334 B8: optional «إبلاغ عن مشكلة» action (client-errors intake). */
  onReport?: () => void;
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
      {onRetry || onReport ? (
        <View
          style={{
            alignSelf: compact ? "flex-start" : "center",
            marginTop: sp[4],
            flexDirection: "row",
            gap: sp[8],
            flexWrap: "wrap",
          }}
        >
          {onRetry ? <Button label="إعادة المحاولة" kind="ghost" onPress={onRetry} small /> : null}
          {onReport ? <Button label="إبلاغ عن مشكلة" kind="ghost" onPress={onReport} small /> : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * OfflineState — R334 B8: the honest «this screen has nothing offline»
 * seat, for when the query cache holds NOTHING to show (no stale data,
 * no placeholder). Screens with cached data keep showing it (persistence
 * layer); this is the empty-handed branch.
 */
export function OfflineState({
  title = "أنت غير متصل بالإنترنت",
  message = "لا توجد نسخة محفوظة من هذه الصفحة — سيتم تحميلها عند عودة الاتصال.",
  onRetry,
}: {
  title?: string;
  message?: string;
  /** Optional «إعادة المحاولة» — screens refetch after reconnect. */
  onRetry?: () => void;
}) {
  const warn = useStatusTones().yellow;
  return (
    <View
      accessibilityLabel={title}
      style={{
        alignItems: "center",
        paddingVertical: sp[40],
        gap: sp[8],
        paddingHorizontal: sp[24],
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: warn.ink,
          backgroundColor: warn.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <WifiOff size={22} color={warn.deep} />
      </View>
      <T variant="h4" weight="bold" align="center">
        {title}
      </T>
      <T variant="body" color="muted" align="center">
        {message}
      </T>
      {onRetry ? (
        <View style={{ marginTop: sp[8], minWidth: 200 }}>
          <Button label="إعادة المحاولة" kind="ghost" onPress={onRetry} small />
        </View>
      ) : null}
    </View>
  );
}

/** Offline banner — real connectivity state via NetInfo. */
export function OfflineBanner({ visible }: { visible: boolean }) {
  const warn = useStatusTones().yellow;
  if (!visible) return null;
  return (
    <View
      accessibilityLabel="لا يوجد اتصال بالإنترنت"
      style={{
        backgroundColor: warn.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: warn.ink,
        paddingVertical: 6,
        paddingHorizontal: sp[16],
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
      }}
    >
      <WifiOff size={16} color={warn.deep} />
      <T variant="sm" style={{ color: warn.deep }}>
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
