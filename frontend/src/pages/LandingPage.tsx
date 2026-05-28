import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import {
  User, Brain, GraduationCap, Network,
  Building2, Users2, Award,
  Compass, Sparkles, ShieldCheck, BarChart3,
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
        <Link to="/" className="landing-brand" aria-label="مدارك - منصة التعليم الذكي">
          <BrandMark size={36} />
          <span className="landing-brand-text">
            <span className="landing-brand-name">مدارك</span>
            <span className="landing-brand-sub">التعليم الذكي</span>
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
              مدارك:
              <span className="block">منصة التعليم الذكي</span>
            </h1>
            <p className="landing-subtitle">
              منصة أكاديمية متطورة تجمع بين الابتكار والتميز لتمكين قادة المستقبل في بيئة تعليمية ذكية ومتكاملة.
            </p>
            <div className="landing-cta-glass">
              <Link to="/auth" className="btn primary">
                ابدأ رحلتك الآن
                <Icon icon={ArrowLeft} size={14} />
              </Link>
              <a href="#features" className="btn outline">اكتشف المنصة</a>
            </div>
          </Reveal>
          <Reveal as="div" className="landing-hero-showcase" delay={2}>
            {/* Floating card 1: GPA */}
            <div className="landing-hero-float-card">
              <div className="landing-hero-float-card-header">
                <div className="landing-hero-float-card-icon" data-variant="gpa">
                  <Icon icon={GraduationCap} size={16} />
                </div>
                <span className="landing-hero-float-card-label">المعدل التراكمي</span>
              </div>
              <div className="landing-hero-float-card-value">3.82</div>
              <div className="landing-hero-float-card-sub">الفصل الحالي: ممتاز</div>
            </div>
            {/* Floating card 2: AI Chat */}
            <div className="landing-hero-float-card">
              <div className="landing-hero-float-card-header">
                <div className="landing-hero-float-card-icon" data-variant="ai">
                  <Icon icon={Sparkles} size={16} />
                </div>
                <span className="landing-hero-float-card-label">Oasis AI</span>
              </div>
              <div className="landing-hero-float-card-value" style={{ fontSize: 14, fontWeight: 500 }}>
                اشرح لي الخوارزميات الجينية...
              </div>
              <div className="landing-hero-float-card-sub">يكتب الآن...</div>
            </div>
            {/* Floating card 3: Learning Path */}
            <div className="landing-hero-float-card">
              <div className="landing-hero-float-card-header">
                <div className="landing-hero-float-card-icon" data-variant="path">
                  <Icon icon={Compass} size={16} />
                </div>
                <span className="landing-hero-float-card-label">المسار التعليمي</span>
              </div>
              <div className="landing-hero-float-card-value" style={{ fontSize: 16 }}>78%</div>
              <div className="landing-hero-float-card-sub">12 من 15 وحدة مكتملة</div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════ STATS STRIP ═══════════ */}
        <Reveal as="section" className="kpi-strip">
          <div className="kpi-cell" data-tone="blue">
            <div className="kpi-icon">
              <Icon icon={Building2} size={20} />
            </div>
            <div>
              <div className="kpi-value">29</div>
              <div className="kpi-label">كلية أكاديمية</div>
            </div>
          </div>
          <div className="kpi-cell" data-tone="green">
            <div className="kpi-icon">
              <Icon icon={Users2} size={20} />
            </div>
            <div>
              <div className="kpi-value">+50K</div>
              <div className="kpi-label">طالب مسجَّل</div>
            </div>
          </div>
          <div className="kpi-cell" data-tone="purple">
            <div className="kpi-icon">
              <Icon icon={GraduationCap} size={20} />
            </div>
            <div>
              <div className="kpi-value">2.5K</div>
              <div className="kpi-label">عضو هيئة تدريس</div>
            </div>
          </div>
          <div className="kpi-cell" data-tone="gold">
            <div className="kpi-icon">
              <Icon icon={Award} size={20} />
            </div>
            <div>
              <div className="kpi-value">#6</div>
              <div className="kpi-label">على مستوى ليبيا</div>
            </div>
          </div>
        </Reveal>

        {/* ═══════════ FEATURES — Bento Grid (Stitch pattern) ═══════════ */}
        <section id="features" className="landing-features">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">لماذا مدارك؟</span>
            <Reveal as="h2" className="landing-features-title">منظومة متكاملة لتعليم ذكي</Reveal>
            <p className="landing-section-lede">
              تصميم يضع الطالب في المركز — تجربة تجمع بين التكنولوجيا المتقدمة وسهولة الاستخدام.
            </p>
          </div>
          <div className="landing-bento">
            {/* Card 1 — span 2 cols */}
            <Reveal as="div" className="landing-bento-card landing-bento-wide" data-tone="primary">
              <div className="landing-bento-icon" data-tone="primary">
                <Icon icon={Compass} size={28} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">المصفوفة التعليمية الذكية</h3>
                <p className="landing-bento-desc">
                  مسارات تعلم تتكيف مع مستوى تقدمك ونقاط قوتك وضعفك،
                  لتضمن أقصى استفادة من وقتك. نموذج معرفي شخصي لكل طالب
                  يكتشف الفجوات تلقائياً ويربطها بالدقائق التي تشرحها.
                </p>
              </div>
            </Reveal>
            {/* Card 2 — 1 col */}
            <Reveal as="div" className="landing-bento-card" data-tone="tertiary">
              <div className="landing-bento-icon" data-tone="tertiary">
                <Icon icon={Brain} size={26} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">مساعد ذكاء اصطناعي</h3>
                <p className="landing-bento-desc">
                  Oasis — رفيق دراسي يفهم سياق دراستك ويقدم شروحات مخصصة.
                </p>
              </div>
            </Reveal>
            {/* Card 3 — 1 col */}
            <Reveal as="div" className="landing-bento-card" data-tone="secondary">
              <div className="landing-bento-icon" data-tone="secondary">
                <Icon icon={BarChart3} size={26} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">تحليلات دقيقة</h3>
                <p className="landing-bento-desc">
                  لوحة تتبع تقدّمك لحظة بلحظة — تفاصيل المقررات والدرجات والحضور.
                </p>
              </div>
            </Reveal>
            {/* Card 4 — span 2 cols */}
            <Reveal as="div" className="landing-bento-card landing-bento-wide" data-tone="surface">
              <div className="landing-bento-icon" data-tone="surface">
                <Icon icon={Network} size={28} />
              </div>
              <div className="landing-bento-body">
                <h3 className="landing-bento-title">منظومة موحَّدة لكل الأدوار</h3>
                <p className="landing-bento-desc">
                  دمج كامل للحضور والدرجات والامتحانات والبحوث والمعامل الافتراضية —
                  منصة متجاوبة تعمل بكفاءة على هاتفك أو حاسوبك.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════ TRUST BAR ═══════════ */}
        <Reveal as="section" className="landing-trust-bar">
          <div className="landing-trust-bar-inner">
            <div className="landing-trust-item">
              <div className="landing-trust-icon">
                <Icon icon={Building2} size={22} />
              </div>
              <span className="landing-trust-label">شراكة جامعية</span>
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-icon">
                <Icon icon={Sparkles} size={22} />
              </div>
              <span className="landing-trust-label">مدعوم بالذكاء الاصطناعي</span>
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-icon">
                <Icon icon={ShieldCheck} size={22} />
              </div>
              <span className="landing-trust-label">منصة آمنة</span>
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-icon">
                <Icon icon={Users2} size={22} />
              </div>
              <span className="landing-trust-label">+50 ألف مستخدم</span>
            </div>
          </div>
        </Reveal>

        {/* ═══════════ MADAREK AI — glassmorphism chat showcase ═══════════ */}
        <section id="ai" className="landing-ai-section">
          <div className="landing-ai-float-symbols" aria-hidden="true" />
          <div className="landing-ai-grid">
            <Reveal as="div" className="landing-ai-chat">
              <div className="landing-ai-chat-head">
                <div className="landing-ai-avatar">
                  <Icon icon={Sparkles} size={22} />
                </div>
                <div className="landing-ai-chat-info">
                  <h4 className="landing-ai-chat-name">Oasis Assistant</h4>
                  <p className="landing-ai-chat-status">
                    <span className="landing-ai-chat-dot" aria-hidden />
                    متصل الآن
                  </p>
                </div>
              </div>
              <div className="landing-ai-chat-body">
                <div className="landing-ai-bubble landing-ai-bubble-user">
                  لدي صعوبة في فهم مفهوم «الخوارزميات الجينية» — هل يمكنك تبسيطها؟
                </div>
                <div className="landing-ai-bubble landing-ai-bubble-bot">
                  بالطبع! تخيل أنك تحاول تحسين وصفة كعكة. في كل مرة تخبز فيها مجموعة،
                  تأخذ أفضل الكعكات طعماً (البقاء للأصلح) وتدمج وصفاتها (التزاوج)
                  مع تغييرات بسيطة عشوائية (الطفرة). بمرور الوقت، ستحصل على الوصفة
                  المثالية. هذا هو جوهر الخوارزميات الجينية!
                </div>
                <div className="landing-ai-typing" aria-label="يكتب...">
                  <span className="landing-ai-typing-dot" />
                  <span className="landing-ai-typing-dot" />
                  <span className="landing-ai-typing-dot" />
                </div>
              </div>
              <div className="landing-ai-chat-foot">
                <div className="landing-ai-input-mock">اكتب سؤالك هنا...</div>
                <button type="button" className="landing-ai-send" aria-label="إرسال">
                  <Icon icon={ArrowLeft} size={18} />
                </button>
              </div>
            </Reveal>
            <Reveal as="div" className="landing-ai-text" delay={1}>
              <span className="landing-section-eyebrow">Madarek AI</span>
              <h2 className="landing-features-title">المعلّم الذكي الخاص بك، متاح دائماً</h2>
              <p className="landing-section-lede" style={{ textAlign: 'start', margin: 0 }}>
                المساعد «Oasis» ليس مجرد أداة بحث، بل رفيق دراسي يفهم سياق دراستك.
                يقدم شروحات مخصصة، يلخّص المحاضرات الطويلة، ويختبر معلوماتك بطرق تفاعلية.
              </p>
              <ul className="landing-ai-bullets">
                <li>
                  <span className="landing-ai-check"><Icon icon={ShieldCheck} size={14} /></span>
                  شرح المفاهيم المعقدة بطرق مبسطة.
                </li>
                <li>
                  <span className="landing-ai-check"><Icon icon={ShieldCheck} size={14} /></span>
                  إنشاء اختبارات قصيرة لمراجعة المعلومات.
                </li>
                <li>
                  <span className="landing-ai-check"><Icon icon={ShieldCheck} size={14} /></span>
                  توجيه أكاديمي يعتمد على أدائك الفعلي.
                </li>
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ═══════════ ROLE PILLARS ═══════════ */}
        <section id="pillars" className="landing-features">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">الأدوار</span>
            <Reveal as="h2" className="landing-features-title">أربعة أدوار، تجربة موحَّدة</Reveal>
            <p className="landing-section-lede">
              كل دور أكاديمي يرى ما يخصّه فقط — صلاحيات مدروسة وفصل واضح بين الواجبات.
            </p>
          </div>
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
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">دراسة ميدانية</span>
            <Reveal as="h2" className="landing-features-title">نتائج تجربة ميدانية</Reveal>
            <p className="landing-section-lede">
              اعتمدنا استراتيجية الصف المعكوس على مادة اللغة الإنجليزية مع طلاب من جنوب
              ليبيا، بمشاركة خبراء دوليين. الأرقام أدناه نتائج التجربة الفعلية.
            </p>
          </div>

          <div className="landing-pilot">
            <Reveal as="div" className="landing-pilot-stat">
              <div className="landing-pilot-ring" style={{ '--ring-deg': '144deg' } as React.CSSProperties} />
              <div className="landing-pilot-value">40<span>%</span></div>
              <div className="landing-pilot-label">تحسّن الاستيعاب</div>
              <div className="landing-pilot-note">مقارنة بالأسلوب التقليدي</div>
            </Reveal>
            <Reveal as="div" className="landing-pilot-stat">
              <div className="landing-pilot-ring" style={{ '--ring-deg': '252deg' } as React.CSSProperties} />
              <div className="landing-pilot-value">70<span>%</span></div>
              <div className="landing-pilot-label">زيادة في المشاركة</div>
              <div className="landing-pilot-note">داخل الحلقات النقاشية</div>
            </Reveal>
            <Reveal as="div" className="landing-pilot-stat">
              <div className="landing-pilot-ring" style={{ '--ring-deg': '108deg' } as React.CSSProperties} />
              <div className="landing-pilot-value">30<span>%</span></div>
              <div className="landing-pilot-label">تحسّن في الالتزام</div>
              <div className="landing-pilot-note">بمتابعة الجلسات</div>
            </Reveal>
            <Reveal as="div" className="landing-pilot-stat highlight">
              <div className="landing-pilot-ring" style={{ '--ring-deg': '324deg' } as React.CSSProperties} />
              <div className="landing-pilot-value">90<span>%</span></div>
              <div className="landing-pilot-label">تحقيق أهداف التعلّم</div>
              <div className="landing-pilot-note">ضمن الإطار الزمني المحدّد</div>
            </Reveal>
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
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">عن المنصة</span>
            <Reveal as="h2" className="landing-features-title">تعليم ذكي بمعايير عالمية</Reveal>
          </div>
          <p className="landing-subtitle" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            مدارك هي منصة تعليمية ذكية تأسست لتربط الطلاب والأساتذة والإدارة في بيئة رقمية واحدة. كل زر، كل بطاقة، كل شاشة مكتوبة من الصفر، ومُختبَرة مع طلاب وأساتذة فعليين.
          </p>
        </section>

        {/* ═══════════ FINAL CTA — conversion section ═══════════ */}
        <Reveal as="section" className="landing-final-cta">
          <div className="landing-final-cta-scanline" aria-hidden="true" />
          <div className="landing-final-cta-shapes" aria-hidden="true">
            <div className="landing-final-cta-shape" />
            <div className="landing-final-cta-shape" />
            <div className="landing-final-cta-shape" />
          </div>
          <div className="landing-final-cta-inner">
            <div className="landing-final-cta-eyebrow">
              <span className="landing-final-cta-dot" aria-hidden />
              ابدأ الآن
            </div>
            <h2 className="landing-final-cta-title">
              منصّتك الأكاديمية بانتظارك
            </h2>
            <p className="landing-final-cta-lede">
              سجّل دخولك ببريدك الجامعي أو رقم قيدك للوصول إلى مقرراتك
              ومتابعة تقدّمك الأكاديمي.
            </p>
            <div className="landing-final-cta-actions">
              <Link to="/auth" className="btn primary landing-final-cta-btn">
                تسجيل الدخول
                <Icon icon={ArrowLeft} size={16} />
              </Link>
              <a href="#features" className="btn outline landing-final-cta-btn">
                اكتشف المنصة
              </a>
            </div>
            <div className="landing-final-cta-meta">
              <span>مدارك</span>
              <span className="landing-final-cta-divider" aria-hidden>·</span>
              <span>التعليم الذكي</span>
            </div>
          </div>
        </Reveal>
      </main>

      <div className="landing-shell">
        <footer className="landing-footer">
          <div className="landing-footer-links">
            <Link to="/auth">تسجيل الدخول</Link>
            <a href="#features">المميزات</a>
            <a href="#pillars">الأدوار</a>
            <a href="#proof">النتائج</a>
            <a href="#about">عن المنصة</a>
            <span>© {year} مدارك · منصة التعليم الذكي</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
