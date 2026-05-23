import {
  Users, BarChart3, ClipboardCheck, ClipboardList,
  AlertTriangle, BookOpen, Calendar, Upload, Microscope,
  TrendingUp, MessageSquare, Send, FileText,
  Cog, Database, Network,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, AlertRow, ProgressBar, UserAvatar, SectionTitle } from '../../components/primitives';
import { Icon } from '../../components/Icon';

export function TeacherDashboardPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الأستاذ</h1>
          <p className="page-subtitle">نظرة شاملة على فصلك الحالي وأداء طلابك.</p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={Users} label="إجمالي الطلاب" value="143" change="في 4 مواد" color="brand" />
        <MetricCard icon={BarChart3} label="متوسط الأداء" value="71%" change="‏5% منذ الفصل الماضي" changeDirection="up" color="green" />
        <MetricCard icon={ClipboardCheck} label="متوسط الحضور" value="78%" change="‏3% هذا الأسبوع" changeDirection="dn" color="amber" />
        <MetricCard icon={ClipboardList} label="واجبات قيد التصحيح" value="12" change="بحاجة لمراجعة" color="purple" />
      </div>

      <div className="grid-2-1">
        <Card title="المواد التي تدرّسها" icon={BookOpen}>
          <div className="flex-col gap-2">
            {[
              { name: 'هندسة البرمجيات', code: 'SE301', students: 42, avg: 78, icon: Cog },
              { name: 'نظم المعلومات', code: 'IS301', students: 38, avg: 84, icon: Database },
              { name: 'شبكات الحاسوب', code: 'NET301', students: 35, avg: 68, icon: Network },
              { name: 'قواعد البيانات', code: 'CS302', students: 28, avg: 72, icon: Database },
            ].map((s) => (
              <div className="list-row" key={s.code}>
                <span className="metric-icon" style={{ color: 'var(--accent)' }}>
                  <Icon icon={s.icon} size={16} />
                </span>
                <div className="list-row-body">
                  <div className="list-row-title">{s.name}</div>
                  <div className="list-row-sub">{s.code} · {s.students} طالب</div>
                </div>
                <div className="text-xs font-mono" style={{ color: s.avg >= 75 ? 'var(--success)' : 'var(--warning)' }}>
                  متوسط {s.avg}%
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="طلاب يحتاجون متابعة" icon={AlertTriangle}>
          <div className="flex-col gap-2">
            {[
              { name: 'علي الفقيه', course: 'قواعد البيانات', issue: 'حضور 50%', tone: 'red' as const },
              { name: 'فاطمة عبد الله', course: 'الشبكات', issue: 'متوسط 52', tone: 'red' as const },
              { name: 'محمد الزين', course: 'هندسة البرمجيات', issue: 'لم يسلّم 3 واجبات', tone: 'amber' as const },
              { name: 'هدى أبو راس', course: 'نظم المعلومات', issue: 'انخفاض مفاجئ', tone: 'amber' as const },
            ].map((s, i) => (
              <div className="list-row" key={i}>
                <UserAvatar initials={s.name.split(' ').map((p) => p[0]).join('')} size={32} />
                <div className="list-row-body">
                  <div className="list-row-title">{s.name}</div>
                  <div className="list-row-sub">{s.course} · {s.issue}</div>
                </div>
                <Badge color={s.tone}>تنبيه</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="نشاطات اليوم" icon={Calendar}>
        <div className="flex-col gap-2">
          <AlertRow color="brand" icon={Calendar} title="محاضرة هندسة البرمجيات"
            description="9:00 — 10:30 · قاعة 205 · 42 طالب"
            time="الآن" />
          <AlertRow color="amber" icon={ClipboardList} title="تصحيح اختبار قواعد البيانات"
            description="28 ورقة بانتظار التصحيح — موعد رد النتائج خلال 3 أيام" />
          <AlertRow icon={MessageSquare} title="7 رسائل من الطلاب"
            description="أحدثها من علي الفقيه بخصوص الواجب الأخير" />
        </div>
      </Card>
    </div>
  );
}

/* ─── Generic placeholder structure ─── */
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export function TeacherSchedulePage() {
  return (
    <div className="page">
      <PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعي مع القاعات والأوقات." />
      <Card title="الأسبوع الحالي" icon={Calendar}>
        <div className="flex-col gap-3">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'].map((day) => (
            <div key={day}>
              <SectionTitle>{day}</SectionTitle>
              <div className="list-row">
                <span className="list-row-meta">09:00 — 10:30</span>
                <div className="list-row-body">
                  <div className="list-row-title">هندسة البرمجيات</div>
                  <div className="list-row-sub">قاعة 205 · 42 طالب</div>
                </div>
                <Badge>SE301</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AttendancePage() {
  const STUDENTS = [
    { name: 'أحمد الزروق', id: 'UZ-2024-00001', status: 'present' as const },
    { name: 'مريم الفاخري', id: 'UZ-2024-00012', status: 'present' as const },
    { name: 'يوسف البركي', id: 'UZ-2024-00023', status: 'late' as const },
    { name: 'سارة المحجوب', id: 'UZ-2024-00034', status: 'present' as const },
    { name: 'خالد المزوغي', id: 'UZ-2024-00045', status: 'absent' as const },
  ];
  return (
    <div className="page">
      <PageHeader title="الحضور والغياب" subtitle="سجّل الحضور لكل محاضرة وحلّل النِسب عبر الفصل." />
      <div className="grid-2-1">
        <Card title="تسجيل الحضور · هندسة البرمجيات · اليوم" icon={ClipboardCheck} actions={<button type="button" className="btn primary sm">حفظ</button>}>
          <div className="flex-col gap-2">
            {STUDENTS.map((s) => (
              <div key={s.id} className="list-row">
                <UserAvatar initials={s.name.split(' ').map((p) => p[0]).join('')} size={32} />
                <div className="list-row-body">
                  <div className="list-row-title">{s.name}</div>
                  <div className="list-row-sub font-mono">{s.id}</div>
                </div>
                <div className="flex gap-1">
                  {[
                    { v: 'present', label: 'حاضر', color: 'green' as const },
                    { v: 'late', label: 'متأخر', color: 'amber' as const },
                    { v: 'absent', label: 'غائب', color: 'red' as const },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      className="btn sm"
                      style={s.status === opt.v ? {
                        background: `var(--${opt.color === 'green' ? 'success' : opt.color === 'amber' ? 'warning' : 'danger'}-soft)`,
                        color: `var(--${opt.color === 'green' ? 'success' : opt.color === 'amber' ? 'warning' : 'danger'})`,
                        borderColor: 'transparent',
                      } : undefined}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="إحصائيات الفصل">
          <div className="flex-col gap-4">
            <ProgressBar value={84} label="الحضور" color="var(--success)" />
            <ProgressBar value={11} label="التأخر" color="var(--warning)" />
            <ProgressBar value={5} label="الغياب" color="var(--danger)" />
          </div>
        </Card>
      </div>
    </div>
  );
}

export function GradesPage() {
  return (
    <div className="page">
      <PageHeader title="درجات الطلاب" subtitle="جدول الدرجات والتقديرات للفصل الحالي." />
      <Card title="هندسة البرمجيات · SE301" icon={ClipboardList} actions={
        <div className="flex gap-2">
          <button type="button" className="btn outline sm"><Icon icon={Upload} size={13} /> استيراد</button>
          <button type="button" className="btn outline sm"><Icon icon={FileText} size={13} /> تصدير</button>
        </div>
      }>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الاختبار 1</th>
                <th>الاختبار 2</th>
                <th>المشروع</th>
                <th>النهائي</th>
                <th>المجموع</th>
                <th>التقدير</th>
              </tr>
            </thead>
            <tbody>
              {[
                { n: 'أحمد الزروق', q1: 18, q2: 22, p: 28, f: 32 },
                { n: 'مريم الفاخري', q1: 19, q2: 24, p: 30, f: 35 },
                { n: 'يوسف البركي', q1: 14, q2: 16, p: 22, f: 26 },
                { n: 'سارة المحجوب', q1: 17, q2: 19, p: 26, f: 30 },
                { n: 'علي الفقيه', q1: 11, q2: 13, p: 18, f: 22 },
              ].map((r) => {
                const total = r.q1 + r.q2 + r.p + r.f;
                const grade = total >= 90 ? { l: 'ممتاز', c: 'green' as const } :
                              total >= 80 ? { l: 'جيد جداً', c: 'brand' as const } :
                              total >= 70 ? { l: 'جيد', c: 'amber' as const } :
                              total >= 60 ? { l: 'مقبول', c: 'amber' as const } :
                              { l: 'ضعيف', c: 'red' as const };
                return (
                  <tr key={r.n}>
                    <td className="tbl-strong">{r.n}</td>
                    <td className="tbl-num">{r.q1}</td>
                    <td className="tbl-num">{r.q2}</td>
                    <td className="tbl-num">{r.p}</td>
                    <td className="tbl-num">{r.f}</td>
                    <td className="tbl-num">{total}</td>
                    <td><Badge color={grade.c}>{grade.l}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
  return (
    <div className="page">
      <PageHeader title="البحث العلمي" subtitle="إدارة منشوراتك العلمية وملف الترقية." />
      <div className="grid-3">
        <MetricCard icon={Microscope} label="منشورات محكَّمة" value="14" color="brand" />
        <MetricCard icon={TrendingUp} label="الاستشهادات" value="186" color="green" />
        <MetricCard icon={FileText} label="مشاريع جارية" value="3" color="amber" />
      </div>
      <Card title="منشورات حديثة" icon={Microscope}>
        <div className="flex-col gap-2">
          {[
            { t: 'تطبيقات الذكاء الاصطناعي في التعليم العالي', j: 'Journal of AI in Education', y: 2025 },
            { t: 'تحسين أداء قواعد البيانات الموزعة', j: 'IEEE Access', y: 2024 },
            { t: 'دراسة مقارنة لخوارزميات التعلم العميق', j: 'مجلة الجامعة', y: 2024 },
          ].map((p, i) => (
            <div key={i} className="list-row">
              <span className="list-row-meta">{p.y}</span>
              <div className="list-row-body">
                <div className="list-row-title">{p.t}</div>
                <div className="list-row-sub">{p.j}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
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
