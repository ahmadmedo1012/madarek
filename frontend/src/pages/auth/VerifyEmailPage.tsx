/**
 * r357 L2 — /auth/verify-email: the page the emailed link opens
 * (backend GET /auth/verify-email?token=… claims the one-time token).
 * Before this page the link 404'd on the SPA — the API route existed
 * since R350 E3 but nothing rendered its answer.
 *
 * R368 T5 — the sheet is rebuilt on the auth family's own grammar
 * (the r341/D1 guest-door recipe the forgot/reset sheets ride:
 * auth-shell frame + grain + TechnicalSheet, the auth-meta eyebrow,
 * the [01] ruled row, the .auth-submit fill-wipe primary door and the
 * register-prompt second door). No new visual language for a
 * secondary flow — the old bare .auth-page card was the only auth
 * sheet outside the family (pages.mjs pattern 20 → the family floor).
 * The r357 unit contract (testid message row, verbatim backend
 * refusal, missing-token guard, no API call without a token) is
 * preserved byte-for-byte.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { AuthDoor } from '../../components/auth/AuthDoor';
import { api, unwrap } from '../../lib/api';
import { apiErrorMessage } from '../../lib/format';
import { useThemeSync } from '../../components/layout/ThemeToggle';
import { usePageTitle } from '../../hooks/usePageTitle';

type Phase = 'pending' | 'verified' | 'failed';

/** The terminal refusal's honest way forward (r357 copy, verbatim —
 * pinned by tests/unit/r357-verify-email.test.tsx). */
const FAILED_HINT = 'اطلب رسالة جديدة من «الإعدادات» ثم افتح الرابط من بريدك.';

export default function VerifyEmailPage() {
  useThemeSync();
  usePageTitle('تأكيد البريد');
  const [phase, setPhase] = useState<Phase>('pending');
  const [message, setMessage] = useState<string>('…جارٍ التحقق');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setPhase('failed');
      setMessage('الرابط ناقص — افتحه من بريدك.');
      return;
    }
    let alive = true;
    unwrap<{ verified: boolean; message: string }>(api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`))
      .then((d) => {
        if (!alive) return;
        setPhase('verified');
        setMessage(d.message);
      })
      .catch((e) => {
        if (!alive) return;
        setPhase('failed');
        setMessage(apiErrorMessage(e, 'تعذّر التحقق — حاول مجددًا.'));
      });
    return () => { alive = false; };
  }, []);

  /* The eyebrow reads the phase — the same state-naming device the
   * reset sheet uses ((تمّ بنجاح) / (انتهت الصلاحية)). */
  const meta =
    phase === 'verified' ? '(تمّ)'
    : phase === 'failed' ? '(غير صالح)'
    : '(جارٍ)';

  return (
    <AuthDoor>
      <main className="auth-center">
        <div className="auth-card" role="status" aria-live="polite">

          <div className="auth-form-header">
            <span className="auth-meta">{meta}</span>
            <h1 className="auth-form-title">تأكيد البريد</h1>
            <p className="auth-form-sub">
              {phase === 'verified'
                ? 'تمّ التحقق — يمكنك المتابعة.'
                : 'يُفتح مرة واحدة.'}
            </p>
          </div>

          {/* The state's single content row — the [01] ruled-row numeral
              every auth sheet carries (r341/D1). */}
          <div className={phase === 'failed' ? 'fp-invalid' : 'fp-sent-message'}>
            <span className="auth-cell-index" dir="ltr" aria-hidden="true">[01]</span>
            {phase === 'verified'
              ? <Icon icon={CheckCircle2} size={14} aria-hidden />
              : phase === 'failed'
                ? <Icon icon={AlertCircle} size={14} aria-hidden />
                : <span className="auth-submit-spinner" aria-hidden />}
            <span data-testid="verify-email-message">{message}</span>
          </div>

          {phase === 'failed' && <p className="fp-sent-note">{FAILED_HINT}</p>}

          <Link to="/auth" className="auth-submit auth-primary-link">
            <span>العودة للدخول</span>
            <Icon icon={ArrowLeft} size={14} />
          </Link>

          <p className="auth-register-prompt">
            {phase === 'verified' && (
              <Link to="/auth" className="auth-register-link">سجّل الدخول</Link>
            )}
          </p>
        </div>
      </main>

      <footer className="auth-bottom">
        <strong>منصّة تعليم مستقلّة</strong> · عربية أولًا
      </footer>
    </AuthDoor>
  );
}
