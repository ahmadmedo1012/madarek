/**
 * ConsentBanner — R314 (V11) → R328 (H1) → R332 (W8) → R341 (L1-c) —
 * the landing's local-storage consent gate.
 *
 * An ORIGINAL component in the reference's measured chrome grammar —
 * now THE TAIL BAND (R341 L1-c): the R328/R332 FIXED corner cell is
 * retired. The blind panel's T-16 #3 finding — "toast permanently
 * glued over the footer/CTA band" — was inherent to the fixed seat:
 * at the page end the cell sat ON the footer's legal row (whose
 * fixed-height 42fu band paints its wrapped links BELOW the footer's
 * own border box — measured: 72px @1024 · 57px @768 · 49px @1440),
 * and the R332 yield watcher hid the cell exactly when it mattered
 * (the conformance pass was a visibility:hidden artifact, not
 * geometry). The honest fix is the brief's FIRST pattern, verbatim:
 * a DISMISSIBLE BANNER WITH LAYOUT OFFSET — the band is IN FLOW at
 * the sheet's tail (mounted after the footer, R314 B10's site), full
 * frame width, so the page reserves its space BY GEOMETRY. It can
 * never overlay the footer, the primary CTA, or ANY content at ANY
 * scroll seat or width; accepting collapses ONLY its own reserved
 * box (nothing is below it — zero shift for anything on screen), and
 * it appears inside its pre-reserved seat via opacity/transform only
 * (zero CLS on entrance). ONE 1px var(--rule) hairline box (consent.css
 * owns the border — untouched), radius 0, NO shadow, paper ground,
 * 12–13px type pinned in px at every viewport. Brand accent lives ONLY
 * on the accept action. Accept stays the REAL primary — ink slab +
 * paper label, ≥4.5:1 both themes (R318 §A9); Reject ink-labelled with
 * the owner-mandated 44px touch floor on phones. Keyboard-dismissable:
 * both actions are native buttons — Tab reaches them, Enter/Space
 * fires them (the site focus ring is base.css's). The region is
 * aria-live="polite" (announced on entrance; role="region" + label
 * kept). Madarek's OWN honest sentence — never the reference's copy,
 * logo, or awards.
 *
 * THE TAIL SEAM (the one measured dependency the flow seat inherits):
 * the footer's overflowing legal-row paint lands in the space below
 * the footer's border box — exactly where the band's flow seat begins.
 * The measurer below walks the footer's subtree once per resize
 * (rAF-throttled; + one mount pass + one 900ms settle pass for the
 * reveal transforms) and stamps `--cb-tail-seam` = the paint's real
 * depth + a 12px gap, floored at 20px — the band's margin-block-start
 * (consent-edge.css). CSS fallbacks carry the measured worst wraps
 * when JS is off (24px ≤767 · 80px ≥768). The R332 yield watcher,
 * its hysteresis and its visibility artifact are DELETED with the
 * fixed seat that needed them.
 *
 * The R323 phone compact bar (brief label + expand toggle) is RETIRED
 * (R328): the band carries the full honest sentence at every width.
 *
 * This is a REAL gate, not decoration:
 *  · «موافق»  → localStorage `madarek.consent = "accepted"` (+ a JSON
 *    record with a timestamp under `madarek.consent.record`); the
 *    banner never shows again.
 *  · «أرفض»   → `madarek.consent = "rejected"`; the same persistence,
 *    PLUS the app's non-essential UI-pref keys are removed (see
 *    GATED_KEYS — only keys the app already re-derives on demand, so
 *    nothing breaks; user-authored data is deliberately left alone).
 *  · `window.MadarekConsent` exposes the live state + both actions
 *    for consoles, tests, and future surfaces (JSDoc below).
 *
 * Landing-only by mount site (LandingPage, after the footer — R314 B10):
 * auth pages never see it. The band rides the sheet's TAIL — the
 * colophon zone where the footer's own «التخزين المحلي» policy link
 * lives — so the gate is discovered exactly where the storage note
 * belongs, never floating over the working page. Entrance is deferred
 * behind the loader (`.landing.intro-draw` hides it; `.landing.intro-done`
 * plays the 200ms clip-up ~600ms after the sheet reveal starts);
 * reduced motion collapses the rise to a plain opacity fade.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBottomStackLayer } from '../../../hooks/useBottomStackLayer';
/* R332 (W8) — the cell's own sheet. Imported BY the component, so it
 * injects BEFORE r314-chrome.css in the module graph (LandingPage's
 * component imports precede the page's sheet imports) and every
 * override there wins on SPECIFICITY ((0,2,0)–(0,4,1) vs r314's bare
 * (0,1,0) `.cb-*`) — no !important, no ID selectors. */
import '../../../styles/landing/consent.css';

/* ── The storage contract ────────────────────────────────────────────
 * `madarek.consent` holds the plain decision ("accepted"/"rejected") —
 * the value every gate reads first. `madarek.consent.record` holds the
 * JSON audit twin `{"decision":…,"ts":<epoch-ms>}` (the "JSON with
 * timestamp" of the spec) so the decision stays a one-comparison read
 * while the full record stays inspectable. */
const CONSENT_KEY = 'madarek.consent';
const CONSENT_RECORD_KEY = 'madarek.consent.record';

/** The visitor's recorded decision. */
export type ConsentDecision = 'accepted' | 'rejected';
/** Live gate state: answered decisions, or `unanswered` before either. */
export type ConsentState = ConsentDecision | 'unanswered';

/**
 * localStorage keys that SURVIVE a reject — essential to the session or
 * to a pre-consent choice the visitor already made:
 *  · `madarek-theme`       — the theme choice (kept per the R314 spec:
 *                            a pre-consent user choice is essential);
 *  · `mdrk-theme-profile`  — the pre-paint theme cache derived from it;
 *  · `mdrk-auth`           — session/auth persistence.
 * No language key exists yet (Arabic-first, single language) — the seat
 * is documented here so a future i18n key joins this list, not GATED.
 */
const ESSENTIAL_KEYS: readonly string[] = [
  'madarek-theme',
  'mdrk-theme-profile',
  'mdrk-auth',
];

/**
 * Non-essential UI-pref keys removed on reject — ONLY keys the app
 * already re-derives from defaults the next time it needs them, so
 * removal can never break a surface:
 *  · `mdrk-ui`          — sidebar fold + palette recents (zustand
 *                         persist; falls back to defaults on rehydrate);
 *  · `mdrk-doc-side-w`  — the document viewer's side-panel width
 *                         (re-measured on open).
 * `mdrk-academic-links` is deliberately NOT here: it is user-authored
 * content (their saved links), not a UI preference — deleting it would
 * destroy the visitor's own data, the one thing a privacy reject must
 * never do.
 */
const GATED_KEYS: readonly string[] = [
  'mdrk-ui',
  'mdrk-doc-side-w',
];

/**
 * The public consent API installed on `window` while the landing is
 * mounted (see the effect below). `state` is a live getter — it always
 * reflects storage, not a snapshot.
 */
export interface MadarekConsentApi {
  /** Live decision from storage: `accepted` · `rejected` · `unanswered`. */
  readonly state: ConsentState;
  /** Keys that survive a reject (theme choice, session, language seat). */
  readonly essentialKeys: readonly string[];
  /** UI-pref keys removed on reject (each re-derivable — nothing breaks). */
  readonly gatedKeys: readonly string[];
  /** Record consent + timestamp; hides the banner if it is mounted. */
  accept(): void;
  /** Record rejection + timestamp, purge the gated keys, hide the banner. */
  reject(): void;
}

declare global {
  interface Window {
    MadarekConsent?: MadarekConsentApi;
  }
}

/** The event fired on the API's accept()/reject() (same-document only). */
const CONSENT_EVENT = 'madarek:consent';

/* ── Pure helpers (storage-touching, but testable in isolation) ────── */

/** Parse the stored decision — plain string, legacy JSON, or absent. */
function parseDecision(raw: string | null): ConsentDecision | null {
  if (raw === 'accepted' || raw === 'rejected') return raw;
  /* legacy/foreign shapes: a JSON record under the main key still
   * counts (both keys are written by one answer; this is belt+braces) */
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { decision?: unknown };
      if (parsed.decision === 'accepted' || parsed.decision === 'rejected') {
        return parsed.decision;
      }
    } catch {
      /* not JSON — an unknown value is treated as unanswered */
    }
  }
  return null;
}

/** Read the current decision from localStorage (storage-safe). */
function readDecision(): ConsentDecision | null {
  try {
    return parseDecision(window.localStorage.getItem(CONSENT_KEY));
  } catch {
    /* private mode / storage disabled — degrade to "unanswered" so the
     * visitor still gets the choice; writes below fail soft */
    return null;
  }
}

/** Write the decision + its JSON record (storage failures are soft). */
function writeDecision(decision: ConsentDecision): void {
  const ts = Date.now();
  try {
    window.localStorage.setItem(CONSENT_KEY, decision);
    window.localStorage.setItem(
      CONSENT_RECORD_KEY,
      JSON.stringify({ decision, ts }),
    );
  } catch {
    /* storage unavailable — the in-memory answer still applies for
     * this document (the banner hides; nothing else is persisted) */
  }
}

/** Remove every gated key (storage failures are soft). */
function purgeGatedKeys(): void {
  GATED_KEYS.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* best effort — a key that cannot be removed also cannot gate */
    }
  });
}

/* ── The component ─────────────────────────────────────────────────── */

export function ConsentBanner() {
  const [decision, setDecision] = useState<ConsentDecision | null>(() =>
    typeof window === 'undefined' ? null : readDecision(),
  );

  /* Y6 (R325) — the gate is the BASE layer of the bottom stack: it
   * registers its MEASURED height with lib/bottomStack.ts, so the
   * toast stack and the FAB lift above its real box instead of
   * covering it (the r325 spec pins: the gate's own offset '0px' +
   * the stack offset ≥ the gate's height — both ride this
   * registration). In flow at the sheet tail the lift guards the one
   * seat where the band and a fixed toast CAN share the screen: the
   * scrolled-to-the-end frame. Answering the gate renders null → the
   * callback ref fires with null → the layer deregisters and the
   * layers above ease back down (200ms). The same node also carries
   * the L1-c tail-seam measurer (rootRef below), hence the one
   * combined ref. */
  const bannerRef = useBottomStackLayer('consent');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      bannerRef(node);
    },
    [bannerRef],
  );

  /* ── R341 (L1-c) — THE TAIL-SEAM measurer ───────────────────────
   * The band is IN FLOW directly after the footer, but the footer's
   * legal row paints BELOW its own border box (the .fo-footer-bottom
   * census band carries a fixed 42fu height while its wrapped links
   * overflow it — measured 72px of paint below the footer @1024, 57px
   * @768, 49px @1440, none @390). Paint order would seat that ink on
   * the band's first rows — the in-flow twin of the overlay the
   * fixed cell committed. The measurer walks the footer's subtree
   * (the mount site's previousElementSibling — no selector coupling),
   * finds the deepest VISIBLE paint, and stamps the band's
   * margin-block-start (`--cb-tail-seam`, consent-edge.css) at that
   * depth + a 12px gap, floored at 20px. CSS fallbacks carry the
   * measured worst wraps for the JS-off path.
   *
   * Cost discipline: rAF-throttled on resize + one mount pass + one
   * 900ms settle pass (the reveal transforms translate content DOWN
   * pre-fire, so an early measure only ever over-estimates the seam —
   * the safe direction); each pass is one subtree walk of the footer
   * (~200 rect reads, ≤1ms). No scroll listener — a static band's
   * seam depends on layout, not on the viewport. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const node = rootRef.current;
    if (!node) return undefined;

    const MIN_SEAM_PX = 20; /* the resting seam — the sheet's own rhythm */
    const GAP_PX = 12;      /* breathing under the footer's last paint row */
    const SETTLE_MS = 900;  /* post-reveal geometry (transforms settle) */
    const SETTLE2_MS = 2500; /* the late pass — font swap / reveal-queue
                                drift (measured live: the deepest paint row
                                moved ~7px after the first settle pass) */

    let raf = 0;

    const measure = () => {
      raf = 0;
      const footer = node.previousElementSibling;
      if (!(footer instanceof HTMLElement)) return;
      const footBottom = footer.getBoundingClientRect().bottom;
      let paintBelow = 0;
      for (const el of footer.querySelectorAll('*')) {
        if (!(el instanceof HTMLElement || el instanceof SVGElement)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.bottom - footBottom > paintBelow) paintBelow = r.bottom - footBottom;
      }
      const seam = Math.max(MIN_SEAM_PX, Math.ceil(paintBelow + GAP_PX));
      node.style.setProperty('--cb-tail-seam', `${seam}px`);
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };

    schedule(); /* the one mount pass */
    const settle = window.setTimeout(schedule, SETTLE_MS);
    const settle2 = window.setTimeout(schedule, SETTLE2_MS);
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.clearTimeout(settle2);
    };
  }, []);

  /* The shared answer path — button clicks and the window API both
   * land here, so the two writers can never diverge. */
  const answer = useCallback((next: ConsentDecision) => {
    writeDecision(next);
    if (next === 'rejected') purgeGatedKeys();
    setDecision(next);
  }, []);

  /* Install window.MadarekConsent while the landing is mounted; the
   * API reads storage live (not React state) so it stays correct even
   * after the banner unmounts itself, and it drives the banner through
   * the same `answer` path via a CustomEvent. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const api: MadarekConsentApi = {
      get state(): ConsentState {
        return readDecision() ?? 'unanswered';
      },
      essentialKeys: ESSENTIAL_KEYS,
      gatedKeys: GATED_KEYS,
      accept: () => window.dispatchEvent(
        new CustomEvent(CONSENT_EVENT, { detail: 'accepted' }),
      ),
      reject: () => window.dispatchEvent(
        new CustomEvent(CONSENT_EVENT, { detail: 'rejected' }),
      ),
    };
    window.MadarekConsent = api;
    const onApiCall = (e: Event) => {
      const detail = (e as CustomEvent<ConsentDecision>).detail;
      if (detail === 'accepted' || detail === 'rejected') answer(detail);
    };
    window.addEventListener(CONSENT_EVENT, onApiCall);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onApiCall);
      if (window.MadarekConsent === api) delete window.MadarekConsent;
    };
  }, [answer]);

  /* Answered (now or before this load) → the banner never shows. */
  if (decision !== null) return null;

  return (
    /* role="region" + label + aria-live="polite": announced as a
     * landmark and politely spoken when it enters — never a modal; the
     * visitor's flow is never hijacked, keyboard or pointer. The R341
     * L1-c tail band: ONE 1px var(--rule) hairline box (consent.css
     * draws the border), IN FLOW at the sheet's tail — the layout
     * offset IS its own box. */
    <div
      ref={setRoot}
      className="cb-banner"
      data-spec="consent.banner"
      role="region"
      aria-live="polite"
      aria-label="الموافقة على التخزين المحلي"
    >
      {/* R328 (H1): the band carries the FULL honest sentence at every
          width (the R323 brief/expand pair retired with the compact
          bar). R320 §D (c2-LEGAL) keeps the learn-more target on
          /legal/cookies — the honest substance of what this band
          stores lives in the policy sheet's own ledger table. */}
      <p className="cb-text">
        يستخدم هذا الموقع التخزين المحلي.
        <Link to="/legal/cookies" className="cb-more">اعرف أكثر</Link>
      </p>

      {/* R318 §A9 (R315 K-C geometry kept): the measured seats —
          «موافق» the real primary (ink slab + paper label,
          r314-chrome.css — both themes ≥4.5:1), «أرفض» ink-labelled;
          the pair groups at the inline end on wide frames and anchors
          the band's width edge to edge on phones (consent-edge.css).
          Both are native buttons — Tab + Enter/Space dismiss. */}
      <div className="cb-actions">
        <button type="button" className="cb-accept" onClick={() => answer('accepted')}>
          موافق
        </button>
        <button type="button" className="cb-reject" onClick={() => answer('rejected')}>
          أرفض
        </button>
      </div>
    </div>
  );
}
