import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Home, GraduationCap, School,
  Building2, AlertCircle, ShieldCheck, ArrowLeft,
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

const DEMO_EMAIL: Record<AppRole, string> = {
  STUDENT: 'student@zu.edu.ly',
  TEACHER: 'teacher@zu.edu.ly',
  ADMIN:   'admin@zu.edu.ly',
  QUALITY: 'quality@zu.edu.ly',
  OWNER:   'owner@zu.edu.ly',
};

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
      navigate(ROLE_HOME[result.user.role], { replace: true });
    } catch { /* error displayed below */ }
  });

  const onDemoLogin = async (role: AppRole) => {
    try {
      const result = await login.mutateAsync({ email: DEMO_EMAIL[role], password: '1234' });
      navigate(ROLE_HOME[result.user.role], { replace: true });
    } catch { /* */ }
  };

  return (
    <div className="auth-shell">

      <div className="auth-top">
        <Link to="/" className="auth-back-home">
          <Icon icon={Home} size={14} />
          الصفحة الرئيسية
        </Link>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LibyaFlag size={14} /> جامعة الزاوية
        </span>
      </div>

      <div className="auth-center">
        <div className="auth-card">

          <div className="auth-brand-mini">
            <span className="auth-brand-mini-mark">م</span>
            <span className="auth-brand-mini-text">مدارك</span>
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">مرحباً بعودتك</h2>
            <p className="auth-form-sub">
              سجِّل دخولك للوصول إلى مقرَّراتك ومواردك الأكاديمية في جامعة الزاوية.
            </p>
          </div>

          <form onSubmit={onLogin} noValidate className="auth-form">
            <div className="auth-field">
              <label htmlFor="auth-email" className="form-label">البريد الإلكتروني أو رقم القيد</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={16} /></span>
                <input
                  id="auth-email"
                  type="text"
                  className="auth-input"
                  placeholder="example@zu.edu.ly"
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
              <label htmlFor="auth-password" className="form-label">كلمة المرور</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
                <input
                  id="auth-password"
                  type="password"
                  className="auth-input"
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
              <span />
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
                <span>تعذَّر تسجيل الدخول. تحقَّق من البيانات وحاول مجدداً.</span>
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

            <div className="auth-divider">أو جرِّب بحساب تجريبيّ</div>

            <div className="auth-demo">
              <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('STUDENT')} disabled={login.isPending}>
                <Icon icon={GraduationCap} size={14} />
                <span>طالب</span>
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('TEACHER')} disabled={login.isPending}>
                <Icon icon={School} size={14} />
                <span>أستاذ</span>
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('ADMIN')} disabled={login.isPending}>
                <Icon icon={Building2} size={14} />
                <span>الإدارة</span>
              </button>
              <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('QUALITY')} disabled={login.isPending}>
                <Icon icon={ShieldCheck} size={14} />
                <span>الجودة</span>
              </button>
            </div>

            <p className="auth-register-prompt">
              ليس لديك حساب؟ <Link to="/auth/register" className="auth-register-link">أنشئ حسابك الآن</Link>
            </p>
          </form>
        </div>
      </div>

      <div className="auth-bottom">
        دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
      </div>
    </div>
  );
}
