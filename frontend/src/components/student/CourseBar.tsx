/**
 * CourseBar — R319 §B2 · the per-course progress indicator.
 *
 * «مؤشرات»: each course row's progress rides a hairline technical bar —
 *
 *      CS-201 ████████████|──────────  62%
 *
 * — the course code in mono at the start, a hairline track with an ink
 * fill and a taller END-TICK at the exact value (the drafting-machine
 * register: the tick is the reading, the fill is the glance), and the
 * percentage in mono at the end. Neutral ink, not the signal orange —
 * the r305 one-accent discipline keeps orange for the semester ruler,
 * LIVE and the page's single CTA.
 *
 * `pct` clamps to [0,100] so a poisoned payload can never draw a
 * 150%-wide fill or a negative width.
 */
export function CourseBar({
  code,
  pct,
  ariaLabel,
}: {
  /** Course code (mono, dir=ltr). Optional — the KPI avg bar passes 'AVG'. */
  code?: string;
  /** Progress percent — clamped to [0,100]. */
  pct: number;
  ariaLabel?: string;
}) {
  const v = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  return (
    <span
      className="r319s-coursebar"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={ariaLabel ?? (code ? `تقدّم مقرّر ${code}` : 'نسبة الإنجاز')}
    >
      {code !== undefined && (
        <bdi className="r319s-mono r319s-coursebar-code" dir="ltr">{code}</bdi>
      )}
      <span className="r319s-coursebar-track" aria-hidden="true">
        <span className="r319s-coursebar-fill" style={{ inlineSize: `${v}%` }} />
        <span className="r319s-coursebar-tick" style={{ insetInlineStart: `${v}%` }} />
      </span>
      <bdi className="r319s-mono r319s-coursebar-pct" dir="ltr">{Math.round(v)}%</bdi>
    </span>
  );
}
