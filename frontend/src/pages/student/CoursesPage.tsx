import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, Clock, AlertTriangle, ClipboardList,
  Cog, Cpu, Database, Network, Globe, Shield,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyEnrollments } from '../../hooks/useResources';

const courseIcon = (codeOrName: string): LucideIcon => {
  const s = codeOrName.toLowerCase();
  if (s.includes('se') || s.includes('برمج')) return Cog;
  if (s.includes('ct') || s.includes('تقنيات الحاسوب')) return Cpu;
  if (s.includes('is') || s.includes('نظم')) return Database;
  if (s.includes('net') || s.includes('شبك')) return Network;
  if (s.includes('web') || s.includes('إنترنت')) return Globe;
  if (s.includes('sec') || s.includes('أمن')) return Shield;
  return BookOpen;
};

export default function StudentCoursesPage() {
  const { data, isPending, isError, error, refetch } = useMyEnrollments();

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المواد الدراسية</h1>
          <p className="page-subtitle">جميع المواد التي سجّلت فيها هذا الفصل، مع تقدّمك في كل واحدة.</p>
        </div>
      </header>

      <div className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="مواد مسجَّلة"
          value={data?.length ?? '—'}
          change="هذا الفصل"
          color="brand"
        />
        <MetricCard
          icon={CheckCircle2}
          label="مكتملة"
          value={data?.filter((e) => e.progressPct >= 100).length ?? 0}
          color="green"
        />
        <MetricCard
          icon={Clock}
          label="قيد التقدم"
          value={data?.filter((e) => e.progressPct > 0 && e.progressPct < 100).length ?? 0}
          color="amber"
        />
        <MetricCard
          icon={AlertTriangle}
          label="تحتاج اهتمام"
          value={data?.filter((e) => e.progressPct < 30).length ?? 0}
          change="أداء منخفض"
          color="red"
        />
      </div>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={BookOpen} title="لم تُسجَّل في أي مادة بعد" description="تواصل مع إدارة الكلية لإكمال التسجيل." /></Card>
      ) : (
        <div className="grid-3">
          {data.map((e) => {
            const c = e.offering.course;
            const Cmp = courseIcon(c.code ?? c.name);
            const tint = c.themeColor ?? '#3D6BD6';
            return (
              <Link to={`/student/courses/${e.offering.id}`} className="thumb-card" key={e.id}>
                <div className="thumb-card-image" style={{ background: `${tint}10` }}>
                  <span style={{ color: tint }}>
                    <Icon icon={Cmp} size={28} strokeWidth={1.6} />
                  </span>
                </div>
                <div className="thumb-card-body">
                  <div className="thumb-card-title">{c.name}</div>
                  <div className="thumb-card-sub">د. {e.offering.teacher.firstName} {e.offering.teacher.lastName}</div>
                  <div style={{ marginTop: 'var(--sp-2)' }}>
                    <ProgressBar value={e.progressPct} color={tint} label="الإنجاز" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Card title="الواجبات القادمة" icon={ClipboardList}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>المادة</th>
                <th>الواجب</th>
                <th>الموعد النهائي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="tbl-strong">هندسة البرمجيات</td>
                <td>مشروع UML للتصميم</td>
                <td className="tbl-num">20 مايو</td>
                <td><Badge color="amber">قيد العمل</Badge></td>
              </tr>
              <tr>
                <td className="tbl-strong">شبكات الحاسوب</td>
                <td>تقرير بروتوكول TCP</td>
                <td className="tbl-num">22 مايو</td>
                <td><Badge color="red">عاجل</Badge></td>
              </tr>
              <tr>
                <td className="tbl-strong">نظم المعلومات</td>
                <td>قاعدة بيانات ERD</td>
                <td className="tbl-num">28 مايو</td>
                <td><Badge color="green">متبقي وقت</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
