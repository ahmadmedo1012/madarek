/**
 * ServerWakePill — the «الخادم يستيقظ…» moment (r280).
 *
 * A fixed, calm pill that appears when a request has been pending
 * long enough that the backend is almost certainly cold-booting
 * (lib/serverWake — 4s under the 20s transport timeout). Pairs the
 * mk-ill `server-waking` piece with <BrandLoader> per the Agent I
 * wiring guide §5 («Render cold-start … pair with BrandLoader»).
 *
 * Honesty rules:
 *   - it never claims the server is DOWN — only that it is waking,
 *     which is the truthful expectation for a free-tier cold start;
 *   - role="status" + polite live region: announced once on appear;
 *     the disappearance is not announced (silence resolving is the
 *     expected outcome, not news);
 *   - above the bottom-nav on mobile (it never covers the tab bar),
 *     and it respects the safe-area inset.
 */
import { useEffect, useState } from 'react';
import { Illustration } from '../illustrations/Illustration';
import { BrandLoader } from '../illustrations/BrandLoader';
import { subscribeServerWake, isServerSlow, serverWakePhase, type WakePhase } from '../../lib/serverWake';

/** R350 H4 — phase-aware copy: calm at 4s, the honest 30–60s expectation
 *  past 25s (the transport keeps retrying the whole window — api.ts
 *  WAKE_RETRY — so "do not close the page" is the truthful instruction). */
const PHASE_TEXT: Record<Exclude<WakePhase, 'ok'>, string> = {
  waking: 'الخادم يستيقظ بعد إقلاع بارد — أول استدعاء قد يطول قليلًا',
  long: 'ما زال الخادم يستيقظ — عادةً ٣٠–٦٠ ثانية. لا تُغلق الصفحة، نُعيد المحاولة تلقائيًا',
};

export function ServerWakePill() {
  const [slow, setSlow] = useState(isServerSlow);
  const [phase, setPhase] = useState<WakePhase>(serverWakePhase);

  useEffect(
    () =>
      subscribeServerWake((isSlow) => {
        setSlow(isSlow);
        setPhase(serverWakePhase());
      }),
    [],
  );

  // The phase can advance (waking → long) without the slow flag flipping —
  // a light tick keeps the copy honest as the boot drags on.
  useEffect(() => {
    if (!slow) return undefined;
    const id = window.setInterval(() => setPhase(serverWakePhase()), 2_500);
    return () => window.clearInterval(id);
  }, [slow]);

  if (!slow) return null;

  const text = PHASE_TEXT[phase === 'ok' ? 'waking' : phase];

  return (
    <div className="wake-pill" role="status" aria-live="polite">
      <span className="wake-pill-piece" aria-hidden>
        <Illustration name="server-waking" size={24} />
      </span>
      <span className="wake-pill-text">{text}</span>
      {/* The pill owns the single status announcement; the mark rides
          decorative (r280 BrandLoader mode). */}
      <BrandLoader label="الخادم يستيقظ بعد إقلاع بارد" size={20} decorative />
    </div>
  );
}
