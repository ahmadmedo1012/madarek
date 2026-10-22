/**
 * sheetExit — R308 «مغادرة اللوحة» — the landing-exit sweep.
 *
 * The reference changes routes through a geometric mask sweep (Barba
 * in sync mode: --trans-percent 0→50→100% against an inverse
 * --mask-percent, an architectural line-width spike at the midpoint,
 * ≈0.8s + 0.8s, never a fade — reference-observations.md §14). Barba
 * itself is rejected for Madarek (it fights the React Router
 * lifecycle); this reproduces the observable sweep as a landing-ONLY
 * exit flourish with hard safety rules:
 *
 *  · Navigation is NEVER delayed — the overlay is appended to
 *    document.body (it survives the route swap) and removes itself.
 *  · It plays only on INTERNAL link clicks leaving the landing, only
 *    for fine pointers without reduced motion (the funnel stays fast
 *    for everyone else — task speed over decoration).
 *  · ~700ms total (350 cover + 350 reveal), one animation, then the
 *    node is gone. No state, no leaks, no listener left behind.
 */

import { sheetEase } from './sheetConductor';

const SWEEP_MS = 700;

let installed = false;

function playSweep(): void {
  if (typeof document === 'undefined') return;
  if (typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch {
      return;
    }
  }
  if (typeof Element.prototype.animate !== 'function') return;

  const el = document.createElement('div');
  el.className = 'sx';
  el.setAttribute('aria-hidden', 'true');
  const bands = document.createElement('div');
  bands.className = 'sx-bands';
  const line = document.createElement('div');
  line.className = 'sx-line';
  el.append(bands, line);
  document.body.append(el);

  const cleanup = () => {
    el.remove();
  };

  /* the two-band polygon sweep: cover from the centre out, then
   * continue to the edges — one continuous clip-path animation. */
  const anim = bands.animate(
    [
      {
        clipPath:
          'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%, 0% 50%, 100% 50%, 100% 100%, 0% 100%)',
      },
      {
        clipPath:
          'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 100%, 0% 100%)',
      },
    ],
    { duration: SWEEP_MS, easing: sheetEase(), fill: 'forwards' },
  );

  /* the architectural line: a spike through the sweep's midpoint */
  line.animate(
    [
      { transform: 'scaleX(0)', opacity: 0 },
      { transform: 'scaleX(1)', opacity: 1, offset: 0.5 },
      { transform: 'scaleX(0)', opacity: 0 },
    ],
    { duration: SWEEP_MS, easing: sheetEase() },
  );

  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
  /* hard guarantee: even if the animation events never fire (tab
   * hidden mid-sweep), the overlay cannot outlive its animation. */
  window.setTimeout(cleanup, SWEEP_MS + 400);
}

/**
 * Install the landing-exit sweep on a landing root element. Returns
 * the uninstall function. Internal anchors (`#/…`, `mailto:`, external
 * URLs and modified clicks are ignored) leaving the page trigger one
 * sweep while React Router navigates underneath.
 */
export function installSheetExit(root: HTMLElement): () => void {
  if (installed || typeof document === 'undefined') return () => undefined;
  installed = true;

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const a = (e.target as Element | null)?.closest?.('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    playSweep();
  };

  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
    installed = false;
  };
}
