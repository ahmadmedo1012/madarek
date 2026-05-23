import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, MetricCard, ProgressBar, Badge } from '../../components/primitives';
import { useMyEnrollments } from '../../hooks/useResources';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function StudentDashboardPage() {
  const enrollments = useMyEnrollments();

  return (
    <div className="page">
      {/* Top KPIs */}
      <div className="grid-4">
        <MetricCard label="📖 المواد المسجلة" value={enrollments.data?.length ?? 0} change={<><span className="up">↑</span> هذا الفصل</>} color="blue" />
        <MetricCard
          label="✅ نسبة الإنجاز"
          value={`${avgProgress(enrollments.data)}%`}
          change={<><span className="up">↑</span> 12% هذا الشهر</>}
          color="green"
        />
        <MetricCard label="🏅 المعدل التراكمي" value="3.4" change={<><span className="up">↑</span> 0.2 نقطة</>} color="amber" />
        <MetricCard label="⏱️ ساعات الدراسة" value="142" change={<><span className="dn">↓</span> 8 ساعة هذا الأسبوع</>} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid-2-1">
        <Card title="الأداء الأسبوعي">
          <Line
            data={{
              labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
              datasets: [
                {
                  label: 'الأداء %',
                  data: [62, 78, 55, 90, 71, 44, 83],
                  borderColor: '#4F8EF7',
                  backgroundColor: 'rgba(79,142,247,0.08)',
                  borderWidth: 2,
                  pointBackgroundColor: '#4F8EF7',
                  pointRadius: 4,
                  tension: 0.4,
                  fill: true,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#525A78', font: { size: 10, family: 'IBM Plex Sans Arabic' } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#525A78', font: { size: 10 } }, min: 0, max: 100 },
              },
            }}
            height={140}
          />
        </Card>

        <Card title="الإنجاز لكل مادة" dotColor="var(--green)">
          {enrollments.isPending ? (
            <LoadingState />
          ) : enrollments.isError ? (
            <ErrorState />
          ) : !enrollments.data?.length ? (
            <EmptyState title="لم تُسجَّل في أي مادة بعد" />
          ) : (
            enrollments.data.map((e) => (
              <div className="prog-row" key={e.id}>
                <div className="prog-head">
                  <span>{e.offering.course.iconEmoji ?? ''} {e.offering.course.name}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", color: e.offering.course.themeColor ?? 'var(--accent)' }}>
                    {e.progressPct}%
                  </span>
                </div>
                <ProgressBar value={e.progressPct} color={e.offering.course.themeColor ?? 'var(--accent)'} />
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Recent results */}
      <Card title="آخر النتائج والاختبارات" dotColor="var(--amber)">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>المادة</th>
                <th>النوع</th>
                <th>الدرجة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>هندسة البرمجيات</td>
                <td>اختبار</td>
                <td style={{ fontFamily: "'Space Mono', monospace", color: 'var(--accent)' }}>88/100</td>
                <td><Badge color="green">ممتاز</Badge></td>
                <td>15 مايو</td>
              </tr>
              <tr>
                <td>نظم المعلومات</td>
                <td>واجب</td>
                <td style={{ fontFamily: "'Space Mono', monospace", color: 'var(--accent)' }}>92/100</td>
                <td><Badge color="green">ممتاز</Badge></td>
                <td>10 مايو</td>
              </tr>
              <tr>
                <td>شبكات الحاسوب</td>
                <td>اختبار</td>
                <td style={{ fontFamily: "'Space Mono', monospace", color: 'var(--accent)' }}>61/100</td>
                <td><Badge color="amber">مقبول</Badge></td>
                <td>8 مايو</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function avgProgress(en: ReturnType<typeof useMyEnrollments>['data']) {
  if (!en?.length) return 0;
  return Math.round(en.reduce((s, e) => s + e.progressPct, 0) / en.length);
}
