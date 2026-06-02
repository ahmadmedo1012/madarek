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

    // Above-the-fold: render in the final state immediately.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      // Old browser fallback — just reveal.
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
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
