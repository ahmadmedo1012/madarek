import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { create } from "zustand";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react-native";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";

export type ToastKind = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string, title?: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message, title) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, message, title }] }));
    setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** toast.info / toast.success / toast.error — mirror of lib/toast.ts semantics. */
export const toast = {
  info: (message: string, title?: string) => useToastStore.getState().push("info", message, title),
  success: (message: string, title?: string) => useToastStore.getState().push("success", message, title),
  error: (message: string, title?: string) => useToastStore.getState().push("error", message, title),
};

export function useToast() {
  return toast;
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const p = usePalette();
  const tones = useStatusTones();
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: "center",
        paddingTop: 60,
      }}
    >
      {toasts.map((t) => {
        const tone = t.kind === "success" ? tones.mint : t.kind === "error" ? tones.rose : tones.sky;
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? TriangleAlert : Info;
        return (
          <View
            key={t.id}
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              {
                backgroundColor: p.surface,
                borderColor: tone.ink,
                marginHorizontal: sp[16],
              },
            ]}
          >
            <Icon size={18} color={tone.ink} />
            <View style={{ flex: 1, gap: 1 }}>
              {t.title ? (
                <Text style={{ fontFamily: "Body-Bold", fontSize: 13, color: tone.deep }}>
                  {t.title}
                </Text>
              ) : null}
              <Text style={{ fontFamily: "Body-Regular", fontSize: 13, color: p.text }}>{t.message}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: sp[8],
    padding: sp[12],
    width: "100%",
    maxWidth: 480,
  },
});
