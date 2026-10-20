import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/primitives';
import {
  ErrorState, EmptyState, ListSkeleton, Skeleton,
} from '../../components/primitives/States';
import { StatStrip, ProgressRing, LedgerPanel, LedgerRow, WeekRow } from '../../components/primitives/Ledger';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import {
  useStudentDashboard, useResume, useTrainingCatalog, useGaps,
} from '../../hooks/useResources';
import { EXAM_KIND_LABEL } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { formatInt, formatNum, formatDate, formatTime } from '../../utils/numbers';

/* ═══════════════════════════════════════════════════════════════════
   r220 (4A redesign — Superlist direction) — the dashboard is ONE
   TodayList, not a KPI wall:
   masthead → «اليوم» ledger (the continue-learning item pinned first,
   then today's real commitments, then every still-actable exam) →
   «فجوات يُنصح بسدّها» (the recommended gaps with direct remediation)
   → the momentum StatLine (compact typographic line, no icon boxes)
   → the week ledger (day-anchored).
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

/* ── The TodayList's first item: continue-learning ───────────────────
 * r220: the momentum hero became a LEDGER ROW — the ring rides the
 * lead column at list scale, the row is the link, the CTA chip is
 * visual-only. Keeps the honest branch ladder: pending → own-footprint
 * skeleton; error → the retry grammar; null+null → nothing (the
 * training arm answers first). */
function ResumeRow({
  resume,
  training,
}: {
  resume: ReturnType<typeof useResume>;
  training: ReturnType<typeof useTrainingCatalog>;
}) {
  if (resume.isPending) {
    /* The list-row-shaped skeleton — same footprint as the loaded row,
       so the ledger above and the stat line below never shift when the
       payload lands. */
    return (
      <section className="momentum dash-resume-pending" aria-busy="true">
        <Skeleton width="56px" height="56px" rounded="var(--r-full)" />
        <div className="momentum-info" style={{ flex: 1 }}>
          <Skeleton width="38%" height="14" />
          <Skeleton width="72%" height="11" />
        </div>
      </section>
    );
  }
  /* r157 (W2-F7): honest error branch — a failed /me/resume used to
   * render NOTHING here (the `!r` return swallowed the query error),
   * so the dashboard's PRIMARY action silently vanished on a network
   * blip. Same grammar as the player's completion-report retry. */
  if (resume.isError) {
    return (
      <div className="ledger-row ledger-row-flat dash-resume-error" role="alert">
        <span className="ledger-lead"><b>تابع</b>—</span>
        <span className="ledger-what">
          تعذّر تحميل بطاقة «أكمل من حيث توقفت» —{' '}
          <Link to="/student/courses">اذهب إلى مقرّراتك</Link>
        </span>
        <span className="ledger-tail">
          <button type="button" className="btn sm" onClick={() => resume.refetch()}>
            إعادة المحاولة
          </button>
        </span>
      </div>
    );
  }
  const r = resume.data;
  if (!r) {
    // r164-c — lecture half empty: the training arm.
    const t = training.data ? pickTrainingResume(training.data) : null;
    if (!t) return null;
    return (
      <LedgerRow
        to={`/training/${t.slug}`}
        lead={<span className="dash-resume-ring"><ProgressRing size={56} thickness={5} value={t.started ? t.progressPct : 0} ariaLabel={t.started ? `تقدّم المسار التدريبي: ${t.progressPct}%` : 'مسار لم يبدأ بعد'} center={null} /></span>}
        leadLabel={t.started ? 'تابع' : 'ابدأ'}
        title={t.title}
        subtitle={t.started
          ? `مسار التطوير الذاتي · أنجزت ${t.progressPct}% من دروسه — أكمل الدرس التالي.`
          : 'مسار التطوير الذاتي · سجّلت فيه ولم تبدأه بعد — ابدأ من الدرس الأول.'}
        tail={<span className="btn primary sm dash-row-chip"><Icon icon={Play} size={13} />{t.started ? 'متابعة' : 'ابدأ'}</span>}
      />
    );
  }
  const continuing = r.mode === 'continue';
  const ringPct = continuing ? r.progressPct : 0;
  return (
    <LedgerRow
      to={`/student/lectures/${r.lecture.id}`}
      lead={<span className="dash-resume-ring"><ProgressRing size={56} thickness={5} value={ringPct} ariaLabel={continuing ? `تقدّم مشاهدة المحاضرة المتوقّفة: ${r.progressPct}%` : 'المحاضرة الأولى لم تُشاهد بعد'} center={null} /></span>}
      leadLabel={continuing ? 'تابع' : 'ابدأ'}
      title={<>أكمل من حيث توقفت: {r.lecture.course.name} · المحاضرة <bdi>{r.lecture.ordinal}</bdi></>}
      subtitle={<><bdi className="font-mono">{r.lecture.course.code}</bdi> · {r.lecture.title} · {ringPct}% من المحاضرة</>}
      tail={<span className="btn primary sm dash-row-chip"><Icon icon={Play} size={13} />{continuing ? 'متابعة' : 'ابدأ'}</span>}
    />
  );
}

/* The TODAY ledger row grammar — one row per commitment, bold kind
 * label in the mono lead + content + honest status pill. The row is
 * the link (PP-X2 P1-8); the time detail rides the subtitle. */
function TodayRow({ item }: { item: AgendaItem }) {
  return (
    <LedgerRow
      to={item.to}
      leadLabel={
        item.kind === 'class' ? 'محاضرة' :
        item.kind === 'live' ? 'بثّ مباشر' :
        item.kind === 'exam' ? 'اختبار' : 'تسليم'
      }
      title={item.title}
      subtitle={item.meta}
      tail={item.tone === 'red' ? <Badge color="red">عاجل</Badge> : item.tone === 'accent' ? <Badge>اليوم</Badge> : <Badge color="gold">قادم</Badge>}
    />
  );
}

/* The recommended-gap row — priority concept + direct remediation. */
function GapRow({ g }: {
  g: { conceptId: string; conceptName: string; courseName: string; level: number; recommendedLectureId?: string | null };
}) {
  const pct = formatInt(Math.round(g.level * 100));
  return (
    <LedgerRow
      to={g.recommendedLectureId ? `/student/lectures/${g.recommendedLectureId}` : undefined}
      lead={<span className="font-mono">{pct}%</span>}
      leadLabel="فجوة"
      title={g.conceptName}
      subtitle={g.courseName}
      tail={g.recommendedLectureId
        ? <span className="btn outline sm dash-row-chip"><Icon icon={Play} size={13} />سدّ الفجوة</span>
        : <Badge>لا توصية بعد</Badge>}
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
  // r220: the recommended gaps join the TodayList (سدّ الفجوة direct).
  const gaps = useGaps();

  if (dash.isPending) {
    /* r220 loading mirror — the resolved page leads with the masthead,
       the TODAY ledger (its first slot = the resume row), the gaps
       ledger, the stat line, then the week ledger. Every slot renders
       the resolved section's class + approximate footprint, so the
       pending → resolved handoff moves nothing (the r172b loading-
       closure contract, re-mirrored for the TodayList anatomy). */
    return (
      <div className="page student-dashboard" aria-busy="true" aria-live="polite">
        <header className="page-header">
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">جارٍ تحضير لوحتك…</p>
        </header>
        <section className="momentum dash-resume-pending" aria-busy="true">
          <Skeleton width="56px" height="56px" rounded="var(--r-full)" />
          <div className="momentum-info" style={{ flex: 1 }}>
            <Skeleton width="38%" height="14" />
            <Skeleton width="72%" height="11" />
          </div>
        </section>
        <ListSkeleton rows={4} />
        <div className="stat-strip" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat-cell">
              <Skeleton width={70} height={11} />
              <Skeleton width={56} height={28} />
            </div>
          ))}
        </div>
        <ListSkeleton rows={3} />
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="page student-dashboard">
        <header className="page-header">
          <h1 className="page-title">لوحة التحكم</h1>
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
        <header className="page-header">
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">
            معاينة لوحة الطالب — يحتاج هذا العرض إلى ملف طالب فعليّ.
          </p>
        </header>
        <div className="card">
          <EmptyState
            icon={Eye}
            title="عرض معاينة"
            description={`لوحة التحكّم هذه مخصّصة للطلّاب. أنت مسجَّل دخول كحساب ${
              user?.role === 'OWNER' ? 'مالك المنصّة' : 'إداريّ'
            }، لذلك تظهر لك صفحة معاينة فارغة. للاطّلاع على لوحة طالب حقيقيّة، استخدم حساب طالب مسجَّل أو زر صفحة كلّيّة من قائمة الكلّيّات.`}
          />
        </div>
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

  return (
    <div className="page student-dashboard">
      {/* The masthead — the route's identity + the day's facts (meta is
          DATA: the date + the term's real progress). */}
      <header className="page-header">
        <h1 className="page-title">لوحة التحكم</h1>
        <p className="page-subtitle">
          {greeting}، {user?.firstName ?? ''} — {d.profile.facultyName
            ? `${d.profile.facultyName}${d.profile.departmentName ? ` · ${d.profile.departmentName}` : ''} · السنة ${d.profile.year}`
            : 'لوحة متابعة تقدّمك الأكاديمي.'}
        </p>
        <p className="page-header-meta">
          {dateLine} · {termPct}% من الفصل مضى · يبدأ {formatDate(d.term.startsAt, { day: '2-digit', month: '2-digit' })} وينتهي {formatDate(d.term.endsAt, { day: '2-digit', month: '2-digit' })}
        </p>
      </header>

      {/* اليوم — the ONE TodayList: continue-learning pinned first,
          then today's commitments, then every still-actable exam. */}
      <LedgerPanel
        title="اليوم"
        tag={countAr(today.length + exams.length + 1, ['التزام واحد', 'التزامان', 'التزامات', 'التزامًا'])}
        zone={(today.some((it) => it.tone === 'red') || exams.length > 0) ? 'rose' : undefined}
        ariaLabel="قائمة اليوم"
      >
        <ResumeRow resume={resume} training={trainingCatalog} />
        {today.map((item) => <TodayRow key={item.id} item={item} />)}
        {today.length === 0 && exams.length === 0 && (
          <div className="ledger-row ledger-row-flat">
            <span className="ledger-lead"><b>اليوم</b>راحة</span>
            <span className="ledger-what">
              لا حصص أو مهام اليوم — تعلّمك ينتظرك في أول صف، وأسبوعك القادم أدناه.
            </span>
            <Badge color="green">يوم مفتوح</Badge>
          </div>
        )}
        {exams.length > 0 && (
          <div className="ledger-group-label" role="presentation">اختبارات قادمة</div>
        )}
        {exams.map((item) => <TodayRow key={item.id} item={item} />)}
      </LedgerPanel>

      {/* فجواتك — the recommended gaps with one-click remediation.
          Honest states: pending → row skeletons; error → quiet retry
          row; empty → one calm line (no celebration banner). */}
      <LedgerPanel
        title="فجوات يُنصح بسدّها"
        zone="copper"
        actions={<Link to="/student/matrix" className="btn ghost sm">المصفوفة الكاملة</Link>}
        tag={gaps.data?.length ? formatInt(gaps.data.length) : undefined}
        ariaLabel="فجوات الإتقان الموصى بها"
      >
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
          topGaps.map((g) => <GapRow key={g.conceptId} g={g} />)
        )}
      </LedgerPanel>

      {/* The typographic stat line — real values, compact (r220: the
          momentum line, no icon boxes). Trend notes carry the nearest
          deadline / cohort rank (data, not decoration). */}
      <StatStrip
        ariaLabel="ملخص الأداء الأكاديمي"
        cells={[
          {
            label: 'المعدل التراكمي',
            value: formatNum(d.profile.gpa, { maximumFractionDigits: 2 }), /* r197 §7: no forced trailing zero («3.40» → «3.4») */
            trend: tone.label,
            trendTone: tone.trend,
          },
          {
            label: 'نسبة الحضور',
            value: d.kpi.attendancePct !== null ? <CountIn value={d.kpi.attendancePct} suffix="%" /> : '—',
            trend: d.kpi.attendancePct !== null
              ? d.kpi.attendancePct >= 80 ? 'مطمئن هذا الفصل' : d.kpi.attendancePct >= 60 ? 'قريب من الحد' : 'تحت الحد — راجع حضورك'
              : 'لا توجد سجلات بعد',
            trendTone: d.kpi.attendancePct === null ? 'flat' : d.kpi.attendancePct >= 80 ? 'up' : d.kpi.attendancePct >= 60 ? 'flat' : 'down',
          },
          {
            label: 'مهام معلّقة',
            value: <CountIn value={d.kpi.pendingAssignmentsCount} />,
            trend: d.agenda.assignments[0] ? `أقربها ${formatDue(d.agenda.assignments[0].dueAt)}` : 'لا مهام قريبة',
            trendTone: d.kpi.pendingAssignmentsCount === 0 ? 'up' : 'flat',
          },
          {
            label: 'نقاط الإنجاز',
            value: <CountIn value={d.kpi.totalXp} />,
            trend: d.kpi.cohortSize > 1
              ? <>المركز <bdi>{d.kpi.rank}</bdi> من <bdi>{d.kpi.cohortSize}</bdi> على دفعتك</>
              : `مستوى ${d.profile.level}`,
            trendTone: 'flat',
          },
          {
            label: 'إنجاز المقرّرات',
            value: d.kpi.courseCount > 0 ? <CountIn value={courseProgressPct} suffix="%" /> : '—',
            trend: d.kpi.courseCount > 0
              ? `${countAr(d.kpi.courseCount, ['مقرّر نشط واحد', 'مقرّران نشطان', 'مقرّرات نشطة', 'مقررًا نشطًا'])} · ${
                  courseProgressPct >= 75 ? 'متقدّم كثيراً عن المطلوب'
                  : courseProgressPct >= 50 ? 'على الطريق الصحيح'
                  : courseProgressPct === 0 ? 'ابدأ أول محاضرة لتتقدّم'
                  : 'تحتاج إلى دفعة إضافيّة'}`
              : 'لم تُسجّل في مقرّر بعد',
            trendTone: d.kpi.courseCount === 0 ? 'flat' : courseProgressPct >= 75 ? 'up' : courseProgressPct === 0 ? 'down' : 'flat',
          },
        ]}
      />

      {/* الأسبوع — the non-exam remainder grouped by real day. */}
      {later.length > 0 && (
        <LedgerPanel
          title="أسبوعك القادم"
          zone="sky"
          tag={countAr(later.length, ['التزام واحد', 'التزامان', 'التزامات', 'التزامًا'])}
          ariaLabel="التزامات الأسبوع القادم"
          actions={<Link to="/student/calendar" className="btn ghost sm">التقويم الكامل</Link>}
        >
          {weekGroups.map((g) => (
            <WeekRow key={g.key} day={g.day} date={g.date}>
              <div className="week-rows">
                {g.items.map((item) => (
                  <Link key={item.id} to={item.to} className="week-item">
                    <span className="week-item-title">{item.title}</span>
                    <span className="week-item-meta">{item.meta}</span>
                    {item.kind === 'live' ? <Badge color="red">مباشر</Badge> :
                      item.kind === 'exam' ? <Badge color="brand">اختبار</Badge> :
                      <Badge color="gold">تسليم</Badge>}
                  </Link>
                ))}
              </div>
            </WeekRow>
          ))}
        </LedgerPanel>
      )}
    </div>
  );
}
