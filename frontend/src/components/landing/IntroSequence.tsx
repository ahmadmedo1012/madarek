import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * IntroSequence — «طقس الدخول» the branded boot intro (chapters v4).
 *
 * A ~1.7s single GSAP timeline, transform/opacity only (the counter is a
 * text clock, the exit wipe is a clip-path — both mandated):
 *
 *   0.00 → 0.50  wordmark «مدارك» rises (Cairo 900) + gold underline draws
 *   0.24 → 0.82  three mono boot-log lines, one every 180ms, each with a
 *                blinking gold cursor that hops to the ACTIVE line
 *   0.00 → 1.40  mono counter 000 → 100 (tabular, ltr) on the same clock
 *   1.40 → 1.70  content lifts out, then the overlay clip-wipes upward —
 *                onComplete fires at the WIPE START so the hero underneath
 *                can begin its entrance during the wipe.
 *
 * · Click anywhere (or the keyboard-reachable skip button) jumps to the
 *   exit label — never past it, so onComplete fires exactly once.
 * · prefers-reduced-motion: onComplete() is called immediately on mount
 *   and nothing renders — no ritual, no waiting.
 * · sessionStorage gating is intentionally NOT done here (parent's job);
 *   after the timeline finishes the component nulls itself out as a guard
 *   even if the parent forgets to unmount it.
 */

/** University truth — 25 colleges (backend seed / colleges.config). */
const COLLEGES_COUNT = 25;

/** Boot-log copy — the «machine» voice warming the knowledge core up. */
const LOG_LINES: readonly string[] = [
  'تشغيل نواة المعرفة…',
  `ربط ${COLLEGES_COUNT} كلّية بالمدارات…`,
  'ضبط مسار الرحلة…',
];

/** Timeline anchors (seconds) — one clock for every element. */
const T = {
  lineStart: 0.24, // first log line
  lineGap: 0.18, // ~180ms between lines
  lineDur: 0.22,
  counterDur: 1.4,
  exitAt: 1.4, // content lift begins
  wipeAt: 1.44, // clip-wipe begins → onComplete fires here
  wipeDur: 0.26, // 1.44 + 0.26 = 1.7s total
} as const;

interface IntroSequenceProps {
  onComplete: () => void;
}

export default function IntroSequence({ onComplete }: IntroSequenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [gone, setGone] = useState(false);
  // Read once — the ritual is skipped entirely for reduced-motion visitors.
  const [reduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Keep the callback fresh without re-running the timeline.
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reduced motion: hand control back to the page immediately, no overlay.
  useEffect(() => {
    if (reduced) onCompleteRef.current();
  }, [reduced]);

  /** onComplete fires exactly once — at wipe start or on skip. */
  const fireComplete = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onCompleteRef.current();
  };

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || reduced) return;

      const inner = root.querySelector<HTMLElement>('.ln-intro-inner');
      const word = root.querySelector<HTMLElement>('.ln-intro-wordmark');
      const underline = root.querySelector<HTMLElement>('.ln-intro-underline');
      const skipBtn = root.querySelector<HTMLElement>('.ln-intro-skip');
      const counterEl = counterRef.current;
      const lines = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-intro-log-line'),
      );
      const cursors = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-intro-cursor'),
      );
      if (
        !inner ||
        !word ||
        !underline ||
        !counterEl ||
        lines.length === 0 ||
        cursors.length === 0
      )
        return;

      const counter = { v: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: () => setGone(true), // self-unmount guard
      });
      tlRef.current = tl;

      // 0 → 0.5 · the wordmark rises from the void
      tl.fromTo(word, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0);
      // gold underline draws beneath it (solid bar — no decorative gradient)
      tl.fromTo(
        underline,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.42 },
        0.1,
      );

      // 0.24 → ~0.82 · boot log, one line every 180ms, cursor hops along
      lines.forEach((line, i) => {
        tl.fromTo(
          line,
          { y: 8, opacity: 0 },
          { y: 0, opacity: 1, duration: T.lineDur, ease: 'power2.out' },
          T.lineStart + i * T.lineGap,
        );
      });
      cursors.forEach((cursor, i) => {
        tl.fromTo(
          cursor,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.06 },
          T.lineStart + i * T.lineGap,
        );
        // the cursor leaves every line except the last one
        if (i < cursors.length - 1) {
          tl.to(
            cursor,
            { autoAlpha: 0, duration: 0.06 },
            T.lineStart + (i + 1) * T.lineGap,
          );
        }
      });

      // 0 → 1.4 · counter 000 → 100 on the same clock (text clock, tabular)
      tl.to(
        counter,
        {
          v: 100,
          duration: T.counterDur,
          ease: 'power1.inOut',
          onUpdate: () => {
            counterEl.textContent = String(Math.round(counter.v)).padStart(3, '0');
          },
        },
        0,
      );

      // 1.4 → 1.7 · exit — lift, then clip-wipe upward.
      // onComplete fires at the WIPE START so the hero enters beneath the wipe.
      tl.addLabel('exit', T.exitAt);
      tl.to(inner, { y: -40, opacity: 0, duration: 0.18, ease: 'power2.in' }, T.exitAt);
      // corner chrome (counter + skip) fades with the lift
      const chrome = [counterEl, skipBtn].filter(
        (el): el is HTMLElement => el !== null,
      );
      if (chrome.length > 0) {
        tl.to(chrome, { opacity: 0, duration: 0.12, ease: 'none' }, T.exitAt);
      }
      tl.fromTo(
        root,
        { clipPath: 'inset(0 0 0% 0)' },
        {
          clipPath: 'inset(0 0 100% 0)',
          duration: T.wipeDur,
          ease: 'power3.inOut',
          onStart: () => fireComplete(),
        },
        T.wipeAt,
      );
    },
    { scope: rootRef },
  );

  /** Click anywhere = skip: jump to the exit label (never past the wipe). */
  const skip = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (tl.time() < T.exitAt) {
      // play(label) suppresses callbacks while seeking — sync the counter by hand
      if (counterRef.current) counterRef.current.textContent = '100';
      tl.play('exit');
    }
  };

  if (reduced || gone) return null;

  return (
    <div className="ln-intro" ref={rootRef} onClick={skip}>
      <div className="ln-intro-inner">
        <div className="ln-intro-mark">
          <span className="ln-intro-wordmark">مدارك</span>
          <span className="ln-intro-underline" aria-hidden="true" />
        </div>
        <ul className="ln-intro-log">
          {LOG_LINES.map((line) => (
            <li className="ln-intro-log-line" key={line}>
              <span className="ln-intro-log-text">{line}</span>
              <span className="ln-intro-cursor" aria-hidden="true">
                <span className="ln-intro-cursor-block" />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <span className="ln-intro-counter" ref={counterRef} aria-hidden="true">
        000
      </span>
      <button type="button" className="ln-intro-skip" onClick={skip}>
        تخطّي
      </button>
    </div>
  );
}
