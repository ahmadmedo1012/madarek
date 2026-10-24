/**
 * NotFoundPage — the designed 404 surface for routes that don't match.
 *
 * r313: the Heron guest-sheet grammar — full-bleed warm paper carrying
 * the LANDING FRAME SYSTEM (a fixed 1px #B3B3AF hairline at the 7px
 * viewport inset with 10×10 mono plus marks centered on its corners —
 * the .sheet-frame/.sheet-mark recipe, D9), the mono `ERR [404]`
 * micro-label (Latin, LTR, Geist Mono uppercase) over the Arabic
 * explanation, and the line-drawn mk-ill `not-found` scene (r280; the
 * r313 two-tone recolour — square corners, paper-step tints). One
 * witty-but-dignified line, a prominent way home, and two secondary
 * ways back for the two kinds of lost visitor: the public browser (the
 * colleges directory — ruling #9, guests land here without the app
 * shell and therefore without GlobalSearch) and the returning student
 * whose stale deep-link 404'd (r164b: login — previously a returning
 * user had to reach the landing to find any /auth door).
 * Reachable via:
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
      {/* r313: the page frame — the landing's full-page drafting frame
          (fixed 1px #B3B3AF at the 7px inset + 10×10 mono corner plus
          marks, the .sheet-frame grammar). Everything decorative is
          aria-hidden and pointer-transparent; the sr-only span below
          carries the code for assistive tech. */}
      <div className="nf-frame" aria-hidden="true">
        <span className="nf-mark nf-mark-tl">+</span>
        <span className="nf-mark nf-mark-tr">+</span>
        <span className="nf-mark nf-mark-bl">+</span>
        <span className="nf-mark nf-mark-br">+</span>
      </div>
      {/* c3-W6 (K-I completeness): the measured paper-grain film — the
          auth sheet's .auth-grain layer (documented cross-page borrow,
          auth.css is global). Same texture as /auth + the guest sheets;
          .nf-scene rides z 1 above it (auth.css §7). */}
      <div className="auth-grain" aria-hidden="true" />

      <div className="nf-scene">
        <div className="nf-illustration">
          <Illustration name="not-found" />
        </div>

        {/* The error code for assistive tech — the scene carries it
            visually (mono ERR [404]), the title carries the meaning. */}
        <span className="sr-only">خطأ 404.</span>

        {/* r313: the visible code marker — the reference's mono
            micro-label voice (Geist Mono, uppercase, LTR). The AT
            carrier is the sr-only span above, so the visible run is
            aria-hidden (the bento code-badge precedent) and never
            announced twice. */}
        <span className="nf-eyebrow" aria-hidden="true" dir="ltr">ERR [404]</span>

        <h1 className="nf-title">هذه الصفحة تغيّبت عن الحضور</h1>
        <p className="nf-sub">
          الرابط الذي فتحته لا يطابق أيّ صفحة في مدارك — ربّما تغيّر عنوانها أو وُرِد
          بشكل غير دقيق.
        </p>

        {/* r313: the coordinate line — the reference's edge coordinate
            labels (mono, faint, LTR). Decorative. */}
        <span className="nf-coords" aria-hidden="true" dir="ltr">
          [0,0] &middot; ROUTE NOT MAPPED &middot; MADAREK
        </span>

        <div className="nf-actions">
          <Link to="/" className="btn primary lg">
            <Icon icon={Home} size={16} />
            العودة إلى الرئيسية
          </Link>
          <Link to="/colleges" className="btn lg">
            <Icon icon={Building2} size={16} />
            تصفح الكليات التجريبية
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
