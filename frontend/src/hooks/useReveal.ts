/**
 * useReveal — IntersectionObserver-based reveal hook (shared belt).
 *
 * Adds a class (default `in-view`) to the target ref when it enters
 * the viewport, used by `.reveal-up` / `.reveal-fade` CSS classes
 * for premium scroll-triggered fade/translate animations.
 *
 * Lightweight, no library, respects prefers-reduced-motion.
 *
 * ── Shared observer belt (perf audit R3 #7) ─────────────────────────
 * The landing page mounts ~38 of these. The former per-instance design
 * cost 38 IntersectionObservers + 38 scrollend/resize listener sets,
 * and on Safari/iOS < 18 (no `scrollend`) it fell back to 38 global
 * `scroll` listeners, each with its own rAF — up to 38
 * `getBoundingClientRect()` calls per scroll frame (forced-layout
 * thrash). Now the whole page shares ONE observer per options
 * combination (the 38 default reveals all hit the same key), ONE
 * scroll/resize belt and ONE rAF, and a settle frame reads every
 * registered rect in a single batch BEFORE writing any reveal class —
 * one layout pass for the entire belt instead of one per element.
 * The belt attaches lazily on first registration and tears itself
 * down when the last entry reveals or unmounts.
 *
 * ── Fling-hardening (audit 4-A11 P1-1, quantified live on `/`) ──────
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
 *     3. scroll-settle belt — on `scrollend` (rAF-coalesced `scroll`
 *        where scrollend is unsupported) reconcile anything the IO
 *        never saw. Content must never stay hidden behind a one-shot.
 *
 * ── R318 C2-S1 — the settle pass no longer re-reads the registry ──
 * The old reconcile called `getBoundingClientRect()` on EVERY unsettled
 * entry at EVERY settle event (~35 reads × ~13 settles per scroll run
 * — 30–45% of the page's total layout reads). Geometry is now carried
 * per entry as DOCUMENT-space top (`docTop`, stable across pure
 * scroll — the viewport position derives from `window.scrollY`, which
 * costs nothing) stamped with a layout epoch. A settle only re-reads
 * entries whose stamp is STALE — i.e. after a real layout change,
 * batched in one read-then-write pass. The epoch is bumped by every
 * path that can change document layout (resize, fonts.ready, the
 * window `load` + capture-phase resource `load`s for late media, and
 * transition/animation ends of geometry-affecting properties) plus a
 * last-net document-height watch per settle. Pure scrolling costs
 * ZERO layout reads. The reveal CONTRACTS are unchanged: r308
 * once-only, the fling hardening (mount check + IO fully-above clause
 * + the settle belt — a flung-past entry still reconciles from its
 * cached docTop), and the reduced-motion immediate reveal.
 */
import { useReducedMotion } from '../components/motion/useReducedMotion';
import { createElement, useEffect, useRef, type ReactNode, type ElementType } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   Shared belt — module-level, shared by every useReveal instance.
   Nothing here touches window/document at import time (SSR-safe);
   everything runs lazily from component effects.
   ═══════════════════════════════════════════════════════════════════ */

interface RevealEntry {
  el: HTMLElement;
  /** one-shot semantics: reveal once, then leave the belt (default) */
  once: boolean;
  settled: boolean;
  reveal: () => void;
  /**
   * R318 C2-S1 — the entry's DOCUMENT-space top (viewport top +
   * scrollY at measure time). Stable across pure scroll; the settle
   * reconcile checks `docTop - scrollY < innerHeight` and only
   * re-measures when `gen` is a layout epoch from the past.
   */
  docTop: number;
  gen: number;
}

/**
 * One observer per options combination — every entry registered with
 * the same threshold/rootMargin shares a single IntersectionObserver
 * (the landing's ~38 reveals all share the default bucket).
 */
interface ObserverBucket {
  obs: IntersectionObserver;
  entries: Set<RevealEntry>;
}

/** All live registrations — what the scroll/settle belt reconciles. */
const registry = new Set<RevealEntry>();
const buckets = new Map<string, ObserverBucket>();

let beltAttached = false;
let beltRaf = 0;
let fontsHooked = false;

/* ── R318 C2-S1 — the layout epoch ─────────────────────────────
 * A monotone counter bumped whenever document geometry may have
 * changed. Entries carry the epoch their `docTop` was measured in;
 * `gen === layoutEpoch` means the cached docTop is still
 * trustworthy (pure scroll never bumps it); anything older is
 * re-measured — in one batched read pass — at the next settle. */
let layoutEpoch = 0;

const bumpLayoutEpoch = () => {
  layoutEpoch += 1;
};

/* the last document height the belt saw — the per-settle last net
 * for layout changes that fire no event the hooks below catch. */
let lastDocH = -1;

/* only animation/transition ends that can CHANGE geometry bump the
 * epoch — opacity/transform/clip reveals (this belt's own
 * animations) must not, or every reveal would re-read everything. */
const GEOM_ANIM_PROPS =
  /(size|width|height|margin|padding|inset|top|right|bottom|left|font|line-height|gap|flex|grid|spacing|columns|aspect)/;

/**
 * Read-phase → write-phase: the belt's reconcile. Fresh-stamped
 * entries are checked from their cached DOCUMENT geometry (no layout
 * read at all); stale ones — a layout change invalidated them — are
 * re-measured in ONE batched read pass BEFORE any reveal class is
 * written (adding `.in-view` only flips opacity/transform, so it
 * cannot invalidate layout).
 */
const reconcileAll = () => {
  if (registry.size === 0) return;
  /* the document-height watch: ONE scrollHeight read per settle —
   * pure scroll never changes it, so steady scrolling costs zero
   * layout reads; a real change (late media reflowing the page)
   * invalidates every cached docTop for the batched pass below. */
  const docH = document.documentElement.scrollHeight;
  if (docH !== lastDocH) {
    lastDocH = docH;
    bumpLayoutEpoch();
  }
  const scrollY = window.scrollY;
  const vh = window.innerHeight;
  const due: RevealEntry[] = [];
  const stale: RevealEntry[] = [];
  for (const entry of registry) {
    if (entry.settled) continue;
    if (entry.gen === layoutEpoch) {
      if (entry.docTop - scrollY < vh) due.push(entry);
    } else {
      stale.push(entry);
    }
  }
  /* the dirty pass — only entries the epoch invalidated; reads
   * batched before the first write. */
  for (const entry of stale) {
    entry.docTop = entry.el.getBoundingClientRect().top + window.scrollY;
    entry.gen = layoutEpoch;
    if (entry.docTop - scrollY < vh) due.push(entry);
  }
  for (const entry of due) entry.reveal();
};

/** ONE rAF per frame, no matter how many entries or belt events fired. */
const scheduleReconcile = () => {
  if (beltRaf) return;
  beltRaf = requestAnimationFrame(() => {
    beltRaf = 0;
    reconcileAll();
  });
};

const onScrollSettle = () => scheduleReconcile();
/* resize IS a layout change — bump the epoch, then reconcile. */
const onResize = () => {
  bumpLayoutEpoch();
  scheduleReconcile();
};
/* the window `load` settles the last late layout (media + fonts). */
const onLoadSettle = () => {
  bumpLayoutEpoch();
  scheduleReconcile();
};
const onFontsSettled = () => {
  bumpLayoutEpoch();
  scheduleReconcile();
};
/* capture-phase resource loads — lazy <img>/late media reflow the
 * document as they decode. `load` never bubbles, but it PASSES
 * through window on the capture path, so one listener sees them all. */
const onAssetLoad = () => {
  bumpLayoutEpoch();
};
/* a size-affecting transition/animation just ended — seats may have
 * moved (filtered: opacity/transform reveals must not bump). */
const onAnimGeom = (ev: Event) => {
  const name = (ev as TransitionEvent).propertyName ?? '';
  if (name && GEOM_ANIM_PROPS.test(name)) bumpLayoutEpoch();
};

const attachBelt = () => {
  if (beltAttached) return;
  beltAttached = true;
  // (Stored in a const, not an inline `in` check: TS narrows an inline
  // `'onscrollend' in window` else-branch to `never` because lib.dom
  // types the handler — branching on the boolean keeps the window type
  // wide.)
  const supportsScrollEnd = 'onscrollend' in window;
  if (supportsScrollEnd) {
    window.addEventListener('scrollend', onScrollSettle, { passive: true });
  } else {
    // Safari & older engines: no scrollend — reconcile on scroll
    // frames; the shared rAF above keeps it to one batch per frame.
    window.addEventListener('scroll', onScrollSettle, { passive: true });
  }
  window.addEventListener('resize', onResize, { passive: true });
  // Geometry drift: images/fonts settle after mount and can pull an
  // element from below the fold into the rootMargin dead zone.
  if (document.readyState !== 'complete') {
    window.addEventListener('load', onLoadSettle, { once: true, passive: true });
  }
  /* R318 C2-S1 — the rest of the layout-epoch watch: late/lazy
   * resource loads (capture) and geometry-affecting animation ends. */
  window.addEventListener('load', onAssetLoad, { capture: true, passive: true });
  window.addEventListener('transitionend', onAnimGeom, { capture: true, passive: true });
  window.addEventListener('animationend', onAnimGeom, { capture: true, passive: true });
  if (!fontsHooked) {
    fontsHooked = true;
    document.fonts?.ready?.then(onFontsSettled).catch(() => {
      /* fonts API rejected — the load/scrollend belts still cover */
    });
  }
};

const detachBelt = () => {
  if (!beltAttached) return;
  beltAttached = false;
  // Removing a type that was never added (scrollend vs scroll) is a
  // no-op, so both are attempted unconditionally.
  window.removeEventListener('scrollend', onScrollSettle);
  window.removeEventListener('scroll', onScrollSettle);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('load', onLoadSettle);
  window.removeEventListener('load', onAssetLoad, { capture: true });
  window.removeEventListener('transitionend', onAnimGeom, { capture: true });
  window.removeEventListener('animationend', onAnimGeom, { capture: true });
  if (beltRaf) {
    cancelAnimationFrame(beltRaf);
    beltRaf = 0;
  }
};

const getBucket = (threshold: number, rootMargin: string): ObserverBucket => {
  const key = `${threshold}|${rootMargin}`;
  let bucket = buckets.get(key);
  if (bucket) return bucket;
  const entries = new Set<RevealEntry>();
  const obs = new IntersectionObserver(
    (list) => {
      for (const e of list) {
        for (const entry of entries) {
          if (entry.el !== e.target || entry.settled) continue;
          /* R318 C2-S1 — the IO already measured the geometry: refresh
           * the entry's cached docTop for free (against the live
           * scrollY inside the callback's own frame). */
          entry.docTop = e.boundingClientRect.top + window.scrollY;
          entry.gen = layoutEpoch;
          if (e.isIntersecting) {
            if (entry.once) {
              entry.reveal(); // also unregisters + reaps the belt when last
            } else {
              entry.el.classList.add('in-view');
            }
          } else if (entry.once && e.boundingClientRect.bottom < 0) {
            // (b) Non-intersecting and fully above the viewport — the
            // user flung/jumped past this element between observation
            // frames. One-shot semantics: passed ⇒ revealed.
            entry.reveal();
          } else if (!entry.once) {
            entry.el.classList.remove('in-view');
          }
        }
      }
    },
    { threshold, rootMargin },
  );
  bucket = { obs, entries };
  buckets.set(key, bucket);
  return bucket;
};

const unregister = (entry: RevealEntry) => {
  registry.delete(entry);
  for (const [key, bucket] of [...buckets]) {
    if (!bucket.entries.delete(entry)) continue;
    if (bucket.entries.size === 0) {
      bucket.obs.disconnect();
      buckets.delete(key);
    }
    break; // an entry lives in exactly one bucket
  }
  if (registry.size === 0) detachBelt();
};

export function useReveal<T extends HTMLElement = HTMLElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced-motion preference — show content immediately, no
    // animation. r157 (lead): the reactive hook (see import) re-arms this
    // effect when the OS preference flips mid-session — the one-shot
    // matchMedia read used to leave stale animation state behind.
    if (reducedMotion) {
      el.classList.add('in-view');
      return;
    }

    const once = options?.once !== false;
    const threshold = options?.threshold ?? 0.12;
    const rootMargin = options?.rootMargin ?? '0px 0px -8% 0px';

    const entry: RevealEntry = {
      el,
      once,
      settled: false,
      docTop: 0,
      gen: layoutEpoch,
      reveal: () => {
        if (entry.settled) return;
        if (entry.once) {
          // r307 (audit 1-C M-2): one-shot semantics — settle, leave
          // the observer + belt. Non-once entries NEVER settle here:
          // the IO callback toggles the class both ways, so a scrub /
          // continuous reveal stays observable for its whole life
          // (the old form permanently pinned non-once entries in-view
          // after the first settle — a trap for scroll-linked scenes).
          entry.settled = true;
          el.classList.add('in-view');
          unregister(entry);
        } else {
          el.classList.add('in-view');
        }
      },
    };

    // (a) Mount check — already visible at the fold, or scrolled past
    // (scroll-restoration / anchor deep-link): reveal now. Mirrors the
    // platform <Reveal> component's above-the-fold clause. The one read
    // doubles as the entry's first cached docTop (R318 C2-S1).
    const mountTop = el.getBoundingClientRect().top;
    entry.docTop = mountTop + window.scrollY;
    entry.gen = layoutEpoch;
    if (mountTop < window.innerHeight) {
      entry.reveal();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      entry.reveal();
      return;
    }

    const bucket = getBucket(threshold, rootMargin);
    registry.add(entry);
    bucket.entries.add(entry);
    bucket.obs.observe(el);
    attachBelt();

    return () => unregister(entry);
  }, [options?.threshold, options?.rootMargin, options?.once, reducedMotion]);

  return ref;
}

/**
 * RevealCssClass — thin JSX wrapper around useReveal that manages the
 * `.reveal-up` / `.reveal-d-{1..5}` class contract used by the landing
 * page's choreography (landing.css — r294 moved the family home from
 * the polish bundle).
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
