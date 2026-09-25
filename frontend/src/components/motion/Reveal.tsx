import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useReducedMotion } from './useReducedMotion';

type RevealProps = {
  children: ReactNode;
  /** Element to render. */
  as?: 'div' | 'section' | 'article' | 'span' | 'li';
  /** Reveal distance. */
  distance?: 'small' | 'medium' | 'large';
  /** IntersectionObserver threshold. */
  threshold?: number;
  /** Set automatically by RevealGroup; do not pass manually. */
  staggerIndex?: number;
  className?: string;
  style?: CSSProperties;
};

const DISTANCE_TOKEN: Record<NonNullable<RevealProps['distance']>, string> = {
  small: 'var(--motion-distance-small)',
  medium: 'var(--motion-distance-medium)',
  large: 'var(--motion-distance-large)',
};

/**
 * Reveal — fades + lifts a section into view once when it enters
 * the viewport. One-shot per element per page load.
 *
 * Fling-hardened (audit 4-A11 P1-2): the mount check alone still
 * permanently hides an element the user flings/jumps PAST — IO
 * delivers no entry when an element skips from below the root to
 * above the viewport between observation frames (intersection state
 * never changed; verified live). Two extra clauses mirror
 * useReveal.ts: a non-intersecting IO entry fully above the viewport
 * reveals, and a `scrollend` belt (rAF-throttled `scroll` fallback
 * where scrollend is unsupported) reconciles anything IO never saw.
 *
 * See specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 */
export function Reveal({
  children,
  as = 'div',
  distance = 'medium',
  threshold = 0,
  staggerIndex = 0,
  className,
  style,
}: RevealProps): JSX.Element {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setRevealed(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    // Above the fold — or already scrolled past (scroll restoration /
    // anchor deep-link): render in the final state immediately.
    if (node.getBoundingClientRect().top < window.innerHeight) {
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      // Old browser fallback — just reveal.
      setRevealed(true);
      return;
    }

    const reveal = () => {
      setRevealed(true);
      observer.disconnect();
      removeBelt();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            return;
          }
          if (entry.boundingClientRect.bottom < 0) {
            // Non-intersecting and fully above the viewport — the user
            // flung past this element between observation frames.
            reveal();
            return;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold },
    );
    observer.observe(node);

    // Belt: reconcile on scroll settle — IO never fires for elements
    // that skip from below the root to above it in one jump.
    const reconcile = () => {
      if (node.getBoundingClientRect().top < window.innerHeight) reveal();
    };
    const onScrollEnd = () => reconcile();
    let rafId = 0;
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
    const removeBelt = () => {
      if (supportsScrollEnd) {
        window.removeEventListener('scrollend', onScrollEnd);
      } else {
        window.removeEventListener('scroll', onScrollFallback);
        if (rafId) cancelAnimationFrame(rafId);
      }
      window.removeEventListener('load', onSettle);
      window.removeEventListener('resize', onResize);
    };
    if (supportsScrollEnd) {
      window.addEventListener('scrollend', onScrollEnd, { passive: true });
    } else {
      // Safari & older engines: no scrollend — poll on scroll frames.
      window.addEventListener('scroll', onScrollFallback, { passive: true });
    }

    // Geometry drift: the mount check reads the rect at effect time,
    // but fonts and images settle after mount and can move an element
    // across the fold (audit 4-A11 P1-1's dead-zone class). Re-check
    // when the page settles or the viewport changes.
    const onSettle = () => reconcile();
    const onResize = () => reconcile();
    if (document.readyState === 'complete') {
      onSettle();
    } else {
      window.addEventListener('load', onSettle, { once: true, passive: true });
    }
    document.fonts?.ready?.then(onSettle).catch(() => {
      /* fonts API rejected — the load/scrollend belts still cover */
    });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      observer.disconnect();
      removeBelt();
    };
  }, [reduced, threshold]);

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      data-reveal
      data-revealed={revealed ? 'true' : 'false'}
      style={
        {
          ...style,
          // Custom properties consumed by motion.css keyframes.
          '--reveal-distance': DISTANCE_TOKEN[distance],
          '--reveal-index': staggerIndex,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

type RevealGroupProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * RevealGroup — assigns staggerIndex to each direct Reveal child so
 * the cascade reads in order. Caps at --motion-stagger-cap so very
 * long groups don't accumulate large delays.
 */
export function RevealGroup({ children, className, style }: RevealGroupProps): JSX.Element {
  const cap = 6; // matches --motion-stagger-cap default
  const indexed = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;
    if ((child.type as { displayName?: string })?.displayName !== 'Reveal' && child.type !== Reveal) {
      return child;
    }
    return cloneElement(child as React.ReactElement<RevealProps>, {
      staggerIndex: Math.min(index, cap),
    });
  });
  return (
    <div className={className} style={style}>
      {indexed}
    </div>
  );
}

(Reveal as { displayName?: string }).displayName = 'Reveal';
(RevealGroup as { displayName?: string }).displayName = 'RevealGroup';
