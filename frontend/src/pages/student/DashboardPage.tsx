import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import {
  BookOpen, CheckCircle2, Award, Clock,
  TrendingUp, Brain, Lightbulb, Calendar,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { useMyEnrollments } from '../../hooks/useResources';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function StudentDashboardPage() {
  const enrollments = useMyEnrollments();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مرحباً بعودتك 👋</h1>
          <p className="page-subtitle">إليك نظرة عامة سريعة على أدائك الأكاديمي هذا الأسبوع.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="المواد المسجلة"
          value={enrollments.data?.length ?? '—'}
          change="هذا الفصل"
          color="blue"
        />
        <MetricCard
          icon={CheckCircle2}
          label="نسبة الإنجاز"
          value={`${avgProgress(enrollments.data)}%`}
          change="‏12% هذا الشهر"
          changeDirection="up"
          color="green"
        />
        <MetricCard
          icon={Award}
          label="المعدل التراكمي"
          value="3.4"
          change="‏0.2 نقطة"
          changeDirection="up"
          color="amber"
        />
        <MetricCard
          icon={Clock}
          label="ساعات الدراسة"
          value="142"
          change="‏8 ساعات هذا الأسبوع"
          changeDirection="dn"
          color="purple"
        />
      </div>

      <div className="grid-2-1">
        {/* Weekly chart */}
        <Card title="الأداء الأسبوعي" subtitle="آخر سبعة أيام" icon={TrendingUp}>
          <div style={{ height: 240, position: 'relative' }}>
            <Line
              data={{
                labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                datasets: [
                  {
                    label: 'الأداء %',
                    data: [62, 78, 55, 90, 71, 44, 83],
                    borderColor: '#5A9CFF',
                    backgroundColor: 'rgba(90,156,255,0.10)',
                    borderWidth: 2,
                    pointBackgroundColor: '#5A9CFF',
                    pointBorderColor: '#0F1525',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#0F1525',
                    borderColor: 'rgba(255,255,255,.1)',
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { family: 'IBM Plex Sans Arabic', size: 12 },
                    bodyFont: { family: 'IBM Plex Sans Arabic', size: 12 },
                  },
                },
                scales: {
                  x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#6A7290', font: { size: 10, family: 'IBM Plex Sans Arabic' } },
                  },
                  y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#6A7290', font: { size: 10 } },
                    min: 0,
                    max: 100,
                  },
                },
              }}
            />
          </div>
        </Card>

        {/* Per-subject progress */}
        <Card title="الإنجاز لكل مادة" icon={Brain}>
          {enrollments.isPending ? (
            <LoadingState />
          ) : enrollments.isError ? (
            <ErrorState />
          ) : !enrollments.data?.length ? (
            <EmptyState icon={BookOpen} title="لم تُسجَّل في أي مادة بعد" />
          ) : (
            <div className="flex-col gap-4">
              {enrollments.data.map((e) => (
                <ProgressBar
                  key={e.id}
                  value={e.progressPct}
                  color={e.offering.course.themeColor ?? 'var(--accent)'}
                  label={
                    <span className="flex items-center gap-2">
                      <span>{e.offering.course.name}</span>
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent results */}
      <Card title="آخر النتائج والاختبارات" subtitle="نتائجك في الأسبوعين الأخيرين" icon={Lightbulb}>
        <div className="tbl-wrap">
          <table className="tbl">
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
              <RecentResult name="هندسة البرمجيات" type="اختبار" score={88} date="15 مايو" />
              <RecentResult name="نظم المعلومات" type="واجب" score={92} date="10 مايو" />
              <RecentResult name="شبكات الحاسوب" type="اختبار" score={61} date="8 مايو" />
              <RecentResult name="تقنيات الإنترنت" type="امتحان" score={55} date="5 مايو" />
            </tbody>
          </table>
        </div>
      </Card>

      {/* Calendar / coming up */}
      <div className="grid-2">
        <Card title="القادم في جدولك" icon={Calendar}>
          <div className="flex-col gap-2">
            <div className="list-row">
              <span className="list-row-meta">8:00 — 9:30</span>
              <span className="list-row-stripe" style={{ background: 'var(--accent)' }} />
              <div className="list-row-body">
                <div className="list-row-title">نظم المعلومات</div>
                <div className="list-row-sub">قاعة 301 · د. محمد الطاهر</div>
              </div>
              <Badge color="blue">الأحد</Badge>
            </div>
            <div className="list-row">
              <span className="list-row-meta">10:00 — 11:30</span>
              <span className="list-row-stripe" style={{ background: 'var(--green)' }} />
              <div className="list-row-body">
                <div className="list-row-title">قواعد البيانات</div>
                <div className="list-row-sub">معمل 2 · د. فاطمة العجيلي</div>
              </div>
              <Badge color="green">الأحد</Badge>
            </div>
            <div className="list-row">
              <span className="list-row-meta">9:00 — 10:30</span>
              <span className="list-row-stripe" style={{ background: 'var(--purple)' }} />
              <div className="list-row-body">
                <div className="list-row-title">هندسة البرمجيات</div>
                <div className="list-row-sub">قاعة 205 · د. عياض الهنقاري</div>
              </div>
              <Badge color="purple">الاثنين</Badge>
            </div>
          </div>
        </Card>

        <Card title="مهام تنتظرك" icon={Lightbulb}>
          <div className="flex-col gap-2">
            <div className="alert amber">
              <span className="alert-icon"><Lightbulb size={16} /></span>
              <div className="alert-body">
                <div className="alert-title">مشروع UML</div>
                <div className="alert-desc">هندسة البرمجيات · يستحق خلال 4 أيام</div>
              </div>
            </div>
            <div className="alert red">
              <span className="alert-icon"><Lightbulb size={16} /></span>
              <div className="alert-body">
                <div className="alert-title">تقرير TCP/IP</div>
                <div className="alert-desc">شبكات الحاسوب · يستحق غداً</div>
              </div>
            </div>
            <div className="alert blue">
              <span className="alert-icon"><Lightbulb size={16} /></span>
              <div className="alert-body">
                <div className="alert-title">قاعدة بيانات ERD</div>
                <div className="alert-desc">نظم المعلومات · يستحق خلال أسبوع</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RecentResult({ name, type, score, date }: { name: string; type: string; score: number; date: string }) {
  const cls = score >= 85 ? 'green' : score >= 70 ? 'blue' : score >= 60 ? 'amber' : 'red';
  const lbl = score >= 85 ? 'ممتاز' : score >= 70 ? 'جيد' : score >= 60 ? 'مقبول' : 'ضعيف';
  return (
    <tr>
      <td className="font-medium" style={{ color: 'var(--text)' }}>{name}</td>
      <td>{type}</td>
      <td className="tbl-num" style={{ color: 'var(--accent)' }}>{score}/100</td>
      <td><Badge color={cls as never}>{lbl}</Badge></td>
      <td className="text-subtle">{date}</td>
    </tr>
  );
}

function avgProgress(en: ReturnType<typeof useMyEnrollments>['data']) {
  if (!en?.length) return 0;
  return Math.round(en.reduce((s, e) => s + e.progressPct, 0) / en.length);
}
