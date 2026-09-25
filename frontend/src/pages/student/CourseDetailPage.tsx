import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Play, FileText, ClipboardList, Calendar, Users,
  Clock, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { Card, Badge, ProgressBar, MetricCard } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton, KpiSkeleton, ListSkeleton } from '../../components/primitives/States';
import { Reveal, RevealGroup, useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useOfferingFull } from '../../hooks/useResources';
import { countAr, formatDateAr, WEEKDAY_NAMES_AR } from '../../lib/format';
import { courseIcon, courseTint, ASSIGNMENT_KIND_LABEL, MATERIAL_TYPE_LABEL, type AssignmentKind } from '../../lib/courseMeta';

/* courseIcon + DEFAULT_COURSE_TINT (via courseTint) + the assignment-kind
 * labels live in lib/courseMeta.ts; countAr, formatDateAr + WEEKDAY_NAMES_AR
 * live in lib/format.ts (waves 9-a / 13-15). */


function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  return `${m}د`;
}

/* fmtDate (short ar-LY date) is lib/format.formatDateAr (13-15 fold).
 * The weekday names + assignment-kind labels are imported above. */
/** Reads a --motion-duration-* token (ms) so JS-driven animation timing
 *  stays on the design scale — guardrail #1 applies to TSX too. */
function motionTokenMs(name: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Curriculum progress count-up (the authored moment of this page).
 *  Instant when prefers-reduced-motion is set (guardrail #6). */
function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    const duration = motionTokenMs('--motion-duration-stat', 700);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // exponential ease-out — the JS counterpart of --motion-ease-decelerate
      setValue(Math.round((1 - Math.pow(2, -10 * t)) * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced]);

  return value;
}

export default function CourseDetailPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const { data, isPending, isError, error, refetch } = useOfferingFull(offeringId);

  // Derived BEFORE the early returns so the count-up hook (useState /
  // useEffect / useReducedMotion inside) keeps a stable order across the
  // pending → data transition (the LabsPage audit P2 crash pattern).
  const watchedCount = data?.lectures.filter((l) => l.watchEvents?.[0]?.completed).length ?? 0;
  const lecProgress = data?.lectures.length
    ? Math.round((watchedCount / data.lectures.length) * 100)
    : 0;
  const progressValue = useCountUp(lecProgress);

  if (isPending) {
    return (
      <div className="page">
        <Skeleton width={140} height={32} rounded="var(--r-md)" />
        <Card><div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
          <Skeleton width={64} height={64} rounded="var(--r-lg)" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <Skeleton width={80} height={14} />
            <Skeleton width="60%" height={24} />
            <Skeleton width="40%" height={12} />
          </div>
        </div></Card>
        <KpiSkeleton />
        <Card><ListSkeleton rows={3} /></Card>
      </div>
    );
  }
  if (isError || !data) {
    // Page chrome + way back (audit 0-d P2 — the bare ErrorState had
    // no .page wrapper and no route back to the courses list).
    return (
      <div className="page">
        <Link to="/student/courses" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
          <Icon icon={ChevronRight} size={13} />
          العودة إلى مقرراتي
        </Link>
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const Cmp = courseIcon(data.course.code ?? data.course.name);
  // Course-level identity tint from the API. It is NOT a college accent
  // (the gateCollegeAccent machinery governs college-identity surfaces
  // only) — contrast is guaranteed by construction: the tint is consumed
  // exclusively as color-mix washes over var(--surface) with --text ink.
  const tint = courseTint(data.course.themeColor);

  return (
    <div className="page course-page" style={{ '--course-tint': tint } as CSSProperties}>
      {/* Hero header — .course-hero (§lists) carries the tinted band.
          The raw hex only ever rides the --course-tint custom property
          (set here at the page root so the lecture wells inherit it too). */}
      <div className="course-hero">
        <Link to="/student/courses" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
          {/* ChevronRight = the RTL back direction (matches LecturePlayerPage) */}
          <Icon icon={ChevronRight} size={13} />
          مقرّراتي الدراسية
        </Link>
        <div className="course-hero-row">
          <div className="course-hero-icon" aria-hidden>
            <Icon icon={Cmp} size={28} />
          </div>
          <div className="course-hero-main">
            <div className="course-hero-badges">
              <Badge><bdi className="font-mono">{data.course.code}</bdi></Badge>
              <span className="text-xs text-subtle">·</span>
              <span className="text-xs text-subtle">{data.course.department.name}</span>
            </div>
            <h1 className="course-hero-title">{data.course.name}</h1>
            <div className="course-hero-sub">
              د. {data.teacher.firstName} {data.teacher.lastName} ·{' '}
              {countAr(data.course.credits, ['ساعة معتمدة واحدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة'])} ·{' '}
              الفصل <bdi>{data.term}</bdi>
            </div>
          </div>
          {/* Curriculum progress — count-up + tabular readout */}
          <div className="course-hero-progress">
            <div className="course-hero-progress-head">
              <span className="course-hero-progress-label">تقدّمك في المنهج</span>
              <span className="course-hero-progress-value">{progressValue}%</span>
            </div>
            <ProgressBar value={lecProgress} color={tint} showValue={false} ariaLabel="نسبة إكمال محاضرات المقرر" />
            <div className="course-hero-progress-note">
              {countAr(watchedCount, ['محاضرة مكتملة', 'محاضرتان مكتملتان', 'محاضرات مكتملة', 'محاضرة مكتملة'])} من {data.lectures.length}
            </div>
          </div>
        </div>
      </div>

      {/* Course KPIs — the shared MetricCard primitive (was a local KPI
          copy, audit 0-d P3). */}
      <div className="grid-4">
        <MetricCard
          icon={Play}
          label="المحاضرات"
          value={data.lectures.length}
          change={countAr(watchedCount, ['واحدة مكتملة', 'مكتملتان', 'مكتملة', 'مكتملة'])}
        />
        <MetricCard
          icon={FileText}
          label="المواد المرفقة"
          value={data.materials.length}
          change={countAr(data.materials.length, ['ملف واحد متاح', 'ملفان متاحان', 'ملفات متاحة', 'ملفاً متاحاً'])}
        />
        <MetricCard
          icon={ClipboardList}
          label="الواجبات"
          value={data.assignments.length}
          change="هذا الفصل"
        />
        <MetricCard
          icon={Users}
          label="الطلاب"
          value={data._count.enrollments}
          change={countAr(data._count.enrollments, ['طالب واحد مسجَّل', 'طالبان مسجَّلان', 'طلاب مسجَّلون', 'طالباً مسجَّلاً'])}
        />
      </div>

      {/* Lectures — the curriculum; rows reveal with a capped stagger
          (Reveal/RevealGroup primitives, reduced-motion aware). */}
      <Card title="المحاضرات" icon={Play} className="course-lectures" subtitle={`أكملت ${watchedCount} من ${countAr(data.lectures.length, ['محاضرة واحدة', 'محاضرتين', 'محاضرات', 'محاضرة'])}`}>
        {!data.lectures.length ? (
          <EmptyState
            icon={Play}
            title="لم تُرفع محاضرات بعد"
            description="سيقوم الأستاذ بإضافة المحاضرات تباعاً مع تقدّم الفصل."
          />
        ) : (
          <RevealGroup className="flex-col gap-2">
            {data.lectures.map((lec) => {
              const we = lec.watchEvents?.[0];
              const watchedPct = we && we.totalSec > 0 ? Math.round((we.watchedSec / we.totalSec) * 100) : 0;
              const completed = we?.completed ?? false;
              return (
                <Reveal key={lec.id}>
                  <Link
                    to={`/student/lectures/${lec.id}`}
                    className="list-row"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className={completed ? 'course-lec-well done' : 'course-lec-well'} aria-hidden>
                      <Icon icon={completed ? CheckCircle2 : Play} size={16} />
                    </div>
                    <div className="list-row-body">
                      <div className="list-row-title">
                        <span className="text-xxs text-subtle" style={{ marginInlineEnd: 6 }}>
                          المحاضرة <bdi className="font-mono">{String(lec.ordinal).padStart(2, '0')}</bdi>
                        </span>
                        {lec.title}
                      </div>
                      <div className="list-row-sub flex gap-3" style={{ flexWrap: 'wrap' }}>
                        <span className="flex items-center gap-1">
                          <Icon icon={Clock} size={11} /> <bdi className="font-mono">{fmtDuration(lec.durationSec)}</bdi>
                        </span>
                        <span>·</span>
                        <span>{countAr(lec._count.chapters, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])}</span>
                        <span>·</span>
                        <span>{countAr(lec._count.checkpoints, ['نقطة تفاعل واحدة', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])}</span>
                      </div>
                      {watchedPct > 0 && watchedPct < 100 && (
                        <div style={{ marginTop: 6, maxWidth: 240 }}>
                          <ProgressBar value={watchedPct} color={tint} showValue={false} />
                        </div>
                      )}
                    </div>
                    {completed && <Badge color="green">مكتملة</Badge>}
                    {!completed && watchedPct > 0 && <Badge color="brand">{watchedPct}%</Badge>}
                  </Link>
                </Reveal>
              );
            })}
          </RevealGroup>
        )}
      </Card>

      {/* Materials + Assignments + Schedule */}
      <div className="grid-2-1">
        <Card title="المواد المرفقة" icon={FileText}>
          {!data.materials.length ? (
            <EmptyState
              icon={FileText}
              title="الأستاذ لم يرفع مواد بعد"
              description="ستظهر هنا الملفات والمراجع فور رفعها — العروض التقديمية، أوراق العمل، والقراءات."
            />
          ) : (
            <div className="flex-col gap-2">
              {data.materials.map((m) => {
                const label = MATERIAL_TYPE_LABEL[m.type as keyof typeof MATERIAL_TYPE_LABEL] ?? m.type;
                return (
                  <div key={m.id} className="list-row">
                    <Icon icon={FileText} size={16} className="text-muted" />
                    <div className="list-row-body">
                      <div className="list-row-title" title={m.name}>{m.name}</div>
                      <div className="list-row-sub"><bdi>{label}</bdi> · {formatDateAr(m.createdAt)}</div>
                    </div>
                    <Badge><bdi>{label}</bdi></Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="الجدول الأسبوعي" icon={Calendar}>
          {!data.schedule.length ? (
            <EmptyState
              icon={Calendar}
              title="لم يُنشَر جدول هذا المقرّر بعد"
              description="سيظهر هنا فور تثبيت مواعيد المحاضرات الأسبوعيّة."
            />
          ) : (
            <div className="flex-col gap-2">
              {data.schedule.map((s) => (
                <div key={s.id} className="list-row">
                  <span className="list-row-meta"><bdi className="font-mono">{s.startTime}–{s.endTime}</bdi></span>
                  <div className="list-row-body">
                    <div className="list-row-title">{WEEKDAY_NAMES_AR[s.dayOfWeek] ?? '—'}</div>
                    <div className="list-row-sub">{s.room ?? 'قاعة تُحدَّد لاحقاً'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="الواجبات" icon={ClipboardList}>
        {!data.assignments.length ? (
          <EmptyState
            icon={ClipboardList}
            title="لا توجد واجبات نشطة"
            description="حالياً لا شيء بانتظارك في هذا المقرر. وقت جيد لمراجعة المحاضرات السابقة."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr><th>العنوان</th><th>النوع</th><th>الموعد النهائي</th><th>الوزن</th></tr>
              </thead>
              <tbody>
                {data.assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="tbl-strong" data-label="العنوان">{a.title}</td>
                    <td data-label="النوع">{ASSIGNMENT_KIND_LABEL[a.type as AssignmentKind] ?? a.type}</td>
                    <td className="tbl-num" data-label="الموعد النهائي">{formatDateAr(a.dueAt)}</td>
                    <td className="tbl-num" data-label="الوزن">{a.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
