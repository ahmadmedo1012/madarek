/**
 * Programmatic toast API — the app's global passive-feedback channel.
 *
 * `toast.success/error/info/warning(...)` pushes a toast onto a zustand
 * store; the single <ToastStack /> mounted at the App root renders them
 * (fixed, bottom, inline-end anchored, RTL-aware — see
 * styles/notifications.css). Callers never manage overlay state.
 *
 * Contract mirrors the Toast primitive
 * (specs/012-design-graphics-uplift/contracts/elevation-language.md):
 *   - `error` toasts never auto-dismiss (manual close only).
 *   - other variants auto-dismiss (default 5000ms, overridable).
 *   - toasts never steal focus.
 *
 * Store shape follows the stores/*.store.ts zustand conventions
 * (session-scoped — no persist middleware; toasts are ephemeral).
 */
import { create } from 'zustand';
import type { ToastVariant } from '../components/overlays/Toast';

export type { ToastVariant };

export interface ToastAction {
  /** Action-named Arabic label for the inline action button. */
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Overrides the variant's default Arabic title. */
  title?: string;
  /** Auto-dismiss delay in ms. Ignored for `error` (manual dismiss). */
  durationMs?: number;
  /** Optional inline action (dismisses the toast after firing). */
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  durationMs: number;
  action?: ToastAction;
  /** True while the exit animation plays — the stack keeps rendering. */
  closing: boolean;
}

/** Arabic default titles per variant (guardrail: real, concise copy). */
const DEFAULT_TITLES: Record<ToastVariant, string> = {
  success: 'تمّ بنجاح',
  error: 'حدث خطأ',
  info: 'معلومة',
  warning: 'تنبيه',
};

const DEFAULT_DURATION_MS = 5000;
/** Visible cap — older toasts start their exit when the stack overflows. */
const MAX_VISIBLE = 4;

let seq = 0;
const nextId = () => `toast-${++seq}`;

interface ToastState {
  items: ToastItem[];
  /** Adds a toast (newest last — renders nearest the viewport bottom). */
  push: (item: Omit<ToastItem, 'id' | 'closing'>) => string;
  /** Starts the exit animation for one toast (idempotent). */
  dismiss: (id: string) => void;
  /** Actually unmounts one toast — called after the exit animation. */
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  items: [],
  push: (input) => {
    const id = nextId();
    set((s) => {
      const items = [...s.items, { ...input, id, closing: false }];
      // Cap: only still-open toasts count toward MAX_VISIBLE — the
      // overflow starts closing the OLDEST open ones (never the new
      // toast, and never an already-closing one).
      let overflow = items.filter((t) => !t.closing).length - MAX_VISIBLE;
      if (overflow <= 0) return { items };
      return {
        items: items.map((t) => {
          if (overflow > 0 && !t.closing && t.id !== id) {
            overflow -= 1;
            return { ...t, closing: true };
          }
          return t;
        }),
      };
    });
    return id;
  },
  dismiss: (id) =>
    set((s) => ({
      items: s.items.map((t) => (t.id === id && !t.closing ? { ...t, closing: true } : t)),
    })),
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

function show(variant: ToastVariant, message: string, opts?: ToastOptions): string {
  return useToastStore.getState().push({
    variant,
    title: opts?.title ?? DEFAULT_TITLES[variant],
    message,
    durationMs: opts?.durationMs ?? DEFAULT_DURATION_MS,
    action: opts?.action,
  });
}

/** The programmatic surface: `toast.success('…')` from anywhere in the app. */
export const toast = {
  success: (message: string, opts?: ToastOptions) => show('success', message, opts),
  error: (message: string, opts?: ToastOptions) => show('error', message, opts),
  info: (message: string, opts?: ToastOptions) => show('info', message, opts),
  warning: (message: string, opts?: ToastOptions) => show('warning', message, opts),
  /** Imperatively dismiss by id (the close button path needs no id). */
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
