import { Link, useNavigate } from 'react-router-dom';
import {
  User, Brain, GraduationCap, Network,
  Instagram, Twitter, Facebook, MessageCircle,
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
          <Link to="/">عن الجامعة</Link>
          <Link to="/">البرامج الأكاديمية</Link>
          <Link to="/">البحث العلمي</Link>
          <Link to="/">القبول والتسجيل</Link>
          <Link to="/">تواصل معنا</Link>
        </nav>
        <Link to="/" className="landing-brand">
          <BrandMark size={32} />
        </Link>
      </header>

      <main className="landing-shell">
        <section className="landing-hero">
          <div className="landing-hero-content">
            <h1 className="landing-title">
              جامعة مدارك الذكية:
              <span className="block">مستقبل التعليم بين يديك</span>
            </h1>
            <p className="landing-subtitle">
              منصة أكاديمية متطورة تجمع بين الابتكار والتميز لتمكين قادة المستقبل.
            </p>
            <div className="landing-cta-row">
              <Link to="/auth" className="btn primary">ابدأ رحلتك الآن</Link>
              <Link to="/" className="btn outline">اكتشف برامجنا</Link>
            </div>
          </div>
          <div className="landing-hero-img">
            {/* Using a placeholder since I can't load the real image */}
            <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Students" />
          </div>
        </section>

        <section className="landing-features">
          <h2 className="landing-features-title">مميزاتنا</h2>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon icon={GraduationCap} size={24} />
              </div>
              <h3 className="landing-feature-title">فرص أكاديمية ومهنية عالمية</h3>
              <p className="landing-feature-desc">فرص أكاديمية ومهنية عالمية للمستقبل، أعلى المؤهلات في السياق.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon icon={Network} size={24} />
              </div>
              <h3 className="landing-feature-title">منظومة تعلم رقمية متكاملة</h3>
              <p className="landing-feature-desc">منظومة تعلم رقمية متكاملة المنظومة المتوفرة في المنظومة للتميز.</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon icon={Brain} size={24} />
              </div>
              <h3 className="landing-feature-title">تعليم ذكي مدعوم بالذكاء الاصطناعي</h3>
              <p className="landing-feature-desc">تعليم ذكي مدعوم بالذكاء الاصطناعي، تجربة تعليمية أكثر تفاعلية.</p>
            </div>
          </div>
        </section>
      </main>

      <div className="landing-shell">
        <footer className="landing-footer">
          <div className="landing-footer-socials">
            <span>تواصل معنا</span>
            <a href="#"><Icon icon={Instagram} size={18} /></a>
            <a href="#"><Icon icon={Twitter} size={18} /></a>
            <a href="#"><Icon icon={Facebook} size={18} /></a>
            <a href="#"><Icon icon={MessageCircle} size={18} /></a>
          </div>
          <div className="landing-footer-links">
            <Link to="/">البرامج الأكاديمية</Link>
            <Link to="/">القبول والتسجيل</Link>
            <span>2023 Madarek University</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
