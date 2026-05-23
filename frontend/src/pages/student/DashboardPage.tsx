import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, Award, Clock,
  Calendar, Bell, ChevronLeft, Play, PlayCircle,
  Compass, AlertCircle, ArrowLeft,
  Cog, Cpu, Database, Network, Globe, Shield,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState, KpiSkeleton, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyEnrollments, useResume, useGaps } from '../../hooks/useResources';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement);

// Map course code to a meaningful Lucide icon — used everywhere.
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

function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  return `${m} دقيقة`;
}

export default function StudentDashboardPage() {
  const enrollments = useMyEnrollments();
  const resume = useResume();
  const gaps = useGaps();

  const isLoading = enrollments.isPending;
  const data = enrollments.data;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مرحباً بعودتك، أحمد</h1>
          <p className="page-subtitle">إليك نظرة موجزة على أدائك ومواعيدك القادمة.</p>
        </div>
        <Badge>الفصل الدراسي · 2024 خريف</Badge>
      </div>

      {/* Resume Learning strip — most important next action */}
      {resume.data && (
        <ResumeStrip
          mode={resume.data.mode}
          progressPct={resume.data.progressPct}
          title={resume.data.lecture.title}
          courseName={resume.data.lecture.course.name}
          courseCode={resume.data.lecture.course.code}
          durationSec={resume.data.lecture.durationSec}
          courseColor={resume.data.lecture.course.themeColor ?? undefined}
          courseId={resume.data.lecture.course.id}
          lectureId={resume.data.lecture.id}
        />
      )}

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

      {/* Charts row */}
      <div className="grid-2-1">
        <Card title="الأداء الأسبوعي" subtitle="درجات النشاط اليومي خلال آخر سبعة أيام">
          <div style={{ height: 220, position: 'relative' }}>
            <Line
              data={{
                labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                datasets: [
                  {
                    label: 'الأداء %',
                    data: [62, 78, 55, 90, 71, 44, 83],
                    borderColor: 'rgb(61,107,214)',
                    backgroundColor: (ctx) => {
                      const chart = ctx.chart;
                      const { ctx: c, chartArea } = chart;
                      if (!chartArea) return 'transparent';
                      const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                      grad.addColorStop(0, 'rgba(61,107,214,0.20)');
                      grad.addColorStop(1, 'rgba(61,107,214,0.00)');
                      return grad;
                    },
                    borderWidth: 2,
                    pointBackgroundColor: 'rgb(61,107,214)',
                    pointBorderColor: 'transparent',
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
                    backgroundColor: '#11131A',
                    borderColor: 'rgba(255,255,255,.12)',
                    borderWidth: 1,
                    titleColor: '#E7E9EE',
                    bodyColor: '#9EA4B8',
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
                    ticks: { color: '#6A7088', font: { size: 11, family: 'IBM Plex Sans Arabic' } },
                  },
                  y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    border: { display: false },
                    ticks: { color: '#6A7088', font: { size: 11 }, stepSize: 25 },
                    min: 0,
                    max: 100,
                  },
                },
              }}
            />
          </div>
        </Card>

        <Card title="توزّع الإنجاز" subtitle="نسبة كل مادة من إجمالي تقدّمك">
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
                      borderColor: '#11131A',
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
                        color: '#9EA4B8',
                        font: { family: 'IBM Plex Sans Arabic', size: 11 },
                        boxWidth: 8, boxHeight: 8,
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

      {/* Two-column: progress and today */}
      <div className="grid-2-1">
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

        <Card title="جدول اليوم" icon={Calendar}>
          <div className="flex-col gap-2">
            <TodayItem time="08:00" name="نظم المعلومات" room="قاعة 301" status="next" />
            <TodayItem time="10:00" name="قواعد البيانات" room="معمل 2" />
            <TodayItem time="13:00" name="هندسة البرمجيات" room="قاعة 205" />
            <TodayItem time="15:00" name="ساعة مكتبية" room="مكتب الأستاذ" muted />
          </div>
        </Card>
      </div>

      {/* Top knowledge gaps — links to the matrix */}
      <Card
        title="فجواتك المعرفية"
        subtitle="مفاهيم بحاجة لمراجعة، مع توصيات الفيديوهات المناسبة"
        icon={Compass}
        actions={
          <Link to="/student/matrix" className="btn ghost sm">
            عرض المصفوفة كاملة
            <Icon icon={ArrowLeft} size={13} />
          </Link>
        }
      >
        {gaps.isPending ? (
          <ListSkeleton rows={3} />
        ) : gaps.isError ? (
          <ErrorState />
        ) : !gaps.data?.length ? (
          <EmptyState icon={CheckCircle2} title="لا توجد فجوات حالياً — أحسنت!" />
        ) : (
          <div className="flex-col gap-2">
            {gaps.data.slice(0, 3).map((g) => (
              <div className="list-row" key={g.conceptId}>
                <span style={{ color: 'var(--warning)' }}>
                  <Icon icon={AlertCircle} size={16} />
                </span>
                <div className="list-row-body">
                  <div className="list-row-title">{g.conceptName}</div>
                  <div className="list-row-sub">{g.courseName}</div>
                </div>
                <div className="font-mono text-xs" style={{ color: 'var(--warning)' }}>
                  {Math.round(g.level * 100)}%
                </div>
                {g.recommendedLectureId ? (
                  <Link to={`/student/lectures/${g.recommendedLectureId}`} className="btn outline sm">
                    <Icon icon={Play} size={13} />
                    سدّ الفجوة
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

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

      {/* Notifications */}
      <Card title="إشعارات حديثة" icon={Bell} actions={
        <button type="button" className="btn ghost sm">
          عرض الكل <Icon icon={ChevronLeft} size={13} />
        </button>
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

/* ─── Continue Learning strip ──────────────────────────── */
function ResumeStrip({
  mode, progressPct, title, courseName, courseCode, durationSec, courseColor, courseId, lectureId,
}: {
  mode: 'continue' | 'start';
  progressPct: number;
  title: string;
  courseName: string;
  courseCode: string;
  durationSec: number;
  courseColor?: string;
  courseId: string;
  lectureId: string;
}) {
  const Cmp = courseIcon(courseCode);
  void courseId;
  return (
    <div className="resume-strip">
      <div className="resume-thumb" style={{ background: courseColor ? `${courseColor}20` : 'var(--accent-soft)' }}>
        <span style={{ color: courseColor ?? 'var(--accent)' }}>
          <Icon icon={Cmp} size={26} />
        </span>
      </div>
      <div className="resume-info">
        <div className="resume-eyebrow">
          {mode === 'continue' ? 'متابعة المشاهدة' : 'ابدأ مادتك التالية'}
        </div>
        <div className="resume-title">{title}</div>
        <div className="resume-meta">
          <span>{courseName}</span>
          <span>·</span>
          <span className="font-mono">{fmtDuration(durationSec)}</span>
          {mode === 'continue' && (
            <>
              <span>·</span>
              <div className="resume-progress" aria-hidden>
                <div className="resume-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="font-mono text-xxs">{progressPct}%</span>
            </>
          )}
        </div>
      </div>
      <div className="resume-cta">
        <Link to={`/student/lectures/${lectureId}`} className="btn primary">
          <Icon icon={mode === 'continue' ? Play : PlayCircle} size={14} />
          {mode === 'continue' ? 'متابعة' : 'ابدأ الآن'}
        </Link>
      </div>
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
