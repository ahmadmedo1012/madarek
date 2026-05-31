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
  if (offsQ.isError) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="" /><ErrorState /></div>;

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
            <ErrorState />
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
          <ErrorState />
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

export function MaterialsPage() {
  return (
    <div className="page">
      <PageHeader title="المواد الدراسية" subtitle="شارك الشرائح والفيديوهات والواجبات مع طلابك." />

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
            اسحب الملفات هنا أو اضغط للرفع
          </div>
          <div className="text-xs text-subtle" style={{ marginTop: 4 }}>PDF · PPT · MP4 · Word · ZIP</div>
        </div>
      </Card>

      <Card title="موادك الأخيرة" icon={FileText}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>الملف</th>
                <th>المادة</th>
                <th>النوع</th>
                <th>التحميلات</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { n: 'محاضرة UML — الوحدة 1', c: 'هندسة البرمجيات', k: 'PDF', d: 142 },
                { n: 'شرائح Design Patterns', c: 'هندسة البرمجيات', k: 'PPTX', d: 98 },
                { n: 'شرح SDLC الكامل', c: 'هندسة البرمجيات', k: 'MP4', d: 201 },
              ].map((f) => (
                <tr key={f.n}>
                  <td className="tbl-strong">{f.n}</td>
                  <td>{f.c}</td>
                  <td><Badge>{f.k}</Badge></td>
                  <td className="tbl-num">{f.d}</td>
                  <td className="text-subtle">منذ يومين</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ResearchPage() {
  return <ResearchReviewPage />;
}

export function StudentsListPage() {
  return (
    <div className="page">
      <PageHeader title="قائمة الطلاب" subtitle="جميع الطلاب الموزّعين على موادك." />
      <Card title="هندسة البرمجيات · 42 طالب" icon={Users}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>الاسم</th><th>الرقم الجامعي</th><th>الحضور</th><th>المتوسط</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {[
                { n: 'أحمد الزروق', id: 'UZ-2024-00001', a: 92, avg: 88 },
                { n: 'مريم الفاخري', id: 'UZ-2024-00012', a: 95, avg: 91 },
                { n: 'يوسف البركي', id: 'UZ-2024-00023', a: 78, avg: 72 },
                { n: 'سارة المحجوب', id: 'UZ-2024-00034', a: 88, avg: 79 },
                { n: 'علي الفقيه', id: 'UZ-2024-00045', a: 50, avg: 52 },
              ].map((s) => (
                <tr key={s.id}>
                  <td className="tbl-strong">{s.n}</td>
                  <td className="font-mono text-xs">{s.id}</td>
                  <td className="tbl-num">{s.a}%</td>
                  <td className="tbl-num">{s.avg}</td>
                  <td>
                    <Badge color={s.avg >= 80 ? 'green' : s.avg >= 60 ? 'amber' : 'red'}>
                      {s.avg >= 80 ? 'متفوق' : s.avg >= 60 ? 'متوسط' : 'بحاجة دعم'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function PerformancePage() {
  return (
    <div className="page">
      <PageHeader title="الأداء والتحليل" subtitle="رؤى على أداء الفصل والطلاب الأكثر تحسناً." />
      <div className="grid-3">
        <MetricCard icon={TrendingUp} label="متوسط النجاح" value="84%" change="‏3%" changeDirection="up" color="green" />
        <MetricCard icon={Users} label="طلاب متفوقون" value="18" change="من 143" color="brand" />
        <MetricCard icon={AlertTriangle} label="بحاجة دعم" value="9" change="مراقبة مستمرة" color="amber" />
      </div>
      <Card title="توزيع الدرجات · هندسة البرمجيات" icon={BarChart3}>
        <div className="flex-col gap-3">
          <ProgressBar value={28} label="ممتاز (90+)" color="var(--success)" />
          <ProgressBar value={42} label="جيد جداً (80-89)" color="var(--accent)" />
          <ProgressBar value={20} label="جيد (70-79)" color="var(--warning)" />
          <ProgressBar value={10} label="مقبول وأقل" color="var(--danger)" />
        </div>
      </Card>
    </div>
  );
}

export function AssignmentsPage() {
  return (
    <div className="page">
      <PageHeader title="الواجبات والاختبارات" subtitle="إنشاء وتقييم الواجبات." />
      <Card title="نشطة الآن" icon={ClipboardList} actions={<button type="button" className="btn primary sm">+ واجب جديد</button>}>
        <div className="flex-col gap-2">
          {[
            { t: 'مشروع UML', c: 'هندسة البرمجيات', due: '20 مايو', sub: 28, total: 42 },
            { t: 'تقرير TCP/IP', c: 'شبكات الحاسوب', due: '22 مايو', sub: 12, total: 35 },
            { t: 'قاعدة بيانات ERD', c: 'نظم المعلومات', due: '28 مايو', sub: 5, total: 38 },
          ].map((a, i) => (
            <div key={i} className="list-row">
              <div className="list-row-body">
                <div className="list-row-title">{a.t}</div>
                <div className="list-row-sub">{a.c} · يستحق {a.due}</div>
              </div>
              <div className="text-xs font-mono text-muted">{a.sub} / {a.total} تسليم</div>
              <Badge color={a.sub / a.total > 0.5 ? 'green' : a.sub / a.total > 0.25 ? 'amber' : 'red'}>
                {Math.round((a.sub / a.total) * 100)}%
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function MessagesPage() {
  return (
    <div className="page">
      <PageHeader title="الرسائل" subtitle="محادثات أكاديمية مع طلابك." />
      <Card title="غير مقروء · 7" icon={MessageSquare}>
        <div className="flex-col gap-2">
          {[
            { n: 'علي الفقيه', t: 'أستاذ، هل يمكن تأجيل تسليم الواجب؟ لدي ظروف…', time: 'منذ 5د' },
            { n: 'مريم الفاخري', t: 'شكراً على الملاحظات على المشروع الأخير!', time: 'منذ ساعة' },
            { n: 'يوسف البركي', t: 'هل ستُغطّى وحدة Routing Protocols في الامتحان؟', time: 'منذ 3س' },
          ].map((m, i) => (
            <div key={i} className="list-row">
              <UserAvatar initials={m.n.split(' ').map((p) => p[0]).join('')} size={32} />
              <div className="list-row-body">
                <div className="list-row-title">{m.n}</div>
                <div className="list-row-sub" style={{ color: 'var(--text-muted)' }}>{m.t}</div>
              </div>
              <div className="text-xxs text-subtle">{m.time}</div>
              <button type="button" className="icon-btn"><Icon icon={Send} size={14} /></button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
