import {
  Building2, GraduationCap, School, BookOpen,
  BarChart3, Settings, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
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
          <p className="page-subtitle">إحصائيات شاملة عن جميع طلاب وأساتذة جامعة الزاوية.</p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={Building2} label="الكليات" value="29" change="موزّعة على الجامعة" color="blue" />
        <MetricCard icon={GraduationCap} label="الطلاب" value={s.totalStudents.toLocaleString('ar-LY')} change="مسجّلون في النظام" color="green" />
        <MetricCard icon={School} label="الأساتذة" value={s.totalTeachers.toLocaleString('ar-LY')} change="هيئة التدريس" color="amber" />
        <MetricCard icon={BookOpen} label="المقررات" value={s.totalCourses.toLocaleString('ar-LY')} change={`${s.totalEnrollments} تسجيل`} color="purple" />
      </div>

      <Card icon={BarChart3} title="نظرة عامة">
        <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)' }}>
          تعرض هذه اللوحة إحصائيات حيّة من قاعدة البيانات. سيتم إضافة المزيد من
          المخططات والتقارير التفصيلية تدريجياً مع توسّع البيانات الحقيقية في النظام.
        </p>
      </Card>
    </div>
  );
}

export function AdminPlaceholder({
  title,
  subtitle = 'هذه الشاشة قيد التطوير وستُربط بالـ API قريباً.',
  icon = Settings,
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
      <Card>
        <EmptyState icon={icon} title="قيد التطوير" description="ستتوفر هذه الشاشة كاملةً مع البيانات الفعلية في الإصدار القادم." />
      </Card>
    </div>
  );
}
