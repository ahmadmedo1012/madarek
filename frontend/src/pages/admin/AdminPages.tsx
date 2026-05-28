import { useState } from 'react';
import {
  Building2, GraduationCap, School, BookOpen,
  BarChart3, Settings, FileText, Users, TrendingUp,
  Award, Microscope, ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/primitives/States';
import { useAdminStats, useAdminFaculties, useAdminReports, useAdminCourses } from '../../hooks/useResources';
import { AnimatedCounter, TrendBar, TrendArea, Sparkline, TrendChip } from '../../lib/charts';

export function AdminDashboardPage() {
  const stats = useAdminStats();

  if (stats.isPending) return <LoadingState />;
  if (stats.isError) return <ErrorState />;
  const s = stats.data!;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الإدارة</h1>
          <p className="page-subtitle">إحصائيات شاملة عن طلاب وأساتذة جامعة الزاوية.</p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard
          icon={Building2}
          label="الكليات"
          value={<AnimatedCounter to={29} />}
          change="موزّعة على 9 مدن"
          color="brand"
        />
        <MetricCard
          icon={GraduationCap}
          label="الطلاب"
          value={<AnimatedCounter to={s.totalStudents} />}
          change="مسجَّل في النظام"
          color="green"
        />
        <MetricCard
          icon={School}
          label="هيئة التدريس"
          value={<AnimatedCounter to={s.totalTeachers} />}
          change="عضو"
          color="amber"
        />
        <MetricCard
          icon={BookOpen}
          label="المقررات"
          value={<AnimatedCounter to={s.totalCourses} />}
          change={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AnimatedCounter to={s.totalEnrollments} /> تسجيل
            </span>
          }
          color="purple"
        />
      </div>

      {/* Enrollment trend */}
      <Card title="حركة التسجيلات · 6 فصول" icon={TrendingUp} subtitle="عدد التسجيلات الجديدة في كل فصل">
        <TrendArea
          data={[8420, 9150, 9870, 10520, 11380, 12400]}
          labels={['ربيع 23', 'خريف 23', 'ربيع 24', 'خريف 24', 'ربيع 25', 'خريف 25']}
          color="primary"
          height={220}
        />
      </Card>

      <div className="grid-2-1">
        <Card title="توزّع الطلاب حسب الكلية" icon={BarChart3} subtitle="أعلى 8 كليات من حيث عدد الطلاب">
          <TrendBar
            data={[6800, 5200, 4800, 4500, 4100, 3700, 2900, 2500]}
            labels={[
              'الاقتصاد', 'الهندسة', 'الطب البشري', 'التربية',
              'الآداب', 'القانون', 'تقنية المعلومات', 'العلوم',
            ]}
            color="primary"
            height={300}
            horizontal
          />
        </Card>

        <Card title="مؤشرات سريعة" icon={TrendingUp}>
          <div className="flex-col gap-2">
            <Stat label="معدل النجاح العام" value={<><AnimatedCounter to={76} suffix="%" /></>} delta={2} sparkData={[71, 72, 74, 75, 75, 76]} sparkColor="primary" />
            <Stat label="الحضور التراكمي" value={<><AnimatedCounter to={82} suffix="%" /></>} delta={3} sparkData={[78, 79, 80, 81, 81, 82]} sparkColor="action" />
            <Stat label="رضا الطلاب" value={<><AnimatedCounter to={4.3} decimals={1} /> / 5</>} delta={4} sparkData={[4.0, 4.1, 4.1, 4.2, 4.2, 4.3]} sparkColor="success" />
            <Stat label="الترتيب في ليبيا" value="#6" delta={1} invertDelta sparkData={[10, 9, 8, 7, 7, 6]} sparkColor="ai" />
            <Stat label="QS العربي 2026" value="#251–300" delta={5} invertDelta sparkData={[320, 310, 300, 290, 280, 270]} sparkColor="gold" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, delta, sparkData, sparkColor, invertDelta }: {
  label: string;
  value: React.ReactNode;
  delta?: number;
  sparkData?: number[];
  sparkColor?: 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold';
  invertDelta?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-3)',
      padding: 'var(--sp-2) var(--sp-3)',
      borderRadius: 'var(--r-sm)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 auto' }}>
        <span className="text-sm text-muted">{label}</span>
        {sparkData && sparkData.length > 1 && (
          <div style={{ marginTop: 4, height: 18, width: 100 }}>
            <Sparkline data={sparkData} color={sparkColor ?? 'primary'} height={18} fill={false} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexShrink: 0 }}>
        <span className="font-mono text-sm" style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
        {delta !== undefined && <TrendChip delta={delta} suffix="%" invert={invertDelta} size="sm" />}
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export function AdminPlaceholder({
  title,
  subtitle = 'هذه الشاشة تعرض بيانات حية من قاعدة البيانات.',
  icon = Settings,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid-3">
        <MetricCard icon={Users} label="إجمالي السجلات" value="—" color="brand" />
        <MetricCard icon={TrendingUp} label="نشاط هذا الأسبوع" value="—" color="green" />
        <MetricCard icon={FileText} label="عمليات معلقة" value="—" color="amber" />
      </div>
      <Card title="بيانات تفصيلية" icon={icon}>
        <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)', padding: 'var(--sp-4) 0' }}>
          ستظهر هنا قائمة تفصيلية مع إمكانية البحث والتصفية والتعديل المباشر،
          مرتبطة بالـ API. المخطط الحالي للقاعدة جاهز ويدعم جميع العمليات المطلوبة.
        </p>
      </Card>
    </div>
  );
}

/* ─── Admin: Faculties ────────────────────────────────────── */
export function AdminFacultiesPage() {
  const { data, isPending, isError } = useAdminFaculties();

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="الكليات والأقسام" subtitle="جميع كليات الجامعة وأقسامها مع إحصائيات حية." />
        <Card><LoadingState /></Card>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="الكليات والأقسام" subtitle="جميع كليات الجامعة وأقسامها مع إحصائيات حية." />
        <Card><ErrorState /></Card>
      </div>
    );
  }

  const totalDepts = data.reduce((s, f) => s + f.departmentCount, 0);
  const totalCourses = data.reduce((s, f) => s + f.courseCount, 0);
  const totalStudents = data.reduce((s, f) => s + f.studentCount, 0);
  const totalTeachers = data.reduce((s, f) => s + f.teacherCount, 0);

  return (
    <div className="page">
      <PageHeader title="الكليات والأقسام" subtitle="جميع كليات الجامعة وأقسامها مع إحصائيات حية." />

      <div className="grid-4">
        <MetricCard icon={Building2} label="عدد الكليات" value={data.length} color="brand" />
        <MetricCard icon={School} label="عدد الأقسام" value={totalDepts} color="purple" />
        <MetricCard icon={GraduationCap} label="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={Users} label="هيئة التدريس" value={totalTeachers.toLocaleString('ar-LY')} color="amber" />
      </div>

      <Card title={`الكليات (${data.length})`} icon={Building2} subtitle={`${totalDepts} قسم · ${totalCourses} مقرر`}>
        <div className="flex-col gap-3">
          {data.map((f) => (
            <div
              key={f.id}
              style={{
                padding: 'var(--sp-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-1)',
              }}
            >
              <div className="flex items-start gap-3" style={{ marginBottom: f.departments.length ? 'var(--sp-3)' : 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--r-md)',
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  {f.iconEmoji ?? <Building2 size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-md font-semibold" style={{ color: 'var(--text)', fontSize: 'var(--fs-md)' }}>
                      {f.name}
                    </span>
                    {f.nameEn && <span className="text-xs text-subtle font-mono">· {f.nameEn}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-subtle" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="font-mono">{f.departmentCount} قسم</span>
                    <span className="font-mono">{f.courseCount} مقرر</span>
                    <span className="font-mono">{f.studentCount.toLocaleString('ar-LY')} طالب</span>
                    <span className="font-mono">{f.teacherCount} عضو هيئة تدريس</span>
                  </div>
                </div>
              </div>

              {f.departments.length > 0 && (
                <div className="grid-auto-200" style={{ gap: 'var(--sp-2)' }}>
                  {f.departments.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: 'var(--sp-3)',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--r-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        {d.name}
                      </span>
                      <span className="text-xxs text-subtle font-mono">
                        {d.students} طالب · {d.teachers} مدرّس · {d.courses} مقرر
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Admin: Reports ──────────────────────────────────────── */
export function AdminReportsPage() {
  const { data, isPending, isError } = useAdminReports();

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />
        <Card><LoadingState /></Card>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />
        <Card><ErrorState /></Card>
      </div>
    );
  }

  const maxBucket = Math.max(1, ...data.paperTrend.map((b) => Math.max(b.submitted, b.graded, b.published)));

  return (
    <div className="page">
      <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />

      <div className="grid-4">
        <MetricCard icon={Microscope} label="إجمالي البحوث" value={data.headline.totalPapers} color="brand" />
        <MetricCard icon={Award} label="بحوث منشورة" value={data.headline.publishedPapers} color="green" />
        <MetricCard icon={GraduationCap} label="طلاب نشطون" value={data.headline.activeStudents.toLocaleString('ar-LY')} color="purple" />
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={data.headline.totalUsers.toLocaleString('ar-LY')} color="amber" />
      </div>

      {/* Paper publishing trend */}
      <Card title="حركة البحوث العلمية — آخر 6 أشهر" icon={TrendingUp} subtitle="مرفوعة · مقيَّمة · منشورة">
        <div className="flex-col gap-2">
          {data.paperTrend.map((b) => (
            <div key={b.month} className="trend-row">
              <span className="trend-label">{b.month}</span>
              <div className="trend-bars">
                <div className="trend-bar trend-submitted" title={`مرفوعة: ${b.submitted}`} style={{ width: `${(b.submitted / maxBucket) * 100}%` }}>
                  {b.submitted > 0 && <span className="trend-bar-val">{b.submitted}</span>}
                </div>
                <div className="trend-bar trend-graded" title={`مقيَّمة: ${b.graded}`} style={{ width: `${(b.graded / maxBucket) * 100}%` }}>
                  {b.graded > 0 && <span className="trend-bar-val">{b.graded}</span>}
                </div>
                <div className="trend-bar trend-published" title={`منشورة: ${b.published}`} style={{ width: `${(b.published / maxBucket) * 100}%` }}>
                  {b.published > 0 && <span className="trend-bar-val">{b.published}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xxs text-subtle" style={{ marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <LegendDot color="var(--accent)" label="مرفوعة" />
          <LegendDot color="var(--gold)" label="مقيَّمة" />
          <LegendDot color="var(--success)" label="منشورة" />
        </div>
      </Card>

      {/* Top courses */}
      <Card title="أكثر المقررات تسجيلاً" icon={ClipboardCheck} subtitle={`أعلى ${data.topCourses.length} مقرر بناءً على عدد الطلاب`}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 100 }}>الكود</th>
                <th>اسم المقرر</th>
                <th style={{ width: 120, textAlign: 'center' }}>طلاب مسجَّلون</th>
                <th style={{ width: 120, textAlign: 'center' }}>المحاضرات</th>
              </tr>
            </thead>
            <tbody>
              {data.topCourses.map((c) => (
                <tr key={c.code}>
                  <td className="font-mono text-subtle">{c.code}</td>
                  <td>{c.name}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.enrollments}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.lectures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

/* ─── Admin: Courses ─────────────────────────────────────── */
export function AdminCoursesPage() {
  const { data, isPending, isError } = useAdminCourses();
  const [filter, setFilter] = useState<'all' | string>('all');

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="إدارة المقررات" subtitle="جميع المقررات الجامعية مع إحصائيات حية." />
        <Card><LoadingState /></Card>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="إدارة المقررات" subtitle="جميع المقررات الجامعية مع إحصائيات حية." />
        <Card><ErrorState /></Card>
      </div>
    );
  }

  const faculties = Array.from(new Set(data.map((c) => c.faculty).filter(Boolean))) as string[];
  const visible = filter === 'all' ? data : data.filter((c) => c.faculty === filter);

  const totalEnroll = data.reduce((s, c) => s + c.totalEnrollments, 0);
  const totalLec = data.reduce((s, c) => s + c.totalLectures, 0);
  const totalMat = data.reduce((s, c) => s + c.totalMaterials, 0);
  const avgCredits = data.length ? Math.round((data.reduce((s, c) => s + c.credits, 0) / data.length) * 10) / 10 : 0;

  return (
    <div className="page">
      <PageHeader title="إدارة المقررات" subtitle={`${data.length} مقرر · ${totalEnroll.toLocaleString('ar-LY')} تسجيل`} />

      <div className="grid-4">
        <MetricCard icon={BookOpen} label="إجمالي المقررات" value={data.length} color="brand" />
        <MetricCard icon={GraduationCap} label="تسجيلات الطلاب" value={totalEnroll.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={FileText} label="المحاضرات + المواد" value={(totalLec + totalMat).toLocaleString('ar-LY')} color="purple" />
        <MetricCard icon={Award} label="متوسط الساعات" value={avgCredits} color="gold" />
      </div>

      {/* Faculty filter pills */}
      <Card compact>
        <div className="filter-bar">
          <button type="button" className={`pill${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>
            الكل ({data.length})
          </button>
          {faculties.map((f) => {
            const count = data.filter((c) => c.faculty === f).length;
            return (
              <button key={f} type="button" className={`pill${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                {f} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Courses table */}
      <Card title={`المقررات (${visible.length})`} icon={BookOpen}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 90 }}>الكود</th>
                <th>اسم المقرر</th>
                <th>الكلية / القسم</th>
                <th style={{ width: 80, textAlign: 'center' }}>س.م</th>
                <th style={{ width: 110, textAlign: 'center' }}>تسجيلات</th>
                <th style={{ width: 100, textAlign: 'center' }}>محاضرات</th>
                <th style={{ width: 100, textAlign: 'center' }}>الفصول</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-subtle">{c.code}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {c.themeColor && (
                        <span style={{ width: 6, height: 24, borderRadius: 3, background: c.themeColor, display: 'inline-block' }} />
                      )}
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td>
                    {c.faculty ? (
                      <div className="flex items-center gap-1">
                        {c.facultyEmoji && <span>{c.facultyEmoji}</span>}
                        <span className="text-xs text-muted">{c.faculty}</span>
                        {c.department && <span className="text-xxs text-subtle">· {c.department}</span>}
                      </div>
                    ) : (
                      <span className="text-xxs text-subtle">—</span>
                    )}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.credits}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.totalEnrollments}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.totalLectures}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.offeringCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
