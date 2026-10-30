/* ═════════════════════════════════════════════════════════════════════
   MADAREK — R325 P2.5 — the INDICATOR LANGUAGE (patterns/indicators.tsx)
   ─────────────────────────────────────────────────────────────────────
   The owner's long-standing verdict on the student pages — «ما فيها
   مؤشرات» — gets its answer as REUSABLE PRIMITIVES, not a one-page
   reskin: the drafting register (hairlines only, radius 0, ink/orange
   only, mono Latin numerals `dir="ltr"`) as seven small instruments a
   page composes. DESIGN.md §R325 is the grammar; this file is its
   measurement vocabulary:

     RulerGauge         — any 0–100 datum as a ruled ruler
                          (mono numerals 0/25/50/75/100, ink fill run,
                          the ONE orange end-tick at the reading)
     SegmentedProgress  — one square segment per week/lecture
                          (full=ink · partial=mid · empty=hatch)
     MasteryCells       — the 0–4 mastery scale as cells
                          (0=hatch · 1–3=ink 25/50/75% · 4=the orange dot)
     StreakTicks        — day ticks for a weekly study streak
                          (done=ink fill · missed=hatch · no-data=empty
                          hairline · today=the orange outline)
     ScheduleStrip      — the week's classes as 7 day columns with mono
                          day labels (today = the inked header cell)
     AttendanceTicks    — present ✓ ink / absent ✗ hatch / late ✓ signal
     GradeBars          — hairline-axis distribution bars
                          (ink bars; the student's own band in orange)

   THEME-PROOF BY CONSTRUCTION (§R325.l): every ink rides currentColor
   (fills, ticks, hairlines = color-mix on currentColor), so an
   instrument inherits the register of whatever surface it sits on —
   paper, the deep hero band, Ink theme — with zero per-theme rules.
   Orange is tokenized (--app-signal / --app-signal-ink) and stays the
   ONE signal: a reading head, a full-mastery dot, a late mark, an
   own-band bar. Never decoration.

   HONEST EDGES (the owner's other ask): a datum the API does not carry
   renders the instrument's EMPTY register — hatch cells, empty hairline
   ticks — never a fabricated number. Every quantization below is
   exported PURE (`clampPct`, `masteryLevel`, `watchState`,
   `segmentsFromCounts`, `attendanceMark`, `gradeBands`,
   `groupSlotsByDay`) so tests/unit/r325-indicators.test.ts pins the
   arithmetic without rendering.

   CSS: styles/r325-indicators.css (`.ind-*` — AppShell-imported right
   after r325-app.css, same cascade contract). Deliberately NOT added to
   the patterns/index.ts barrel (its signatures are CONTRACT-frozen and
   `RulerGauge` would collide with the r319 student kit's semester
   ruler): consumers import this module directly.
   ═════════════════════════════════════════════════════════════════════ */

import { WEEKDAY_NAMES_AR } from '../../lib/format';

const DAY_MS = 86_400_000;

/* ═══ Pure math (exported for the unit pins) ══════════════════════════ */

/** Clamp any datum into the honest [0,100] meter range; NaN → 0. The
 *  infinities clamp to the poles (a number, just out of range) — only
 *  not-a-number reads as the empty instrument. */
export function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** One segment of a SegmentedProgress run. */
export type SegmentState = 'full' | 'partial' | 'empty';

/**
 * `full` = fully consumed (completed watch), `partial` = begun, `empty`
 * = untouched. A junk/zero total with any watched seconds still reads
 * partial (something happened), never full.
 */
export function watchState(
  watchedSec: number,
  totalSec: number,
  completed?: boolean,
): SegmentState {
  if (completed) return 'full';
  const watched = Number.isFinite(watchedSec) ? watchedSec : 0;
  if (watched <= 0) return 'empty';
  if (!Number.isFinite(totalSec) || totalSec <= 0) return 'partial';
  return watched >= totalSec ? 'full' : 'partial';
}

/** Build the segment run from counts — full run first, then partial, then empty. */
export function segmentsFromCounts(
  total: number,
  full: number,
  partial = 0,
): SegmentState[] {
  const t = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const f = Math.min(Math.max(0, Math.floor(Number.isFinite(full) ? full : 0)), t);
  const p = Math.min(Math.max(0, Math.floor(Number.isFinite(partial) ? partial : 0)), t - f);
  return [
    ...Array<SegmentState>(f).fill('full'),
    ...Array<SegmentState>(p).fill('partial'),
    ...Array<SegmentState>(Math.max(0, t - f - p)).fill('empty'),
  ];
}

/**
 * The 0–1 mastery fraction (the matrix/gaps wire datum) quantized onto
 * the 0–4 cell scale — round-half-up, clamped; NaN → 0 (±∞ clamp to
 * the poles, like clampPct). 0.35 → 1, 0.52 → 2, 0.8 → 3, 0.9 → 4,
 * exactly the matrix page's registers.
 */
export function masteryLevel(mastery: number): 0 | 1 | 2 | 3 | 4 {
  if (Number.isNaN(mastery)) return 0;
  const lvl = Math.round(Math.min(1, Math.max(0, mastery)) * 4);
  return Math.min(4, Math.max(0, lvl)) as 0 | 1 | 2 | 3 | 4;
}

/** The visual mark of one attendance record. EXCUSED joins ABSENT —
 *  the tick row's three states are presence-shaped, and an excused
 *  absence is honestly «not present». */
export type AttendanceMark = 'present' | 'late' | 'absent';

export function attendanceMark(status: string): AttendanceMark {
  if (status === 'PRESENT') return 'present';
  if (status === 'LATE') return 'late';
  return 'absent';
}

export const GRADE_BAND_LABELS: readonly string[] = [
  '<50', '50–59', '60–69', '70–79', '80–89', '90+',
];

/**
 * Six equal bands over [0,100]. Scores outside/junk drop out; `own`
 * (the student's own average) marks the band the orange bar wears.
 * Returns counts + ownIndex (null when nothing graded / no own datum).
 */
export function gradeBands(
  scores: readonly number[],
  own?: number | null,
): { counts: number[]; ownIndex: number | null } {
  const counts = [0, 0, 0, 0, 0, 0];
  const bandOf = (v: number): number =>
    v < 50 ? 0 : v < 60 ? 1 : v < 70 ? 2 : v < 80 ? 3 : v < 90 ? 4 : 5;
  for (const s of scores) {
    if (!Number.isFinite(s)) continue;
    counts[bandOf(clampPct(s))]! += 1;
  }
  const graded = counts.reduce((a, b) => a + b, 0);
  if (graded === 0) return { counts, ownIndex: null };
  if (own === null || own === undefined || !Number.isFinite(own)) {
    return { counts, ownIndex: null };
  }
  return { counts, ownIndex: bandOf(clampPct(own)) };
}

/**
 * Schedule slots → 7 Sunday-first columns (the WEEKDAY_NAMES_AR /
 * Date#getDay index contract). Slots with a junk dayOfWeek drop out —
 * a poisoned payload never invents an eighth day.
 */
export function groupSlotsByDay<T extends { dayOfWeek: number }>(
  slots: readonly T[],
): T[][] {
  const cols: T[][] = [[], [], [], [], [], [], []];
  for (const s of slots) {
    const d = Math.floor(s.dayOfWeek);
    if (!Number.isFinite(d) || d < 0 || d > 6) continue;
    cols[d]!.push(s);
  }
  return cols;
}

/* ═══ The instruments ═════════════════════════════════════════════════ */

/**
 * RulerGauge — any 0–100 datum as a drafting ruler:
 *
 *        ▼ (orange end-tick — the reading)
 *   ────────────|────.────|────.────|──   ← hairline ticks + ink fill run
 *   0        25       50        75      100   ← mono numerals, dir=ltr
 *
 * 21 ticks (every 5%), majors at 0/25/50/75/100. The fill run is the
 * element's own ink (currentColor — it inverts with its surface); the
 * end-tick is the ONE orange. `role="meter"` with the honest clamped
 * reading; the aria label carries the datum's name.
 */
export function RulerGauge({
  value,
  ariaLabel = 'المؤشر',
}: {
  /** The datum, 0–100 (clamped; junk reads 0 — an honest empty ruler). */
  value: number;
  ariaLabel?: string;
}) {
  const v = clampPct(value);
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
  return (
    <span
      className="ind-ruler"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-valuetext={`${Math.round(v)}%`}
      aria-label={ariaLabel}
    >
      <span className="ind-ruler-track" aria-hidden="true">
        {ticks.map((n) => (
          <span
            key={n}
            className={n % 25 === 0 ? 'ind-ruler-tick ind-ruler-tick--major' : 'ind-ruler-tick'}
            style={{ insetInlineStart: `${n}%` }}
          />
        ))}
        <span className="ind-ruler-fill" style={{ inlineSize: `${v}%` }} />
        <span className="ind-ruler-head" style={{ insetInlineStart: `${v}%` }} />
      </span>
      <span className="ind-ruler-numerals" aria-hidden="true">
        {[0, 25, 50, 75, 100].map((n) => (
          <bdi
            key={n}
            className="ind-mono ind-ruler-num"
            dir="ltr"
            style={{
              insetInlineStart: `${n}%`,
              /* RTL anchoring: the numeral's inline-start edge rides the
                 tick — center the middle numerals on their tick and fold
                 the two edge numerals inward so they never overflow. */
              transform: n === 0 ? undefined : n === 100 ? 'translateX(100%)' : 'translateX(50%)',
            }}
          >
            {n}
          </bdi>
        ))}
      </span>
    </span>
  );
}

/**
 * SegmentedProgress — one square segment per week/lecture:
 *
 *   ███ ███ ███ ▒▒ ░░ ░░ ░░     full=ink · partial=mid · empty=hatch
 *
 * The whole run is one `role="meter"` (n segments, full count as the
 * value); callers print the mono 03/12 readout beside it from the same
 * array — this component never formats numerals it wasn't handed.
 */
export function SegmentedProgress({
  segments,
  ariaLabel,
}: {
  segments: readonly SegmentState[];
  ariaLabel?: string;
}) {
  const n = segments.length;
  const full = segments.filter((s) => s === 'full').length;
  return (
    <span
      className="ind-segments"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={n}
      aria-valuenow={full}
      aria-valuetext={`${full}/${n}`}
      aria-label={ariaLabel}
    >
      {segments.map((s, i) => (
        <span key={i} className={`ind-segment ind-segment--${s}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/**
 * MasteryCells — the 0–4 mastery scale as four square cells:
 *
 *   ░░░░  0 · untouched (hatch)
 *   ██░░  1 → 25%   ███░  2 → 50%   ████  3 → 75%   (ink fills)
 *   ███●  4 → full mastery — the orange DOT, the one signal state
 *
 * `mastery` is the wire's 0–1 fraction; `masteryLevel` quantizes it.
 */
export function MasteryCells({
  mastery,
  ariaLabel = 'إتقان المفهوم',
}: {
  /** 0–1 mastery fraction (the matrix/gaps datum). */
  mastery: number;
  ariaLabel?: string;
}) {
  const lvl = masteryLevel(mastery);
  return (
    <span
      className="ind-mastery"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={lvl * 25}
      aria-valuetext={`${masteryLevel(mastery)}/4`}
      aria-label={ariaLabel}
    >
      {[1, 2, 3, 4].map((i) =>
        lvl === 4 && i === 4 ? (
          <span key={i} className="ind-mastery-cell ind-mastery-dot" aria-hidden="true" />
        ) : (
          <span
            key={i}
            className={`ind-mastery-cell${i <= lvl ? ' ind-mastery-cell--filled' : ''}`}
            aria-hidden="true"
          />
        ),
      )}
    </span>
  );
}

/**
 * StreakTicks — the weekly study streak as 7 day ticks:
 *
 *   ■ ■ ▨ · · ■ ◻    done=ink fill · missed=hatch · none=empty hairline
 *                     today=the orange outline (over any state)
 *
 * NO streak datum exists in the API yet — the dashboard calls this with
 * NO days and the component renders its honest register: seven empty
 * hairline boxes, today outlined, the caller's honest note beside. When
 * a daily-log datum ships, `days` (Sunday-first, ≤7) lights the row up
 * unchanged.
 */
export type StreakDay = 'done' | 'missed' | 'none';

export function StreakTicks({
  days,
  todayIndex,
  note,
  ariaLabel = 'سجل الدراسة الأسبوعي',
}: {
  /** Sunday-first day states, up to 7; missing days render as `none`. */
  days?: readonly StreakDay[];
  /** 0–6 — the day that wears the orange outline (Date#getDay). */
  todayIndex?: number;
  /** One honest line beside the ticks (e.g. why the row is empty). */
  note?: string;
  ariaLabel?: string;
}) {
  const week: StreakDay[] = [];
  for (let i = 0; i < 7; i += 1) week.push(days?.[i] ?? 'none');
  return (
    <span className="ind-streak" role="img" aria-label={ariaLabel}>
      {week.map((s, i) => (
        <span
          key={i}
          className={`ind-streak-tick ind-streak-tick--${s}${i === todayIndex ? ' ind-streak-tick--today' : ''}`}
          aria-hidden="true"
        />
      ))}
      {note ? <span className="ind-streak-note">{note}</span> : null}
    </span>
  );
}

/** One class slot of the week timetable (real schedule data). */
export interface ScheduleSlotView {
  id: string;
  start: string;
  end?: string;
  code?: string;
  room?: string | null;
}

/**
 * ScheduleStrip — the week's classes as 7 day columns:
 *
 *   الأحد   الاثنين  الثلاثاء …   ← mono date numerals under the names
 *   [09:00           —           …
 *    CS301]                      ← slots: mono time + mono code
 *
 * The TODAY column's header cell rides the WeekStrip grammar (ink fill,
 * surface-colored labels — the deep-band inversion in miniature). Empty
 * days print one honest muted dash. Slots carry Latin runs only, so
 * every dynamic string is bdi-wrapped with dir="ltr".
 */
export function ScheduleStrip({
  columns,
  now = new Date(),
  ariaLabel = 'جدول الأسبوع',
}: {
  /** 7 Sunday-first columns — `groupSlotsByDay`'s exact output. */
  columns: ReadonlyArray<ReadonlyArray<ScheduleSlotView>>;
  now?: Date;
  ariaLabel?: string;
}) {
  const todayDow = now.getDay();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - todayDow);
  return (
    <div className="ind-sched" role="group" aria-label={ariaLabel}>
      {WEEKDAY_NAMES_AR.map((name, i) => {
        const slots = columns[i] ?? [];
        const date = new Date(weekStart.getTime() + i * DAY_MS);
        return (
          <div
            key={name}
            className={`ind-sched-day${i === todayDow ? ' ind-sched-day--today' : ''}`}
          >
            <span className="ind-sched-head">
              <span className="ind-sched-dayname">{name}</span>
              <bdi className="ind-mono ind-sched-date" dir="ltr" aria-hidden="true">
                {date.getDate()}
              </bdi>
              {i === todayDow && <span className="sr-only">اليوم</span>}
            </span>
            <span className="ind-sched-slots">
              {slots.length === 0 ? (
                <span className="ind-sched-free" aria-hidden="true">—</span>
              ) : (
                slots.map((slot) => (
                  <span key={slot.id} className="ind-sched-slot">
                    {slot.code ? <bdi className="ind-mono ind-sched-code" dir="ltr">{slot.code}</bdi> : null}
                    <bdi className="ind-mono ind-sched-time" dir="ltr">
                      {slot.start}
                      {slot.end ? `–${slot.end}` : ''}
                    </bdi>
                  </span>
                ))
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ATT_MARK_LABEL: Record<AttendanceMark, string> = {
  present: 'حاضر',
  late: 'متأخر',
  absent: 'غائب',
};

/**
 * AttendanceTicks — a roll-call row:
 *
 *   ✓ ✓ ✓ ◨ ✗      present=✓ ink · absent=✗ on hatch · late=✓ signal
 *
 * Marks render oldest→newest in the order handed over; every tick
 * carries its Arabic state as title + sr-only. With NO marks the row
 * renders its honest empty register (the hatch field + note) — callers
 * never fabricate a presence history.
 */
export function AttendanceTicks({
  marks,
  emptyNote,
  ariaLabel = 'سجل الحضور',
}: {
  marks: readonly AttendanceMark[];
  /** The honest line when there is nothing to tick yet. */
  emptyNote?: string;
  ariaLabel?: string;
}) {
  if (marks.length === 0) {
    return (
      <span className="ind-att ind-att--empty" role="img" aria-label={ariaLabel}>
        {emptyNote ? <span className="ind-streak-note">{emptyNote}</span> : null}
      </span>
    );
  }
  return (
    <span className="ind-att" role="img" aria-label={ariaLabel}>
      {marks.map((m, i) => (
        <span key={i} className={`ind-att-tick ind-att-tick--${m}`} title={ATT_MARK_LABEL[m]}>
          <span aria-hidden="true">{m === 'absent' ? '✗' : '✓'}</span>
          <span className="sr-only">{ATT_MARK_LABEL[m]}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * GradeBars — a score distribution over the six equal bands, on a
 * shared hairline baseline:
 *
 *        ▄              █ ← own band: the ONE orange
 *   ▄    █    ▄    █    █
 *   ────────────────────────   ← hairline axis
 *   <50  50–59 60–69 70–79 80–89 90+   ← mono, dir=ltr
 *
 * `ownIndex` (gradeBands') paints that band's bar + label in the
 * signal. All-zero distributions still render (honest empty columns).
 */
export function GradeBars({
  bands,
  ownIndex,
  ariaLabel = 'توزيع الدرجات',
}: {
  /** Six counts from `gradeBands` (or any equal-length count run). */
  bands: readonly number[];
  /** The band wearing the orange (the student's own). */
  ownIndex?: number | null;
  ariaLabel?: string;
}) {
  const max = Math.max(1, ...bands.filter((n) => Number.isFinite(n)));
  return (
    <span className="ind-grades" role="img" aria-label={ariaLabel}>
      {bands.map((n, i) => {
        const h = Number.isFinite(n) ? Math.max(0, Math.min(1, n / max)) : 0;
        const own = i === ownIndex;
        return (
          <span key={i} className={`ind-grade${own ? ' ind-grade--own' : ''}`}>
            <span className="ind-grade-col" aria-hidden="true">
              <span
                className="ind-grade-fill"
                style={{ blockSize: `${Math.round(h * 100)}%` }}
              />
            </span>
            <bdi className="ind-mono ind-grade-count" dir="ltr">
              {Number.isFinite(n) ? n : 0}
            </bdi>
            <bdi className="ind-mono ind-grade-label" dir="ltr">
              {GRADE_BAND_LABELS[i] ?? ''}
            </bdi>
          </span>
        );
      })}
    </span>
  );
}
