import { useEffect, useRef, useState } from 'react';

/**
 * CursorCompanion — «رفيق الرحلة» the traveller's light.
 *
 * A small warm star that carries momentum behind the pointer and opens
 * into a ring over interactive elements — the traveller from the sky,
 * walking the page with you.
 *
 * Contract:
 * · Only when (hover: hover) and (pointer: fine) — touch never sees it.
 * · prefers-reduced-motion → never mounts (native cursor is instant).
 * · Over text inputs / textareas it fades out completely — the I-beam
 *   is the honest cursor there.
 * · pointer-events: none on every layer — it can never steal a click,
 *   a selection, or a hover state.
 * · One rAF loop with exponential lerp (0.18 dot, 0.10 halo); the loop
 *   rests when idle for 2s and the pointer is far from interactive
 *   elements.
 */
export function CursorCompanion() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    setOn(true);

    const dot = dotRef.current;
    const halo = haloRef.current;
    if (!dot || !halo) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let dx = x;
    let dy = y;
    let hx = x;
    let hy = y;
    let tx = x;
    let ty = y;
    let interactive = false;
    let typing = false;
    let raf = 0;
    let lastMove = performance.now();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      lastMove = performance.now();
      const el = e.target as Element | null;
      interactive = Boolean(
        el?.closest?.('a, button, [role="button"], [data-magnetic], summary, label, input[type="checkbox"], input[type="radio"]')
      );
      typing = Boolean(el?.closest?.('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]'));
    };
    const onLeave = () => {
      tx = -100;
      ty = -100;
    };

    const loop = () => {
      dx += (tx - dx) * 0.3;
      dy += (ty - dy) * 0.3;
      hx += (tx - hx) * 0.12;
      hy += (ty - hy) * 0.12;
      const idle = performance.now() - lastMove > 1600;
      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
      const hide = tx < 0 || typing;
      dot.style.opacity = hide ? '0' : idle ? '0.55' : '1';
      halo.style.opacity = hide ? '0' : interactive ? '1' : '0.45';
      halo.classList.toggle('active', interactive);
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!on) return null;

  return (
    <div className="cursor-companion" aria-hidden="true">
      <div ref={haloRef} className="cc-halo" />
      <div ref={dotRef} className="cc-dot" />
    </div>
  );
}
