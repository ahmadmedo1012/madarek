/**
 * reveals — R333 (P-C) — the ONE scroll-reveal recipe for the landing's
 * second half (Heron-craft §2 themes 6–7: a single reused grammar —
 * `imgCardReveal` scale 0.8→1 · 1.6s `expo.out` for drawn cards, and a
 * `blockRise` y 24→0 · 0.9s `power3.out` for blocks — with hierarchy
 * from SCALE, never from recipe proliferation).
 *
 * ── Grammar (the measured staggers) ─────────────────────────────────
 *   lines  (display headings)   stagger 80ms   y 24→0 + fade, 0.9s power3.out
 *   items  (list rows, lede…)   stagger 60ms   y 24→0 + fade, 0.9s power3.out
 *   cards  (drawn art panels)   —              scale 0.8→1 + fade, 1.6s expo.out
 *
 * ── ARABIC SHAPING SAFEGUARD (non-negotiable) ───────────────────────
 * Arabic is cursive: word/char splitting produces ISOLATED letter
 * forms, and even line-level splitting was measured live to corrupt
 * the RTL CTA title (a trailing «؟» isolated on its own line + an
 * empty <em> shell). So SplitText 'lines' runs ONLY for non-Arabic
 * display; every Arabic element — display or body — animates as ONE
 * whole block (y/opacity), words never split into individual spans.
 *
 * ── Engine seam ─────────────────────────────────────────────────────
 * The app mounts Lenis on WINDOW (window.__mdrkLenis — lib/motion/
 * sheetLenis.ts); window scroll is native, so ScrollTrigger needs NO
 * scrollerProxy and NO second ticker: registerPlugin(ScrollTrigger)
 * and the default `scroller: window` is the existing engine.
 *
 * ── Progressive enhancement + reduced motion ────────────────────────
 * Content ships VISIBLE. The hidden state is written by gsap.set (in a
 * layout effect, pre-paint) only after this module is live — never by
 * a static CSS rule — so a failed import/JS death can never hide
 * copy. Under prefers-reduced-motion initReveals() bails entirely and
 * the elements keep their authored final state (the reveals.css belt
 * enforces the same outcome against any stale inline state).
 *
 * ── Idempotency / lifecycle ─────────────────────────────────────────
 * window.__mdrkReveals guards double init; destroy() kills every
 * trigger, reverts every split, clears inline state and the armed root
 * class — safe for landing remounts (React 18 double-effect included).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/** Root seam class — added BEFORE any trigger exists (the arm order). */
const ARMED_CLASS = 'js-reveal-armed';

/** Grammar targets — the landing's second half (P-C sheets). */
const LINES_SEL = '.fo-cta-title'; // display heading → SplitText LINES only
const ITEM_SEL =
  '.pm-col, .rl-row, .fo-cta-lede, .fo-cta-actions, .fo-cta-meta';
const CARD_SEL = '.pm-artzone .pm-art, .fo-cta-sketch'; // drawn panels

export interface RevealsHandle {
  destroy(): void;
}

interface RevealsWindow extends Window {
  __mdrkReveals?: RevealsHandle;
}

let pluginsReady = false;
function ensurePlugins(): void {
  if (pluginsReady) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  pluginsReady = true;
}

/** Final-state writer — the only place hidden state exists (JS-only). */
function settle(el: Element): void {
  gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: 'transform' });
}

export function initReveals(): RevealsHandle {
  const noop: RevealsHandle = { destroy() {} };
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return noop;
  }
  const w = window as RevealsWindow;
  if (w.__mdrkReveals) return w.__mdrkReveals; // idempotent — never double-arm
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return noop; // RM: bail entirely — content stays in final state
  }

  ensurePlugins();
  // The ARM SEAM comes first: root class, then hidden state, then triggers.
  document.documentElement.classList.add(ARMED_CLASS);

  const lines = gsap.utils.toArray<HTMLElement>(LINES_SEL);
  const items = gsap.utils.toArray<HTMLElement>(ITEM_SEL);
  const cards = gsap.utils.toArray<HTMLElement>(CARD_SEL);
  const triggers: ScrollTrigger[] = [];
  const splits: SplitText[] = [];
  const mobile = window.matchMedia('(max-width: 767px)').matches;

  /* Lines — display headings. ARABIC SHAPING GUARD: Arabic is cursive
   * and RTL — SplitText's line segmentation was measured LIVE (r333
   * evidence) to isolate a trailing «؟» on its own line and to leave
   * an empty <em> shell on the CTA title, so any Arabic-bearing
   * display element animates as ONE whole block (the same blockRise
   * recipe, per-element) and SplitText 'lines' stays reserved for
   * non-Arabic display. Words/chars are never split in either branch. */
  const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  lines.forEach((el) => {
    let targets: Element[] = [el];
    if (!mobile && !ARABIC.test((el.textContent || '').slice(0, 64))) {
      try {
        const split = new SplitText(el, {
          type: 'lines',
          linesClass: 'mdrk-line',
        });
        splits.push(split);
        targets = split.lines;
      } catch {
        targets = [el]; // split failure must never hide the heading
      }
    }
    gsap.set(targets, { opacity: 0, y: 24 });
    triggers.push(
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () =>
          gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.08, // the measured 80ms line stagger
            overwrite: 'auto',
          }),
      }),
    );
  });

  /* Items — rows and copy blocks rise as WHOLE elements (never split
   * Arabic words). Batch keeps the 60ms item stagger within each
   * viewport-entry group. y-only: no x wipes — direction-safe in RTL. */
  if (items.length) {
    gsap.set(items, { opacity: 0, y: 24 });
    ScrollTrigger.batch(items, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        batch.forEach((el) => el.classList.add('in-view')); // .pm-draw draw-in seam
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.06, // the measured 60ms item stagger
          overwrite: 'auto',
        });
      },
    });
  }

  /* Cards — the Heron imgCardReveal: scale 0.8→1 · 1.6s expo.out on
   * the drawn panels (pain plates + the CTA sketch). Scale/opacity
   * only — geometry stays direction-agnostic. */
  cards.forEach((el) => {
    gsap.set(el, { opacity: 0, scale: 0.8 });
    triggers.push(
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () =>
          gsap.to(el, {
            opacity: 1,
            scale: 1,
            duration: 1.6,
            ease: 'expo.out',
            overwrite: 'auto',
          }),
      }),
    );
  });

  /* Fling/scroll-restoration belt — anything already above the fold
   * line when we arm (mid-page restore, back-nav) settles instantly;
   * a one-shot trigger must never hold content below its start. */
  const settlePassed = () => {
    const fold = window.innerHeight;
    [...lines, ...items, ...cards].forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top < fold * 0.12) settle(el);
    });
  };
  settlePassed();

  const onFonts = () => ScrollTrigger.refresh();
  if (typeof document.fonts !== 'undefined' && document.fonts?.ready) {
    void document.fonts.ready.then(onFonts).catch(() => undefined);
  }

  const handle: RevealsHandle = {
    destroy() {
      triggers.forEach((t) => t.kill());
      splits.forEach((s) => {
        try {
          s.revert();
        } catch {
          /* already reverted */
        }
      });
      [...lines, ...items, ...cards].forEach((el) =>
        gsap.set(el, { clearProps: 'opacity,transform' }),
      );
      document.documentElement.classList.remove(ARMED_CLASS);
      delete w.__mdrkReveals;
    },
  };
  w.__mdrkReveals = handle;
  return handle;
}
