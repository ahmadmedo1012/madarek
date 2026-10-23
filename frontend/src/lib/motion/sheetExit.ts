/**
 * sheetExit — R308 «مغادرة اللوحة» → R313 (D11) — the guest exit sweep.
 *
 * The reference changes routes through a geometric mask sweep (Barba
 * in sync mode: --trans-percent 0→50% over ≈755ms, then the inverse
 * --mask-percent opens 50→100% by ≈1.6s total, an architectural
 * line-width spike at the midpoint, never a fade — reference digest
 * `routeTransition`, re-measured live in R313). Barba itself is
 * rejected for Madarek (it fights the React Router lifecycle); this
 * reproduces the observable COVER phase of the sweep with hard safety
 * rules:
 *
 *  · Navigation is NEVER delayed — the overlay is appended to
 *    document.body (it survives the route swap) and removes itself.
 *    The arrival phase (GuestReveal) starts when this cover ends,
 *    reproducing the reference's sequential 0.9s + 0.7s = 1.6s.
 *  · R313 override (D11): the old ~700ms “funnel-first” shortcut is
 *    superseded — the owner ordered the reference's 1.6s sequence.
 *    The funnel stays safe: navigation runs underneath, the overlay
 *    is pointer-events:none, popstate/RM skip it entirely.
 *  · Fine pointers without reduced motion only.
 */

import { sheetEase } from './sheetConductor';

/* R313 (D11): cover phase ≈0.9s (reference: --trans-percent reaches
 * 50% at ~897ms from click) + GuestReveal reveal ≈0.7s = ~1.6s total. */
const SWEEP_MS = 900;

let installed = false;
let coverEndsAt = 0;

/** Monotonic timestamp at which the in-flight cover phase ends (0 = none).
 * GuestReveal reads this to sequence its reveal AFTER the cover — the
 * reference's two-phase 1.6s sequence. */
export function sheetExitUntil(): number {
  return coverEndsAt;
}

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
    if (coverEndsAt && performance.now() >= coverEndsAt) coverEndsAt = 0;
    el.remove();
  };
  coverEndsAt = performance.now() + SWEEP_MS;

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
 * Install the guest-exit sweep on a root element (the guest boundary —
 * R313 D11: ALL public-page navigations, not just the landing). Returns
 * the uninstall function. Internal link clicks (`/…`, `mailto:`,
 * external URLs and modified clicks are ignored) trigger one cover
 * sweep while React Router navigates underneath. Idempotent (module
 * singleton) — multiple guest mounts share one listener.
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

  /* R313-int: CAPTURE phase — React Router's <Link> preventDefaults
   * during the bubble phase at the React root, which sits BETWEEN the
   * anchor and document.body; a bubble-phase document listener would
   * always see defaultPrevented=true and never play. Capture on the
   * body fires BEFORE any target handler (the R308 landing-root
   * placement achieved the same by living inside the React tree). */
  root.addEventListener('click', onClick, { capture: true });
  return () => {
    root.removeEventListener('click', onClick, { capture: true });
    installed = false;
  };
}
