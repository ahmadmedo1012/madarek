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
import { useEffect, useRef, useState } from "react";
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
 */
export function NetworkBanner() {
  const { isOnline, isResolved } = useNetworkStatus();
  useOnlineManagerBridge();
  const reduced = useReduceMotion();
  const tones = useStatusTones();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<BannerPhase>("hidden");
  // Stays mounted while the exit animation runs (the Animated completion
  // callback unmounts) — the boot.tsx enter/exit pattern.
  const [mounted, setMounted] = useState(false);
  const [v] = useState(() => new Animated.Value(0));

  // Phase follows the resolved connectivity line only (never the
  // optimistic pre-resolve default): offline → banner; offline→online →
  // «عاد الاتصال» flash then exit; anything else → hidden.
  const prevOnline = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isResolved) return;
    const was = prevOnline.current;
    prevOnline.current = isOnline;
    if (!isOnline) {
      setPhase("offline");
      return;
    }
    if (was === false) {
      setPhase("back");
      const t = setTimeout(() => setPhase("hidden"), BACK_FLASH_MS);
      return () => clearTimeout(t);
    }
    setPhase("hidden");
  }, [isOnline, isResolved]);

  // Enter/exit animation — opacity + translateY only.
  useEffect(() => {
    if (phase === "hidden") {
      if (!mounted) return;
      if (reduced) {
        setMounted(false);
        return;
      }
      Animated.timing(v, { toValue: 0, duration: EXIT_MS, easing: EASE, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
      return;
    }
    setMounted(true);
    if (reduced) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: ENTER_MS, easing: EASE, useNativeDriver: true }).start();
  }, [phase, mounted, reduced, v]);

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
