import { ShieldCheck, Bot as BotIcon, Info } from 'lucide-react';
import { Icon } from '../Icon';
import { formatPct } from '../../lib/format';

/**
 * ScanResults — the plagiarism/AI-check presentation (r199, 4B family).
 *
 * The scan is a DECLARED deterministic simulation — this surface says so
 * (the r168b honesty contract) while presenting the two gated metrics
 * with their thresholds as first-class data: value, meter, threshold
 * tick, and the threshold sentence. Nothing here implies an external
 * detection service; the label «محاكاة» rides every render.
 *
 * Tier logic is the page-family canon (same thresholds the student row
 * and the teacher queue have always applied):
 *   plagiarism: <15 ok · <25 warn · else bad
 *   ai content: <25 ok · <40 warn · else bad
 * While `scanning` the cells run an indeterminate sweep instead of
 * faking numbers (the scan endpoint reports no increments).
 */

export type ScanTier = 'ok' | 'warn' | 'bad';

export function plagiarismTier(pct?: number | null): ScanTier {
  if (pct == null) return 'ok';
  if (pct < 15) return 'ok';
  if (pct < 25) return 'warn';
  return 'bad';
}

export function aiTier(pct?: number | null): ScanTier {
  if (pct == null) return 'ok';
  if (pct < 25) return 'ok';
  if (pct < 40) return 'warn';
  return 'bad';
}

const TIER_NOTE: Record<ScanTier, string> = {
  ok: 'داخل الحد المقبول',
  warn: 'قرب الحد — المقبول أقل من',
  bad: 'فوق الحد المقبول — الحد عند',
};

function Meter({ pct, tier, threshold }: { pct: number; tier: ScanTier; threshold: number }) {
  // The meter is linear 0-100 with the threshold ticked; above the
  // threshold the fill crosses the tick — the shape tells the story
  // before the color does.
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="rs-scan-meter"
      role="img"
      aria-label={`مقياس النسبة: ${width} بالمئة من 100، الحد عند ${threshold}`}
    >
      <div className={`rs-scan-meter-fill is-${tier}`} style={{ inlineSize: `${width}%` }} />
      <span className="rs-scan-meter-tick" style={{ insetInlineStart: `${threshold}%` }} aria-hidden="true" />
    </div>
  );
}

function Cell({
  icon, label, pct, tier, threshold, live,
}: {
  icon: typeof ShieldCheck;
  label: string;
  pct?: number | null;
  tier: ScanTier;
  threshold: number;
  live?: boolean;
}) {
  return (
    <div className={`rs-scan-cell${live ? ' is-live' : ''}`}>
      <span className="rs-scan-head">
        <Icon icon={icon} size={13} strokeWidth={2} />
        {label}
      </span>
      {live ? (
        <>
          <span className="rs-scan-value" aria-hidden="true">—</span>
          <span className="rs-scan-note" role="status">جارٍ احتساب النسبة التجريبية…</span>
        </>
      ) : (
        <>
          <span className={`rs-scan-value is-${tier}`}>
            <bdi>{formatPct(pct) ?? '—'}%</bdi>
          </span>
          <Meter pct={pct ?? 0} tier={tier} threshold={threshold} />
          <span className="rs-scan-note">
            {tier === 'ok' ? (
              <>{TIER_NOTE[tier]} (أقل من {threshold}%)</>
            ) : (
              <>{TIER_NOTE[tier]} {threshold}%</>
            )}
          </span>
        </>
      )}
    </div>
  );
}

export function ScanResults({
  plagiarismPct,
  aiContentPct,
  scanning = false,
  note = 'قيم الفحص تجريبية معلنة — ليست قياساً فعلياً حتى تفعيل كشف حقيقي.',
}: {
  plagiarismPct?: number | null;
  aiContentPct?: number | null;
  scanning?: boolean;
  note?: string;
}) {
  return (
    <div className="flex-col gap-2" style={{ width: '100%' }}>
      <div className="rs-scan">
        <Cell
          icon={ShieldCheck}
          label="نسبة الانتحال"
          pct={plagiarismPct}
          tier={plagiarismTier(plagiarismPct)}
          threshold={15}
          live={scanning}
        />
        <Cell
          icon={BotIcon}
          label="محتوى ذكاء اصطناعي"
          pct={aiContentPct}
          tier={aiTier(aiContentPct)}
          threshold={25}
          live={scanning}
        />
      </div>
      {/* The honesty tag is its own element so the «محاكاة» label stays
          machine-pinnable everywhere the cells render (r164f). */}
      <p className="rs-scan-sim" role="note">
        <Icon icon={Info} size={12} strokeWidth={2} />
        <strong className="rs-scan-sim-tag">محاكاة</strong>
        <span>{note}</span>
      </p>
    </div>
  );
}
