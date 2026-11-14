/**
 * R351 X2b — run a promise AFTER the response is sent.
 *
 * On Vercel, work started after the response completes only survives
 * if it is registered with `waitUntil` from @vercel/functions (a tiny,
 * dependency-free package — NOT the heavy @vercel/node builder). On
 * every other runtime (local, Render) a plain fire-and-forget is the
 * same behaviour the platform already had.
 *
 * The import is lazy + cached + fallible: @vercel/functions resolves
 * on the Vercel runtime; anywhere else it may not exist, and that must
 * never break the app (the outbox drain is latency-tolerant by design —
 * correctness rides nextAttemptAt + the tick slots, never this helper).
 */
type WaitUntil = (promise: Promise<unknown>) => void;

let cached: WaitUntil | null | undefined;

async function resolveWaitUntil(): Promise<WaitUntil | null> {
  if (cached !== undefined) return cached;
  try {
    const mod = (await import('@vercel/functions')) as { waitUntil?: WaitUntil };
    cached = typeof mod.waitUntil === 'function' ? mod.waitUntil : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Register post-response work; the promise must never reject (swallowed
 *  here — callers keep their own error logging). */
export function afterResponse(work: Promise<unknown>): void {
  void resolveWaitUntil().then((waitUntil) => {
    const guarded = work.catch(() => {
      /* the caller logs its own failures */
    });
    if (waitUntil) waitUntil(guarded);
  });
}
