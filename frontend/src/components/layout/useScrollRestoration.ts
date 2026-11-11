import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType, type NavigationType } from 'react-router-dom';

const SCROLL_STORAGE_KEY_PREFIX = 'madarek.scroll:';

/* r152a (A4 P3): hardened browsers and embedded webviews can throw on
 * sessionStorage access itself (the app already guards this in
 * auth.store / LandingPage / ProfilePage) — an unguarded throw inside
 * this effect would land the whole app on the error boundary on every
 * navigation. Persistence and restore silently degrade instead. */
const readStoredScroll = (key: string): number | null => {
  try {
    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY_PREFIX + key);
    return stored ? Number(stored) : null;
  } catch {
    return null;
  }
};

const persistScroll = (key: string, scrollTop: number): void => {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY_PREFIX + key, String(scrollTop));
  } catch {
    /* storage blocked — skip persisting */
  }
};

/* r305-A4 (task 2-e): the POP restore's one-rAF apply can land while
 * the destination's height hasn't arrived yet — the shell's inner
 * Suspense fallback on a cold chunk, or a page whose data (lists /
 * charts / media) lands after mount. A real scroller CLAMPS the
 * programmatic write to scrollHeight − clientHeight, so the stored
 * offset silently degrades to whatever the short state can hold and
 * the position is lost the moment the real content replaces it
 * (measured in useScrollRestoration.test.tsx: POP into a route that
 * grows 100→2000px after the restore frame parks the user at the top,
 * forever). The watcher re-applies the stored offset for a bounded
 * window (~1s at 60fps) and stands down the moment the offset is
 * honored, a new navigation replaces this effect, or the user scrolls
 * the container themselves (any position that isn't the one our own
 * write produced — the clamped result of our write always compares
 * equal to `expected`, user movement never does). PUSH/REPLACE —
 * always top, no stored offset to lose — are untouched.
 *
 * r349-Q3: the original budget was 60 rAF frames flat. Under worker
 * load (4 CI workers) rAF cadence is erratic — 60 frames can elapse
 * in ~1s of wall time while the destination's payload (mock transport,
 * cold chunks) lands seconds later, so the watcher stood down before
 * the height that could hold the offset ever arrived and the restore
 * was lost forever (measured: 6/20 e2e failures under --workers=4).
 * The budget is now two-legged and load-honest:
 *   · SETTLED frames — frames in which the container can already hold
 *     the target (scrollHeight − clientHeight ≥ top) count against a
 *     60-frame interference budget. If the clamp is NOT binding and
 *     the offset still won't stick, something else is scrolling the
 *     container — we stop fighting after 60 such frames (original
 *     intent, preserved).
 *   · A hard wall-clock cap (RESTORE_WATCH_MAX_MS) bounds the whole
 *     watch no matter what — the loop can never outlive it, and a
 *     navigation effect cleanup tears it down as before.
 * While the container is too short, watching is free (every apply
 * clamps to the same place; nothing is fought), so late content
 * restores deterministically instead of racing a frame counter. */
const RESTORE_WATCH_SETTLED_FRAMES = 60;
const RESTORE_WATCH_MAX_MS = 10_000;

/**
 * useScrollRestoration — saves the content scroll position per history
 * entry, restores it on POP (browser back/forward), scrolls to top on
 * PUSH/REPLACE.
 *
 * Pass the ref of the scroll container (the element that actually
 * scrolls — typically `.content` inside the AppShell, NOT window).
 *
 * See FR-008 (narrowed): scroll-position restoration only.
 */
export function useScrollRestoration(scrollRef: React.RefObject<HTMLElement | null>): void {
  const location = useLocation();
  const navigationType: NavigationType = useNavigationType();
  const previousKey = useRef<string | null>(null);
  const previousScrollTop = useRef<number>(0);

  // Track the live scroll position so we can persist on key change.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const onScroll = () => {
      previousScrollTop.current = node.scrollTop;
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  // Persist on navigate-away; restore or top-scroll on navigate-in.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    // Save the OUTGOING key's scroll position.
    if (previousKey.current && previousKey.current !== location.key) {
      persistScroll(previousKey.current, previousScrollTop.current);
    }

    // POP restore machinery — owns its own teardown (rAFs + watcher
    // listener) so a mid-watch navigation cancels it cleanly.
    let applyRaf = 0;
    let watchRaf = 0;
    let honored = false;
    let settled = 0;
    const startedAt =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    // What our last programmatic write produced (the clamped result).
    // -1 until the first apply: scroll events before the restore has
    // applied must not cancel it (old-code parity — the apply always
    // happened, even over a scroll that raced it).
    let expected = -1;

    const stopWatching = () => {
      if (applyRaf) {
        cancelAnimationFrame(applyRaf);
        applyRaf = 0;
      }
      if (watchRaf) {
        cancelAnimationFrame(watchRaf);
        watchRaf = 0;
      }
      node.removeEventListener('scroll', onWatchScroll);
    };

    const onWatchScroll = () => {
      if (expected < 0) return;
      if (honored) return;
      if (node.scrollTop !== expected) stopWatching(); // user intent wins
    };

    const apply = () => {
      node.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
      expected = node.scrollTop;
      if (expected >= top - 1) {
        honored = true;
        stopWatching();
      }
    };

    const tick = () => {
      watchRaf = 0;
      if (honored) return;
      const elapsed =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
        startedAt;
      if (elapsed >= RESTORE_WATCH_MAX_MS) {
        stopWatching();
        return;
      }
      // Only burn the interference budget on frames where the clamp is
      // NOT binding — while the destination is still too short to hold
      // the offset, watching is free (r349-Q3; see header note).
      if (node.scrollHeight - node.clientHeight >= top) {
        settled += 1;
        if (settled >= RESTORE_WATCH_SETTLED_FRAMES) {
          stopWatching();
          return;
        }
      }
      watchRaf = requestAnimationFrame(() => {
        watchRaf = 0;
        if (honored) return;
        apply();
        tick();
      });
    };

    let restoreTeardown: (() => void) | null = null;
    // Effect-scoped so `apply` (defined above) closes over the restore
    // target — a block-scoped const inside the POP branch would leak
    // the reference to the global `window.top` (measured: NaN writes).
    let top = 0;

    if (navigationType === 'POP') {
      // Browser back/forward: restore the entry's saved position.
      top = readStoredScroll(location.key) ?? 0;
      node.addEventListener('scroll', onWatchScroll, { passive: true });
      // Run after layout so the content is in place; the bounded
      // watcher completes the restore if the height arrives late.
      applyRaf = requestAnimationFrame(() => {
        applyRaf = 0;
        apply();
        if (!honored) tick();
      });
      restoreTeardown = stopWatching;
    } else {
      // PUSH/REPLACE: top of the new route.
      node.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    previousKey.current = location.key;
    previousScrollTop.current = 0;
    return () => restoreTeardown?.();
  }, [location.key, navigationType, scrollRef]);
}
