import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BarChart3, ClipboardCheck, ClipboardList,
  AlertTriangle, Calendar, Upload,
  TrendingUp, MessageSquare, Send, FileText, X, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar, UserAvatar, SectionTitle } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/overlays/Modal';
import {
  useTeacherOfferings,
  useTeacherStudents,
  useOfferingAnalytics,
  useRecordAttendance,
  useTeacherMaterials,
  useTeacherAssignments,
  useTeacherDashboard,
  useGradeSubmission,
  apiErrorMessage,
  type TeacherDashboard,
  useMyMessages,
} from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import ResearchReviewPage from './ResearchReviewPage';

/* The teacher dashboard now lives in TeacherDashboardPage.tsx
 * (social-media feed style). The previous KPI-grid version was
 * removed during the polish pass — it was unused and added 100 lines
 * of legacy code that didn't match the new visual language.
 */

/* ─── Generic placeholder structure ─── */
function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions}
    </header>
  );
}

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Proper Arabic counted nouns: [one, two, few (3–10), many (11+)]. */
function countAr(n: number, forms: [string, string, string, string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (n >= 3 && n <= 10) return `${n} ${forms[2]}`;
  return `${n} ${forms[3]}`;
}

/* Latin format codes stay Latin (proper nouns) — same map as the student
 * course page (wave 4-b); the rest get real Arabic labels (audit 0-e D). */
const MATERIAL_TYPE_LABEL: Record<string, string> = {
  PDF: 'PDF',
  PPT: 'PPT',
  DOC: 'DOC',
  ZIP: 'ZIP',
  VIDEO: 'فيديو',
  IMAGE: 'صورة',
  OTHER: 'ملف',
};

export function TeacherSchedulePage() {
  const offsQ = useTeacherOfferings();
  if (offsQ.isPending) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." /><LoadingState /></div>;
  if (offsQ.isError) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." /><ErrorState error={offsQ.error} onRetry={() => offsQ.refetch()} /></div>;

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
                      {/* Latin time range inside an RTL line — bdi keeps
                          the dash order stable (audit 0-e P2-47) */}
                      <bdi className="list-row-meta">{it.startTime} — {it.endTime}</bdi>
                      <div className="list-row-body">
                        <div className="list-row-title">{it.courseName}</div>
                        <div className="list-row-sub">
                          {it.room ? `${it.room} · ` : ''}
                          {countAr(it.enrolled, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}
                        </div>
                      </div>
                      <Badge><bdi>{it.courseCode}</bdi></Badge>
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
/* Selected state rides on [data-tone] + .on (CSS owns the colors) — the
 * old inline style block had no aria-pressed and no class-based state
 * (audit 0-e P1-32). */
const ATT_OPTIONS: Array<{ v: AttStatus; label: string; tone: 'success' | 'warning' | 'danger' }> = [
  { v: 'PRESENT', label: 'حاضر',   tone: 'success' },
  { v: 'LATE',    label: 'متأخّر', tone: 'warning' },
  { v: 'ABSENT',  label: 'غائب',   tone: 'danger' },
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
        <div className="form-row-3">
          <label>
            <span className="form-label">المقرّر</span>
            <select className="input" value={effectiveOfferingId} onChange={(e) => setOfferingId(e.target.value)}>
              {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">تاريخ الجلسة</span>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span className="form-label">الموضوع (اختياريّ)</span>
            <input type="text" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: مقدّمة في UML" />
          </label>
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
                      <div className="list-row-sub font-mono"><bdi>{s.universityId}</bdi></div>
                    </div>
                    <div className="flex gap-1" role="group" aria-label={`حضور ${s.name}`}>
                      {ATT_OPTIONS.map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          className={`att-toggle${status === opt.v ? ' on' : ''}`}
                          data-tone={opt.tone}
                          aria-pressed={status === opt.v}
                          onClick={() => setStatusByStudent({ ...statusByStudent, [s.studentId]: opt.v })}
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
            <div className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-3)' }}>
              <Icon icon={AlertTriangle} size={14} />
              <span className="flex-1">
                {apiErrorMessage(record.error, 'تعذَّر حفظ سجلّ الحضور.')} أعد المحاولة بالضغط على «حفظ السجلّ».
              </span>
            </div>
          )}
          {record.isSuccess && (
            <div className="form-feedback ok" role="status" style={{ marginBlockStart: 'var(--sp-3)' }}>
              <Icon icon={CheckCircle2} size={14} />
              <span>تمّ حفظ سجلّ الحضور لهذا التاريخ.</span>
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
        <label>
          <span className="form-label">اختر المقرّر لعرض درجاته</span>
          <select
            className="input course-select"
            value={effectiveOfferingId}
            onChange={(e) => setOfferingId(e.target.value)}
          >
            {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
            ))}
          </select>
        </label>
      </Card>

      <Card
        title={offering ? `${offering.course.name} · ${offering.course.code}` : 'الدرجات'}
        icon={ClipboardList}
      >
        {!effectiveOfferingId ? (
          <EmptyState title="اختر مقرّراً" description="حدّد أحد مقرّراتك أعلاه لعرض درجات طلابه." />
        ) : stuQ.isPending ? (
          <LoadingState />
        ) : stuQ.isError ? (
          <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
        ) : (stuQ.data ?? []).length === 0 ? (
          <EmptyState title="لا يوجد طلّاب" description="لا توجد تسجيلات في هذا المقرّر بعد." />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
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
                      <td className="tbl-strong" data-label="الطالب">{s.name}</td>
                      <td data-label="الرقم الجامعيّ"><bdi className="font-mono text-xs">{s.universityId}</bdi></td>
                      <td className="tbl-num" data-label="متوسّط الدرجات">{s.avgGrade}</td>
                      <td className="tbl-num" data-label="الحضور">{s.attendancePct}%</td>
                      <td data-label="التقدير"><Badge color={grade.c}>{grade.l}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm text-muted notice-paragraph">
          إدخال الدرجات الفصليّة (الاختبار 1، الاختبار 2، المشروع، النهائيّ) قيد التطوير.
          حالياً تُعرض الدرجات المرصودة من واجبات المقرّر.{' '}
          <Link to="/teacher/intelligence" className="text-link">شاهد الذكاء الأكاديميّ</Link>
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
        <div className="dropzone-ghost">
          <Icon icon={Upload} size={28} className="text-muted" />
          <div className="dropzone-ghost-title">
            واجهة الرفع المباشر قيد التطوير
          </div>
          <div className="text-xs text-subtle" style={{ marginBlockStart: 4 }}>
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
          <div className="table-wrap">
            <table className="table tbl-stack">
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
                    <td className="tbl-strong" data-label="الملفّ">
                      <a href={m.url} target="_blank" rel="noreferrer" className="text-link">
                        {m.name}
                      </a>
                    </td>
                    <td data-label="المقرّر">{m.course.name}</td>
                    <td data-label="النوع"><Badge>{MATERIAL_TYPE_LABEL[m.type] ?? <bdi>{m.type}</bdi>}</Badge></td>
                    <td className="tbl-num" data-label="الحجم">{m.sizeBytes > 0 ? <bdi>{formatSize(m.sizeBytes)}</bdi> : '—'}</td>
                    <td className="tbl-num" data-label="المشاهدات">{m.views.toLocaleString('ar-LY')}</td>
                    <td className="tbl-num" data-label="التحميلات">{m.downloads.toLocaleString('ar-LY')}</td>
                    <td className="text-subtle" data-label="التاريخ">{formatRelativeAr(m.createdAt)}</td>
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
        <label>
          <span className="form-label">اختر المقرّر لعرض طلابه</span>
          <select
            className="input course-select"
            value={effectiveOfferingId}
            onChange={(e) => setOfferingId(e.target.value)}
          >
            {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>{o.course.name} ({o.course.code}) · {o._count.enrollments} طالب</option>
            ))}
          </select>
        </label>
      </Card>

      <Card
        title={offering ? `${offering.course.name} · ${offering.course.code} · ${students.length} طالب` : 'الطلّاب'}
        icon={Users}
      >
        {!effectiveOfferingId ? (
          <EmptyState title="اختر مقرّراً" description="حدّد أحد مقرّراتك أعلاه لعرض قائمة طلابه." />
        ) : stuQ.isPending ? (
          <LoadingState />
        ) : stuQ.isError ? (
          <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
        ) : students.length === 0 ? (
          <EmptyState title="لا يوجد طلّاب مسجَّلون" description="لا توجد تسجيلات نشطة في هذا المقرّر بعد." />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
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
                      <td className="tbl-strong" data-label="الاسم">{s.name}</td>
                      <td data-label="الرقم الجامعيّ"><bdi className="font-mono text-xs">{s.universityId}</bdi></td>
                      <td className="tbl-num" data-label="الحضور">{s.attendancePct}%</td>
                      <td className="tbl-num" data-label="المتوسّط">{s.avgGrade}</td>
                      <td data-label="الحالة"><Badge color={tone}>{label}</Badge></td>
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
        <label>
          <span className="form-label">اختر المقرّر لعرض تحليل أدائه</span>
          <select
            className="input course-select"
            value={effectiveOfferingId}
            onChange={(e) => setOfferingId(e.target.value)}
          >
            {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
            ))}
          </select>
        </label>
      </Card>

      {!effectiveOfferingId ? (
        <EmptyState title="اختر مقرّراً" description="حدّد أحد مقرّراتك أعلاه لعرض تحليل أداء فصلك." />
      ) : stuQ.isPending || analytics.isPending ? (
        <LoadingState />
      ) : stuQ.isError ? (
        <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
      ) : analytics.isError ? (
        <ErrorState message="تعذَّر تحميل مؤشّرات المقرر" error={analytics.error} onRetry={() => analytics.refetch()} />
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
                title="لا توجد بيانات توزيع بعد"
                description="سيظهر توزيع الدرجات هنا فور تسجيل طلاب في المقرّر."
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
  const dashboard = useTeacherDashboard();
  const ASSIGNMENT_LABEL: Record<string, string> = {
    HOMEWORK: 'واجب', QUIZ: 'اختبار قصير', PROJECT: 'مشروع', EXAM: 'امتحان',
  };
  const formatDue = (iso: string) => {
    const d = new Date(iso);
    const days = Math.round((d.getTime() - Date.now()) / 86400000);
    if (days < 0) return `انتهى ${countAr(-days, ['منذ يوم', 'منذ يومين', 'منذ أيام', 'منذ يوماً'])}`;
    if (days === 0) return 'اليوم';
    if (days === 1) return 'غداً';
    if (days < 7) return `بعد ${countAr(days, ['يوم', 'يومين', 'أيام', 'يوماً'])}`;
    return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
  };

  const [gradeTarget, setGradeTarget] = useState<GradeTarget | null>(null);

  return (
    <div className="page">
      <PageHeader title="الواجبات والاختبارات" subtitle="كلّ الواجبات الموزَّعة على مقرّراتك، والتسليمات بانتظار تقييمك." />

      <NeedsReviewCard
        feed={dashboard.data?.feed ?? []}
        isPending={dashboard.isPending}
        isError={dashboard.isError}
        error={dashboard.error}
        onRetry={() => dashboard.refetch()}
        maxScoreFor={(title, courseCode) => {
          const match = (q.data ?? []).find(
            (a) => a.title === title && (!courseCode || a.course.code === courseCode),
          );
          return match?.maxScore;
        }}
        onGrade={(target) => setGradeTarget(target)}
      />

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
                      {ASSIGNMENT_LABEL[a.type] ?? <bdi>{a.type}</bdi>}: {a.title}
                    </div>
                    <div className="list-row-sub">
                      {a.course.name} · يستحقّ {formatDue(a.dueAt)}
                    </div>
                  </div>
                  {/* LTR fraction order stays stable inside the RTL line */}
                  <div className="text-xs font-mono text-muted">
                    <bdi>{a.submissions} / {a.enrolled}</bdi> تسليم
                  </div>
                  <Badge color={tone}>{Math.round(ratio * 100)}%</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {gradeTarget && (
        <GradeSubmissionModal target={gradeTarget} onClose={() => setGradeTarget(null)} />
      )}
    </div>
  );
}

interface GradeTarget {
  submissionId: string;
  studentName: string;
  assignmentTitle: string;
  courseCode?: string;
  maxScore?: number;
  submittedAt: string;
}

/* ─── Pending submissions awaiting grading ───────────────── */
function NeedsReviewCard({
  feed,
  isPending,
  isError,
  error,
  onRetry,
  maxScoreFor,
  onGrade,
}: {
  feed: TeacherDashboard['feed'];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  maxScoreFor: (title: string, courseCode?: string) => number | undefined;
  onGrade: (target: GradeTarget) => void;
}) {
  // The dashboard feed prefixes submission ids with "s-" (papers use
  // "p-", attendance "att-"). Only submissions are gradeable here.
  const pending = useMemo(() => {
    return feed
      .filter((f) => f.kind === 'submissions' && f.id.startsWith('s-'))
      .map((f) => {
        const assignmentTitle = f.title
          .replace(/^سلّم\/ت /, '')
          .replace(/^سلّم /, '');
        const courseCode = f.meta.split(' · ').pop()?.trim();
        return {
          submissionId: f.id.slice(2),
          studentName: f.author ? `${f.author.firstName} ${f.author.lastName}` : 'طالب',
          assignmentTitle,
          courseCode,
          maxScore: maxScoreFor(assignmentTitle, courseCode),
          submittedAt: f.when,
        } satisfies GradeTarget;
      });
  }, [feed, maxScoreFor]);

  return (
    <Card
      title="تسليمات بانتظار التقييم"
      icon={ClipboardCheck}
      subtitle={`${pending.length} تسليم بانتظار درجتك`}
    >
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : pending.length === 0 ? (
        <EmptyState
          title="لا توجد تسليمات بانتظار التقييم"
          description="ستظهر هنا تسليمات طلّابك فور وصولها."
        />
      ) : (
        <div className="flex-col gap-2">
          {pending.map((p) => (
            <div key={p.submissionId} className="list-row">
              <UserAvatar
                initials={p.studentName.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('')}
                size={32}
              />
              <div className="list-row-body">
                <div className="list-row-title">{p.assignmentTitle}</div>
                <div className="list-row-sub">
                  {p.studentName}{p.courseCode ? <> · <bdi>{p.courseCode}</bdi></> : null} · وصل {formatRelativeAr(p.submittedAt)}
                </div>
              </div>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => onGrade(p)}
              >
                <Icon icon={Send} size={12} /> تقييم
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─── Teacher grading modal (grade + feedback) ──────────── */
function GradeSubmissionModal({
  target,
  onClose,
}: {
  target: GradeTarget;
  onClose: () => void;
}) {
  const grade = useGradeSubmission(target.submissionId);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    const value = Number(score);
    if (score.trim() === '' || Number.isNaN(value)) {
      setValidationError('أدخل درجة صحيحة.');
      return;
    }
    if (value < 0) {
      setValidationError('لا يمكن أن تكون الدرجة سالبة.');
      return;
    }
    if (target.maxScore !== undefined && value > target.maxScore) {
      setValidationError(`الدرجة يجب ألّا تتجاوز ${target.maxScore}.`);
      return;
    }
    setValidationError(null);
    try {
      await grade.mutateAsync({
        grade: value,
        feedback: feedback.trim() || undefined,
      });
      setDone(true);
    } catch {
      // surfaced inline from grade.isError below
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={`تقييم تسليم ${target.assignmentTitle}`}
      closeOnOverlayClick={!grade.isPending}
    >
      <div className="modal-header">
        <div className="modal-title">تقييم التسليم</div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق" disabled={grade.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{target.assignmentTitle}</div>
        <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-4)' }}>
          {target.studentName}
          {target.courseCode ? <> · <bdi>{target.courseCode}</bdi></> : null} · وصل {formatRelativeAr(target.submittedAt)}
        </div>

        {done ? (
          <div className="form-feedback ok" role="status">
            <Icon icon={CheckCircle2} size={15} />
            <span className="flex-1">تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.</span>
          </div>
        ) : (
          <>
            <div className="flex-col gap-2">
              <label className="form-label" htmlFor="grade-score">
                الدرجة{target.maxScore !== undefined ? ` (من 0 إلى ${target.maxScore})` : ''}
              </label>
              <input
                id="grade-score"
                type="number"
                className="input input-narrow"
                placeholder={target.maxScore !== undefined ? `0 – ${target.maxScore}` : '0'}
                min={0}
                max={target.maxScore}
                step="any"
                inputMode="decimal"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                disabled={grade.isPending}
              />
            </div>

            <div className="flex-col gap-2">
              <label className="form-label" htmlFor="grade-feedback">ملاحظات للطالب (اختياري)</label>
              <textarea
                id="grade-feedback"
                className="input"
                rows={4}
                placeholder="اكتب ملاحظاتك على الإجابة…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={grade.isPending}
                maxLength={2000}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {validationError && (
              <p role="alert" className="text-xs text-red" style={{ marginBlockStart: 'var(--sp-2)' }}>
                {validationError}
              </p>
            )}
            {grade.isError && (
              <p role="alert" className="text-xs text-red" style={{ marginBlockStart: 'var(--sp-2)' }}>
                {apiErrorMessage(grade.error, 'تعذَّر حفظ الدرجة — حاول مرة أخرى.')}
              </p>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn ghost" onClick={onClose} disabled={grade.isPending}>
          {done ? 'إغلاق' : 'إلغاء'}
        </button>
        {!done && (
          <button
            type="button"
            className="btn primary"
            onClick={() => void onSubmit()}
            disabled={grade.isPending}
          >
            {grade.isPending ? 'جارٍ الحفظ…' : 'حفظ الدرجة'}
          </button>
        )}
      </div>
    </Modal>
  );
}

export function MessagesPage() {
  const q = useMyMessages(1, 50);
  // Read the current user's ID directly from the auth store. Previously
  // this code tried to *infer* `meId` by picking the first message's
  // `toUser.id` — which breaks for sent messages (where the current
  // user is the *sender*, not the recipient). Result: incoming/outgoing
  // bubbles were swapped, and the avatar shown was wrong.
  const meId = useAuthStore((s) => s.user?.id) ?? null;

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
                    <div className="list-row-sub">
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
