import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Home, GraduationCap, School,
  Building2, AlertCircle, ShieldCheck, Sparkles,
  CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { BrandMark } from '../components/BrandMark';
import { LibyaFlag } from '../components/LibyaFlag';
import { useLogin } from '../hooks/useAuth';
import { useThemeSync } from '../components/layout/ThemeToggle';
import type { AppRole } from '../stores/auth.store';

/**
 * Login schema — accepts EITHER email OR reg-number.
 * Detection: '@' present → email validation; otherwise reg-number string.
 */
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
const homeFor = (r: AppRole): string => ROLE_HOME[r];

const DEMO_EMAIL: Record<AppRole, string> = {
  STUDENT: 'student@zu.edu.ly',
  TEACHER: 'teacher@zu.edu.ly',
  ADMIN:   'admin@zu.edu.ly',
  QUALITY: 'quality@zu.edu.ly',
  OWNER:   'owner@zu.edu.ly',
};

const FEATURES: Array<{ icon: typeof ShieldCheck; title: string; desc: string }> = [
  { icon: ShieldCheck, title: 'منصة رسمية موثّقة', desc: 'تحت إشراف وزارة التعليم العالي والبحث العلمي.' },
  { icon: Sparkles,    title: 'مساعد ذكي للأساتذة والطلبة', desc: 'يلخّص المحاضرات ويولّد الأسئلة ويتابع التقدم.' },
  { icon: CheckCircle2, title: 'وصول موحَّد لكل الأدوار',     desc: 'طالب · أستاذ · إدارة · جودة — تجربة واحدة.' },
];

export default function AuthPage() {
  useThemeSync();
  const navigate = useNavigate();
  const login = useLogin();
  const [forgotNotice, setForgotNotice] = useState(false);

  const loginForm = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onLogin = loginForm.handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync(values);
      navigate(homeFor(result.user.role), { replace: true });
    } catch { /* error displayed below the form */ }
  });

  const onDemoLogin = async (role: AppRole) => {
    try {
      const result = await login.mutateAsync({ email: DEMO_EMAIL[role], password: '1234' });
      navigate(homeFor(result.user.role), { replace: true });
    } catch { /* */ }
  };

  return (
    <div className="auth-shell">
      {/* Persistent back-to-home pill — never traps the user on /auth */}
      <Link to="/" className="auth-back-home" aria-label="العودة للصفحة الرئيسية">
        <Icon icon={Home} size={14} />
        <span>الصفحة الرئيسية</span>
      </Link>

      <div className="auth-grid">
        {/* ─── Brand pane — institutional identity ─────────────────── */}
        <aside className="auth-brand-pane" aria-hidden="false">
          <div className="auth-brand-glow" aria-hidden />
          <div className="auth-brand-grid" aria-hidden />

          <div className="auth-brand-strip">
            <span className="auth-brand-strip-flag" aria-hidden><LibyaFlag size={16} /></span>
            <span className="auth-brand-strip-text">
              دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong>
            </span>
          </div>

          <header className="auth-brand-header">
            <BrandMark size={56} />
            <div className="auth-brand-id">
              <h1 className="auth-brand-name">منصة الزاوية</h1>
              <p className="auth-brand-univ">جامعة الزاوية للتعليم الذكي</p>
            </div>
          </header>

          <div className="auth-brand-body">
            <p className="auth-brand-eyebrow">منصّة أكاديمية متكاملة</p>
            <h2 className="auth-brand-tagline">
              بوابتك الجامعية الموحّدة — كل شيء يحتاجه طالب وأستاذ في مكان واحد.
            </h2>

            <ul className="auth-brand-features">
              {FEATURES.map((f, i) => (
                <li key={i} className="auth-brand-feature">
                  <span className="auth-brand-feature-icon" aria-hidden>
                    <Icon icon={f.icon} size={18} />
                  </span>
                  <div className="auth-brand-feature-text">
                    <span className="auth-brand-feature-title">{f.title}</span>
                    <span className="auth-brand-feature-desc">{f.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <footer className="auth-brand-footer">
            <span>© {new Date().getFullYear()} جامعة الزاوية</span>
            <span className="auth-brand-footer-sep" aria-hidden>·</span>
            <span>جميع الحقوق محفوظة</span>
          </footer>
        </aside>

        {/* ─── Form pane ────────────────────────────────────────────── */}
        <section className="auth-form-pane">
          <div className="auth-form-container">
            <header className="auth-form-header">
              <h2 className="auth-form-title">تسجيل الدخول</h2>
              <p className="auth-form-sub">سجّل الدخول ببريدك الجامعي أو رقم قيدك للوصول إلى مقرّراتك.</p>
            </header>

            <form onSubmit={onLogin} noValidate className="auth-form">
              <div className="auth-field">
                <label htmlFor="auth-email">البريد الإلكتروني أو رقم القيد</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={16} /></span>
                  <input
                    id="auth-email"
                    type="text"
                    className="auth-input has-icon-start"
                    placeholder="example@zu.edu.ly أو UZ-2024-XXXXX"
                    autoComplete="username"
                    aria-invalid={!!loginForm.formState.errors.email}
                    {...loginForm.register('email')}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <span className="auth-field-error" role="alert">
                    {loginForm.formState.errors.email.message}
                  </span>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="auth-password">كلمة المرور</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
                  <input
                    id="auth-password"
                    type="password"
                    className="auth-input has-icon-start"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!loginForm.formState.errors.password}
                    {...loginForm.register('password')}
                  />
                </div>
                {loginForm.formState.errors.password && (
                  <span className="auth-field-error" role="alert">
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
                  يرجى التواصل مع الإدارة لإعادة تعيين كلمة المرور.
                </div>
              )}

              {login.isError && (
                <div className="auth-error" role="alert">
                  <Icon icon={AlertCircle} size={14} />
                  <span>تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مجدداً.</span>
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
                    <Icon icon={ArrowLeft} size={16} />
                  </>
                )}
              </button>

              <div className="auth-divider"><span>أو جرّب بحساب تجريبي</span></div>

              <div className="auth-demo">
                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => onDemoLogin('STUDENT')}
                  disabled={login.isPending}
                >
                  <Icon icon={GraduationCap} size={14} />
                  <span>طالب</span>
                </button>
                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => onDemoLogin('TEACHER')}
                  disabled={login.isPending}
                >
                  <Icon icon={School} size={14} />
                  <span>أستاذ</span>
                </button>
                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => onDemoLogin('ADMIN')}
                  disabled={login.isPending}
                >
                  <Icon icon={Building2} size={14} />
                  <span>الإدارة</span>
                </button>
                <button
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => onDemoLogin('QUALITY')}
                  disabled={login.isPending}
                >
                  <Icon icon={ShieldCheck} size={14} />
                  <span>الجودة</span>
                </button>
              </div>

              <p className="auth-register-prompt">
                ليس لديك حساب؟ تواصل مع المرشد الأكاديمي في كليّتك.
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
