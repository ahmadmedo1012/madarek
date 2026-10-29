import { type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "./text";
import { MonoLabel } from "./text";

export interface ScreenProps {
  children: ReactNode;
  /** Scrollable page body. */
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
}

/**
 * PageFrame — paper ground, safe areas, optional scroll.
 * The Heron drafting sheet: background = paper, no decorative chrome.
 */
export function Screen({ children, scroll = true, padded = true, style, contentContainerStyle }: ScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const base: StyleProp<ViewStyle> = [
    { flex: 1, backgroundColor: p.bg },
    { paddingTop: insets.top, paddingBottom: insets.bottom },
    style,
  ];
  const inner: StyleProp<ViewStyle> = [{ flexGrow: 1, gap: sp[16] }, contentContainerStyle];
  if (scroll) {
    return (
      <View style={base}>
        <ScrollView
          contentContainerStyle={[inner, padded && styles.pad]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return <View style={base}>{padded && <View style={styles.pad}>{children}</View>}</View>;
}

/** Non-scrolling page for forms/centered layouts. */
export function FormScreen({ children, style }: ScreenProps) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: p.bg }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={{ flex: 1, paddingTop: Math.max(0, insets.top - sp[8]) }} edges={["top"]}>
        {children}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: sp[20] },
});

/** PageHeader — drafting title bar with kicker + hairline rule. */
export function PageHeader({
  title,
  kicker,
  mono,
  right,
  compact,
}: {
  title: string;
  kicker?: string;
  mono?: string;
  right?: ReactNode;
  compact?: boolean;
}) {
  const p = usePalette();
  return (
    <View
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
