/**
 * RulerGauge — R319 §B2 · the semester progress indicator.
 *
 * «مؤشرات» — the owner's missing-indicators verdict. The dashboard used
 * to print the semester as prose only («45% من الفصل مضى»); R319 seats
 * it as the sheet's FIRST section: a horizontal drafting ruler —
 *
 *      W07/16
 *      ▼
 *      |.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|
 *      ████████████████████░░░░░░░░░░  45%
 *
 * — one hairline tick per WEEK (taller every 4th), the orange fill up
 * to the term's progress, a mono `W07/16` label at the fill head (the
 * week index computed from the term's own start/end dates —
 * `d.term.startsAt`/`endsAt`, Latin digits per the platform's ONE
 * numeral convention), and the API's percentage as quiet mono meta
 * beside the ruler (kept — it replaces the old prose line).
 *
 * The week math is exported pure (`semesterWeeks`) so the unit pins
 * hold the arithmetic without rendering. Honest edges: a now before the
 * term start clamps to W01, past the end to the last week, a degenerate
 * term (end ≤ start / unparseable) degrades to a single-week ruler
 * rather than NaN.
 */

const DAY_MS = 86_400_000;

/** Local calendar-day floor (midnight of `d`'s own day). */
function dayFloor(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export interface SemesterWeeks {
  /** 1-based current week index, clamped into [1, totalWeeks]. */
  week: number;
  /** Whole weeks the term spans (≥1). */
  totalWeeks: number;
}

export function semesterWeeks(
  startsAt: string,
  endsAt: string,
  now: Date = new Date(),
): SemesterWeeks {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { week: 1, totalWeeks: 1 };
  }
  const totalDays = Math.round((dayFloor(new Date(end)) - dayFloor(new Date(start))) / DAY_MS);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const daysIn = Math.round((dayFloor(now) - dayFloor(new Date(start))) / DAY_MS);
  const week = Math.min(totalWeeks, Math.max(1, Math.floor(daysIn / 7) + 1));
  return { week, totalWeeks };
}

export function RulerGauge({
  startsAt,
  endsAt,
  progressPct,
  now = new Date(),
  ariaLabel = 'تقدّم الفصل الدراسي',
}: {
  startsAt: string;
  endsAt: string;
  /** The API's term progressPct — drives the fill + the quiet meta. */
  progressPct: number;
  now?: Date;
  ariaLabel?: string;
}) {
  const { week, totalWeeks } = semesterWeeks(startsAt, endsAt, now);
  const pct = Number.isFinite(progressPct)
    ? Math.min(100, Math.max(0, progressPct))
    : 0;
  const head = `W${String(week).padStart(2, '0')}/${String(totalWeeks).padStart(2, '0')}`;
  return (
    <div
      className="r319s-ruler"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={`${head} · ${Math.round(pct)}%`}
      aria-label={ariaLabel}
    >
      <div className="r319s-ruler-track">
        <div className="r319s-ruler-ticks" aria-hidden="true">
          {Array.from({ length: totalWeeks }, (_, i) => (
            <span
              key={i}
              className={i % 4 === 0 ? 'r319s-ruler-tick r319s-ruler-tick--major' : 'r319s-ruler-tick'}
              style={totalWeeks > 1 ? { insetInlineStart: `${(i / (totalWeeks - 1)) * 100}%` } : undefined}
            />
          ))}
        </div>
        <div className="r319s-ruler-fill" style={{ inlineSize: `${pct}%` }} />
        <span
          className="r319s-ruler-head r319s-mono"
          dir="ltr"
          style={{ insetInlineStart: `clamp(0px, ${pct}%, calc(100% - 52px))` }}
        >
          {head}
        </span>
      </div>
      <span className="r319s-ruler-meta">
        <bdi className="r319s-mono r319s-ruler-pct" dir="ltr">{Math.round(pct)}%</bdi>
        <span>من الفصل مضى</span>
      </span>
    </div>
  );
}
