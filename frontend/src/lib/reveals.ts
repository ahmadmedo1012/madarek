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

/* ── r368 T1 — the per-family entry lines (the committed restructure) ──────
 * The reference is HETEROGENEOUS (the Task-0 pairing's census-validated
 * trigger table + the measured visual onsets): the intro band enters WITH the
 * page (its beats are mid-flight at the stage top — measured on the reference),
 * the problem family's transitions begin deep below the fold (the census-
 * validated trigger window starts at −1.8×H — its columns are mid-reveal as
 * they enter view), the usecase rows engage at +0.2×H (the measured visual
 * onset — the rows reveal near the top of the viewport), and the CTA/footer
 * families show no pre-entry motion (their first visible changes land
 * at/after entry). One global line cannot express this — each family rides its
 * own bucket. [Derivation, validated live within ±40 px: an element at
 * section-relative offset d crosses the line L at scroll E+d−L — frac
 * (d−L)/H; live geometry only — the load-time snapshot drifts +670…+723 px.]
 * The WHY scene family's early line (≈ +70% vh root expansion) is NOT here:
 * the why seat's elements arm through their own files (useReveal/WhyScene) —
 * the lever is recorded and lands with the why seat's Task-3 work. */
const OBSERVER_ROOT_MARGIN_PROBLEM = '0px 0px 72% 0px'; // problem family — transitions start ≈650 px below the fold (−1.8×H)
const OBSERVER_ROOT_MARGIN_BEAT = '0px 0px 66% 0px'; // intro beats — the reference's band enters with the page (mid-flight at the stage top)
const OBSERVER_ROOT_MARGIN_ROWS = '0px 0px -77% 0px'; // usecase rows — engage at +0.2×H: the rows reveal in the viewport's top quarter
const OBSERVER_ROOT_MARGIN_ENTRY = '0px 0px -100% 0px'; // the at/after-entry families (CTA, footer rise, the usecase rule draws) — the reference shows no pre-entry motion

/** Grammar targets — the landing's second half (P-C sheets), grouped by family. */
/* problem family: the columns + the art panels (one bucket, one onset) */
const PROBLEM_ITEM_SEL = '.pm-col';
const PROBLEM_CARD_SEL = '.pm-artzone .pm-art';
/* usecase family: the accordion rows ride the rows line */
const ROWS_SEL = '.rl-row';
/* CTA family (at/after entry): the display heading, the copy, the actions, the sketch */
const CTA_LINES_SEL = '.fo-cta-title';
const CTA_ITEM_SEL = '.fo-cta-lede, .fo-cta-actions, .fo-cta-meta';
const CTA_CARD_SEL = '.fo-cta-sketch';
/* P-A2 R333 — the #product proof strip's panels joined the card rung; the
   platform family shows no pre-entry motion — at/after entry (the live DOM
   no longer carries .pr-shots; the selector stays harmless). */
const PLATFORM_CARD_SEL = '.pr-shots .pr-shot';
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

interface RevealsHandle {
  destroy(): void;
}

interface RevealsWindow extends Window {
  __mdrkReveals?: RevealsHandle;
}

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

  // ── the family groups (r368 T1: one bucket per family) ──────────────
  const problemItems = toArray(document, PROBLEM_ITEM_SEL);
  const problemCards = toArray(document, PROBLEM_CARD_SEL);
  const problem = [...problemItems, ...problemCards];
  const rows = toArray(document, ROWS_SEL);
  const ctaLines = toArray(document, CTA_LINES_SEL);
  const ctaItems = toArray(document, CTA_ITEM_SEL);
  const ctaCards = [...toArray(document, CTA_CARD_SEL), ...toArray(document, PLATFORM_CARD_SEL)];
  const cta = [...ctaLines, ...ctaItems, ...ctaCards];
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

  /* ── PROBLEM family — the columns + the art panels, one bucket, one onset:
   * the reference's trigger window starts at −1.8×H (census-validated), so
   * the transitions begin ≈650 px below the fold and the columns are
   * mid-reveal as they enter view (the measured reference behavior). ── */
  const pendingProblem = problem.filter((el) => !isPassed(el));
  problem.filter(isPassed).forEach(reveal);
  pendingProblem.forEach((el) =>
    arm(el, el.matches(PROBLEM_CARD_SEL) ? 'reveal-card' : 'reveal-up'),
  );
  observe(pendingProblem, OBSERVER_ROOT_MARGIN_PROBLEM);

  /* ── ROWS family — the usecase rows engage at +0.2×H (the measured
   * reference visual onset): the rows reveal in the viewport's top
   * quarter, riding later than the fold. ── */
  const pendingRows = rows.filter((el) => !isPassed(el));
  rows.filter(isPassed).forEach(reveal);
  pendingRows.forEach((el) => arm(el, 'reveal-up'));
  observe(pendingRows, OBSERVER_ROOT_MARGIN_ROWS);

  /* ── CTA + platform families — "at/after entry" (the reference shows no
   * pre-entry motion): the display heading, the copy blocks, the actions,
   * the sketch and the proof panels all reveal as their tops pass the
   * viewport top. The heading keeps the 80ms-step stagger grammar. ── */
  const pendingCta = cta.filter((el) => !isPassed(el));
  cta.filter(isPassed).forEach(reveal);
  pendingCta.forEach((el) =>
    arm(el, el.matches(CTA_CARD_SEL) || el.matches(PLATFORM_CARD_SEL) ? 'reveal-card' : 'reveal-up'),
  );
  observe(pendingCta, OBSERVER_ROOT_MARGIN_ENTRY);

  /* ── T-11b — the footer rise: the six structural blocks on the
   * Heron register (see RISE_SEL). `.reveal-up` rides along for the
   * grammar + house contract; `.reveal-rise-h` owns the tween (it
   * wins the cascade — later in shared.css); the last three blocks
   * add `--ty` (instant opacity, rise-only). The footer family plays
   * at/after entry; at the end-clamped geometry the settle belt
   * rescues the blocks at the document end. ── */
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
  observe(pendingRises, OBSERVER_ROOT_MARGIN_ENTRY);

  /* ── T-11b1 — the intro beat: the SAME rise seat at the band's own
   * 600ms clock (--beat modifier, shared.css) + the 4ms ladder. The
   * band enters WITH the page (the reference's beats are mid-flight at
   * the stage top — measured): the +66% root fires the beats at load. */
  const beats = toArray(document, BEAT_SEL);
  const pendingBeats = beats.filter((el) => !isPassed(el));
  beats.filter(isPassed).forEach(reveal);
  pendingBeats.forEach((el) => {
    arm(el, 'reveal-up');
    arm(el, 'reveal-rise-h');
    arm(el, 'reveal-rise-h--beat');
  });
  observe(pendingBeats, OBSERVER_ROOT_MARGIN_BEAT);

  /* ── T-11b1 — the usecase rules: the rows' bottom hairlines WIDEN
   * (width 0→100%, roles.css .rl-rule-w), the frame pair DRAWS
   * (scale 0 1→1 1, roles.css .rl-rule-x). Keyframe seats — `.in-view`
   * fires them; no transition to stagger. The rules sit at the
   * section's top edge: the at/after-entry line fires them at entry
   * (firing later needs the seat's own pin — the Task-3 residual). */
  const rules = [...toArray(document, RULE_W_SEL), ...toArray(document, RULE_X_SEL)];
  const pendingRules = rules.filter((el) => !isPassed(el));
  rules.filter(isPassed).forEach(reveal);
  pendingRules.forEach((el) =>
    arm(el, el.matches(RULE_X_SEL) ? 'rl-rule-x' : 'rl-rule-w'),
  );
  observe(pendingRules, OBSERVER_ROOT_MARGIN_ENTRY);

  /* ── T-11b1 — the pending pool + the settle belt ─────────────
   * Every armed-but-unrevealed element, rescued by scroll-quiet (see
   * the header block). The pool drains as the IO reveals. */
  const pending: Element[] = [...pendingProblem, ...pendingRows, ...pendingCta, ...pendingRises, ...pendingBeats, ...pendingRules];
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
