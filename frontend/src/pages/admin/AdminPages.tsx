import { Card, MetricCard } from '../../components/primitives';
import { useAdminStats } from '../../hooks/useResources';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';

export function AdminDashboardPage() {
  const stats = useAdminStats();

  if (stats.isPending) return <LoadingState />;
  if (stats.isError) return <ErrorState />;
  const s = stats.data!;

  return (
    <div className="page">
      <div className="grid-4">
        <MetricCard label="🏛️ الكليات" value="29" change="موزّعة على الجامعة" color="blue" />
        <MetricCard label="👨‍🎓 الطلاب" value={s.totalStudents.toLocaleString('ar-LY')} change="مسجّلون في النظام" color="green" />
        <MetricCard label="👨‍🏫 الأساتذة" value={s.totalTeachers.toLocaleString('ar-LY')} change="هيئة التدريس" color="amber" />
        <MetricCard label="📚 المقررات" value={s.totalCourses.toLocaleString('ar-LY')} change={`${s.totalEnrollments} تسجيل`} color="purple" />
      </div>
      <Card title="📊 نظرة عامة">
        <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.8 }}>
          هذه اللوحة تعرض إحصاءات حيّة من قاعدة البيانات. ربط المخططات والتقارير الكاملة
          سيُضاف تدريجياً مع توسّع البيانات الحقيقية في النظام.
        </p>
      </Card>
    </div>
  );
}

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="page">
      <Card title={title}>
        <EmptyState icon="⚙️" title="هذه الشاشة قيد التطوير" hint="ستُربط بـ /api/v1/admin قريباً" />
      </Card>
    </div>
  );
}
