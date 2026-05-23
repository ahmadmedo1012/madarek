import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
  BookOpen, CheckCircle2, Award, Clock,
  Calendar, Bell, ChevronLeft,
  Cog, Cpu, Database, Network, Globe, Shield,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState, KpiSkeleton, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyEnrollments } from '../../hooks/useResources';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement);

// Map course codes/names to a meaningful Lucide icon — used everywhere.
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

export default function StudentDashboardPage() {
  const enrollments = useMyEnrollments();
  const isLoading = enrollments.isPending;
  const data = enrollments.data;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مرحباً بعودتك، أحمد</h1>
          <p className="page-subtitle">إليك نظرة موجزة على أدائك ومواعيدك القادمة.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>الفصل الدراسي · 2024 خريف</Badge>
        </div>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid-4">
          <MetricCard
            icon={BookOpen}
            label="مواد مسجَّلة"
            value={data?.length ?? 0}
            change="هذا الفصل"
            color="brand"
          />
          <MetricCard
            icon={CheckCircle2}
            label="نسبة الإنجاز"
            value={`${avgProgress(data)}%`}
            change="‏12% منذ الشهر الماضي"
            changeDirection="up"
            color="green"
          />
          <MetricCard
            icon={Award}
            label="المعدل التراكمي"
            value="3.4"
            change="من 4.0"
            color="gold"
          />
          <MetricCard
            icon={Clock}
            label="ساعات الدراسة"
            value="142"
            change="آخر 30 يوماً"
            color="purple"
          />
        </div>
      )}

      <div className="grid-2-1">
        {/* Weekly performance chart */}
        <Card title="الأداء الأسبوعي" subtitle="درجات النشاط اليومي خلال آخر سبعة أيام">
          <div style={{ height: 220, position: 'relative' }}>
            <Line
              data={{
                labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                datasets: [
                  {
                    label: 'الأداء %',
                    data: [62, 78, 55, 90, 71, 44, 83],
                    borderColor: 'var(--accent)',
                    backgroundColor: (ctx) => {
                      const chart = ctx.chart;
                      const { ctx: c, chartArea } = chart;
                      if (!chartArea) return 'transparent';
                      const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                      grad.addColorStop(0, 'rgba(61,107,214,0.18)');
                      grad.addColorStop(1, 'rgba(61,107,214,0.00)');
                      return grad;
                    },
                    borderWidth: 2,
                    pointBackgroundColor: 'var(--accent)',
                    pointBorderColor: 'transparent',
                    pointBorderWidth: 0,
                    pointRadius: 3,
                    pointHoverRadius: 5,
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
                    backgroundColor: 'var(--surface-1)',
                    borderColor: 'var(--border-strong)',
                    borderWidth: 1,
                    titleColor: 'var(--text)',
                    bodyColor: 'var(--text-muted)',
                    padding: 10,
                    cornerRadius: 8,
                    titleFont: { family: 'IBM Plex Sans Arabic', size: 12 },
                    bodyFont: { family: 'IBM Plex Sans Arabic', size: 12 },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: 'var(--chart-text)', font: { size: 11, family: 'IBM Plex Sans Arabic' } },
                  },
                  y: {
                    grid: { color: 'var(--chart-grid)' },
                    border: { display: false },
                    ticks: { color: 'var(--chart-text)', font: { size: 11 }, stepSize: 25 },
                    min: 0,
                    max: 100,
                  },
                },
              }}
            />
          </div>
        </Card>

        {/* Subject completion donut */}
        <Card title="توزّع الإنجاز" subtitle="نسبة كل مادة من إجمالي تقدمك">
          <div style={{ height: 220, position: 'relative' }}>
            {isLoading ? (
              <LoadingState />
            ) : !data?.length ? (
              <EmptyState icon={BookOpen} title="لا توجد مواد مسجَّلة" />
            ) : (
              <Doughnut
                data={{
                  labels: data.map((e) => e.offering.course.name),
                  datasets: [
                    {
                      data: data.map((e) => Math.max(e.progressPct, 1)),
                      backgroundColor: [
                        '#3D6BD6', '#5B3CA8', '#3DD68C', '#F5A623',
                        '#2EC4B6', '#F06292',
                      ],
                      borderColor: 'var(--surface-1)',
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: 'var(--text-muted)',
                        font: { family: 'IBM Plex Sans Arabic', size: 11 },
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        padding: 8,
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid-2-1">
        {/* Per-subject progress */}
        <Card title="تقدّمك في كل مادة">
          {isLoading ? (
            <ListSkeleton rows={6} />
          ) : enrollments.isError ? (
            <ErrorState />
          ) : !data?.length ? (
            <EmptyState icon={BookOpen} title="لم تُسجَّل في أي مادة بعد" />
          ) : (
            <div className="flex-col gap-4">
              {data.map((e) => {
                const Cmp = courseIcon(e.offering.course.code ?? e.offering.course.name);
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="metric-icon" style={{ color: e.offering.course.themeColor ?? 'var(--accent)' }}>
                      <Icon icon={Cmp} size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <ProgressBar
                        value={e.progressPct}
                        color={e.offering.course.themeColor ?? 'var(--accent)'}
                        label={e.offering.course.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Today's plan */}
        <Card title="جدول اليوم" icon={Calendar}>
          <div className="flex-col gap-2">
            <TodayItem time="08:00" name="نظم المعلومات" room="قاعة 301" status="next" />
            <TodayItem time="10:00" name="قواعد البيانات" room="معمل 2" />
            <TodayItem time="13:00" name="هندسة البرمجيات" room="قاعة 205" />
            <TodayItem time="15:00" name="ساعة مكتبية" room="مكتب الأستاذ" muted />
          </div>
        </Card>
      </div>

      {/* Recent results */}
      <Card title="آخر النتائج" subtitle="الاختبارات والتقييمات المسجَّلة هذا الشهر">
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

      {/* Notifications strip */}
      <Card title="إشعارات حديثة" icon={Bell} actions={
        <button type="button" className="btn ghost sm">عرض الكل <Icon icon={ChevronLeft} size={13} /></button>
      }>
        <div className="flex-col gap-2">
          <div className="alert amber">
            <span className="alert-dot" />
            <div className="alert-body">
              <div className="alert-title">موعد تسليم مشروع UML</div>
              <div className="alert-desc">هندسة البرمجيات · يستحق خلال 4 أيام</div>
            </div>
            <Badge color="amber">قريب</Badge>
          </div>
          <div className="alert red">
            <span className="alert-dot" />
            <div className="alert-body">
              <div className="alert-title">تقرير TCP/IP</div>
              <div className="alert-desc">شبكات الحاسوب · يستحق غداً</div>
            </div>
            <Badge color="red">عاجل</Badge>
          </div>
          <div className="alert">
            <span className="alert-dot" />
            <div className="alert-body">
              <div className="alert-title">قاعدة بيانات ERD</div>
              <div className="alert-desc">نظم المعلومات · يستحق خلال أسبوع</div>
            </div>
            <Badge>قيد التنفيذ</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TodayItem({
  time, name, room, status, muted,
}: {
  time: string; name: string; room: string; status?: 'next'; muted?: boolean;
}) {
  return (
    <div className="list-row">
      <span className="list-row-meta">{time}</span>
      <div className="list-row-body">
        <div className="list-row-title" style={muted ? { color: 'var(--text-muted)' } : undefined}>{name}</div>
        <div className="list-row-sub">{room}</div>
      </div>
      {status === 'next' && <Badge color="brand">القادم</Badge>}
    </div>
  );
}

function RecentResult({ name, type, score, date }: { name: string; type: string; score: number; date: string }) {
  const cls = score >= 85 ? 'green' : score >= 70 ? 'brand' : score >= 60 ? 'amber' : 'red';
  const lbl = score >= 85 ? 'ممتاز' : score >= 70 ? 'جيد جداً' : score >= 60 ? 'مقبول' : 'ضعيف';
  return (
    <tr>
      <td className="tbl-strong">{name}</td>
      <td>{type}</td>
      <td className="tbl-num">{score}<span style={{ color: 'var(--text-subtle)' }}>/100</span></td>
      <td><Badge color={cls as never}>{lbl}</Badge></td>
      <td className="text-subtle">{date}</td>
    </tr>
  );
}

function avgProgress(en: ReturnType<typeof useMyEnrollments>['data']) {
  if (!en?.length) return 0;
  return Math.round(en.reduce((s, e) => s + e.progressPct, 0) / en.length);
}
