/**
 * BootLog — R340 T-P1x — the landing's scroll-tied status strip.
 *
 * The blind panel's criterion 7 finding: the reference keeps a
 * scroll-incremented boot-log (7 progress elements recorded) so "you
 * always know where you are"; ours had a single progress element.
 * The ScrollRule (T-18 A6) is the rule pair + % readout; THIS strip is
 * the status twin — Madarek's OWN construction in the drafting-paper
 * instrument language (never the reference's text):
 *
 *   · a 1px fill rail (scaleY over the document — composited, the
 *     motion-gate law) with an ink track and an accent fill;
 *   · a mono counter `[ 03 / 09 ]` (ASCII digits in --font-mono, the
 *     landing's own [nn] numeral family, dir=ltr so the pair never
 *     flips in the RTL sheet);
 *   · a stage word — the CURRENT section's own name in the body
 *     voice (original Arabic, ≥768px only: the phone keeps only the
 *     counter + rail, the panel's mobile-density lesson).
 *
 * All three are registered in window.__madarekProgress (see
 * lib/progressRegistry.ts) for the conformance instrument. Reduced
 * motion never mounts the strip (matchMedia guard + the boot-log.css
 * display:none belt); it is decorative chrome — pointer-events none,
 * the scroll-rule's own ladder seat (content < 45 < chrome 50 < nav 60).
 */
import { useEffect, useRef } from 'react';
import { registerProgressSeat } from '../../../lib/progressRegistry';
import { useReducedMotion } from '../../motion/useReducedMotion';
import '../../../styles/landing/boot-log.css';

/** The landing's nine stages, in document order (our own names — the
 *  sections' aria-labels' own vocabulary, never the reference's copy). */
const STAGES: ReadonlyArray<{ sel: string; name: string }> = [
  { sel: 'section.fo-hero', name: 'الافتتاح' },
  { sel: 'div#statement.st-section', name: 'البيان' },
  { sel: 'section#live.pm-section', name: 'الأوجاع' },
  { sel: 'section.wy-section', name: 'المراحل' },
  { sel: 'section#chapters.chapters', name: 'الخريطة' },
  { sel: 'section#product.pr-section', name: 'المنصّة' },
  { sel: 'section#roles.rl-section', name: 'الأدوار' },
  { sel: 'section#vision.fo-cta', name: 'الدعوة' },
  { sel: 'footer.fo-footer', name: 'الخاتمة' },
] as const;

/** Arabic voice for the counter is ASCII-in-mono (the [nn] family);
 *  the string is composed LTR so 03/09 never flips in the RTL sheet. */
const counterText = (idx: number, total: number): string => {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(idx)} / ${two(total)}`;
};

export function BootLog() {
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const countRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  /* RM guard — same law as ScrollRule: reduced motion never mounts
   * (the canonical single-source hook; jsdom-safe → false → mounted,
   * the boot-log.css display:none belt still bounds it). */
  const reduced = useReducedMotion();

  /* The one driver: rAF-throttled passive scroll/resize listener.
   * Writes are idempotent per frame (textContent skipped when
   * unchanged; transform always composited) — zero renders, the same
   * cost discipline as the ScrollRule's % readout. It also refreshes
   * the registry ranges (max scroll is viewport-derived). */
  useEffect(() => {
    if (reduced) return undefined;
    const fill = fillRef.current;
    const count = countRef.current;
    const stage = stageRef.current;
    if (!fill || !count) return undefined;

    /* resolve the stage seats once (they are static markup); the
     * stage word shows the LAST stage whose top passed 40% vh. */
    const seats = STAGES
      .map(({ sel }) => document.querySelector(sel))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);

    const counterSeat = { el: count, label: 'bl-count', range: [0, 1] as [number, number] };
    const fillSeat = { el: fill, label: 'bl-fill', range: [0, 1] as [number, number] };
    const stageSeat = stage
      ? { el: stage, label: 'bl-stage', range: [0, 1] as [number, number] }
      : null;
    const unreg = [
      registerProgressSeat(counterSeat),
      registerProgressSeat(fillSeat),
      ...(stageSeat ? [registerProgressSeat(stageSeat)] : []),
    ];

    let raf = 0;
    let lastCount = '';
    let lastName = '';
    const update = () => {
      raf = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      fill.style.transform = `scaleY(${p})`;
      const idx = Math.max(1, seats.reduce(
        (acc, el) => (el.getBoundingClientRect().top <= window.innerHeight * 0.4 ? acc + 1 : acc),
        0,
      ));
      const text = counterText(idx, seats.length || 9);
      if (text !== lastCount) {
        count.textContent = text;
        lastCount = text;
      }
      const name = STAGES[Math.min(idx, STAGES.length) - 1]?.name ?? '';
      if (stage && name !== lastName) {
        stage.textContent = name;
        lastName = name;
      }
      for (const s of [counterSeat, fillSeat, stageSeat]) {
        if (s) s.range = [0, max];
      }
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
      unreg.forEach((u) => u());
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="bl" aria-hidden="true">
      <span className="bl-rail"><span className="bl-fill" ref={fillRef} /></span>
      <div className="bl-count" dir="ltr" ref={countRef}>01 / 09</div>
      <div className="bl-stage" ref={stageRef}>الافتتاح</div>
    </div>
  );
}
