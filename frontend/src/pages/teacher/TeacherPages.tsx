import { Card, MetricCard } from '../../components/primitives';
import { EmptyState } from '../../components/primitives/States';

export function TeacherDashboardPage() {
  return (
    <div className="page">
      <div className="grid-4">
        <MetricCard label="👨‍🎓 إجمالي الطلاب" value="143" change="في 4 مواد هذا الفصل" color="blue" />
        <MetricCard label="📊 متوسط الأداء" value="71%" change={<><span className="up">↑</span> 5% عن الفصل الماضي</>} color="green" />
        <MetricCard label="✅ متوسط الحضور" value="78%" change={<><span className="dn">↓</span> 3% هذا الأسبوع</>} color="amber" />
        <MetricCard label="📋 واجبات معلقة" value="12" change="بحاجة للتصحيح" color="purple" />
      </div>
      <div className="grid-2">
        <Card title="المواد التي تدرّسها">
          {['هندسة البرمجيات', 'نظم المعلومات', 'قواعد البيانات', 'شبكات الحاسوب'].map((s) => (
            <div className="sched-item" key={s}>
              <div style={{ fontSize: 18 }}>📘</div>
              <div className="sched-name" style={{ flex: 1 }}>{s}</div>
              <span className="badge badge-blue">36 طالب</span>
            </div>
          ))}
        </Card>
        <Card title="تنبيهات الطلاب الضعيفين" dotColor="var(--amber)">
          <div className="alert-row red">
            <div className="alert-icon">⚠️</div>
            <div>
              <div className="alert-title">5 طلاب أداؤهم منخفض</div>
              <div className="alert-desc">في مادة قواعد البيانات — يحتاجون تدخّل تعليمي</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TeacherSchedulePage() {
  return (
    <div className="page">
      <Card title="📅 جدول محاضراتي">
        <EmptyState icon="📅" title="جدولك سيظهر هنا بعد جلب بيانات الفصل" />
      </Card>
    </div>
  );
}

export function AttendancePage() {
  return (
    <div className="page">
      <div className="grid-2">
        <Card title="تسجيل الحضور — نظم المعلومات">
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>
            اختر المادة من القائمة، ثم سجّل الحضور لكل طالب. ستُحفظ النتائج في قاعدة
            البيانات وتُستخدم في التقارير الإدارية.
          </p>
        </Card>
        <Card title="إحصائيات الحضور" dotColor="var(--amber)">
          <EmptyState icon="📊" title="ستظهر النِسب بعد التسجيل" />
        </Card>
      </div>
    </div>
  );
}

export function GradesPage() {
  return (
    <div className="page">
      <Card title="📝 درجات الطلاب">
        <EmptyState icon="📝" title="جدول الدرجات يفتح من قائمة المواد" />
      </Card>
    </div>
  );
}

export function MaterialsPage() {
  return (
    <div className="page">
      <Card title="📤 رفع مواد جديدة">
        <div
          style={{
            border: '2px dashed var(--border2)',
            borderRadius: 'var(--r-lg)',
            padding: 30,
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📤</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
            اسحب الملفات هنا أو اضغط للرفع
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>PDF · PPT · MP4 · Word · ZIP</div>
        </div>
      </Card>
    </div>
  );
}

export function ResearchPage() {
  return (
    <div className="page">
      <Card title="🔭 أبحاثي وترقيتي">
        <EmptyState icon="🔭" title="قائمة الأبحاث" />
      </Card>
    </div>
  );
}

export function StudentsListPage() {
  return (
    <div className="page">
      <Card title="👨‍🎓 قائمة طلابي">
        <EmptyState icon="👥" title="قائمة الطلاب لكل مادة" />
      </Card>
    </div>
  );
}

export function PerformancePage() {
  return (
    <div className="page">
      <Card title="📈 أداء وتحليل">
        <EmptyState icon="📈" title="تحليل أداء الفصل" />
      </Card>
    </div>
  );
}

export function AssignmentsPage() {
  return (
    <div className="page">
      <Card title="📋 واجبات واختبارات">
        <EmptyState icon="📋" title="إنشاء وإدارة الواجبات" />
      </Card>
    </div>
  );
}

export function MessagesPage() {
  return (
    <div className="page">
      <Card title="💬 رسائل الطلاب">
        <EmptyState icon="💬" title="لا توجد رسائل جديدة" />
      </Card>
    </div>
  );
}
