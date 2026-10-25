/**
 * ConsentBanner — R314 (V11) — the landing's local-storage consent gate.
 *
 * An ORIGINAL component in the reference's measured chrome geometry
 * (R315 K-C — E-crawl ground truth: desktop 601.25×38.33 bottom-right
 * on the LTR reference → mirrored bottom-LEFT on our RTL sheet; four
 * separate 1px ink rules like a drafting frame, the ONE hard-offset
 * shadow the reference ships; Accept 78.63×27.98 the REAL primary —
 * ink slab + paper label, ≥4.5:1 both themes (R318 §A9 — the pale
 * ghost seat was 1.15:1), Reject 80.63×28.33 ink-labelled; mobile
 * 374×~100 with the two actions side-by-side — our 44px a11y touch
 * floor over the measured 93.45) carrying Madarek's OWN honest
 * ONE-LINE sentence — never the reference's copy, logo, or awards.
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
 * rise ~1.2s after the sheet reveal starts); reduced motion collapses
 * the rise to a plain opacity fade.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
     * the visitor's flow is never hijacked, keyboard or pointer. */
    <div className="cb-banner" role="region" aria-label="الموافقة على التخزين المحلي">
      {/* the four separate 1px ink rules — the drafting frame (the
          reference paints them as four lines, not a border box) */}
      <span className="cb-rule cb-rule-t" aria-hidden="true" />
      <span className="cb-rule cb-rule-r" aria-hidden="true" />
      <span className="cb-rule cb-rule-b" aria-hidden="true" />
      <span className="cb-rule cb-rule-l" aria-hidden="true" />

      <p className="cb-text">
        {/* R315 (K-C): ONE honest line — the reference's banner is a
            single sentence + a LEARN MORE link (601×38, no paragraph
            stack). The long disclosure sentence the owner flagged
            (4-line Arabic wrap · 175px mobile) is retired; the honest
            substance lives on /capabilities beside the live ledger. */}
        يستخدم هذا الموقع التخزين المحلي.
        <Link to="/capabilities" className="cb-more">اعرف أكثر</Link>
      </p>

      <div className="cb-actions">
        {/* R318 §A9 (R315 K-C geometry kept): the measured seats —
            «موافق» the real primary (ink slab + paper label,
            r314-chrome.css — both themes ≥4.5:1), «أرفض» ink-labelled;
            both side-by-side at every width. */}
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
