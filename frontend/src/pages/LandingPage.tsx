import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Brain, GraduationCap, Network, Building2, Users2, Award, Compass,
  BarChart3, ShieldCheck, ArrowLeft, Menu, X, BookOpen, Sparkles,
  Microscope, FlaskConical, MessageSquare, Calendar, ClipboardCheck,
  Layers, Trophy, Check, ChevronDown,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
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
      user.role === 'ADMIN'   ? '/admin/dashboard'   :
      user.role === 'QUALITY' ? '/quality/dashboard' :
      user.role === 'OWNER'   ? '/owner/dashboard'   :
      '/student/dashboard';
    navigate(home, { replace: true });
    return null;
  }

  const year = new Date().getFullYear();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 6);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? Math.min(1, y / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Magnetic glow follow on feature cards
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.landing-feature-card, .landing-bento-card');
    const onMove = (e: MouseEvent) => {
      const t = e.currentTarget as HTMLElement;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    cards.forEach((c) => c.addEventListener('mousemove', onMove));
    return () => cards.forEach((c) => c.removeEventListener('mousemove', onMove));
  }, []);

  return (
    <div className="landing">

      {/* Top scroll-progress bar */}
      <div className="landing-progress" aria-hidden>
        <div className="landing-progress-bar" style={{ ['--p' as string]: scrollPct }} />
      </div>

      {/* Ministry strip */}
      <div className="ministry-strip">
        <div className="ministry-strip-inner">
          <span className="ministry-strip-emblem"><LibyaFlag size={14} /></span>
          <span>دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية</span>
        </div>
      </div>

      {/* Header — Notion-style sticky glass */}
      <header className={`landing-header${scrolled ? ' scrolled' : ''}`}>
        <div className="landing-nav">
          <Link to="/" className="landing-brand" aria-label="مدارك">
            <span className="landing-brand-mark">م</span>
            <span className="landing-brand-text">
              <span className="landing-brand-name">مدارك</span>
              <span className="landing-brand-sub">جامعة الزاوية</span>
            </span>
          </Link>

          <nav className="landing-nav-links">
            <div className="landing-nav-group">
              <button type="button" className="landing-nav-link">
                المنصة
                <Icon icon={ChevronDown} size={14} />
              </button>
              <div className="landing-megamenu">
                <a href="#flipped" className="landing-megamenu-item">
                  <span className="sticker sm peach"><Icon icon={GraduationCap} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">الفصل المعكوس</span>
                    <span className="landing-megamenu-item-desc">محاضرات مسجَّلة بنقاط فحص ذكية</span>
                  </span>
                </a>
                <a href="#matrix" className="landing-megamenu-item">
                  <span className="sticker sm lavender"><Icon icon={Compass} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">المصفوفة التعليمية</span>
                    <span className="landing-megamenu-item-desc">مسارات تتكيَّف مع تقدُّمك</span>
                  </span>
                </a>
                <a href="#research" className="landing-megamenu-item">
                  <span className="sticker sm mint"><Icon icon={Microscope} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">البحوث والمكتبة</span>
                    <span className="landing-megamenu-item-desc">فحص نزاهة + مراجعة معلَّمة</span>
                  </span>
                </a>
                <a href="#ai" className="landing-megamenu-item">
                  <span className="sticker sm sky"><Icon icon={Brain} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">المساعد الأكاديمي</span>
                    <span className="landing-megamenu-item-desc">«Oasis» — رفيق دراسي ذكي</span>
                  </span>
                </a>
              </div>
            </div>
            <a href="#roles" className="landing-nav-link">الأدوار</a>
            <a href="#proof" className="landing-nav-link">النتائج</a>
            <a href="#faq" className="landing-nav-link">الأسئلة</a>
          </nav>

          <div className="landing-header-cta">
            <Link to="/auth" className="btn ghost sm">تسجيل الدخول</Link>
            <Link to="/auth" className="btn primary sm">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </div>

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

        {menuOpen && (
          <nav className="landing-mobile-menu" onClick={() => setMenuOpen(false)}>
            <a href="#features" className="btn ghost">المميزات</a>
            <a href="#roles" className="btn ghost">الأدوار</a>
            <a href="#proof" className="btn ghost">النتائج</a>
            <Link to="/auth" className="btn primary full">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </nav>
        )}
      </header>

      {/* HERO — huge centered title + mockup */}
      <section className="marketing-container landing-hero">
        <Reveal as="span" className="landing-hero-eyebrow">
          <strong>جديد</strong>
          المساعد الأكاديمي «Oasis» متاح الآن
          <Icon icon={ArrowLeft} size={12} />
        </Reveal>
        <Reveal as="h1" className="landing-title" delay={1}>
          منصّة <em>التعليم</em> الذكيّ <br />
          لجامعة <span className="landing-title-highlight">الزّاوية</span>
        </Reveal>
        <Reveal as="p" className="landing-subtitle" delay={2}>
          مساحة عمل أكاديمية واحدة تُمكّن الطالب والأستاذ والإدارة وضمان الجودة
          من إدارة المحاضرات، البحوث، الامتحانات والتقييم — بهدوء وسهولة.
        </Reveal>
        <Reveal as="div" className="landing-cta-row" delay={3}>
          <Link to="/auth" className="btn primary xl">
            ابدأ مجاناً الآن
            <Icon icon={ArrowLeft} size={16} />
          </Link>
          <a href="#features" className="btn outline xl">شاهد كيف تعمل</a>
        </Reveal>
        <Reveal as="div" className="landing-cta-meta" delay={4}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon icon={Check} size={14} /> بدون بطاقة ائتمان
          </span>
          <span className="landing-cta-meta-dot" />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon icon={Check} size={14} /> دعم RTL كامل
          </span>
          <span className="landing-cta-meta-dot" />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon icon={Check} size={14} /> اعتماد رسميّ
          </span>
        </Reveal>

        {/* mockup */}
        <Reveal as="div" className="landing-mockup" delay={5}>
          <div className="landing-mockup-frame">
            <div className="landing-mockup-chrome">
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
            </div>
            <div className="landing-mockup-body">
              <aside className="landing-mockup-side">
                <div className="landing-mockup-side-row on" />
                <div className="landing-mockup-side-row" />
                <div className="landing-mockup-side-row" />
                <div className="landing-mockup-side-row" />
                <div className="landing-mockup-side-row" style={{ width: '70%' }} />
                <div className="landing-mockup-side-row" />
              </aside>
              <main className="landing-mockup-main">
                <div className="landing-mockup-title">مساء النور، أحمد</div>
                <div className="landing-mockup-kpis">
                  <div className="landing-mockup-kpi">
                    <div className="landing-mockup-kpi-label">معدّلك</div>
                    <div className="landing-mockup-kpi-value">3.74</div>
                  </div>
                  <div className="landing-mockup-kpi">
                    <div className="landing-mockup-kpi-label">حضور</div>
                    <div className="landing-mockup-kpi-value">92٪</div>
                  </div>
                  <div className="landing-mockup-kpi">
                    <div className="landing-mockup-kpi-label">مهام</div>
                    <div className="landing-mockup-kpi-value">3</div>
                  </div>
                </div>
                <div className="landing-mockup-chart" aria-hidden>
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                </div>
              </main>
            </div>
          </div>

          <div className="landing-mockup-badge landing-mockup-badge-1">
            <span className="sticker sm mint"><Icon icon={ClipboardCheck} size={18} /></span>
            <span className="landing-mockup-badge-text">
              <span className="landing-mockup-badge-title">+12 طالباً</span>
              <span className="landing-mockup-badge-sub">سلَّم الواجب اليوم</span>
            </span>
          </div>
          <div className="landing-mockup-badge landing-mockup-badge-2">
            <span className="sticker sm lavender"><Icon icon={Brain} size={18} /></span>
            <span className="landing-mockup-badge-text">
              <span className="landing-mockup-badge-title">Oasis</span>
              <span className="landing-mockup-badge-sub">يحضِّر ملخَّص الفصل…</span>
            </span>
          </div>
        </Reveal>
      </section>

      {/* Logo strip */}
      <section className="marketing-container landing-logos" aria-label="الشركاء الأكاديميون">
        <div className="landing-logos-eyebrow">معتمدة من</div>
        <div className="landing-logos-grid">
          <div className="landing-logo">جامعة الزاوية</div>
          <div className="landing-logo">وزارة التعليم العالي</div>
          <div className="landing-logo">قطاع ضمان الجودة</div>
          <div className="landing-logo">مكتب البحوث</div>
          <div className="landing-logo">مركز التعليم الذكي</div>
          <div className="landing-logo">عمادة الطلاب</div>
        </div>
      </section>

      {/* Pilot stats */}
      <section className="marketing-container">
        <div className="landing-pilot-grid">
          <Reveal as="div" className="landing-pilot-stat">
            <div className="landing-pilot-value"><CountUp value="29" /></div>
            <div className="landing-pilot-label">كلية أكاديمية</div>
            <div className="landing-pilot-note">على مستوى تسع مدن</div>
          </Reveal>
          <Reveal as="div" className="landing-pilot-stat" delay={1}>
            <div className="landing-pilot-value"><CountUp value="50K" /></div>
            <div className="landing-pilot-label">طالب مسجَّل</div>
            <div className="landing-pilot-note">في جميع الكليّات</div>
          </Reveal>
          <Reveal as="div" className="landing-pilot-stat" delay={2}>
            <div className="landing-pilot-value"><CountUp value="2.5K" /></div>
            <div className="landing-pilot-label">عضو هيئة تدريس</div>
            <div className="landing-pilot-note">معتمد رسمياً</div>
          </Reveal>
          <Reveal as="div" className="landing-pilot-stat" delay={3}>
            <div className="landing-pilot-value">#6</div>
            <div className="landing-pilot-label">على ليبيا</div>
            <div className="landing-pilot-note">في الترتيب الوطني</div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES — sticker grid */}
      <section id="features" className="marketing-container landing-features">
        <div className="landing-section-head">
          <span className="landing-section-eyebrow">المنظومة</span>
          <h2 className="landing-section-title">
            كل ما يحتاجه <em>الجامعيّ</em> في مكان واحد
          </h2>
          <p className="landing-section-lede">
            أدوات أكاديمية متكاملة تربط الفصل الدراسي بالمحتوى الرقمي والتحليلات
            الذكية — بدون تشتيت ودون تعقيد.
          </p>
        </div>

        <div className="landing-features-grid">
          <Reveal as="article" className="landing-feature-card sticker-wiggle">
            <span className="sticker lg peach"><Icon icon={Compass} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">المصفوفة التعليمية</h3>
            <p className="landing-feature-desc">
              مسارات تعلُّم تتكيَّف مع مستوى تقدُّمك ونقاط قوَّتك، تكشف الفجوات وتربطها
              تلقائياً بالدقائق التي تشرحها.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={1}>
            <span className="sticker lg lavender"><Icon icon={Brain} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">المساعد الأكاديمي</h3>
            <p className="landing-feature-desc">
              «Oasis» — رفيق دراسي يفهم سياق دراستك. شروحات مخصَّصة، تلخيصات،
              واختبارات تفاعلية حسب أدائك الفعلي.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={2}>
            <span className="sticker lg sky"><Icon icon={BarChart3} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">تحليلات أكاديمية</h3>
            <p className="landing-feature-desc">
              لوحة دقيقة لتقدُّمك لحظة بلحظة — الدرجات، الحضور، المهام، والمؤشرات
              المؤسسية، بصياغة تخدم القرار.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={3}>
            <span className="sticker lg mint"><Icon icon={BookOpen} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">مكتبة وبحوث</h3>
            <p className="landing-feature-desc">
              فهرس بحثيّ وفحص للنزاهة العلمية (الانتحال + المحتوى المُولَّد آلياً)
              مع مراجعة معلَّمة من الأستاذ.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={4}>
            <span className="sticker lg yellow"><Icon icon={Network} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">منظومة موحَّدة</h3>
            <p className="landing-feature-desc">
              المحاضرات، الحضور، الدرجات، الامتحانات، البحوث، والمعامل الافتراضية —
              كلها في تجربة واحدة آمنة ومتجاوبة.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={5}>
            <span className="sticker lg rose"><Icon icon={ShieldCheck} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">جودة مؤسسية</h3>
            <p className="landing-feature-desc">
              مؤشرات لقطاع الجودة: تقييم الأساتذة، مراجعة الاختبارات، أداء المقررات،
              وتقارير شاملة بصياغة رسمية.
            </p>
          </Reveal>
        </div>
      </section>

      {/* COLORED BAND 1 — peach: Flipped classroom */}
      <section id="flipped" className="band band-peach">
        <div className="marketing-container band-split">
          <Reveal as="div">
            <span className="sticker xl peach"><Icon icon={GraduationCap} size={48} strokeWidth={1.6} /></span>
            <span className="band-eyebrow" style={{ display: 'block', marginBlockStart: 24 }}>الفصل المعكوس</span>
            <h2 className="band-title">
              محاضرات مسجَّلة <em>تتفاعل</em> مع الطالب
            </h2>
            <p className="band-lede">
              نقاط فحص مدمجة في كل محاضرة، حضور تلقائي عند الإكمال، وروابط مباشرة
              إلى المفاهيم في المصفوفة المعرفية. الطالب يبني فهمه بإيقاعه.
            </p>
            <div style={{ marginBlockStart: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/auth" className="btn primary lg">جرّب المحاضرة <Icon icon={ArrowLeft} size={14} /></Link>
            </div>
          </Reveal>
          <Reveal as="div" className="band-visual" delay={2}>
            <div className="band-visual-row">
              <span className="band-visual-checkbox on"><Icon icon={Check} size={12} strokeWidth={3} /></span>
              <span className="band-visual-text done">مقدمة في خوارزميات الفرز</span>
              <span className="band-visual-tag mint">مكتمل</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox on"><Icon icon={Check} size={12} strokeWidth={3} /></span>
              <span className="band-visual-text done">تعقيد الزمن وO الكبيرة</span>
              <span className="band-visual-tag mint">مكتمل</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text">Quick Sort — التقسيم الديناميكي</span>
              <span className="band-visual-tag peach">قيد المتابعة</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text">Merge Sort والتفكير العودي</span>
              <span className="band-visual-tag">قادم</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text">امتحان قصير — أسبوع 4</span>
              <span className="band-visual-tag sky">امتحان</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* COLORED BAND 2 — lavender: AI assistant */}
      <section id="ai" className="band band-lavender">
        <div className="marketing-container band-split">
          <Reveal as="div" className="band-visual">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBlockEnd: 16 }}>
              <span className="sticker sm lavender"><Icon icon={Brain} size={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>Oasis</div>
                <div style={{ fontSize: 11, color: 'var(--c-mint-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span className="landing-hero-eyebrow-dot" style={{ background: 'var(--c-mint-ink)' }} />
                  متَّصل الآن
                </div>
              </div>
            </div>
            <div style={{
              padding: 14, background: 'var(--c-lavender-bg)', borderRadius: 14,
              fontSize: 14, color: 'var(--c-lavender-deep)', lineHeight: 1.6, marginBlockEnd: 12,
              fontWeight: 500,
            }}>
              ساعدني في فهم خوارزميات «Quick Sort» — لم أستوعبها في المحاضرة.
            </div>
            <div style={{
              padding: 14, background: 'var(--surface-2)', borderRadius: 14,
              fontSize: 14, color: 'var(--text)', lineHeight: 1.7,
              fontWeight: 500,
            }}>
              فكرة Quick Sort بسيطة: نختار عنصراً «pivot»، ونفصل العناصر الأصغر
              إلى يمينه والأكبر إلى يساره، ثم نكرّر العملية على كل جانب. هل تريد
              مثالاً بصرياً؟
            </div>
            <div style={{
              marginBlockStart: 12, padding: '10px 14px',
              background: 'var(--surface-2)', borderRadius: 14,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              color: 'var(--text-muted)',
            }}>
              <span className="typing-dots"><span /><span /><span /></span>
              <span style={{ fontSize: 12 }}>Oasis يكتب…</span>
            </div>
          </Reveal>
          <Reveal as="div" delay={2}>
            <span className="sticker xl lavender"><Icon icon={Sparkles} size={48} strokeWidth={1.6} /></span>
            <span className="band-eyebrow" style={{ display: 'block', marginBlockStart: 24 }}>المساعد الأكاديمي</span>
            <h2 className="band-title">
              <em>«Oasis»</em> — يفهم سياق دراستك
            </h2>
            <p className="band-lede">
              مساعد أكاديمي يعرف مقرَّراتك ومحاضراتك ودرجاتك. يقدِّم شروحات مخصَّصة،
              يلخِّص الفصول الطويلة، ويختبر معلوماتك بطرق تفاعلية.
            </p>
            <ul style={{ marginBlockStart: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'شرح المفاهيم المعقدة بطرق مبسَّطة',
                'إنشاء اختبارات قصيرة لمراجعة المعلومات',
                'توجيه أكاديميّ يعتمد على أدائك الفعلي',
              ].map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 500 }}>
                  <span style={{
                    inlineSize: 22, blockSize: 22, borderRadius: '50%',
                    background: 'var(--c-lavender-deep)', color: 'var(--c-lavender-bg)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}><Icon icon={Check} size={12} strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* BENTO mosaic */}
      <section className="marketing-container landing-bento">
        <div className="landing-section-head">
          <span className="landing-section-eyebrow">منظومة كاملة</span>
          <h2 className="landing-section-title">
            من <em>المحاضرة</em> إلى <em>الشهادة</em>
          </h2>
        </div>

        <div className="landing-bento-grid">
          <Reveal as="div" className="landing-bento-card span-3 band-mint">
            <span className="sticker mint"><Icon icon={Microscope} size={28} /></span>
            <h3 className="landing-bento-title">البحوث والمكتبة</h3>
            <p className="landing-bento-desc">
              فهرس بحثيّ بفحص نزاهة علمية تلقائي (انتحال + AI) ومراجعة معلَّمة على
              الـPDF. آلاف الكتب الأكاديمية للاستعارة الفورية.
            </p>
          </Reveal>
          <Reveal as="div" className="landing-bento-card span-3 band-yellow" delay={1}>
            <span className="sticker yellow"><Icon icon={Calendar} size={28} /></span>
            <h3 className="landing-bento-title">الجدول الدراسي</h3>
            <p className="landing-bento-desc">
              جدول أسبوعيّ ذكيّ يجمع المحاضرات، التسليمات، الامتحانات، والاجتماعات —
              بمُذكِّرات تلقائية وروابط مباشرة لكل بند.
            </p>
          </Reveal>
          <Reveal as="div" className="landing-bento-card span-2 band-sky" delay={2}>
            <span className="sticker sky"><Icon icon={ClipboardCheck} size={28} /></span>
            <h3 className="landing-bento-title">الامتحانات الإلكترونية</h3>
            <p className="landing-bento-desc">
              MCQ · صح/خطأ · إجابة قصيرة · مقالة. تصحيح تلقائي للموضوعي.
            </p>
          </Reveal>
          <Reveal as="div" className="landing-bento-card span-2 band-rose" delay={3}>
            <span className="sticker rose"><Icon icon={FlaskConical} size={28} /></span>
            <h3 className="landing-bento-title">المعامل الافتراضية</h3>
            <p className="landing-bento-desc">
              Cisco Packet Tracer، Arduino Sim، وتجارب AR/VR للتطبيق العملي.
            </p>
          </Reveal>
          <Reveal as="div" className="landing-bento-card span-2 band-copper" delay={4}>
            <span className="sticker copper"><Icon icon={Trophy} size={28} /></span>
            <h3 className="landing-bento-title">الإنجازات والشارات</h3>
            <p className="landing-bento-desc">
              نقاط، مستويات، شارات — لتشجيع الالتزام دون فرضه.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ROLE PILLARS */}
      <section id="roles" className="marketing-container landing-features">
        <div className="landing-section-head">
          <span className="landing-section-eyebrow">الأدوار</span>
          <h2 className="landing-section-title">
            أربعة <em>أدوار</em>، تجربة موحَّدة
          </h2>
          <p className="landing-section-lede">
            كلّ دور أكاديميّ يرى ما يخصّه فقط — صلاحيّات مدروسة وفصلٌ واضح بين الواجبات.
          </p>
        </div>
        <div className="landing-features-grid">
          <Reveal as="article" className="landing-feature-card sticker-wiggle">
            <span className="sticker lg copper"><Icon icon={GraduationCap} size={32} /></span>
            <h3 className="landing-feature-title">الطالب</h3>
            <p className="landing-feature-desc">
              مقرَّرات، مصفوفة معرفية، مساعد ذكي، إنجازات وشهادات،
              فرص عمل، ومكتبة بحوث.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={1}>
            <span className="sticker lg lavender"><Icon icon={Brain} size={32} /></span>
            <h3 className="landing-feature-title">الأستاذ</h3>
            <p className="landing-feature-desc">
              ذكاء أكاديميّ يكشف الطلَّاب المعرَّضين، إدارة المحاضرات والدرجات،
              ومعامل افتراضية بصلاحيات تحكُّم.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={2}>
            <span className="sticker lg sky"><Icon icon={Building2} size={32} /></span>
            <h3 className="landing-feature-title">الإدارة</h3>
            <p className="landing-feature-desc">
              إدارة الكليَّات والأساتذة والمقرَّرات، تقارير، ومزامنة يومية مع
              البيانات الرسمية لجامعة الزاوية.
            </p>
          </Reveal>
          <Reveal as="article" className="landing-feature-card sticker-wiggle" delay={3}>
            <span className="sticker lg mint"><Icon icon={ShieldCheck} size={32} /></span>
            <h3 className="landing-feature-title">ضمان الجودة</h3>
            <p className="landing-feature-desc">
              رؤية للمؤشرات المؤسسية: جودة المقرَّرات، تقييم الأساتذة،
              مراجعة الاختبارات والمناهج.
            </p>
          </Reveal>
        </div>
      </section>

      {/* PROOF — pilot results in colored band */}
      <section id="proof" className="band band-sand">
        <div className="marketing-container">
          <div className="landing-section-head">
            <span className="landing-section-eyebrow">دراسة ميدانية</span>
            <h2 className="band-title">نتائج <em>تجربة فعلية</em></h2>
            <p className="band-lede" style={{ marginInline: 'auto' }}>
              اعتمدنا استراتيجية الصفّ المعكوس على مادة اللغة الإنجليزية مع طلَّاب
              من جنوب ليبيا — هذه أرقام التجربة.
            </p>
          </div>
          <div className="landing-pilot-grid" style={{ paddingBlock: 0, marginBlockStart: 24 }}>
            <Reveal as="div" className="landing-pilot-stat">
              <div className="landing-pilot-value" style={{ color: 'var(--c-sand-deep)' }}><CountUp value="40" />٪</div>
              <div className="landing-pilot-label">تحسُّن الاستيعاب</div>
              <div className="landing-pilot-note">مقارنة بالأسلوب التقليدي</div>
            </Reveal>
            <Reveal as="div" className="landing-pilot-stat" delay={1}>
              <div className="landing-pilot-value" style={{ color: 'var(--c-sand-deep)' }}><CountUp value="70" />٪</div>
              <div className="landing-pilot-label">زيادة في المشاركة</div>
              <div className="landing-pilot-note">داخل الحلقات النقاشية</div>
            </Reveal>
            <Reveal as="div" className="landing-pilot-stat" delay={2}>
              <div className="landing-pilot-value" style={{ color: 'var(--c-sand-deep)' }}><CountUp value="30" />٪</div>
              <div className="landing-pilot-label">تحسُّن في الالتزام</div>
              <div className="landing-pilot-note">بمتابعة الجلسات</div>
            </Reveal>
            <Reveal as="div" className="landing-pilot-stat" delay={3}>
              <div className="landing-pilot-value" style={{ color: 'var(--c-sand-deep)' }}><CountUp value="90" />٪</div>
              <div className="landing-pilot-label">تحقيق أهداف التعلُّم</div>
              <div className="landing-pilot-note">ضمن الإطار الزمني</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="marketing-container landing-features">
        <div className="landing-section-head">
          <span className="landing-section-eyebrow">آراء مجتمع الجامعة</span>
          <h2 className="landing-section-title">
            يثقون <em>بمدارك</em> كل يوم
          </h2>
        </div>
        <div className="landing-testimonials">
          {[
            { q: 'المنصّة غيّرت طريقة متابعتي لمحاضراتي — كل شيء في مكان واحد، والمساعد الذكي يوفّر عليّ ساعات.', n: 'أحمد الزروق', r: 'طالب · هندسة البرمجيات', i: 'أز' },
            { q: 'أصبح رصد الحضور والدرجات وتحليل أداء الطلاب أسرع وأدقّ. أداة حقيقية للأستاذ.', n: 'د. سالم البوسيفي', r: 'عضو هيئة تدريس · نظم المعلومات', i: 'سب' },
            { q: 'تقارير الجودة ولوحات المتابعة أعطتنا رؤية مؤسسية لم تكن متاحة من قبل.', n: 'مكتب ضمان الجودة', r: 'القطاع الرابع · جامعة الزاوية', i: 'جو' },
          ].map((t, i) => (
            <Reveal as="figure" className="testimonial-card" key={t.n} delay={(i + 1) as 1 | 2 | 3}>
              <blockquote className="testimonial-quote">{t.q}</blockquote>
              <figcaption className="testimonial-author">
                <span className="testimonial-avatar">{t.i}</span>
                <span className="testimonial-author-meta">
                  <span className="testimonial-name">{t.n}</span>
                  <span className="testimonial-role">{t.r}</span>
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FINAL CTA — dark band */}
      <section className="band band-dark">
        <div className="marketing-container landing-final-cta">
          <div className="landing-final-cta-eyebrow">
            <span className="landing-final-cta-dot" />
            ابدأ الآن
          </div>
          <h2 className="landing-final-cta-title">
            منصّتك الأكاديميّة <em>بانتظارك</em>
          </h2>
          <p className="landing-final-cta-lede">
            سجِّل دخولك ببريدك الجامعيّ أو رقم قيدك للوصول إلى مقرَّراتك ومتابعة تقدُّمك الأكاديمي.
          </p>
          <div className="landing-final-cta-actions">
            <Link to="/auth" className="landing-final-cta-btn">
              تسجيل الدخول
              <Icon icon={ArrowLeft} size={16} />
            </Link>
            <a href="#features" className="landing-final-cta-btn ghost">اكتشف المنصة</a>
          </div>
          <div className="landing-final-cta-meta">
            وزارة التعليم العالي والبحث العلمي · جامعة الزاوية · {year}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="marketing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-col">
              <Link to="/" className="landing-brand">
                <span className="landing-brand-mark">م</span>
                <span className="landing-brand-text">
                  <span className="landing-brand-name">مدارك</span>
                  <span className="landing-brand-sub">جامعة الزاوية</span>
                </span>
              </Link>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, marginBlockStart: 8, maxInlineSize: '32ch' }}>
                المنصّة الرسمية لجامعة الزاوية تحت إشراف وزارة التعليم العالي والبحث العلمي.
              </p>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">المنصّة</div>
              <a href="#features" className="landing-footer-link">المميزات</a>
              <a href="#roles" className="landing-footer-link">الأدوار</a>
              <a href="#proof" className="landing-footer-link">النتائج</a>
              <a href="#flipped" className="landing-footer-link">الفصل المعكوس</a>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">الموارد</div>
              <a href="#ai" className="landing-footer-link">المساعد الذكي</a>
              <a href="#" className="landing-footer-link">المكتبة</a>
              <a href="#" className="landing-footer-link">المعامل</a>
              <a href="#" className="landing-footer-link">الإنجازات</a>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">المؤسسة</div>
              <a href="#" className="landing-footer-link">جامعة الزاوية</a>
              <a href="#" className="landing-footer-link">الكليّات</a>
              <a href="#" className="landing-footer-link">ضمان الجودة</a>
              <a href="#" className="landing-footer-link">عن المنصّة</a>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">الدعم</div>
              <a href="#" className="landing-footer-link">مركز المساعدة</a>
              <a href="#" className="landing-footer-link">تواصل معنا</a>
              <a href="#" className="landing-footer-link">الخصوصية</a>
              <a href="#" className="landing-footer-link">الشروط</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© {year} مدارك · جامعة الزاوية</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LibyaFlag size={14} /> صُنع في ليبيا
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
