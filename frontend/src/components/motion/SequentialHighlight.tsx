import { useId } from 'react';
import { useScrollProgress } from './useScrollProgress';

/**
 * SequentialHighlight — the learning-path timeline (immersive wave 1).
 *
 * A list whose items light up in sequence as the user scrolls through
 * the scene — the reference site's "P-001…P-020 active-pill walk"
 * adapted for Madarek's syllabus narrative (الفصل المعكوس → المصفوفة
 * → الذكاء → …). Pure React + CSS classes: the hook reports 0…1
 * progress, this component derives the active index; CSS (landing
 * sheets) owns the visual choreography so each scene can skin it.
 *
 * · Progressive: EVERY item at or below the active index stays lit —
 *   progress reads as accumulation (knowledge builds), never as a
 *   lone cursor. The active item additionally carries data-active for
 *   its "now" treatment.
 * · Deterministic mapping: index = floor(progress × n) clamped to n−1;
 *   at rest (progress 0) the first item is lit — the scene always
 *   reads as a journey in motion, never an empty list.
 * · Reduced motion: useScrollProgress quantizes (default 0.05) and
 *   disables lerp, so updates are discrete steps; keyboard/AT users
 *   get the same full content — items are real list items with
 *   visible text at every moment (no hidden-behind-animation state).
 * · Zero layout side effects: this component never transforms items —
 *   animation is delegated to CSS transitions on color/opacity
 *   (paint-only properties).
 *
 * See docs/immersive-redesign-plan.md §6 scene 4, §8.
 */
export type SequentialItem = {
  /** Stable key (used as React key + id fragment). */
  id: string;
  /** Coded metadata label, e.g. ( م-٠١ ) — mono voice. */
  code?: string;
  /** Item title (Arabic UI copy). */
  title: string;
  /** One-line description. */
  description?: string;
};

type SequentialHighlightProps = {
  items: SequentialItem[];
  /** Extra classes for the scene wrapper. */
  className?: string;
  /** aria-label for the list (Arabic). */
  label: string;
  /**
   * Fraction of the travel spent "holding" the last item so the final
   * step doesn't flick past at scene exit. Default 0.1.
   */
  tailHold?: number;
};

export function SequentialHighlight({
  items,
  className,
  label,
  tailHold = 0.1,
}: SequentialHighlightProps): JSX.Element {
  const listId = useId();
  const [ref, progress] = useScrollProgress<HTMLDivElement>();

  const n = items.length;
  // Map 0…(1−tailHold) of travel onto items 0…n−1; the tail holds the
  // last item. Guarded for degenerate n (renders an empty ordered list
  // rather than crashing — same honesty rule as EmptyState surfaces).
  const effective = n > 0 ? Math.max(1 - tailHold, 0.05) : 1;
  const scaled = Math.min(progress / effective, 1);
  const activeIndex = n > 0 ? Math.min(n - 1, Math.floor(scaled * n)) : -1;

  return (
    <div ref={ref} className={className} data-sequential-scene="true">
      <ol className="sequential-list" aria-label={label} data-count={n}>
        {items.map((item, i) => {
          const lit = i <= activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={item.id}
              id={`${listId}-${item.id}`}
              className="sequential-item"
              data-lit={lit ? 'true' : 'false'}
              data-active={active ? 'true' : 'false'}
              aria-current={active ? 'step' : undefined}
            >
              {item.code != null && item.code.length > 0 && (
                <span className="sequential-code" aria-hidden="true">
                  {item.code}
                </span>
              )}
              <span className="sequential-title">{item.title}</span>
              {item.description != null && item.description.length > 0 && (
                <span className="sequential-desc">{item.description}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
