import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../Icon';

/**
 * CloseScene — the landing's final act (id="close": the journey
 * rail's graduation stamp lands exactly here).
 *
 * Wave-1.5 extraction: behavior-identical move. Wave 2 rebuilds this
 * as the giant-wordmark close — «مدارك» at display scale (vw-driven,
 * copper on the dark band) above the CTA — the typographic finale the
 * reference analysis recommends (§5.5), fully original.
 */
export function CloseScene(): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <section id="close" className="band band-dark">
      <div className="marketing-container landing-final-cta">
        <h2 className="landing-final-cta-title">
          منصّتك الأكاديميّة في <em>انتظارك</em>
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
  );
}
