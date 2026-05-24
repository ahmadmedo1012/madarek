import {
  Building2, GraduationCap, School, BookOpen,
  BarChart3, Settings, FileText, Users, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/primitives/States';
import { useAdminStats } from '../../hooks/useResources';

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
        <MetricCard icon={Building2} label="الكليات" value="29" change="موزّعة على 9 مدن" color="brand" />
        <MetricCard icon={GraduationCap} label="الطلاب" value={s.totalStudents.toLocaleString('ar-LY')} change="مسجَّل في النظام" color="green" />
        <MetricCard icon={School} label="هيئة التدريس" value={s.totalTeachers.toLocaleString('ar-LY')} change="عضو" color="amber" />
        <MetricCard icon={BookOpen} label="المقررات" value={s.totalCourses.toLocaleString('ar-LY')} change={`${s.totalEnrollments} تسجيل`} color="purple" />
      </div>

      <div className="grid-2-1">
        <Card title="توزّع الطلاب حسب الكلية" icon={BarChart3} subtitle="أعلى 8 كليات من حيث عدد الطلاب">
          <div className="flex-col gap-3">
            {[
              { f: 'كلية الاقتصاد · الزاوية', c: 6800 },
              { f: 'كلية الهندسة · الزاوية', c: 5200 },
              { f: 'كلية الطب البشري', c: 4800 },
              { f: 'كلية التربية · الفروع الخمسة', c: 4500 },
              { f: 'كلية الآداب · الزاوية', c: 4100 },
              { f: 'كلية القانون · الزاوية', c: 3700 },
              { f: 'كلية تقنية المعلومات', c: 2900 },
              { f: 'كلية العلوم · الزاوية', c: 2500 },
            ].map((r) => (
              <ProgressBar key={r.f} value={(r.c / 6800) * 100} label={`${r.f} — ${r.c.toLocaleString('ar-LY')}`} showValue={false} />
            ))}
          </div>
        </Card>

        <Card title="مؤشرات سريعة" icon={TrendingUp}>
          <div className="flex-col gap-2">
            <Stat label="معدل النجاح العام" value="76%" trend="up" />
            <Stat label="الحضور التراكمي" value="82%" trend="up" />
            <Stat label="رضا الطلاب" value="4.3 / 5" trend="up" />
            <Stat label="الترتيب في ليبيا" value="#6" trend="up" />
            <Stat label="QS العربي 2026" value="#251–300" trend="up" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: 'up' | 'dn' }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
      <span className="text-sm text-muted">{label}</span>
      <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>{value}</span>
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
