import { useEffect, useRef } from 'react';

/**
 * useStageScroll — the landing's pinned-scene scroll engine.
 *
 * The page is a film: N stages, each a tall block (≥150vh) whose content
 * is `position: sticky` at the top. As the user scrolls (native, never
 * hijacked), this engine computes:
 *
 *   · stageProgress — float 0…N (index + eased local progress) — drives
 *     the WebGL knowledge field's world morph.
 *   · per-stage CSS vars written directly on each element (no React
 *     re-renders): --p (raw local progress), --a (scene activation:
 *     fades in over the first 12%, holds, fades out over the last 12%).
 *
 * Reduced motion: activation snaps to 1 (scenes fully composed, static),
 * --p still updates so scroll-linked states (path drawing, pipeline
 * stations) settle instantly — nothing animates on its own.
 *
 * All listeners are passive; the rAF is coalesced; heights are cached
 * and only re-measured on resize.
 */

export type StageMeta = { index: number; el: HTMLElement; top: number; height: number };

export type StageScrollState = {
  /** float stage position 0…N−1 (index + eased progress within it) */
  stageProgress: number;
  /** integer index of the stage currently owning the viewport */
  active: number;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * @param containerRef the element wrapping all `.ln-stage` blocks.
 * @param onFrame     called (at most once per rAF) with the engine state —
 *                    used to drive the WebGL field. Never touches React state.
 */
export function useStageScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  onFrame?: (state: StageScrollState) => void,
) {
  const stagesRef = useRef<StageMeta[]>([]);
  const cbRef = useRef(onFrame);
  cbRef.current = onFrame;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let stageProgress = 0;
    let active = -1;

    const measure = () => {
      stagesRef.current = [...root.querySelectorAll<HTMLElement>('.ln-stage')].map((el, index) => {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        return { index, el, top, height: rect.height };
      });
    };

    const apply = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const scrollMid = window.scrollY + vh * 0.5; // stage owns viewport when its band crosses mid-screen
      let idx = 0;
      let local = 0;
      const stages = stagesRef.current;
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (!s) continue;
        if (scrollMid >= s.top) {
          idx = i;
          local = clamp01((scrollMid - s.top) / Math.max(1, s.height - vh));
        }
      }
      const eased = reduced ? Math.round(local) : easeInOut(local);

      // per-stage CSS vars — activation: stacked sticky stages are pushed
      // out NATURALLY by their parent's end (no exit fade needed — an exit
      // fade would blank the scene before the next one owns the viewport).
      // So: fade+slide in over the first 12% of the sticky range, hold at 1.
      for (const s of stages) {
        if (!s) continue;
        let a: number;
        if (reduced) a = 1;
        else if (s.index === 0) a = 1; // first scene is born visible
        else {
          const p = s.index === idx ? local : s.index < idx ? 1 : 0;
          a = Math.min(1, p / 0.12);
        }
        s.el.style.setProperty('--a', a.toFixed(4));
        s.el.style.setProperty('--p', (s.index === idx ? local : s.index < idx ? 1 : 0).toFixed(4));
      }

      stageProgress = Math.min(idx + eased, stages.length - 1);
      if (active !== idx) {
        active = idx;
        root.dataset.stage = String(idx);
      }
      cbRef.current?.({ stageProgress, active: idx });
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    measure();
    apply();

    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        measure();
        apply();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
    };
  }, [containerRef]);

  return stagesRef;
}
