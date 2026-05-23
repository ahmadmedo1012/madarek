import { useMyEnrollments } from '../../hooks/useResources';
import { Card, MetricCard, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';

export default function StudentCoursesPage() {
  const { data, isPending, isError } = useMyEnrollments();

  return (
    <div className="page">
      <div className="grid-4">
        <MetricCard label="📚 مواد مسجلة" value={data?.length ?? 0} change="هذا الفصل" color="blue" />
        <MetricCard
          label="✅ مكتملة"
          value={data?.filter((e) => e.progressPct >= 100).length ?? 0}
          change="بنجاح"
          color="green"
        />
        <MetricCard
          label="⏳ جارية"
          value={data?.filter((e) => e.progressPct > 0 && e.progressPct < 100).length ?? 0}
          change="في التقدم"
          color="amber"
        />
        <MetricCard
          label="⚠️ تحتاج اهتمام"
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
        <EmptyState title="لم تُسجَّل في أي مادة بعد" />
      ) : (
        <div className="grid-3">
          {data.map((e) => {
            const c = e.offering.course;
            return (
              <div className="course-card" key={e.id}>
                <div
                  className="course-thumb"
                  style={{ background: c.themeColor ? `${c.themeColor}26` : 'rgba(79,142,247,.15)' }}
                >
                  {c.iconEmoji ?? '📚'}
                </div>
                <div className="course-body">
                  <div className="course-name">{c.name}</div>
                  <div className="course-prof">
                    د. {e.offering.teacher.firstName} {e.offering.teacher.lastName}
                  </div>
                  <div className="course-prog-lbl">
                    <span>الإنجاز</span>
                    <span>{e.progressPct}%</span>
                  </div>
                  <ProgressBar value={e.progressPct} color={c.themeColor ?? 'var(--accent)'} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card title="📋 الواجبات القادمة" dotColor="var(--amber)">
        <div className="tbl-wrap">
          <table>
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
                <td>⚙️ هندسة البرمجيات</td>
                <td>مشروع UML التصميم</td>
                <td style={{ fontFamily: "'Space Mono', monospace" }}>20 مايو</td>
                <td><span className="badge badge-amber">جارٍ</span></td>
              </tr>
              <tr>
                <td>🌐 شبكات الحاسوب</td>
                <td>تقرير بروتوكول TCP</td>
                <td style={{ fontFamily: "'Space Mono', monospace", color: 'var(--red)' }}>22 مايو</td>
                <td><span className="badge badge-red">عاجل</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
