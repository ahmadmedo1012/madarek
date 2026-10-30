/**
 * NotFoundPage — the designed 404 surface for routes that don't match.
 *
 * r313: the Heron guest-sheet grammar — full-bleed warm paper carrying
 * the LANDING FRAME SYSTEM (a fixed 1px #B3B3AF hairline at the 7px
 * viewport inset with 10×10 mono plus marks centered on its corners —
 * the .sheet-frame/.sheet-mark recipe, D9) over the Arabic explanation
 * (r324 X10: the mono `ERR [404]` micro-label and the coordinates line
 * are retired — coordinates/revision tags are not content), and the
 * line-drawn mk-ill `not-found` scene (r280; the
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
          carries the code for assistive tech. R321 §A6: the mark spans
          are EMPTY — the '+' glyph renders from CSS ::before so it
          never leaks into innerText (aria-hidden alone does not
          remove text from innerText). */}
      <div className="nf-frame" aria-hidden="true">
        <span className="nf-mark nf-mark-tl" />
        <span className="nf-mark nf-mark-tr" />
        <span className="nf-mark nf-mark-bl" />
        <span className="nf-mark nf-mark-br" />
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

        {/* r324 X10 — the mono `ERR [404]` eyebrow and the
            `[0,0] · ROUTE NOT MAPPED · MADAREK` coordinates line are
            RETIRED: coordinates/revision tags are not content. The
            sr-only «خطأ 404.» carrier stays; the title carries the
            meaning. */}
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
