import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { Logo } from '../../brand';
import { useResetPassword } from '../../hooks/useAuth';
import { useThemeSync } from '../../components/layout/ThemeToggle';
import { usePageTitle } from '../../hooks/usePageTitle';
import { authErrorView } from '../../lib/authErrors';
import { isCommonPassword } from '../../lib/commonPasswords';

/**
 * R320 §D (PAGES-GAP §5) — خطوة ٢: /auth/reset-password?token=…
 *
 * قواعد الصفحة (ملزمة):
 *  - التحقق من الصلاحية معروضًا بأمانة: رابط مجهول/منتهي/مُستهلك كلها
 *    حالة واحدة نهائية «الرابط غير صالح أو انتهت صلاحيته» مع باب طلب
 *    رابط جديد — لا تُميّز الصفحة بين الأسباب الثلاثة (لا وحي الروابط).
 *  - سياسة كلمة المرور الحقيقية مرآةً عن الخلفية (12–72 + قائمة
 *    الشائعة — نفس عقد useChangePassword/RegisterPage)، والنسخ
 *    مكتوبة من سلوك الكود الفعلي.
 *  - النجاح يُخفي الاستمارة ويعرض تأكيدًا هادئًا ثم يعيد الزائر إلى
 *    /auth بعد 2.4 ثانية — الجلسات القديمة (إن وُجدت) أُبطلت جميعًا
 *    من الخلفية (tokenVersion bump) فتسجيل الدخول من جديد هو الخطوة
 *    التالية الصادقة الوحيدة.
 *
 * Sheet grammar: AuthPage's own (same as ForgotPasswordPage — the two
 * pages share the flow, so they share the sheet).
 */

/** The REAL policy mirror (backend passwordSchema: 12–72 + blocklist) —
 * the reset flow NEVER accepts a demo bypass: the new password is a
 * real credential. Same Arabic messages the backend's 400 carries. */
const newPasswordSchema = z
  .string()
  .min(12, '12 حرفًا على الأقل')
  .max(72, '72 حرفًا كحدّ أقصى')
  .refine((pw) => !isCommonPassword(pw), {
    message: 'كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا',
  });

const resetFormSchema = z
  .object({
    password: newPasswordSchema,
    confirm: z.string().min(1, 'مطلوب'),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'التأكيد لا يطابق كلمة المرور',
  });
type ResetInputs = z.infer<typeof resetFormSchema>;

/** ONE terminal state for every dead link — unknown, expired or used
 * are indistinguishable by design (PAGES-GAP §5: no token-oracle). */
const INVALID_TOKEN_TITLE = 'الرابط غير صالح أو انتهت صلاحيته';
const INVALID_TOKEN_BODY =
  'روابط الاستعادة تُستخدم مرة واحدة وتنتهي صلاحيتها بعد ٣٠ دقيقة — اطلب رابطًا جديدًا وأعد المحاولة.';

/** Generic refusal ONLY for failures the server never answered (network). */
const GENERIC_RESET_ERROR =
  'تعذّر تحديث كلمة المرور — تحقّق من اتصالك بالشبكة ثم أعد المحاولة.';

/** Success → back to the login sheet: fast enough to feel guided, slow
 * enough to read the confirmation (2.4s). */
const SUCCESS_REDIRECT_MS = 2_400;

export default function ResetPasswordPage() {
  useThemeSync();
  usePageTitle('تعيين كلمة مرور جديدة');
  const [params] = useSearchParams();
  const token = (params.get('token') ?? '').trim();
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const [succeeded, setSucceeded] = useState(false);

  const form = useForm<ResetInputs>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await resetPassword.mutateAsync({ token, password: values.password });
      setSucceeded(true);
      window.setTimeout(() => navigate('/auth', { replace: true }), SUCCESS_REDIRECT_MS);
    } catch {
      /* banner below — the backend's ONE generic Arabic refusal for every
       * dead token (D17-3: verbatim), or the network line */
    }
  });

  /* A structurally-absent token never reaches the form: our links carry
   * ?token=<43 chars>; an empty/garbage query is the terminal invalid
   * state directly (the backend would refuse it identically — one
   * message, no oracle — so the page saves the round trip).
   * A REFUSED submit (the backend's generic 400) flips the same terminal
   * state; a network failure (server never answered) keeps the form +
   * its banner — a dead transport is not a dead link. */
  const serverRefused =
    resetPassword.isError && authErrorView(resetPassword.error).serverMessage !== undefined;
  const linkIsDead = !token || (serverRefused && !succeeded);

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

          {succeeded ? (
            <>
              <div className="auth-form-header">
                <span className="auth-meta">(تمّ بنجاح)</span>
                <h1 className="auth-form-title">تمّ تغيير كلمة المرور</h1>
                <p className="auth-form-sub">
                  كلمة المرور الجديدة أصبحت سارية، وأُبطلت كل الجلسات المفتوحة على جميع الأجهزة — سجّل الدخول من جديد للمتابعة.
                </p>
              </div>
              {/* The redirect fires 2.4s after success (setTimeout above);
                  the link is the same door, immediate for the impatient. */}
              <p className="fp-sent-message" role="status">
                سيُعاد توجيهك إلى صفحة تسجيل الدخول بعد لحظات — أو{' '}
                <Link to="/auth" className="auth-register-link">سجّل الدخول الآن</Link>
              </p>
            </>
          ) : linkIsDead ? (
            <>
              {/* The ONE terminal state for every dead link — unknown,
                  expired and used read identically here on purpose. */}
              <div className="auth-form-header">
                <span className="auth-meta">(انتهت الصلاحية)</span>
                <h1 className="auth-form-title">{INVALID_TOKEN_TITLE}</h1>
                <p className="auth-form-sub">{INVALID_TOKEN_BODY}</p>
              </div>
              <div className="fp-invalid" role="alert">
                <Icon icon={AlertCircle} size={14} />
                <span>{INVALID_TOKEN_TITLE} — اطلب رابطًا جديدًا.</span>
              </div>
              <Link to="/auth/forgot-password" className="auth-submit fp-new-link">
                اطلب رابطًا جديدًا
                <Icon icon={ArrowLeft} size={14} />
              </Link>
            </>
          ) : (
            <>
              <div className="auth-form-header">
                <span className="auth-meta">(كلمة مرور جديدة)</span>
                <h1 className="auth-form-title">عيّن كلمة مرور جديدة</h1>
                <p className="auth-form-sub">
                  اختر كلمة مرور قوية لحسابك — من ١٢ إلى ٧٢ حرفًا، ليست من الكلمات الشائعة.
                </p>
              </div>

              <form onSubmit={onSubmit} noValidate className="auth-form">
                <div className="auth-cells">
                  <div className="auth-cell">
                    <span className="auth-cell-index" dir="ltr" aria-hidden="true">[01]</span>
                    <label htmlFor="reset-password" className="form-label">كلمة المرور الجديدة</label>
                    <div className="auth-cell-control">
                      <input
                        id="reset-password"
                        type="password"
                        dir="ltr"
                        className="input auth-input"
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!form.formState.errors.password}
                        aria-describedby={form.formState.errors.password ? 'reset-password-error' : undefined}
                        {...form.register('password')}
                      />
                      {form.formState.errors.password && (
                        <span id="reset-password-error" className="auth-field-error">
                          {form.formState.errors.password.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="auth-cell">
                    <span className="auth-cell-index" dir="ltr" aria-hidden="true">[02]</span>
                    <label htmlFor="reset-confirm" className="form-label">تأكيد كلمة المرور</label>
                    <div className="auth-cell-control">
                      <input
                        id="reset-confirm"
                        type="password"
                        dir="ltr"
                        className="input auth-input"
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!form.formState.errors.confirm}
                        aria-describedby={form.formState.errors.confirm ? 'reset-confirm-error' : undefined}
                        {...form.register('confirm')}
                      />
                      {form.formState.errors.confirm && (
                        <span id="reset-confirm-error" className="auth-field-error">
                          {form.formState.errors.confirm.message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* The REAL policy, from the code (auth.dto.ts): length
                    12–72 + the common-password blocklist — nothing
                    invented, nothing hidden. */}
                <div className="fp-mail-note" role="note">
                  السياسة الفعلية: ١٢ حرفًا على الأقل و٧٢ كحدّ أقصى، وألا تكون من الكلمات الشائعة (تُرفض مثل password123). تعمل القاعدة نفسها في التسجيل وتغيير كلمة المرور.
                </div>

                {resetPassword.isError && (
                  <div className="auth-error" role="alert">
                    <Icon icon={AlertCircle} size={14} />
                    <span>
                      {/* ONE generic refusal for every dead token — the
                          backend's Arabic message verbatim (D17-3); the
                          generic line only when the network never answered. */}
                      {authErrorView(resetPassword.error).serverMessage ?? GENERIC_RESET_ERROR}
                    </span>
                  </div>
                )}

                {(form.formState.errors.password || form.formState.errors.confirm) && (
                  <p className="auth-form-summary" role="status" aria-live="polite">
                    {(() => {
                      const n = [form.formState.errors.password, form.formState.errors.confirm].filter(Boolean).length;
                      return n === 1 ? 'مشكلة واحدة في النموذج — راجع الحقل المعلّم ثم أعد المحاولة.' : 'مشكلتان في النموذج — راجع الحقلين المعلّمين ثم أعد المحاولة.';
                    })()}
                  </p>
                )}

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={resetPassword.isPending}
                  aria-busy={resetPassword.isPending}
                >
                  {resetPassword.isPending ? (
                    <>
                      <span className="auth-submit-spinner" aria-hidden />
                      <span>جارٍ الحفظ…</span>
                    </>
                  ) : (
                    <>
                      <span>حفظ كلمة المرور الجديدة</span>
                      <Icon icon={ArrowLeft} size={14} />
                    </>
                  )}
                </button>

                {resetPassword.isPending && (
                  <span className="sr-only" role="status" aria-live="polite">
                    جارٍ تحديث كلمة المرور…
                  </span>
                )}
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="auth-bottom">
        <strong>منصّة تعليم ذكية مستقلّة</strong> · عربية أولًا
      </footer>
    </div>
  );
}
