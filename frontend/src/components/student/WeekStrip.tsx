/**
 * WeekStrip — R319 §B2 · the today strip as a 7-cell week row.
 *
 * «مؤشرات»: the TODAY section opens with the current week as one
 * hairline row of 7 square cells — the app's own week order
 * (WEEKDAY_NAMES_AR, Sunday-first — the CalendarPage/schedule contract)
 * flowing RTL so الأحد sits inline-start. The CURRENT day cell is
 * INKED (ink fill, paper label — the deep-band inversion in miniature);
 * the other days stay plain with hairline separators; the date digits
 * are mono (Latin, the one-numeral convention).
 *
 * `now` is injectable so tests and the e2e clock freeze the strip
 * deterministically (FIXED_NOW 2026-03-15 is a Sunday → cell 0 inked,
 * dates 15–21).
 */
import { WEEKDAY_NAMES_AR } from '../../lib/format';

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function WeekStrip({ now = new Date() }: { now?: Date }) {
  const today = startOfDay(now);
  const dow = today.getDay(); // 0 = Sunday — the WEEKDAY_NAMES_AR index
  const weekStart = today.getTime() - dow * DAY_MS;
  return (
    <div className="r319s-weekstrip" role="group" aria-label="أسبوعك الحالي">
      {WEEKDAY_NAMES_AR.map((name, i) => {
        const isToday = i === dow;
        const date = new Date(weekStart + i * DAY_MS);
        return (
          <div
            key={name}
            className={isToday ? 'r319s-weekcell r319s-weekcell--today' : 'r319s-weekcell'}
            aria-current={isToday ? 'date' : undefined}
          >
            <span className="r319s-weekcell-name">{name}</span>
            <bdi className="r319s-mono r319s-weekcell-date" dir="ltr" aria-hidden="true">
              {date.getDate()}
            </bdi>
            {isToday && <span className="sr-only">اليوم</span>}
          </div>
        );
      })}
    </div>
  );
}
