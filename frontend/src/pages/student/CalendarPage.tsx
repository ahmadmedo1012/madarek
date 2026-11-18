import { useMemo, useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Presentation, ClipboardList, ClipboardCheck, Radio,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader } from '../../components/patterns';
/* R319 (c3-S2) — the §B2 kit: the today week strip (the page's genuine
 * week context) + the hatched empty cell + the mono-indexed section
 * bar that opens the month instrument (r341 D7a — the calendar joins
 * the family's [nn] register: every student page's regions open with
 * the SectionBar). */
import { WeekStrip, EmptyCell, SectionBar, BarCount } from '../../components/student';
import { Icon } from '../../components/Icon';
import { useStudentDashboard, useMyEnrollments, useMyExams } from '../../hooks/useResources';
import { WEEKDAY_NAMES_AR, arUnit } from '../../lib/format';
import { ASSIGNMENT_KIND_LABEL, EXAM_KIND_LABEL } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import {
  monthGrid,
  monthTitleAr,
  tripoliToday,
  civilKeyOf,
  civilDayParts,
  classEventsFromSchedule,
  datedEvents,
  examEvents,
  eventsByDay,
  type CalendarCell,
  type CalendarEvent,
  type CalendarEventKind,
} from '../../lib/calendar';
import { formatDate } from '../../utils/numbers';
/* ── r305-c (schedule family) imports — the only region agent 2-c edits above the components ── */
import '../../styles/student/heron.css';
import '../../styles/student/heron-schedule.css';
/* R319 (c3-S2): the sheet system — the §B2 component anatomy + the
 * academic family's harmonics (the calendar's own grid/legend/detail
 * registers keep their r305-c pins; the week strip joins the sheet). */
import '../../styles/student/pages.css';
import '../../styles/student/academic-pages.css';

/**
 * r164-c — /student/calendar: the ONE calendar view (the Canvas
 * benchmark gap: "exams/deadlines invisible together"). A month grid,
 * RTL with Arabic month/day labels, every calendar-day concept anchored
 * to the AUDIENCE calendar (Africa/Tripoli — lib/calendar.ts mirrors
 * backend/src/lib/dates.ts), uniting the student's four deadline
 * surfaces in one place:
 *  · weekly schedule slots (recurring — /enrollments/me),
 *  · assignment due dates (the dashboard agenda's week window),
 *  · exam windows (openAt + closeAt — /exams/me, unbounded),
 *  · live sessions (the dashboard agenda's week window).
 * Composed CLIENT-SIDE from existing endpoints — no new backend route.
 * Every event row is a link to its source page (course / exam taker /
 * broadcast); today is highlighted; dots + legend carry the kinds.
 */

const KIND_LEGEND: Array<{ kind: CalendarEventKind; label: string }> = [
  { kind: 'class', label: 'حصص ومحاضرات' },
  { kind: 'assignment', label: 'واجبات' },
  { kind: 'exam', label: 'اختبارات' },
  { kind: 'live', label: 'بث مباشر' },
];

const KIND_ICON: Record<CalendarEventKind, LucideIcon> = {
  class: Presentation,
  assignment: ClipboardList,
  exam: ClipboardCheck,
  live: Radio,
};

/** The exam window edge an exam event marks («يفتح» / «آخر تسليم»). */
function examPhaseLabel(phase: 'opens' | 'closes'): string {
  return phase === 'opens' ? 'يفتح' : 'آخر تسليم';
}

/** «الأربعاء · 14 يناير» for a selected civil day key. */
function selectedDayLabel(key: string): string {
  const parts = civilDayParts(key);
  if (!parts) return key;
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day, 12));
  const dow = WEEKDAY_NAMES_AR[date.getUTCDay()];
  const md = formatDate(date, { day: 'numeric', month: 'long' });
  return `${dow} · ${md}`;
}

/* ── r366 (2-d): the week mode ──────────────────────────────────────
 *
 * The month grid answers "which days matter this month"; the phone's
 * honest question is "what is THIS week". The mode switcher rides the
 * card's head as the shared pill register; the week is the 7-day strip
 * (Sunday-first) containing the anchor day, and its cells carry the
 * day's events as one-line chips (ellipsis + the full title on the
 * tooltip) inked with the same kind colours the legend dots speak. */
type CalMode = 'month' | 'week';

/** Max chips per week cell — beyond it a «+n أخرى» chip carries the
 * rest (titles on its tooltip); the detail list below stays the full
 * ledger for any selected day. */
const WEEK_CHIP_CAP = 3;

/** The 7-day strip containing the anchor key (Sunday-first — pure UTC
 *  math like monthGrid; inMonth shades against the anchor's own month
 *  so a straddling week reads honestly at its seam). */
function weekGridOf(anchorKey: string): CalendarCell[] {
  const parts = civilDayParts(anchorKey);
  if (!parts) return [];
  const anchor = new Date(Date.UTC(parts.year, parts.month, parts.day, 12));
  const cursor = new Date(anchor);
  cursor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 7; i++) {
    cells.push({
      key: civilKeyOf({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth(), day: cursor.getUTCDate() }),
      dow: cursor.getUTCDay(),
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === anchor.getUTCMonth(),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
}

/** «12 – 18 يناير» — the week strip's range title (the strip's stand-in
 *  for the month title; a straddling week reads both months). */
function weekRangeTitleAr(anchorKey: string): string {
  const parts = civilDayParts(anchorKey);
  if (!parts) return '';
  const anchor = new Date(Date.UTC(parts.year, parts.month, parts.day, 12));
  const start = new Date(anchor);
  start.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const dayMonth = (d: Date) => formatDate(d, { day: 'numeric', month: 'long' });
  return `${dayMonth(start)} – ${dayMonth(end)}`;
}

/* r299 (final C): shape-matched pending mirror — the settled page is
 * a pattern header + the month grid; the skeleton holds the header's
 * own box and a 7×6 cell grid of the same footprint (the CardSkeleton
 * lines said "document", not "calendar" — the data-land swap jumped).
 * Skeleton cells reuse .cal-cell geometry (aria-hidden). */
function CalendarSkeleton() {
  return (
    <Card className="cal-card" flush>
      <header className="cal-head">
        <Skeleton width={28} height={28} rounded="var(--r-md)" />
        <Skeleton width={120} height={20} />
        <Skeleton width={28} height={28} rounded="var(--r-md)" />
      </header>
      <div className="cal-dow-row">
        {WEEKDAY_NAMES_AR.map((name) => (
          <span key={name} className="cal-dow"><Skeleton width={28} height={11} /></span>
        ))}
      </div>
      {/* .cal-grid-skel — deliberately NOT .cal-grid: the pending
          mirror holds the month's footprint without ever being the
          interactive grid (the unit pin "no .cal-grid while loading"
          keeps meaning exactly that). */}
      <div className="cal-grid-skel" aria-hidden>
        {Array.from({ length: 42 }).map((_, i) => (
          <span key={i} className="cal-cell-skel">
            <Skeleton width={24} height={24} rounded="var(--r-full, 999px)" />
          </span>
        ))}
      </div>
    </Card>
  );
}

export default function StudentCalendarPage() {
  const enrollments = useMyEnrollments();
  const dash = useStudentDashboard();
  const exams = useMyExams();

  // The view month + selected day live on the AUDIENCE calendar. The
  // initial view is today's Tripoli civil month; today's cell is the
  // initial selection. Lazy useState initializers read the clock once.
  // r304: todayKey is STATE (not a frozen const) so the «اليوم»
  // quick-return below can re-anchor the whole page to a freshly read
  // tripoliToday() when the session crosses midnight mid-browse — the
  // highlight, the view month and the selection can never disagree.
  const [todayKey, setTodayKey] = useState(() => civilKeyOf(tripoliToday()));
  const [view, setView] = useState(() => {
    const t = tripoliToday();
    return { year: t.year, month: t.month };
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  /* r366 (2-d): the card's mode — the 42-cell month grid or the
   * anchored 7-day week strip. weekAnchor is any civil day inside the
   * shown week (the selection when it owns the focus, else the viewed
   * month's first day); prev/next shift it a week at a time. */
  const [mode, setMode] = useState<CalMode>('month');
  const [weekAnchor, setWeekAnchor] = useState(todayKey);

  const cells = useMemo<CalendarCell[]>(
    () => (mode === 'month' ? monthGrid(view.year, view.month) : weekGridOf(weekAnchor)),
    [mode, view, weekAnchor],
  );

  // The four sources, merged per audience-calendar day. The schedule
  // expansion is grid-scoped (recurring); the dated/exam sources are
  // bucketed wherever their instants land — cells outside the visible
  // month simply never render them.
  const events = useMemo<CalendarEvent[]>(() => {
    if (!enrollments.data || !dash.data || !exams.data) return [];
    return [
      ...classEventsFromSchedule(
        enrollments.data.map((e) => ({
          offeringId: e.offering.id,
          courseName: e.offering.course.name,
          slots: e.offering.schedule,
        })),
        cells,
      ),
      ...datedEvents(
        dash.data.agenda.assignments.map((a) => ({
          id: a.id,
          title: `${ASSIGNMENT_KIND_LABEL[a.type]}: ${a.title}`,
          at: a.dueAt,
          to: `/student/courses/${a.offeringId}`,
        })),
        'assignment',
      ),
      ...examEvents(
        exams.data.map((e) => ({
          id: e.id,
          title: `${EXAM_KIND_LABEL[e.kind] ?? 'اختبار'}: ${e.title}`,
          openAt: e.openAt,
          closeAt: e.closeAt,
        })),
      ),
      ...datedEvents(
        dash.data.agenda.live.map((l) => ({
          id: l.id,
          title: `بث مباشر: ${l.title}`,
          at: l.scheduledAt,
          to: '/student/live',
        })),
        'live',
      ),
    ];
  }, [cells, enrollments.data, dash.data, exams.data]);

  const byDay = useMemo(() => eventsByDay(events), [events]);
  // Which kinds land on each cell (drives the dots, one per kind).
  const kindsByDay = useMemo(() => {
    const map = new Map<string, Set<CalendarEventKind>>();
    for (const ev of events) {
      const set = map.get(ev.dayKey) ?? new Set<CalendarEventKind>();
      set.add(ev.kind);
      map.set(ev.dayKey, set);
    }
    return map;
  }, [events]);
  const monthEventCount = useMemo(
    () => cells.filter((c) => c.inMonth && byDay.has(c.key)).length,
    [cells, byDay],
  );

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(Date.UTC(v.year, v.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  };

  /* r366 (2-d): week nav — ± one week on the anchor (Date.UTC rolls
   * the month/year overflow; the strip stays Sunday-first). */
  const shiftWeek = (delta: number) => {
    setWeekAnchor((k) => {
      const parts = civilDayParts(k);
      if (!parts) return k;
      const d = new Date(Date.UTC(parts.year, parts.month, parts.day + delta * 7, 12));
      return civilKeyOf({ year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() });
    });
  };

  /* r366 (2-d): the mode handoff keeps the user's place — month→week
   * anchors on the selection when it lives in the viewed month (else
   * the month's first week); week→month opens the anchor's month. */
  const switchMode = (m: CalMode) => {
    if (m === mode) return;
    setMode(m);
    if (m === 'week') {
      const p = civilDayParts(selectedKey);
      setWeekAnchor(
        p && p.year === view.year && p.month === view.month
          ? selectedKey
          : civilKeyOf({ year: view.year, month: view.month, day: 1 }),
      );
    } else {
      const p = civilDayParts(weekAnchor);
      if (p) setView({ year: p.year, month: p.month });
    }
  };

  /* r304 — «اليوم» quick-return: month browsing (and day selection)
   * loses the «where am I» anchor, so the header offers one honest tap
   * back. The chip renders ONLY while the page is away from today —
   * the visible month ≠ today's Tripoli civil month OR the selected
   * day ≠ today. The handler re-reads tripoliToday() (the same
   * lib/calendar.ts helper that built the initial state — no
   * reinvented date math) and re-anchors view + selection + highlight
   * together. Hidden when already on today: no dead control. */
  const todayParts = civilDayParts(todayKey);
  /* r366 (2-d): week mode reads "away" off the shown strip — a week
   * that doesn't hold today is as lost as a foreign month (the view
   * month itself may legitimately straddle; only the strip decides). */
  const awayFromToday = todayParts !== null && (
    mode === 'week'
      ? !cells.some((c) => c.key === todayKey) || selectedKey !== todayKey
      : view.year !== todayParts.year || view.month !== todayParts.month || selectedKey !== todayKey
  );
  const goToday = () => {
    const t = tripoliToday();
    const key = civilKeyOf(t);
    setTodayKey(key);
    if (mode === 'week') setWeekAnchor(key);
    else setView({ year: t.year, month: t.month });
    setSelectedKey(key);
  };

  // ── Loading / error shells (the shared States grammar) ──────────
  if (enrollments.isPending || dash.isPending || exams.isPending) {
    return (
      <div className="r319s-page">
      <PageFrame width="default">
        <PageHeader title="التقويم الأكاديمي" description="جارٍ جمع مواعيدك…" />
        {/* R319 (c3-S2): the week strip — the page's genuine today/week
            context (the grid's today cell anchors on it). r341 D7a: the
            [01] bar opens the month instrument in the pending mirror
            too — the settled handoff moves nothing (the r172b law). */}
        <SectionBar index="01" title="المواعيد" />
        <WeekStrip />
        <div aria-busy="true" aria-live="polite">
          <CalendarSkeleton />
        </div>
      </PageFrame>
      </div>
    );
  }
  if (enrollments.isError || dash.isError || exams.isError) {
    const failed = enrollments.isError ? enrollments : dash.isError ? dash : exams;
    return (
      <div className="r319s-page">
      <PageFrame width="default">
        <PageHeader title="التقويم الأكاديمي" />
        <SectionBar index="01" title="المواعيد" />
        <ErrorState
          message="تعذَّر تحميل التقويم الأكاديمي"
          error={failed.error}
          onRetry={() => {
            enrollments.refetch();
            dash.refetch();
            exams.refetch();
          }}
        />
      </PageFrame>
      </div>
    );
  }

  const selectedEvents = selectedKey ? byDay.get(selectedKey) ?? [] : [];
  // The kinds landing on the selected day (drives the detail head's
  // kind dots — the same legend dots the grid cells carry).
  const selectedKindSet = new Set(selectedEvents.map((ev) => ev.kind));

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PageHeader
        title="التقويم الأكاديمي"
        description="كل مواعيدك في نظرة واحدة — بتوقيت ليبيا."
        /* r341 D7a — the header's action seat: the honest cross-route
           verb on the accent register (the quality pages' «لوحة الجودة»
           precedent). The calendar is a read-only composition — its one
           primary action sends the student to TODAY's commitments on
           the dashboard (the reciprocal of the dashboard's «التقويم
           الكامل» ghost). */
        actions={
          <Link to="/student/dashboard" className="btn accent sm">
            التزامات اليوم
          </Link>
        }
      />

      {/* R319 (c3-S2): the week strip — the page's genuine today/week
          context: the current week as one hairline row of 7 cells with
          today inked, above the month grid whose today cell anchors it.
          r341 D7a: the [01] SectionBar opens the month instrument (the
          family's mono-indexed register) with the honest days-with-
          events count as its quiet mono meta (countAr for AT). */}
      <SectionBar
        index="01"
        title="المواعيد"
        meta={
          monthEventCount > 0 ? (
            <BarCount
              n={monthEventCount}
              srLabel={countAr(monthEventCount, ['يوم', 'يومان', 'أيام', 'يوماً'])}
            />
          ) : undefined
        }
      />
      <WeekStrip />

      <Card className="cal-card" flush>
        {/* Month navigation — «السابق» points inline-START (right in
            RTL = the past), «التالي» inline-END (left = forward).
            r304: the «اليوم» chip rides the inline-end cluster and
            appears ONLY while the page sits away from today (another
            month browsed, or another day selected); one tap returns
            the grid to today's month AND re-selects today. */}
        <header className="cal-head">
          <button
            type="button"
            className="btn ghost sm cal-nav-btn"
            onClick={() => (mode === 'month' ? shiftMonth(-1) : shiftWeek(-1))}
            aria-label={mode === 'month' ? 'الشهر السابق' : 'الأسبوع السابق'}
          >
            <Icon icon={ChevronRight} size={16} aria-hidden />
          </button>
          <h2 className="cal-month" aria-live="polite">
            {mode === 'month' ? monthTitleAr(view.year, view.month) : weekRangeTitleAr(weekAnchor)}
          </h2>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}
          >
            {awayFromToday && (
              <button
                type="button"
                className="btn ghost sm cal-nav-btn"
                onClick={goToday}
                aria-label="العودة إلى اليوم"
              >
                اليوم
              </button>
            )}
            <button
              type="button"
              className="btn ghost sm cal-nav-btn"
              onClick={() => (mode === 'month' ? shiftMonth(1) : shiftWeek(1))}
              aria-label={mode === 'month' ? 'الشهر التالي' : 'الأسبوع التالي'}
            >
              <Icon icon={ChevronLeft} size={16} aria-hidden />
            </button>
          </div>
        </header>

        {/* r366 (2-d): the mode switcher — the shared .pill register with
            aria-pressed (the matrix filter's grammar). Two one-word
            verbs; the card below answers each honestly. */}
        <div className="cal-mode-row" role="group" aria-label="نمط العرض">
          <button
            type="button"
            className={`pill${mode === 'month' ? ' on' : ''}`}
            aria-pressed={mode === 'month'}
            onClick={() => switchMode('month')}
          >
            شهر
          </button>
          <button
            type="button"
            className={`pill${mode === 'week' ? ' on' : ''}`}
            aria-pressed={mode === 'week'}
            onClick={() => switchMode('week')}
          >
            أسبوع
          </button>
        </div>

        {/* Heron micro-label: the legend is a metadata block — classify
            it (the chips below carry the kinds; tone on the dot only). */}
        <div className="cal-legend" aria-label="مفتاح الرموز">
          <span className="r305s-eyebrow">أنواع المواعيد</span>
          {KIND_LEGEND.map(({ kind, label }) => (
            <span key={kind} className="cal-legend-item">
              <i className="cal-dot" data-kind={kind} aria-hidden />
              {label}
            </span>
          ))}
        </div>

        {/* Weekday header — Sunday-first (WEEKDAY_NAMES_AR contract:
            dayOfWeek 0 = Sunday), flowing RTL so Sunday sits inline-start.
            r366 (2-d): in week mode the phone band stacks the strip
            vertically — the per-cell weekday label speaks there, and this
            7-column header is hidden (it would label a single column). */}
        <div className={`cal-dow-row${mode === 'week' ? ' cal-dow-week' : ''}`} aria-hidden>
          {WEEKDAY_NAMES_AR.map((name) => (
            <span key={name} className="cal-dow">{name}</span>
          ))}
        </div>

        {/* The 42-cell month grid. Cells are buttons (select a day);
            the day's events render in the detail list below and are
            the actual navigation affordances.
            r169a: role="group", not "grid" — a data grid requires
            row/gridcell structure and keyboard two-axis navigation;
            this is a plain interactive group of day buttons (axe
            aria-required-children fired on the direct button
            children). Group keeps the label without the structural
            promise. */}
        <div
          className={`cal-grid${mode === 'week' ? ' cal-week' : ''}`}
          role="group"
          aria-label={mode === 'month' ? `تقويم ${monthTitleAr(view.year, view.month)}` : `أسبوع ${weekRangeTitleAr(weekAnchor)}`}
        >
          {cells.map((cell) => {
            const kinds = kindsByDay.get(cell.key);
            const kindCount = kinds?.size ?? 0;
            const dayEvents = byDay.get(cell.key) ?? [];
            const eventCount = dayEvents.length;
            const isToday = cell.key === todayKey;
            const dayName = isToday ? `اليوم ${WEEKDAY_NAMES_AR[cell.dow]}` : WEEKDAY_NAMES_AR[cell.dow];
            /* r305-c Heron chrome: the weekend (Libya: Friday + Saturday
             * on the 0=Sunday contract) takes a quiet ink step — presentational
             * only, the cell's data/aria contract is untouched. */
            const isWeekend = cell.dow === 5 || cell.dow === 6;
            /* r366 (2-d): the week cell — day head (numeral + weekday on
             * the stacked phone band) + the day's events as one-line
             * chips (kind ink on the inline-start edge; ellipsis + full
             * title on the tooltip; a «+n أخرى» chip caps the stack —
             * the detail list below stays the full ledger). */
            /* r366-final: the week and month cells share the button's
             * identity/press contract — ONE props seat, spread at both
             * render sites (the jscpd ratchet counts one copy). */
            const cellButtonProps = {
              'data-in-month': cell.inMonth,
              'data-weekend': isWeekend || undefined,
              'data-today': isToday || undefined,
              'data-selected': selectedKey === cell.key || undefined,
              'aria-pressed': selectedKey === cell.key,
              'aria-label': `${dayName} ${cell.day}${eventCount > 0 ? ` — ${arUnit(eventCount, 'حدث واحد', 'حدثان', 'أحداث')}` : ''}`,
              onClick: () => setSelectedKey(cell.key),
            } as ComponentProps<'button'>;
            if (mode === 'week') {
              const shown = dayEvents.slice(0, WEEK_CHIP_CAP);
              const rest = dayEvents.length - shown.length;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className="cal-cell"
                  {...cellButtonProps}
                >
                  <span className="cal-week-dayhead">
                    <span className="cal-day-num">{cell.day}</span>
                    <span className="cal-week-dow" aria-hidden>{WEEKDAY_NAMES_AR[cell.dow]}</span>
                  </span>
                  {shown.map((ev) => (
                    <span
                      key={ev.id}
                      className="cal-cell-chip"
                      data-kind={ev.kind}
                      title={`${ev.time ? `${ev.time} · ` : ''}${ev.title}`}
                    >
                      {ev.title}
                    </span>
                  ))}
                  {rest > 0 && (
                    <span
                      className="cal-cell-chip cal-chip-more"
                      title={dayEvents.slice(WEEK_CHIP_CAP).map((ev) => ev.title).join('\n')}
                    >
                      +{rest} أخرى
                    </span>
                  )}
                </button>
              );
            }
            return (
              <button
                key={cell.key}
                type="button"
                className="cal-cell"
                {...cellButtonProps}
              >
                <span className="cal-day-num">{cell.day}</span>
                {kindCount > 0 && (
                  <span className="cal-dots">
                    {KIND_LEGEND.map(({ kind }) =>
                      kinds?.has(kind) ? <i key={kind} className="cal-dot" data-kind={kind} /> : null,
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* The selected day's events — every row is a link to the
            event's source page (course / exam taker / broadcast). */}
        <div className="cal-detail">
          {monthEventCount === 0 ? (
            /* R319 (c3-S2): the quiet month is the sheet's reserved-but-
               empty region — the hatched EmptyCell (the old EmptyState's
               copy, kept honest and verbatim). */
            <EmptyCell
              label="شهر هادئ"
              note={`لا مواعيد في ${monthTitleAr(view.year, view.month)}.`}
            />
          ) : selectedEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={selectedKey ? selectedDayLabel(selectedKey) : 'اختر يومًا'}
            />
          ) : (
            <>
              <header className="cal-detail-head">
                <span className="cal-detail-date">
                  {selectedKey ? selectedDayLabel(selectedKey) : ''}
                </span>
                {/* r304 — the day's kind mix as legend dots beside the
                    count (multi-kind days only): the rows carry the
                    words, the dots anchor the eye — the same division
                    of labour the legend and grid cells already use. */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  {selectedKindSet.size > 1 && (
                    <span aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1-5)' }}>
                      {KIND_LEGEND.filter(({ kind }) => selectedKindSet.has(kind)).map(({ kind }) => (
                        <i key={kind} className="cal-dot" data-kind={kind} />
                      ))}
                    </span>
                  )}
                  <Badge color="brand">{arUnit(selectedEvents.length, 'حدث', 'حدثان', 'أحداث')}</Badge>
                </span>
              </header>
              <div className="cal-detail-list">
                {selectedEvents.map((ev) => (
                  <Link key={ev.id} to={ev.to} className="cal-event-row">
                    <span className="cal-event-icon" data-kind={ev.kind}>
                      <Icon icon={KIND_ICON[ev.kind]} size={18} aria-hidden />
                    </span>
                    <span className="cal-event-time">
                      {ev.time ? <bdi>{ev.time}</bdi> : '—'}
                    </span>
                    <span className="cal-event-title">
                      {ev.title}
                      {ev.phase && (
                        <span className="cal-event-phase">{examPhaseLabel(ev.phase)}</span>
                      )}
                    </span>
                    <Icon icon={ChevronLeft} size={16} className="cal-event-chevron" aria-hidden />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </PageFrame>
    </div>
  );
}
