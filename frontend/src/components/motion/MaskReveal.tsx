import { createElement, type ElementType } from 'react';
import { useReveal } from '../../hooks/useReveal';
/**
 * MaskReveal — word-mask text reveal (immersive-redesign wave 1).
 *
 * The reference-site "line-mask flow" adapted Arabic-safe: the text is
 * split by WORDS only (never characters — per-character spans destroy
 * Arabic cursive joining and ligatures, a standing platform ruling),
 * each word wrapped in an overflow mask whose inner span rises from
 * below on first intersection.
 *
 * · Trigger: the battle-tested `useReveal` hook (fling-hardened,
 *   reduced-motion-aware — see hooks/useReveal.ts header). It adds
 *   `in-view` to the container; motion.css animates every
 *   `[data-mask-word]` inside.
 * · Stagger: DOM order. In RTL the first word renders rightmost, so
 *   the cascade reads right→left automatically — no direction math.
 * · Arabic descenders (س ج ي ن …) survive the mask: each mask carries
 *   vertical padding with matching negative margin (--mask-pad) so the
 *   clip box is taller than the line box.
 * · Above-the-fold and already-scrolled-past mounts render final
 *   (useReveal semantics) — content is never held hostage by the
 *   animation.
 * · Non-string children render untouched (safe by construction).
 *
 * See docs/immersive-redesign-plan.md §8, motion.css §mask-reveal.
 */
type MaskRevealProps = {
  /** Text content. Non-string children render as-is without masking. */
  children: React.ReactNode;
  /** Element to render (h1…h6, p, span, div). */
  as?: ElementType;
  className?: string;
  /** Extra base delay (ms) added before the first word. */
  delay?: number;
  /** Per-word stagger multiplier override (defaults to the token step). */
  maxStaggerWords?: number;
};

const WORD_SPLIT = /\s+/;

export function MaskReveal({
  children,
  as = 'span',
  className,
  delay = 0,
  maxStaggerWords = 8,
}: MaskRevealProps): JSX.Element {
  const ref = useReveal<HTMLElement>({ threshold: 0.2 });

  // Only plain string payloads are masked — rich children pass through
  // so the component is drop-in safe everywhere.
  const words =
    typeof children === 'string' && children.trim().length > 0
      ? children.trim().split(WORD_SPLIT)
      : null;

  if (!words) {
    return createElement(as, { className, ref }, children);
  }

  return createElement(
    as,
    { className, ref, 'data-mask-reveal': 'true' },
    words.map((word, i) => {
      // Cap the stagger so long headlines finish as one gesture; the
      // tail words share the final step. Whitespace between inline
      // blocks comes from the natural gap (inline flow) — a space
      // string would collapse inside the flex-less flow.
      const staggerIndex = Math.min(i, maxStaggerWords);
      return createElement(
        'span',
        {
          key: `${word}-${i}`,
          'data-mask-word': 'true',
          style: {
            '--mask-delay': `calc(${delay}ms + ${staggerIndex} * var(--motion-stagger-step))`,
          } as React.CSSProperties,
        },
        createElement('span', { 'data-mask-word-inner': 'true' }, word),
      );
    }),
  );
}
