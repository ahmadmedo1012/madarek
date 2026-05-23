import {
  Users, BarChart3, ClipboardCheck, ClipboardList,
  AlertTriangle, BookOpen, Calendar, Upload, Microscope,
  TrendingUp, MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, AlertRow } from '../../components/primitives';
import { EmptyState } from '../../components/primitives/States';
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
        <MetricCard icon={Users} label="إجمالي الطلاب" value="143" change="في 4 مواد" color="blue" />
        <MetricCard icon={BarChart3} label="متوسط الأداء" value="71%" change="‏5% عن الفصل الماضي" changeDirection="up" color="green" />
        <MetricCard icon={ClipboardCheck} label="متوسط الحضور" value="78%" change="‏3% هذا الأسبوع" changeDirection="dn" color="amber" />
        <MetricCard icon={ClipboardList} label="واجبات معلقة" value="12" change="بحاجة للتصحيح" color="purple" />
      </div>

      <div className="grid-2">
        <Card icon={BookOpen} title="المواد التي تدرّسها">
          <div className="flex-col gap-2">
            {['هندسة البرمجيات', 'نظم المعلومات', 'قواعد البيانات', 'شبكات الحاسوب'].map((s) => (
              <div className="list-row" key={s}>
                <Icon icon={BookOpen} size={18} />
                <div className="list-row-body">
                  <div className="list-row-title">{s}</div>
                  <div className="list-row-sub">36 طالب · 3 ساعات أسبوعية</div>
                </div>
                <Badge color="blue">36 طالب</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card icon={AlertTriangle} title="طلاب يحتاجون متابعة">
          <div className="flex-col gap-2">
            <AlertRow color="red" icon={AlertTriangle} title="5 طلاب أداؤهم منخفض"
              description="في مادة قواعد البيانات — يحتاجون تدخّلاً تعليمياً" />
            <AlertRow color="amber" icon={AlertTriangle} title="3 طلاب غياب متكرر"
              description="تجاوزوا 4 محاضرات في هندسة البرمجيات" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Placeholder({
  title, subtitle, icon, emptyTitle, emptyDesc,
}: {
  title: string; subtitle: string; icon: LucideIcon;
  emptyTitle: string; emptyDesc?: string;
}) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <Card>
        <EmptyState icon={icon} title={emptyTitle} description={emptyDesc} />
      </Card>
    </div>
  );
}

export function TeacherSchedulePage() {
  return <Placeholder title="جدول محاضراتي" subtitle="جدولك الأسبوعي مع القاعات والأوقات."
    icon={Calendar} emptyTitle="جدولك سيظهر هنا" emptyDesc="بمجرد توزيع الفصل الحالي ستظهر محاضراتك." />;
}

export function AttendancePage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الحضور والغياب</h1>
          <p className="page-subtitle">سجّل الحضور لكل محاضرة وحلّل النِسب عبر الفصل.</p>
        </div>
      </div>
      <div className="grid-2">
        <Card icon={ClipboardCheck} title="تسجيل الحضور — نظم المعلومات">
          <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)' }}>
            اختر المادة من القائمة، ثم سجّل الحضور لكل طالب. ستُحفظ النتائج في قاعدة
            البيانات وتُستخدم في التقارير الإدارية.
          </p>
        </Card>
        <Card icon={BarChart3} title="إحصائيات الحضور">
          <EmptyState icon={BarChart3} title="ستظهر النِسب بعد التسجيل" />
        </Card>
      </div>
    </div>
  );
}

export function GradesPage() {
  return <Placeholder title="درجات الطلاب" subtitle="جدول الدرجات والتقديرات للفصل."
    icon={ClipboardList} emptyTitle="لم تُدخل أي درجات بعد" emptyDesc="ابدأ بإضافة الاختبار الأول من قائمة المواد." />;
}

export function MaterialsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">رفع المواد</h1>
          <p className="page-subtitle">شارك الشرائح والفيديوهات والواجبات مع طلابك.</p>
        </div>
      </div>
      <Card icon={Upload} title="رفع مواد جديدة">
        <div
          style={{
            border: '2px dashed var(--border-strong)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-10)',
            textAlign: 'center',
            background: 'var(--bg-1)',
          }}
        >
          <Icon icon={Upload} size={32} className="text-subtle" />
          <div className="text-md font-medium mt-3" style={{ color: 'var(--text)' }}>اسحب الملفات هنا أو اضغط للرفع</div>
          <div className="text-xs text-subtle mt-1">PDF · PPT · MP4 · Word · ZIP</div>
        </div>
      </Card>
    </div>
  );
}

export function ResearchPage() {
  return <Placeholder title="أبحاثي وترقيتي" subtitle="إدارة منشوراتك العلمية وملف الترقية."
    icon={Microscope} emptyTitle="لا توجد أبحاث مسجّلة" />;
}

export function StudentsListPage() {
  return <Placeholder title="قائمة طلابي" subtitle="جميع الطلاب الموزّعين على موادك."
    icon={Users} emptyTitle="ستظهر هنا قائمة الطلاب لكل مادة" />;
}

export function PerformancePage() {
  return <Placeholder title="أداء وتحليل" subtitle="رؤى على أداء الفصل والطلاب الأكثر تحسناً."
    icon={TrendingUp} emptyTitle="تحليل الأداء قيد البناء" />;
}

export function AssignmentsPage() {
  return <Placeholder title="واجبات واختبارات" subtitle="إنشاء وتقييم وإعادة الواجبات."
    icon={ClipboardList} emptyTitle="لم تُنشئ أي واجب بعد" />;
}

export function MessagesPage() {
  return <Placeholder title="رسائل الطلاب" subtitle="محادثات أكاديمية مع طلابك."
    icon={MessageSquare} emptyTitle="لا توجد رسائل جديدة" />;
}
