import { PREFERS_REDUCED_MOTION } from '../lib/motion-media';
/**
 * reveals — R333 (P-C) — the ONE scroll-reveal recipe for the landing's
 * second half, riding the HOUSE reveal contract (heron-craft §2 themes
 * 6–7: a single reused grammar with hierarchy from SCALE, never from
 * recipe proliferation).
 *
 * ── The house contract (shared.css `.reveal-up` / `.reveal-d-N`) ─────
 *   `.reveal-up`          opacity 0 + translateY(14px)
 *   `.reveal-up.in-view`  opacity 1 + translateY(0)
 *   transition            var(--t-slower) var(--ease-out)  ← the r305
 *                         Heron-register re-key (expo-family curve)
 *   `.reveal-d-1..5`      transition-delay 80/160/240/320/400ms
 *   `.reveal-card`        this sheet's card rung (below): scale
 *                         0.8→1 + fade on var(--motion-duration-card)
 *
 * Why classes, not a JS animation library: the motion-tokens gate
 * scans .ts too — raw durations/easings in TS are gate violations —
 * and the repo's canonical reveal grammar is CSS-class-driven
 * (hooks/useReveal.ts: the belt writes `.in-view`, CSS owns the
 * tween). This module is that same vocabulary, applied imperatively
 * to markup P-C could not wrap in RevealCssClass without touching
 * twin-locked JSX: ONE IntersectionObserver pair, classes only.
 *
 * ── Grammar (the measured staggers) ─────────────────────────────────
 *   lines  (display headings)   whole-block, .reveal-d-N = 80ms steps
 *   items  (list rows, lede…)   whole-block, 80ms steps within group
 *   cards  (drawn art panels)   .reveal-card scale 0.8→1 + fade
 *
 * ── ARABIC SHAPING SAFEGUARD (non-negotiable) ───────────────────────
 * Arabic is cursive: word/char splitting produces ISOLATED letter
 * forms, and even line-level splitting was measured live (r333
 * evidence) to corrupt the RTL CTA title (a trailing «؟» isolated on
 * its own line + an empty <em> shell). Every element animates as ONE
 * whole block (y/opacity/scale); words are never split into spans.
 * (The SplitText plugin was retired with this rewrite — its only
 * landing target was Arabic, so the ~9KB gz bought nothing.)
 *
 * ── Progressive enhancement + reduced motion ────────────────────────
 * Content ships VISIBLE: the `.reveal-up`/`.reveal-card` classes are
 * ADDED BY THIS MODULE (never authored in JSX/CSS), so a failed import
 * or JS death can never hide copy. Under prefers-reduced-motion
 * initReveals() bails entirely before adding anything (the reveals.css
 * belt enforces the same outcome defensively).
 *
 * ── Idempotency / lifecycle ─────────────────────────────────────────
 * window.__mdrkReveals guards double init; destroy() disconnects the
 * observers, removes every class this module added and the armed root
 * class — safe for landing remounts (React 18 double-effect included).
 *
 * ── R339 T-11b1 — the fling/jump hardening (the deadlock fix) ──────
 * A one-shot IO alone permanently hides content on jumps — the same
 * blind spot hooks/useReveal.ts quantified live (28/39 stuck on an
 * instant jump): an element that hops from below the root to fully
 * ABOVE the viewport between observation frames never changes its
 * intersection state, so the IO delivers no isIntersecting entry and
 * the element stays armed `opacity: 0` forever (measured: 32 elements
 * on a plain top→bottom jump — the CTA title, the problem columns,
 * the chapters heading, every product row). Two seats close it:
 *   1. IO clause — a non-intersecting entry whose rect is fully above
 *      the viewport means the user flung past it → reveal (the belt's
 *      own clause (b), verbatim);
 *   2. settle belt — a scroll-quiet debounce (120ms, the R319 §E-13
 *      discipline) that reveals any pending element whose rect is
 *      fully above the viewport OR inside it (the -12/-15% rootMargin
 *      dead zone at the fold: a peeking element the shrunk root can
 *      never intersect). Deliberately NOT keyed on scrollend — layout
 *      clamping and engine-resync scrolls fire `scroll` with no
 *      scrollend (the useReveal T-11b1 trap); plain scroll-quiet is
 *      the only tail that always comes. A reveal must never hold
 *      content below its start.
 */

/** Root seam class — added BEFORE any hiding class lands (the arm order). */
const ARMED_CLASS = 'js-reveal-armed';

/** Grammar targets — the landing's second half (P-C sheets). */
const LINES_SEL = '.fo-cta-title'; // display heading → whole-block rise
const ITEM_SEL =
  '.pm-col, .rl-row, .fo-cta-lede, .fo-cta-actions, .fo-cta-meta';
/* P-A2 R333 — the #product proof strip's panels joined the card rung:
   the .pr-shot figures get row 13's imgCardReveal (scale 0.8→1) on the
   same IO pair + RM bail as the drawn panels. */
const CARD_SEL = '.pm-artzone .pm-art, .fo-cta-sketch, .pr-shots .pr-shot'; // drawn panels + the product-proof shots
/* ── R339 T-11b — the footer's Heron-register rise (work-list #1: the
   biggest single gap, 107 els × 2 props). The six structural blocks
   (column stacks, ink strip, © bar) ride `.reveal-rise-h` — shared.css's
   800ms/power2.out seat — with the module's 20ms stagger ladder written
   inline at intersect time. `.reveal-up` rides along for the instrument
   grammar + the house once:true contract; the rise seat wins the
   cascade (later in shared.css). The fold's LAST three blocks take the
   `--ty` variant (instant opacity — run.mjs's final snapshot lands
   mid-fade on their 800ms opacity otherwise; see shared.css). Targets
   deliberately avoid census-pinned transition seats (.fo-mark,
   .fo-col3, .fo-form, bgroup.2 keep their recorded transitions). ── */
const RISE_SEL = '.fo-c1-top, .fo-c2-top, .fo-c2-bottom';
const RISE_TY_SEL = '.fo-c1-sub, .fo-fstrip, .fo-footer-bottom';
/** the rise family's stagger step — Heron's recorded 20ms ladder. */
const RISE_STAGGER_MS = 20;

/* ── R339 T-11b1 — the intro band's own beat (work-list #3: intro 0/2,
   16×2 units). The census records the SAME rise shape at a different
   clock there — 600ms power2.out, 4ms stagger (roles intro-partner /
   intro / intro-partner-label) — so the band rides `.reveal-rise-h
   --beat` (shared.css's 600ms modifier) with the module's 4ms ladder
   on the same inline --rise-h-delay. The set: the ticker's label
   trio + both arrows, the crawl cells (the five documented
   universities + their seamless-loop twins), and the disclosure pair
   — LEAF level only (no parent+child seats: nested rises compound). */
const BEAT_SEL =
  '.st-plabel, .st-plabel-rule, .st-plabel-toprule, .st-parrow, .st-crawl-cell, .st-desc-text, .st-desc-rule';
/** the intro band's stagger step — Heron's recorded 4ms ladder. */
const BEAT_STAGGER_MS = 4;

/* ── R339 T-11b1 — the usecase rules (work-list #2: the width + scaleX
   groups). Heron records width 0→auto on the accordion rows' rule
   children (16 units) and a scaleX 0→1 draw on the frame pair (2
   units). Our counterparts ride roles.css keyframe seats — the -w
   widen on each row's bottom hairline, the -x draw on the section
   frame's top/bottom rules — armed here, `.in-view` is the single
   state write, once:true (same belt as everything above). */
const RULE_W_SEL = '.rl-row-rule-b';
const RULE_X_SEL = '.rl-rule-top, .rl-rule-bottom';

export interface RevealsHandle {
  destroy(): void;
}

interface RevealsWindow extends Window {
  __mdrkReveals?: RevealsHandle;
}

const OBSERVER_ROOT_MARGIN_LINES = '0px 0px -15% 0px'; // the 85% entry line
const OBSERVER_ROOT_MARGIN_ITEMS = '0px 0px -12% 0px'; // the 88% entry line

export function initReveals(): RevealsHandle {
  const noop: RevealsHandle = { destroy() {} };
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return noop;
  }
  const w = window as RevealsWindow;
  if (w.__mdrkReveals) return w.__mdrkReveals; // idempotent — never double-arm
  if (window.matchMedia(PREFERS_REDUCED_MOTION).matches) {
    return noop; // RM: bail entirely — content stays in final state
  }

  // The ARM SEAM comes first: root class, then hiding classes, then observers.
  document.documentElement.classList.add(ARMED_CLASS);

  const lines = toArray(document, LINES_SEL);
  const items = toArray(document, ITEM_SEL);
  const cards = toArray(document, CARD_SEL);
  const observers: IntersectionObserver[] = [];
  /** every class this module added — destroy() removes exactly these. */
  const touched: Array<{ el: Element; cls: string }> = [];

  const arm = (el: Element, cls: string) => {
    el.classList.add(cls);
    touched.push({ el, cls });
  };

  /** The reveal write: `.in-view` — the ONLY state change the grammar
   * needs; the transition lives in shared.css/reveals.css. The stagger
   * rides the house `.reveal-d-N` delay classes, assigned HERE (at
   * intersect time, within the entering batch — document order, capped
   * at d-5) so an element entering alone never waits on a group index.
   * T-11b — rise-family elements take the Heron ladder instead
   * (inline `--rise-h-delay`, consumed by the rise seat's transition
   * shorthand; never the .reveal-d-N longhand, which would fight it);
   * T-11b1 — the intro beat rides its own 4ms step (not the footer's
   * 20ms) on the same custom property. */
  const revealBatch = (els: Element[]) => {
    els.forEach((el, i) => {
      if (el.classList.contains('reveal-rise-h')) {
        const stepMs = el.classList.contains('reveal-rise-h--beat')
          ? BEAT_STAGGER_MS
          : RISE_STAGGER_MS;
        (el as HTMLElement).style.setProperty(
          '--rise-h-delay',
          `${i * stepMs}ms`,
        );
      } else {
        const step = Math.min(i, 5);
        if (step > 0) arm(el, `reveal-d-${step}`);
      }
      el.classList.add('in-view');
    });
  };
  const reveal = (el: Element) => el.classList.add('in-view');

  /** Fling/scroll-restoration belt — anything already above the fold
   * line when we arm settles instantly (no entrance for passed content);
   * a reveal must never hold content below its start. */
  const isPassed = (el: Element) =>
    el.getBoundingClientRect().bottom <= 0 ||
    el.getBoundingClientRect().top < window.innerHeight * 0.12;

  /* ── Lines — display headings, whole blocks, 80ms steps ─────────── */
  const pendingLines = lines.filter((el) => !isPassed(el));
  lines.filter(isPassed).forEach(reveal);
  pendingLines.forEach((el) => arm(el, 'reveal-up'));
  observe(pendingLines, OBSERVER_ROOT_MARGIN_LINES);

  /* ── Items — rows and copy blocks, 80ms steps within each group ────
   * (y-only + fade: no x — direction-safe in RTL. Groups enter as one
   * beat with internal stagger, like the reference.) */
  const pendingItems = items.filter((el) => !isPassed(el));
  items.filter(isPassed).forEach(reveal);
  pendingItems.forEach((el) => arm(el, 'reveal-up'));
  observe(pendingItems, OBSERVER_ROOT_MARGIN_ITEMS);

  /* ── Cards — the Heron imgCardReveal: scale 0.8→1 + fade on the
   * dedicated card rung. Scale/opacity only — direction-agnostic. ── */
  const pendingCards = cards.filter((el) => !isPassed(el));
  cards.filter(isPassed).forEach(reveal);
  pendingCards.forEach((el) => arm(el, 'reveal-card'));
  observe(pendingCards, OBSERVER_ROOT_MARGIN_LINES);

  /* ── T-11b — the footer rise: the six structural blocks on the
   * Heron register (see RISE_SEL). `.reveal-up` rides along for the
   * grammar + house contract; `.reveal-rise-h` owns the tween (it
   * wins the cascade — later in shared.css); the last three blocks
   * add `--ty` (instant opacity, rise-only). Same IO bucket as the
   * items; the 20ms ladder lands at reveal time. ── */
  const rises = [...toArray(document, RISE_SEL), ...toArray(document, RISE_TY_SEL)];
  const pendingRises = rises.filter((el) => !isPassed(el));
  rises.filter(isPassed).forEach(reveal);
  pendingRises.forEach((el) => {
    arm(el, 'reveal-up');
    arm(el, 'reveal-rise-h');
    if (RISE_TY_SEL.split(', ').some((s) => el.matches(s.trim()))) {
      arm(el, 'reveal-rise-h--ty');
    }
  });
  observe(pendingRises, OBSERVER_ROOT_MARGIN_ITEMS);

  /* ── T-11b1 — the intro beat: the SAME rise seat at the band's own
   * 600ms clock (--beat modifier, shared.css) + the 4ms ladder. */
  const beats = toArray(document, BEAT_SEL);
  const pendingBeats = beats.filter((el) => !isPassed(el));
  beats.filter(isPassed).forEach(reveal);
  pendingBeats.forEach((el) => {
    arm(el, 'reveal-up');
    arm(el, 'reveal-rise-h');
    arm(el, 'reveal-rise-h--beat');
  });
  observe(pendingBeats, OBSERVER_ROOT_MARGIN_ITEMS);

  /* ── T-11b1 — the usecase rules: the rows' bottom hairlines WIDEN
   * (width 0→100%, roles.css .rl-rule-w), the frame pair DRAWS
   * (scale 0 1→1 1, roles.css .rl-rule-x). Keyframe seats — `.in-view`
   * fires them; no transition to stagger, so they ride the lines
   * entry margin with the headings. */
  const rules = [...toArray(document, RULE_W_SEL), ...toArray(document, RULE_X_SEL)];
  const pendingRules = rules.filter((el) => !isPassed(el));
  rules.filter(isPassed).forEach(reveal);
  pendingRules.forEach((el) =>
    arm(el, el.matches(RULE_X_SEL) ? 'rl-rule-x' : 'rl-rule-w'),
  );
  observe(pendingRules, OBSERVER_ROOT_MARGIN_LINES);

  /* ── T-11b1 — the pending pool + the settle belt ─────────────
   * Every armed-but-unrevealed element, rescued by scroll-quiet (see
   * the header block). The pool drains as the IO reveals. */
  const pending: Element[] = [...pendingLines, ...pendingItems, ...pendingCards, ...pendingRises, ...pendingBeats, ...pendingRules];
  const SETTLE_QUIET_MS = 120;
  let settleTimer = 0;
  const settle = () => {
    settleTimer = 0;
    if (!pending.length) return;
    const vh = window.innerHeight;
    const rescued: Element[] = [];
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      const r = pending[i]!.getBoundingClientRect();
      /* fully above the viewport (flung past) or inside it (the
       * rootMargin dead zone at the fold) — the same rule the belt's
       * reconcile holds: docTop - scrollY < vh. */
      if (r.bottom <= 0 || r.top < vh) {
        rescued.push(pending[i]!);
        pending.splice(i, 1);
      }
    }
    if (rescued.length) revealBatch(rescued.sort(byDocumentOrder));
  };
  const onScrollQuiet = () => {
    if (settleTimer) window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, SETTLE_QUIET_MS);
  };
  window.addEventListener('scroll', onScrollQuiet, { passive: true });

  /** ONE observer per root-margin bucket (the house bucket rule —
   * hooks/useReveal.ts): entries sharing a margin share one IO. */
  function observe(els: Element[], rootMargin: string) {
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const batch = entries
          /* T-11b1 — the flung-past clause (the belt's (b), verbatim):
           * a non-intersecting entry fully above the viewport means the
           * user jumped past this element between observation frames;
           * one-shot semantics: passed ⇒ revealed. */
          .filter((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)
          .map((e) => e.target)
          .sort(byDocumentOrder);
        if (batch.length) {
          revealBatch(batch);
          batch.forEach((el) => {
            const i = pending.indexOf(el);
            if (i >= 0) pending.splice(i, 1);
          });
        }
        batch.forEach((el) => io.unobserve(el)); // once:true — never replays
      },
      { rootMargin },
    );
    els.forEach((el) => io.observe(el));
    observers.push(io);
  }

  function toArray(doc: Document, sel: string): HTMLElement[] {
    return Array.from(doc.querySelectorAll<HTMLElement>(sel));
  }

  /** document-order sort for batch staggers (RTL-safe: top before
   * bottom; horizontal order never matters — no x motion). */
  function byDocumentOrder(a: Element, b: Element): number {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  }

  const handle: RevealsHandle = {
    destroy() {
      observers.forEach((io) => io.disconnect());
      if (settleTimer) window.clearTimeout(settleTimer);
      window.removeEventListener('scroll', onScrollQuiet);
      touched.forEach(({ el, cls }) => el.classList.remove(cls));
      document.documentElement.classList.remove(ARMED_CLASS);
      delete w.__mdrkReveals;
    },
  };
  w.__mdrkReveals = handle;
  return handle;
}
