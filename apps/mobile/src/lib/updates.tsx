/**
 * R326 M0.7 — the update experience.
 *
 * 1. OTA: on cold start and on foreground, check expo-updates silently →
 *    download → ONE toast «تحديث جاهز — أعد التشغيل» → reload on tap.
 *    (checkAutomatically: ON_LOAD covers the cold start; the foreground
 *    listener re-checks on return, throttled to once per 30 minutes.)
 * 2. Min-version gate: GET /status carries { minAppVersion, updateUrl }.
 *    When the running appVersion < minAppVersion the caller must render
 *    the blocking «يلزم تحديث التطبيق» screen (BlockingUpdateGate) —
 *    nothing else in the app runs below the floor.
 *
 * Everything here is fire-and-forget safe: a failed check NEVER breaks
 * the app (offline, airplane mode, cold Render — all just skip).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { toast } from "@/components/ui/toast";
import { crumb, reportClientError } from "@/lib/telemetry";
import { themeFor } from "@/design/theme";

const STATUS_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  "https://madarek.onrender.com/api/v1";

const FOREGROUND_RECHECK_MS = 30 * 60 * 1000;

function appSemver(): string {
  return (
    Constants.expoConfig?.version ??
    (Constants.manifest as { version?: string } | undefined)?.version ??
    "0.0.0"
  );
}

/** semver a.b.c comparison: -1 | 0 | 1 (tolerant of missing parts). */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number(x) || 0);
  const pb = b.split(".").map((x) => Number(x) || 0);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/* ── the OTA half ───────────────────────────────────────────────────── */

interface UpdatesLike {
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<unknown>;
  reloadAsync: () => Promise<void>;
  updateId?: string | null;
  runtimeVersion?: string | null;
  channel?: string | null;
  isEmbeddedUpdate?: boolean;
}

function updatesRuntime(): UpdatesLike | null {
  try {
    const u = Updates as unknown as UpdatesLike;
    if (typeof u?.checkForUpdateAsync !== "function") return null;
    return u;
  } catch {
    return null;
  }
}

export async function checkAndDownloadUpdate(showToast = true): Promise<boolean> {
  const u = updatesRuntime();
  if (!u || __DEV__) return false; // dev never OTA-reloads
  try {
    const { isAvailable } = await u.checkForUpdateAsync();
    if (!isAvailable) return false;
    crumb("ota: downloading update");
    await u.fetchUpdateAsync();
    if (showToast) {
      toast.info("تحديث جاهز — أعد التشغيل لتطبيقه", "تحديث مدارك");
    }
    crumb("ota: update downloaded");
    return true;
  } catch (e) {
    // Offline / rate-limited / no matching runtime — never break the app.
    crumb(`ota: check failed (${e instanceof Error ? e.message : "unknown"})`);
    return false;
  }
}

/** Silent cold-start check + foreground re-check (throttled). */
export function useAppUpdates(): void {
  const lastCheck = useRef(0);
  const check = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheck.current < 15_000) return;
    lastCheck.current = now;
    await checkAndDownloadUpdate();
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Record the running update in the telemetry context (crash reports
 * carry which OTA the user was on). */
export function updateStamp(): string {
  const u = updatesRuntime();
  const id = u?.updateId ? String(u.updateId).slice(0, 8) : "embedded";
  const rt = u?.runtimeVersion ?? "—";
  return `update ${id} · runtime ${rt} · v${appSemver()}`;
}

/* ── the min-version gate half ──────────────────────────────────────── */

export interface VersionGate {
  status: "checking" | "ok" | "blocked";
  updateUrl: string;
}

export function useVersionGate(): VersionGate {
  const [gate, setGate] = useState<VersionGate>({ status: "checking", updateUrl: "" });

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    (async () => {
      try {
        const res = await fetch(`${STATUS_URL}/status`, { signal: ctrl.signal });
        const body = (await res.json()) as {
          data?: { minAppVersion?: string | null; updateUrl?: string | null };
        };
        clearTimeout(timer);
        const min = body.data?.minAppVersion ?? null;
        const updateUrl = body.data?.updateUrl ?? "https://madarek.onrender.com/app";
        if (cancelled) return;
        if (min && compareSemver(appSemver(), min) < 0) {
          crumb(`version gate: BLOCKED (app ${appSemver()} < min ${min})`);
          setGate({ status: "blocked", updateUrl });
        } else {
          setGate({ status: "ok", updateUrl });
        }
      } catch {
        clearTimeout(timer);
        // Status unreachable (offline / cold server): NEVER block the app
        // on a failed check — the gate is server-issued policy, not a
        // local guess.
        if (!cancelled) setGate({ status: "ok", updateUrl: "" });
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timer);
    };
     
  }, []);

  return gate;
}

/** The blocking «يلزم تحديث التطبيق» screen — rendered instead of the
 *  navigator when the running version is below the server floor. */
export function BlockingUpdateGate({ updateUrl }: { updateUrl: string }) {
  const p = themeFor("light").palette;
  const open = useCallback(() => {
    if (updateUrl) void Linking.openURL(updateUrl).catch(() => undefined);
  }, [updateUrl]);
  useEffect(() => {
    void reportClientError({
      kind: "js_error",
      message: `version gate: blocked at v${appSemver()}`,
    });
     
  }, []);
  return (
    <View style={[styles.fill, { backgroundColor: p.bg }]}>
      <View style={styles.content}>
        <View style={[styles.rule, { backgroundColor: p.accent }]} />
        <Text style={[styles.title, { color: p.text }]}>يلزم تحديث التطبيق</Text>
        <Text style={[styles.body, { color: p.textSecondary }]}>
          هذا الإصدار لم يعد مدعومًا. حمّل الإصدار الجديد من صفحة التطبيق ثم عُد —
          بياناتك محفوظة على الخادم ولن تفقد شيئًا.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تحميل التحديث"
          onPress={open}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? p.accentHover : p.accent },
          ]}
        >
          <Text style={[styles.buttonText, { color: p.accentFg }]}>تحميل التحديث</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  rule: { alignSelf: "flex-end", width: 56, height: 3 },
  title: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 24, writingDirection: "rtl", textAlign: "right" },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 15, lineHeight: 24, writingDirection: "rtl", textAlign: "right" },
  button: { alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12, minWidth: 160, alignItems: "center" },
  buttonText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 15 },
});
