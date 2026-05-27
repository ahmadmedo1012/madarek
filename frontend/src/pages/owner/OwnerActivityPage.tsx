import { useState } from 'react';
import { LogIn, FileText, UserCog, Server, AlertTriangle, Activity, Shield, Clock, XCircle } from 'lucide-react';
import { Card, MetricCard, Tabs } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import type { LucideIcon } from 'lucide-react';

type EventType = 'all' | 'login' | 'content' | 'roles' | 'system';

interface DemoEvent {
  id: string;
  type: 'login' | 'content' | 'roles' | 'system' | 'error';
  action: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  meta: Record<string, unknown> | null;
}

const TYPE_CONFIG: Record<string, { icon: LucideIcon; colorClass: string }> = {
  login: { icon: LogIn, colorClass: 'green' },
  content: { icon: FileText, colorClass: 'blue' },
  roles: { icon: UserCog, colorClass: 'purple' },
  system: { icon: Server, colorClass: 'amber' },
  error: { icon: AlertTriangle, colorClass: 'red' },
};

const DEMO_EVENTS: DemoEvent[] = [
  { id: '1', type: 'login', action: 'تسجيل دخول ناجح', userName: 'أحمد بن محمد', userEmail: 'ahmed@zu.edu.ly', timestamp: 'منذ 2 دقيقة', meta: { ip: '192.168.1.45', device: 'Chrome/macOS' } },
  { id: '2', type: 'content', action: 'رفع محاضرة جديدة', userName: 'د. فاطمة العلي', userEmail: 'fatima@zu.edu.ly', timestamp: 'منذ 8 دقائق', meta: { course: 'CS301', file: 'lecture_12.pdf' } },
  { id: '3', type: 'roles', action: 'تغيير دور مستخدم إلى أستاذ', userName: 'محمد السنوسي', userEmail: 'mohammed@zu.edu.ly', timestamp: 'منذ 15 دقيقة', meta: { targetUser: 'user_42', oldRole: 'STUDENT', newRole: 'TEACHER' } },
  { id: '4', type: 'system', action: 'تشغيل المزامنة اليومية', userName: 'النظام', userEmail: 'system@zu.edu.ly', timestamp: 'منذ 30 دقيقة', meta: { records: 1240, duration: '3.2s' } },
  { id: '5', type: 'login', action: 'تسجيل دخول ناجح', userName: 'سارة أحمد', userEmail: 'sara@zu.edu.ly', timestamp: 'منذ 45 دقيقة', meta: null },
  { id: '6', type: 'error', action: 'فشل في إرسال بريد التأكيد', userName: 'النظام', userEmail: 'system@zu.edu.ly', timestamp: 'منذ ساعة', meta: { error: 'SMTP timeout', targetEmail: 'user@example.com' } },
  { id: '7', type: 'content', action: 'إنشاء مقرر دراسي جديد', userName: 'د. خالد الزاوي', userEmail: 'khaled@zu.edu.ly', timestamp: 'منذ ساعتين', meta: { courseCode: 'ENG201', faculty: 'الهندسة' } },
  { id: '8', type: 'login', action: 'محاولة دخول فاشلة', userName: 'غير معروف', userEmail: 'unknown@test.com', timestamp: 'منذ ساعتين', meta: { ip: '10.0.0.55', attempts: 3 } },
  { id: '9', type: 'system', action: 'نسخ احتياطي تلقائي', userName: 'النظام', userEmail: 'system@zu.edu.ly', timestamp: 'منذ 3 ساعات', meta: { size: '2.4GB', duration: '45s' } },
  { id: '10', type: 'roles', action: 'تعطيل حساب مستخدم', userName: 'محمد السنوسي', userEmail: 'mohammed@zu.edu.ly', timestamp: 'منذ 4 ساعات', meta: { targetUser: 'user_89', reason: 'inactive' } },
  { id: '11', type: 'content', action: 'حذف ملف مرفق', userName: 'د. نورة الحسن', userEmail: 'noura@zu.edu.ly', timestamp: 'منذ 5 ساعات', meta: { file: 'assignment_draft.docx' } },
  { id: '12', type: 'login', action: 'تسجيل دخول ناجح', userName: 'علي عبدالله', userEmail: 'ali@zu.edu.ly', timestamp: 'منذ 6 ساعات', meta: null },
  { id: '13', type: 'system', action: 'تحديث إعدادات النظام', userName: 'المالك', userEmail: 'owner@zu.edu.ly', timestamp: 'منذ 7 ساعات', meta: { key: 'MAX_UPLOAD_SIZE', value: '50MB' } },
  { id: '14', type: 'error', action: 'خطأ في اتصال قاعدة البيانات', userName: 'النظام', userEmail: 'system@zu.edu.ly', timestamp: 'منذ 8 ساعات', meta: { code: 'ECONNREFUSED', retries: 3 } },
  { id: '15', type: 'content', action: 'نشر نتائج الامتحان', userName: 'د. فاطمة العلي', userEmail: 'fatima@zu.edu.ly', timestamp: 'منذ 10 ساعات', meta: { course: 'MATH101', students: 85 } },
];

export function OwnerActivityPage() {
  const [filter, setFilter] = useState<EventType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const tabItems: Array<{ value: EventType; label: string }> = [
    { value: 'all', label: 'الكل' },
    { value: 'login', label: 'تسجيل دخول' },
    { value: 'content', label: 'محتوى' },
    { value: 'roles', label: 'أدوار' },
    { value: 'system', label: 'نظام' },
  ];

  const filtered = filter === 'all' ? DEMO_EVENTS : DEMO_EVENTS.filter((e) => e.type === filter || (filter === 'system' && e.type === 'error'));

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">سجل النشاط والمراقبة</h1>
          <p className="page-subtitle">جميع العمليات المنفذة على المنصة</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-4">
        <MetricCard icon={Activity} label="أحداث اليوم" value="42" color="brand" />
        <MetricCard icon={LogIn} label="تسجيلات الدخول" value="128" color="green" />
        <MetricCard icon={XCircle} label="عمليات فاشلة" value="3" color="red" />
        <MetricCard icon={Shield} label="تغييرات الأدوار" value="7" change="هذا الأسبوع" color="purple" />
      </div>

      {/* Filter Tabs */}
      <Card>
        <Tabs value={filter} onChange={setFilter} items={tabItems} />
      </Card>

      {/* Timeline */}
      <Card title="سجل الأحداث" icon={Clock}>
        <div className="owner-timeline">
          {filtered.map((event) => {
            const config = TYPE_CONFIG[event.type];
            return (
              <div key={event.id} className="owner-timeline-item">
                <div className={`owner-event-icon ${config.colorClass}`}>
                  <Icon icon={config.icon} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                    {event.action}
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    {event.userName} &middot; {event.userEmail}
                  </div>
                  {event.meta && (
                    <button
                      type="button"
                      style={{ fontSize: 'var(--fs-xxs)', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}
                      onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                    >
                      {expanded === event.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                    </button>
                  )}
                  {expanded === event.id && event.meta && (
                    <div className="owner-meta-preview">
                      {JSON.stringify(event.meta, null, 2)}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {event.timestamp}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
