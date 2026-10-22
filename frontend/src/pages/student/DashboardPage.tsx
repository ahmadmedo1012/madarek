import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Eye, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, ProgressBar } from '../../components/primitives';
import {
  ErrorState, EmptyState, ListSkeleton, Skeleton,
} from '../../components/primitives/States';
import { ProgressRing } from '../../components/primitives/Ledger';
import {
  PageFrame, PageHeader, RowList, RowItem, StatLine, TodayList,
  type StatLineItem,
} from '../../components/patterns';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import {
  useStudentDashboard, useResume, useTrainingCatalog, useGaps,
  useMyEnrollments, type MyEnrollment,
} from '../../hooks/useResources';
import { EXAM_KIND_LABEL, courseIcon, courseTint } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { formatInt, formatNum, formatDate, formatTime } from '../../utils/numbers';
/* R305 Heron — the shared student vocabulary + this page's family sheet.
 * Page-chunk CSS loads after main.tsx's global sheets, so the family
 * refinements win same-specificity ties over the frozen student.css
 * recipes they restyle (the deep-band hero). */
import '../../styles/r305-student.css';
import '../../styles/r305-student-dashboard.css';

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
   button. The ring's aria-label carries the honest state; the side
   note keeps the course code + lecture clock (data, never decoration). */
function DashResumeHero({ focus }: { focus: ResumeFocus }) {
  if (focus.kind === 'lecture') {
    return (
      <section aria-label="الخطوة التعليمية التالية">
        <div className="dash-resume-card stu-hero r305s-band--deep dash-hero-deep">
          <span className="dash-resume-ring">
            <ProgressRing size={64} thickness={5} value={focus.continuing ? focus.progressPct : 0}
              ariaLabel={focus.continuing ? `تقدّم مشاهدة المحاضرة المتوقّفة: ${focus.progressPct}%` : 'المحاضرة الأولى لم تُشاهد بعد'}
              center={null} />
          </span>
          <div className="dash-resume-main">
            <span className="dash-resume-eyebrow r305s-eyebrow">{focus.continuing ? 'أكمل من حيث توقفت' : 'الخطوة التالية'}</span>
            <span className="dash-resume-course-name">{focus.courseName}</span>
            <span className="dash-resume-lecture">
              المحاضرة <bdi>{formatInt(focus.ordinal)}</bdi> · {focus.lectureTitle}
            </span>
            {focus.continuing && (
              <div className="dash-resume-progress">
                <ProgressBar value={focus.progressPct} showValue={false}
                  ariaLabel={`تقدّم مشاهدة المحاضرة: ${focus.progressPct}%`} />
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
        <span className="dash-resume-ring">
          <ProgressRing size={64} thickness={5} value={focus.started ? focus.progressPct : 0}
            ariaLabel={focus.started ? `تقدّم المسار التدريبي: ${focus.progressPct}%` : 'مسار لم يبدأ بعد'}
            center={null} />
        </span>
        <div className="dash-resume-main">
          <span className="dash-resume-eyebrow r305s-eyebrow">{focus.started ? 'أكمل من حيث توقفت' : 'الخطوة التالية'}</span>
          <span className="dash-resume-course-name">{focus.title}</span>
          <span className="dash-resume-lecture">مسار التطوير الذاتي · {focus.started ? `أنجزت ${formatInt(focus.progressPct)}% من دروسه` : 'سجّلت فيه ولم تبدأه بعد'}</span>
          {focus.started && (
            <div className="dash-resume-progress">
              <ProgressBar value={focus.progressPct} showValue={false}
                ariaLabel={`تقدّم المسار التدريبي: ${focus.progressPct}%`} />
            </div>
          )}
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
   not need: the row's truth is its progress + its teacher. */
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
          <ProgressBar value={e.progressPct} color={tint} showValue={false}
            ariaLabel={`تقدّم مقرّر ${c.name}: ${e.progressPct}%`} />
          <bdi className="stu-course-pct">{formatInt(Math.round(e.progressPct))}%</bdi>
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

  if (dash.isPending) {
    /* r220 loading mirror — the resolved page leads with the PageHeader,
       the TodayList (its continue-learning row first), the gaps list,
       the stat line, then the week list. Every slot renders the
       resolved section's class + approximate footprint, so the
       pending → resolved handoff moves nothing (the r172b
       loading-closure contract, re-mirrored for the pattern anatomy). */
    return (
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
            <Skeleton width={64} height={64} rounded="var(--r-full)" />
            <div className="dash-resume-main">
              <Skeleton width={120} height={13} />
              <Skeleton width="52%" height={24} />
              <Skeleton width="38%" height={13} />
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
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <PageFrame width="default">
        <PageHeader title="لوحة التحكم" />
        <ErrorState
          message="تعذَّر تحميل لوحة التحكّم"
          error={dash.error}
          onRetry={() => dash.refetch()}
        />
      </PageFrame>
    );
  }

  const d = dash.data;

  // ADMIN/OWNER preview path — no studentProfile of their own. Render an
  // honest "preview" surface instead of crashing on d.profile.gpa.
  if (d.preview || !d.profile) {
    return (
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
      title: <>{c.courseName}{c.room ? ` — ${c.room}` : ''}</>,
      meta: <>{DAY_LABEL[c.when]} · <bdi>{c.startTime}–{c.endTime}</bdi></>,
      tone: c.when === 'today' ? 'accent' : 'gold',
    })),
    ...d.agenda.assignments.slice(0, 3).map<AgendaItem>((a) => ({
      kind: 'assign', id: `a-${a.id}`,
      whenMs: safeMs(a.dueAt),
      to: `/student/courses/${a.offeringId}`,
      title: <>{a.title} (<bdi>{a.courseCode}</bdi>)</>,
      meta: <>تسليم {formatDue(a.dueAt)}</>,
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
      meta: <><bdi>{l.offering.course.code}</bdi> · {formatDue(l.scheduledAt)}</>,
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
        meta: <>{row.metaLabel} {formatDue(e.whenAt)}</>,
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

  return (
    <PageFrame width="default">
      <PageHeader
        title="لوحة التحكم"
        eyebrow="مساحة الطالب"
        description={
          <>
            {greeting}، {user?.firstName ?? ''} — {d.profile.facultyName
              ? `${d.profile.facultyName}${d.profile.departmentName ? ` · ${d.profile.departmentName}` : ''} · السنة ${d.profile.year}`
              : 'لوحة متابعة تقدّمك الأكاديمي.'}
          </>
        }
        meta={
          <>
            {dateLine} · {termPct}% من الفصل مضى · يبدأ {formatDate(d.term.startsAt, { day: '2-digit', month: '2-digit' })} وينتهي {formatDate(d.term.endsAt, { day: '2-digit', month: '2-digit' })}
          </>
        }
      />

      {/* الخطوة التالية — the hero band (R304): the ONE next learning
          action, its own surface above the lists (r164-c arms kept:
          lecture first, then the training track). */}
      {focus && <DashResumeHero focus={focus} />}

      {/* اليوم — the ONE TodayList (r220): today's commitments first,
          then every still-actable exam. R305: the section opens with the
          Heron kicker register (title + hairline + an honest count of
          the actable rows as quiet metadata) and the pattern list below
          carries the urgency dots unchanged. */}
      <section aria-label="اليوم" className="dash-section">
        <div className="r305s-kicker">
          <h2 className="r305s-kicker-title">اليوم</h2>
          {today.length + exams.length > 0 && (
            <span className="r305s-kicker-action r305s-chip">
              <span className="r305s-chip-dot" aria-hidden="true" />
              {countAr(today.length + exams.length, ['التزام واحد اليوم', 'التزامان اليوم', 'التزامات اليوم', 'التزاماً اليوم'])}
            </span>
          )}
        </div>
        <TodayList
          items={[
            ...today.map((item) => ({
              id: item.id,
              title: nodeText(item.title),
              meta: item.meta,
              to: item.to,
              urgency: (item.tone === 'red' ? 'now' : item.tone === 'accent' ? 'now' : 'soon') as 'now' | 'soon',
            })),
            ...exams.map((item) => ({
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
            })),
          ]}
          emptyState={
            <div className="ledger-row ledger-row-flat">
              <span className="ledger-lead"><b>اليوم</b>راحة</span>
              <span className="ledger-what">
                لا حصص أو مهام أو اختبارات اليوم — أسبوعك القادم أدناه، ومقرّراتك تنتظرك في الأسفل.
              </span>
            </div>
          }
        />
      </section>

      {/* التعلّم — the workspace band (R304): مقرّراتك carries the main
          column (in-progress first), the gaps rail sits beside it.
          Honest states everywhere: pending → row skeletons; error →
          quiet retry row; empty → one calm line (no celebration
          banner). Every gap row with a recommendation is a WHOLE-ROW
          link — the matrix page's سدّ الفجوة contract, now one voice
          across both surfaces. */}
      <div className="grid-2-1">
        <section aria-label="مقرّراتك الحالية">
          <div className="r305s-kicker">
            <h2 className="r305s-kicker-title">مقرّراتك</h2>
            <span className="r305s-kicker-action">
              <Link to="/student/courses" className="btn ghost sm">كل المقرّرات</Link>
            </span>
          </div>
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
            <div className="ledger-row ledger-row-flat">
              <span className="ledger-lead"><b>مقرّراتك</b>لا شيء بعد</span>
              <span className="ledger-what">
                لم تُسجَّل في مقرّرات هذا الفصل بعد — <Link to="/student/catalog">دليل المقرّرات</Link> يعرض ما تقدّمه كلّيّتك.
              </span>
            </div>
          ) : (
            <RowList aria-label="قائمة مقرّراتك">
              {sortedEnrollments.map((e) => <DashCourseRow key={e.id} e={e} />)}
            </RowList>
          )}
        </section>

        <section aria-label="فجوات الإتقان الموصى بها">
          <div className="r305s-kicker">
            <h2 className="r305s-kicker-title">فجوات يُنصح بسدّها</h2>
            <span className="r305s-kicker-action">
              <Link to="/student/matrix" className="btn ghost sm">المصفوفة الكاملة</Link>
            </span>
          </div>
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
            <div className="ledger-row ledger-row-flat">
              <span className="ledger-lead"><b>فجوات</b>لا شيء</span>
              <span className="ledger-what">
                لا فجوات مكتشفة بعد — أجب عن نقاط التفاعل في محاضراتك لترسم خريطة إتقانك.
              </span>
            </div>
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
                    trailing={<span className="btn outline sm pf-chip"><Icon icon={Play} size={13} />سدّ الفجوة</span>}
                  />
                ) : (
                  <RowItem
                    key={g.conceptId}
                    leading={<Icon icon={AlertCircle} size={16} className="text-warning-ink" />}
                    title={g.conceptName}
                    meta={<>{g.courseName} · <bdi className="dash-gap-pct">{formatInt(Math.round(g.level * 100))}%</bdi> الآن</>}
                    trailing={<span className="r305s-chip"><span className="r305s-chip-dot" aria-hidden="true" />لا توصية بعد</span>}
                  />
                )
              ))}
            </RowList>
          )}
        </section>
      </div>

      {/* الحالة — the momentum strip (r220 facts, R305 register): the
          Heron labeled rule classifies the line as the page's metadata
          band; the StatLine pattern below stays untouched. */}
      <section aria-label="زخم الفصل" className="dash-momentum">
        <div className="r305s-rule-labeled" aria-hidden="true">زخم الفصل</div>
        <StatLine items={statLineItems} />
      </section>

      {/* الأسبوع — the non-exam remainder grouped by real day. */}
      {later.length > 0 && (
        <section aria-label="التزامات الأسبوع القادم" className="dash-section">
          <div className="r305s-kicker">
            <h2 className="r305s-kicker-title">أسبوعك القادم</h2>
            <span className="r305s-kicker-action">
              <Link to="/student/calendar" className="btn ghost sm">التقويم الكامل</Link>
            </span>
          </div>
          <RowList aria-label="التزامات الأسبوع القادم">
            {weekGroups.map((g) => (
              <div key={g.key} className="dash-week-group">
                <div className="dash-week-day" aria-hidden="true">
                  <b>{g.day}</b>
                  <span className="font-mono">{g.date}</span>
                </div>
                <div className="week-rows">
                  {g.items.map((item) => (
                    <Link key={item.id} to={item.to} className="week-item">
                      <span className="week-item-title">{item.title}</span>
                      <span className="week-item-meta">{item.meta}</span>
                      {item.kind === 'live' ? (
                        <span className="r305s-chip r305s-chip--danger"><span className="r305s-chip-dot" aria-hidden="true" />مباشر</span>
                      ) : item.kind === 'exam' ? (
                        <span className="r305s-chip r305s-chip--accent"><span className="r305s-chip-dot" aria-hidden="true" />اختبار</span>
                      ) : (
                        <span className="r305s-chip"><span className="r305s-chip-dot" aria-hidden="true" />تسليم</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </RowList>
        </section>
      )}
    </PageFrame>
  );
}
