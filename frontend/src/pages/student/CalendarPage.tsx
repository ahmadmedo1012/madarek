import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Presentation, ClipboardList, ClipboardCheck, Radio,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader } from '../../components/patterns';
import { Icon } from '../../components/Icon';
import { useStudentDashboard, useMyEnrollments, useMyExams } from '../../hooks/useResources';
import { WEEKDAY_NAMES_AR, arUnit } from '../../lib/format';
import { ASSIGNMENT_KIND_LABEL, EXAM_KIND_LABEL } from '../../lib/courseMeta';
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
import '../../styles/r305-student.css';
import '../../styles/r305-student-schedule.css';

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

  const cells = useMemo<CalendarCell[]>(() => monthGrid(view.year, view.month), [view]);

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

  /* r304 — «اليوم» quick-return: month browsing (and day selection)
   * loses the «where am I» anchor, so the header offers one honest tap
   * back. The chip renders ONLY while the page is away from today —
   * the visible month ≠ today's Tripoli civil month OR the selected
   * day ≠ today. The handler re-reads tripoliToday() (the same
   * lib/calendar.ts helper that built the initial state — no
   * reinvented date math) and re-anchors view + selection + highlight
   * together. Hidden when already on today: no dead control. */
  const todayParts = civilDayParts(todayKey);
  const awayFromToday = todayParts !== null &&
    (view.year !== todayParts.year || view.month !== todayParts.month || selectedKey !== todayKey);
  const goToday = () => {
    const t = tripoliToday();
    const key = civilKeyOf(t);
    setTodayKey(key);
    setView({ year: t.year, month: t.month });
    setSelectedKey(key);
  };

  // ── Loading / error shells (the shared States grammar) ──────────
  if (enrollments.isPending || dash.isPending || exams.isPending) {
    return (
      <PageFrame width="default">
        <PageHeader title="التقويم الأكاديمي" description="جارٍ جمع مواعيدك…" />
        <div aria-busy="true" aria-live="polite">
          <CalendarSkeleton />
        </div>
      </PageFrame>
    );
  }
  if (enrollments.isError || dash.isError || exams.isError) {
    const failed = enrollments.isError ? enrollments : dash.isError ? dash : exams;
    return (
      <PageFrame width="default">
        <PageHeader title="التقويم الأكاديمي" />
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
    );
  }

  const selectedEvents = selectedKey ? byDay.get(selectedKey) ?? [] : [];
  // The kinds landing on the selected day (drives the detail head's
  // kind dots — the same legend dots the grid cells carry).
  const selectedKindSet = new Set(selectedEvents.map((ev) => ev.kind));

  return (
    <PageFrame width="default">
      <PageHeader
        title="التقويم الأكاديمي"
        description={
          'كل مواعيدك في نظرة واحدة: الحصص الأسبوعية، ومواعيد تسليم الواجبات، ' +
          'ونوافذ الاختبارات، والبث المباشر — بتوقيت ليبيا.'
        }
      />

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
            onClick={() => shiftMonth(-1)}
            aria-label="الشهر السابق"
          >
            <Icon icon={ChevronRight} size={16} aria-hidden />
          </button>
          <h2 className="cal-month" aria-live="polite">{monthTitleAr(view.year, view.month)}</h2>
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
              onClick={() => shiftMonth(1)}
              aria-label="الشهر التالي"
            >
              <Icon icon={ChevronLeft} size={16} aria-hidden />
            </button>
          </div>
        </header>

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
            dayOfWeek 0 = Sunday), flowing RTL so Sunday sits inline-start. */}
        <div className="cal-dow-row" aria-hidden>
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
        <div className="cal-grid" role="group" aria-label={`تقويم ${monthTitleAr(view.year, view.month)}`}>
          {cells.map((cell) => {
            const kinds = kindsByDay.get(cell.key);
            const kindCount = kinds?.size ?? 0;
            const eventCount = byDay.get(cell.key)?.length ?? 0;
            const isToday = cell.key === todayKey;
            const dayName = isToday ? `اليوم ${WEEKDAY_NAMES_AR[cell.dow]}` : WEEKDAY_NAMES_AR[cell.dow];
            /* r305-c Heron chrome: the weekend (Libya: Friday + Saturday
             * on the 0=Sunday contract) takes a quiet ink step — presentational
             * only, the cell's data/aria contract is untouched. */
            const isWeekend = cell.dow === 5 || cell.dow === 6;
            return (
              <button
                key={cell.key}
                type="button"
                className="cal-cell"
                data-in-month={cell.inMonth}
                data-weekend={isWeekend || undefined}
                data-today={isToday || undefined}
                data-selected={selectedKey === cell.key || undefined}
                aria-pressed={selectedKey === cell.key}
                aria-label={`${dayName} ${cell.day}${eventCount > 0 ? ` — ${arUnit(eventCount, 'حدث واحد', 'حدثان', 'أحداث')}` : ''}`}
                onClick={() => setSelectedKey(cell.key)}
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
            <EmptyState
              icon={CalendarDays}
              title="شهر هادئ"
              description={`لا مواعيد في ${monthTitleAr(view.year, view.month)} — جرّب شهرًا آخر، أو راجع جدولك ومقرّراتك.`}
            />
          ) : selectedEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={selectedKey ? selectedDayLabel(selectedKey) : 'اختر يومًا'}
              description="لا أحداث في هذا اليوم — اختر يومًا آخر من الشبكة أعلاه."
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
                  <Badge color="brand">{arUnit(selectedEvents.length, 'حدث واحد', 'حدثان', 'أحداث')}</Badge>
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
  );
}
