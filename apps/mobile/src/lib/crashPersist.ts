/**
 * crashPersist.ts — R349 M1.5 · the previous-session crash, persisted
 * and surfaced after relaunch.
 *
 * THE GAP (measured on main@15fb3b48): `reportClientError` is a
 * fire-and-forget POST. When the process DIES (SIGABRT — exactly the
 * owner's iOS crash), the fetch races death and usually loses; the
 * report vanishes, and nothing on the next launch says a word.
 *
 * Two nets, both honest about RN's limits (no synchronous disk write
 * exists in JS-RN; every crash SDK faces this):
 *
 * 1. THE UNCLEAN-EXIT SENTINEL — a tiny record in AsyncStorage:
 *      { active: true, at, route }   written when a session starts,
 *      { active: false }             written when the app backgrounds
 *                                    (the only clean way a session ends
 *                                    on iOS/Android short of an explicit
 *                                    quit, which Android never delivers).
 *    On the NEXT launch, `active === true` means the previous session
 *    never reached a clean background — it died. We synthesize a
 *    `kind: "crash"` report ("انتهت الجلسة السابقة بشكل غير متوقع",
 *    last route + timestamp) and send it. This catches native deaths
 *    (the UI-runtime abort class) that no JS handler can see.
 *
 * 2. THE PENDING QUEUE — reports whose POST failed (offline, death
 *    race) are persisted; the next launch drains them first.
 *
 * Surfacing: after collection, a toast tells the user the previous
 * session ended unexpectedly and a report was sent (the in-app
 * «الإبلاغ عن مشكلة» route stays the human-facing channel).
 *
 * All storage ops are defensive — telemetry must never throw, never
 * block boot, and never loop (the drain uses the no-persist send path).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { reportClientError, getTelemetryRoute } from "./telemetry";
import { toast } from "@/components/ui/toast";

const SENTINEL_KEY = "madarek.crash.sentinel";
const QUEUE_KEY = "madarek.crash.pending";
const QUEUE_MAX = 20;

interface Sentinel {
  active: boolean;
  at: string;
  route?: string;
}

let started = false;

async function readSentinel(): Promise<Sentinel | null> {
  try {
    const raw = await AsyncStorage.getItem(SENTINEL_KEY);
    return raw ? (JSON.parse(raw) as Sentinel) : null;
  } catch {
    return null;
  }
}

async function writeSentinel(s: Sentinel): Promise<void> {
  try {
    await AsyncStorage.setItem(SENTINEL_KEY, JSON.stringify(s));
  } catch {
    /* never */
  }
}

interface PendingReport {
  kind: "crash" | "js_error" | "unhandled_rejection" | "api_error" | "render";
  message: string;
  stack?: string | null;
  route?: string;
  queuedAt: string;
}

async function readQueue(): Promise<PendingReport[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const q = raw ? (JSON.parse(raw) as PendingReport[]) : [];
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: PendingReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(0, QUEUE_MAX)));
  } catch {
    /* never */
  }
}

/** Enqueue a report that failed to send (called by telemetry's catch). */
export async function enqueuePendingReport(r: PendingReport): Promise<void> {
  const q = await readQueue();
  q.push(r);
  await writeQueue(q);
}

/** Update the sentinel's route as the user navigates (cheap, fire-and-forget). */
export async function touchSentinelRoute(): Promise<void> {
  const s = await readSentinel();
  if (s?.active) await writeSentinel({ ...s, route: getTelemetryRoute() });
}

/**
 * Boot-time collection. Idempotent (module guard). Sends:
 *   · a synthesized crash report when the previous session ended
 *     uncleanly,
 *   · every queued report that never made it.
 * Then arms the new session's sentinel + the AppState listener that
 * marks clean exits, and toasts the user when a previous crash was
 * collected.
 */
export async function initCrashPersistence(): Promise<void> {
  if (started) return;
  started = true;

  let previousCrash: Sentinel | null = null;
  try {
    previousCrash = await readSentinel();
  } catch {
    previousCrash = null;
  }

  // 1. The previous session's verdict.
  if (previousCrash?.active) {
    // It never reached a clean background — it died.
    void reportClientError({
      kind: "crash",
      message: `previous session ended unexpectedly (started ${previousCrash.at}, last route ${previousCrash.route ?? "unknown"})`,
      route: previousCrash.route,
    });
    toast.error(
      "حدث خطأ غير متوقع في الجلسة السابقة",
      "أُرسِل تقرير المشكلة تلقائيًا — شكرًا لصبرك",
    );
  }

  // 2. Drain whatever never made it (uses the no-requeue send path via
  //    telemetry's own rate limiter; failures here are dropped — the
  //    queue is bounded and stale reports age out by QUEUE_MAX).
  try {
    const q = await readQueue();
    if (q.length > 0) {
      await writeQueue([]);
      for (const r of q) {
        void reportClientError({
          kind: r.kind,
          message: `[queued ${r.queuedAt}] ${r.message}`,
          stack: r.stack,
          route: r.route,
        });
      }
    }
  } catch {
    /* never */
  }

  // 3. Arm THIS session's sentinel and the clean-exit listener.
  await writeSentinel({ active: true, at: new Date().toISOString(), route: getTelemetryRoute() });
  try {
    AppState.addEventListener("change", (state) => {
      if (state === "background") {
        // The app went to the background alive — a clean exit point.
        void writeSentinel({ active: false, at: new Date().toISOString() });
      } else if (state === "active") {
        // Returned to the foreground — re-arm for the next backgrounding.
        void writeSentinel({ active: true, at: new Date().toISOString(), route: getTelemetryRoute() });
      }
    });
  } catch {
    /* never */
  }
}
