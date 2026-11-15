/**
 * push.tsx — R353 Lane N — the mobile push client.
 *
 * The contract (the M2.6 registration's client half):
 *  · permission is requested ONLY from a value-shown moment (the alerts
 *    screen's «تفعيل الإشعارات» affordance / settings row) — never at
 *    first open;
 *  · the Android channel seats exist BEFORE the permission ask (Android
 *    8+ requires an existing channel or pushes arrive silent/invisible);
 *  · once granted, the Expo token registers on POST /me/push-devices
 *    (re-registration is idempotent — the upsert re-owns the row); a
 *    failed registration is RETURNED, never swallowed — the activation
 *    card renders the honest retry line;
 *  · a notification tap deep-links into the app (payload.data.link —
 *    the same in-app paths the notification row carries): a cold-start
 *    launch parks the link for the entry routers, a warm tap routes
 *    directly when logged in and parks when not (the login success path
 *    consumes it) — the auth guard always wins;
 *  · foreground arrivals present an alert + sound + badge; the badge
 *    clears when the inbox opens (and again on foreground if it was
 *    seen) — the backend sends badge:1 per push;
 *  · logout unregisters (a handed-over phone must not keep pushing).
 *
 * Everything is best-effort at the BOOT level: a push failure never
 * touches the app's core flows. The REST inbox (useNotifications)
 * remains the surface of record — the push is the tap on the shoulder.
 */
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { get, post, del } from "@/api/client";
import { useSession } from "@/auth/session";
import { safeDeepLink } from "@/hooks/useNotifications";

/** The Android channel seats (id, importance) — Heron: one honest bell. */
export const CHANNEL_ALERTS = "alerts";
export const CHANNEL_DEFAULT = "default";

/**
 * WHY the channels are created explicitly (R353): on Android 8+ every
 * push routes through a channel. If the FIRST incoming message has to
 * auto-create one, the OS bakes in whatever that message carries — often
 * no importance, no sound, no vibration: silent, invisible pushes. With
 * no FCM credentials on the Expo project yet (androidFcm: null), the
 * auto-created seat would be wrong exactly when real delivery starts.
 * Creating both seats up front — before the permission ask, long before
 * the first message — pins «alerts» to HIGH + sound + vibration and
 * keeps a DEFAULT fallback for anything sent unchannelled.
 */
async function createAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Promise.allSettled([
    // The primary seat — urgent rows (grades, announcements) ring and heads-up.
    Notifications.setNotificationChannelAsync(CHANNEL_ALERTS, {
      name: "التنبيهات",
      importance: AndroidImportance.HIGH,
      sound: "default", // the TS-typed form of "sound: true"
      vibrationPattern: [0, 250, 250, 250],
      // PUBLIC = the alert is fully visible on the lockscreen (the typed
      // enum; AndroidImportance.HIGH is not a valid lockscreenVisibility).
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    }),
    // The fallback seat — anything the backend sends unchannelled lands
    // here with honest DEFAULT importance instead of an OS guess.
    Notifications.setNotificationChannelAsync(CHANNEL_DEFAULT, {
      name: "إشعارات عامة",
      importance: AndroidImportance.DEFAULT,
      bypassDnd: false,
    }),
  ]);
}

let runtimePromise: Promise<void> | null = null;

/**
 * Configure the foreground presentation + the Android channels.
 * Idempotent; returns the SAME promise so every caller awaits one flight.
 */
export function ensurePushRuntime(): Promise<void> {
  if (!runtimePromise) {
    // Foreground arrivals present as alerts WITH sound and set the badge
    // (R353: the previous handler muted the sound — a foreground grade
    // push was a silent heads-up, which reads as "nothing happened").
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    runtimePromise = createAndroidChannels().catch(() => undefined);
  }
  return runtimePromise;
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
 * The honest outcome of the activation flow. `registered` is true ONLY
 * when a token was taken AND the backend registration POST succeeded —
 * every other ending (no token possible yet, POST refused) surfaces as
 * a retryable false so the UI can say so instead of swallowing it.
 */
export interface PushRegistrationResult {
  state: PushPermissionState;
  registered: boolean;
}

/**
 * The value-shown request flow (call from a user gesture ONLY — the
 * single requestPermissionsAsync call site in the app):
 * channels FIRST → ask → on grant, take the Expo token → register on
 * /me/push-devices.
 */
export async function requestAndRegisterPush(): Promise<PushRegistrationResult> {
  // Channels BEFORE the OS prompt: Android 8+ needs the seat to exist
  // before the first message, and the ask is the first value-shown
  // moment where a user-visible ordering exists at all.
  await ensurePushRuntime();
  let state: PushPermissionState;
  try {
    const settings = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    state = settings.granted
      ? "granted"
      : settings.canAskAgain === false
        ? "denied"
        : "undetermined";
  } catch {
    // The ask itself failed (no native runtime / remote push unset) —
    // report the CURRENT truth, never a fake grant.
    return { state: await currentPermission(), registered: false };
  }
  if (state !== "granted") return { state, registered: false };

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId ?? undefined,
      })
    ).data;
    if (!token || token.length < 20) {
      // Tokenless seat (simulator today; Android until the Expo project
      // has FCM credentials) — honest retryable failure, not a grant.
      return { state: "granted", registered: false };
    }
    await post("/me/push-devices", {
      expoToken: token,
      platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : "WEB",
      appVersion: Constants.expoConfig?.version ?? undefined,
    });
    return { state: "granted", registered: true };
  } catch {
    // R353: the registration POST / token mint failed — RETURNED as a
    // retryable outcome. The activation card renders the retry line;
    // this path must never masquerade as success.
    return { state: "granted", registered: false };
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
    /* best-effort background path — no user gesture to report to; the
       activation card remains the honest failure seat (R353). */
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

/* ── deep links: the link rides payload.data.link, always behind the
      auth guard — a logged-out tap waits for the login success path ── */

/** A parked, safe, in-app path waiting for an authenticated session. */
let pendingDeepLink: string | null = null;
/** One flight: the launch (cold-start) notification response read. */
let launchRead: Promise<void> | null = null;

function responseLink(
  response: Notifications.NotificationResponse | null,
): string | null {
  const link = response?.notification.request.content.data?.link;
  return typeof link === "string" ? safeDeepLink(link) : null;
}

/**
 * Cold start: the notification that LAUNCHED the app (if any). The link
 * is always PARKED — the entry routers consume it (app/index.tsx for a
 * cached session, app/auth/login.tsx for a fresh login) through
 * resolveEntryDestination, so the auth + institution guards stay intact.
 */
function readLaunchResponse(): Promise<void> {
  if (!launchRead) {
    launchRead = Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const link = responseLink(response);
        if (link) pendingDeepLink = link;
      })
      .catch(() => undefined);
  }
  return launchRead;
}

/** Park a link for the login success path (a tap while logged out). */
export function parkDeepLink(link: string): void {
  const safe = safeDeepLink(link);
  if (safe) pendingDeepLink = safe;
}

/**
 * ONE-SHOT consumption: the parked deep link (launch or logged-out tap).
 * Awaits the launch read first, so the entry router's decision is never
 * raced by the cold-start response arriving late. Returns null forever
 * after the first take.
 */
export async function takePendingDeepLink(): Promise<string | null> {
  await readLaunchResponse();
  const link = pendingDeepLink;
  pendingDeepLink = null;
  return link;
}

/* ── badge: the backend sends badge:1 per push; the inbox is the eraser ── */

let inboxSeen = false;

function clearBadge(): Promise<void> {
  return Notifications.setBadgeCountAsync(0)
    .then(() => undefined)
    .catch(() => undefined);
}

/** Call when the notifications inbox OPENS (any role's alerts screen). */
export function markInboxOpened(): void {
  inboxSeen = true;
  void clearBadge();
}

/**
 * PushRegistrar — mounts ONCE in the root layout:
 *  · boot: channels + foreground handler + the launch deep-link read
 *    (NO permission ask — the ask lives in the value-shown seats only)
 *  · session: silent re-registration when permission is already granted
 *  · taps: warm → route/park; cold start → parked for the entry routers
 *  · badge: cleared on foreground when the inbox was seen this session
 */
export function PushRegistrar(): null {
  const user = useSession((s) => s.user);
  const sessionEpoch = useSession((s) => s.sessionEpoch);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    void ensurePushRuntime();
    void readLaunchResponse();

    // Warm tap (the app is running): logged in → straight to the route;
    // logged out → parked; the login success path consumes it after the
    // auth guard resolves.
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = responseLink(response);
      if (!link) return;
      if (useSession.getState().user) router.push(link as never);
      else parkDeepLink(link);
    });

    // Foreground arrival: the backend sends badge:1 per push.
    const foreSub = Notifications.addNotificationReceivedListener(() => {
      void Notifications.setBadgeCountAsync(1).catch(() => undefined);
    });

    // Foreground return: keep the badge honest if the inbox was seen.
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active" && inboxSeen) void clearBadge();
    });

    return () => {
      tapSub.remove();
      foreSub.remove();
      appStateSub.remove();
    };
  }, []);

  const userId = user?.id;
  useEffect(() => {
    // registerIfGranted is module-level — the id IS the dependency that
    // matters (object identity would re-fire on every profile refetch).
    if (userId) void registerIfGranted();
  }, [userId, sessionEpoch]);

  return null;
}
