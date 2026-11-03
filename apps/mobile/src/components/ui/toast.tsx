import { Pressable, StyleSheet, Text, View } from "react-native";
import { create } from "zustand";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Info from "lucide-react-native/icons/info";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";

/**
 * R334 2-c — toast with a QUEUE.
 *
 * The R326 host stacked up to three toasts on top of each other; a burst of
 * mutations (bulk grade save → 3 success toasts) painted a column that
 * covered the header. The upgrade keeps every existing export and call
 * signature (`toast.info(message, title?)` etc. — all consumers untouched)
 * and changes the HOST contract only: ONE visible toast at a time, the rest
 * wait in line, each shown for its own duration. New, additive:
 *   · `warning` variant (yellow tone + circle-alert icon)
 *   · `toast.hide()` / `toast.hideAll()` — manual dismiss
 *   · `toast.onShow(cb)` — a callback slot fired when a toast becomes the
 *     visible one (the lead wires haptics there on another branch — no
 *     src/haptics import here by contract)
 */
export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
}

/** Internal queued item — ToastItem (public shape) + per-item duration. */
interface QueuedToast extends ToastItem {
  duration?: number;
}

/** Auto-dismiss budget (ms). Unchanged from R326. */
export const TOAST_DURATION_MS = 4200;

/** Upper bound of the queue — a burst may line up, never pile on screen. */
const MAX_QUEUE = 4;

interface ToastState {
  /** The QUEUE — ToastHost renders only the head (`toasts[0]`). */
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string, title?: string, duration?: number) => void;
  /** Kept from R326: remove a toast by id (now: dequeue at any position). */
  dismiss: (id: number) => void;
  /** Manual hide of the VISIBLE toast — the next queued one takes over. */
  hide: () => void;
  hideAll: () => void;
}

let nextId = 1;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeadId: number | null = null;

/* ── the onShow callback slot (lead wires haptics later) ──────────────── */

let onShowListener: ((toast: ToastItem) => void) | null = null;

/** Register/unregister the onShow slot. `null` clears it. */
export function setToastOnShow(cb: ((toast: ToastItem) => void) | null): void {
  onShowListener = cb;
}

function scheduleAutoHide(item: QueuedToast): void {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    useToastStore.getState().hide();
  }, item.duration ?? TOAST_DURATION_MS);
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message, title, duration) =>
    set((s) => {
      const item: QueuedToast = { id: nextId++, kind, message, title, duration };
      return { toasts: [...s.toasts, item].slice(-MAX_QUEUE) };
    }),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  hide: () => set((s) => ({ toasts: s.toasts.slice(1) })),
  hideAll: () => set(() => ({ toasts: [] })),
}));

/* The queue engine: whenever the HEAD changes, fire the onShow slot and
   (re)arm the auto-dismiss timer for the new head. Runs without the host
   mounted, so the queue contract is testable headless. */
useToastStore.subscribe((state) => {
  const head = state.toasts[0] as QueuedToast | undefined;
  if ((head?.id ?? null) === lastHeadId) return;
  lastHeadId = head?.id ?? null;
  if (!head) {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    return;
  }
  onShowListener?.(head);
  scheduleAutoHide(head);
});

/** toast.info / toast.success / toast.warning / toast.error — mirror of lib/toast.ts semantics. */
export const toast = {
  info: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().push("info", message, title, duration),
  success: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().push("success", message, title, duration),
  warning: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().push("warning", message, title, duration),
  error: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().push("error", message, title, duration),
  /** Hide the visible toast now (tap-out equivalent). */
  hide: () => useToastStore.getState().hide(),
  /** Drop the whole queue + the visible toast. */
  hideAll: () => useToastStore.getState().hideAll(),
  /**
   * Callback slot — fires when a toast becomes the visible one. The haptics
   * branch registers here; this module never imports src/haptics itself.
   */
  onShow: (cb: ((toast: ToastItem) => void) | null) => setToastOnShow(cb),
};

export function useToast() {
  return toast;
}

function toneForKind(kind: ToastKind, tones: ReturnType<typeof useStatusTones>) {
  return kind === "success" ? tones.mint : kind === "error" ? tones.rose : kind === "warning" ? tones.yellow : tones.sky;
}

function iconForKind(kind: ToastKind, color: string) {
  if (kind === "success") return <CheckCircle2 size={18} color={color} />;
  if (kind === "error") return <TriangleAlert size={18} color={color} />;
  if (kind === "warning") return <CircleAlert size={18} color={color} />;
  return <Info size={18} color={color} />;
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const hide = useToastStore((s) => s.hide);
  const p = usePalette();
  const tones = useStatusTones();
  const t = toasts[0];
  const tone = t ? toneForKind(t.kind, tones) : null;
  return (
    <View
      pointerEvents="box-none"
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
      {t && tone ? (
        <Pressable
          key={t.id}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${t.title ? `${t.title}. ` : ""}${t.message}`}
          onPress={hide}
          style={[
            styles.toast,
            {
              backgroundColor: p.surface,
              borderColor: tone.ink,
              marginHorizontal: sp[16],
            },
          ]}
        >
          {iconForKind(t.kind, tone.ink)}
          <View style={{ flex: 1, gap: 1 }}>
            {t.title ? (
              <Text style={{ fontFamily: "Body-Bold", fontSize: 13, color: tone.deep }}>
                {t.title}
              </Text>
            ) : null}
            <Text style={{ fontFamily: "Body-Regular", fontSize: 13, color: p.text }}>{t.message}</Text>
          </View>
        </Pressable>
      ) : null}
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
