/**
 * serverWake — the cold-start truth signal (r280).
 *
 * Render's free tier spins the backend down after idle traffic; the
 * first request after a cold boot can hang for tens of seconds before
 * the instance answers (or the 20s axios timeout errors). Until this
 * module the UI was silent through that window — skeletons forever,
 * no cue, no expectation-setting. The wake contract:
 *
 *   - `api`'s request interceptor opens a tracked request
 *     (`wakeRequestStart(id)`); BOTH response interceptors settle it
 *     (`wakeRequestSettle(id)`) — success, refusal, network fault, and
 *     the 401-refresh retry (the retry re-enters the request
 *     interceptor and opens a fresh id).
 *   - the app is "slow-pending" when ANY tracked request has been
 *     in-flight ≥ SLOW_AFTER_MS (4s — well past a warm round-trip,
 *     well before the 20s timeout).
 *   - subscribers (AppShell's ServerWakePill) hear the flip and render
 *     the honest «الخادم يستيقظ…» moment — the mk-ill `server-waking`
 *     piece + BrandLoader, per the Agent I wiring guide §5.
 *
 * Deliberately NOT a health-probe: a probe adds a request exactly when
 * the server is slowest; the truth we have (request age) is the truth
 * the user experiences.
 */
const SLOW_AFTER_MS = 4000;
const CHECK_EVERY_MS = 1000;

type WakeListener = (slow: boolean) => void;

const starts = new Map<number, number>();
const listeners = new Set<WakeListener>();
let timer: ReturnType<typeof setInterval> | null = null;
let slow = false;

function oldestAge(): number {
  let oldest = Infinity;
  for (const ts of starts.values()) if (ts < oldest) oldest = ts;
  return oldest === Infinity ? -1 : Date.now() - oldest;
}

function recompute() {
  const next = starts.size > 0 && oldestAge() >= SLOW_AFTER_MS;
  if (next !== slow) {
    slow = next;
    for (const l of listeners) l(slow);
  }
}

export function wakeRequestStart(id: number, ts = Date.now()) {
  starts.set(id, ts);
  if (timer === null) {
    timer = setInterval(recompute, CHECK_EVERY_MS);
    // A request older than the threshold opening the tracker (the
    // axios timeout is 20s; ids are minted fresh per request, so this
    // is belt-and-braces) should not wait a full tick to flip.
    recompute();
  }
}

export function wakeRequestSettle(id: number | undefined) {
  if (id !== undefined) starts.delete(id);
  if (starts.size === 0 && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  recompute();
}

export function subscribeServerWake(listener: WakeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isServerSlow(): boolean {
  return slow;
}
