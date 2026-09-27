import { useEffect, useRef, useState } from 'react';

/**
 * PreloaderRitual — «انطباق الحلقات» the entry ritual.
 *
 * 2.4s, once per session, skippable by any input. The metaphor: three
 * misaligned brass rings (the sky's three planes) rotate into a single
 * instrument, «مدارك» sets in Kufi, then the ring dilates past the
 * viewport — you pass THROUGH the astrolabe into the world.
 *
 * Contract:
 * · sessionStorage `madarek.ritual.seen` — later visits land instantly.
 * · prefers-reduced-motion → 300ms plain fade, counter shows 100.
 * · No focus trap: overlay is aria-hidden; Tab moves the real page.
 * · Scroll locked for the ritual's life only; restored on exit/skip.
 * · Pure CSS keyframes for the choreography (compositor-friendly);
 *   JS only drives the counter and the exit transition.
 */
export function PreloaderRitual({ onDone }: { onDone?: () => void }) {
  const [n, setN] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);
  const doneRef = useRef(false);
  // onDone via ref — the effect must NEVER re-run (an inline arrow identity
  // changing on a parent re-render re-locked the page scroll forever; the
  // component had already rendered null and nobody cleaned it up).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DURATION = reduced ? 300 : 1650;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setExiting(true);
      document.documentElement.style.overflow = '';
      window.setTimeout(() => {
        setGone(true);
        onDoneRef.current?.();
      }, reduced ? 320 : 780);
    };

    document.documentElement.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    // counter 0→100 eased
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const timer = window.setTimeout(finish, DURATION + 20);
    const skip = () => finish();
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      document.documentElement.style.overflow = '';
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`ritual${exiting ? ' exiting' : ''}`}
      aria-hidden="true"
      role="presentation"
    >
      <div className="ritual-stage">
        <svg className="ritual-rings" viewBox="0 0 200 200" fill="none">
          {/* three rings, misaligned, rotating into one instrument */}
          <circle className="ritual-ring r0" cx="100" cy="100" r="88" />
          <circle className="ritual-ring r1" cx="100" cy="100" r="72" />
          <circle className="ritual-ring r2" cx="100" cy="100" r="55" />
          <circle className="ritual-core" cx="100" cy="100" r="3.2" />
        </svg>
        {/* the climax bloom — the world ignites when the rings align */}
        <span className="ritual-bloom" aria-hidden="true" />
        <div className="ritual-word">
          <span className="ritual-word-char">م</span>
          <span className="ritual-word-char">د</span>
          <span className="ritual-word-char">ا</span>
          <span className="ritual-word-char">ر</span>
          <span className="ritual-word-char">ك</span>
        </div>
        <div className="ritual-meta">
          <span className="ritual-counter">{String(n).padStart(3, '0')}</span>
          <span className="ritual-label">جامعة الزاوية · أطلس المعرفة</span>
        </div>
      </div>
    </div>
  );
}
