/**
 * sheetLenis — R313 (4-b · D6) — the guest smooth-scroll engine.
 *
 * Heron's measured engine (audits/evidence/r313/reference/digest.json →
 * `scroll`): Lenis 1.1.5 driven by the single ticker — `lenis.raf(time)`
 * per frame, a ScrollTrigger.update on every lenis scroll event, an
 * 'idle' class after 150ms of scroll-quiet, and NO visible scrollbar.
 * Madarek's translation keeps the platform's own single clock:
 *
 *  · ONE Lenis instance on the WINDOW (owner decision, r313 4-b): the
 *    whole guest stack reads window scroll — useSheetScroll, the
 *    imperative landing chrome, CSS-sticky pins, ScrollResetOnPush and
 *    the e2e programmatic scrolls — and window-Lenis with lerp 0.1
 *    produces the identical inertia curve (probe tail ≈1540ms
 *    exponential glide). Heron's inner-wrapper architecture is NOT
 *    reproduced on purpose; the curve is.
 *  · Heron's exact effective params: lerp 0.1 (lerp mode — duration
 *    undefined), the constructor easing, wheelMultiplier 1,
 *    touchMultiplier 1, smoothWheel true, syncTouch true,
 *    smoothTouch false, infinite false (see HERON_LENIS_PARAMS).
 *  · The CONDUCTOR drives it (sheetConductor.ts — «الناظم»): a frame
 *    subscriber calls lenis.raf(now) on the shared rAF clock. Lenis
 *    1.1.5 starts nothing by itself — no internal loop exists — so the
 *    engine can ride the conductor's wake/sleep contract intact:
 *    the driver attaches on input (wheel/touch) and on lenis 'scroll'
 *    events, and detaches itself the first frame lenis reports it is
 *    not scrolling. An idle page still holds ZERO awake frames.
 *  · The driver must never see a stale Lenis clock: Lenis derives its
 *    lerp step from raf-to-raf deltaTime, so on every (re)attach the
 *    clock is stamped first (lenis.raf(performance.now())) — otherwise
 *    the first frame of a glide would swallow the whole idle gap as
 *    one step and snap instead of gliding.
 *  · Native-scroll parity for everything that is not a gesture:
 *    external window.scrollTo (e2e probes, ScrollResetOnPush's fallback)
 *    lands in Lenis's onNativeScroll, which resyncs the engine to the
 *    real position — nothing fights. An in-flight glide, however, is
 *    NOT resynced by 1.1.5 (onNativeScroll only syncs when it is not
 *    smooth-animating), which is why ScrollResetOnPush resets through
 *    lenis.scrollTo(0, { immediate: true }) while the engine is live.
 *  · The scrollbar disappears while the engine is live (Heron shows
 *    none): html[data-lenis-on] in base.css. An ATTRIBUTE, not a
 *    class, on purpose — Lenis 1.1.5's cleanUpClassName strips every
 *    *class* whose name contains "lenis" (/lenis(-\w+)?/g) on each
 *    scroll-state flip, so a ".lenis-on" class would be silently
 *    deleted by the library mid-scroll.
 *  · Heron's idle contract: 150ms of scroll-quiet → the engine's
 *    IDLE FLAG (JS-side). R321 §A1 — the flag was a
 *    html[data-lenis-idle] ATTRIBUTE before: every idle↔active flip
 *    mutated <html>, and an attribute change on the ROOT invalidates
 *    the ENTIRE document's computed styles — 30–180ms UpdateLayoutTree
 *    per crossing on the 8k-node landing (the #1 desktop scroll-jank
 *    driver, measured by the r316 harness + CDP invalidation trace).
 *    It had NO CSS consumer ("no visual consumer attached") — the
 *    observability contract moves to isGuestLenisIdle() (zero DOM
 *    cost). data-lenis-on stays: it is set ONCE per engine lifetime
 *    and base.css hides the scrollbar with it.
 *  · reduced-motion: NEVER init — native scroll under RM.
 *  · jsdom/SSR-safe: nothing touches window at import time; the
 *    engine only comes alive through initGuestLenis().
 */
import Lenis from 'lenis';
import { subscribeSheetFrame } from './sheetConductor';

/**
 * Heron's measured scroll params (digest r313 · `scroll`, read from
 * heronai-bp.netlify.app/main.js: `new Lenis({ wrapper, content,
 * syncTouch: !0, smoothWheel: !0, smoothTouch: !1, infinite: !1 })` —
 * everything else is the 1.1.5 constructor default). Declared in full
 * so the parity is test-pinned, never accidental. The wrapper stays
 * the WINDOW and the content document.documentElement — the 1.1.5
 * defaults this module relies on by omission, exactly like Heron
 * omits what it does not override.
 */
export const HERON_LENIS_PARAMS = {
  /** lerp mode (duration stays undefined) — Heron's 0.1 glide. */
  lerp: 0.1,
  /** undefined → the constructor's lerp branch, never a fixed duration. */
  duration: undefined,
  /** the 1.1.5 default easing, restated for the parity pin. */
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  syncTouch: true,
  /** Heron passes `smoothTouch: !1` literally from its pre-1.1 config;
   *  Lenis 1.1.5 DROPPED the key (touch smoothing is syncTouch alone —
   *  verified in dist/lenis.js). Kept in the spec for digest parity;
   *  inert at runtime by construction. */
  smoothTouch: false,
  infinite: false,
  wheelMultiplier: 1,
  touchMultiplier: 1,
} as const;

/** Heron's idle contract: ms of scroll-quiet before the idle marker. */
const IDLE_QUIET_MS = 150;

let lenis: Lenis | null = null;
let unsubFrame: (() => void) | null = null;
let offLenisScroll: (() => void) | null = null;
let idleTimer = 0;

function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── the frame driver ─────────────────────────────────────────────── */

/** One conductor frame: advance Lenis, then sleep the driver the
 *  moment Lenis reports no activity (the zero-idle-page property —
 *  the conductor falls asleep with it). */
function lenisFrame(now: number): void {
  if (!lenis) {
    detachFrame();
    return;
  }
  lenis.raf(now);
  if (!lenis.isScrolling) detachFrame();
}

/** Attach the driver to the conductor clock (idempotent). Re-attaching
 *  after a sleep stamps Lenis's clock first: without the stamp, the
 *  first driven frame would measure raf-to-raf deltaTime across the
 *  whole idle gap and snap the glide to its target in one step. */
function attachFrame(): void {
  if (!lenis || unsubFrame) return;
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    lenis.raf(performance.now()); /* clock stamp — see header; animate is idle here */
  }
  unsubFrame = subscribeSheetFrame(lenisFrame);
}

function detachFrame(): void {
  if (unsubFrame) {
    unsubFrame();
    unsubFrame = null;
  }
}

/* ── input bootstrap + the idle marker ────────────────────────────── */

/**
 * The gestures that START a glide arrive as DOM events on window; Lenis
 * only queues the target inside its own handlers (its animation advances
 * exclusively inside raf), so these capture-phase listeners attach the
 * driver just before Lenis's own (bubble-phase) handlers run — the first
 * frame of the glide is never missed. passive: Lenis owns the
 * preventDefault; these listeners never block anything. touchend is
 * included: Lenis computes touch inertia there, and the driver may have
 * detached if the touch glide completed before the finger lifted.
 */
function onInput(): void {
  attachFrame();
  bumpIdle();
}

/** Lenis 'scroll' events: keep the driver alive through the glide (and
 *  re-attach if an external native scroll woke the engine), then bump
 *  the 150ms idle timer (Heron's scroll-quiet contract). */
function onLenisScroll(): void {
  attachFrame();
  bumpIdle();
}

/** 150ms of scroll-quiet → the idle FLAG; any activity clears it and
 * restarts the timer. R321 §A1 — JS-side seat: the R313 attribute
 * seat (html[data-lenis-idle]) mutated <html> per idle↔active flip,
 * and a root-attribute change invalidates the ENTIRE document's
 * computed styles (30–180ms UpdateLayoutTree per crossing on the
 * 8k-node landing — the #1 desktop scroll-jank driver, measured by
 * the r316 harness + the CDP invalidation trace). Zero CSS consumers
 * existed; observability rides isGuestLenisIdle(). */
let lenisIdle = false;

/** R321 §A1 — the idle observability seat (was html[data-lenis-idle]). */
export function isGuestLenisIdle(): boolean {
  return lenisIdle;
}

function bumpIdle(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (idleTimer) window.clearTimeout(idleTimer);
  if (lenisIdle) lenisIdle = false;
  idleTimer = window.setTimeout(() => {
    idleTimer = 0;
    if (lenis) {
      lenisIdle = true;
    }
  }, IDLE_QUIET_MS);
}

/* ── lifecycle ─────────────────────────────────────────────────────── */

/** The live engine, or null (tests + ScrollResetOnPush's reset path). */
export function getLenis(): Lenis | null {
  return lenis;
}

/** Introspection twin of getLenis() for cheap boolean assertions. */
export function isGuestLenisOn(): boolean {
  return lenis !== null;
}

/**
 * Bring the engine up on a guest/public window-scrolled route.
 * Idempotent (StrictMode-safe). Returns false — with NO engine — when
 * reduced-motion is on (native scroll under RM) or there is no window;
 * call sites treat both as "stay native".
 */
/* R313-int: the shared scroll lock (lib/scrollLock.ts — menus, drawers,
 * dialogs) must PAUSE the engine: Lenis writes window.scrollTo
 * programmatically, which no overflow rule can stop. The lock toggles
 * `mdrk-scroll-locked` on <html>; this observer mirrors it onto the
 * engine. One observer per engine lifetime, cleaned up on destroy. */
let lockObserver: MutationObserver | null = null;

function watchScrollLock(): void {
  if (lockObserver || typeof MutationObserver === 'undefined') return;
  const sync = () => {
    if (!lenis) return;
    if (document.documentElement.classList.contains('mdrk-scroll-locked')) {
      lenis.stop();
    } else {
      lenis.start();
    }
  };
  lockObserver = new MutationObserver(sync);
  lockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  sync();
}

function unwatchScrollLock(): void {
  lockObserver?.disconnect();
  lockObserver = null;
}

export function initGuestLenis(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (lenis) return true;
  if (reducedMotion()) return false; /* RM: NEVER init — native scroll */

  lenis = new Lenis({ ...HERON_LENIS_PARAMS });
  document.documentElement.setAttribute('data-lenis-on', '');
  watchScrollLock();
  offLenisScroll = lenis.on('scroll', onLenisScroll) || null;
  window.addEventListener('wheel', onInput, { passive: true, capture: true });
  window.addEventListener('touchstart', onInput, { passive: true, capture: true });
  window.addEventListener('touchmove', onInput, { passive: true, capture: true });
  window.addEventListener('touchend', onInput, { passive: true, capture: true });
  return true;
}

/**
 * Tear the engine down (route entered an authenticated shell surface).
 * Idempotent; restores <html> exactly (engine marker, idle marker and
 * Lenis's own root classes all go).
 */
export function destroyGuestLenis(): void {
  unwatchScrollLock();
  detachFrame();
  if (idleTimer) {
    if (typeof window !== 'undefined') window.clearTimeout(idleTimer);
    idleTimer = 0;
  }
  if (typeof document !== 'undefined') {
    document.documentElement.removeAttribute('data-lenis-on');
  }
  lenisIdle = false;
  if (typeof window !== 'undefined') {
    window.removeEventListener('wheel', onInput, { capture: true });
    window.removeEventListener('touchstart', onInput, { capture: true });
    window.removeEventListener('touchmove', onInput, { capture: true });
    window.removeEventListener('touchend', onInput, { capture: true });
  }
  if (offLenisScroll) {
    offLenisScroll();
    offLenisScroll = null;
  }
  lenis?.destroy();
  lenis = null;
}
