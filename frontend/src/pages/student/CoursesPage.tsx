import { BookOpen, CheckCircle2, Clock, AlertTriangle, ClipboardList } from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { useMyEnrollments } from '../../hooks/useResources';

export default function StudentCoursesPage() {
  const { data, isPending, isError } = useMyEnrollments();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المواد الدراسية</h1>
          <p className="page-subtitle">جميع المواد التي سجّلت فيها هذا الفصل، مع نسبة تقدّمك في كل واحدة.</p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="مواد مسجلة"
          value={data?.length ?? '—'}
          change="هذا الفصل"
          color="blue"
        />
        <MetricCard
          icon={CheckCircle2}
          label="مكتملة"
          value={data?.filter((e) => e.progressPct >= 100).length ?? 0}
          change="بنجاح"
          color="green"
        />
        <MetricCard
          icon={Clock}
          label="جارية"
          value={data?.filter((e) => e.progressPct > 0 && e.progressPct < 100).length ?? 0}
          change="في التقدم"
          color="amber"
        />
        <MetricCard
          icon={AlertTriangle}
          label="تحتاج اهتمام"
          value={data?.filter((e) => e.progressPct < 30).length ?? 0}
          change="مواد ضعيفة"
          color="red"
        />
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={BookOpen} title="لم تُسجَّل في أي مادة بعد" description="تواصل مع إدارة الكلية لإكمال التسجيل." />
        </Card>
      ) : (
        <div className="grid-3">
          {data.map((e) => {
            const c = e.offering.course;
            return (
              <div className="thumb-card" key={e.id}>
                <div
                  className="thumb-card-image"
                  style={{
                    background: c.themeColor
                      ? `linear-gradient(135deg, ${c.themeColor}33 0%, ${c.themeColor}10 100%)`
                      : 'linear-gradient(135deg, rgba(90,156,255,.15), rgba(155,111,232,.10))',
                  }}
                >
                  {c.iconEmoji ?? '📚'}
                </div>
                <div className="thumb-card-body">
                  <div className="thumb-card-title">{c.name}</div>
                  <div className="thumb-card-sub">د. {e.offering.teacher.firstName} {e.offering.teacher.lastName}</div>
                  <div className="mt-2">
                    <ProgressBar value={e.progressPct} color={c.themeColor ?? 'var(--accent)'} label="الإنجاز" />
                  </div>
                </div>
              </div>
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
                <td className="font-medium" style={{ color: 'var(--text)' }}>هندسة البرمجيات</td>
                <td>مشروع UML للتصميم</td>
                <td className="tbl-num">20 مايو</td>
                <td><Badge color="amber">جارٍ</Badge></td>
              </tr>
              <tr>
                <td className="font-medium" style={{ color: 'var(--text)' }}>شبكات الحاسوب</td>
                <td>تقرير بروتوكول TCP</td>
                <td className="tbl-num text-red">22 مايو</td>
                <td><Badge color="red">عاجل</Badge></td>
              </tr>
              <tr>
                <td className="font-medium" style={{ color: 'var(--text)' }}>نظم المعلومات</td>
                <td>قاعدة بيانات ERD</td>
                <td className="tbl-num text-green">28 مايو</td>
                <td><Badge color="green">متبقي وقت</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
