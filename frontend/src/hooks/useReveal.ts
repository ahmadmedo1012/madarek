/**
 * useReveal — IntersectionObserver-based reveal hook.
 *
 * Adds a class (default `in-view`) to the target ref when it enters
 * the viewport, used by `.reveal-up` / `.reveal-fade` CSS classes
 * for premium scroll-triggered fade/translate animations.
 *
 * Lightweight, no library, respects prefers-reduced-motion.
 *
 * Fling-hardening (audit 4-A11 P1-1, quantified live on `/`):
 * a one-shot IO alone permanently hides content. Two blind spots —
 * (a) the `-8%` bottom rootMargin creates a dead zone at the fold:
 *     an element peeking above the viewport bottom but below the
 *     shrunk root bottom (e.g. the landing hero CTA row on 882–959px
 *     viewports) never intersects, so it stays `opacity: 0` on load;
 * (b) IO delivers NO entry when an element jumps from below the root
 *     to above the viewport between observation frames — the
 *     intersection state never changed (verified live: instant jump
 *     to 70% doc height → 28/39 elements stuck). Fixed three ways:
 *     1. mount check — any part of the element at/above the fold
 *        (or already scrolled past) reveals immediately;
 *     2. IO clause — a non-intersecting entry whose rect is fully
 *        above the viewport means the user flung past it → reveal;
 *     3. scroll-settle belt — on `scrollend` (rAF-batched `scroll`
 *        where scrollend is unsupported) reconcile anything the IO
 *        never saw. Content must never stay hidden behind a one-shot.
 *
 * ── Shared-listener architecture (audit 4-e) ─────────────────────────
 * The landing page mounts ~47 `RevealCssClass` elements. The belt used
 * to be wired PER ELEMENT: 47 `scroll` listeners on engines without
 * `scrollend` (iOS Safari, older WebViews) each scheduling its own rAF
 * → 47 × getBoundingClientRect per scroll frame (forced-layout read
 * storms during flings); 47 `resize` listeners → iOS URL-bar show/hide
 * fired 47 rect reads in one burst (the classic iPhone scroll hitch);
 * plus 47 `load` listeners and 47 `fonts.ready` re-runs.
 *
 * A module-level manager now owns ONE listener of each kind:
 *   • `pendingElements` — a Set of every not-yet-revealed entry
 *     (`{ el, reconcile }`). Every shared listener just loops the set.
 *   • ONE `scrollend` listener — or, on engines without it, ONE
 *     `scroll` listener with a SINGLE rAF per frame batching ALL
 *     pending entries (identical per-element timing: same frame,
 *     same `rect.top < innerHeight` check, one loop instead of 47
 *     callbacks).
 *   • ONE `resize` listener, trailing-debounced ~150ms (rAF hop +
 *     timeout). Live viewport resizes are still revealed instantly by
 *     the primary IO (it re-evaluates on its own each frame); the
 *     debounced belt only back-fills the fold dead-zone case, so the
 *     delay is invisible while the URL-bar burst collapses to one
 *     rect sweep.
 *   • ONE `load` (once) + ONE `fonts.ready` re-reconcile, looping the
 *     pending set (fonts/images settle after mount and can pull an
 *     element into the fold dead-zone).
 *
 * Lifecycle: the FIRST registration installs the shared listeners and
 * the LAST pending element leaving the set removes them — the set size
 * IS the ref-count. Revealed elements self-unregister immediately
 * (revealing runs the per-element cleanup, e.g. IO disconnect), so a
 * fully-revealed page runs with ZERO listeners and zero work.
 *
 * Why not a second IntersectionObserver instead of the scroll belt?
 * Blind spot (b) yields no entry from ANY viewport-shaped root — an
 * element that skips from below the root to above it is never seen
 * intersecting (isIntersecting stays false), no matter the rootMargin.
 * Only an actual scroll event guarantees a rect re-check, so the
 * scroll/scrollend belt stays — it is just shared now.
 *
 * Public API and user-visible behavior are 100% unchanged: same hook
 * signature, same RevealCssClass props, same reveal classes, same
 * timing (reveal when entering the viewport ~8% above the bottom
 * edge), already-revealed elements never re-hide.
 */
import { createElement, useEffect, useRef, type ReactNode, type ElementType } from 'react';

/** A not-yet-revealed element registered with the shared belt manager. */
type RevealEntry = {
  el: HTMLElement;
  /** Re-checks the fold condition; reveals (and self-unregisters) on hit. */
  reconcile: () => void;
};

/**
 * Shared registry + listeners. All state is module-level but lazy —
 * `window` is only touched from functions invoked inside effects, so
 * importing this module stays SSR/test-safe.
 */
const pendingElements = new Set<RevealEntry>();

let sharedInstalled = false;
let scrollRafId = 0;
let resizeRafId = 0;
let resizeTimerId: ReturnType<typeof setTimeout> | 0 = 0;
const RESIZE_DEBOUNCE_MS = 150;

/**
 * The fan-out point: one rect read per still-pending element.
 * Safe against mutation during iteration — a `reveal()` inside the
 * loop deletes its own entry, and a Set skips entries deleted before
 * they are visited.
 */
const reconcileAll = () => {
  pendingElements.forEach((entry) => entry.reconcile());
};

const onSharedScrollEnd = () => reconcileAll();

const onSharedScroll = () => {
  // Engines without `scrollend`: ONE rAF per frame batching every
  // pending entry — was one listener + one rAF per element per frame.
  if (scrollRafId) return;
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = 0;
    reconcileAll();
  });
};

const onSharedResize = () => {
  // Hop off the resize hot path via rAF, then trail-debounce: iOS
  // URL-bar show/hide fires a burst of resizes mid-scroll. A resize
  // landing inside the debounce window re-arms the timer, so the
  // single sweep runs ~150ms after the LAST resize of the burst.
  if (resizeRafId) return;
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = 0;
    clearTimeout(resizeTimerId);
    resizeTimerId = setTimeout(reconcileAll, RESIZE_DEBOUNCE_MS);
  });
};

const onSharedLoad = () => reconcileAll();

const installSharedBelt = () => {
  if (sharedInstalled) return;
  sharedInstalled = true;

  // (Stored in a const, not an inline `in` check: TS narrows an
  // inline `'onscrollend' in window` else-branch to `never` because
  // lib.dom types the handler — branching on the boolean keeps the
  // window type wide.)
  const supportsScrollEnd = 'onscrollend' in window;
  if (supportsScrollEnd) {
    window.addEventListener('scrollend', onSharedScrollEnd, { passive: true });
  } else {
    window.addEventListener('scroll', onSharedScroll, { passive: true });
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', onSharedLoad, { once: true, passive: true });
  }

  document.fonts?.ready?.then(reconcileAll).catch(() => {
    /* fonts API rejected — the load/scrollend belts still cover */
  });

  window.addEventListener('resize', onSharedResize, { passive: true });
};

const teardownSharedBelt = () => {
  if (!sharedInstalled) return;
  sharedInstalled = false;
  window.removeEventListener('scrollend', onSharedScrollEnd);
  window.removeEventListener('scroll', onSharedScroll);
  window.removeEventListener('load', onSharedLoad);
  window.removeEventListener('resize', onSharedResize);
  if (scrollRafId) {
    cancelAnimationFrame(scrollRafId);
    scrollRafId = 0;
  }
  if (resizeRafId) {
    cancelAnimationFrame(resizeRafId);
    resizeRafId = 0;
  }
  clearTimeout(resizeTimerId);
};

/**
 * Registers a pending element with the shared belt, installing the
 * shared listeners on first need. When the document already finished
 * loading, settle immediately — the per-element code this replaces
 * called reconcile() synchronously in the same situation (belt-and-
 * braces: the mount check ran with the same geometry microseconds
 * earlier, so in practice this is a no-op).
 */
const registerPending = (entry: RevealEntry) => {
  installSharedBelt();
  pendingElements.add(entry);
  if (document.readyState === 'complete') entry.reconcile();
};

/**
 * Removes a pending element (idempotent). The set size IS the
 * ref-count: dropping the LAST pending element — via reveal or
 * unmount — removes the shared listeners. A stale/double unregister
 * can never fire early: teardown happens only when the set is truly
 * empty, so other elements' listeners are never yanked.
 */
const unregisterPending = (entry: RevealEntry) => {
  pendingElements.delete(entry);
  if (pendingElements.size === 0) teardownSharedBelt();
};

export function useReveal<T extends HTMLElement = HTMLElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced-motion preference — show content immediately, no animation
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      el.classList.add('in-view');
      return;
    }

    const once = options?.once !== false;
    let settled = false;
    const cleanupFns: Array<() => void> = [];

    // The shared-belt entry. `reconcile` closes over `reveal` (defined
    // right below) — safe: it only ever runs after both are
    // initialized, from the shared listeners or registration settle.
    const entry: RevealEntry = {
      el,
      reconcile: () => {
        if (settled) return;
        if (el.getBoundingClientRect().top < window.innerHeight) reveal();
      },
    };

    const reveal = () => {
      if (settled) return;
      settled = true;
      el.classList.add('in-view');
      // Leave the shared pending set first — this is what drops the
      // shared listeners when the last pending element reveals (a
      // no-op delete for the pre-registration reveal paths below) —
      // then run the per-element cleanups (IO disconnect etc.).
      unregisterPending(entry);
      cleanupFns.splice(0).forEach((fn) => fn());
    };

    // (a) Mount check — already visible at the fold, or scrolled past
    // (scroll-restoration / anchor deep-link): reveal now. Mirrors the
    // platform <Reveal> component's above-the-fold clause.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      reveal();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (once) {
              reveal(); // also tears the belt down
            } else {
              e.target.classList.add('in-view');
            }
          } else if (
            once &&
            e.boundingClientRect.bottom < 0
          ) {
            // (b) Non-intersecting and fully above the viewport — the
            // user flung/jumped past this element between observation
            // frames. One-shot semantics: passed ⇒ revealed.
            reveal();
          } else if (!once) {
            e.target.classList.remove('in-view');
          }
        });
      },
      {
        threshold: options?.threshold ?? 0.12,
        rootMargin: options?.rootMargin ?? '0px 0px -8% 0px',
      },
    );

    obs.observe(el);
    cleanupFns.push(() => obs.disconnect());

    // (c) Belt — IO provably never fires for elements that skip from
    // below the root to above it, so reconcile once scrolling settles.
    // Anything at/above the fold at that moment must be visible.
    // Registered with the SHARED manager: one scrollend/scroll, one
    // resize, one load and one fonts.ready listener serve ALL pending
    // elements (see the architecture note at the top of this file).
    // Geometry drift is covered too: fonts and images settle AFTER
    // mount and can pull an element from below the fold into the fold
    // dead-zone (the landing hero CTA on 882–959px viewports does
    // exactly this — measured: mount top ≥ vh, settled top 892 at
    // vh=900, forever inside the −8% rootMargin dead zone).
    registerPending(entry);

    return () => {
      cleanupFns.splice(0).forEach((fn) => fn());
      unregisterPending(entry);
    };
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return ref;
}

/**
 * RevealCssClass — thin JSX wrapper around useReveal that manages the
 * `.reveal-up` / `.reveal-d-{1..5}` class contract used by the landing
 * page's choreography (landing.css + polish.css).
 *
 * NOT the platform reveal primitive. `components/motion/Reveal.tsx`
 * (data-reveal / data-revealed + --reveal-distance tokens, RevealGroup
 * staggering) is the sanctioned component for app pages. The two used to
 * share the `Reveal` name and this file's docblock even advertised the
 * other component's API — renamed so nobody picks the wrong one
 * (audit 11-f P2-10).
 *
 * Usage:
 *   <RevealCssClass as="section" className="..." delay={2}>…</RevealCssClass>
 */
export function RevealCssClass({
  as = 'div',
  className = '',
  children,
  delay,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5;
  [k: string]: unknown;
}) {
  const ref = useReveal<HTMLElement>();
  const cls = ['reveal-up', delay ? `reveal-d-${delay}` : '', className]
    .filter(Boolean)
    .join(' ');
  return createElement(as, { ref, className: cls, ...rest }, children);
}
