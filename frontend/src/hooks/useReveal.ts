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
 *     3. scroll-settle belt — on `scrollend` (rAF-throttled `scroll`
 *        where scrollend is unsupported) reconcile anything the IO
 *        never saw. Content must never stay hidden behind a one-shot.
 */
import { createElement, useEffect, useRef, type ReactNode, type ElementType } from 'react';

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

    const reveal = () => {
      if (settled) return;
      settled = true;
      el.classList.add('in-view');
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
    const reconcile = () => {
      if (settled) return;
      if (el.getBoundingClientRect().top < window.innerHeight) reveal();
    };
    let rafId = 0;
    const onScrollEnd = () => reconcile();
    const onScrollFallback = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        reconcile();
      });
    };
    // (Stored in a const, not an inline `in` check: TS narrows an
    // inline `'onscrollend' in window` else-branch to `never` because
    // lib.dom types the handler — branching on the boolean keeps the
    // window type wide.)
    const supportsScrollEnd = 'onscrollend' in window;
    if (supportsScrollEnd) {
      window.addEventListener('scrollend', onScrollEnd, { passive: true });
      cleanupFns.push(() => window.removeEventListener('scrollend', onScrollEnd));
    } else {
      // Safari & older engines: no scrollend — poll on scroll frames.
      window.addEventListener('scroll', onScrollFallback, { passive: true });
      cleanupFns.push(() => {
        window.removeEventListener('scroll', onScrollFallback);
        if (rafId) cancelAnimationFrame(rafId);
      });
    }

    // Geometry drift: the mount check reads the rect at effect time,
    // but fonts and images settle AFTER mount and can pull an element
    // from below the fold into the fold dead-zone (the landing hero
    // CTA on 882–959px viewports does exactly this — measured: mount
    // top ≥ vh, settled top 892 at vh=900, forever inside the −8%
    // rootMargin dead zone). Re-check when the page settles or the
    // viewport changes.
    const onSettle = () => reconcile();
    const onResize = () => reconcile();
    if (document.readyState === 'complete') {
      onSettle();
    } else {
      window.addEventListener('load', onSettle, { once: true, passive: true });
      cleanupFns.push(() => window.removeEventListener('load', onSettle));
    }
    document.fonts?.ready?.then(onSettle).catch(() => {
      /* fonts API rejected — the load/scrollend belts still cover */
    });
    window.addEventListener('resize', onResize, { passive: true });
    cleanupFns.push(() => window.removeEventListener('resize', onResize));

    return () => {
      cleanupFns.splice(0).forEach((fn) => fn());
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
