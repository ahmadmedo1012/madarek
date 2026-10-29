import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { Logo } from '../../brand';
import { useRequestPasswordReset } from '../../hooks/useAuth';
import { useThemeSync } from '../../components/layout/ThemeToggle';
import { usePageTitle } from '../../hooks/usePageTitle';
import { authErrorView } from '../../lib/authErrors';
import type { ForgotPasswordResponse } from '../../lib/api';

/**
 * R320 §D (PAGES-GAP §5) — خطوة ١ من استعادة كلمة المرور:
 * /auth/forgot-password.
 *
 * قواعد الصفحة (ملزمة):
 *  - لا تمييز بين بريد مسجّل وغير مسجّل: الخلفية تجيب دائمًا بالرسالة
 *    العامة نفسها، والصفحة تعرضها كما هي — لا تكذب ولا تُلمّح.
 *  - أمانة «قريبًا»: مُزوّد البريد غير مُهيّأ بعد (لا شيء يُرسَل فعليًا)،
 *    فالصفحة تقول ذلك صراحةً قبل الإرسال وبعده مع وسم
 *    [يُستكمل قبل الإطلاق] — نفس سجل أمانة صفحات /legal (LEGAL-TODO 7/8).
 *  - وضع الاختبار: حين تعيد الخلفية رابط devInbox (حسابات @test.ly
 *    الموجودة فقط) تُعرض لوحة mono واضحة العنوان بالرابط — لا شيء يُخفى.
 *
 * The sheet grammar is AuthPage's own (frame + grain + [MDRK-AUTH] mono
 * line + hairline numbered cells + the fill-wipe submit) — no new
 * visual language for a secondary flow.
 */

/** Client-side gate: required + email shape (the backend's
 * forgotPasswordSchema mirrors it; catching it here saves the round
 * trip and keeps the cell's error grammar consistent with AuthPage). */
const forgotSchema = z.object({
  email: z.string().trim().min(1, 'مطلوب').max(120, 'الحقل طويل جداً').email('بريد إلكتروني غير صالح'),
});
type ForgotInputs = z.infer<typeof forgotSchema>;

/** Honest mail-delivery copy — shown BEFORE submit and again inside the
 * after-submit state (the generic API message alone would imply a mail
 * that never leaves; the platform says what it is). */
const MAIL_NOT_CONFIGURED_NOTE =
  'إرسال البريد الفعلي غير مُهيّأ بعد [يُستكمل قبل الإطلاق] — حتى تهيئته، حسابات @test.ly التجريبية تستلم رابط الاستعادة هنا مباشرةً، وللحسابات الأخرى استخدم قناة التواصل في صفحة «اتصل بنا».';

/** Generic refusal ONLY for failures the server never answered (network). */
const GENERIC_REQUEST_ERROR =
  'تعذّر إرسال الطلب — تحقّق من اتصالك بالشبكة ثم أعد المحاولة.';

export default function ForgotPasswordPage() {
  useThemeSync();
  usePageTitle('استعادة كلمة المرور');
  const requestReset = useRequestPasswordReset();
  /** The server's generic answer — kept for the after-submit state (the
   * page re-renders it verbatim, never rephrases it). */
  const [sent, setSent] = useState<ForgotPasswordResponse | null>(null);

  const form = useForm<ForgotInputs>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const res = await requestReset.mutateAsync(values.email);
      setSent(res);
    } catch {
      /* banner below — the backend's Arabic message verbatim, or the
       * generic line when the network never answered */
    }
  });

  return (
    <div className="auth-shell">
      <div className="auth-frame" aria-hidden="true">
        <span className="auth-mark auth-mark-tl" />
        <span className="auth-mark auth-mark-tr" />
        <span className="auth-mark auth-mark-bl" />
        <span className="auth-mark auth-mark-br" />
      </div>
      <div className="auth-grain" aria-hidden="true" />

      <header className="auth-top">
        <Link to="/auth" className="auth-back-home">
          <Icon icon={ArrowLeft} size={14} />
          العودة إلى تسجيل الدخول
        </Link>
        <span className="auth-context">
          <Logo variant="mark" size={14} /> مدارك
        </span>
      </header>

      <main className="auth-center">
        <div className="auth-card">
          <p className="auth-sheet-label" aria-hidden="true">
            <span dir="ltr">[MDRK-AUTH] · SHEET 01/01</span>
          </p>

          <div className="auth-form-header">
            <span className="auth-meta">(استعادة الحساب)</span>
            <h1 className="auth-form-title">استعادة كلمة المرور</h1>
            <p className="auth-form-sub">
              أدخل بريدك الإلكتروني المسجّل — إذا كان موجودًا فستصلك رسالة خلال دقائق.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="auth-form">
            <div className="auth-cells">
              <div className="auth-cell">
                <span className="auth-cell-index" dir="ltr" aria-hidden="true">[01]</span>
                <label htmlFor="forgot-email" className="form-label">البريد الإلكتروني</label>
                <div className="auth-cell-control">
                  {/* dir="ltr": emails are Latin runs — the caret must not
                      bidi-flip inside the RTL sheet. */}
                  <input
                    id="forgot-email"
                    type="email"
                    dir="ltr"
                    className="input auth-input"
                    placeholder="example@email.com"
                    inputMode="email"
                    autoComplete="email"
                    aria-invalid={!!form.formState.errors.email}
                    aria-describedby={form.formState.errors.email ? 'forgot-email-error' : undefined}
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <span id="forgot-email-error" className="auth-field-error">
                      {form.formState.errors.email.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* The honest «no mail yet» note — BEFORE submit (the visitor
                must know what asking will and will not do). */}
            <div className="fp-mail-note" role="note">
              {MAIL_NOT_CONFIGURED_NOTE}
            </div>

            {sent && (
              <div className="fp-sent" role="status" aria-live="polite">
                {/* The backend's generic no-enumeration copy, verbatim —
                    the SAME words for every visitor, existing or not. */}
                <p className="fp-sent-message">{sent.message}</p>
                {/* …and the honest caveat again AFTER submit: a mail that
                    «ستصلك خلال دقائق» is not configured yet — say so. */}
                <p className="fp-sent-note">{MAIL_NOT_CONFIGURED_NOTE}</p>

                {/* Dev-inbox — ONLY when the API answered with a link
                    (@test.ly demo accounts): a clearly-marked test-mode
                    panel with the copyable reset link (dir=ltr mono run). */}
                {sent.devInbox && (
                  <div className="fp-dev-inbox" data-mode={sent.devInbox.mode}>
                    <p className="fp-dev-inbox-head">
                      وضع الاختبار — رابط الاستعادة <span dir="ltr">(test mode)</span>
                    </p>
                    <p className="fp-dev-inbox-note">لا يُرسل بريد فعلي — الرابط معروض هنا لأن الحساب تجريبي (@test.ly).</p>
                    <div className="fp-dev-inbox-link-row">
                      <a
                        className="fp-dev-inbox-link"
                        dir="ltr"
                        href={sent.devInbox.url}
                      >
                        {sent.devInbox.url}
                      </a>
                      <button
                        type="button"
                        className="fp-dev-inbox-copy"
                        onClick={() => {
                          void navigator.clipboard?.writeText(sent.devInbox?.url ?? '');
                        }}
                      >
                        نسخ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {requestReset.isError && (
              <div className="auth-error" role="alert">
                <Icon icon={AlertCircle} size={14} />
                <span>
                  {/* D17-3: the backend's own Arabic message verbatim — the
                      429 limiter envelopes included; the generic line only
                      when the server never answered. */}
                  {authErrorView(requestReset.error).serverMessage ?? GENERIC_REQUEST_ERROR}
                </span>
              </div>
            )}

            {form.formState.errors.email && (
              <p className="auth-form-summary" role="status" aria-live="polite">
                مشكلة واحدة في النموذج — راجع الحقل المعلّم ثم أعد المحاولة.
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={requestReset.isPending}
              aria-busy={requestReset.isPending}
            >
              {requestReset.isPending ? (
                <>
                  <span className="auth-submit-spinner" aria-hidden />
                  <span>جارٍ الإرسال…</span>
                </>
              ) : (
                <>
                  <span>إرسال رابط الاستعادة</span>
                  <Icon icon={ArrowLeft} size={14} />
                </>
              )}
            </button>

            {requestReset.isPending && (
              <span className="sr-only" role="status" aria-live="polite">
                جارٍ إرسال الطلب…
              </span>
            )}

            <p className="auth-register-prompt">
              تذكّرت كلمة المرور؟ <Link to="/auth" className="auth-register-link">عد إلى تسجيل الدخول</Link>
            </p>
          </form>
        </div>
      </main>

      <footer className="auth-bottom">
        <strong>منصّة تعليم ذكية مستقلّة</strong> · عربية أولًا
      </footer>
    </div>
  );
}
