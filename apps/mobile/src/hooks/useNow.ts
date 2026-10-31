/**
 * useNow — a ticking clock for render-pure time comparisons.
 *
 * R327 C5: `Date.now()` during render is impure (react-hooks/purity —
 * the reactCompiler crash class): the same render can compute different
 * «is this in the future?» answers. This hook seats «now» in state —
 * render stays a pure function of (data, now) — and the label the user
 * reads can no longer go stale for the session's lifetime (it did
 * before: the comparison froze at first render).
 *
 * `intervalMs` 0 = no ticking (a single mount-time snapshot).
 */
import { useEffect, useState } from "react";

export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (intervalMs <= 0) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
