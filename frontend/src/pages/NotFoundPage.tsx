/**
 * NotFoundPage — the designed 404 surface for routes that don't match.
 *
 * Renders the bespoke `error-404` illustration scene (the telescope
 * motif points to "look elsewhere") with one witty-but-dignified line,
 * a prominent way home, and a public browse suggestion (the colleges
 * directory — ruling #9) since guests land here without the app shell
 * (and therefore without GlobalSearch). Reachable via:
 *   - the explicit /404 route (used by the audit harness)
 *   - the catch-all *  route at the end of App.tsx
 */
import { Link } from 'react-router-dom';
import { Building2, Home } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Illustration } from '../components/Illustration';

export default function NotFoundPage() {
  return (
    <main className="nf-shell">
      <div className="nf-scene">
        <div className="nf-illustration" aria-hidden>
          <Illustration name="error-404" decorative />
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
            تصفّح كليات الجامعة
          </Link>
        </div>
      </div>
    </main>
  );
}
