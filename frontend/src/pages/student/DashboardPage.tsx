import { useState } from 'react';
import {
  Presentation, FileText, FlaskConical,
  BookOpen, Sparkles, Calendar, Trophy, Clock, Flame,
  TrendingUp, Activity,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useDashboardStore } from '../../stores/dashboard.store';
import { DashboardCustomizer, DashboardCustomizerTrigger } from '../../components/DashboardCustomizer';
import { GamificationWidget } from '../../components/GamificationWidget';
import { DashboardWaveIllustration } from '../../components/illustrations';
import {
  AnimatedCounter, RadialProgress, MiniArea, HeatmapWeeks, TrendChip, Sparkline,
} from '../../lib/charts';

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
              <span className="dash-stat-value" data-numeric="true">
                <AnimatedCounter to={4} />
              </span>
              <span className="dash-stat-label">مواد نشطة</span>
              <Sparkline data={[3, 3, 4, 4, 4, 4, 4]} color="primary" height={22} />
            </div>
            <div className="dash-stat-tile" data-tone="gold">
              <div className="dash-stat-icon">
                <Icon icon={FileText} size={20} />
              </div>
              <span className="dash-stat-value" data-numeric="true">
                <AnimatedCounter to={3} />
              </span>
              <span className="dash-stat-label">واجبات</span>
              <Sparkline data={[1, 2, 2, 3, 4, 3, 3]} color="gold" height={22} />
            </div>
            <div className="dash-stat-tile" data-tone="success">
              <div className="dash-stat-icon">
                <Icon icon={Clock} size={20} />
              </div>
              <span className="dash-stat-value" data-numeric="true">
                <AnimatedCounter to={12} />
              </span>
              <span className="dash-stat-label">ساعة هذا الأسبوع</span>
              <Sparkline data={[2, 1, 2, 3, 1, 2, 1]} color="action" height={22} />
            </div>
            <div className="dash-stat-tile" data-tone="flame">
              <div className="dash-stat-icon">
                <Icon icon={Flame} size={20} />
              </div>
              <span className="dash-stat-value" data-numeric="true">
                <AnimatedCounter to={7} />
              </span>
              <span className="dash-stat-label">أيام متتالية</span>
              <Sparkline data={[1, 1, 1, 1, 1, 1, 1]} color="ai" height={22} />
            </div>
          </section>
        );

      case 'gpa':
        return (
          <Card key="gpa" className="dash-gpa-card reveal" style={staggerStyle}>
            <div className="dash-gpa-body" style={{ width: '100%' }}>
              <div className="intel-card-meta">
                <div className="left">
                  <span className="left-label">المعدل التراكمي</span>
                  <span className="left-value">
                    <AnimatedCounter to={3.8} decimals={2} />
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <Badge color="green">ممتاز</Badge>
                  <TrendChip delta={0.12} suffix="" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <RadialProgress
                  value={(3.8 / 4.0) * 100}
                  size={132}
                  thickness={9}
                  color="primary"
                  label={<AnimatedCounter to={3.8} decimals={2} />}
                  sublabel="من 4.00"
                />
                <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 'var(--fs-xxs)', color: 'var(--text-subtle)',
                    marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
                    fontWeight: 600,
                  }}>
                    <span>تطوّر المعدل · 6 فصول</span>
                    <Icon icon={TrendingUp} size={12} />
                  </div>
                  <MiniArea
                    data={[3.42, 3.55, 3.61, 3.68, 3.72, 3.80]}
                    labels={['ف1', 'ف2', 'ف3', 'ف4', 'ف5', 'ف6']}
                    color="primary"
                    height={72}
                  />
                </div>
              </div>
            </div>
          </Card>
        );

      case 'progress':
        return (
          <Card key="progress" className="dash-progress-card reveal" style={staggerStyle}>
            <div className="intel-card-meta">
              <div className="left">
                <span className="left-label">التقدّم الأكاديمي</span>
                <span className="left-value">
                  <AnimatedCounter to={75} suffix="%" />
                </span>
              </div>
              <Badge color="brand">على المسار</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <RadialProgress
                value={75}
                size={132}
                thickness={9}
                color="action"
                label={<AnimatedCounter to={75} suffix="%" />}
                sublabel="ساعة معتمدة"
              />
              <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                <div style={{
                  fontSize: 'var(--fs-sm)', color: 'var(--text)',
                  fontWeight: 600, marginBottom: 4,
                }}>
                  <AnimatedCounter to={60} /> من 80 ساعة معتمدة
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }}>
                  متوقّع التخرّج في الموعد · فصل واحد متبقي
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 'var(--fs-xxs)', color: 'var(--text-subtle)',
                  marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
                  fontWeight: 600,
                }}>
                  <span>إنجاز المواد · أسبوعياً</span>
                  <Icon icon={Activity} size={12} />
                </div>
                <MiniArea
                  data={[5, 8, 11, 9, 14, 16, 18, 22, 25]}
                  labels={['أ1', 'أ2', 'أ3', 'أ4', 'أ5', 'أ6', 'أ7', 'أ8', 'أ9']}
                  color="action"
                  height={56}
                />
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

      case 'streak':
        return (
          <Card key="streak" className="reveal" style={staggerStyle}
            title="نشاطك التعليمي · آخر 4 أسابيع"
            icon={Flame}
            subtitle="كل خانة تمثل ساعات مذاكرة في يوم"
          >
            <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <HeatmapWeeks
                weeks={[
                  [1, 2, 0, 3, 1, 0, 2],
                  [2, 3, 1, 2, 3, 1, 0],
                  [1, 4, 2, 3, 4, 2, 1],
                  [3, 4, 3, 4, 5, 2, 1],
                ]}
                color="action"
                cellSize={18}
                ariaLabel="نشاط آخر 28 يوم"
              />
              <div style={{ display: 'grid', gap: 'var(--sp-3)', minWidth: 220, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
                  <span className="text-xs text-muted">أطول سلسلة</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    <AnimatedCounter to={12} suffix=" يوم" />
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
                  <span className="text-xs text-muted">المتوسط اليومي</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    <AnimatedCounter to={2.4} decimals={1} suffix=" س" />
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
                  <span className="text-xs text-muted">إجمالي هذا الشهر</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    <AnimatedCounter to={68} suffix=" س" />
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
                  <span className="text-xs text-muted">أيام نشطة</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    <AnimatedCounter to={23} suffix=" / 28" />
                  </span>
                </div>
              </div>
            </div>
          </Card>
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
        <DashboardWaveIllustration className="" />
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

      {/* Gamification Widget */}
      <GamificationWidget />

      {/* Other widgets rendered in order */}
      {sorted
        .filter((w) => w.id !== 'gpa' && w.id !== 'progress')
        .map((w, i) => renderWidget(w.id, i + 2))}

      {/* Streak heatmap — explicit render for users with older persisted
          dashboard state (where 'streak' doesn't exist in the store). */}
      {!sorted.some((w) => w.id === 'streak') && isVisible('streak') &&
        renderWidget('streak', 99)}

      {/* Dashboard Customizer Modal */}
      <DashboardCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </div>
  );
}
