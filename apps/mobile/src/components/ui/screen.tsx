import { type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  Platform,
} from "react-native";
// R331 A-App-Motion — the controller's KeyboardAvoidingView replaces RN's:
// same behavior prop, but the offset is tracked per-pixel on the UI thread
// (KeyboardProvider at the root drives it) — no layout-thrash frame lag.
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { CONTENT_MAX_WIDTH, useResponsive } from "@/hooks/useResponsive";
import { T , MonoLabel } from "./text";

export interface ScreenProps {
  children: ReactNode;
  /** Scrollable page body. */
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  /**
   * R366 A5 — opt OUT of the responsive content column. On ≥600dp windows
   * (foldables open, landscape phones, tablets) the content column centres
   * at CONTENT_MAX_WIDTH so Arabic prose and cards keep their reading
   * measure instead of stretching 600–800dp edge-to-edge; the paper
   * background stays full-bleed either way. Full-bleed compositions
   * (welcome hero, immersive players, map surfaces) pass `wide`.
   */
  wide?: boolean;
}

/**
 * PageFrame — paper ground, safe areas, optional scroll.
 * The Heron drafting sheet: background = paper, no decorative chrome.
 */
export function Screen({ children, scroll = true, padded = true, style, contentContainerStyle, keyboardShouldPersistTaps = "handled", wide = false }: ScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { wide: isWideWindow } = useResponsive();
  const base: StyleProp<ViewStyle> = [
    { flex: 1, backgroundColor: p.bg },
    { paddingTop: insets.top, paddingBottom: insets.bottom },
    style,
  ];
  // R366 A5 — the responsive content column (see ScreenProps.wide).
  // Caller contentContainerStyle stays LAST so a screen can still
  // override the cap for a bespoke composition.
  const column: StyleProp<ViewStyle> =
    isWideWindow && !wide ? { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" } : null;
  const inner: StyleProp<ViewStyle> = [{ flexGrow: 1, gap: sp[16] }, column, contentContainerStyle];
  if (scroll) {
    return (
      <View style={base}>
        <ScrollView
          contentContainerStyle={[inner, padded && styles.pad]}
          showsVerticalScrollIndicator={false}
          /* R362 — the prop is finally LIVE: it was declared in
             ScreenProps but never destructured, so every caller's
             override silently fell back to the hardcoded "handled".
             Default stays "handled" (taps outside inputs dismiss the
             keyboard first — the form contract). */
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={base}>
      {padded ? <View style={[styles.pad, column]}>{children}</View> : children}
    </View>
  );
}

/** Non-scrolling page for forms/centered layouts. */
export function FormScreen({ children, style, wide = false }: ScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { wide: isWideWindow } = useResponsive();
  // R366 A5 — forms centre in the same readable column as Screen bodies.
  const column: StyleProp<ViewStyle> =
    isWideWindow && !wide ? { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center" } : null;
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: p.bg }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={{ flex: 1, paddingTop: Math.max(0, insets.top - sp[8]) }} edges={["top"]}>
        <View style={[{ flex: 1 }, column]}>{children}</View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // R369-C (the C3.2 root fix, judged from the emulator capture set):
  // pad carried ONLY the horizontal gutters, so every scrollable Screen
  // ended flush at the content region's bottom edge — the last row kissed
  // the bottom TabBar (measured on the student dashboard capture: the
  // «مخططات UML» row cut at the bar edge, subtitle truncated). The
  // drafting-sheet rhythm gets a bottom breath (sp[24]) on every
  // scrolling body; wide/tablet windows and non-scroll Forms are
  // unaffected (the Form pad is its own rule).
  pad: { paddingHorizontal: sp[20], paddingBottom: sp[24] },
});

/** PageHeader — drafting title bar with kicker + hairline rule. */
export function PageHeader({
  title,
  kicker,
  mono,
  right,
  compact,
  testID,
}: {
  title: string;
  kicker?: string;
  mono?: string;
  right?: ReactNode;
  compact?: boolean;
  /** Stable e2e anchor (Maestro): RTL text matching proved unreliable —
   * the settings capture flow pins this id instead of «الإعدادات». */
  testID?: string;
}) {
  const p = usePalette();
  return (
    <View
      testID={testID}
      style={{
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
        paddingBottom: compact ? sp[8] : sp[12],
        marginBottom: compact ? sp[8] : sp[4],
        minHeight: 44,
        justifyContent: "center",
      }}
    >
      {kicker ? <T variant="sm" color="muted">{kicker}</T> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
        <View style={{ flex: 1 }}>
          <T variant="h2" weight="bold">{title}</T>
        </View>
        {mono ? <MonoLabel>{mono}</MonoLabel> : null}
        {right}
      </View>
    </View>
  );
}

/** SectionBar — mono-indexed section title: [01] العنوان. */
export function SectionBar({ index, title, action }: { index: number | string; title: string; action?: ReactNode }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
        paddingBottom: sp[6],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.border,
      }}
    >
      <MonoLabel>{`[${String(index).padStart(2, "0")}]`}</MonoLabel>
      <T variant="h4" weight="bold" style={{ flex: 1 }}>
        {title}
      </T>
      {action}
    </View>
  );
}
