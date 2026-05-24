import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowLeft, Bot, FlaskConical, Compass, BookMarked,
  Brain, GraduationCap, BarChart3, ShieldCheck,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { BrandMark } from '../components/BrandMark';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';

interface Pillar {
  title: string;
  desc: string;
  icon: typeof Sparkles;
}

const PILLARS: Pillar[] = [
  {
    title: 'الصف المعكوس',
    desc: 'محاضرات مسجَّلة بنقاط تفاعل مدمجة، يدرسها الطالب قبل القاعة، ويستثمر الوقت في القاعة للنقاش والتطبيق.',
    icon: Brain,
  },
  {
    title: 'المعامل الافتراضية',
    desc: 'تجارب علمية تفاعلية بدون الحاجة لمعدات، أثبتت تجربة جامعة سرت تفوّق طلابها على الفصل التقليدي.',
    icon: FlaskConical,
  },
  {
    title: 'المصفوفة التعليمية',
    desc: 'نموذج معرفي شخصي لكل طالب، يكتشف الفجوات تلقائياً ويربطها بدقائق المحاضرة التي تشرحها.',
    icon: Compass,
  },
  {
    title: 'البحث العلمي المُربَط',
    desc: 'سير عمل متكامل لرفع البحوث: فحص انتحال، كشف ذكاء اصطناعي، تقييم أكاديمي، نشر في مكتبة الجامعة.',
    icon: BookMarked,
  },
  {
    title: 'منظومة إحصائية رباعية',
    desc: 'بيانات حيّة لأربعة مستويات: الطالب، الأستاذ، المؤسسة، وضمان الجودة — كل بياناتك تُجمع تلقائياً.',
    icon: BarChart3,
  },
  {
    title: 'مساعد ذكي للطالب',
    desc: 'يفهم فجواتك المعرفية، يقترح الفيديوهات المناسبة، ويرافقك في رحلتك الدراسية بشكل شخصي.',
    icon: Bot,
  },
];

export default function LandingPage() {
  useThemeSync();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // If already logged in, send them home.
  if (isHydrated && user) {
    const home =
      user.role === 'TEACHER' ? '/teacher/dashboard' :
      user.role === 'ADMIN' ? '/admin/dashboard' :
      user.role === 'QUALITY' ? '/quality/dashboard' :
      '/student/dashboard';
    navigate(home, { replace: true });
    return null;
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="مدارك AI">
          <BrandMark size={36} />
          <div className="landing-brand-text">
            <span className="landing-brand-name">
              مدارك <span className="ai-tag">AI</span>
            </span>
            <span className="landing-brand-uni">جامعة الزاوية · 1988</span>
          </div>
        </Link>
        <nav className="landing-nav">
          <a href="#pillars">الميزات</a>
          <a href="#how">كيف تعمل</a>
          <Link to="/auth" className="btn primary sm">تسجيل الدخول <Icon icon={ArrowLeft} size={13} /></Link>
        </nav>
      </header>

      <main className="landing-shell">
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-eyebrow">
            <Icon icon={Sparkles} size={13} />
            مبادرة وطنية للتعليم الذكي
          </div>
          <h1 className="landing-title">
            جامعة ذكية <span className="accent">في يدك</span>،<br />
            ومنظومة تعليم رقمية متكاملة.
          </h1>
          <p className="landing-subtitle">
            مدارك AI منصة تعليمية مدمجة لجامعة الزاوية، تجمع المحاضرات المسجَّلة، والمعامل
            الافتراضية، والمصفوفة التعليمية الشخصية، في تجربة واحدة لكل طالب وأستاذ
            ومؤسسة جامعية.
          </p>
          <div className="landing-cta-row">
            <Link to="/auth" className="btn primary">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
            <a href="#pillars" className="btn">استكشف المنصة</a>
          </div>
        </section>

        {/* Stats */}
        <section className="landing-stats">
          <div>
            <div className="landing-stat-value"><span className="accent">29</span></div>
            <div className="landing-stat-label">كلية أكاديمية</div>
          </div>
          <div>
            <div className="landing-stat-value">50K+</div>
            <div className="landing-stat-label">طالب مسجَّل</div>
          </div>
          <div>
            <div className="landing-stat-value">2.5K</div>
            <div className="landing-stat-label">عضو هيئة تدريس</div>
          </div>
          <div>
            <div className="landing-stat-value">#6</div>
            <div className="landing-stat-label">على مستوى ليبيا</div>
          </div>
        </section>

        {/* Pillars */}
        <section id="pillars" className="landing-section">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">ركائز المنصة</div>
            <h2 className="landing-section-title">منظومة تعليمية واحدة، ست ركائز متكاملة</h2>
          </div>
          <div className="landing-pillars">
            {PILLARS.map((p) => (
              <div className="landing-pillar" key={p.title}>
                <div className="landing-pillar-icon"><Icon icon={p.icon} size={20} /></div>
                <div>
                  <div className="landing-pillar-title">{p.title}</div>
                  <div className="landing-pillar-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="landing-section">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">كيف تعمل</div>
            <h2 className="landing-section-title">من المحاضرة إلى الإتقان في ثلاث خطوات</h2>
          </div>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <div className="landing-step-title">شاهد المحاضرة</div>
              <div className="landing-step-desc">
                فيديوهات قصيرة بنقاط تفاعل مدمجة. النظام يسجّل تقدّمك تلقائياً دون أن تُدخل أي شيء.
              </div>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <div className="landing-step-title">اكتشف فجواتك</div>
              <div className="landing-step-desc">
                المصفوفة التعليمية ترسم خريطة مهاراتك مفهوماً مفهوماً، وتُحدّد ما يحتاج تعزيزاً.
              </div>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <div className="landing-step-title">سدّ الفجوة فوراً</div>
              <div className="landing-step-desc">
                المنصة تقترح الفيديو والدقيقة المناسبة لكل فجوة، مع متابعة مستمرة من المساعد الذكي.
              </div>
            </div>
          </div>
        </section>

        {/* Real pilot results — from the spec's English course experiment */}
        <section className="landing-section">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">نتائج ميدانية حقيقية</div>
            <h2 className="landing-section-title">ما حقّقناه فعلياً قبل أن نأتي إليكم</h2>
            <p className="landing-section-sub">
              اعتمدنا استراتيجية الصف المعكوس على مادة اللغة الإنجليزية مع طلاب من جنوب ليبيا،
              بمشاركة خبراء دوليين. الأرقام أدناه هي نتائج تلك التجربة الفعلية.
            </p>
          </div>
          <div className="landing-pilot">
            <div className="landing-pilot-stat">
              <div className="landing-pilot-value">40<span>%</span></div>
              <div className="landing-pilot-label">تحسّن الاستيعاب</div>
              <div className="landing-pilot-note">مقارنة بالأسلوب التقليدي</div>
            </div>
            <div className="landing-pilot-stat">
              <div className="landing-pilot-value">70<span>%</span></div>
              <div className="landing-pilot-label">زيادة في المشاركة</div>
              <div className="landing-pilot-note">داخل الحلقات النقاشية</div>
            </div>
            <div className="landing-pilot-stat">
              <div className="landing-pilot-value">30<span>%</span></div>
              <div className="landing-pilot-label">تحسّن في الالتزام</div>
              <div className="landing-pilot-note">بمتابعة الجلسات</div>
            </div>
            <div className="landing-pilot-stat highlight">
              <div className="landing-pilot-value">90<span>%</span></div>
              <div className="landing-pilot-label">تحقيق أهداف التعلّم</div>
              <div className="landing-pilot-note">ضمن الإطار الزمني المحدّد</div>
            </div>
          </div>

          <div className="landing-proof" style={{ marginTop: 'var(--sp-5)' }}>
            <p className="landing-proof-quote">
              «تجربة المعامل الافتراضية على ٤٠ طالباً في جامعة سرت أظهرت تفوّقاً واضحاً للفريق
              الذي استخدم المنصة على فريق التعليم التقليدي. هذا ما نطمح لأن نقدّمه على
              مستوى جامعة الزاوية بأكملها.»
            </p>
            <div className="landing-proof-source">— من دراسة جامعة سرت، ٢٠٢٤</div>
          </div>
        </section>

        {/* Roles strip — small visual cue that 4 different surfaces exist */}
        <section className="landing-section">
          <div className="landing-section-head">
            <div className="landing-section-eyebrow">لكل فاعل دوره</div>
            <h2 className="landing-section-title">أربعة مستويات وصول، تصميم واحد متناسق</h2>
          </div>
          <div className="landing-pillars">
            <div className="landing-pillar">
              <div className="landing-pillar-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Icon icon={GraduationCap} size={20} />
              </div>
              <div>
                <div className="landing-pillar-title">الطالب</div>
                <div className="landing-pillar-desc">محاضرات، مصفوفة، مساعد ذكي، إنجازات، فرص عمل، مكتبة بحوث.</div>
              </div>
            </div>
            <div className="landing-pillar">
              <div className="landing-pillar-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                <Icon icon={Brain} size={20} />
              </div>
              <div>
                <div className="landing-pillar-title">الأستاذ</div>
                <div className="landing-pillar-desc">رفع المواد، الحضور، الدرجات، تقييم البحوث — بواجهة بسيطة جداً.</div>
              </div>
            </div>
            <div className="landing-pillar">
              <div className="landing-pillar-icon" style={{ background: 'rgba(91,60,168,.12)', color: 'var(--brand-purple)' }}>
                <Icon icon={BarChart3} size={20} />
              </div>
              <div>
                <div className="landing-pillar-title">إدارة الجامعة</div>
                <div className="landing-pillar-desc">إحصاءات شاملة، إدارة المناهج، تقارير رسمية، تتبّع التحول الرقمي.</div>
              </div>
            </div>
            <div className="landing-pillar">
              <div className="landing-pillar-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>
                <Icon icon={ShieldCheck} size={20} />
              </div>
              <div>
                <div className="landing-pillar-title">ضمان الجودة</div>
                <div className="landing-pillar-desc">رؤية لحظية لسير العملية التعليمية، تقييم الأساتذة، مراجعة المناهج.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="landing-final">
          <h2 className="landing-final-title">جاهز لبدء رحلتك في مدارك؟</h2>
          <p className="landing-final-desc">
            سجّل دخولك بحساب جامعة الزاوية، أو جرّب المنصة بحساب تجريبي.
          </p>
          <Link to="/auth" className="btn primary">
            تسجيل الدخول
            <Icon icon={ArrowLeft} size={14} />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-block">
            <div className="landing-footer-title">جامعة الزاوية</div>
            <p className="landing-footer-desc">
              مؤسسة تعليمية حكومية تأسست عام 1988، معتمدة من وزارة التعليم العالي والبحث العلمي.
            </p>
          </div>
          <div className="landing-footer-block">
            <div className="landing-footer-title">العنوان</div>
            <div className="landing-footer-line">شارع جمال عبد الناصر</div>
            <div className="landing-footer-line">مدينة الزاوية، ليبيا</div>
          </div>
          <div className="landing-footer-block">
            <div className="landing-footer-title">التواصل</div>
            <div className="landing-footer-line font-mono">‎+218 91 9235939</div>
            <div className="landing-footer-line font-mono">info@zu.edu.ly</div>
          </div>
          <div className="landing-footer-block">
            <div className="landing-footer-title">روابط</div>
            <a className="landing-footer-link" href="https://www.zu.edu.ly" target="_blank" rel="noreferrer">الموقع الرسمي</a>
            <a className="landing-footer-link" href="https://zu.edu.ly/result" target="_blank" rel="noreferrer">النتائج الدراسية</a>
            <Link to="/auth" className="landing-footer-link">تسجيل الدخول</Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <div className="landing-footer-text">
            © {new Date().getFullYear()} جامعة الزاوية — مدارك AI. جميع الحقوق محفوظة.
          </div>
          <div className="landing-footer-meta">
            <span>سياسة الخصوصية</span>
            <span>شروط الاستخدام</span>
            <span>ico@zu.edu.ly · للتعاون الدولي</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
