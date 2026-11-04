/**
 * ConsentBanner — R314 (V11) → R328 (H1) → R332 (W8) — the landing's
 * local-storage consent gate.
 *
 * An ORIGINAL component in the reference's measured chrome grammar —
 * now THE HAIRLINE CORNER CELL (R332 W8): a small drafting cell seated
 * in the sheet grid's corner (inside the 7px frame hairline), ≤320px
 * wide, ONE 1px var(--rule) hairline box — the R328 four-rule drafting
 * frame is retired (the spans are gone; the cell carries itself) —
 * radius 0, NO shadow, paper ground, 12–13px type pinned in px at
 * every viewport. Brand accent lives ONLY on the accept action. The
 * cell's own sheet is styles/landing/consent.css (imported below;
 * it overrides r314-chrome.css on SPECIFICITY — that sheet, which owns
 * the fixed mirrored seat (bottom/left 7px · z 240) and the entrance,
 * is untouched). Accept stays the REAL primary — ink slab + paper
 * label, ≥4.5:1 both themes (R318 §A9); Reject ink-labelled with the
 * owner-mandated 44px touch floor on phones. Madarek's OWN honest
 * sentence — never the reference's copy, logo, or awards.
 *
 * THE CONDITIONAL YIELD (R332 W8): the never-hide end-reserve keeps
 * the RESTING seat honest, but transient frames slide footer/CTA links
 * behind the fixed cell. While the unanswered cell would intersect any
 * visible link/button, the watcher below stamps `data-cb-yield` and
 * the cell RECEDES (consent.css → visibility:hidden — the fixed box
 * stays measured: zero layout shift, zero CLS) and returns 600ms after
 * the corner clears (hysteresis, no flicker). Focus inside the cell
 * when it yields falls to <body> — a transient scroll-driven state,
 * documented at the watcher.
 *
 * The R323 phone compact bar (brief label + expand toggle) is RETIRED:
 * the card carries the full honest sentence at every width, so the
 * toggle, the brief/full pair, and their state are deleted.
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
 * auth pages never see it. Entrance is deferred behind the loader
 * (`.landing.intro-draw` hides it; `.landing.intro-done` plays the
 * 200ms clip-up ~600ms after the sheet reveal starts); reduced motion
 * collapses the rise to a plain opacity fade.
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

  /* Y6 (R325) — the gate is the BASE layer of the bottom stack: it owns
   * the viewport's bottom corner seat (r314-chrome.css) and registers
   * its MEASURED height with lib/bottomStack.ts, so the toast stack
   * and the FAB lift above its real box instead of covering it.
   * Answering the gate renders null → the callback ref fires with null
   * → the layer deregisters and the layers above ease back down
   * (200ms). R328 (H1): the sheet itself also pads its foot by the
   * pile's height while the gate is unanswered (the never-hide
   * reserve — see r314-chrome.css), so the footer's last row can
   * never sit behind the card. The same node also carries the W8
   * yield watcher (rootRef below), hence the one combined ref. */
  const bannerRef = useBottomStackLayer('consent');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      bannerRef(node);
    },
    [bannerRef],
  );

  /* ── R332 (W8) — THE CONDITIONAL YIELD watcher ──────────────────
   * While the unanswered cell would intersect any VISIBLE link/button
   * outside itself, it recedes: `data-cb-yield` → consent.css
   * visibility:hidden. The fixed box keeps its geometry while hidden,
   * so the bottom-stack measurement and the page never shift (zero
   * CLS); the cell returns 600ms after the corner clears — hysteresis,
   * so a boundary-straddling frame cannot flicker.
   *
   * Cost discipline: rAF-throttled on scroll/resize + one mount pass;
   * each pass is ONE querySelectorAll + rect/style reads with an early
   * break on the first covered element (≤1ms on the probed page).
   * Pre-reveal content (opacity 0 until its reveal fires) and the
   * pre-entrance cell itself count as CLEAR — neither can cover or be
   * covered while invisible. Focus inside the cell when it yields
   * falls to <body>: inherent to a scroll-driven transient state (the
   * cell is gone, so its tab stops are gone with it) — the next pass
   * that clears the corner returns the cell and its focus targets. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const node = rootRef.current;
    if (!node) return undefined;

    const INTERACTIVE =
      'a[href], button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const RETURN_DELAY_MS = 600;

    let raf = 0;
    let releaseAt = 0;

    const evaluate = () => {
      raf = 0;
      let covered = false;
      const box = node.getBoundingClientRect();
      /* the pre-entrance cell (opacity 0) covers nothing visually */
      if (
        box.width > 0 &&
        box.height > 0 &&
        getComputedStyle(node).opacity !== '0'
      ) {
        const others = document.querySelectorAll(INTERACTIVE);
        for (const el of others) {
          if (node.contains(el)) continue;
          const cs = getComputedStyle(el);
          if (
            cs.visibility === 'hidden' ||
            cs.display === 'none' ||
            cs.opacity === '0' /* pre-reveal = clear */
          ) {
            continue;
          }
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (
            r.right > box.left &&
            r.left < box.right &&
            r.bottom > box.top &&
            r.top < box.bottom
          ) {
            covered = true;
            break;
          }
        }
      }
      if (covered) {
        window.clearTimeout(releaseAt);
        releaseAt = 0;
        node.setAttribute('data-cb-yield', '');
      } else if (
        node.hasAttribute('data-cb-yield') &&
        releaseAt === 0
      ) {
        /* hysteresis: return only 600ms after the corner cleared */
        releaseAt = window.setTimeout(() => {
          releaseAt = 0;
          node.removeAttribute('data-cb-yield');
        }, RETURN_DELAY_MS);
      }
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(evaluate);
    };

    schedule(); /* the one mount pass */
    /* capture: the landing's scrollers (incl. any inner panes) report
     * through the window's capture phase — scroll does not bubble. */
    window.addEventListener('scroll', schedule, {
      passive: true,
      capture: true,
    });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
      if (releaseAt) window.clearTimeout(releaseAt);
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
    /* role="region" + label: announced as a landmark, not a modal —
     * the visitor's flow is never hijacked, keyboard or pointer. The
     * R332 W8 cell: ONE 1px var(--rule) hairline box (the four
     * .cb-rule spans retired — consent.css draws the single border). */
    <div
      ref={setRoot}
      className="cb-banner"
      data-spec="consent.banner"
      role="region"
      aria-label="الموافقة على التخزين المحلي"
    >
      {/* R328 (H1): the card carries the FULL honest sentence at every
          width (the R323 brief/expand pair retired with the compact
          bar). R320 §D (c2-LEGAL) keeps the learn-more target on
          /legal/cookies — the honest substance of what this card
          stores lives in the policy sheet's own ledger table. */}
      <p className="cb-text">
        يستخدم هذا الموقع التخزين المحلي.
        <Link to="/legal/cookies" className="cb-more">اعرف أكثر</Link>
      </p>

      {/* R318 §A9 (R315 K-C geometry kept): the measured seats —
          «موافق» the real primary (ink slab + paper label,
          r314-chrome.css — both themes ≥4.5:1), «أرفض» ink-labelled;
          the pair anchors the card's width edge to edge. */}
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
