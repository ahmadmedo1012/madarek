import { useState } from 'react';
import {
  GraduationCap, Presentation, FileText, FlaskConical,
  BookOpen, Sparkles, Calendar, Trophy, Clock, Flame,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useDashboardStore } from '../../stores/dashboard.store';
import { DashboardCustomizer, DashboardCustomizerTrigger } from '../../components/DashboardCustomizer';

/**
 * Greeting that adapts to the local hour. Calm, conversational.
 */
function useGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6)  return { text: 'سهرة سعيدة', emoji: '🌙' };
  if (h < 12) return { text: 'صباح الخير', emoji: '☀️' };
  if (h < 18) return { text: 'مساء النور', emoji: '🌤️' };
  return { text: 'مساء الخير', emoji: '🌆' };
}

/**
 * Up-coming agenda items. In a real session these come from the API
 * -- kept inline for the visual treatment of the dashboard.
 */
type Agenda = {
  id: string;
  title: string;
  meta: string;
  tone: 'accent' | 'gold';
  icon: LucideIcon;
};

const AGENDA: Agenda[] = [
  { id: 'a1', title: 'برمجة متقدمة — قاعة 301', meta: 'اليوم · 10:00 ص',  tone: 'accent', icon: Presentation },
  { id: 'a2', title: 'تسليم مشروع التخرج',     meta: 'غداً · 11:59 م',   tone: 'gold',   icon: FileText      },
  { id: 'a3', title: 'معمل الذكاء الاصطناعي — قاعة 205', meta: 'الخميس · 2:00 م', tone: 'accent', icon: FlaskConical },
];

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = useGreeting();
  const widgets = useDashboardStore((s) => s.widgets);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const isVisible = (id: string) => widgets.find((w) => w.id === id)?.visible ?? true;
  const sorted = [...widgets].sort((a, b) => a.order - b.order);

  const renderWidget = (id: string, idx: number) => {
    if (!isVisible(id)) return null;
    const staggerStyle = { '--stagger-index': idx } as React.CSSProperties;

    switch (id) {
      case 'stats':
        return (
          <section key="stats" className="dash-quick-stats reveal" style={staggerStyle} aria-label="إحصائيات سريعة">
            <div className="dash-stat-tile" data-tone="accent">
              <div className="dash-stat-icon">
                <Icon icon={BookOpen} size={20} />
              </div>
              <span className="dash-stat-value" data-numeric="true">4</span>
              <span className="dash-stat-label">مواد نشطة</span>
            </div>
            <div className="dash-stat-tile" data-tone="gold">
              <div className="dash-stat-icon">
                <Icon icon={FileText} size={20} />
              </div>
              <span className="dash-stat-value" data-numeric="true">3</span>
              <span className="dash-stat-label">واجبات</span>
            </div>
            <div className="dash-stat-tile" data-tone="success">
              <div className="dash-stat-icon">
                <Icon icon={Clock} size={20} />
              </div>
              <span className="dash-stat-value" data-numeric="true">12</span>
              <span className="dash-stat-label">ساعة هذا الأسبوع</span>
            </div>
            <div className="dash-stat-tile" data-tone="flame">
              <div className="dash-stat-icon">
                <Icon icon={Flame} size={20} />
              </div>
              <span className="dash-stat-value" data-numeric="true">7</span>
              <span className="dash-stat-label">أيام متتالية</span>
            </div>
          </section>
        );

      case 'gpa':
        return (
          <Card key="gpa" className="dash-gpa-card reveal" style={staggerStyle}>
            <div className="dash-gpa-body">
              <div className="dash-gpa-text">
                <div className="dash-eyebrow">المعدل التراكمي</div>
                <div className="dash-gpa-gauge" data-high="true">
                  <div className="dash-gpa-gauge-ring" />
                  <span className="dash-gpa-gauge-center" data-numeric="true">3.8</span>
                </div>
                <Badge color="green">ممتاز</Badge>
              </div>
              <div className="dash-gpa-orb">
                <Icon icon={GraduationCap} size={26} />
              </div>
            </div>
          </Card>
        );

      case 'progress':
        return (
          <Card key="progress" className="dash-progress-card reveal" style={staggerStyle}>
            <div className="dash-progress-body">
              <div className="dash-css-progress-ring">
                <div className="dash-css-progress-ring-fill" />
                <span className="dash-css-progress-ring-center" data-numeric="true">75%</span>
              </div>

              <div className="dash-progress-text">
                <div className="dash-eyebrow">التقدّم الأكاديمي</div>
                <div className="dash-progress-value">60 من 80 ساعة معتمدة</div>
                <div className="dash-progress-note">على مسار التخرّج في الموعد</div>
              </div>
            </div>
          </Card>
        );

      case 'term':
        return (
          <Card key="term" className="dash-term-card reveal" style={staggerStyle}>
            <header className="dash-term-head">
              <span className="dash-eyebrow">تقدّم الفصل الدراسي الحالي</span>
              <span className="dash-term-pct" data-numeric="true">60%</span>
            </header>
            <div className="dash-term-bar-wrapper">
              <div className="dash-term-milestones">
                <span className="dash-term-milestone passed" />
                <span className="dash-term-milestone passed" />
                <span className="dash-term-milestone" />
              </div>
              <span className="dash-term-week-badge" style={{ insetInlineStart: '60%' }}>
                الأسبوع 9
              </span>
              <div className="dash-term-bar" role="progressbar" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: '60%' }} />
              </div>
            </div>
            <footer className="dash-term-foot">
              <span>بداية الفصل · 10/09</span>
              <span>نهاية الفصل · 15/01</span>
            </footer>
          </Card>
        );

      case 'agenda':
        return (
          <section key="agenda" className="dash-agenda reveal" style={staggerStyle}>
            <header className="dash-agenda-head">
              <h2 className="dash-section-title">المهام والفصول القادمة</h2>
            </header>
            <div className="dash-agenda-list">
              {AGENDA.map((item) => (
                <Card key={item.id} className="dash-agenda-item" data-tone={item.tone}>
                  <div className="dash-agenda-icon">
                    <Icon icon={item.icon} size={22} />
                  </div>
                  <div className="dash-agenda-text">
                    <div className="dash-agenda-title">{item.title}</div>
                    <div className="dash-agenda-meta">{item.meta}</div>
                  </div>
                  <span className="dash-agenda-view">عرض</span>
                </Card>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page student-dashboard">
      {/* ── Welcome Banner ─────────────────────────────────────── */}
      <header className="page-header welcome-card">
        <div className="welcome-card-particles">
          <span className="welcome-particle-dot" />
          <span className="welcome-particle-dot" />
          <span className="welcome-particle-dot" />
        </div>
        <div className="dash-header-row">
          <h1 className="page-title">
            {greeting.emoji} {greeting.text}، {user?.firstName ?? 'أحمد'}
          </h1>
          <DashboardCustomizerTrigger onClick={() => setCustomizerOpen(true)} />
        </div>
        <p className="page-subtitle">لوحة متابعة تقدّمك الأكاديمي.</p>

        <nav className="dash-quick-actions" aria-label="إجراءات سريعة">
          <Link to="/student/courses" className="dash-quick-action-pill">
            <Icon icon={BookOpen} size={16} />
            المواد الدراسية
          </Link>
          <Link to="/student/ai" className="dash-quick-action-pill">
            <Icon icon={Sparkles} size={16} />
            المساعد الذكي
          </Link>
          <Link to="/student/schedule" className="dash-quick-action-pill">
            <Icon icon={Calendar} size={16} />
            الجدول
          </Link>
          <Link to="/achievements" className="dash-quick-action-pill">
            <Icon icon={Trophy} size={16} />
            الإنجازات
          </Link>
        </nav>
      </header>

      {/* ── Dynamic widgets based on dashboard store ── */}
      {/* Hero KPIs row wraps GPA + Progress */}
      {(isVisible('gpa') || isVisible('progress')) && (
        <section className="dash-hero-row">
          {sorted
            .filter((w) => (w.id === 'gpa' || w.id === 'progress') && w.visible)
            .map((w, i) => renderWidget(w.id, i))}
        </section>
      )}

      {/* Other widgets rendered in order */}
      {sorted
        .filter((w) => w.id !== 'gpa' && w.id !== 'progress')
        .map((w, i) => renderWidget(w.id, i + 2))}

      {/* Dashboard Customizer Modal */}
      <DashboardCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </div>
  );
}
