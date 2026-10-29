/**
 * SlowServerCard — R323 §A2 (task 1-b) — the cold-start card.
 *
 * Render's free-plan instances sleep; the first request after a nap can
 * take 30–60 s. When the wiring reports setServerSlow(true) the
 * orchestrator PREEMPTS the full-screen seat for this card (one layer,
 * always) and restores whatever it displaced when the server wakes.
 *
 * Contract:
 *  · Calm paper card on the page ground: the mark ONCE (size 40),
 *    rotating Arabic status lines, one retry action. Radius 0, no
 *    shadows, no gradients — hairline/ink/orange grammar.
 *  · INFORMATIONAL: Escape and outside clicks do NOT dismiss it —
 *    there is deliberately no dismissal path (a backdrop or keydown
 *    handler would be one). Only the server waking (setServerSlow(false))
 *    or a manual retry (re-fires the provided onRetry) leaves it.
 *  · data-fullscreen-layer="slow-server"; role="status" + polite
 *    live region so the rotation announces without stealing focus.
 *  · Under reduced motion the status lines stay on the FIRST line
 *    (no rotation), and no transition decorates anything.
 */
import { useEffect, useState } from 'react';

import { Logo } from '../../brand/Logo';
import { useLoaderState } from '../../lib/loaderOrchestrator';

/** The rotating status lines — honest, calm, first-person plural. */
const STATUS_LINES: readonly string[] = [
  'الخادم يستيقظ… — عادةً يستغرق ٣٠–٦٠ ثانية',
  'لا تقلق، بياناتك محفوظة',
  'نُعيد المحاولة تلقائيًا كل بضع ثوانٍ',
  'شكرًا لصبرك — الرحلة تكمل بعد قليل',
];

const ROTATE_MS = 4000;

export interface SlowServerCardProps {
  /** Re-fired by the retry button (the wiring re-issues its probe). */
  onRetry?: () => void;
  /** Rotation cadence — exposed for tests. */
  rotateMs?: number;
}

export function SlowServerCard({ onRetry, rotateMs = ROTATE_MS }: SlowServerCardProps) {
  const snap = useLoaderState();
  const [lineIndex, setLineIndex] = useState(0);

  const active = snap.fullscreen === 'slow-server';

  useEffect(() => {
    if (!active || snap.reducedMotion) return undefined;
    const id = window.setInterval(() => {
      setLineIndex((i) => (i + 1) % STATUS_LINES.length);
    }, rotateMs);
    return () => window.clearInterval(id);
  }, [active, snap.reducedMotion, rotateMs]);

  /* Nothing when the card does not hold the seat. */
  if (!active) return null;

  return (
    <div className="mdk-slow-server" data-fullscreen-layer="slow-server" role="status" aria-live="polite">
      <div className="mdk-slow-server-card">
        <Logo variant="mark" size={40} tone="auto" className="mdk-slow-server-logo" />
        <p className="mdk-slow-server-line">{STATUS_LINES[lineIndex] ?? STATUS_LINES[0]}</p>
        <button
          type="button"
          className="mdk-slow-server-retry"
          onClick={onRetry}
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
