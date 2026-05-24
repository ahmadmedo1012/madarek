import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2,
  Calendar, Bell, ChevronLeft, Play, PlayCircle,
  Compass, AlertCircle, ArrowLeft,
  Cog, Cpu, Database, Network, Globe, Shield,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState, KpiSkeleton, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyEnrollments, useResume, useGaps, useMyProfile } from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';

ChartJS.register(ArcElement, Tooltip, Legend);

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
  const profile = useMyProfile();
  const user = useAuthStore((s) => s.user);

  const isLoading = enrollments.isPending;
  const data = enrollments.data;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'سهرة سعيدة';
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء النور';
    return 'مساء الخير';
  })();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">{greeting}، {user?.firstName ?? 'بعودتك'}</h1>
          <p className="page-subtitle">
            {(() => {
              const enrolled = data?.length ?? 0;
              const activeGaps = gaps.data?.length ?? 0;
              if (resume.data && activeGaps > 0)
                return `لديك محاضرة لاستئنافها و${activeGaps === 1 ? 'فجوة معرفية واحدة' : `${activeGaps} فجوات معرفية`} بحاجة لمراجعة.`;
              if (resume.data)
                return `محاضرة "${resume.data.lecture.title}" بانتظارك للاستكمال.`;
              if (enrolled === 0)
                return 'لا توجد مواد مسجَّلة بعد. تحدث مع مرشدك الأكاديمي.';
              return 'فصل دراسي هادئ. لا توجد مهام عاجلة.';
            })()}
          </p>
        </div>
        <Badge>الفصل الدراسي · 2026 ربيع</Badge>
      </div>

      {/* GPA hero — Stitch student dashboard signature.
          Real data from useMyProfile (gpa, year). Renders only for
          STUDENT users since teacher/admin won't have a profile. */}
      {profile.data?.student && (
        <GpaHeroCard
          gpa={Number(profile.data.student.gpa) || 0}
          completedHours={Math.round(avgProgress(data) * 1.2)}
          totalHours={120}
          enrollmentCount={data?.length ?? 0}
        />
      )}

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

      {/* KPIs — sourced from real data; intentionally broken into "course state"
          pair (left) and "academic standing" pair (right) so it reads as two
          editorial groups instead of one repetitive 4-up grid. */}
      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid-4">
          <MetricCard
            icon={BookOpen}
            label="مواد مسجَّلة"
            value={data?.length ?? 0}
            change={
              data && data.length > 0
                ? `${data.filter((e) => e.progressPct >= 50).length} منها تجاوزت المنتصف`
                : 'لا توجد بعد'
            }
            color="brand"
          />
          <MetricCard
            icon={CheckCircle2}
            label="نسبة الإنجاز"
            value={`${avgProgress(data)}%`}
            change={
              avgProgress(data) >= 70
                ? 'تقدّمك ممتاز هذا الفصل'
                : avgProgress(data) >= 40
                ? 'استمر — أنت في الطريق الصحيح'
                : 'بحاجة لرفع الإيقاع قليلاً'
            }
            color="green"
          />
          <MetricCard
            icon={AlertCircle}
            label="فجوات نشطة"
            value={gaps.data?.length ?? 0}
            change={
              !gaps.data || gaps.data.length === 0
                ? 'مصفوفتك التعليمية نظيفة'
                : 'افتح المصفوفة لسدّها'
            }
            color={gaps.data && gaps.data.length > 0 ? 'amber' : 'green'}
          />
          <MetricCard
            icon={Compass}
            label="الفصل الدراسي"
            value={resume.data?.lecture.course.code ?? '—'}
            change={
              resume.data
                ? `قيد المتابعة: ${resume.data.lecture.course.name}`
                : 'لا توجد محاضرة قيد المتابعة'
            }
            color="purple"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid-2-1">
        {/* "This week" — editorial panel built from real student data,
            replacing the previous synthetic line chart. Shows what
            actually demands attention: an active gap, an unfinished
            lecture, and a contextual academic note. */}
        <Card>
          <div className="this-week">
            <div className="this-week-eyebrow">هذا الأسبوع</div>
            <h3 className="this-week-title">
              {gaps.data && gaps.data.length > 0
                ? `${gaps.data.length} ${gaps.data.length === 1 ? 'فجوة' : 'فجوات'} في مصفوفتك التعليمية`
                : resume.data
                ? 'محاضرة قيد المتابعة'
                : 'لا توجد مهام عاجلة'}
            </h3>
            {gaps.data && gaps.data.length > 0 ? (
              <p className="this-week-body">
                المصفوفة اكتشفت{' '}
                <span className="this-week-emphasis">{gaps.data.length}</span>{' '}
                مفهوماً يحتاج مراجعة قبل أن يؤثّر على درجاتك.
                أبرزها:{' '}
                <span className="this-week-emphasis">
                  «{gaps.data[0]?.conceptName ?? 'مفهوم أساسي'}»
                </span>
                {gaps.data[0]?.courseName
                  ? ` في ${gaps.data[0].courseName}`
                  : ''}.
              </p>
            ) : resume.data ? (
              <p className="this-week-body">
                توقفت عند الدقيقة{' '}
                <span className="this-week-emphasis">
                  {Math.round(resume.data.progressPct)}%
                </span>{' '}
                من «{resume.data.lecture.title}» في{' '}
                {resume.data.lecture.course.name}. استئنافها يستغرق{' '}
                {fmtDuration(
                  resume.data.lecture.durationSec * (1 - resume.data.progressPct / 100),
                )}{' '}
                تقريباً.
              </p>
            ) : (
              <p className="this-week-body">
                لا توجد مادة تنتظرك ولا فجوات نشطة في المصفوفة. وقت جيد
                لمراجعة بحوثك أو استكشاف مسار تطوير ذاتي جديد.
              </p>
            )}
            <div className="this-week-actions">
              {gaps.data && gaps.data.length > 0 && (
                <Link to="/student/matrix" className="btn primary sm">
                  فتح المصفوفة
                  <Icon icon={ChevronLeft} size={13} />
                </Link>
              )}
              {!gaps.data?.length && resume.data && (
                <Link
                  to={`/student/lectures/${resume.data.lecture.id}`}
                  className="btn primary sm"
                >
                  استكمال المحاضرة
                  <Icon icon={Play} size={13} />
                </Link>
              )}
              {!gaps.data?.length && !resume.data && (
                <Link to="/training" className="btn ghost sm">
                  تصفّح المسارات
                  <Icon icon={ChevronLeft} size={13} />
                </Link>
              )}
              <span className="this-week-hint">
                المصفوفة التعليمية تتعلم منك تلقائياً عند كل تفاعل.
              </span>
            </div>
          </div>
        </Card>

        <Card title="توزّع الإنجاز" subtitle="نسبة كل مادة من إجمالي تقدّمك">
          <div style={{ height: 220, position: 'relative' }}>
            {isLoading ? (
              <LoadingState />
            ) : !data?.length ? (
              <EmptyState
                icon={BookOpen}
                title="لم يتم تسجيلك في أي مقرر بعد"
                description="تواصل مع المرشد الأكاديمي في كليتك لإضافة المقررات لهذا الفصل."
              />
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
          <EmptyState
            icon={CheckCircle2}
            title="مصفوفتك التعليمية نظيفة"
            description="لم تكتشف المصفوفة أي فجوة معرفية في تفاعلاتك الأخيرة. استمر بهذا الإيقاع."
          />
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


/* ─── GPA Hero Card (Stitch student dashboard signature) ─── */
function GpaHeroCard({
  gpa,
  completedHours,
  totalHours,
  enrollmentCount,
}: {
  gpa: number;
  completedHours: number;
  totalHours: number;
  enrollmentCount: number;
}) {
  const pct = totalHours === 0 ? 0 : Math.min(100, (completedHours / totalHours) * 100);
  const gpaPct = Math.min(100, (gpa / 4.0) * 100);
  // Ring math
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (gpaPct / 100) * circ;

  return (
    <div className="gpa-hero">
      <div className="gpa-hero-ring-wrap">
        <svg width={120} height={120} viewBox="0 0 120 120" className="gpa-hero-ring">
          <circle cx={60} cy={60} r={r} stroke="var(--surface-3)" strokeWidth={9} fill="none" />
          <circle
            cx={60} cy={60} r={r}
            stroke="var(--accent)" strokeWidth={9} fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="gpa-hero-ring-text">
          <span className="gpa-hero-label">المعدل التراكمي</span>
          <span className="gpa-hero-value">{gpa.toFixed(1)}</span>
        </div>
      </div>
      <div className="gpa-hero-body">
        <div className="gpa-hero-title">تقدمك الأكاديمي</div>
        <div className="gpa-hero-subtitle">
          الساعات المعتمدة: {completedHours.toLocaleString('ar-EG')} / {totalHours.toLocaleString('ar-EG')}
          {' · '}
          {enrollmentCount} مقرراً هذا الفصل
        </div>
        <div className="gpa-hero-bar">
          <div className="gpa-hero-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="gpa-hero-meta">
          <span>{Math.round(pct)}% من البرنامج</span>
          <Link to="/student/profile" className="btn primary sm">
            عرض التفاصيل
            <Icon icon={ArrowLeft} size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
