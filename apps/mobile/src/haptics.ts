/**
 * R334 2-b — Haptics: the app's ONE door to the vibration engine.
 *
 * expo-haptics is already trivial to call (TabBar + Button do it inline
 * today), but a raw call re-decides three policies per call site. This
 * module centralizes them so Round 2 wiring (tab bar, sheets, forms,
 * exam submit, grading) never has to think:
 *
 *  1. ENABLED GATE — a persisted user kill-switch. Non-secret settings
 *     ride AsyncStorage in this app (the `mdrk-mobile-*` family — see
 *     auth/session.ts; SecureStore is for secrets only, per
 *     lib/tokenStorage.ts / lib/biometric.tsx). Default ON; a missing or
 *     unreadable value never disables feedback.
 *  2. ANTI-SPAM — a global 60ms floor between ANY two feedbacks, plus a
 *     per-kind cooldown (selection 150ms … impact:heavy 200ms, notify
 *     250ms). Blocked attempts do NOT re-stamp the window — spam during
 *     a cooldown can never push it forward.
 *  3. PLATFORM HONESTY — web has no engine worth trusting → full no-op
 *     (not even a navigator.vibrate); iOS gets the semantic
 *     UINotificationFeedbackType haptics; Android has no such type, so
 *     notify() escalates through impact strengths instead (see
 *     ANDROID_NOTIFY_IMPACT). An unavailable engine rejects — swallowed;
 *     feedback must never crash a flow.
 *
 * Usage map + wiring points: docs/mobile/foundations/haptics.md.
 * Unit net: ./haptics.test.ts (clock + platform are injectable via
 * __hapticsInternals — no fake timers needed).
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type HapticImpact = "light" | "medium" | "heavy";
export type HapticNotification = "success" | "warning" | "error";

/** Non-secret preference — the `mdrk-mobile-*` AsyncStorage family. */
const STORAGE_KEY = "mdrk-mobile-haptics-enabled";

/** Global floor: minimum ms between ANY two emitted feedbacks. */
const MIN_GAP_MS = 60;

/** Internal discriminator for the per-kind cooldown map. */
type FireKind = "selection" | `impact:${HapticImpact}` | `notify:${HapticNotification}`;

/**
 * Per-kind cooldown — how long one KIND stays quiet after it fired
 * (independent of the global floor; both must pass).
 */
const COOLDOWN_MS: Record<FireKind, number> = {
  selection: 150,
  "impact:light": 100,
  "impact:medium": 150,
  "impact:heavy": 200,
  "notify:success": 250,
  "notify:warning": 250,
  "notify:error": 250,
};

const IMPACT_STYLE: Record<HapticImpact, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const NOTIFY_TYPE: Record<HapticNotification, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

/**
 * Android mapping — UINotificationFeedbackType is an iOS engine; Android
 * gets a monotonic severity escalation through impact strengths instead:
 *   success → light · warning → medium · error → heavy
 * (documented for the owner in docs/mobile/foundations/haptics.md).
 */
const ANDROID_NOTIFY_IMPACT: Record<HapticNotification, HapticImpact> = {
  success: "light",
  warning: "medium",
  error: "heavy",
};

/* ── module state (single instance; tests reset via __hapticsInternals) ── */

let enabled = true; // optimistic default: ON until storage says otherwise
let explicitSet = false; // a setEnabled() beat an in-flight hydrate read
let hydratePromise: Promise<void> | null = null;
let lastFireAt = Number.NEGATIVE_INFINITY;
const lastFireByKind = new Map<FireKind, number>();

/** Injectable seams — __hapticsInternals swaps these in tests. */
let clock: () => number = () => Date.now();
let platformOS: () => string = () => Platform.OS;

function shouldFire(kind: FireKind, now: number): boolean {
  if (!enabled) return false; // the kill-switch
  if (platformOS() === "web") return false; // web: no engine — no-op by design
  if (now - lastFireAt < MIN_GAP_MS) return false; // global anti-spam floor
  const last = lastFireByKind.get(kind);
  if (last !== undefined && now - last < COOLDOWN_MS[kind]) return false;
  return true;
}

/**
 * The one gate every feedback passes. Emits are fire-and-forget: the
 * engine promise is caught (UnavailabilityError et al. must never crash
 * the flow that asked for feedback). Promise.resolve() also tolerates
 * engines/mocks that return non-promises.
 */
function fire(kind: FireKind, emit: () => void | Promise<void>): void {
  const now = clock();
  if (!shouldFire(kind, now)) return;
  // Stamp ONLY on emit — a blocked attempt must never extend any window.
  lastFireAt = now;
  lastFireByKind.set(kind, now);
  Promise.resolve(emit()).catch(() => undefined);
}

/**
 * Read the persisted preference once (idempotent). The shell may await
 * this at startup; a module-scope kick below covers shells that don't.
 */
export function hydrate(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      // setEnabled() won the race — its own write is already in storage.
      if (explicitSet) return;
      enabled = stored !== "0";
    })();
  }
  return hydratePromise;
}

export const haptics = {
  /** Tab / segment / filter-wheel change — the quiet tick. */
  selection(): void {
    fire("selection", () => Haptics.selectionAsync());
  },

  /** Primary button press (light) · long-press / swipe threshold (medium+). */
  impact(style: HapticImpact): void {
    fire(`impact:${style}`, () => Haptics.impactAsync(IMPACT_STYLE[style]));
  },

  /**
   * Outcome semantics — submit success / validation error / destructive
   * confirm. iOS: the native notification haptics. Android: no such
   * engine → the documented impact escalation. Web: no-op (fire() gate).
   */
  notify(type: HapticNotification): void {
    const emit =
      platformOS() === "android"
        ? () => Haptics.impactAsync(IMPACT_STYLE[ANDROID_NOTIFY_IMPACT[type]])
        : () => Haptics.notificationAsync(NOTIFY_TYPE[type]);
    // Cooldown keys the PUBLIC kind — an Android notify('success') that
    // vibrates like impact('light') must not eat impact('light')'s budget.
    fire(`notify:${type}`, emit);
  },

  /** The kill-switch — applies instantly, persists in the background. */
  setEnabled(v: boolean): void {
    explicitSet = true;
    enabled = v;
    // Repo pattern (session.ts): fire-and-forget; a storage failure must
    // never break the flow that toggled — worst case it re-defaults ON.
    AsyncStorage.setItem(STORAGE_KEY, v ? "1" : "0").catch(() => undefined);
  },

  /** Current gate state (cached; hydrate() corrects it from storage). */
  isEnabled(): boolean {
    return enabled;
  },

  /** Await the persisted preference (startup / tests). Idempotent. */
  hydrate,
};

export type HapticsApi = typeof haptics;

/**
 * Test-only seams — a controllable clock + platform and a clean reset.
 * NOTHING here is used by app code; it exists so the throttle gates can
 * be pinned deterministically without fake timers or Platform mutation.
 */
export const __hapticsInternals = {
  setClock(fn: () => number): void {
    clock = fn;
  },
  setPlatform(os: "ios" | "android" | "web" | (string & {})): void {
    platformOS = () => os;
  },
  /** Restore first-import state: gate, race flag, throttle window, seams. */
  reset(): void {
    enabled = true;
    explicitSet = false;
    hydratePromise = null;
    lastFireAt = Number.NEGATIVE_INFINITY;
    lastFireByKind.clear();
    clock = () => Date.now();
    platformOS = () => Platform.OS;
  },
};

// One cheap read at import so isEnabled() is honest even if the shell
// never awaits hydrate() (Round 2 wiring may await it explicitly).
void hydrate();
