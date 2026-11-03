/**
 * resilience/network — R334 B8: the connectivity layer.
 *
 * Two halves:
 *
 *   · `useNetworkStatus()` — the ONE NetInfo subscription hook. Pure
 *     observation (no side effects): screens read `isOnline` for honest
 *     offline copy; the exam queue gates flushes on it.
 *
 *   · `NetworkBanner` — the thin top banner the lead mounts once at the
 *     app root (Round 2 wiring). While offline it reads «لا يوجد اتصال
 *     بالإنترنت — سيتم إعادة المحاولة تلقائيًا»; when the connection
 *     returns it flashes «عاد الاتصال» (mint) for ~2.4s then exits.
 *     Enter/exit is opacity + translateY only (the Heron motion
 *     discipline — no layout animation); reduced-motion shows/hides
 *     statically. Safe-area aware (pads `insets.top`).
 *
 *   · `useOnlineManagerBridge()` — wires NetInfo into TanStack Query's
 *     onlineManager (mounted by <NetworkBanner/>): queries PAUSE while
 *     offline instead of burning retries, and auto-resume on reconnect —
 *     exactly what the banner's «سيتم إعادة المحاولة تلقائيًا» promises.
 *     Ref-counted so remounts never double-subscribe.
 */
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import {
  addEventListener as addNetInfoListener,
  fetch as fetchNetInfoState,
  type NetInfoState,
} from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WifiOff from "lucide-react-native/icons/wifi-off";
import Wifi from "lucide-react-native/icons/wifi";
import { useStatusTones } from "@/design/theme";
import { heronEase, sp } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { T } from "@/components/ui/text";

/* ── useNetworkStatus ───────────────────────────────────────────────── */

export interface NetworkStatus {
  /** Honest connectivity: false only once NetInfo has resolved offline. */
  isOnline: boolean;
  /** True from first render until NetInfo answers the first time. */
  isResolved: boolean;
  /** NetInfo's interface name ("wifi" | "cellular" | …) once resolved. */
  type: string | null;
}

const stateOf = (s: NetInfoState | null): NetworkStatus =>
  s
    ? {
        isOnline: s.isConnected !== false && s.isInternetReachable !== false,
        isResolved: true,
        type: s.type,
      }
    : { isOnline: true, isResolved: false, type: null };

/**
 * The ONE NetInfo subscription hook. Optimistic-online until the first
 * resolve (no false «أنت غير متصل» flash at cold start), honest after.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => stateOf(null));
  useEffect(() => {
    // NetInfo v6+: addEventListener returns the unsubscribe function and
    // fires the listener with the current state soon after subscribing.
    const unsubscribe = addNetInfoListener((s) => setStatus(stateOf(s)));
    fetchNetInfoState()
      .then((s) => setStatus(stateOf(s)))
      .catch(() => undefined);
    return () => unsubscribe();
  }, []);
  return status;
}

/* ── onlineManager bridge (NetInfo → TanStack Query) ────────────────── */

let bridgeRefs = 0;
let bridgeUnsubscribe: (() => void) | null = null;

function syncOnline(s: NetInfoState) {
  onlineManager.setOnline(s.isConnected !== false && s.isInternetReachable !== false);
}

/**
 * Wires NetInfo into TanStack Query's onlineManager for as long as the
 * caller is mounted. <NetworkBanner/> mounts this; the lead may also mount
 * it standalone at the root. Idempotent across remounts (ref-counted).
 */
export function useOnlineManagerBridge(): void {
  useEffect(() => {
    bridgeRefs += 1;
    if (!bridgeUnsubscribe) {
      bridgeUnsubscribe = addNetInfoListener(syncOnline);
      fetchNetInfoState()
        .then(syncOnline)
        .catch(() => undefined);
    }
    return () => {
      bridgeRefs -= 1;
      if (bridgeRefs <= 0 && bridgeUnsubscribe) {
        bridgeUnsubscribe();
        bridgeUnsubscribe = null;
        bridgeRefs = 0;
      }
    };
  }, []);
}

/* ── NetworkBanner ───────────────────────────────────────────────────── */

const EASE = Easing.bezier(heronEase[0], heronEase[1], heronEase[2], heronEase[3]);
const ENTER_MS = 220;
const EXIT_MS = 180;
/** How long «عاد الاتصال» stays up before exiting. */
const BACK_FLASH_MS = 2400;

type BannerPhase = "hidden" | "offline" | "back";

/**
 * The thin connectivity banner — mount ONCE at the app root (inside
 * SafeAreaProvider). Self-subscribing; nothing to pass. Enter/exit is
 * transform/opacity only; reduced-motion shows/hides without animation.
 *
 * R334 A-cleanup — the phase/mount bookkeeping no longer sets state
 * synchronously inside effects (react-hooks/set-state-in-effect): the
 * banner subscribes to NetInfo itself and derives every visible
 * transition from the external-system callback, and the only timed
 * state changes ride async callbacks (setTimeout / Animated completion).
 */
export function NetworkBanner() {
  useOnlineManagerBridge();
  const reduced = useReduceMotion();
  const tones = useStatusTones();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<BannerPhase>("hidden");
  // Stays mounted while the exit animation runs (the Animated completion
  // callback clears it) — the boot.tsx enter/exit pattern.
  const [exiting, setExiting] = useState(false);
  const [v] = useState(() => new Animated.Value(0));

  // Phase follows the resolved connectivity line only (never the
  // optimistic pre-resolve default): offline → banner; offline→online →
  // «عاد الاتصال» flash then exit; anything else → hidden. Transitions
  // are observed in the NetInfo subscription callback (setState there
  // is the blessed external-system pattern — never synchronous in the
  // effect body).
  useEffect(() => {
    let was: boolean | null = null;
    const apply = (s: NetInfoState) => {
      const online = s.isConnected !== false && s.isInternetReachable !== false;
      if (was === null) {
        // First resolved reading: no transition to celebrate — only go
        // offline-honest if actually offline.
        was = online;
        setPhase(online ? "hidden" : "offline");
        return;
      }
      if (online === was) return;
      was = online;
      setPhase(online ? "back" : "offline");
    };
    const unsubscribe = addNetInfoListener(apply);
    fetchNetInfoState()
      .then(apply)
      .catch(() => undefined);
    return () => unsubscribe();
  }, []);

  // «عاد الاتصال» stays up for BACK_FLASH_MS, then hides and rides the
  // exit animation (both setStates live in the timer callback — async).
  useEffect(() => {
    if (phase !== "back") return;
    const t = setTimeout(() => {
      setPhase("hidden");
      setExiting(true);
    }, BACK_FLASH_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const show = phase !== "hidden";
  const mounted = show || exiting;

  // Enter/exit animation — opacity + translateY only. Mounting is
  // derived from `show` (immediate); the exit-unmount lands in the
  // Animated completion callback. Reduced motion collapses the exit to
  // a 0ms timing so the same async path hides it statically.
  useEffect(() => {
    if (show) {
      if (reduced) {
        v.setValue(1);
        return;
      }
      Animated.timing(v, { toValue: 1, duration: ENTER_MS, easing: EASE, useNativeDriver: true }).start();
      return;
    }
    if (!exiting) return;
    Animated.timing(v, {
      toValue: 0,
      duration: reduced ? 0 : EXIT_MS,
      easing: EASE,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setExiting(false);
    });
  }, [show, exiting, reduced, v]);

  if (!mounted) return null;

  const offline = phase === "offline";
  const tone = offline ? tones.yellow : tones.mint;
  const a11yLabel = offline ? "لا يوجد اتصال بالإنترنت" : "عاد الاتصال";
  const label = offline
    ? "لا يوجد اتصال بالإنترنت — سيتم إعادة المحاولة تلقائيًا"
    : "عاد الاتصال";

  const animated = reduced
    ? { opacity: 1, transform: [{ translateY: 0 }] }
    : {
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
        ],
      };

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={a11yLabel}
      style={[
        {
          paddingTop: insets.top,
          backgroundColor: tone.bg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tone.ink,
        },
        animated,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: sp[8],
          paddingVertical: 6,
          paddingHorizontal: sp[16],
          minHeight: 36,
        }}
      >
        {offline ? <WifiOff size={14} color={tone.deep} /> : <Wifi size={14} color={tone.deep} />}
        <T variant="sm" style={{ color: tone.deep }}>
          {label}
        </T>
      </View>
    </Animated.View>
  );
}
