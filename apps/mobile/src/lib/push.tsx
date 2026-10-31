/**
 * push.tsx — R327 C3 — the mobile push client.
 *
 * The contract (the M2.6 registration's client half):
 *  · permission is requested ONLY from a value-shown moment (the alerts
 *    screen's «تفعيل الإشعارات» affordance / settings row) — never at
 *    first open;
 *  · once granted, the Expo token registers on POST /me/push-devices
 *    (re-registration is idempotent — the upsert re-owns the row);
 *  · Android channels: «alerts» (high importance) — configured at boot;
 *  · a notification tap deep-links into the app (payload.data.link —
 *    the same madarek:// routes the notification row carries);
 *  · foreground arrivals bump the badge; logout unregisters (a handed-
 *    -over phone must not keep pushing).
 *
 * Everything is best-effort: a push failure NEVER touches the app's
 * core flows. The REST inbox (useNotifications) remains the surface of
 * record — the push is the tap on the shoulder.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { get, post, del } from "@/api/client";
import { useSession } from "@/auth/session";

/** The Android channels (id, importance, name) — Heron: one honest bell. */
export const CHANNEL_ALERTS = "alerts";

let channelsReady = false;

/** Configure Android channels + the foreground presentation. Idempotent. */
export function ensurePushRuntime(): void {
  if (channelsReady) return;
  channelsReady = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false, // urgent rows ring server-side only
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(CHANNEL_ALERTS, {
      name: "الإشعارات",
      importance: AndroidImportance.HIGH,
      sound: "default",
      bypassDnd: false,
    }).catch(() => undefined);
  }
}

export type PushPermissionState = "granted" | "denied" | "undetermined" | "unavailable";

/** The CURRENT permission without prompting (for UI affordances). */
export async function currentPermission(): Promise<PushPermissionState> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return "granted";
    if (settings.canAskAgain === false) return "denied";
    return "undetermined";
  } catch {
    return "unavailable";
  }
}

/**
 * The value-shown request flow (call from a user gesture ONLY):
 * ask → on grant, take the Expo token → register on /me/push-devices.
 * Returns the resulting permission state.
 */
export async function requestAndRegisterPush(): Promise<PushPermissionState> {
  ensurePushRuntime();
  try {
    const settings = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    if (!settings.granted) return settings.canAskAgain === false ? "denied" : "undetermined";

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId ?? undefined,
      })
    ).data;
    if (!token || token.length < 20) return "granted"; // tokenless (simulator) — permission still true

    await post("/me/push-devices", {
      expoToken: token,
      platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
      appVersion: Constants.expoConfig?.version ?? undefined,
    });
    return "granted";
  } catch {
    // Never throw into a button press — the inbox still works.
    return currentPermission().catch(() => "unavailable" as PushPermissionState);
  }
}

/** Silent re-registration for an ALREADY-granted session (boot + login). */
async function registerIfGranted(): Promise<void> {
  try {
    if ((await currentPermission()) !== "granted") return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (!token || token.length < 20) return;
    await post("/me/push-devices", {
      expoToken: token,
      platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
      appVersion: Constants.expoConfig?.version ?? undefined,
    });
  } catch {
    /* best-effort */
  }
}

/** Best-effort unregister — call during logout (a handed-over phone). */
export async function unregisterPushDevices(): Promise<void> {
  try {
    const res = await get<{ id: string }[]>("/me/push-devices");
    const devices = Array.isArray(res) ? res : ((res as { data?: { id: string }[] })?.data ?? []);
    await Promise.allSettled(devices.map((d) => del(`/me/push-devices/${d.id}`)));
  } catch {
    /* best-effort */
  }
}

/**
 * PushRegistrar — mounts ONCE in the root layout:
 *  · boot: channels + foreground handler + tap → deep link
 *  · session: silent re-registration when permission already granted
 */
export function PushRegistrar(): null {
  const user = useSession((s) => s.user);
  const sessionEpoch = useSession((s) => s.sessionEpoch);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    ensurePushRuntime();

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link;
      if (typeof link === "string" && link.startsWith("/")) {
        router.push(link as never);
      }
    });
    const foreSub = Notifications.addNotificationReceivedListener(() => {
      void Notifications.setBadgeCountAsync(1).catch(() => undefined);
    });
    return () => {
      tapSub.remove();
      foreSub.remove();
    };
  }, []);

  useEffect(() => {
    if (user) void registerIfGranted();
  }, [user?.id, sessionEpoch]);

  return null;
}
