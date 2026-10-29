import { type ReactNode, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp, type StatusToneName } from "@/design/tokens";
import { T } from "./text";
import { Button } from "./pressables";

/** Hairline divider — the Heron separator. */
export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }, style]} />;
}

/** Card — surface + hairline border, radius 0 (Heron discipline). */
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  const box: StyleProp<ViewStyle> = [
    {
      backgroundColor: p.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: sp[16],
    },
    style,
  ];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [box, { backgroundColor: pressed ? p.surfaceHover : p.surface }]}
    >
      {children}
    </Pressable>
  );
}

/** Badge — status chip on a tone (bg/ink pair). */
export function Badge({
  label,
  tone = "grey",
  mono,
  style,
}: {
  label: string;
  tone?: StatusToneName;
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tones = useStatusTones();
  const t = tones[tone];
  return (
    <View
      style={[
        {
          backgroundColor: t.bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.ink,
          paddingHorizontal: sp[8],
          paddingVertical: 3,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <T variant={mono ? "monoSm" : "sm"} weight="bold" style={{ color: t.ink }}>
        {label}
      </T>
    </View>
  );
}

/** «محاكاة» honesty tag — contractual disclosure for simulated features. */
export function SimulatedBadge({ note }: { note?: string }) {
  return (
    <Badge label={note ? `محاكاة · ${note}` : "محاكاة"} tone="yellow" />
  );
}

/** Bottom Sheet — native modal surface with hairline frame. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const p = usePalette();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="إغلاق" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: p.surface, borderColor: p.rule, borderTopWidth: StyleSheet.hairlineWidth },
        ]}
      >
          <View style={styles.grab} />
          <T variant="h4" weight="bold" style={{ paddingBottom: sp[12] }}>
            {title}
          </T>
          <ScrollView contentContainerStyle={{ paddingBottom: sp[16] }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? (
            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border, paddingTop: sp[12] }}>
              {footer}
            </View>
          ) : null}
        </View>
      </Modal>
  );
}

/** Confirm dialog for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  onConfirm,
  onCancel,
  danger,
  loading,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  const p = usePalette();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: p.surface, borderColor: p.rule }]}>
          <T variant="h4" weight="bold">{title}</T>
          {message ? (
            <T variant="body" color="secondary" style={{ marginTop: sp[8] }}>
              {message}
            </T>
          ) : null}
          <View style={{ flexDirection: "row", gap: sp[8], marginTop: sp[16] }}>
            <View style={{ flex: 1 }}>
              <Button label="إلغاء" kind="ghost" onPress={onCancel} small />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={confirmLabel}
                kind={danger ? "danger" : "primary"}
                onPress={onConfirm}
                loading={loading}
                small
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Bottom-sheet picker for enumerated choices (institutions, faculties…). */
export function OptionSheet({
  open,
  onClose,
  title,
  options,
  onSelect,
  selectedId,
  loading,
  emptyLabel = "لا توجد خيارات",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: { id: string; label: string; sub?: string | null }[];
  onSelect: (id: string) => void;
  selectedId?: string | null;
  loading?: boolean;
  emptyLabel?: string;
}) {
  const p = usePalette();
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {loading ? (
        <T variant="body" color="muted">جارٍ التحميل…</T>
      ) : options.length === 0 ? (
        <T variant="body" color="muted">{emptyLabel}</T>
      ) : (
        options.map((o) => (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            onPress={() => {
              onSelect(o.id);
              onClose();
            }}
            style={({ pressed }) => ({
              minHeight: 48,
              justifyContent: "center",
              backgroundColor: pressed ? p.surfaceHover : "transparent",
              paddingHorizontal: sp[8],
            })}
          >
            <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.border, paddingVertical: sp[8] }}>
              <T variant="body" weight={o.id === selectedId ? "bold" : "medium"}>
                {o.label}
              </T>
              {o.sub ? (
                <T variant="sm" color="muted">
                  {o.sub}
                </T>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(40,40,40,0.45)" },
  sheet: {
    maxHeight: "82%",
    marginTop: "auto",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: sp[20],
    paddingTop: sp[8],
  },
  grab: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#B3B3AF", marginBottom: sp[8] },
  dialog: {
    marginHorizontal: sp[24],
    borderWidth: StyleSheet.hairlineWidth,
    padding: sp[20],
  },
});
