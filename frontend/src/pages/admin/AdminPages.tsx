import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, GraduationCap, School, BookOpen,
  BarChart3, FileText, Users, TrendingUp,
  Award, Microscope, ClipboardCheck,
  AlertTriangle, Database, Search, X,
  ChevronLeft, ChevronRight, ChevronDown, ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, Tabs, UserAvatar } from '../../components/primitives';
import {
  EmptyState, ErrorState, PageSkeleton,
  KpiSkeleton, CardSkeleton, TableSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useReducedMotion } from '../../components/motion';
import {
  useAdminStats, useAdminFaculties, useAdminReports, useAdminCourses, useAdminPapers,
  useFaculties,
  RESEARCH_STATUSES,
  type ResearchStatus, type AdminPaper, type AdminFaculty,
} from '../../hooks/useResources';
import { pageList } from './AdminGovernancePages';
import { api, unwrap } from '../../lib/api';
import { countAr, formatRelativeArShort } from '../../lib/format';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { cartesianOptions, valueLabels, chartColors, useChartThemeKey } from '../../lib/chartTheme';
// 5-B4: the admin roster chrome lives in colleges.css since "Sub-project D"
// (its ownership banner) — the students-toolbar/pagination/trend-table
// families the courses page + papers register now consume too.
import '../../styles/colleges.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip);

/* ════════════════════════════════════════════════════════════════
   Shared helpers
   ════════════════════════════════════════════════════════════════ */

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </header>
  );
}

/** Quick-stat row — 5-B4 (5-A8 P1-3/§5 row 6): optionally navigable.
 *  The whole row is the target; the arrow names the direction (RTL
 *  forward = ArrowLeft). */
function Stat({
  label, value, to, hint,
}: { label: string; value: string; to?: string; hint?: string }) {
  if (to !== undefined) {
    return (
      <Link to={to} className="admin-stat-row" title={hint} style={{ textDecoration: 'none' }}>
        <span className="text-sm text-muted">{label}</span>
        <span
          className="text-sm admin-stat-value"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
        >
          {value}
          <Icon icon={ArrowLeft} size={13} style={{ color: 'var(--accent-ink, var(--accent))' }} />
        </span>
      </Link>
    );
  }
  return (
    <div className="admin-stat-row">
      <span className="text-sm text-muted">{label}</span>
      {/* A8 P3-3: no font-mono — the value is often a full Arabic faculty
          name («أكبر كلّيّة»); mono only ever wraps codes/emails/numbers
          (digits keep tabular-nums via tokens). */}
      <span className="text-sm admin-stat-value">{value}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Action strip (5-A8 §6 step 1 — «يحتاج انتباهك»)
   ════════════════════════════════════════════════════════════════ */

interface ActionRow {
  key: string;
  tone: 'amber' | 'brand';
  icon: LucideIcon;
  title: string;
  desc: string;
  to: string;
  hint: string;
}

const ACTION_TONE_INK: Record<ActionRow['tone'], string> = {
  amber: 'var(--warning-ink)',
  brand: 'var(--accent-ink, var(--accent))',
};

/**
 * The dashboard's "what needs a decision" list. Every row is built from
 * a count the ADMIN role can actually fetch — the audit's original
 * sketch named moderation-queue and dean-less-faculties rows too, but
 * RBAC gates /exams/moderation-queue and /quality/courses behind
 * QUALITY_VIEW/EXAMS_MODERATE (admins hold neither) and the faculties
 * payload carries no dean field, so those rows land elsewhere (see the
 * 5-B4 worklog). Rows appear only when their count > 0 — a healthy
 * university sees no strip, not a wall of zeros.
 */
function ActionStrip() {
  // Zero-content courses: within the first 100 (the /admin/courses
  // limit ceiling). The row's copy names the window when it binds.
  const courses = useAdminCourses({ limit: 100 });
  const sync = useQuery({
    // Separate key from the sync page's polled ['admin','sync'] — this
    // summary must never inherit the 30s background poll.
    queryKey: ['admin', 'sync', 'summary'],
    queryFn: () => unwrap<{ staleCount: number }>(api.get('/admin/sync')),
    staleTime: 60_000,
  });
  // limit:1 — the register only needs meta.total for the count.
  const gradedPapers = useAdminPapers({ status: 'GRADED', limit: 1 });

  const rows: ActionRow[] = [];
  if (courses.data && courses.data.data.length > 0) {
    const zeroContent = courses.data.data
      .filter((c) => c.totalLectures === 0 && c.totalMaterials === 0);
    const capped = courses.data.meta.total > courses.data.data.length;
    if (zeroContent.length > 0) {
      rows.push({
        key: 'zero-content',
        tone: 'amber',
        icon: BookOpen,
        title: 'مقرّرات بلا محتوى تعليميّ',
        desc: `${countAr(zeroContent.length, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])} لم تُرفع لها محاضرات أو ملفات بعد${capped ? ' (ضمن أول 100 مقرّر)' : ''}`,
        to: '/admin/courses',
        hint: 'فتح إدارة المقرّرات',
      });
    }
  }
  if (sync.data && sync.data.staleCount > 0) {
    rows.push({
      key: 'stale-sync',
      tone: 'amber',
      icon: Database,
      title: 'حقول بيانات جامعية قديمة',
      desc: `${countAr(sync.data.staleCount, ['حقل واحد', 'حقلان', 'حقول', 'حقلاً'])} يحتاج مزامنة جديدة مع المصدر الرسميّ`,
      to: '/admin/sync',
      hint: 'فتح صفحة المزامنة',
    });
  }
  if (gradedPapers.data && gradedPapers.data.meta.total > 0) {
    rows.push({
      key: 'graded-papers',
      tone: 'brand',
      icon: FileText,
      title: 'بحوث مقيَّمة بانتظار النشر',
      desc: `${countAr(gradedPapers.data.meta.total, ['بحث واحد', 'بحثان', 'بحوث', 'بحثاً'])} جاهزة للنشر في مكتبة الجامعة`,
      to: '/admin/reports?status=GRADED',
      hint: 'فتح سجلّ البحوث',
    });
  }

  if (rows.length === 0) return null;
  return (
    <Card
      title="يحتاج انتباهك"
      icon={AlertTriangle}
      subtitle={countAr(rows.length, ['بند واحد', 'بندان', 'بنود', 'بنداً'])}
    >
      <div className="flex-col gap-2">
        {rows.map((r) => (
          <Link
            key={r.key}
            to={r.to}
            className={`alert ${r.tone}`}
            title={r.hint}
            style={{ textDecoration: 'none' }}
          >
            <span style={{ color: ACTION_TONE_INK[r.tone], marginTop: 2 }}>
              <Icon icon={r.icon} size={16} />
            </span>
            <div className="alert-body">
              <div className="alert-title">{r.title}</div>
              <div className="alert-desc">{r.desc}</div>
            </div>
            <Icon icon={ArrowLeft} size={14} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════
   Admin: Dashboard
   ════════════════════════════════════════════════════════════════ */
export function AdminDashboardPage() {
  const stats = useAdminStats();
  const facs = useAdminFaculties();
  const reports = useAdminReports();
  const navigate = useNavigate();
  const c = chartColors();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

  if (stats.isPending || facs.isPending || reports.isPending) return <PageSkeleton />;
  if (stats.isError || facs.isError || reports.isError) {
    return (
      <ErrorState
        error={stats.error ?? facs.error ?? reports.error}
        onRetry={() => { stats.refetch(); facs.refetch(); reports.refetch(); }}
      />
    );
  }
  const s = stats.data!;
  const f = facs.data!;
  const r = reports.data!;

  // Real top-8 by student count.
  const topByStudents = [...f]
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 8)
    .filter((x) => x.studentCount > 0 || f.length <= 8);

  // Distinct cities — replaces the "9 cities" placeholder.
  const cityCount = new Set(f.map((x) => x.city)).size;
  const facultyCount = f.length;

  // Highest-density faculty for "مؤشرات سريعة".
  const topFaculty = topByStudents[0];
  const topByCourses = [...f].sort((a, b) => b.courseCount - a.courseCount)[0];
  const studentTeacherRatio = s.totalTeachers > 0
    ? Math.round((s.totalStudents / s.totalTeachers) * 10) / 10
    : null;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الإدارة</h1>
          <p className="page-subtitle">إحصائيات حيّة عن طلاب وأساتذة جامعة الزاوية.</p>
        </div>
      </header>

      {/* 5-A8 §6 step 1: the action list sits above the KPI row — the
          dashboard answers "what needs me" before "how big are we". */}
      <ActionStrip />

      {/* 5-A8 §6 step 3 / P1-3: every KPI answers its follow-up question
          in one click (§5 rows 1-4 — all FE-only, all pre-existing routes). */}
      <div className="grid-4">
        <MetricCard
          icon={Building2}
          label="الكلّيّات"
          value={facultyCount.toLocaleString('ar-LY')}
          change={`موزّعة على ${countAr(cityCount, ['مدينة واحدة', 'مدينتين', 'مدن', 'مدينة'])}`}
          color="brand"
          to="/admin/faculties"
          actionHint="عرض الكلّيّات وأقسامها"
        />
        <MetricCard
          icon={GraduationCap}
          label="الطلاب"
          value={s.totalStudents.toLocaleString('ar-LY')}
          change="مسجَّل في النظام"
          color="green"
          to="/admin/students"
          actionHint="عرض قائمة الطلاب"
        />
        <MetricCard
          icon={School}
          label="هيئة التدريس"
          value={s.totalTeachers.toLocaleString('ar-LY')}
          change="عضو"
          color="amber"
          to="/admin/teachers"
          actionHint="عرض إدارة الأساتذة"
        />
        <MetricCard
          icon={BookOpen}
          label="المقرّرات"
          value={s.totalCourses.toLocaleString('ar-LY')}
          change={countAr(s.totalEnrollments, ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً'])}
          color="purple"
          to="/admin/courses"
          actionHint="عرض إدارة المقرّرات"
        />
      </div>

      {/* 5-A8 §6 step 6 (rhythm): the charts row is the page's breathing
          section — 88px above it vs the KPI strip's 40px (taste.md:
          rhythm = contrast between tight and generous, never uniform). */}
      <div className="grid-2-1" style={{ marginBlockStart: 'var(--sp-9)' }}>
        <Card
          title="توزّع الطلاب حسب الكلّيّة"
          icon={BarChart3}
          subtitle={topByStudents.length > 1
            ? `أعلى ${countAr(topByStudents.length, ['كلّيّة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} عدداً · انقر عموداً لعرض طلابها`
            : undefined}
        >
          {/* 5-A8 §6 step 5 (chart honesty): a single bar in a chart box
              carries no distribution signal — degrade to the stat + its
              drill link instead of the lonely-bar form. */}
          {topByStudents.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="لا توجد بيانات طلاب بعد"
              description="ستظهر التوزيعة هنا فور تسجيل الطلاب في الكلّيّات."
            />
          ) : topByStudents.length === 1 && topFaculty ? (
            <div className="flex-col gap-3">
              <p className="text-sm text-muted">
                كلّيّة واحدة فقط لديها طلاب مسجَّلون حالياً؛ يظهر المخطط التفصيليّ عند تعدُّد الكلّيّات.
              </p>
              <Stat
                label="أعلى كلّيّة عدداً للطلاب"
                value={`${topFaculty.name} (${countAr(topFaculty.studentCount, ['طالب واحد', 'طالبين', 'طلاب', 'طالباً'])})`}
              />
              <Link
                to={`/admin/students?facultyId=${topFaculty.id}`}
                className="btn ghost sm"
                style={{ alignSelf: 'flex-start' }}
              >
                <Icon icon={ArrowLeft} size={13} />
                عرض طلاب الكلّيّة
              </Link>
            </div>
          ) : (
            <ChartFrame
              ariaLabel={`توزيع الطلاب حسب الكلّيّة — أعلى ${countAr(topByStudents.length, ['كلّيّة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} عددًا`}
              summary={topFaculty ? `أعلى كلّيّة عددًا للطلاب: ${topFaculty.name} بـ${countAr(topFaculty.studentCount, ['طالب واحد', 'طالبين', 'طلاب', 'طالباً'])}.` : undefined}
              height={Math.max(180, topByStudents.length * 36)}
              table={{
                caption: 'توزيع الطلاب حسب الكلّيّة',
                columns: ['الكلّيّة', 'عدد الطلاب'],
                rows: topByStudents.map((row) => [row.name, row.studentCount]),
              }}
            >
              <Bar
                key={themeKey}
                aria-hidden="true"
                data={{
                  labels: topByStudents.map((row) => row.name),
                  datasets: [{
                    label: 'عدد الطلاب',
                    data: topByStudents.map((row) => row.studentCount),
                    backgroundColor: `color-mix(in srgb, ${c.accent} 55%, transparent)`,
                    borderColor: c.accent,
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 22,
                  }],
                }}
                plugins={[valueLabels]}
                options={{
                  ...cartesianOptions({ horizontal: true }),
                  indexAxis: 'y' as const,
                  // 5-A8 §5 row 5: a bar is a question — "who are this
                  // faculty's students?" The answer lands pre-filtered.
                  onClick: (_e, elements) => {
                    const el = elements[0];
                    const fac = el ? topByStudents[el.index] : undefined;
                    if (fac) navigate(`/admin/students?facultyId=${fac.id}`);
                  },
                }}
              />
            </ChartFrame>
          )}
        </Card>

        <Card title="مؤشرات سريعة" icon={TrendingUp}>
          <div className="flex-col gap-2">
            {/* 5-A8 §5 row 6 + P3-2: the rows navigate where a route
                answers them; the papers PAIR collapsed into one drill
                stat (the same two numbers lived on three routes). */}
            <Stat
              label="أكبر كلّيّة"
              value={topFaculty ? `${topFaculty.name} (${topFaculty.studentCount.toLocaleString('ar-LY')})` : '—'}
              to={topFaculty ? `/admin/students?facultyId=${topFaculty.id}` : undefined}
              hint="عرض طلاب هذه الكلّيّة"
            />
            <Stat
              label="أعلى عدد مقرّرات"
              value={topByCourses ? `${topByCourses.name} (${topByCourses.courseCount})` : '—'}
              to={topByCourses ? '/admin/faculties' : undefined}
              hint="عرض الكلّيّات والأقسام"
            />
            <Stat
              label="نسبة طالب/أستاذ"
              value={studentTeacherRatio !== null ? `${studentTeacherRatio}` : '—'}
            />
            <Stat
              label="بحوث منشورة"
              value={r.headline.publishedPapers.toLocaleString('ar-LY')}
              to="/admin/reports?status=PUBLISHED"
              hint="فتح سجلّ البحوث المنشورة"
            />
          </div>
        </Card>
      </div>

      <Card title="نشاط الإنتاج العلميّ — آخر 6 أشهر" icon={TrendingUp} subtitle="أبحاث مقدَّمة، مقيَّمة، ومنشورة شهرياً">
        {r.paperTrend.length === 0 || r.paperTrend.every((m) => m.submitted + m.graded + m.published === 0) ? (
          <EmptyState
            icon={TrendingUp}
            title="لا توجد بيانات أبحاث بعد"
            description="ستظهر حركة النشر هنا بعد رفع أول بحث إلى المنصة."
          />
        ) : (
          <ChartFrame
            ariaLabel="نشاط الإنتاج العلمي في الأشهر الستة الأخيرة — أبحاث مقدَّمة ومقيَّمة ومنشورة شهريًا"
            summary="مقارنة حركة البحوث المرفوعة والمقيَّمة والمنشورة على مدى الأشهر الستة الأخيرة."
            height={240}
            table={{
              caption: 'نشاط الإنتاج العلمي شهريًا',
              columns: ['الشهر', 'مقدَّم', 'مقيَّم', 'منشور'],
              rows: r.paperTrend.map((m) => [m.month, m.submitted, m.graded, m.published]),
            }}
          >
            <Line
              key={themeKey}
              aria-hidden="true"
              data={{
                labels: r.paperTrend.map((m) => m.month),
                datasets: [
                  {
                    label: 'مقدَّم',
                    data: r.paperTrend.map((m) => m.submitted),
                    borderColor: c.accent,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.accent,
                  },
                  {
                    label: 'مقيَّم',
                    data: r.paperTrend.map((m) => m.graded),
                    borderColor: c.gold,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.gold,
                  },
                  {
                    label: 'منشور',
                    data: r.paperTrend.map((m) => m.published),
                    borderColor: c.success,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.success,
                  },
                ],
              }}
              options={cartesianOptions({ legend: true, gradientFill: true })}
            />
          </ChartFrame>
        )}
      </Card>
    </div>
  );
}

/* ─── Admin: Faculties ────────────────────────────────────── */

/** A faculty row whose departments collapse behind the header (5-A8
 *  P2-3 — the 3388px monolithic wall becomes a directory). */
function FacultyRow({
  faculty, open, onToggle,
}: {
  faculty: AdminFaculty;
  open: boolean;
  onToggle: () => void;
}) {
  const hasDepts = faculty.departments.length > 0;
  const head = (
    <>
      <span className="admin-faculty-icon">
        <EmojiIcon emoji={faculty.iconEmoji ?? undefined} fallback={Building2} size={22} />
      </span>
      <div className="admin-faculty-body">
        <div className="admin-faculty-titles">
          <span className="admin-faculty-name">{faculty.name}</span>
          {faculty.nameEn && (
            <span className="admin-faculty-name-en font-mono text-xs text-subtle">
              · <bdi>{faculty.nameEn}</bdi>
            </span>
          )}
        </div>
        <div className="admin-faculty-meta">
          {/* A8 P3-3: counted Arabic phrases — mono is a costume
              here (IBM Plex Mono has no Arabic); plain text. */}
          <span>{countAr(faculty.departmentCount, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}</span>
          <span>{countAr(faculty.courseCount, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span>
          <span>{countAr(faculty.studentCount, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span>
          <span>{countAr(faculty.teacherCount, ['عضو هيئة تدريس واحد', 'عضوا هيئة تدريس', 'أعضاء هيئة تدريس', 'عضواً هيئة تدريس'])}</span>
        </div>
      </div>
      {hasDepts && (
        <Icon
          icon={ChevronDown}
          size={16}
          style={{
            color: 'var(--text-muted)',
            marginInlineStart: 'auto',
            flexShrink: 0,
            transition: 'transform var(--t-base) var(--ease)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      )}
    </>
  );
  return (
    <div className="admin-faculty-card">
      {hasDepts ? (
        <button
          type="button"
          className={`admin-faculty-head${open ? ' has-depts' : ''}`}
          aria-expanded={open}
          aria-controls={`faculty-depts-${faculty.id}`}
          onClick={onToggle}
          title={open ? 'طيّ الأقسام' : 'توسيع الأقسام'}
          style={{ width: '100%', textAlign: 'start', padding: 0 }}
        >
          {head}
        </button>
      ) : (
        <div className="admin-faculty-head">{head}</div>
      )}
      {hasDepts && open && (
        <div className="admin-faculty-depts" id={`faculty-depts-${faculty.id}`}>
          {faculty.departments.map((d) => (
            <div key={d.id} className="admin-faculty-dept">
              <span className="admin-faculty-dept-name">{d.name}</span>
              <span className="admin-faculty-dept-meta">
                {countAr(d.students, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])} · {countAr(d.teachers, ['مدرّس واحد', 'مدرّسان', 'مدرّسون', 'مدرّساً'])} · {countAr(d.courses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminFacultiesPage() {
  const { data, isPending, isError, error, refetch } = useAdminFaculties();
  // 5-A8 P2-3: retrieval affordances — search (name/nameEn/dept) + city
  // filter + collapsed departments. Every sibling roster had search; this
  // page was a 3388px wall.
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [openDepts, setOpenDepts] = useState<ReadonlySet<string>>(new Set());

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="الكلّيّات والأقسام" subtitle="جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية." />
        <KpiSkeleton />
        <CardSkeleton lines={7} />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="الكلّيّات والأقسام" subtitle="جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية." />
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      </div>
    );
  }

  const totalDepts = data.reduce((s, f) => s + f.departmentCount, 0);
  const totalCourses = data.reduce((s, f) => s + f.courseCount, 0);
  const totalStudents = data.reduce((s, f) => s + f.studentCount, 0);
  const totalTeachers = data.reduce((s, f) => s + f.teacherCount, 0);

  const cities = Array.from(new Set(data.map((f) => f.city))).sort();
  const needle = q.trim();
  const visible = data.filter((f) => {
    if (city !== '' && f.city !== city) return false;
    if (needle === '') return true;
    return f.name.includes(needle)
      || (f.nameEn ?? '').toLowerCase().includes(needle.toLowerCase())
      || f.departments.some((d) => d.name.includes(needle));
  });
  const hasFilters = needle !== '' || city !== '';
  const toggleDepts = (id: string) => {
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="page">
      <PageHeader title="الكلّيّات والأقسام" subtitle="جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية." />

      <div className="grid-4">
        <MetricCard icon={Building2} label="عدد الكلّيّات" value={data.length} color="brand" />
        <MetricCard icon={School} label="عدد الأقسام" value={totalDepts} color="purple" />
        <MetricCard icon={GraduationCap} label="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={Users} label="هيئة التدريس" value={totalTeachers.toLocaleString('ar-LY')} color="amber" />
      </div>

      {/* 5-A8 §6 step 6 (rhythm): the directory is the page's primary
          section — it takes the breath after the KPI band. */}
      <Card
        style={{ marginBlockStart: 'var(--sp-9)' }}
        title={`الكلّيّات (${visible.length})`}
        icon={Building2}
        subtitle={hasFilters
          ? `من أصل ${countAr(data.length, ['كلّيّة واحدة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} · بعد التصفيّة`
          : `${countAr(totalDepts, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])} · ${countAr(totalCourses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}`}
      >
        {/* The students-roster toolbar chrome (colleges.css) — search +
            city select; the directory finds a faculty in one glance. */}
        <div className="admin-students-toolbar">
          <div className="admin-students-search">
            <Icon icon={Search} size={14} />
            <input
              type="search"
              placeholder="ابحث باسم الكلّيّة أو القسم…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="admin-students-input"
              aria-label="البحث في الكلّيّات"
            />
          </div>
          <select
            className="admin-students-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="تصفية حسب المدينة"
          >
            <option value="">كلّ المدن</option>
            {cities.map((cty) => <option key={cty} value={cty}>{cty}</option>)}
          </select>
        </div>

        <div className="flex-col gap-3">
          {visible.map((f) => (
            <FacultyRow
              key={f.id}
              faculty={f}
              open={openDepts.has(f.id)}
              onToggle={() => toggleDepts(f.id)}
            />
          ))}
          {visible.length === 0 && (
            <EmptyState
              icon={Building2}
              title="لا توجد نتائج مطابقة"
              description="جرّب تعديل البحث أو اختيار مدينة أخرى."
              action={hasFilters ? (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => { setQ(''); setCity(''); }}
                >
                  <Icon icon={X} size={13} />
                  مسح البحث والتصفيّة
                </button>
              ) : undefined}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

/* ─── Admin: Reports (institutional hub — the analysis page folds in here) ── */

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="trend-legend-item">
      <span className="trend-legend-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Arabic labels + badge tones for the research lifecycle (raw enums
 *  never reach the UI — platform ruling). */
const PAPER_STATUS_LABEL: Record<ResearchStatus, string> = {
  UPLOADED: 'مرفوعة',
  SCANNING: 'قيد الفحص',
  CHECKS_PASSED: 'اجتازت الفحص',
  CHECKS_FAILED: 'لم تجتز الفحص',
  GRADED: 'مقيَّمة',
  PUBLISHED: 'منشورة',
};
const PAPER_STATUS_TONE: Record<ResearchStatus, 'green' | 'amber' | 'red' | 'purple' | 'gold' | 'brand'> = {
  UPLOADED: 'amber',
  SCANNING: 'brand',
  CHECKS_PASSED: 'purple',
  CHECKS_FAILED: 'red',
  GRADED: 'gold',
  PUBLISHED: 'green',
};

/** One register row — status badge + the moderation-relevant numbers. */
function PaperRow({ p }: { p: AdminPaper }) {
  return (
    <tr>
      <td data-label="البحث">
        <div className="font-semibold" style={{ color: 'var(--text)' }}>{p.title}</div>
        {p.offering && (
          <div className="text-xxs text-subtle">{p.offering.course.name} · <bdi>{p.offering.course.code}</bdi></div>
        )}
      </td>
      <td data-label="الطالب">
        <div className="admin-students-name">
          <UserAvatar
            initials={p.student.avatarInitials ?? `${p.student.firstName[0]}${p.student.lastName[0]}`}
            color={p.student.avatarColor ?? undefined}
            size={28}
          />
          <div>{p.student.firstName} {p.student.lastName}</div>
        </div>
      </td>
      <td data-label="الحالة">
        <Badge color={PAPER_STATUS_TONE[p.status]}>{PAPER_STATUS_LABEL[p.status]}</Badge>
      </td>
      <td className="admin-table-num font-mono" data-label="نسبة الاقتباس">
        {p.plagiarismPct != null ? <bdi>{p.plagiarismPct}%</bdi> : '—'}
      </td>
      <td data-label="تاريخ الرفع">{formatRelativeArShort(p.uploadedAt)}</td>
    </tr>
  );
}

/** The pagination footer convention (OwnerUsersPage): bounded windowed
 *  page list inside .table-wrap, RTL-correct chevrons. */
function TablePaginationFooter({
  page, totalPages, total, onPage,
}: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="table-pagination">
      <span>
        الصفحة {page} من {totalPages} · {countAr(total, ['ورقة واحدة', 'ورقتان', 'أوراق', 'ورقة'])}
      </span>
      <div className="table-pagination-actions">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="الصفحة السابقة"
        >
          <Icon icon={ChevronRight} size={14} />
          السابق
        </button>
        {pageList(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} aria-hidden style={{ color: 'var(--text-muted)' }}>…</span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              aria-label={`الصفحة ${item}`}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="الصفحة التالية"
        >
          التالي
          <Icon icon={ChevronLeft} size={14} />
        </button>
      </div>
    </div>
  );
}

export function AdminReportsPage() {
  const { data, isPending, isError, error, refetch } = useAdminReports();
  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();

  // URL-driven views: ?trend=table is the folded analysis view;
  // ?status=<ResearchStatus> lands the papers register pre-filtered
  // (5-A8 §5 landing craft — the target arrives with its pill pressed).
  const trendView = searchParams.get('trend') === 'table' ? 'table' : 'bars';
  const statusParam = searchParams.get('status');
  const status: ResearchStatus | undefined = RESEARCH_STATUSES.includes(statusParam as ResearchStatus)
    ? (statusParam as ResearchStatus)
    : undefined;

  // Papers register state — page stays local (pagination noise in the
  // URL buys nothing); the status filter IS the URL.
  const [papersPage, setPapersPage] = useState(1);
  const papers = useAdminPapers({ page: papersPage, limit: 20, status });

  const registerRef = useRef<HTMLDivElement | null>(null);
  // Landing with ?status= (from the dashboard strip / quick stats) or
  // changing it (from the KPI row) scrolls the register into view.
  // `data` gates the scroll: on a cold deep link the page is still the
  // PageSkeleton when the effect first fires (registerRef null), so the
  // scroll must re-arm once the reports bundle actually resolves.
  useEffect(() => {
    if (!status || !data) return;
    registerRef.current?.scrollIntoView({
      block: 'start',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [status, data, reducedMotion]);

  const setTrendView = (v: 'bars' | 'table') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === 'table') next.set('trend', 'table');
      else next.delete('trend');
      return next;
    });
  };
  const setStatusFilter = (s: ResearchStatus | undefined) => {
    setPapersPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (s) next.set('status', s);
      else next.delete('status');
      return next;
    });
  };
  const scrollToRegister = () => registerRef.current?.scrollIntoView({
    block: 'start',
    behavior: reducedMotion ? 'auto' : 'smooth',
  });

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />
        <KpiSkeleton />
        <CardSkeleton lines={6} />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      </div>
    );
  }

  const maxBucket = Math.max(1, ...data.paperTrend.map((b) => Math.max(b.submitted, b.graded, b.published)));
  const months = data.paperTrend.map((b) => b.month);
  const periodLabel = months.length >= 2 ? `من ${months[0]} إلى ${months[months.length - 1]}` : undefined;
  const papersMeta = papers.data?.meta;

  return (
    <div className="page">
      <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />

      {/* §5 row 8: the papers KPIs land on the register — same-page rows
          act (button + scroll), the cross-page targets (dashboard quick
          stats) arrive as links. */}
      <div className="grid-4">
        <MetricCard
          icon={Microscope}
          label="إجمالي البحوث"
          value={data.headline.totalPapers}
          color="brand"
          onClick={() => { setStatusFilter(undefined); scrollToRegister(); }}
          actionHint="عرض سجلّ البحوث كاملاً"
        />
        <MetricCard
          icon={Award}
          label="بحوث منشورة"
          value={data.headline.publishedPapers}
          color="green"
          onClick={() => { setStatusFilter('PUBLISHED'); scrollToRegister(); }}
          actionHint="عرض البحوث المنشورة"
        />
        <MetricCard
          icon={GraduationCap}
          label="طلاب نشطون"
          value={data.headline.activeStudents.toLocaleString('ar-LY')}
          color="purple"
          to="/admin/students"
          actionHint="عرض قائمة الطلاب"
        />
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={data.headline.totalUsers.toLocaleString('ar-LY')} color="amber" />
      </div>

      {/* 5-A8 §6 step 2: the analysis page folds in as the trend's table
          view — one bundle, two presentations, no third arrangement.
          5-A8 §6 step 6 (rhythm): this is the page's primary section —
          it breathes after the tight KPI band (the dashboards' charts
          row carries the same break). */}
      <Card
        style={{ marginBlockStart: 'var(--sp-9)' }}
        title="حركة البحوث العلمية"
        icon={TrendingUp}
        subtitle={periodLabel ? `آخر 6 أشهر (${periodLabel}) · مرفوعة، مقيَّمة، منشورة` : 'مرفوعة · مقيَّمة · منشورة'}
        actions={(
          <Tabs
            value={trendView}
            onChange={setTrendView}
            items={[
              { value: 'bars', label: 'أعمدة' },
              { value: 'table', label: 'جدول' },
            ]}
          />
        )}
      >
        {data.paperTrend.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="لا توجد بيانات نشر بعد"
            description="ستظهر حركة البحوث هنا بعد رفع أول بحث."
          />
        ) : trendView === 'table' ? (
          <div className="trend-table-wrap">
            <table className="trend-table">
              <thead>
                <tr>
                  <th>الشهر</th>
                  <th>مُقدَّم</th>
                  <th>تمّ تقييمه</th>
                  <th>منشور</th>
                </tr>
              </thead>
              <tbody>
                {data.paperTrend.map((row, i) => (
                  <tr key={i}>
                    <td>{row.month}</td>
                    <td className="font-mono">{row.submitted}</td>
                    <td className="font-mono">{row.graded}</td>
                    <td className="font-mono">{row.published}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="flex-col gap-2">
              {data.paperTrend.map((b) => (
                <div key={b.month} className="trend-row">
                  <span className="trend-label">{b.month}</span>
                  <div className="trend-bars">
                    <div
                      className="trend-bar trend-submitted"
                      title={`مرفوعة: ${b.submitted}`}
                      style={{ width: `${(b.submitted / maxBucket) * 100}%` }}
                    >
                      {b.submitted > 0 && <span className="trend-bar-val">{b.submitted}</span>}
                    </div>
                    <div
                      className="trend-bar trend-graded"
                      title={`مقيَّمة: ${b.graded}`}
                      style={{ width: `${(b.graded / maxBucket) * 100}%` }}
                    >
                      {b.graded > 0 && <span className="trend-bar-val">{b.graded}</span>}
                    </div>
                    <div
                      className="trend-bar trend-published"
                      title={`منشورة: ${b.published}`}
                      style={{ width: `${(b.published / maxBucket) * 100}%` }}
                    >
                      {b.published > 0 && <span className="trend-bar-val">{b.published}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="trend-legend">
              <LegendDot color="var(--accent)" label="مرفوعة" />
              <LegendDot color="var(--gold)" label="مقيَّمة" />
              <LegendDot color="var(--success)" label="منشورة" />
            </div>
          </>
        )}
      </Card>

      {/* Papers register — 5-B4 consuming GET /admin/papers (5-B1):
          status pills + pagination, the §5 row 8 drill-down landing. */}
      <div ref={registerRef} style={{ scrollMarginBlockStart: 'var(--sp-4)' }}>
        <Card
          title="سجلّ البحوث"
          icon={FileText}
          subtitle={papersMeta
            ? `${countAr(papersMeta.total, ['ورقة واحدة', 'ورقتان', 'أوراق', 'ورقة'])}${status ? ` · ${PAPER_STATUS_LABEL[status]}` : ' · جميع الحالات'}`
            : 'سجلّ مؤسّسيّ لبحوث الطلاب عبر دورة حياتها'}
        >
          <div className="filter-bar" role="group" aria-label="تصفية البحوث حسب الحالة">
            <button
              type="button"
              className={`pill${status === undefined ? ' on' : ''}`}
              aria-pressed={status === undefined}
              onClick={() => setStatusFilter(undefined)}
            >
              الكل
            </button>
            {RESEARCH_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                className={`pill${status === st ? ' on' : ''}`}
                aria-pressed={status === st}
                onClick={() => setStatusFilter(st)}
              >
                {PAPER_STATUS_LABEL[st]}
              </button>
            ))}
          </div>

          {papers.isPending ? (
            <TableSkeleton rows={5} cols={5} />
          ) : papers.isError ? (
            <ErrorState
              error={papers.error}
              message="تعذّر تحميل سجلّ البحوث"
              onRetry={() => papers.refetch()}
            />
          ) : papers.data && papers.data.data.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={status ? `لا توجد بحوث بحالة «${PAPER_STATUS_LABEL[status]}»` : 'لا توجد بحوث بعد'}
              description={status
                ? 'جرّب حالة أخرى أو اعرض جميع الحالات.'
                : 'ستظهر البحوث هنا فور رفع أول بحث إلى المنصة.'}
              action={status ? (
                <button type="button" className="btn ghost sm" onClick={() => setStatusFilter(undefined)}>
                  <Icon icon={X} size={13} />
                  عرض جميع الحالات
                </button>
              ) : undefined}
            />
          ) : papers.data ? (
            <div className="table-wrap">
              <table className="table tbl-stack">
                <thead>
                  <tr>
                    <th>البحث</th>
                    <th>الطالب</th>
                    <th>الحالة</th>
                    <th className="admin-table-num" style={{ width: 110 }}>نسبة الاقتباس</th>
                    <th style={{ width: 130 }}>تاريخ الرفع</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.data.data.map((p) => <PaperRow key={p.id} p={p} />)}
                </tbody>
              </table>
              {papersMeta && papersMeta.totalPages > 1 && (
                <TablePaginationFooter
                  page={papersMeta.page}
                  totalPages={papersMeta.totalPages}
                  total={papersMeta.total}
                  onPage={setPapersPage}
                />
              )}
            </div>
          ) : null}
        </Card>
      </div>

      {/* Top courses */}
      <Card title="أكثر المقرّرات تسجيلاً" icon={ClipboardCheck} subtitle={data.topCourses.length > 0 ? `أعلى ${countAr(data.topCourses.length, ['مقرّر', 'مقرّرين', 'مقرّرات', 'مقرّراً'])} بناءً على عدد الطلاب` : undefined}>
        {data.topCourses.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="لا توجد تسجيلات بعد"
            description="ستظهر المقرّرات الأعلى تسجيلاً هنا فور تسجيل الطلاب في مقرّراتهم."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>الكود</th>
                  <th>اسم المقرّر</th>
                  <th className="admin-table-num" style={{ width: 130 }}>طلاب مسجَّلون</th>
                  <th className="admin-table-num" style={{ width: 110 }}>المحاضرات</th>
                </tr>
              </thead>
              <tbody>
                {data.topCourses.map((c) => (
                  <tr key={c.code}>
                    <td className="font-mono text-subtle" data-label="الكود"><bdi>{c.code}</bdi></td>
                    <td data-label="اسم المقرّر">{c.name}</td>
                    <td className="admin-table-num font-mono" data-label="طلاب مسجَّلون">{c.enrollments}</td>
                    <td className="admin-table-num font-mono" data-label="المحاضرات">{c.lectures}</td>
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

/* ─── Admin: Courses ─────────────────────────────────────── */
export function AdminCoursesPage() {
  // 5-A8 P2-1 (the silent 20-row cap): server-side search + faculty
  // filter + pagination (5-B1's params), the students-roster pattern.
  // The KPI row is gone on purpose — its aggregates were computed over
  // a capped page (the bug itself); the header's count now reads the
  // server meta, and the roster owns the page.
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const facQ = useFaculties();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const coursesQ = useAdminCourses({
    page,
    limit: 20,
    q: debouncedQ || undefined,
    facultyId: facultyId || undefined,
  });
  const hasFilters = debouncedQ !== '' || facultyId !== '';
  const clearFilters = () => {
    setQ('');
    setDebouncedQ('');
    setFacultyId('');
    setPage(1);
  };

  const meta = coursesQ.data?.meta;
  const courses = coursesQ.data?.data;

  return (
    <div className="page">
      <PageHeader
        title="إدارة المقرّرات"
        subtitle={meta
          ? `${countAr(meta.total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}${hasFilters ? ' مطابقة للبحث والتصفيّة' : ' في الجامعة'}`
          : 'جميع المقرّرات الجامعية مع إحصائيات حيّة.'}
      />

      <Card>
        {/* The students-roster toolbar (colleges.css chrome) — both
            filters run server-side now; the old client-side faculty
            pills counted a capped subset (the P2-1 mis-count). */}
        <div className="admin-students-toolbar">
          <div className="admin-students-search">
            <Icon icon={Search} size={14} />
            <input
              type="search"
              placeholder="ابحث بالاسم أو الكود…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="admin-students-input"
              aria-label="البحث في المقرّرات"
            />
          </div>
          <select
            className="admin-students-input"
            value={facultyId}
            onChange={(e) => { setFacultyId(e.target.value); setPage(1); }}
            disabled={facQ.isPending}
            aria-label="تصفية حسب الكلّيّة"
          >
            <option value="">{facQ.isPending ? 'جارٍ تحميل الكلّيّات…' : 'كلّ الكلّيّات'}</option>
            {facQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {facQ.isError && (
            <button type="button" className="btn ghost sm" onClick={() => facQ.refetch()}>
              إعادة تحميل الكلّيّات
            </button>
          )}
        </div>

        {coursesQ.isPending && <TableSkeleton rows={6} cols={7} />}
        {coursesQ.isError && (
          <ErrorState
            error={coursesQ.error}
            message="تعذّر تحميل قائمة المقرّرات"
            onRetry={() => coursesQ.refetch()}
          />
        )}
        {courses && (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>الكود</th>
                  <th>اسم المقرّر</th>
                  <th>الكلّيّة / القسم</th>
                  <th className="admin-table-num" style={{ width: 70 }}>س.م</th>
                  <th className="admin-table-num" style={{ width: 110 }}>تسجيلات</th>
                  <th className="admin-table-num" style={{ width: 100 }}>محاضرات</th>
                  <th className="admin-table-num" style={{ width: 100 }}>الفصول</th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        title="لا توجد نتائج"
                        description="جرّب تعديل البحث أو الفلتر لعرض نتائج أوسع."
                        action={hasFilters ? (
                          <button type="button" className="btn ghost sm" onClick={clearFilters}>
                            <Icon icon={X} size={13} />
                            مسح البحث والفلتر
                          </button>
                        ) : undefined}
                      />
                    </td>
                  </tr>
                )}
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-subtle" data-label="الكود"><bdi>{c.code}</bdi></td>
                    <td data-label="اسم المقرّر">
                      <div className="flex items-center gap-2">
                        {c.themeColor && (
                          <span className="admin-course-tint" style={{ background: c.themeColor }} aria-hidden />
                        )}
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td data-label="الكلّيّة / القسم">
                      {c.faculty ? (
                        <div className="flex items-center gap-1">
                          <EmojiIcon emoji={c.facultyEmoji} fallback={BookOpen} size={16} className="text-subtle" />
                          <span className="text-xs text-muted">{c.faculty}</span>
                          {c.department && <span className="text-xxs text-subtle">· {c.department}</span>}
                        </div>
                      ) : (
                        <span className="text-xxs text-subtle">—</span>
                      )}
                    </td>
                    <td className="admin-table-num font-mono" data-label="ساعات معتمدة">{c.credits}</td>
                    <td className="admin-table-num font-mono" data-label="تسجيلات">{c.totalEnrollments}</td>
                    <td className="admin-table-num font-mono" data-label="محاضرات">{c.totalLectures}</td>
                    <td className="admin-table-num font-mono" data-label="الفصول">{c.offeringCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && meta.totalPages > 1 && (
              <TablePaginationFooter
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPage={setPage}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
