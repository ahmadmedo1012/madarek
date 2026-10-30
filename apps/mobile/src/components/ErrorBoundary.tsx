/**
 * R326 M1.1 — root + per-role error boundary.
 *
 * A render crash must never white-screen the app: this boundary shows a
 * branded Arabic fallback («حدث خلل») with retry / exit actions and reports
 * the failure (with route, role and breadcrumbs) to /client-errors.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { themeFor } from "@/design/theme";
import { crumb, reportClientError, getTelemetryRoute } from "@/lib/telemetry";

interface Props {
  children: ReactNode;
  /** Logical surface label, e.g. "root", "student", "teacher". */
  scope: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    crumb(`boundary ${this.props.scope}: ${error.message}`);
    void reportClientError({
      kind: "render",
      message: `[${this.props.scope}] ${error.message}`,
      stack: error.stack ?? info.componentStack ?? null,
      route: getTelemetryRoute(),
    });
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { palette } = themeFor("light");
    return (
      <View style={[styles.fill, { backgroundColor: palette.bg }]}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.content}
          accessibilityLabel="حدث خلل غير متوقع"
        >
          <View style={[styles.rule, { backgroundColor: palette.accent }]} />
          <Text style={[styles.index, { color: palette.textMuted }]}>خلل</Text>
          <Text style={[styles.title, { color: palette.text }]}>حدث خلل غير متوقع</Text>
          <Text style={[styles.body, { color: palette.textSecondary }]}>
            نعتذر — حدث خطأ غير متوقع في هذه الشاشة. لم يتم فقدان بياناتك. أُرسل تقرير
            الخطأ تلقائيًا لفريق مدارك.
          </Text>
          {__DEV__ && error.message ? (
            <Text style={[styles.stack, { color: palette.textFaint }]} selectable>
              {error.message}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إعادة المحاولة"
            onPress={this.reset}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: pressed ? palette.accentHover : palette.accent },
            ]}
          >
            <Text style={[styles.buttonText, { color: palette.accentFg }]}>إعادة المحاولة</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  rule: { alignSelf: "flex-end", width: 56, height: 3 },
  index: { fontFamily: "GeistMono", fontSize: 11, letterSpacing: 1.5, writingDirection: "rtl" },
  title: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 22, writingDirection: "rtl", textAlign: "right" },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 15, lineHeight: 24, writingDirection: "rtl", textAlign: "right" },
  stack: { fontFamily: "GeistMono", fontSize: 11, lineHeight: 16 },
  button: { alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12, minWidth: 140, alignItems: "center" },
  buttonText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 15 },
});
