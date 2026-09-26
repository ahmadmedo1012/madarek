/**
 * JourneyRail — «سجلّ الرحلة» (5-B2, landing signature move).
 *
 * A persistent RTL-native journey ledger fixed to the inline-start edge
 * of the public landing page. Seven real academic stages (التسجيل →
 * الكليّات → المحاضرات → الاختبارات → البحوث → المجتمع → التخرّج) are
 * stamped, one-way, as the visitor scrolls past each mapped section —
 * a trace of where they have been (feel.md §4). Scroll position is the
 * playhead; the current stage carries its label; the rail doubles as
 * click-navigation via real anchor links.
 *
 * Contract:
 *   - Stage order MUST match document order of the mapped sections
 *     (the stamping is monotonic by construction).
 *   - One-way stamps: a stage stays stamped once reached (the ledger
 *     never un-stamps when scrolling back up).
 *   - Keyboard accessible: real <a href="#…"> links, aria-current on
 *     the active stage, labels revealed on :focus-visible.
 *   - prefers-reduced-motion: identical logic — stamps appear without
 *     animation (all transitions/animations are token-based and
 *     flattened by the global belt; the stamp keyframe carries its own
 *     off-switch in landing.css).
 *   - Hidden ≤920px via CSS (landing.css); the scroll sampling is one
 *     rAF-throttled passive listener over seven cached elements, so the
 *     cost of running it on mobile is negligible.
 *   - The final stage renders the GraduationCap mark; when it stamps
 *     (the closing CTA act is reached) the rail reports `is-complete`
 *     and the graduation label stays visible — the journey resolves
 *     exactly where the page does.
 */
import { useEffect, useRef, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Icon } from '../Icon';

export interface JourneyStage {
  /** Id of the mapped landing section (also the anchor target). */
  id: string;
  /** Arabic stage label shown on the rail stop. */
  label: string;
}

/** 5-B2: stages map 1:1 onto the landing acts, in journey order. */
export const JOURNEY_STAGES: readonly JourneyStage[] = [
  { id: 'top', label: 'التسجيل' },
  { id: 'campus', label: 'الكليّات' },
  { id: 'flipped', label: 'المحاضرات' },
  { id: 'exams', label: 'الاختبارات' },
  { id: 'proof', label: 'البحوث' },
  { id: 'roles', label: 'المجتمع' },
  { id: 'close', label: 'التخرّج' },
] as const;

/** Stage counts as "reached" once its section top passes this viewport fraction. */
const STAMP_LINE = 0.75;
/** Stage counts as "current" once its section top passes this viewport fraction. */
const CURRENT_LINE = 0.5;

export function JourneyRail({ stages = JOURNEY_STAGES }: { stages?: readonly JourneyStage[] }) {
  const [state, setState] = useState({ stamped: 0, current: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    const targets = stages.map((s) => document.getElementById(s.id));
    // local mirrors of the last-published state — the effect closure
    // outlives re-renders, so comparisons must not read stale state.
    let stamped = -1;
    let current = -1;

    const sample = () => {
      const vh = window.innerHeight;
      let reached = 0;
      let nextCurrent = 0;
      for (let i = 0; i < targets.length; i++) {
        const el = targets[i];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= vh * STAMP_LINE) reached = Math.max(reached, i + 1);
        if (top <= vh * CURRENT_LINE) nextCurrent = i;
      }
      // one-way: the local `stamped` mirror is a high-water mark, so
      // scrolling back up moves the playhead but never un-stamps.
      const nextStamped = Math.max(stamped, reached);
      if (nextStamped !== stamped || nextCurrent !== current) {
        stamped = nextStamped;
        current = nextCurrent;
        setState({ stamped, current });
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(sample);
    };

    sample();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [stages]);

  const last = stages.length - 1;
  const complete = state.stamped >= stages.length;
  // Track fill spans first-centre → last-centre: k stamps → (k-1)/(n-1).
  const fill = Math.max(0, (state.stamped - 1) / Math.max(1, last));

  return (
    <nav className={`journey-rail${complete ? ' is-complete' : ''}`} aria-label="مراحل الرحلة الجامعية">
      <span className="journey-rail-track" aria-hidden>
        <span
          className="journey-rail-fill"
          style={{ ['--rail-fill' as string]: fill }}
        />
      </span>
      <ol>
        {stages.map((stage, i) => {
          const cls = [
            i === last ? 'is-cap-stop' : '',
            i < state.stamped ? 'is-stamped' : '',
            i === state.current ? 'is-current' : '',
          ].filter(Boolean).join(' ');
          return (
            <li key={stage.id}>
              <a
                href={`#${stage.id}`}
                className={cls}
                aria-current={i === state.current ? 'location' : undefined}
              >
                <span className="journey-rail-dot" aria-hidden>
                  {i === last ? <Icon icon={GraduationCap} size={12} /> : null}
                </span>
                <span className="journey-rail-label">{stage.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
