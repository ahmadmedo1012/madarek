import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Brain, Network,
  Compass, BarChart3,
  ArrowLeft, Menu, X,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { BrandMark } from '../components/BrandMark';
import { LibyaFlag } from '../components/LibyaFlag';
import { Reveal } from '../hooks/useReveal';
import { CountUp } from '../components/CountUp';

export default function LandingPage() {
  useThemeSync();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (isHydrated && user) {
    const home =
      user.role === 'TEACHER' ? '/teacher/dashboard' :
      user.role === 'ADMIN' ? '/admin/dashboard' :
      user.role === 'QUALITY' ? '/quality/dashboard' :
      '/student/dashboard';
    navigate(home, { replace: true });
    return null;
  }

  const year = new Date().getFullYear();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing">
      {/* Ministry affiliation strip */}
      <div className="ministry-strip">
        <div className="ministry-strip-inner">
          <span className="ministry-strip-emblem" aria-hidden><LibyaFlag size={18} /></span>
          <span className="ministry-strip-text">
            دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-login">
          <Link to="/auth" className="btn primary">
            تسجيل الدخول
          </Link>
          <button
            type="button"
            className="landing-burger"
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon icon={menuOpen ? X : Menu} size={20} />
          </button>
        </div>
        <nav className="landing-nav">
          <a href="#features">المميزات</a>
          <a href="#about">عن المنصة</a>
        </nav>
        <Link to="/" className="landing-brand" aria-label="منصة الزاوية للتعليم الذكي">
          <BrandMark size={36} />
          <span className="landing-brand-text">
            <span className="landing-brand-name">الزاوية</span>
            <span className="landing-brand-sub">جامعة الزاوية</span>
          </span>
        </Link>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="landing-mobile-menu" onClick={closeMenu}>
          <a href="#features">المميزات</a>
          <a href="#about">عن المنصة</a>
          <Link to="/auth" className="btn primary">
            تسجيل الدخول
            <Icon icon={ArrowLeft} size={14} />
          </Link>
        </nav>
      )}

      <main className="landing-shell">

        {/* Hero Section */}
        <section className="landing-hero">
          <Reveal as="div" className="landing-hero-content">
            <span className="landing-hero-eyebrow">
              المنصة الرسمية لجامعة الزاوية
            </span>
            <h1 className="landing-title">
              منصة الزاوية:
              <span className="block">جامعة الزاوية للتعليم الذكي</span>
            </h1>
            <p className="landing-subtitle">
              منصة أكاديمية متطورة تجمع بين الابتكار والتميز لتمكين قادة المستقبل
              في جامعة الزاوية وفروعها، تحت إشراف وزارة التعليم العالي والبحث العلمي.
            </p>
            <div className="landing-cta-row">
              <Link to="/auth" className="btn primary">
                ابدأ رحلتك الآن
                <Icon icon={ArrowLeft} size={14} />
              </Link>
              <a href="#features" className="btn outline">اكتشف المنصة</a>
            </div>
          </Reveal>
        </section>

        {/* Stats Strip */}
        <Reveal as="section" className="kpi-strip">
          <div className="kpi-cell">
            <div>
              <div className="kpi-value"><CountUp value="29" /></div>
              <div className="kpi-label">كلية أكاديمية</div>
            </div>
          </div>
          <div className="kpi-cell">
            <div>
              <div className="kpi-value"><CountUp value="+50K" /></div>
              <div className="kpi-label">طالب مسجل</div>
            </div>
          </div>
          <div className="kpi-cell">
            <div>
              <div className="kpi-value"><CountUp value="2.5K" /></div>
              <div className="kpi-label">عضو هيئة تدريس</div>
            </div>
          </div>
          <div className="kpi-cell">
            <div>
              <div className="kpi-value">#6</div>
              <div className="kpi-label">على مستوى ليبيا</div>
            </div>
          </div>
        </Reveal>

        {/* Features Section */}
        <section id="features" className="landing-features">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">لماذا مدارك؟</span>
            <Reveal as="h2" className="landing-features-title">منظومة متكاملة لتعليم ذكي</Reveal>
            <p className="landing-section-lede">
              تصميم يضع الطالب في المركز مع تجربة تجمع بين التكنولوجيا المتقدمة وسهولة الاستخدام.
            </p>
          </div>
          <div className="landing-bento">
            <Reveal as="div" className="landing-bento-card landing-bento-wide">
              <div className="landing-bento-icon" data-tone="primary">
                <Icon icon={Compass} size={28} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">المصفوفة التعليمية الذكية</h3>
                <p className="landing-bento-desc">
                  مسارات تعلم تتكيف مع مستوى تقدمك ونقاط قوتك وضعفك،
                  لتضمن أقصى استفادة من وقتك.
                </p>
              </div>
            </Reveal>
            <Reveal as="div" className="landing-bento-card">
              <div className="landing-bento-icon" data-tone="tertiary">
                <Icon icon={Brain} size={26} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">مساعد ذكاء اصطناعي</h3>
                <p className="landing-bento-desc">
                  رفيق دراسي يفهم سياق دراستك ويقدم شروحات مخصصة لكل طالب.
                </p>
              </div>
            </Reveal>
            <Reveal as="div" className="landing-bento-card">
              <div className="landing-bento-icon" data-tone="secondary">
                <Icon icon={BarChart3} size={26} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">تحليلات دقيقة</h3>
                <p className="landing-bento-desc">
                  لوحة تتبع تقدمك لحظة بلحظة مع تفاصيل المقررات والدرجات والحضور.
                </p>
              </div>
            </Reveal>
            <Reveal as="div" className="landing-bento-card landing-bento-wide">
              <div className="landing-bento-icon" data-tone="surface">
                <Icon icon={Network} size={28} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">منظومة موحدة لكل الأدوار</h3>
                <p className="landing-bento-desc">
                  دمج كامل للحضور والدرجات والامتحانات والبحوث في
                  منصة متجاوبة تعمل بكفاءة على هاتفك أو حاسوبك.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="landing-features">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">عن المنصة</span>
            <Reveal as="h2" className="landing-features-title">منصة رسمية لجامعة عريقة</Reveal>
          </div>
          <p className="landing-subtitle" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            منصة الزاوية للتعليم الذكي هي المنصة التعليمية الرسمية لجامعة الزاوية، تأسست لتربط الطلاب
            والأساتذة والإدارة في بيئة رقمية واحدة، تحت إشراف وزارة التعليم العالي
            والبحث العلمي. كل شاشة مكتوبة من الصفر ومختبرة مع طلاب وأساتذة فعليين
            من كليات الجامعة.
          </p>
        </section>

        {/* Final CTA Section */}
        <Reveal as="section" className="landing-final-cta">
          <div className="landing-final-cta-inner">
            <h2 className="landing-final-cta-title">
              منصتك الأكاديمية بانتظارك
            </h2>
            <p className="landing-final-cta-lede">
              سجل دخولك ببريدك الجامعي أو رقم قيدك للوصول إلى مقرراتك
              ومتابعة تقدمك الأكاديمي.
            </p>
            <div className="landing-final-cta-actions">
              <Link to="/auth" className="btn primary landing-final-cta-btn">
                تسجيل الدخول
                <Icon icon={ArrowLeft} size={16} />
              </Link>
            </div>
          </div>
        </Reveal>
      </main>

      {/* Footer */}
      <div className="landing-shell">
        <footer className="landing-footer">
          <div className="landing-footer-links">
            <Link to="/auth">تسجيل الدخول</Link>
            <a href="#features">المميزات</a>
            <a href="#about">عن المنصة</a>
            <span>&copy; {year} منصة الزاوية للتعليم الذكي &middot; جامعة الزاوية</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
