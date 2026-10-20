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
import { subscribeServerWake, isServerSlow } from '../../lib/serverWake';

export function ServerWakePill() {
  const [slow, setSlow] = useState(isServerSlow);

  useEffect(() => subscribeServerWake(setSlow), []);

  if (!slow) return null;

  return (
    <div className="wake-pill" role="status" aria-live="polite">
      <span className="wake-pill-piece" aria-hidden>
        <Illustration name="server-waking" size={24} />
      </span>
      <span className="wake-pill-text">الخادم يستيقظ بعد إقلاع بارد — أول استدعاء قد يطول قليلًا</span>
      {/* The pill owns the single status announcement; the mark rides
          decorative (r280 BrandLoader mode). */}
      <BrandLoader label="الخادم يستيقظ بعد إقلاع بارد" size={20} decorative />
    </div>
  );
}
