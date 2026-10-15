import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import {
  GraduationCap, Presentation, FileText, FlaskConical,
  BookOpen, CalendarCheck, ClipboardList, Trophy, Radio,
  Play, ChevronLeft, Eye, ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge, MetricCard, ProgressBar } from '../../components/primitives';
import { ErrorState, EmptyState, KpiSkeleton, CardSkeleton, Skeleton } from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useStudentDashboard, useResume, useTrainingCatalog } from '../../hooks/useResources';
import { useChartThemeKey, chartColors, radialOptions } from '../../lib/chartTheme';
import { ASSIGNMENT_KIND_LABEL, EXAM_KIND_LABEL } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { formatNum } from '../../utils/numbers';

ChartJS.register(ArcElement, Tooltip, Legend);

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

const ASSIGNMENT_ICON: Record<'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM', LucideIcon> = {
  HOMEWORK: ClipboardList,
  QUIZ: FileText,
  PROJECT: FlaskConical,
  EXAM: FileText,
};

/* ASSIGNMENT_KIND_LABEL (the assignment-kind Arabic labels) lives in
 * lib/courseMeta.ts — the 13-15 fold of this page's ASSIGNMENT_LABEL
 * and CourseDetailPage's TYPE_LABELS (values byte-identical). */

const DAY_LABEL: Record<'today' | 'tomorrow', string> = {
  today: 'اليوم',
  tomorrow: 'غداً',
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  const time = d.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
  /* 22-c (A3 P3-2): a PAST-due assignment read «اليوم» (days <= 0) —
     "due today" for something due yesterday. Overdue gets its own
     label with the date; same-day (days === 0, incl. a passed hour)
     keeps «اليوم · الوقت». */
  if (days < 0) return `فات الموعد · ${d.toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' })}`;
  if (days === 0) return `اليوم · ${time}`;
  if (days === 1) return `غداً · ${time}`;
  // Arabic plural rules inside the ≤6-day window: dual, then plural.
  if (days === 2) return `بعد يومين · ${time}`;
  if (days < 7) return `بعد ${days} أيام · ${time}`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

/* r158 (6A14 P2) — agenda chronology. The agenda used to concatenate
 * its three sources BY KIND, so a live broadcast could render below
 * tomorrow's class. Every item now carries a numeric whenMs and the
 * merged list sorts ascending by it. Both helpers are PURE (exported
 * for tests/unit/DashboardPage-agenda.test.ts) and never return NaN:
 *   - classWhenMs anchors today/tomorrow to the slot's own startTime;
 *     a malformed time falls back to END-OF-DAY (23:59:59.999 of the
 *     SAME day — after every well-formed slot of that day, before the
 *     next day). Empty parts ("", "09:", "9") and out-of-range values
 *     fail the guard below, so the result is never NaN.
 *   - safeMs parses ISO dates (dueAt / scheduledAt); a malformed string
 *     sorts LAST (MAX_SAFE_INTEGER — no parseable ISO exceeds it). */
export function classWhenMs(
  slot: { when: 'today' | 'tomorrow'; startTime: string },
  now: Date = new Date(),
): number {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (slot.when === 'tomorrow') day.setDate(day.getDate() + 1);
  const parts = slot.startTime.split(':');
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

function gpaTone(gpa: number): { label: string; color: 'green' | 'amber' | 'red' } {
  if (gpa >= 3.5) return { label: 'ممتاز', color: 'green' };
  if (gpa >= 3.0) return { label: 'جيد جدّاً', color: 'green' };
  if (gpa >= 2.0) return { label: 'جيد', color: 'amber' };
  return { label: 'بحاجة لتحسين', color: 'red' };
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
      {display.toLocaleString('ar-LY', {
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
  icon: LucideIcon;
  tone: AgendaTone;
};

/* r164-c — the training arm of the resume decision. /me/resume answers
 * the LECTURE half (continue the most-recently-watched lecture, or
 * start the first unwatched one). When it returns null — every lecture
 * of every active enrollment is watched, or the student has no course
 * enrollments at all — the next honest action is the training track the
 * student is partway through (edX's "resume" promise, extended to the
 * self-development surface). Pure (exported for
 * tests/unit/DashboardPage-exams-resume.test.ts):
 *  · candidates = enrolled && !isCompleted tracks, in catalog order;
 *  · a track with completedLessons > 0 is a true CONTINUE — the most
 *    advanced one wins (the nearest finish line is the strongest
 *    next-action signal);
 *  · otherwise the FIRST unstarted enrolled track is a START nudge;
 *  · no candidates → null → the hero renders nothing, exactly like the
 *    lecture half. */
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

/* PP-X2 (audit P0-3) — the continue-learning hero. The PRIMARY action
 * of the dashboard: one click from cold-open to the exact second the
 * student left off (GET /me/resume). null → renders nothing; a pending
 * query renders its own ~88px skeleton so the rest of the dashboard
 * never waits on it. r164-c: when the lecture payload is null, the
 * hero falls through to the TRAINING arm above — the card never
 * silently disappears while a self-development track is mid-flight. */
function ResumeHero({
  resume,
  training,
}: {
  resume: ReturnType<typeof useResume>;
  training: ReturnType<typeof useTrainingCatalog>;
}) {
  if (resume.isPending) {
    // The card's own skeleton — same footprint as the loaded card, so
    // the KPI row below doesn't shift when the resume payload lands.
    return (
      <section className="dash-resume" aria-busy="true">
        <Skeleton width="100%" height={88} rounded="var(--r-xl)" />
      </section>
    );
  }
  /* r157 (W2-F7): honest error branch — a failed /me/resume used to
   * render NOTHING here (the `!r` return swallowed the query error),
   * so the dashboard's PRIMARY action silently vanished on a network
   * blip. Same grammar as the player's completion-report retry
   * (.lecture-report-retry: role=alert + retry + escape hatch). */
  if (resume.isError) {
    return (
      <section className="dash-resume">
        <div className="lecture-report-retry" role="alert">
          <span>تعذّر تحميل بطاقة «أكمل من حيث توقفت» — يمكنك إعادة المحاولة الآن، أو الانتقال إلى مقرّراتك مباشرةً.</span>
          <span className="lecture-report-retry-actions">
            <button type="button" className="btn sm" onClick={() => resume.refetch()}>
              إعادة المحاولة
            </button>
            <Link className="btn ghost sm" to="/student/courses">
              اذهب إلى مقرّراتك
            </Link>
          </span>
        </div>
      </section>
    );
  }
  const r = resume.data;
  if (!r) {
    // r164-c — lecture half empty: the training arm. A pending catalog
    // renders nothing yet (the card pops in when the payload lands —
    // the hero is above the fold and the KPI row never depended on it);
    // an error or no candidates renders nothing, same as before.
    const t = training.data ? pickTrainingResume(training.data) : null;
    if (!t) return null;
    return (
      <section className="dash-resume" aria-label="أكمل من حيث توقفت">
        <Card className="dash-resume-card">
          <div className="dash-resume-main">
            <div className="dash-eyebrow">أكمل من حيث توقفت</div>
            <div className="dash-resume-course">
              <span className="dash-resume-course-name">{t.title}</span>
              <Badge>تطوير ذاتي</Badge>
            </div>
            <div className="dash-resume-lecture">
              {t.started
                ? `مسار بدأته وأنجزت ${t.progressPct}% من دروسه — أكمل الدرس التالي.`
                : 'مسار سجّلت فيه ولم تبدأه بعد — ابدأه من الدرس الأول.'}
            </div>
            {t.started && (
              <div className="dash-resume-progress">
                <ProgressBar value={t.progressPct} label="تقدّم المسار" ariaLabel="نسبة إنجاز المسار التدريبي المتوقّف" />
              </div>
            )}
          </div>
          <Link
            to={`/training/${t.slug}`}
            className="btn primary dash-resume-cta"
          >
            <Icon icon={Play} size={15} />
            {t.started ? 'متابعة المسار' : 'ابدأ المسار'}
          </Link>
        </Card>
      </section>
    );
  }
  const continuing = r.mode === 'continue';
  return (
    <section className="dash-resume" aria-label="أكمل من حيث توقفت">
      <Card className="dash-resume-card">
        <div className="dash-resume-main">
          <div className="dash-eyebrow">أكمل من حيث توقفت</div>
          <div className="dash-resume-course">
            <span className="dash-resume-course-name">{r.lecture.course.name}</span>
            <Badge><bdi className="font-mono">{r.lecture.course.code}</bdi></Badge>
          </div>
          <div className="dash-resume-lecture">
            المحاضرة <bdi>{r.lecture.ordinal}</bdi> · {r.lecture.title}
          </div>
          {continuing && (
            <div className="dash-resume-progress">
              <ProgressBar value={r.progressPct} label="تقدّم المشاهدة" ariaLabel="نسبة مشاهدة المحاضرة المتوقّفة" />
            </div>
          )}
        </div>
        <Link
          to={`/student/lectures/${r.lecture.id}`}
          className="btn primary dash-resume-cta"
        >
          <Icon icon={Play} size={15} />
          {continuing ? 'متابعة المحاضرة' : 'ابدأ أول محاضرة'}
        </Link>
      </Card>
    </section>
  );
}

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = useGreeting();
  const dash = useStudentDashboard();
  // Independent of the dashboard aggregate — the hero renders (or not)
  // the moment ITS payload lands, and never blocks the KPIs above.
  const resume = useResume();
  // r164-c: the training catalog feeds the hero's second arm (only
  // consulted when the lecture payload is null — see pickTrainingResume).
  const trainingCatalog = useTrainingCatalog();
  // Remounts every Chart.js canvas when the light/dark theme flips, so
  // canvas colours are re-resolved instead of staying stale.
  const themeKey = useChartThemeKey();

  if (dash.isPending) {
    return (
      <div className="page student-dashboard" aria-busy="true" aria-live="polite">
        {/* r168a: family alignment — every dashboard's outline leads
            with its identity (لوحة الأستاذ / لوحة الإدارة…) while the
            student h1 was the personal greeting alone. sr-only h1 keeps
            the v8 welcome-card hero pixels untouched (the gradient
            greeting is .page-title class-driven, tag-agnostic) and the
            visible greeting drops to h2, matching the family's
            title + greeting hierarchy. */}
        <header className="page-header welcome-card">
          <h1 className="sr-only">لوحة الطالب</h1>
          <h2 className="page-title">{greeting}، {user?.firstName ?? '…'}</h2>
          <p className="page-subtitle">جارٍ تحضير لوحتك…</p>
        </header>
        <KpiSkeleton />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={3} withTitle={false} />
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="page student-dashboard">
        <header className="page-header welcome-card">
          <h1 className="sr-only">لوحة الطالب</h1>
          <h2 className="page-title">{greeting}، {user?.firstName ?? '…'}</h2>
        </header>
        <ErrorState
          message="تعذَّر تحميل لوحة التحكّم"
          error={dash.error}
          onRetry={() => dash.refetch()}
        />
      </div>
    );
  }

  const d = dash.data;

  // ADMIN/OWNER preview path — no studentProfile of their own. Render an
  // honest "preview" surface instead of crashing on d.profile.gpa.
  if (d.preview || !d.profile) {
    return (
      <div className="page student-dashboard">
        <header className="page-header welcome-card">
          <h1 className="sr-only">لوحة الطالب</h1>
          <h2 className="page-title">{greeting}، {user?.firstName ?? ''}</h2>
          <p className="page-subtitle">
            معاينة لوحة الطالب — يحتاج هذا العرض إلى ملف طالب فعليّ.
          </p>
        </header>
        <Card>
          {/* r149 (R3-A1 #6): EmptyState الكنونية — كانت فقرة مجردة بلا
              تشريح (لا بئر، لا عنوان، لا role=status). */}
          <EmptyState
            icon={Eye}
            title="عرض معاينة"
            description={`لوحة التحكّم هذه مخصّصة للطلّاب. أنت مسجَّل دخول كحساب ${
              user?.role === 'OWNER' ? 'مالك المنصّة' : 'إداريّ'
            }، لذلك تظهر لك صفحة معاينة فارغة. للاطّلاع على لوحة طالب حقيقيّة، استخدم حساب طالب مسجَّل أو زر صفحة كلّيّة من قائمة الكلّيّات.`}
          />
        </Card>
      </div>
    );
  }

  const tone = gpaTone(d.profile.gpa);
  const courseProgressPct = d.progress.avgEnrollmentProgressPct;
  const remainingPct = Math.max(0, 100 - courseProgressPct);
  const cc = chartColors();

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
      title: `${c.courseName}${c.room ? ` — ${c.room}` : ''}`,
      meta: <>{DAY_LABEL[c.when]} · <bdi>{c.startTime}–{c.endTime}</bdi></>,
      icon: Presentation, tone: c.when === 'today' ? 'accent' : 'gold',
    })),
    ...d.agenda.assignments.slice(0, 3).map<AgendaItem>((a) => ({
      kind: 'assign', id: `a-${a.id}`,
      whenMs: safeMs(a.dueAt),
      to: `/student/courses/${a.offeringId}`,
      title: <>{ASSIGNMENT_KIND_LABEL[a.type]}: {a.title} (<bdi>{a.courseCode}</bdi>)</>,
      meta: <>تسليم {formatDue(a.dueAt)}</>,
      icon: ASSIGNMENT_ICON[a.type], tone: 'gold',
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
      icon: Radio, tone: 'red',
    })),
    // r164-c — the fourth bucket: still-actable exams. Distinct treatment
    // (ClipboardCheck well + red tone + the «يفتح/آخر موعد» phrasing) and
    // a deep link straight into the exam taker; whenMs anchors on the row's
    // own milestone (whenAt) so the exam interleaves with the rest of the
    // week chronologically. `?? []` keeps a stale pre-r164-c cached payload
    // rendering as an empty bucket instead of crashing.
    ...(d.agenda.exams ?? []).slice(0, 4).map<AgendaItem>((e) => {
      const row = examAgendaRow(e);
      return {
        kind: 'exam' as const, id: row.id,
        whenMs: row.whenMs,
        to: row.to,
        title: (
          <>
            {row.kindLabel}: {e.title}
            {e.courseCode ? <> (<bdi>{e.courseCode}</bdi>)</> : null}
          </>
        ),
        meta: <>{row.metaLabel} {formatDue(e.whenAt)}</>,
        icon: ClipboardCheck, tone: 'red' as const,
      };
    }),
  ].sort((a, b) => a.whenMs - b.whenMs);

  return (
    <div className="page student-dashboard">
      <header className="page-header welcome-card">
        <h1 className="sr-only">لوحة الطالب</h1>
        <h2 className="page-title">
          {greeting}، {user?.firstName ?? ''}
        </h2>
        <p className="page-subtitle">
          {d.profile.facultyName
            ? `${d.profile.facultyName}${d.profile.departmentName ? ` · ${d.profile.departmentName}` : ''} · السنة ${d.profile.year}`
            : 'لوحة متابعة تقدّمك الأكاديمي.'}
        </p>
      </header>

      {/* Continue-learning hero (PP-X2 / audit P0-3) — the page's
          primary action, above the KPI row: course + code chip + lecture
          + watched share + ONE dominant CTA to the exact lecture. */}
      <ResumeHero resume={resume} training={trainingCatalog} />

      {/* At-a-glance KPI row — real values; the count-up reveal rides the
          grid's entrance stagger (polish grid children) as the page moment */}
      <section className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="مقررات نشطة"
          value={<CountIn value={d.kpi.courseCount} />}
          change={d.kpi.courseCount > 0 ? 'هذا الفصل' : 'لا توجد تسجيلات'}
          color="brand"
        />
        <MetricCard
          icon={CalendarCheck}
          label="نسبة الحضور"
          value={d.kpi.attendancePct !== null ? <CountIn value={d.kpi.attendancePct} suffix="%" /> : '—'}
          change={d.kpi.attendancePct !== null ? 'إجمالي الفصل' : 'لا توجد سجلات بعد'}
          color={d.kpi.attendancePct === null ? 'brand' : d.kpi.attendancePct >= 80 ? 'green' : d.kpi.attendancePct >= 60 ? 'amber' : 'red'}
        />
        <MetricCard
          icon={ClipboardList}
          label="مهام معلّقة"
          value={<CountIn value={d.kpi.pendingAssignmentsCount} />}
          change={d.agenda.assignments[0] ? `أقربها ${formatDue(d.agenda.assignments[0].dueAt)}` : 'لا مهام قريبة'}
          color={d.kpi.pendingAssignmentsCount === 0 ? 'green' : d.kpi.pendingAssignmentsCount > 3 ? 'red' : 'amber'}
        />
        <MetricCard
          icon={Trophy}
          label="نقاط الإنجاز"
          value={<CountIn value={d.kpi.totalXp} />}
          change={d.kpi.cohortSize > 1 ? <>المركز <bdi>{d.kpi.rank}</bdi> من <bdi>{d.kpi.cohortSize}</bdi> على دفعتك</> : 'مستوى ' + d.profile.level}
          color="purple"
        />
      </section>

      {/* Hero KPIs — GPA + Progress side-by-side, stacks on phone */}
      <section className="dash-hero-row">
        <Card className="dash-gpa-card card-glass-premium">
          <div className="dash-gpa-body">
            <div className="dash-gpa-text">
              <div className="dash-eyebrow gradient-text">المعدل التراكمي</div>
              <div className="dash-gpa-value" data-numeric="true">{formatNum(d.profile.gpa, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <Badge color={tone.color}>{tone.label}</Badge>
            </div>
            <div className="dash-gpa-orb">
              <Icon icon={GraduationCap} size={26} />
            </div>
          </div>
        </Card>

        <Card className="dash-progress-card card-glass-premium">
          <div className="dash-progress-body">
            <div className="dash-doughnut">
              <ChartFrame
                className="dash-doughnut-frame"
                ariaLabel={`متوسط التقدّم في المقرّرات: ${courseProgressPct}% منجز و${remainingPct}% متبقٍّ`}
                summary={
                  d.kpi.courseCount > 0
                    ? `أنجزت ${courseProgressPct}% من متوسط مقرّراتك المسجَّلة هذا الفصل.`
                    : 'لم تسجّل في أي مقرّر بعد.'
                }
                table={{
                  caption: 'متوسط التقدّم في المقرّرات النشطة',
                  columns: ['الحالة', 'النسبة'],
                  rows: [['منجز', `${courseProgressPct}%`], ['متبقٍّ', `${remainingPct}%`]],
                }}
              >
                <Doughnut
                  key={themeKey}
                  data={{
                    labels: ['منجز', 'متبقي'],
                    datasets: [{
                      data: [courseProgressPct, remainingPct],
                      backgroundColor: [cc.accent, cc.surfaceMuted],
                      borderWidth: 0,
                      spacing: 2,
                    }],
                  }}
                  options={radialOptions({ cutout: '78%', legend: false })}
                />
              </ChartFrame>
              {/* key → the number re-rises whenever a refetch moves the
                  average (the authored data-change transition). No
                  data-numeric here — polish's generic [data-numeric]
                  entrance would override the authored one. */}
              <div className="dash-doughnut-center" key={courseProgressPct}>
                {courseProgressPct}%
              </div>
            </div>
            <div className="dash-progress-text">
              <div className="dash-eyebrow">تقدّم المقرّرات</div>
              <div className="dash-progress-value">
                {d.kpi.courseCount > 0
                  ? `متوسّط تقدّمك في ${countAr(d.kpi.courseCount, ['مقرّر نشط واحد', 'مقرّرين نشطين', 'مقرّرات نشطة', 'مقرّراً نشطاً'])}`
                  : 'لم تسجّل في أي مقرّر بعد'}
              </div>
              <div className="dash-progress-note">
                {courseProgressPct >= 75 ? 'متقدّم كثيراً عن المطلوب' :
                  courseProgressPct >= 50 ? 'على الطريق الصحيح' :
                  d.kpi.courseCount > 0 ? 'تحتاج إلى دفعة إضافيّة' : '—'}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Term progress bar — based on real calendar dates */}
      <Card className="dash-term-card">
        <header className="dash-term-head">
          <span className="dash-eyebrow">تقدّم الفصل الدراسي الحالي</span>
          <span className="dash-term-pct" data-numeric="true">{d.term.progressPct}%</span>
        </header>
        <div
          className="dash-term-bar"
          role="progressbar"
          aria-label="تقدّم الفصل الدراسي الحالي"
          aria-valuenow={d.term.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* 23-b (A11 P2-10): scaleX from the inline-start edge (RTL
              transform-origin in student.css) instead of an inline
              width — compositor-only fill animation. */}
          <span style={{ transform: `scaleX(${d.term.progressPct / 100})` }} />
        </div>
        <footer className="dash-term-foot">
          <span>بداية الفصل · {new Date(d.term.startsAt).toLocaleDateString('ar-LY', { day: '2-digit', month: '2-digit' })}</span>
          <span>نهاية الفصل · {new Date(d.term.endsAt).toLocaleDateString('ar-LY', { day: '2-digit', month: '2-digit' })}</span>
        </footer>
      </Card>

      {/* Up-coming agenda — composed from real classes/assignments/live.
          Items slide in from inline-start (polish agenda stagger). */}
      <section className="dash-agenda">
        <header className="dash-agenda-head">
          <h2 className="dash-section-title">المهام والفصول القادمة</h2>
        </header>
        {agenda.length === 0 ? (
          <Card>
            {/* r166a (E1 oversized-empty): dropped the 160px
                illustration — this slot is a status strip at the tail
                of the column (desktop) / slot 2 (mobile), not a
                destination page; the icon well + compact padding
                (student.css .dash-agenda .state) keep one honest line
                from dominating the dashboard. */}
            <EmptyState
              icon={CalendarCheck}
              title="أجندتك فارغة"
              description="لا حصص أو مهام أو اختبارات قادمة في أجندك بعد — سجّل في مقرّر أو طَلِب مهمة لظهورها هنا."
            />
          </Card>
        ) : (
          <div className="dash-agenda-list">
            {agenda.map((item) => (
              /* PP-X2 (audit P1-8): the row is the link — the same
                 .card .dash-agenda-item anatomy, now navigable. The
                 chevron points inline-end (LEFT in RTL = forward). */
              <Link
                key={item.id}
                to={item.to}
                className="card dash-agenda-item agenda-row"
              >
                {/* data-tone rides the icon well — Card doesn't spread
                    unknown props, so the old root-level data-tone never
                    reached the DOM (silently dead since inception). */}
                <div className="dash-agenda-icon" data-tone={item.tone}>
                  <Icon icon={item.icon} size={22} />
                </div>
                <div className="dash-agenda-text">
                  <div className="dash-agenda-title">{item.title}</div>
                  <div className="dash-agenda-meta">{item.meta}</div>
                </div>
                <Icon icon={ChevronLeft} size={16} className="agenda-row-chevron" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
