/**
 * NotFoundPage — the designed 404 surface for routes that don't match.
 *
 * Renders the mk-ill kit's `not-found` piece (r280 — replaces the
 * retired legacy error-404 telescope scene; same "look elsewhere"
 * read, the two-colour kit family grammar) with one witty-but-dignified line,
 * a prominent way home, and two secondary ways back for the two kinds
 * of lost visitor: the public browser (the colleges directory — ruling
 * #9, guests land here without the app shell and therefore without
 * GlobalSearch) and the returning student whose stale deep-link 404'd
 * (r164b: login — previously a returning user had to reach the landing
 * to find any /auth door). Reachable via:
 *   - the explicit /404 route (used by the audit harness)
 *   - the catch-all *  route at the end of App.tsx
 */
import { Link } from 'react-router-dom';
import { Building2, Home, LogIn } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Illustration } from '../components/illustrations/Illustration';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('الصفحة غير موجودة');
  return (
    <main className="nf-shell">
      <div className="nf-scene">
        <div className="nf-illustration" aria-hidden>
          <Illustration name="not-found" />
        </div>
        {/* The error code for assistive tech — the illustration carries
            it visually, the title carries the meaning. */}
        <span className="sr-only">خطأ 404.</span>
        <h1 className="nf-title">هذه الصفحة تغيّبت عن الحضور</h1>
        <p className="nf-sub">
          الرابط الذي فتحته لا يطابق أيّ صفحة في مدارك — ربّما تغيّر عنوانها أو وُرِد
          بشكل غير دقيق.
        </p>
        <div className="nf-actions">
          <Link to="/" className="btn primary lg">
            <Icon icon={Home} size={16} />
            العودة إلى الرئيسية
          </Link>
          <Link to="/colleges" className="btn lg">
            <Icon icon={Building2} size={16} />
            تصفّح الكلّيّات التجريبية
          </Link>
          {/* r164b: the returning-visitor way back — ONE primary stays
              (home); login joins colleges as a secondary exit. */}
          <Link to="/auth" className="btn lg">
            <Icon icon={LogIn} size={16} />
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}
