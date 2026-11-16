/**
 * r357 L2 — /auth/verify-email: the page the emailed link opens
 * (backend GET /auth/verify-email?token=… claims the one-time token).
 * Before this page the link 404'd on the SPA — the API route existed
 * since R350 E3 but nothing rendered its answer.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Logo } from '../../brand';
import { api, unwrap } from '../../lib/api';
import { apiErrorMessage } from '../../lib/format';
import { useThemeSync } from '../../components/layout/ThemeToggle';

type Phase = 'pending' | 'verified' | 'failed';

export default function VerifyEmailPage() {
  useThemeSync();
  const [phase, setPhase] = useState<Phase>('pending');
  const [message, setMessage] = useState<string>('…جارٍ التحقق من الرابط');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setPhase('failed');
      setMessage('الرابط ناقص — افتح رسالة التأكيد من بريدك واضغط الزر داخلها');
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
        setMessage(apiErrorMessage(e, 'تعذّر التحقق من الرابط — افتحه من بريدك مجددًا'));
      });
    return () => { alive = false; };
  }, []);

  return (
    <main className="auth-page" data-testid="verify-email-page">
      <Logo />
      <div className="auth-card" role="status" aria-live="polite">
        {phase === 'verified' ? <CheckCircle2 aria-hidden /> : phase === 'failed' ? <AlertCircle aria-hidden /> : null}
        <h1>تأكيد البريد الإلكتروني</h1>
        <p data-testid="verify-email-message">{message}</p>
        {phase === 'failed' && (
          <p className="hint">
            اطلب رسالة جديدة من «الإعدادات ← إعادة إرسال التأكيد»، ثم افتح الرابط من بريدك مباشرة.
          </p>
        )}
        <Link to="/auth" className="back">
          <ArrowLeft aria-hidden /> العودة إلى تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}
