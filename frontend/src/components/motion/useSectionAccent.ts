/**
 * SectionAccent — one-shot scroll-narrative accent for landing sections.
 *
 * Contract: specs/012-design-graphics-uplift/spec.md US5 + R-010 of
 * research.md.
 *
 * Wraps a section element with an IntersectionObserver that triggers
 * exactly one accent animation when the section enters the viewport.
 * The accent kind is selected per call site:
 *
 *   underline-draw  — a 0..1 line that draws itself across the section
 *   number-tick     — counts a numeric child up from 0 to its value
 *   scene-paint     — fades + lifts an illustration scene into place
 *   quote-fade      — a calm fade for blockquote / aphorism content
 *   parallax-shift  — bounded translation (≤ 8 px) on scroll
 *
 * Behaviours that hold across every kind:
 *   - One-shot. Once data-accent-fired is on the element, the observer
 *     stops watching it.
 *   - Idle pause. When document.hidden flips true, no animation
 *     advances. Re-paints resume on visibilitychange.
 *   - prefers-reduced-motion: skips the cascade and renders the final
 *     state immediately.
 *   - RTL: directional kinds (underline-draw, parallax-shift) flip via
 *     a mirrored CSS variable rather than re-running.
 *
 * The hook returns a ref to attach to the wrapper element + a `fired`
 * flag for components that need to react after the animation lands.
 *
 * Usage:
 *   const { ref, fired } = useSectionAccent('underline-draw')
 *   <section ref={ref} className={fired ? 'is-fired' : ''}>...</section>
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export type AccentKind =
  | 'underline-draw'
  | 'number-tick'
  | 'scene-paint'
  | 'quote-fade'
  | 'parallax-shift';

export interface UseSectionAccentOpts {
  /** IntersectionObserver threshold. Default 0.4. */
  threshold?: number;
  /** Disable the accent (e.g. while a parent is in skeleton state). */
  disabled?: boolean;
}

export interface UseSectionAccentResult<E extends HTMLElement = HTMLElement> {
  ref: React.RefObject<E | null>;
  fired: boolean;
}

const FIRED_DATASET_ATTR = 'accentFired';

export function useSectionAccent<E extends HTMLElement = HTMLElement>(
  kind: AccentKind,
  opts: UseSectionAccentOpts = {},
): UseSectionAccentResult<E> {
  const { threshold = 0.4, disabled = false } = opts;
  const ref = useRef<E | null>(null);
  const [fired, setFired] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || disabled) return;

    // Already fired in a prior session (or by SSR hydration) — render
    // the final state without re-running the cascade.
    if (node.dataset[FIRED_DATASET_ATTR] === 'true') {
      setFired(true);
      return;
    }

    // Reduced-motion shortcut: mark fired and final state; never
    // observe.
    if (reducedMotion) {
      node.dataset[FIRED_DATASET_ATTR] = 'true';
      node.dataset.accentKind = kind;
      setFired(true);
      return;
    }

    // No IntersectionObserver in some test environments — fall back
    // to firing on the next tick so the accent still lands.
    if (typeof IntersectionObserver === 'undefined') {
      node.dataset[FIRED_DATASET_ATTR] = 'true';
      node.dataset.accentKind = kind;
      setFired(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          // Idle pause: if the tab is hidden, don't fire — wait for
          // visibility to come back.
          if (typeof document !== 'undefined' && document.hidden) continue;

          const target = entry.target as HTMLElement;
          if (target.dataset[FIRED_DATASET_ATTR] === 'true') {
            observer.unobserve(target);
            continue;
          }
          target.dataset[FIRED_DATASET_ATTR] = 'true';
          target.dataset.accentKind = kind;
          setFired(true);
          observer.unobserve(target);
        }
      },
      { threshold },
    );
    observer.observe(node);

    // visibilitychange listener — re-trigger detection when the tab
    // returns. The IO will deliver an entry immediately if the
    // section is still in view.
    const onVisibility = () => {
      if (!document.hidden && node.dataset[FIRED_DATASET_ATTR] !== 'true') {
        observer.observe(node);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [kind, threshold, disabled, reducedMotion]);

  return { ref, fired };
}
