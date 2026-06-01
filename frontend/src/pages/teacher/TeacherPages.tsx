import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BarChart3, ClipboardCheck, ClipboardList,
  AlertTriangle, Calendar, Upload,
  TrendingUp, MessageSquare, Send, FileText,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar, UserAvatar, SectionTitle } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import {
  useTeacherOfferings,
  useTeacherStudents,
  useOfferingAnalytics,
  useRecordAttendance,
  useTeacherMaterials,
  useTeacherAssignments,
  useMyMessages,
} from '../../hooks/useResources';
import ResearchReviewPage from './ResearchReviewPage';

/* The teacher dashboard now lives in TeacherDashboardPage.tsx
 * (social-media feed style). The previous KPI-grid version was
 * removed during the polish pass — it was unused and added 100 lines
 * of legacy code that didn't match the new visual language.
 */

/* ─── Generic placeholder structure ─── */
function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function TeacherSchedulePage() {
  const offsQ = useTeacherOfferings();
  if (offsQ.isPending) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="جارٍ التحميل…" /><LoadingState /></div>;
  if (offsQ.isError) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="" /><ErrorState error={offsQ.error} onRetry={() => offsQ.refetch()} /></div>;

  // Group all schedule slots by dayOfWeek across the teacher's offerings.
  const offerings = offsQ.data ?? [];
  type Slot = { startTime: string; endTime: string; courseName: string; courseCode: string; room: string | null; enrolled: number };
  const byDay: Record<number, Slot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const o of offerings) {
    for (const slot of o.schedule) {
      byDay[slot.dayOfWeek]?.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        courseName: o.course.name,
        courseCode: o.course.code,
        room: slot.room ?? o.room ?? null,
        enrolled: o._count.enrollments,
      });
    }
  }
  for (const list of Object.values(byDay)) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const days = Object.entries(byDay).map(([dow, items]) => ({ dow: Number(dow), items })).filter((d) => d.items.length > 0);

  return (
    <div className="page">
      <PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." />
      {days.length === 0 ? (
        <EmptyState
          title="لا يوجد جدول مسجَّل"
          description="ستظهر محاضراتك هنا فور تسجيل الجداول لمقرّراتك من قِبَل الإدارة."
        />
      ) : (
        <Card title="الأسبوع" icon={Calendar}>
          <div className="flex-col gap-3">
            {days.map((d) => (
              <div key={d.dow}>
                <SectionTitle>{DAY_NAMES_AR[d.dow]}</SectionTitle>
                <div className="flex-col">
                  {d.items.map((it, i) => (
                    <div key={i} className="list-row">
                      <span className="list-row-meta">{it.startTime} — {it.endTime}</span>
                      <div className="list-row-body">
                        <div className="list-row-title">{it.courseName}</div>
                        <div className="list-row-sub">
                          {it.room ? `${it.room} · ` : ''}
                          {it.enrolled} طالب
                        </div>
                      </div>
                      <Badge>{it.courseCode}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

type AttStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
const ATT_OPTIONS: Array<{ v: AttStatus; label: string; success: boolean; warning: boolean; danger: boolean }> = [
  { v: 'PRESENT', label: 'حاضر', success: true,  warning: false, danger: false },
  { v: 'LATE',    label: 'متأخّر', success: false, warning: true,  danger: false },
  { v: 'ABSENT',  label: 'غائب',  success: false, warning: false, danger: true },
];

export function AttendancePage() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const [offeringId, setOfferingId] = useState<string>('');
  const effectiveOfferingId = offeringId || offerings[0]?.id || '';
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const record = useRecordAttendance();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(today);
  const [topic, setTopic] = useState<string>('');
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttStatus>>({});

  const students = stuQ.data ?? [];
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;

  const counts = useMemo(() => {
    let p = 0, l = 0, a = 0;
    for (const s of students) {
      const st = statusByStudent[s.studentId] ?? 'PRESENT';
      if (st === 'PRESENT') p++;
      else if (st === 'LATE') l++;
      else if (st === 'ABSENT') a++;
    }
    return { p, l, a, total: students.length };
  }, [students, statusByStudent]);

  const onSave = () => {
    if (!effectiveOfferingId || students.length === 0) return;
    record.mutate({
      offeringId: effectiveOfferingId,
      date: new Date(date).toISOString(),
      topic: topic || undefined,
      records: students.map((s) => ({
        studentId: s.studentId,
        status: statusByStudent[s.studentId] ?? 'PRESENT',
      })),
    }, {
      onSuccess: () => { /* toast UX would be nice but keeps the change minimal */ },
    });
  };

  return (
    <div className="page">
      <PageHeader
        title="الحضور والغياب"
        subtitle="سجِّل الحضور لكلّ محاضرة. يحفظ سجلّاً واحداً لكلّ تاريخ في قاعدة البيانات."
        actions={
          <button
            type="button"
            className="btn primary"
            onClick={onSave}
            disabled={!effectiveOfferingId || students.length === 0 || record.isPending}
          >
            {record.isPending ? 'جارٍ الحفظ…' : 'حفظ السجلّ'}
          </button>
        }
      />

      <Card title="الجلسة" icon={Calendar}>
        <div className="grid-3" style={{ gap: 'var(--sp-3)' }}>
          <div className="comp-form-field">
            <label>المقرّر</label>
            <select className="auth-input" value={effectiveOfferingId} onChange={(e) => setOfferingId(e.target.value)}>
              {offerings.length === 0 && <option value="">— لا توجد عروض —</option>}
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
              ))}
            </select>
          </div>
          <div className="comp-form-field">
            <label>تاريخ الجلسة</label>
            <input type="date" className="auth-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="comp-form-field">
            <label>الموضوع (اختياريّ)</label>
            <input type="text" className="auth-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: مقدّمة في UML" />
          </div>
        </div>
      </Card>

      <div className="grid-2-1">
        <Card title={offering ? `طلّاب ${offering.course.name}` : 'الطلّاب'} icon={ClipboardCheck}>
          {!effectiveOfferingId ? (
            <EmptyState title="لا توجد مقرّرات" description="ستظهر المقرّرات هنا حين تُسنَد إليك." />
          ) : stuQ.isPending ? (
            <LoadingState />
          ) : stuQ.isError ? (
            <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
          ) : students.length === 0 ? (
            <EmptyState title="لا يوجد طلّاب" description="لا توجد تسجيلات نشطة في هذا المقرّر بعد." />
          ) : (
            <div className="flex-col gap-2">
              {students.map((s) => {
                const status = statusByStudent[s.studentId] ?? 'PRESENT';
                return (
                  <div key={s.studentId} className="list-row">
                    <UserAvatar
                      initials={s.avatarInitials ?? s.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                      color={s.avatarColor ?? undefined}
                      size={32}
                    />
                    <div className="list-row-body">
                      <div className="list-row-title">{s.name}</div>
                      <div className="list-row-sub font-mono">{s.universityId}</div>
                    </div>
                    <div className="flex gap-1">
                      {ATT_OPTIONS.map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          className="btn sm"
                          onClick={() => setStatusByStudent({ ...statusByStudent, [s.studentId]: opt.v })}
                          style={status === opt.v ? {
                            background:
                              opt.success ? 'var(--success-soft)' :
                              opt.warning ? 'var(--warning-soft)' : 'var(--danger-soft)',
                            color:
                              opt.success ? 'var(--success)' :
                              opt.warning ? 'var(--warning)' : 'var(--danger)',
                            borderColor: 'transparent',
                          } : undefined}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="إحصائيّات الجلسة">
          <div className="flex-col gap-4">
            <ProgressBar value={counts.total > 0 ? Math.round((counts.p / counts.total) * 100) : 0} label={`الحضور (${counts.p})`} color="var(--success)" />
            <ProgressBar value={counts.total > 0 ? Math.round((counts.l / counts.total) * 100) : 0} label={`التأخّر (${counts.l})`} color="var(--warning)" />
            <ProgressBar value={counts.total > 0 ? Math.round((counts.a / counts.total) * 100) : 0} label={`الغياب (${counts.a})`} color="var(--danger)" />
          </div>
          {record.isError && (
            <div className="auth-error" style={{ marginBlockStart: 'var(--sp-3)' }}>تعذَّر حفظ السجلّ. حاول مجدداً.</div>
          )}
          {record.isSuccess && (
            <div style={{ marginBlockStart: 'var(--sp-3)', padding: 'var(--sp-2)', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-xs)' }}>
              تمّ حفظ سجلّ الحضور.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function GradesPage() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const [offeringId, setOfferingId] = useState<string>('');
  const effectiveOfferingId = offeringId || offerings[0]?.id || '';
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;

  return (
    <div className="page">
      <PageHeader
        title="درجات الطلّاب"
        subtitle="نظرة على متوسّط درجات طلّاب المقرّر الحاليّ."
      />

      <Card title="المقرّر">
        <select
          className="auth-input"
          style={{ maxWidth: 360 }}
          value={effectiveOfferingId}
          onChange={(e) => setOfferingId(e.target.value)}
        >
          {offerings.length === 0 && <option value="">— لا توجد عروض —</option>}
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
          ))}
        </select>
      </Card>

      <Card
        title={offering ? `${offering.course.name} · ${offering.course.code}` : 'الدرجات'}
        icon={ClipboardList}
      >
        {!effectiveOfferingId ? (
          <EmptyState title="اختر مقرّراً" />
        ) : stuQ.isPending ? (
          <LoadingState />
        ) : stuQ.isError ? (
          <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
        ) : (stuQ.data ?? []).length === 0 ? (
          <EmptyState title="لا يوجد طلّاب" description="لا توجد تسجيلات في هذا المقرّر بعد." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الرقم الجامعيّ</th>
                  <th>متوسّط الدرجات</th>
                  <th>الحضور</th>
                  <th>التقدير</th>
                </tr>
              </thead>
              <tbody>
                {(stuQ.data ?? []).map((s) => {
                  const total = s.avgGrade;
                  const grade = total >= 85 ? { l: 'ممتاز', c: 'green' as const } :
                                total >= 75 ? { l: 'جيّد جدّاً', c: 'brand' as const } :
                                total >= 65 ? { l: 'جيّد', c: 'amber' as const } :
                                total >= 50 ? { l: 'مقبول', c: 'amber' as const } :
                                { l: 'ضعيف', c: 'red' as const };
                  return (
                    <tr key={s.studentId}>
                      <td className="tbl-strong">{s.name}</td>
                      <td className="font-mono text-xs">{s.universityId}</td>
                      <td className="tbl-num">{s.avgGrade}</td>
                      <td className="tbl-num">{s.attendancePct}%</td>
                      <td><Badge color={grade.c}>{grade.l}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0', lineHeight: 1.7 }}>
          إدخال الدرجات الفصليّة (الاختبار 1، الاختبار 2، المشروع، النهائيّ) قيد التطوير.
          حالياً تُعرض الدرجات المرصودة من واجبات المقرّر.{' '}
          <Link to="/teacher/intelligence" className="auth-register-link">شاهد الذكاء الأكاديميّ</Link>
          {' '}للحصول على تحليل أعمق.
        </p>
      </Card>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
function formatRelativeAr(iso: string): string {
  const d = new Date(iso);
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return m < 1 ? 'الآن' : `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.round(h / 24)} يوم`;
}

export function MaterialsPage() {
  const q = useTeacherMaterials();

  return (
    <div className="page">
      <PageHeader title="المواد الدراسيّة" subtitle="ملفّاتك المرفوعة على مقرّراتك — مع عدد المشاهدات والتحميلات الفعليّ." />

      <Card title="رفع مواد جديدة" icon={Upload}>
        <div
          style={{
            border: '2px dashed var(--border-strong)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-10)',
            textAlign: 'center',
            background: 'var(--surface-2)',
          }}
        >
          <Icon icon={Upload} size={28} className="text-muted" />
          <div className="text-sm font-medium" style={{ color: 'var(--text)', marginTop: 'var(--sp-2)' }}>
            واجهة الرفع المباشر قيد التطوير
          </div>
          <div className="text-xs text-subtle" style={{ marginTop: 4 }}>
            حالياً تُرفع المواد عبر إدارة المقرّر · PDF · PPT · MP4 · DOC · ZIP
          </div>
        </div>
      </Card>

      <Card title="موادّك" icon={FileText}>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState title="لم ترفع موادّ بعد" description="ستظهر هنا فور رفع أيّ ملفّ على أحد مقرّراتك." />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الملفّ</th>
                  <th>المقرّر</th>
                  <th>النوع</th>
                  <th>الحجم</th>
                  <th>المشاهدات</th>
                  <th>التحميلات</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((m) => (
                  <tr key={m.id}>
                    <td className="tbl-strong">
                      <a href={m.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {m.name}
                      </a>
                    </td>
                    <td>{m.course.name}</td>
                    <td><Badge>{m.type}</Badge></td>
                    <td className="tbl-num">{m.sizeBytes > 0 ? formatSize(m.sizeBytes) : '—'}</td>
                    <td className="tbl-num">{m.views.toLocaleString('ar-LY')}</td>
                    <td className="tbl-num">{m.downloads.toLocaleString('ar-LY')}</td>
                    <td className="text-subtle">{formatRelativeAr(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function ResearchPage() {
  return <ResearchReviewPage />;
}

export function StudentsListPage() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const [offeringId, setOfferingId] = useState<string>('');
  const effectiveOfferingId = offeringId || offerings[0]?.id || '';
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;
  const students = stuQ.data ?? [];

  return (
    <div className="page">
      <PageHeader title="قائمة الطلّاب" subtitle="جميع الطلّاب المسجَّلين في موادّك." />

      <Card title="المقرّر">
        <select
          className="auth-input"
          style={{ maxWidth: 360 }}
          value={effectiveOfferingId}
          onChange={(e) => setOfferingId(e.target.value)}
        >
          {offerings.length === 0 && <option value="">— لا توجد عروض —</option>}
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>{o.course.name} ({o.course.code}) · {o._count.enrollments} طالب</option>
          ))}
        </select>
      </Card>

      <Card
        title={offering ? `${offering.course.name} · ${offering.course.code} · ${students.length} طالب` : 'الطلّاب'}
        icon={Users}
      >
        {!effectiveOfferingId ? (
          <EmptyState title="اختر مقرّراً" />
        ) : stuQ.isPending ? (
          <LoadingState />
        ) : stuQ.isError ? (
          <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
        ) : students.length === 0 ? (
          <EmptyState title="لا يوجد طلّاب مسجَّلون" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الرقم الجامعيّ</th>
                  <th>الحضور</th>
                  <th>المتوسّط</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const tone = s.avgGrade >= 80 ? 'green' : s.avgGrade >= 60 ? 'amber' : 'red';
                  const label = s.avgGrade >= 80 ? 'متفوّق' : s.avgGrade >= 60 ? 'متوسّط' : 'بحاجة دعم';
                  return (
                    <tr key={s.studentId}>
                      <td className="tbl-strong">{s.name}</td>
                      <td className="font-mono text-xs">{s.universityId}</td>
                      <td className="tbl-num">{s.attendancePct}%</td>
                      <td className="tbl-num">{s.avgGrade}</td>
                      <td><Badge color={tone}>{label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function PerformancePage() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const [offeringId, setOfferingId] = useState<string>('');
  const effectiveOfferingId = offeringId || offerings[0]?.id || '';
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const analytics = useOfferingAnalytics(effectiveOfferingId || undefined);
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;
  const students = stuQ.data ?? [];

  // Derive grade distribution from real avgGrade per student.
  const distribution = useMemo(() => {
    const total = students.length;
    if (total === 0) return { excellent: 0, good: 0, fair: 0, poor: 0 };
    let excellent = 0, good = 0, fair = 0, poor = 0;
    for (const s of students) {
      if (s.avgGrade >= 85) excellent++;
      else if (s.avgGrade >= 75) good++;
      else if (s.avgGrade >= 60) fair++;
      else poor++;
    }
    const pct = (n: number) => Math.round((n / total) * 100);
    return { excellent: pct(excellent), good: pct(good), fair: pct(fair), poor: pct(poor) };
  }, [students]);

  const passing = students.filter((s) => s.avgGrade >= 50).length;
  const passRate = students.length > 0 ? Math.round((passing / students.length) * 100) : 0;
  const top = students.filter((s) => s.avgGrade >= 85).length;
  const atRisk = students.filter((s) => s.riskLevel === 'AT_RISK' || s.riskLevel === 'CRITICAL').length;

  return (
    <div className="page">
      <PageHeader title="الأداء والتحليل" subtitle="رؤى على أداء فصلك — مُستخرجة من بيانات الحضور والدرجات الفعليّة." />

      <Card title="المقرّر">
        <select
          className="auth-input"
          style={{ maxWidth: 360 }}
          value={effectiveOfferingId}
          onChange={(e) => setOfferingId(e.target.value)}
        >
          {offerings.length === 0 && <option value="">— لا توجد عروض —</option>}
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
          ))}
        </select>
      </Card>

      {!effectiveOfferingId ? (
        <EmptyState title="اختر مقرّراً" />
      ) : stuQ.isPending || analytics.isPending ? (
        <LoadingState />
      ) : stuQ.isError ? (
        <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
      ) : (
        <>
          <div className="grid-3">
            <MetricCard
              icon={TrendingUp}
              label="معدّل النجاح"
              value={students.length > 0 ? `${passRate}%` : '—'}
              change={students.length > 0 ? `${passing} من ${students.length}` : 'لا توجد بيانات'}
              color={passRate >= 70 ? 'green' : passRate >= 50 ? 'amber' : 'red'}
            />
            <MetricCard
              icon={Users}
              label="طلّاب متفوّقون"
              value={top.toString()}
              change={students.length > 0 ? `من ${students.length}` : '—'}
              color="brand"
            />
            <MetricCard
              icon={AlertTriangle}
              label="بحاجة دعم"
              value={atRisk.toString()}
              change={atRisk > 0 ? 'مراقبة مستمرّة' : 'لا تنبيهات'}
              color={atRisk === 0 ? 'green' : 'amber'}
            />
          </div>

          <Card
            title={offering ? `توزيع الدرجات — ${offering.course.name}` : 'توزيع الدرجات'}
            icon={BarChart3}
          >
            {students.length === 0 ? (
              <EmptyState
                title="لا يوجد طلّاب في الخطر بعد"
                description="ستُرصَد المخاطر تلقائيّاً بناءً على الحضور والدرجات والتفاعل."
              />
            ) : (
              <div className="flex-col gap-3">
                <ProgressBar value={distribution.excellent} label={`ممتاز (85+) · ${distribution.excellent}%`} color="var(--success)" />
                <ProgressBar value={distribution.good}      label={`جيّد جدّاً (75-84) · ${distribution.good}%`} color="var(--accent)" />
                <ProgressBar value={distribution.fair}      label={`جيّد ومقبول (60-74) · ${distribution.fair}%`} color="var(--warning)" />
                <ProgressBar value={distribution.poor}      label={`أقلّ من 60 · ${distribution.poor}%`} color="var(--danger)" />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export function AssignmentsPage() {
  const q = useTeacherAssignments();
  const ASSIGNMENT_LABEL: Record<string, string> = {
    HOMEWORK: 'واجب', QUIZ: 'اختبار قصير', PROJECT: 'مشروع', EXAM: 'امتحان',
  };
  const formatDue = (iso: string) => {
    const d = new Date(iso);
    const days = Math.round((d.getTime() - Date.now()) / 86400000);
    if (days < 0) return `انتهى منذ ${-days} يوم`;
    if (days === 0) return 'اليوم';
    if (days === 1) return 'غداً';
    if (days < 7) return `بعد ${days} أيّام`;
    return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
  };

  return (
    <div className="page">
      <PageHeader title="الواجبات والاختبارات" subtitle="كلّ الواجبات الموزَّعة على مقرّراتك مع نسبة التسليم الفعليّة." />
      <Card title="جميع الواجبات" icon={ClipboardList}>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState title="لا توجد واجبات بعد" description="ستظهر هنا فور إنشاء أيّ واجب على أحد مقرّراتك." />
        ) : (
          <div className="flex-col gap-2">
            {q.data.map((a) => {
              const ratio = a.enrolled > 0 ? a.submissions / a.enrolled : 0;
              const tone: 'green' | 'amber' | 'red' = ratio > 0.5 ? 'green' : ratio > 0.25 ? 'amber' : 'red';
              return (
                <div key={a.id} className="list-row">
                  <div className="list-row-body">
                    <div className="list-row-title">
                      {ASSIGNMENT_LABEL[a.type] ?? a.type}: {a.title}
                    </div>
                    <div className="list-row-sub">
                      {a.course.name} · يستحقّ {formatDue(a.dueAt)}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-muted">
                    {a.submissions} / {a.enrolled} تسليم
                  </div>
                  <Badge color={tone}>{Math.round(ratio * 100)}%</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export function MessagesPage() {
  const q = useMyMessages(1, 50);
  const meId = (q.data?.data ?? []).reduce<string | null>((acc, m) => {
    // Heuristic: most messages will involve the current user; pick any toUser.id
    // that recurs across rows as the current user. A fallback to fromUser otherwise.
    if (acc) return acc;
    return m.toUser?.id ?? null;
  }, null);

  return (
    <div className="page">
      <PageHeader title="الرسائل" subtitle="محادثاتك المباشرة عبر المنصّة." />
      <Card title="الرسائل الأخيرة" icon={MessageSquare}>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || q.data.data.length === 0 ? (
          <EmptyState title="لا توجد رسائل بعد" description="ستظهر هنا الرسائل المُرسَلة إليك أو منك." />
        ) : (
          <div className="flex-col gap-2">
            {q.data.data.slice(0, 30).map((m) => {
              const incoming = m.toUser?.id === meId;
              const other = incoming ? m.fromUser : m.toUser;
              return (
                <div key={m.id} className="list-row">
                  <UserAvatar
                    initials={`${other.firstName[0] ?? ''}${other.lastName[0] ?? ''}`}
                    color={other.avatarColor ?? undefined}
                    size={32}
                  />
                  <div className="list-row-body">
                    <div className="list-row-title">{other.firstName} {other.lastName}</div>
                    <div className="list-row-sub" style={{ color: 'var(--text-muted)' }}>
                      {incoming ? '' : 'أنت: '}{m.body}
                    </div>
                  </div>
                  <div className="text-xxs text-subtle">{formatRelativeAr(m.createdAt)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
