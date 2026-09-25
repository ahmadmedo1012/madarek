import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Home, GraduationCap, School,
  Building2, AlertCircle, ShieldCheck, ArrowLeft, Crown, Eye, EyeOff,
  FlaskConical, X,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { LibyaFlag } from '../components/LibyaFlag';
import { useLogin } from '../hooks/useAuth';
import { useThemeSync } from '../components/layout/ThemeToggle';
import type { AppRole } from '../stores/auth.store';

const loginSchema = z.object({
  email: z
    .string()
    .min(3, 'الحقل قصير جداً')
    .max(120, 'الحقل طويل جداً')
    .refine(
      (v) => v.includes('@') ? z.string().email().safeParse(v).success : true,
      { message: 'بريد إلكتروني غير صالح' },
    ),
  password: z.string().min(1, 'مطلوب'),
});
type LoginInputs = z.infer<typeof loginSchema>;

const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN:   '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER:   '/owner/dashboard',
};

/** Demo credentials are a dev-only convenience. Gating on
 *  import.meta.env.DEV keeps known emails/passwords out of production
 *  bundles (Vite replaces the flag statically, so the whole branch,
 *  its handlers and this map are dead-code-eliminated in prod builds). */
const SHOW_DEMO_LOGIN = import.meta.env.DEV;

const DEMO_EMAIL: Record<AppRole, string> = {
  STUDENT: 'student@zu.edu.ly',
  TEACHER: 'teacher@zu.edu.ly',
  ADMIN:   'admin@zu.edu.ly',
  QUALITY: 'quality@zu.edu.ly',
  OWNER:   'owner@zu.edu.ly',
};
/** Demo password — canonical value shared with the backend seed
 *  (backend/prisma/seed.ts) and the snap/probe scripts. Keeping one
 *  constant means a fresh `npm run db:seed` demo database always
 *  matches what these dev-only buttons fill in. */
const DEMO_PASSWORD = 'Madarek2026!';

/** Deep link a visitor was trying to reach when ProtectedRoute bounced
 *  them here (ProtectedRoute passes `state={{ from: location }}`). Only
 *  in-app pathnames are honored — anything else falls back to the role
 *  home, so the param can never be used to navigate off-app. */
function readFromPath(state: unknown): string | null {
  const from = (state as { from?: { pathname?: unknown } } | null)?.from?.pathname;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null;
}

export default function AuthPage() {
  useThemeSync();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [forgotNotice, setForgotNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [demoHintOpen, setDemoHintOpen] = useState(true);

  const loginForm = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // After login, resume the deep link the visitor came for (e.g. a college
  // page from the landing popover) — fall back to the role home.
  const navigateAfterLogin = (role: AppRole) => {
    navigate(readFromPath(location.state) ?? ROLE_HOME[role], { replace: true });
  };

  const onLogin = loginForm.handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync(values);
      navigateAfterLogin(result.user.role);
    } catch { /* error displayed below */ }
  });

  /** One-click FILL of the demo credentials — the visitor reviews the
   *  filled fields and submits the form themselves (no hidden
   *  auto-login; the action stays visible and honest). */
  const fillDemo = (role: AppRole) => {
    loginForm.setValue('email', DEMO_EMAIL[role], { shouldValidate: false });
    loginForm.setValue('password', DEMO_PASSWORD, { shouldValidate: false });
  };

  return (
    <div className="auth-shell">

      <div className="auth-top">
        <Link to="/" className="auth-back-home">
          <Icon icon={Home} size={14} />
          الصفحة الرئيسية
        </Link>
        <span className="auth-context">
          <LibyaFlag size={14} /> جامعة الزاوية
        </span>
      </div>

      <main className="auth-center">
        <div className="auth-card">

          <div className="auth-brand-mini">
            <span className="auth-brand-mini-mark">م</span>
            <span className="auth-brand-mini-text">مدارك</span>
          </div>

          <div className="auth-form-header">
            <h1 className="auth-form-title">مرحباً بعودتك</h1>
            <p className="auth-form-sub">
              سجِّل دخولك للوصول إلى مقرَّراتك ومواردك الأكاديمية في جامعة الزاوية.
            </p>
          </div>

          <form onSubmit={onLogin} noValidate className="auth-form">
            <div className="auth-field">
              <label htmlFor="auth-email" className="form-label">البريد الإلكتروني أو رقم القيد</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={16} /></span>
                {/* dir="ltr": accepts university IDs like 2024-CS-1234 —
                    Latin/digit runs must not be bidi-scrambled by the RTL page. */}
                <input
                  id="auth-email"
                  type="text"
                  dir="ltr"
                  className="input auth-input"
                  placeholder="example@zu.edu.ly"
                  autoComplete="username"
                  aria-invalid={!!loginForm.formState.errors.email}
                  aria-describedby={loginForm.formState.errors.email ? 'auth-email-error' : undefined}
                  {...loginForm.register('email')}
                />
              </div>
              {loginForm.formState.errors.email && (
                <span id="auth-email-error" className="auth-field-error" role="alert">
                  {loginForm.formState.errors.email.message}
                </span>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password" className="form-label">كلمة المرور</label>
              <div className="auth-input-wrap has-toggle">
                <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input auth-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!loginForm.formState.errors.password}
                  aria-describedby={loginForm.formState.errors.password ? 'auth-password-error' : undefined}
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <Icon icon={showPassword ? EyeOff : Eye} size={16} />
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <span id="auth-password-error" className="auth-field-error" role="alert">
                  {loginForm.formState.errors.password.message}
                </span>
              )}
            </div>

            <div className="auth-forgot-row">
              <button type="button" className="auth-forgot" onClick={() => setForgotNotice(true)}>
                نسيت كلمة المرور؟
              </button>
            </div>

            {forgotNotice && (
              <div className="auth-forgot-notice" role="status">
                يرجى التواصل مع المرشد الأكاديميّ في كليّتك لإعادة تعيين كلمة المرور.
              </div>
            )}

            {login.isError && (
              <div className="auth-error" role="alert">
                <Icon icon={AlertCircle} size={14} />
                <span>
                  تعذَّر تسجيل الدخول. تحقَّق من البريد وكلمة المرور وتأكَّد من اتصالك
                  بالشبكة، ثم أعد المحاولة.
                </span>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={login.isPending}>
              {login.isPending ? (
                <>
                  <span className="auth-submit-spinner" aria-hidden />
                  <span>جارٍ الدخول…</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <Icon icon={ArrowLeft} size={14} />
                </>
              )}
            </button>

            {SHOW_DEMO_LOGIN && demoHintOpen && (
              <div className="auth-demo-hint">
                <div className="auth-demo-hint-head">
                  <Icon icon={FlaskConical} size={14} />
                  <span>حسابات تجريبية — بيئة التطوير</span>
                  <button
                    type="button"
                    className="auth-demo-hint-close"
                    onClick={() => setDemoHintOpen(false)}
                    aria-label="إخفاء لوحة الحسابات التجريبية"
                  >
                    <Icon icon={X} size={14} />
                  </button>
                </div>
                <p className="auth-demo-hint-body">
                  اضغط دوراً لتعبئة الحقول ببيانات حساب تجريبي، ثم اضغط زر تسجيل الدخول.
                </p>
                <div className="auth-demo-actions">
                  <button type="button" className="auth-demo-btn" onClick={() => fillDemo('STUDENT')} disabled={login.isPending}>
                    <Icon icon={GraduationCap} size={14} />
                    <span>طالب</span>
                  </button>
                  <button type="button" className="auth-demo-btn" onClick={() => fillDemo('TEACHER')} disabled={login.isPending}>
                    <Icon icon={School} size={14} />
                    <span>أستاذ</span>
                  </button>
                  <button type="button" className="auth-demo-btn" onClick={() => fillDemo('ADMIN')} disabled={login.isPending}>
                    <Icon icon={Building2} size={14} />
                    <span>الإدارة</span>
                  </button>
                  <button type="button" className="auth-demo-btn" onClick={() => fillDemo('QUALITY')} disabled={login.isPending}>
                    <Icon icon={ShieldCheck} size={14} />
                    <span>ضمان الجودة</span>
                  </button>
                  <button type="button" className="auth-demo-btn" onClick={() => fillDemo('OWNER')} disabled={login.isPending}>
                    <Icon icon={Crown} size={14} />
                    <span>المالك</span>
                  </button>
                </div>
              </div>
            )}

            <p className="auth-register-prompt">
              ليس لديك حساب؟ <Link to="/auth/register" className="auth-register-link">أنشئ حسابك الآن</Link>
            </p>
          </form>
        </div>
      </main>

      <div className="auth-bottom">
        دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
      </div>
    </div>
  );
}
