import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Play, Eye, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/primitives';
import {
  ErrorState, EmptyState, ListSkeleton, Skeleton,
} from '../../components/primitives/States';
import {
  PageFrame, PageHeader, RowList, RowItem, StatLine, TodayList,
  type StatLineItem,
} from '../../components/patterns';
/* R325 P2.5 — the INDICATOR language (patterns/indicators): the
 * dashboard is its showpiece. Imported DIRECTLY, not via the patterns
 * barrel — the barrel's signatures are CONTRACT-frozen and a `RulerGauge`
 * re-export there would collide with the r319 student kit's semester
 * ruler (aliased `SemesterRuler` below). */
import {
  RulerGauge, SegmentedProgress, MasteryCells, StreakTicks,
  ScheduleStrip, GradeBars, groupSlotsByDay, watchState, gradeBands,
} from '../../components/patterns/indicators';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import {
  useStudentDashboard, useResume, useTrainingCatalog, useGaps,
  useMyEnrollments, useOfferingLectures, useStudentResults,
  type MyEnrollment,
} from '../../hooks/useResources';
import { EXAM_KIND_LABEL, courseIcon, courseTint } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { formatInt, formatNum, formatDate, formatTime } from '../../utils/numbers';
/* R319 C1-C — the visible-text hygiene layer (§B2 seed leaks + §E-10):
   no raw revision codes, no placeholder test names, ONE numeral system
   (Latin), real ar-LY dates, <bdi> on every mixed run. */
import {
  arDate, sanitizeInstitutionName, sanitizeVisibleText,
} from '../../utils/display-text';
/* R305 Heron — the shared student vocabulary + this page's family sheet.
 * Page-chunk CSS loads after main.tsx's global sheets, so the family
 * refinements win same-specificity ties over the frozen student.css
 * recipes they restyle (the deep-band hero). */
import '../../styles/r305-student.css';
import '../../styles/r305-student-dashboard.css';
/* R319 (c2-G1) — §B2: the dashboard joins the sheet system. The 7px
 * frame + grain + the ambient `SHEET S-01 · STUDENT` title line are
 * the shared shell's (C2-G2, live on every authenticated route); this
 * page's material is the SECTION BARS ([01]…[05] mono-indexed title
 * bars), the INDICATORS (the r319 semester ruler, per-course
 * CourseBars, StatusChips) and the hatched EmptyCells, joined since
 * P2.5 by the R325 indicator language (patterns/indicators.tsx +
 * r325-indicators.css — the showpiece application: the hero's
 * RulerGauge + lecture SegmentedProgress, the ScheduleStrip week
 * timetable, MasteryCells on the gaps rows, GradeBars + StreakTicks in
 * the momentum band). */
import {
  SectionBar, BarCount, RulerGauge as SemesterRuler, CourseBar, StatusChip,
  EmptyCell, dueChip, type StatusChipTone,
} from '../../components/student';
import '../../styles/r319-student.css';

/* ═══════════════════════════════════════════════════════════════════
   R304 (student workspace) — the dashboard reads like a workspace, not
   a report: masthead → the ONE next-learning-action hero band (the
   lecture arm first, then the training arm — its own surface again,
   above the lists) → «اليوم» TodayList (today's commitments + every
   still-actable exam) → the learning band (مقرّراتك rows with live
   progress in the main column, the recommended gaps rail beside it,
   every gap row a direct remediation link) → the momentum StatLine
   (compact typographic line, no icon boxes) → the week ledger
   (day-anchored).
   The pure helpers below (classWhenMs / safeMs / examAgendaRow /
   pickTrainingResume) keep their exported contracts — the unit pins
   (DashboardPage-agenda / -exams-resume) stay byte-identical.
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Greeting that adapts to the local hour. Calm, conversational.
 */
function useGreeting(): string {
  const h = new Date().getHours();
  /* r166a (E1): the 00:00–06:00 branch said «سهرة سعيدة» — «سهرة» is
   * an evening party/soirée, wrong register for 2am. «ليلة سعيدة» is
   * the proper late-night greeting. */
  if (h < 6)  return 'ليلة سعيدة';
  if (h < 12) return 'صباح الخير';
  if (h < 18) return 'مساء النور';
  return 'مساء الخير';
}

const DAY_LABEL: Record<'today' | 'tomorrow', string> = {
  today: 'اليوم',
  tomorrow: 'غداً',
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  const time = formatTime(d, { hour: '2-digit', minute: '2-digit' });
  /* 22-c (A3 P3-2): a PAST-due assignment read «اليوم» (days <= 0) —
     "due today" for something due yesterday. Overdue gets its own
     label with the date; same-day (days === 0, incl. a passed hour)
     keeps «اليوم · الوقت». */
  if (days < 0) return `فات الموعد · ${formatDate(d, { day: 'numeric', month: 'short' })}`;
  if (days === 0) return `اليوم · ${time}`;
  if (days === 1) return `غداً · ${time}`;
  // Arabic plural rules inside the ≤6-day window: dual, then plural.
  if (days === 2) return `بعد يومين · ${time}`;
  if (days < 7) return `بعد ${days} أيام · ${time}`;
  return formatDate(d, { dateStyle: 'medium' });
}

/* r158 (6A14 P2) — agenda chronology. The agenda used to concatenate
 * per-kind buckets; these helpers anchor every row to a real instant
 * so the merged stream sorts ascending (the week ledger keeps that
 * truth). Exported for tests/unit/DashboardPage-agenda.test.ts. */
export function classWhenMs(
  c: { when: 'today' | 'tomorrow'; startTime: string },
  now: Date = new Date(),
): number {
  const day = new Date(now);
  if (c.when === 'tomorrow') day.setDate(day.getDate() + 1);
  const parts = c.startTime.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const wellFormed =
    parts.length >= 2 && parts[0] !== '' && parts[1] !== '' &&
    Number.isFinite(h) && Number.isFinite(m) &&
    h >= 0 && h < 24 && m >= 0 && m < 60;
  if (wellFormed) {
    day.setHours(h, m, 0, 0);
  } else {
    day.setHours(23, 59, 59, 999);
  }
  return day.getTime();
}

export function safeMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/* r164-c — the exam row of the agenda: the pure half of the mapping
 * (chronology key, deep link, labels). Exported for
 * tests/unit/DashboardPage-exams-resume.test.ts; the JSX assembly in
 * the page consumes it directly. */
export interface AgendaExamSource {
  id: string;
  title: string;
  kind: string;
  whenAt: string;
  phase: 'opens' | 'closes';
  courseCode: string | null;
}

export interface ExamAgendaRow {
  id: string;
  whenMs: number;
  to: string;
  /** The Arabic ExamKind label ('نهائي', 'نصفي', …); unknown kinds
   *  fall back to the generic «اختبار» (D17-1: اختبار, never امتحان). */
  kindLabel: string;
  /** «يفتح باب الاختبار» for a future window, «آخر موعد للتسليم» for
   *  the open window's deadline. */
  metaLabel: string;
}

export function examAgendaRow(e: AgendaExamSource): ExamAgendaRow {
  return {
    id: `e-${e.id}`,
    whenMs: safeMs(e.whenAt),
    to: `/student/online-exams/${e.id}`,
    kindLabel: (EXAM_KIND_LABEL as Record<string, string>)[e.kind] ?? 'اختبار',
    metaLabel: e.phase === 'opens' ? 'يفتح باب الاختبار' : 'آخر موعد للتسليم',
  };
}

function gpaTone(gpa: number): { label: string; color: 'green' | 'amber' | 'red'; trend: 'up' | 'down' | 'flat' } {
  if (gpa >= 3.5) return { label: 'ممتاز', color: 'green', trend: 'up' };
  if (gpa >= 3.0) return { label: 'جيد جدّاً', color: 'green', trend: 'up' };
  if (gpa >= 2.0) return { label: 'جيد', color: 'amber', trend: 'flat' };
  return { label: 'بحاجة لتحسين', color: 'red', trend: 'down' };
}

/**
 * Read a --motion-duration-* token as milliseconds. Returns 0 when the
 * token is missing/unparsable so callers can fall back explicitly.
 */
function motionTokenMs(token: string): number {
  if (typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw.endsWith('ms')) return 0;
  const ms = parseFloat(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * CountIn — the in-app data edition of the count-up reveal (the shared
 * components/CountUp is marketing-only by contract). Animates the numeric
 * reveal once on mount with an exponential ease-out at
 * --motion-duration-stat, then settles on the real value; any later
 * value change renders instantly. Reduced motion → the settled value.
 */
function CountIn({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current || reducedMotion || !Number.isFinite(value)) {
      setDisplay(value);
      if (!reducedMotion) settled.current = true;
      return;
    }
    // Mirrors --motion-duration-stat (700ms); 0 only when the token is
    // unreadable, in which case the division below settles on frame one.
    const duration = motionTokenMs('--motion-duration-stat') || 700;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4); // exponential ease-out
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else settled.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reducedMotion]);

  // Fractional values (e.g. 87.5%) keep one decimal, integers none —
  // the settled render matches the raw API value exactly.
  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <>
      {formatNum(display, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

type AgendaTone = 'accent' | 'gold' | 'red';
type AgendaItem = {
  kind: 'class' | 'assign' | 'live' | 'exam';
  id: string;
  /** r158 (6A14 P2): the chronology key — classes anchor to their
   *  start time (classWhenMs), assignments/live to their ISO date
   *  (safeMs). The merged list below sorts ascending by this. */
  whenMs: number;
  /** PP-X2 (audit P1-8): every agenda row is now a link — classes and
   *  assignments deep-link to their course (the course page carries the
   *  schedule + the upcoming-assignments table), live rows go to the
   *  broadcast page. */
  to: string;
  title: ReactNode;
  meta: ReactNode;
  tone: AgendaTone;
};

/* r164-c — the training arm of the resume decision. /me/resume answers
 * the LECTURE half (continue the most-recently-watched lecture, or
 * start the first unwatched one). When it returns null — every lecture
 * of every active enrollment is watched, or the student has no course
 * enrollments at all — the next honest action is the training track the
 * student is partway through (edX's "resume" promise, extended to the
 * self-development surface). Pure (exported for
 * tests/unit/DashboardPage-exams-resume.test.ts). */
export interface TrainingResumeTrack {
  slug: string;
  title: string;
  enrolled: boolean;
  isCompleted: boolean;
  completedLessons: number;
  progressPct: number;
}

export interface TrainingResumePick {
  slug: string;
  title: string;
  progressPct: number;
  /** true = a track already in progress (continue), false = unstarted (start). */
  started: boolean;
}

export function pickTrainingResume(
  tracks: readonly TrainingResumeTrack[],
): TrainingResumePick | null {
  const active = tracks.filter((t) => t.enrolled && !t.isCompleted);
  if (active.length === 0) return null;
  const inProgress = active
    .filter((t) => t.completedLessons > 0)
    .sort((a, b) => b.completedLessons - a.completedLessons);
  const pick = inProgress[0] ?? active[0];
  // active is non-empty, so pick is too — the guard is the
  // noUncheckedIndexedAccess type-narrow, not a real branch.
  if (!pick) return null;
  return {
    slug: pick.slug,
    title: pick.title,
    progressPct: pick.progressPct,
    started: pick.completedLessons > 0,
  };
}

/* r220 — plain-text projection of an agenda row's JSX title for the
   TodayList (its title slot is a string; bidi-critical runs stay in the
   meta ReactNode where the bdi wrappers live). */
function nodeText(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join('');
  if (typeof n === 'object' && 'props' in (n as object)) {
    return nodeText((n as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

/* R319 (c2-G1) — the agenda row's mono status chip (§B2): LIVE for a
 * live broadcast (the ONE orange state — orange is never decoration),
 * the honest deadline label for assignments/exams (DUE TODAY / DUE nD /
 * OVERDUE / DUE — the same whole-day arithmetic formatDue rides), CLASS
 * for a scheduled session. Pure; feeds both the TodayList action slot
 * and the week ledger's trailing chip group. */
function agendaChip(item: AgendaItem, now: number): { label: string; tone: StatusChipTone } {
  if (item.kind === 'live') return { label: 'LIVE', tone: 'live' };
  if (item.kind === 'class') return { label: 'CLASS', tone: 'quiet' };
  if (item.whenMs === Number.MAX_SAFE_INTEGER) return dueChip(Number.MAX_SAFE_INTEGER);
  return dueChip(Math.round((item.whenMs - now) / 86_400_000));
}

/* R319 C1-C — listwise join of visible identity segments: empties drop
   out BEFORE joining, so a sanitized-to-'' segment can never leave a
   dangling « · » (the photographed header ended «… · السنة 8 · r180»). */
function joinSegments(segments: Array<string | ReactNode | null | undefined>): ReactNode[] {
  const kept = segments.filter(
    (s): s is string | ReactNode => s !== null && s !== undefined && s !== '',
  );
  return kept.map((seg, i) => (
    <Fragment key={i}>
      {i > 0 ? ' · ' : null}
      {seg}
    </Fragment>
  ));
}

/* R304 — the next-learning-action decision (the r164-c contract kept:
   the lecture arm answers first, the training arm only when the
   lecture half is empty). Returns null when both arms are empty — the
   honest «nothing pinned» — and the page renders no hero band. */
type ResumeFocus =
  | {
    kind: 'lecture';
    continuing: boolean;
    progressPct: number;
    courseCode: string;
    courseName: string;
    lectureTitle: string;
    ordinal: number;
    durationSec: number;
    /* P2.5 — the offering's id, so the hero can mount the real lecture
     * SegmentedProgress (the course-completion instrument row). */
    offeringId: string;
    to: string;
  }
  | {
    kind: 'track';
    started: boolean;
    progressPct: number;
    title: string;
    slug: string;
  };

function resumeFocus(
  resume: ReturnType<typeof useResume>,
  training: ReturnType<typeof useTrainingCatalog>,
): ResumeFocus | null {
  const r = resume.data;
  if (r) {
    return {
      kind: 'lecture',
      continuing: r.mode === 'continue',
      progressPct: r.progressPct,
      courseCode: r.lecture.course.code,
      courseName: r.lecture.course.name,
      lectureTitle: r.lecture.title,
      ordinal: r.lecture.ordinal,
      durationSec: r.lecture.durationSec,
      offeringId: r.lecture.offeringId,
      to: `/student/lectures/${r.lecture.id}`,
    };
  }
  const t = training.data ? pickTrainingResume(training.data) : null;
  if (t) {
    return {
      kind: 'track',
      started: t.started,
      progressPct: t.progressPct,
      title: t.title,
      slug: t.slug,
    };
  }
  return null;
}

/** m:ss wall clock for the hero's context note (real media duration). */
function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* The hero band — the dashboard's ONE primary action, restyled by the
   R305 Heron pass as the page's deep surface (r305s-band--deep: ink
   ground in light, paper ground in dark — theme-reactive) with the
   PP-X2 copper edge kept as the r305s-next rail grammar. The eyebrow
   lifts into the shared .r305s-eyebrow register; the course name is
   the band's display line; the CTA stays the page's ONLY accent
   button. P2.5: the progress instrument is the R325 RulerGauge (the
   drafting ruler — ink fill, orange end-tick, mono numerals) whose
   currentColor inks make it deep-band-proof by construction; the side
   note keeps the course code + lecture clock (data, never decoration). */
function DashResumeHero({ focus }: { focus: ResumeFocus }) {
  /* P2.5 — the course-completion instrument row: the resume offering's
   * lectures as ONE SegmentedProgress run (full=watched through,
   * partial=begun, empty=untouched — the real watch events), mounted
   * only when the query lands; a pending/slow payload never fakes a
   * segment. The track arm has no offering — its query idles disabled. */
  const offeringLectures = useOfferingLectures(
    focus.kind === 'lecture' ? focus.offeringId : undefined,
  );
  const segments = useMemo(() => {
    const rows = offeringLectures.data;
    if (!rows || rows.length === 0) return null;
    return [...rows]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((le) => watchState(
        le.watchEvents?.reduce((m, w) => Math.max(m, w.watchedSec), 0) ?? 0,
        le.durationSec,
        le.watchEvents?.some((w) => w.completed) ?? false,
      ));
  }, [offeringLectures.data]);

  if (focus.kind === 'lecture') {
    const doneCount = segments ? segments.filter((s) => s === 'full').length : 0;
    return (
      <section aria-label="الخطوة التعليمية التالية">
        <div className="dash-resume-card stu-hero r305s-band--deep dash-hero-deep">
          <div className="dash-resume-main">
            <span className="dash-resume-eyebrow r305s-eyebrow">{focus.continuing ? 'أكمل من حيث توقفت' : 'الخطوة التالية'}</span>
            <span className="dash-resume-course-name">{focus.courseName}</span>
            <span className="dash-resume-lecture">
              المحاضرة <bdi>{formatInt(focus.ordinal)}</bdi> · {focus.lectureTitle}
            </span>
            {/* P2.5 — the lecture's watched share as the drafting ruler
                (ink fill + the orange end-tick at the reading). The
                not-yet-started arm still renders the ruler at 0 — the
                honest empty register, never a fabricated progress. */}
            <div className="dash-resume-progress">
              <RulerGauge
                value={focus.continuing ? focus.progressPct : 0}
                ariaLabel={focus.continuing ? `تقدّم مشاهدة المحاضرة: ${focus.progressPct}%` : 'المحاضرة الأولى لم تُشاهد بعد'}
              />
            </div>
            {segments && (
              <div className="dash-resume-segments">
                <span className="ind-microlabel">محاضرات المقرّر</span>
                <div className="dash-resume-segments-row">
                  <SegmentedProgress
                    segments={segments}
                    ariaLabel={`محاضرات المقرّر: أُنجزت ${formatInt(doneCount)} من ${formatInt(segments.length)}`}
                  />
                  <bdi className="ind-mono dash-resume-segcount" dir="ltr">
                    {String(doneCount).padStart(2, '0')}/{String(segments.length).padStart(2, '0')}
                  </bdi>
                </div>
              </div>
            )}
          </div>
          <div className="dash-resume-cta stu-hero-side">
            <Link to={focus.to} className="btn accent lg">
              <Icon icon={Play} size={16} />
              {focus.continuing ? 'متابعة المشاهدة' : 'ابدأ المشاهدة'}
            </Link>
            <span className="dash-resume-side-note r305s-meta-row">
              <bdi className="font-mono">{focus.courseCode}</bdi>
              <span className="r305s-meta-sep" aria-hidden="true" />
              <bdi>{formatClock(focus.durationSec)}</bdi>
            </span>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section aria-label="الخطوة التعليمية التالية">
      <div className="dash-resume-card stu-hero r305s-band--deep dash-hero-deep">
        <div className="dash-resume-main">
          <span className="dash-resume-eyebrow r305s-eyebrow">{focus.started ? 'أكمل من حيث توقفت' : 'الخطوة التالية'}</span>
          <span className="dash-resume-course-name">{focus.title}</span>
          <span className="dash-resume-lecture">مسار التطوير الذاتي · {focus.started ? <>أنجزت <bdi>{formatInt(focus.progressPct)}%</bdi> من دروسه</> : 'سجّلت فيه ولم تبدأه بعد'}</span>
          {/* P2.5 — the same drafting ruler on the training arm (0 stays
              the honest empty register for an unstarted track). */}
          <div className="dash-resume-progress">
            <RulerGauge
              value={focus.started ? focus.progressPct : 0}
              ariaLabel={focus.started ? `تقدّم المسار التدريبي: ${focus.progressPct}%` : 'مسار لم يبدأ بعد'}
            />
          </div>
        </div>
        <div className="dash-resume-cta stu-hero-side">
          <Link to={`/training/${focus.slug}`} className="btn accent lg">
            <Icon icon={Play} size={16} />
            {focus.started ? 'متابعة المسار' : 'ابدأ المسار'}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* The «مقرّراتك» row — the live-learning list of the workspace. Same
   row grammar as the courses page (leading tinted well + trailing
   progress), minus the per-offering lecture fetch the dashboard does
   not need: the row's truth is its progress + its teacher.
   R319 (c2-G1): the trailing progress is the §B2 CourseBar — a
   hairline track with an ink fill and a taller END-TICK at the exact
   value, the course code in mono at the start and the percentage in
   mono at the end (the drafting-machine register: the tick is the
   reading, the fill is the glance). Neutral ink — orange stays the
   semester/LIVE signal. */
function DashCourseRow({ e }: { e: MyEnrollment }) {
  const c = e.offering.course;
  const Cmp = courseIcon(c.code ?? c.name);
  const tint = courseTint(c.themeColor);
  const teacher = `د. ${e.offering.teacher.firstName} ${e.offering.teacher.lastName}`;
  return (
    <RowItem
      to={`/student/courses/${e.offering.id}`}
      leading={
        <span
          className="courses-row-icon"
          style={{
            background: `color-mix(in srgb, ${tint} 14%, var(--surface))`,
            color: `color-mix(in srgb, ${tint} 60%, var(--text))`,
          }}
        >
          <Icon icon={Cmp} size={18} />
        </span>
      }
      title={c.name}
      meta={<><Badge><bdi className="font-mono">{c.code}</bdi></Badge>{' '}{teacher}</>}
      trailing={
        <span className="stu-course-progress">
          <CourseBar
            code={c.code ?? undefined}
            pct={e.progressPct}
            ariaLabel={`تقدّم مقرّر ${c.name}: ${e.progressPct}%`}
          />
          <span className="btn ghost sm courses-row-go">
            {e.progressPct > 0 ? 'تابع' : 'ابدأ'}
            <Icon icon={ArrowLeft} size={12} />
          </span>
        </span>
      }
    />
  );
}

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = useGreeting();
  const dash = useStudentDashboard();
  // Independent of the dashboard aggregate — the hero renders (or not)
  // the moment ITS payload lands, and never blocks the strip below.
  const resume = useResume();
  // r164-c: the training catalog feeds the hero's second arm (only
  // consulted when the lecture payload is null — see pickTrainingResume).
  const trainingCatalog = useTrainingCatalog();
  // r220: the recommended gaps join the learning band (سدّ الفجوة direct).
  const gaps = useGaps();
  // R304: the «مقرّراتك» list rides its own query — the workspace's
  // current-courses surface, independent of the dashboard aggregate.
  const enrollments = useMyEnrollments();
  // P2.5 — the results distribution feeds the momentum band's GradeBars
  // (the graded works' own scores + the headline average marking the
  // student's band). Independent query — renders when it lands.
  const results = useStudentResults();

  /* P2.5 — the week's real timetable for the [02] ScheduleStrip: every
     enrollment's own schedule slots (dayOfWeek 0=Sunday … the
     WEEKDAY_NAMES_AR contract) grouped Sunday-first. Enrollments
     pending ⇒ seven honest empty day columns, never a fake timetable.
     (Hooks ride before the early returns — the pending/error/preview
     mirrors render from the same hook order.) */
  const scheduleColumns = useMemo(
    () => groupSlotsByDay(
      (enrollments.data ?? []).flatMap((e) =>
        e.offering.schedule.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          start: s.startTime,
          end: s.endTime,
          code: e.offering.course.code,
          room: s.room ?? null,
        })),
      ),
    ),
    [enrollments.data],
  );

  if (dash.isPending) {
    /* r220 loading mirror — the resolved page leads with the PageHeader,
       the TodayList (its continue-learning row first), the gaps list,
       the stat line, then the week list. Every slot renders the
       resolved section's class + approximate footprint, so the
       pending → resolved handoff moves nothing (the r172b
       loading-closure contract, re-mirrored for the pattern anatomy). */
    return (
      <div className="r319s-page">
        <PageFrame width="default">
          <header className="pf-page-header" aria-busy="true" aria-live="polite">
            <div className="pf-page-header-main">
              <div className="pf-page-header-text">
                <h1 className="pf-page-title">لوحة التحكم</h1>
                <p className="pf-page-desc">جارٍ تحضير لوحتك…</p>
              </div>
            </div>
          </header>
          {(resume.isPending || trainingCatalog.isPending) && (
            /* The hero slot — reserved at the band's footprint so the
               pending → resolved handoff moves nothing (the r172b
               loading-closure contract, re-mirrored for the R304 hero).
               It collapses honestly when BOTH arms settle to null.
               R305: the mirror carries the DEEP band classes so the
               skeleton reads as the same ink/paper surface the resolved
               hero lands on (the Heron pending mirror anatomy). */
            <div className="dash-resume-card stu-hero stu-hero-skel r305s-band--deep dash-hero-deep" aria-hidden="true">
              <div className="dash-resume-main">
                <Skeleton width={120} height={13} />
                <Skeleton width="52%" height={24} />
                <Skeleton width="38%" height={13} />
                {/* P2.5 — the mirror carries the RULER's footprint (the
                    resolved hero's instrument row), not the retired ring. */}
                <Skeleton width="46%" height={30} />
                <Skeleton width="38%" height={12} />
              </div>
              <Skeleton width={170} height={48} rounded="var(--r-full)" />
            </div>
          )}
          <ListSkeleton rows={3} />
          {/* R305: the momentum strip mirrors the resolved anatomy — the
              labeled rule (the Heron annotated divider) above the stat
              line. Same slots, same order, nothing moves at handoff. */}
          <div className="dash-momentum" aria-busy="true">
            <div className="r305s-rule-labeled" aria-hidden="true">زخم الفصل</div>
            <div className="pf-statline" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="pf-stat">
                  <Skeleton width={70} height={13} />
                  <Skeleton width={56} height={24} />
                </div>
              ))}
            </div>
          </div>
          <ListSkeleton rows={3} />
        </PageFrame>
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="r319s-page">
        <PageFrame width="default">
          <PageHeader title="لوحة التحكم" />
          <ErrorState
            message="تعذَّر تحميل لوحة التحكّم"
            error={dash.error}
            onRetry={() => dash.refetch()}
          />
        </PageFrame>
      </div>
    );
  }

  const d = dash.data;

  // ADMIN/OWNER preview path — no studentProfile of their own. Render an
  // honest "preview" surface instead of crashing on d.profile.gpa.
  if (d.preview || !d.profile) {
    return (
      <div className="r319s-page">
        <PageFrame width="default">
          <PageHeader
            title="لوحة التحكم"
            description="معاينة لوحة الطالب — يحتاج هذا العرض إلى ملف طالب فعليّ."
          />
          <div className="card">
            <EmptyState
              icon={Eye}
              title="عرض معاينة"
              description={`لوحة التحكّم هذه مخصّصة للطلّاب. أنت مسجَّل دخول كحساب ${
                user?.role === 'OWNER' ? 'مالك المنصّة' : 'إداريّ'
              }، لذلك تظهر لك صفحة معاينة فارغة. للاطّلاع على لوحة طالب حقيقيّة، استخدم حساب طالب مسجَّل أو زر صفحة كلّيّة من قائمة الكلّيّات.`}
            />
          </div>
        </PageFrame>
      </div>
    );
  }

  const tone = gpaTone(d.profile.gpa);
  const courseProgressPct = d.progress.avgEnrollmentProgressPct;

  // Compose the agenda from three real sources, then merge them into
  // ONE chronological stream — ascending whenMs (r158 6A14 P2: the old
  // kind-concatenation let a live broadcast render below tomorrow's
  // class; equal keys keep the stable per-kind order).
  // Latin runs (course codes, time ranges) are bdi-wrapped so the bidi
  // algorithm never scrambles them inside the Arabic sentence.
  const agenda: AgendaItem[] = [
    ...d.agenda.classes.slice(0, 4).map<AgendaItem>((c) => ({
      kind: 'class', id: `c-${c.id}`,
      whenMs: classWhenMs(c),
      to: `/student/courses/${c.offeringId}`,
      title: <>{c.courseName}{c.room ? <> — <bdi>{c.room}</bdi></> : ''}</>,
      meta: <>{DAY_LABEL[c.when]} · <bdi>{c.startTime}–{c.endTime}</bdi></>,
      tone: c.when === 'today' ? 'accent' : 'gold',
    })),
    ...d.agenda.assignments.slice(0, 3).map<AgendaItem>((a) => ({
      kind: 'assign', id: `a-${a.id}`,
      whenMs: safeMs(a.dueAt),
      to: `/student/courses/${a.offeringId}`,
      title: <>{a.title} (<bdi>{a.courseCode}</bdi>)</>,
      meta: <>تسليم <bdi>{formatDue(a.dueAt)}</bdi></>,
      tone: 'gold',
    })),
    ...d.agenda.live.slice(0, 2).map<AgendaItem>((l) => ({
      kind: 'live', id: `l-${l.id}`,
      whenMs: safeMs(l.scheduledAt),
      to: '/student/live',
      /* A LIVE broadcast that has already started belongs at the very
         top of the stream: its whenMs (scheduledAt) has already passed,
         so ascending sort puts it there naturally. */
      title: <>بثّ مباشر: {l.title}</>,
      meta: <><bdi>{l.offering.course.code}</bdi> · <bdi>{formatDue(l.scheduledAt)}</bdi></>,
      tone: 'red',
    })),
    // r164-c — the fourth bucket: still-actable exams.
    ...(d.agenda.exams ?? []).slice(0, 4).map<AgendaItem>((e) => {
      const row = examAgendaRow(e);
      return {
        kind: 'exam' as const, id: row.id,
        whenMs: row.whenMs,
        to: row.to,
        title: (
          <>
            {e.title}
            {e.courseCode ? <> (<bdi>{e.courseCode}</bdi>)</> : null}
          </>
        ),
        meta: <>{row.metaLabel} <bdi>{formatDue(e.whenAt)}</bdi></>,
        tone: 'red' as const,
      };
    }),
  ].sort((a, b) => a.whenMs - b.whenMs);

  /* r220 — the TodayList split: today's rows lead the list; exams stay
     actable wherever their window sits, so they join the SAME list
     right after (never buried below the fold). The week ledger keeps
     the non-exam remainder grouped by real date. */
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const today = agenda.filter((it) => it.whenMs <= endOfToday.getTime());
  const exams = agenda.filter((it) => it.kind === 'exam');
  const later = agenda.filter((it) => it.whenMs > endOfToday.getTime() && it.kind !== 'exam');

  // Week ledger grouping — by the row's own calendar day (day name +
  // mono date), preserving the chronological order.
  const weekGroups: Array<{ key: string; day: string; date: string; items: AgendaItem[] }> = [];
  for (const it of later) {
    const dt = it.whenMs === Number.MAX_SAFE_INTEGER ? null : new Date(it.whenMs);
    const day = dt
      ? formatDate(dt, { weekday: 'long' })
      : 'موعد غير محدّد';
    const date = dt ? formatDate(dt, { day: 'numeric', month: 'numeric' }) : '';
    const key = `${day}-${date}`;
    const last = weekGroups[weekGroups.length - 1];
    if (last && key === last.key) last.items.push(it);
    else weekGroups.push({ key, day, date, items: [it] });
  }

  const now = new Date();
  const dateLine = formatDate(now, { weekday: 'long', day: 'numeric', month: 'long' });
  const termPct = d.term.progressPct;

  /* The gaps ledger: top 3 priority gaps with direct remediation.
     Honest states: pending → row skeletons; error → quiet retry row;
     empty → the panel says so in one line (no celebration banner). */
  const topGaps = (gaps.data ?? []).slice(0, 3);

  /* The hero band's decision (independent query — the band appears
     the moment ITS payload lands; the pending mirror above reserves
     its footprint while it flights). */
  const focus = resumeFocus(resume, trainingCatalog);

  /* In-progress courses lead the list — the workspace surfaces the
     nearest finish lines first, not the catalog order. */
  const sortedEnrollments = [...(enrollments.data ?? [])]
    .sort((a, b) => b.progressPct - a.progressPct);

  /* P2.5 — the graded-works distribution: the recent assignments' own
     scores over the six bands, the headline average marking the
     student's band (the orange one). Nothing graded ⇒ no instrument. */
  const gradedScores = (results.data?.recentAssignments ?? [])
    .map((a) => a.gradePct)
    .filter((v) => Number.isFinite(v));
  const gradeDist = gradedScores.length > 0
    ? gradeBands(gradedScores, results.data?.headline.avgGradePct ?? null)
    : null;

  /* The momentum StatLine — same facts the old strip carried, printed
     as one calm line (r183-B3's verdict copy stays pinned here). */
  const statLineItems: StatLineItem[] = [
    {
      label: 'المعدل التراكمي',
      value: formatNum(d.profile.gpa, { maximumFractionDigits: 2 }),
      hint: tone.label,
      tone: tone.trend === 'up' ? 'positive' : tone.trend === 'down' ? 'danger' : 'neutral',
    },
    {
      label: 'نسبة الحضور',
      value: d.kpi.attendancePct !== null ? <CountIn value={d.kpi.attendancePct} suffix="%" /> : '—',
      hint: d.kpi.attendancePct !== null
        ? d.kpi.attendancePct >= 80 ? 'مطمئن هذا الفصل' : d.kpi.attendancePct >= 60 ? 'قريب من الحد' : 'تحت الحد — راجع حضورك'
        : 'لا توجد سجلات بعد',
      tone: d.kpi.attendancePct === null ? 'neutral' : d.kpi.attendancePct >= 80 ? 'positive' : d.kpi.attendancePct >= 60 ? 'warning' : 'danger',
    },
    {
      label: 'مهام معلّقة',
      value: <CountIn value={d.kpi.pendingAssignmentsCount} />,
      hint: d.agenda.assignments[0] ? `أقربها ${formatDue(d.agenda.assignments[0].dueAt)}` : 'لا مهام قريبة',
      tone: d.kpi.pendingAssignmentsCount === 0 ? 'positive' : 'neutral',
    },
    {
      label: 'نقاط الإنجاز',
      value: <CountIn value={d.kpi.totalXp} />,
      hint: d.kpi.cohortSize > 1
        ? `المركز ${d.kpi.rank} من ${d.kpi.cohortSize} على دفعتك`
        : `مستوى ${d.profile.level}`,
      tone: 'neutral',
    },
    {
      label: 'إنجاز المقرّرات',
      value: d.kpi.courseCount > 0 ? <CountIn value={courseProgressPct} suffix="%" /> : '—',
      hint: d.kpi.courseCount > 0
        ? `${countAr(d.kpi.courseCount, ['مقرّر نشط واحد', 'مقرّران نشطان', 'مقرّرات نشطة', 'مقررًا نشطًا'])} · ${
            courseProgressPct >= 75 ? 'متقدّم كثيراً عن المطلوب'
            : courseProgressPct >= 50 ? 'على الطريق الصحيح'
            : courseProgressPct === 0 ? 'ابدأ أول محاضرة لتتقدّم'
            : 'تحتاج إلى دفعة إضافيّة'}`
        : 'لم تُسجّل في مقرّر بعد',
      tone: d.kpi.courseCount === 0 ? 'warning' : courseProgressPct >= 75 ? 'positive' : courseProgressPct === 0 ? 'warning' : 'neutral',
    },
  ];

  /* R319 C1-C — the identity line, leak-proofed (§B2): institution
     names pass sanitizeInstitutionName (revision codes + placeholder
     test names like «قسم اختبار» drop to ''), segments join LISTWISE
     so an empty one never leaves a dangling «·», the year renders only
     as a finite 1..8 integer (medicine/pharmacy legitimately reach 8 —
     no lower hard cap, just data sanity), and the digit runs inside
     the Arabic sentence are bdi-isolated. */
  const studentName = sanitizeVisibleText(user?.firstName ?? '');
  const identitySegments = joinSegments([
    sanitizeInstitutionName(d.profile.facultyName),
    sanitizeInstitutionName(d.profile.departmentName),
    Number.isInteger(d.profile.year) && d.profile.year >= 1 && d.profile.year <= 8
      ? <>السنة <bdi>{formatInt(d.profile.year)}</bdi></>
      : null,
  ]);
  /* R319 C1-C — the meta line: REAL ar-LY term dates (Arabic month
     names + Latin digits — the «01/15 وينتهي 09/10» numeric shape and
     its invisible RLM are gone), every mixed run bdi-isolated.
     R319 (c2-G1): the semester's «X% من الفصل مضى» prose moved into the
     [01] section's RulerGauge — the % now rides the instrument's quiet
     mono meta (same datum, same Latin digits, one home). */

  return (
    <div className="r319s-page">
      <PageFrame width="default">
        <PageHeader
          title="لوحة التحكم"
          eyebrow="مساحة الطالب"
          description={
            <>
              {greeting}{studentName ? <>، <bdi>{studentName}</bdi></> : null} — {identitySegments.length > 0 ? identitySegments : 'لوحة متابعة تقدّمك الأكاديمي.'}
            </>
          }
          meta={
            <>
              <bdi>{dateLine}</bdi> · يبدأ <bdi>{arDate(d.term.startsAt, { day: 'numeric', month: 'long' })}</bdi> وينتهي <bdi>{arDate(d.term.endsAt, { day: 'numeric', month: 'long' })}</bdi>
            </>
          }
        />

        {/* [01] الفصل الدراسي — the semester as the sheet's first
            section (§B2): the drafting RULER — one hairline tick per
            week (taller every 4th), the orange fill to the term's own
            progress, the mono W07/16 head computed from the term's
            start/end dates, and the API's % as quiet mono meta. The
            term code rides the SectionBar's meta seat (data, never
            decoration). */}
        <section aria-label="الفصل الدراسي" className="dash-section">
          <SectionBar
            index="01"
            title="الفصل الدراسي"
            meta={<bdi className="r319s-mono" dir="ltr">{d.term.code}</bdi>}
          />
          <div className="r319s-term">
            <SemesterRuler
              startsAt={d.term.startsAt}
              endsAt={d.term.endsAt}
              progressPct={termPct}
            />
          </div>
        </section>

      {/* الخطوة التالية — the hero band (R304): the ONE next learning
          action, its own surface above the lists (r164-c arms kept:
          lecture first, then the training track). */}
      {focus && <DashResumeHero focus={focus} />}

      {/* [02] اليوم — the ONE TodayList (r220): today's commitments first,
          then every still-actable exam. R319 (c2-G1): the section opens
          with the §B2 mono-indexed title bar (the honest actable-row
          count as its quiet mono meta — the digits the sheet prints as
          data, countAr for assistive tech) and the WEEK STRIP — the
          current week as 7 hairline cells, today INKED (the app's own
          Sunday-first order flowing RTL). Every row carries its mono
          StatusChip; the pattern list below keeps the urgency dots. */}
      <section aria-label="اليوم" className="dash-section">
        <SectionBar
          index="02"
          title="اليوم"
          meta={
            today.length + exams.length > 0 ? (
              <BarCount
                n={today.length + exams.length}
                srLabel={countAr(today.length + exams.length, ['التزام واحد اليوم', 'التزامان اليوم', 'التزامات اليوم', 'التزاماً اليوم'])}
              />
            ) : undefined
          }
        />
        {/* P2.5 — the week as the real TIMETABLE: the ScheduleStrip grows
            the WeekStrip grammar a slot body (same 7 columns, same mono
            day labels, the today header cell keeps the inked inversion)
            and fills each day with the enrollments' own schedule slots —
            mono times + mono course codes. No slots yet ⇒ one honest
            muted dash per day, never a fabricated timetable. */}
        <ScheduleStrip columns={scheduleColumns} />
        <TodayList
          items={[
            ...today.map((item) => {
              const chip = agendaChip(item, now.getTime());
              return {
                id: item.id,
                title: nodeText(item.title),
                meta: item.meta,
                to: item.to,
                urgency: (item.tone === 'red' ? 'now' : item.tone === 'accent' ? 'now' : 'soon') as 'now' | 'soon',
                action: <StatusChip label={chip.label} tone={chip.tone} />,
              };
            }),
            ...exams.map((item) => {
              const chip = agendaChip(item, now.getTime());
              return {
                id: item.id,
                title: nodeText(item.title),
                meta: item.meta,
                to: item.to,
                /* r307 (audit 1-D #7): urgency triage — an exam whose window
                   has NOT opened yet reads `soon` (the calm dot + «قريبًا»),
                   not the urgent `now`. Only an already-open window keeps
                   `now`. The meta line stays honest either way («يفتح باب
                   الاختبار…»), but the dot no longer overstates it. */
                urgency: (item.whenMs > Date.now() ? 'soon' : 'now') as 'now' | 'soon',
                action: <StatusChip label={chip.label} tone={chip.tone} />,
              };
            }),
          ]}
          emptyState={
            /* R319 (c2-G1): the bare «راحة» prose is now a HATCHED EMPTY
               CELL — the sheet's reserved-but-empty region (§B2). */
            <EmptyCell
              label="راحة"
              note="لا حصص أو مهام أو اختبارات اليوم — أسبوعك القادم أدناه، ومقرّراتك تنتظرك في الأسفل."
            />
          }
        />
      </section>

      {/* التعلّم — the workspace band (R304): مقرّراتك carries the main
          column (in-progress first), the gaps rail sits beside it.
          Honest states everywhere: pending → row skeletons; error →
          quiet retry row; empty → the HATCHED EmptyCell (§B2 — a bare
          «لا شيء بعد» is never the resting state of a sheet region).
          Every gap row with a recommendation is a WHOLE-ROW
          link — the matrix page's سدّ الفجوة contract, now one voice
          across both surfaces. */}
      <div className="grid-2-1">
        <section aria-label="مقرّراتك الحالية">
          <SectionBar
            index="03"
            title="مقرّراتك"
            meta={
              !enrollments.isPending && !enrollments.isError && sortedEnrollments.length > 0 ? (
                <BarCount
                  n={sortedEnrollments.length}
                  srLabel={countAr(sortedEnrollments.length, ['مقرّر نشط واحد', 'مقرّران نشطان', 'مقرّرات نشطة', 'مقررًا نشطًا'])}
                />
              ) : undefined
            }
            action={<Link to="/student/courses" className="btn ghost sm">كل المقرّرات</Link>}
          />
          {enrollments.isPending ? (
            <ListSkeleton rows={2} />
          ) : enrollments.isError ? (
            <div className="ledger-row ledger-row-flat" role="alert">
              <span className="ledger-lead"><b>مقرّراتك</b>—</span>
              <span className="ledger-what">
                تعذَّر تحميل مقرّراتك —{' '}
                <button type="button" className="btn ghost sm" onClick={() => enrollments.refetch()}>إعادة المحاولة</button>
              </span>
            </div>
          ) : sortedEnrollments.length === 0 ? (
            /* R319 (c2-G1): the actionable empty — hatched cell + the
               catalog link as its ONE action. */
            <EmptyCell
              label="لا مقرّرات بعد"
              note="لم تُسجَّل في مقرّرات هذا الفصل بعد — دليل المقرّرات يعرض ما تقدّمه كلّيّتك."
              action={<Link to="/student/catalog" className="btn ghost sm">دليل المقرّرات</Link>}
            />
          ) : (
            <RowList aria-label="قائمة مقرّراتك">
              {sortedEnrollments.map((e) => <DashCourseRow key={e.id} e={e} />)}
            </RowList>
          )}
        </section>

        <section aria-label="فجوات الإتقان الموصى بها">
          <SectionBar
            index="04"
            title="فجوات يُنصح بسدّها"
            action={<Link to="/student/matrix" className="btn ghost sm">المصفوفة الكاملة</Link>}
          />
          {gaps.isPending ? (
            <ListSkeleton rows={2} />
          ) : gaps.isError ? (
            <div className="ledger-row ledger-row-flat" role="alert">
              <span className="ledger-lead"><b>فجوات</b>—</span>
              <span className="ledger-what">
                تعذَّر تحميل فجواتك —{' '}
                <button type="button" className="btn ghost sm" onClick={() => gaps.refetch()}>إعادة المحاولة</button>
              </span>
            </div>
          ) : topGaps.length === 0 ? (
            <EmptyCell
              label="لا فجوات بعد"
              note="لا فجوات مكتشفة بعد — أجب عن نقاط التفاعل في محاضراتك لترسم خريطة إتقانك."
            />
          ) : (
            <RowList aria-label="أولوية سدّ الفجوات">
              {topGaps.map((g) => (
                g.recommendedLectureId ? (
                  <RowItem
                    key={g.conceptId}
                    to={`/student/lectures/${g.recommendedLectureId}`}
                    leading={<Icon icon={AlertCircle} size={16} className="text-warning-ink" />}
                    title={g.conceptName}
                    meta={<>{g.courseName} · <bdi className="dash-gap-pct">{formatInt(Math.round(g.level * 100))}%</bdi> الآن</>}
                    trailing={
                      <span className="dash-gap-side">
                        <MasteryCells
                          mastery={g.level}
                          ariaLabel={`إتقان ${g.conceptName}: ${formatInt(Math.round(g.level * 100))}%`}
                        />
                        <span className="btn outline sm pf-chip"><Icon icon={Play} size={13} />سدّ الفجوة</span>
                      </span>
                    }
                  />
                ) : (
                  <RowItem
                    key={g.conceptId}
                    leading={<Icon icon={AlertCircle} size={16} className="text-warning-ink" />}
                    title={g.conceptName}
                    meta={<>{g.courseName} · <bdi className="dash-gap-pct">{formatInt(Math.round(g.level * 100))}%</bdi> الآن</>}
                    trailing={
                      <span className="dash-gap-side">
                        {/* P2.5 — the concept's mastery as the 0–4 cell
                            scale (the matrix register, in the row). */}
                        <MasteryCells
                          mastery={g.level}
                          ariaLabel={`إتقان ${g.conceptName}: ${formatInt(Math.round(g.level * 100))}%`}
                        />
                        <span className="r305s-chip"><span className="r305s-chip-dot" aria-hidden="true" />لا توصية بعد</span>
                      </span>
                    }
                  />
                )
              ))}
            </RowList>
          )}
        </section>
      </div>

      {/* الحالة — the momentum strip (r220 facts, R305 register): the
          Heron labeled rule classifies the line as the page's metadata
          band; the StatLine pattern below stays untouched. R319
          (c2-G1): the KPI block's summary instrument — the AVG
          CourseBar under the line (the same avgEnrollmentProgressPct
          datum the «إنجاز المقرّرات» stat prints, as a hairline +
          end-tick reading). P2.5: two more instruments join the band —
          GradeBars (the graded works' real distribution, the student's
          own band in orange) and StreakTicks (the weekly study log —
          NO daily datum exists in the API yet, so the row renders its
          honest empty register: seven empty ticks, today outlined). */}
      <section aria-label="زخم الفصل" className="dash-momentum">
        <div className="r305s-rule-labeled" aria-hidden="true">زخم الفصل</div>
        <StatLine items={statLineItems} />
        {d.kpi.courseCount > 0 && (
          <CourseBar code="AVG" pct={courseProgressPct} ariaLabel="متوسط إنجاز مقرّراتك الحالية" />
        )}
        <div className="dash-indicators">
          {gradeDist && (
            <div className="dash-indicator">
              <span className="ind-microlabel">توزيع درجاتك</span>
              <GradeBars
                bands={gradeDist.counts}
                ownIndex={gradeDist.ownIndex}
                ariaLabel={`توزيع درجاتك على ${formatInt(gradedScores.length)} عمل مُقيَّم`}
              />
            </div>
          )}
          <div className="dash-indicator">
            <span className="ind-microlabel">أسبوع الدراسة</span>
            <StreakTicks
              todayIndex={now.getDay()}
              note="يُسجَّل تلقائيًا مع كل محاضرة تشاهدها — سجل الأسبوع يُعرض هنا"
            />
          </div>
        </div>
      </section>

      {/* P2.5 — the AI assistant entry: a quiet hairline row (the §R325.c
          hatch hover is its only flourish) pointing at the assistant the
          sidebar already carries. The mono AI mark is the route's own
          badge identity (nav.ts), never a new colour. */}
      <section aria-label="المساعد الذكي" className="dash-ai">
        <Link to="/student/ai" className="dash-ai-row">
          <span className="dash-ai-mark" dir="ltr" aria-hidden="true">AI</span>
          <span className="dash-ai-body">
            <b>المساعد الذكي</b>
            <span>اسأل عن مقرّر، لخّص محاضرة، أو اطلب خطة مراجعة.</span>
          </span>
          <Icon icon={ArrowLeft} size={14} />
        </Link>
      </section>

      {/* [05] الأسبوع — the non-exam remainder grouped by real day.
          R319 (c2-G1): every row's kind chip is the §B2 mono register
          ([LIVE] orange only / the honest DUE label / [CLASS] quiet)
          beside the meta's Arabic sentence. */}
      {later.length > 0 && (
        <section aria-label="التزامات الأسبوع القادم" className="dash-section">
          <SectionBar
            index="05"
            title="أسبوعك القادم"
            meta={
              <BarCount
                n={later.length}
                srLabel={countAr(later.length, ['التزام واحد قادم', 'التزامان قادمان', 'التزامات قادمة', 'التزاماً قادماً'])}
              />
            }
            action={<Link to="/student/calendar" className="btn ghost sm">التقويم الكامل</Link>}
          />
          <RowList aria-label="التزامات الأسبوع القادم">
            {weekGroups.map((g) => (
              <div key={g.key} className="dash-week-group">
                <div className="dash-week-day" aria-hidden="true">
                  <b>{g.day}</b>
                  <span className="font-mono">{g.date}</span>
                </div>
                <div className="week-rows">
                  {g.items.map((item) => {
                    const chip = agendaChip(item, now.getTime());
                    return (
                      <Link key={item.id} to={item.to} className="week-item">
                        <span className="week-item-title">{item.title}</span>
                        <span className="week-item-meta">{item.meta}</span>
                        <span className="r319s-rowchip">
                          <StatusChip label={chip.label} tone={chip.tone} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </RowList>
        </section>
      )}
      </PageFrame>
    </div>
  );
}
