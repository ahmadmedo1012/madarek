import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * KineticWords — display type that assembles from a clean edge.
 *
 * Splits Arabic display text into words (never characters — reading
 * must not become waiting), each masked by its own overflow-hidden
 * frame and rising in with a stagger. The masks carry bottom padding
 * for Arabic descenders (ج، ی، ن…) so no tail is ever clipped, and the
 * whole entrance is CSS-only: one class, per-word --d delay.
 *
 * Triggers:
 * · `mount`  — plays when the page `.revealed` state lands (hero, right
 *   after the entry ritual).
 * · `view`   — plays once when the words enter the viewport (finale and
 *   any below-the-fold display moment) via IntersectionObserver at 35%.
 *
 * prefers-reduced-motion → the words are simply there (the observer
 * still fires so layout-dependent consumers see the state change, but
 * no motion runs). Comprehension is never gated behind an animation.
 */
export function KineticWords({
  text,
  className = '',
  accent = [],
  delay = 0,
  step = 90,
  trigger = 'view',
  children,
}: {
  /** The heading text — words are real text nodes (selectable, translatable). */
  text: string;
  className?: string;
  /** Word indexes to set in the accent ink (gold). */
  accent?: number[];
  /** Base delay ms (before the first word). */
  delay?: number;
  /** Stagger ms between words. */
  step?: number;
  /** mount = play with the page reveal; view = play on first sight. */
  trigger?: 'mount' | 'view';
  /** Optional trailing node (e.g. an inline icon) outside the split. */
  children?: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (trigger === 'mount') {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trigger]);

  const words = text.split(' ');
  return (
    <span ref={ref} className={`kinetic ${inView ? 'k-in' : ''} ${className}`}>
      {words.map((w, i) => (
        <span className="kinetic-mask" key={`${w}-${i}`}>
          <span
            className={`kinetic-word${accent.includes(i) ? ' accent' : ''}`}
            style={{ ['--d' as string]: `${delay + i * step}ms` }}
          >
            {w}
          </span>
          {i < words.length - 1 ? <span className="kinetic-space"> </span> : null}
        </span>
      ))}
      {children}
    </span>
  );
}
