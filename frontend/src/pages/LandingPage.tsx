import { Link, useNavigate } from 'react-router-dom';
import {
  User, Brain, GraduationCap, Network,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { BrandMark } from '../components/BrandMark';

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

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-login">
          <Link to="/auth" className="btn">
            تسجيل الدخول
            <Icon icon={User} size={16} />
          </Link>
        </div>
        <nav className="landing-nav">
          <a href="#features">المميزات</a>
          <a href="#about">عن المنصة</a>
        </nav>
        <Link to="/" className="landing-brand">
          <BrandMark size={32} />
        </Link>
      </header>

      <main className="landing-shell">
        <section className="landing-hero">
          <div className="landing-hero-content">
            <h1 className="landing-title">
              منصة مدارك:
              <span className="block">جامعة الزاوية للتعليم الذكي</span>
            </h1>
            <p className="landing-subtitle">
              منصة أكاديمية متطورة تجمع بين الابتكار والتميز لتمكين قادة المستقبل
              في جامعة الزاوية وفروعها.
            </p>
            <div className="landing-cta-row">
              <Link to="/auth" className="btn primary">ابدأ رحلتك الآن</Link>
              <a href="#features" className="btn outline">اكتشف المنصة</a>
            </div>
          </div>
          <div className="landing-hero-img">
            <BrandMark size={280} />
          </div>
        </section>

        <section id="features" className="landing-features">
          <h2 className="landing-features-title">مميزاتنا</h2>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon icon={GraduationCap} size={24} />
              </div>
              <h3 className="landing-feature-title">منهج أكاديمي ذكي</h3>
              <p className="landing-feature-desc">
                محاضرات مسجَّلة بنقاط تفاعل، ومصفوفة تعليمية شخصية تكتشف الفجوات
                المعرفية وتقترح الفيديو المناسب لسدّها.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon icon={Network} size={24} />
              </div>
              <h3 className="landing-feature-title">منظومة موحَّدة</h3>
              <p className="landing-feature-desc">
                دمج كامل للحضور والدرجات والامتحانات والبحوث في تجربة واحدة
                متاحة لكل طالب وأستاذ ومسؤول جودة.
              </p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon icon={Brain} size={24} />
              </div>
              <h3 className="landing-feature-title">ذكاء اصطناعي مساعد</h3>
              <p className="landing-feature-desc">
                مساعد دراسي مدعوم بالذكاء الاصطناعي يجيب على أسئلتك ويقترح
                مسارات مراجعة بناءً على أدائك الفعلي.
              </p>
            </div>
          </div>
        </section>

        <section id="about" className="landing-features">
          <h2 className="landing-features-title">عن المنصة</h2>
          <p className="landing-subtitle" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            مدارك هي المنصة التعليمية الرسمية لجامعة الزاوية، تأسست لتربط
            الطلاب والأساتذة والإدارة في بيئة رقمية واحدة، تحت إشراف وزارة
            التعليم العالي والبحث العلمي · ليبيا.
          </p>
        </section>
      </main>

      <div className="landing-shell">
        <footer className="landing-footer">
          <div className="landing-footer-links">
            <Link to="/auth">تسجيل الدخول</Link>
            <a href="#features">المميزات</a>
            <a href="#about">عن المنصة</a>
            <span>© {new Date().getFullYear()} منصة مدارك · جامعة الزاوية</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
