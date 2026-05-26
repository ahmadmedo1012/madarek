import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  User, Brain, GraduationCap, Network,
  Building2, Users2, Award,
  Compass, Sparkles, ShieldCheck, BookMarked,
  ArrowLeft, Menu, X,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { BrandMark } from '../components/BrandMark';
import { Reveal } from '../hooks/useReveal';

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
      {/* Ministry affiliation strip — official identifier across the top */}
      <div className="ministry-strip">
        <div className="ministry-strip-inner">
          <span className="ministry-strip-emblem" aria-hidden>🇱🇾</span>
          <span className="ministry-strip-text">
            دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
          </span>
        </div>
      </div>

      <header className="landing-header">
        <div className="landing-header-login">
          <Link to="/auth" className="btn">
            تسجيل الدخول
            <Icon icon={User} size={16} />
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
          <a href="#pillars">الأدوار</a>
          <a href="#proof">النتائج</a>
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

      {/* Mobile dropdown menu — only visible when burger is toggled on small screens */}
      {menuOpen && (
        <nav className="landing-mobile-menu" onClick={closeMenu}>
          <a href="#features">المميزات</a>
          <a href="#pillars">الأدوار</a>
          <a href="#proof">النتائج</a>
          <a href="#about">عن المنصة</a>
          <Link to="/auth" className="btn primary">
            تسجيل الدخول
            <Icon icon={ArrowLeft} size={14} />
          </Link>
        </nav>
      )}

      <main className="landing-shell">

        {/* ═══════════ HERO ═══════════ */}
        <section className="landing-hero">
          <Reveal as="div" className="landing-hero-content">
            <h1 className="landing-title">
              منصة الزاوية:
              <span className="block">جامعة الزاوية للتعليم الذكي</span>
            </h1>
            <p className="landing-subtitle">
              منصة أكاديمية متطورة تجمع بين الابتكار والتميز لتمكين قادة المستقبل
              في جامعة الزاوية وفروعها — تحت إشراف وزارة التعليم العالي والبحث العلمي.
            </p>
            <div className="landing-cta-row">
              <Link to="/auth" className="btn primary">
                ابدأ رحلتك الآن
                <Icon icon={ArrowLeft} size={14} />
              </Link>
              <a href="#features" className="btn outline">اكتشف المنصة</a>
            </div>
          </Reveal>
          <Reveal as="figure" className="landing-hero-img" delay={2}>
            <img
              src="/brand/zu-campus.jpg"
              srcSet="/brand/zu-campus-sm.jpg 800w, /brand/zu-campus.jpg 1400w"
              sizes="(max-width: 900px) 100vw, 600px"
              alt="حرم جامعة الزاوية الرئيسي — البوابة الرئيسية"
              loading="eager"
              width="1400"
              height="780"
            />
            <figcaption className="landing-hero-credit">
              الحرم الرئيسي · جامعة الزاوية
            </figcaption>
          </Reveal>
        </section>

        {/* ═══════════ STATS STRIP ═══════════ */}
        <Reveal as="section" className="kpi-strip">
          <div className="kpi-cell">
            <div className="kpi-icon" style={{ background: 'rgba(41, 82, 200, 0.10)', color: '#1e40af' }}>
              <Icon icon={Building2} size={20} />
            </div>
            <div>
              <div className="kpi-value">29</div>
              <div className="kpi-label">كلية أكاديمية</div>
            </div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-icon" style={{ background: 'rgba(14, 92, 47, 0.10)', color: '#0E5C2F' }}>
              <Icon icon={Users2} size={20} />
            </div>
            <div>
              <div className="kpi-value">+50K</div>
              <div className="kpi-label">طالب مسجَّل</div>
            </div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-icon" style={{ background: 'rgba(123, 58, 237, 0.10)', color: '#7B3AED' }}>
              <Icon icon={GraduationCap} size={20} />
            </div>
            <div>
              <div className="kpi-value">2.5K</div>
              <div className="kpi-label">عضو هيئة تدريس</div>
            </div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-icon" style={{ background: 'rgba(212, 165, 55, 0.12)', color: '#B8861E' }}>
              <Icon icon={Award} size={20} />
            </div>
            <div>
              <div className="kpi-value">#6</div>
              <div className="kpi-label">على مستوى ليبيا</div>
            </div>
          </div>
        </Reveal>

        {/* ═══════════ FEATURES ═══════════ */}
        <section id="features" className="landing-features">
          <Reveal as="h2" className="landing-features-title">مميزاتنا</Reveal>
          <div className="landing-features-grid">
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon">
              <Icon icon={Compass} size={24} />
            </div>
            <h3 className="landing-feature-title">المصفوفة التعليمية</h3>
            <p className="landing-feature-desc">
              نموذج معرفي شخصي لكل طالب يكتشف الفجوات تلقائياً، ويربطها بدقائق المحاضرة
              التي تشرحها — تعلّم مخصَّص، لا قالب واحد للجميع.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon">
              <Icon icon={Network} size={24} />
            </div>
            <h3 className="landing-feature-title">منظومة موحَّدة</h3>
            <p className="landing-feature-desc">
              دمج كامل للحضور والدرجات والامتحانات والبحوث في تجربة واحدة متاحة
              لكل طالب وأستاذ ومسؤول جودة — بدون تطبيقات مشتّتة.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon">
              <Icon icon={Brain} size={24} />
            </div>
            <h3 className="landing-feature-title">ذكاء اصطناعي مساعد</h3>
            <p className="landing-feature-desc">
              مساعد دراسي يجيب على أسئلتك ويقترح مسارات مراجعة بناءً على أدائك
              الفعلي — يساعد الأستاذ ويرشد الطالب بدقة.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon">
              <Icon icon={BookMarked} size={24} />
            </div>
            <h3 className="landing-feature-title">المعامل الافتراضية</h3>
            <p className="landing-feature-desc">
              بيئات محاكاة معتمدة في الجامعة لتعزيز الفهم العملي
              — جاهزة لكليات الهندسة، تقنية المعلومات، والعلوم.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon">
              <Icon icon={Sparkles} size={24} />
            </div>
            <h3 className="landing-feature-title">البحث العلمي</h3>
            <p className="landing-feature-desc">
              رحلة بحث طلابي متكاملة: رفع، فحص انتحال وذكاء اصطناعي،
              مراجعة أستاذ، ثم نشر في مكتبة الجامعة الرقمية.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon">
              <Icon icon={ShieldCheck} size={24} />
            </div>
            <h3 className="landing-feature-title">ضمان الجودة</h3>
            <p className="landing-feature-desc">
              لوحة رقابية مستقلة لمكتب الجودة: مؤشرات الانخراط، أداء المقررات،
              ومراجعة المحتوى — رؤية مؤسسية شاملة.
            </p></Reveal>
          </div>
        </section>

        {/* ═══════════ ROLE PILLARS ═══════════ */}
        <section id="pillars" className="landing-features">
          <Reveal as="h2" className="landing-features-title">أربعة أدوار، تجربة موحَّدة</Reveal>
          <p className="landing-subtitle" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto var(--sp-6)' }}>
            كل دور أكاديمي يرى ما يخصّه فقط — صلاحيات مدروسة وفصل واضح بين الواجبات.
          </p>
          <div className="landing-features-grid">
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Icon icon={GraduationCap} size={20} />
            </div>
            <h3 className="landing-feature-title">الطالب</h3>
            <p className="landing-feature-desc">
              مقررات، مصفوفة معرفية، مساعد ذكي، إنجازات وشهادات،
              فرص عمل، مكتبة بحوث، اختبارات إلكترونية.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon" style={{ background: 'rgba(16, 185, 129, 0.10)', color: '#059669' }}>
              <Icon icon={Brain} size={20} />
            </div>
            <h3 className="landing-feature-title">الأستاذ</h3>
            <p className="landing-feature-desc">
              ذكاء أكاديمي يكشف الطلاب المعرضين، إدارة المحاضرات والدرجات،
              بث مباشر، ومعامل افتراضية بصلاحيات تحكم.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon" style={{ background: 'rgba(123, 58, 237, 0.10)', color: '#7B3AED' }}>
              <Icon icon={Building2} size={20} />
            </div>
            <h3 className="landing-feature-title">الإدارة</h3>
            <p className="landing-feature-desc">
              إدارة الكليات والأساتذة والمقررات، تقارير، ومزامنة يومية
              مع البيانات الرسمية لجامعة الزاوية.
            </p></Reveal>
            <Reveal as="div" className="landing-feature-card"><div className="landing-feature-icon" style={{ background: 'rgba(212, 165, 55, 0.12)', color: '#B8861E' }}>
              <Icon icon={ShieldCheck} size={20} />
            </div>
            <h3 className="landing-feature-title">ضمان الجودة</h3>
            <p className="landing-feature-desc">
              رؤية للمؤشرات المؤسسية: جودة المقررات، تقييم الأساتذة،
              مراجعة الاختبارات والمناهج، تقارير الجودة.
            </p></Reveal>
          </div>
        </section>

        {/* ═══════════ PROOF / PILOT RESULTS ═══════════ */}
        <section id="proof" className="landing-features">
          <Reveal as="h2" className="landing-features-title">نتائج تجربة ميدانية</Reveal>
          <p className="landing-subtitle" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto var(--sp-6)' }}>
            اعتمدنا استراتيجية الصف المعكوس على مادة اللغة الإنجليزية مع طلاب من جنوب
            ليبيا، بمشاركة خبراء دوليين. الأرقام أدناه نتائج التجربة الفعلية.
          </p>

          <div className="landing-pilot">
            <Reveal as="div" className="landing-pilot-stat"><div className="landing-pilot-value">40<span>%</span></div>
            <div className="landing-pilot-label">تحسّن الاستيعاب</div>
            <div className="landing-pilot-note">مقارنة بالأسلوب التقليدي</div></Reveal>
            <Reveal as="div" className="landing-pilot-stat"><div className="landing-pilot-value">70<span>%</span></div>
            <div className="landing-pilot-label">زيادة في المشاركة</div>
            <div className="landing-pilot-note">داخل الحلقات النقاشية</div></Reveal>
            <Reveal as="div" className="landing-pilot-stat"><div className="landing-pilot-value">30<span>%</span></div>
            <div className="landing-pilot-label">تحسّن في الالتزام</div>
            <div className="landing-pilot-note">بمتابعة الجلسات</div></Reveal>
            <Reveal as="div" className="landing-pilot-stat highlight"><div className="landing-pilot-value">90<span>%</span></div>
            <div className="landing-pilot-label">تحقيق أهداف التعلّم</div>
            <div className="landing-pilot-note">ضمن الإطار الزمني المحدّد</div></Reveal>
          </div>

          <Reveal as="div" className="landing-proof" style={{ marginTop: 'var(--sp-6)' }}>
            <p className="landing-proof-quote">
              «تجربة المعامل الافتراضية على 40 طالباً في جامعة سرت أظهرت تفوّقاً واضحاً
              للفريق الذي استخدم المنصة على فريق التعليم التقليدي. هذا ما نطمح لأن
              نقدّمه على مستوى جامعة الزاوية بأكملها.»
            </p>
            <div className="landing-proof-source">— من دراسة جامعة سرت، 2024</div>
          </Reveal>
        </section>

        {/* ═══════════ ABOUT ═══════════ */}
        <section id="about" className="landing-features">
          <Reveal as="h2" className="landing-features-title">عن المنصة</Reveal>
          <p className="landing-subtitle" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            منصة الزاوية للتعليم الذكي هي المنصة التعليمية الرسمية لجامعة الزاوية، تأسست لتربط الطلاب
            والأساتذة والإدارة في بيئة رقمية واحدة، تحت إشراف وزارة التعليم العالي
            والبحث العلمي · ليبيا. كل زر، كل بطاقة، كل شاشة مكتوبة من الصفر، ومُختبَرة
            مع طلاب وأساتذة فعليين من كليات الجامعة.
          </p>

          <div className="landing-cta-row" style={{ justifyContent: 'center', marginTop: 'var(--sp-6)' }}>
            <Link to="/auth" className="btn primary">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </div>
        </section>
      </main>

      <div className="landing-shell">
        <footer className="landing-footer">
          <div className="landing-footer-links">
            <Link to="/auth">تسجيل الدخول</Link>
            <a href="#features">المميزات</a>
            <a href="#pillars">الأدوار</a>
            <a href="#proof">النتائج</a>
            <a href="#about">عن المنصة</a>
            <span>© {year} منصة الزاوية للتعليم الذكي · جامعة الزاوية</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
