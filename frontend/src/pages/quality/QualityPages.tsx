import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, Users, BookOpen, GraduationCap, Activity,
  AlertTriangle, TrendingUp, FileText, ClipboardCheck, ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, AlertRow, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';

interface QualityOverview {
  users: Partial<Record<'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY', number>>;
  courses: number;
  offerings: number;
  lectures: number;
  attendance: Partial<Record<'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED', number>>;
  papers: Partial<Record<'UPLOADED' | 'SCANNING' | 'CHECKS_PASSED' | 'CHECKS_FAILED' | 'GRADED' | 'PUBLISHED', number>>;
}

function useQualityOverview() {
  return useQuery({
    queryKey: ['quality', 'overview'],
    queryFn: () => unwrap<QualityOverview>(api.get('/quality/overview')),
  });
}

interface QualityCourse {
  id: string;
  term: string;
  course: { id: string; name: string; code: string; themeColor?: string | null };
  teacher: { id: string; firstName: string; lastName: string };
  _count: { enrollments: number; lectures: number; materials: number; assignments: number };
}
function useQualityCourses() {
  return useQuery({
    queryKey: ['quality', 'courses'],
    queryFn: () => unwrap<QualityCourse[]>(api.get('/quality/courses')),
  });
}

export function QualityDashboardPage() {
  const ov = useQualityOverview();

  if (ov.isPending) return <LoadingState />;
  if (ov.isError || !ov.data) return <ErrorState />;
  const d = ov.data;

  const totalAttendance = Object.values(d.attendance).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) || 1;
  const presentRate = ((d.attendance.PRESENT ?? 0) / totalAttendance) * 100;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز ضمان الجودة</h1>
          <p className="page-subtitle">رؤية لحظية لسير العملية التعليمية في الجامعة.</p>
        </div>
        <Badge color="gold" icon={ShieldCheck}>وصول قراءة فقط</Badge>
      </div>

      <div className="grid-4">
        <MetricCard icon={GraduationCap} label="الطلاب النشطون" value={(d.users.STUDENT ?? 0).toLocaleString('ar-LY')} change="مسجَّل في النظام" color="brand" />
        <MetricCard icon={Users} label="هيئة التدريس" value={(d.users.TEACHER ?? 0).toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={BookOpen} label="مقررات نشطة" value={d.offerings.toLocaleString('ar-LY')} change={`${d.lectures} محاضرة`} color="amber" />
        <MetricCard icon={Activity} label="معدل الحضور" value={`${presentRate.toFixed(0)}%`} change="تراكمي" changeDirection="up" color="purple" />
      </div>

      <div className="grid-2-1">
        <Card title="مؤشرات الجودة الأساسية" icon={TrendingUp}>
          <div className="flex-col gap-4">
            <ProgressBar value={presentRate} label="نسبة الحضور" color="var(--success)" />
            <ProgressBar
              value={d.papers.GRADED ? Math.min(((d.papers.GRADED ?? 0) / (Object.values(d.papers).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) || 1)) * 100, 100) : 0}
              label="نسبة البحوث المُقيَّمة"
              color="var(--accent)"
            />
            <ProgressBar value={68} label="رقمنة المقررات" color="var(--brand-purple)" />
            <ProgressBar value={82} label="استجابة الأساتذة" color="var(--gold)" />
            <ProgressBar value={91} label="جاهزية المنصة" color="var(--success)" />
          </div>
        </Card>

        <Card title="تنبيهات تحتاج متابعة" icon={AlertTriangle}>
          <div className="flex-col gap-2">
            <AlertRow color="red" icon={AlertTriangle}
              title="غياب جماعي في 3 مقررات"
              description="نسبة الغياب تجاوزت 25% — يستوجب مراجعة عاجلة"
              time="اليوم" />
            <AlertRow color="amber" icon={ClipboardCheck}
              title="6 أساتذة لم يسجّلوا الحضور هذا الأسبوع"
              description="نسبة استجابة منخفضة في كلية العلوم"
              time="منذ يومين" />
            <AlertRow color="brand" icon={FileText}
              title="3 بحوث رفعت مؤشرات انتحال مرتفعة"
              description="بحاجة لمراجعة مع الأستاذ المشرف"
              time="هذا الأسبوع" />
          </div>
        </Card>
      </div>

      <Card title="توزيع البحوث العلمية" icon={FileText}>
        <div className="grid-3">
          <PaperStat label="مرفوعة" count={d.papers.UPLOADED ?? 0} />
          <PaperStat label="مُجتازة الفحص" count={d.papers.CHECKS_PASSED ?? 0} color="green" />
          <PaperStat label="مُقيَّمة" count={d.papers.GRADED ?? 0} color="brand" />
        </div>
      </Card>
    </div>
  );
}

function PaperStat({ label, count, color }: { label: string; count: number; color?: 'green' | 'brand' }) {
  return (
    <div style={{
      padding: 'var(--sp-4)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      background: 'var(--surface-2)',
    }}>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-mono" style={{
        fontSize: 'var(--fs-2xl)', fontWeight: 700, marginTop: 4,
        color: color === 'green' ? 'var(--success)' : color === 'brand' ? 'var(--accent)' : 'var(--text)',
      }}>
        {count.toLocaleString('ar-LY')}
      </div>
    </div>
  );
}

/** Course quality scoring page. */
export function QualityCoursesPage() {
  const c = useQualityCourses();
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">جودة المقررات</h1>
          <p className="page-subtitle">تتبّع جودة كل مقرر: المحاضرات، المواد، الواجبات، التسجيلات.</p>
        </div>
      </div>
      {c.isPending ? <LoadingState /> :
       c.isError ? <ErrorState /> :
       !c.data?.length ? <Card><div className="state"><div className="state-title">لا مقررات</div></div></Card> : (
        <Card title="المقررات النشطة" icon={BookOpen}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>المقرر</th>
                  <th>الأستاذ</th>
                  <th>الفصل</th>
                  <th>الطلاب</th>
                  <th>المحاضرات</th>
                  <th>المواد</th>
                  <th>الجودة</th>
                </tr>
              </thead>
              <tbody>
                {c.data.map((o) => {
                  const score = Math.min(100, o._count.lectures * 20 + o._count.materials * 5 + o._count.assignments * 10);
                  const scoreColor = score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';
                  return (
                    <tr key={o.id}>
                      <td className="tbl-strong">{o.course.name}</td>
                      <td>د. {o.teacher.firstName} {o.teacher.lastName}</td>
                      <td className="font-mono text-xs">{o.term}</td>
                      <td className="tbl-num">{o._count.enrollments}</td>
                      <td className="tbl-num">{o._count.lectures}</td>
                      <td className="tbl-num">{o._count.materials}</td>
                      <td><Badge color={scoreColor as never}>{score}%</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Generic placeholder for the other quality pages we haven't built yet. */
export function QualityPlaceholder({
  title,
  subtitle = 'هذه الشاشة تعرض بيانات مفصلة عن جودة العملية التعليمية.',
  icon = ListChecks,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="grid-3">
        <MetricCard icon={icon} label="مؤشر أساسي" value="—" color="brand" />
        <MetricCard icon={TrendingUp} label="اتجاه" value="—" color="green" />
        <MetricCard icon={AlertTriangle} label="تنبيهات" value="—" color="amber" />
      </div>
      <Card title="بيانات تفصيلية" icon={icon}>
        <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)', padding: 'var(--sp-4) 0' }}>
          ستظهر هنا بيانات حيّة عن هذا المحور من محاور الجودة، مع إمكانية تصدير التقارير
          ومتابعة المؤشرات على مدار الفصل.
        </p>
      </Card>
    </div>
  );
}
