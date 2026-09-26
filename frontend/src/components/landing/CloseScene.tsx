import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../Icon';
import { RevealCssClass } from '../../hooks/useReveal';
import '../../styles/landing-close.css';

/**
 * CloseScene — the landing's final act (id="close": the journey
 * rail's graduation stamp lands exactly here).
 *
 * Wave-2 rebuild as the giant-wordmark close (immersive plan §6 scene
 * 7): a cropped «مدارك» at display scale above the calm CTA stack —
 * the typographic finale the reference analysis recommends (§5.5),
 * fully original. The wordmark is decorative brand text (the brand
 * already lives in the header and footer), so it is aria-hidden and
 * the semantic h2 remains the section's real heading.
 */
export function CloseScene(): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <section id="close" className="band band-dark close-scene">
      {/* the single sanctioned decoration — copper radial behind the
          wordmark (landing-close.css) */}
      <span className="close-glow" aria-hidden="true" />
      <div className="marketing-container close-inner">
        {/* The wordmark — CSS-only entrance on first intersection via
            the house reveal contract (.reveal-up + .in-view from
            useReveal; reveal-fade = pure fade, no rise — a 14px lift
            on a 240px word would be invisible noise). The crop and
            the copper live in landing-close.css. */}
        <RevealCssClass as="div" className="close-wordmark reveal-fade" aria-hidden="true">
          مدارك
        </RevealCssClass>
        <h2 className="close-title">
          منصّتك الأكاديميّة في <em>انتظارك</em>
        </h2>
        <p className="close-lede">
          سجِّل دخولك ببريدك الجامعيّ أو رقم قيدك للوصول إلى مقرَّراتك ومتابعة تقدُّمك الأكاديمي.
        </p>
        <div className="close-actions">
          <Link to="/auth" className="close-cta">
            <span className="labelroll">
              <span className="labelroll-face">تسجيل الدخول</span>
              <span className="labelroll-flip" aria-hidden="true">تسجيل الدخول</span>
            </span>
            <Icon icon={ArrowLeft} size={16} />
          </Link>
          <a href="#features" className="close-cta ghost">
            <span className="labelroll">
              <span className="labelroll-face">اكتشف المنصة</span>
              <span className="labelroll-flip" aria-hidden="true">اكتشف المنصة</span>
            </span>
          </a>
        </div>
        <p className="close-meta">
          وزارة التعليم العالي والبحث العلمي · جامعة الزاوية · {year}
        </p>
      </div>
    </section>
  );
}
