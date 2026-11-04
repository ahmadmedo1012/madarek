/**
 * Biometric app-lock — the one C3 native feature that had no seat.
 *
 * Honest scope (v1): a cold-start gate. When the user enables
 * «قفل التطبيق» in settings, the next cold starts require
 * Face/fingerprint (with the device PIN as fallback — never lock the
 * owner out of their own phone) before ANY session data renders.
 * Re-locking on backgrounding is deliberately NOT v1 — the OS already
 * gates the app switcher snapshot on Android (FLAG_SECURE is a
 * separate, later decision) and iOS screenshots the last frame
 * regardless.
 *
 * Web: hasHardwareAsync is false — the whole feature is a no-op there
 * (the settings row never renders).
 */
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import Fingerprint from "lucide-react-native/icons/fingerprint-pattern";
import Lock from "lucide-react-native/icons/lock";
import * as SecureStore from "expo-secure-store";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { haptics } from "@/haptics";

const LOCK_FLAG = "mdrk-biometric-lock";

/** Hardware present AND a biometric enrolled — the honest availability. */
export async function biometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(LOCK_FLAG)) === "1";
  } catch {
    return false;
  }
}

export async function setBiometricLockEnabled(v: boolean): Promise<void> {
  try {
    if (v) await SecureStore.setItemAsync(LOCK_FLAG, "1");
    else await SecureStore.deleteItemAsync(LOCK_FLAG);
  } catch {
    // SecureStore failures must never brick the lock state — worst case
    // the toggle doesn't persist and the next cold start is unlocked.
  }
}

/** One authentication attempt (device PIN fallback allowed). */
export async function authenticate(reason = "افتح مدارك لعرض حسابك"): Promise<boolean> {
  try {
    // A quiet tick as the native prompt appears — the haptics foundation
    // owns the gate/throttle; web and reduced settings no-op safely.
    haptics.selection();
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: "استخدم رمز الجهاز",
      cancelLabel: "إلغاء",
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}

/**
 * BiometricGate — cold-start lock sheet. Renders children only when the
 * lock is off (default) or the user has authenticated this run.
 */
export function BiometricGate({ children }: { children: ReactNode }) {
  const p = usePalette();
  // null = still checking the flag; false = unlocked; true = locked.
  const [locked, setLocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const enabled = await getBiometricLockEnabled();
      if (!alive) return;
      if (!enabled) {
        setLocked(false);
        return;
      }
      const ok = await biometricAvailable();
      if (!alive) return;
      if (!ok) {
        // Hardware/enrollment vanished since the flag was set (biometrics
        // removed in OS settings) — the lock would be a brick, not a gate.
        await setBiometricLockEnabled(false);
        setLocked(false);
        return;
      }
      setLocked(true);
      setBusy(true);
      const authed = await authenticate();
      if (!alive) return;
      setBusy(false);
      if (authed) setLocked(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (locked === null || locked === false) return <>{children}</>;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg, justifyContent: "center" }}>
      <View style={{ alignItems: "center", gap: sp[12], paddingVertical: sp[24] }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderWidth: 2,
            borderColor: p.rule,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Fingerprint size={30} color={p.accent} />
        </View>
        <T variant="h4" weight="bold" align="center">
          مدارك مقفلة
        </T>
        <T variant="body" color="muted" align="center" style={{ paddingHorizontal: sp[24] }}>
          {busy
            ? "بانتظار بصمتك…"
            : "لم تُفتح بعد — اضغط «فتح القفل» للمحاولة مرة أخرى."}
        </T>
        {!busy ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="فتح القفل بالبصمة أو رمز الجهاز"
              onPress={() => {
                setBusy(true);
                void authenticate().then((ok) => {
                  setBusy(false);
                  if (ok) setLocked(false);
                });
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: sp[8],
                minHeight: 48,
                paddingHorizontal: sp[20],
                backgroundColor: p.primary,
              }}
            >
              <Lock size={16} color={p.primaryFg} />
              <T variant="body" weight="bold" style={{ color: p.primaryFg }}>
                فتح القفل
              </T>
            </Pressable>
            <T variant="xs" color="faint" align="center" style={{ paddingHorizontal: sp[24] }}>
              تعمل البصمة أو رمز قفل الجهاز — لن تُحبس خارج حسابك أبدًا.
            </T>
          </>
        ) : null}
      </View>
    </View>
  );
}
