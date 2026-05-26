import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Home, GraduationCap, School, Building2, AlertCircle } from 'lucide-react';
import { Icon } from '../components/Icon';
import { BrandMark } from '../components/BrandMark';
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
  ADMIN: '/admin/dashboard',
  QUALITY: '/quality/dashboard',
};
const homeFor = (r: AppRole): string => ROLE_HOME[r];

const DEMO_EMAIL: Record<AppRole, string> = {
  STUDENT: 'student@zu.edu.ly',
  TEACHER: 'teacher@zu.edu.ly',
  ADMIN: 'admin@zu.edu.ly',
  QUALITY: 'quality@zu.edu.ly',
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
    <div className="auth-overlay-madarek">
      {/* Persistent back-to-home pill — never traps the user on /auth */}
      <Link to="/" className="auth-back-home" aria-label="العودة للصفحة الرئيسية">
        <Icon icon={Home} size={14} />
        <span>الصفحة الرئيسية</span>
      </Link>

      <div className="auth-split">
        {/* Left side — brand + benefits */}
        <div className="auth-left">
          <div className="auth-glass-card">
            <BrandMark size={48} />
            <h1 className="auth-glass-title">منصة مدارك</h1>
            <p className="auth-glass-subtitle">جامعة الزاوية للتعليم الذكي</p>
            <p className="auth-glass-desc">
              أهلاً بك في بوابتك الأكاديمية.
              <br />
              سجّل الدخول ببريدك الجامعي أو رقم قيدك للوصول إلى مقرّراتك ومواردك.
            </p>
          </div>
        </div>

        {/* Right side — login form */}
        <div className="auth-right">
          <div className="auth-form-container">
            <h2 className="auth-form-title">تسجيل الدخول</h2>

            <form onSubmit={onLogin} noValidate className="auth-form">
              <div className="auth-field">
                <label>البريد الإلكتروني أو رقم القيد</label>
                <div className="auth-input-wrap">
                  <input
                    type="text"
                    className="auth-input has-icon-right"
                    placeholder="example@zu.edu.ly أو UZ-2024-XXXXX"
                    autoComplete="username"
                    {...loginForm.register('email')}
                  />
                  <span className="auth-input-icon"><Icon icon={Mail} size={16} /></span>
                </div>
                {loginForm.formState.errors.email && (
                  <span className="auth-field-error">{loginForm.formState.errors.email.message}</span>
                )}
              </div>

              <div className="auth-field">
                <label>كلمة المرور</label>
                <div className="auth-input-wrap">
                  <input
                    type="password"
                    className="auth-input has-icon-right"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...loginForm.register('password')}
                  />
                  <span className="auth-input-icon"><Icon icon={Lock} size={16} /></span>
                </div>
                {loginForm.formState.errors.password && (
                  <span className="auth-field-error">{loginForm.formState.errors.password.message}</span>
                )}
              </div>

              <div className="auth-forgot-row">
                <button type="button" className="auth-forgot" onClick={() => setForgotNotice(true)}>
                  نسيت كلمة المرور؟
                </button>
              </div>
              {forgotNotice && <div className="auth-forgot-notice">يرجى التواصل مع الإدارة لإعادة تعيين كلمة المرور.</div>}

              {login.isError && (
                <div className="auth-error">
                  <Icon icon={AlertCircle} size={14} />
                  <span>تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مجدداً.</span>
                </div>
              )}

              <button type="submit" className="auth-btn primary" disabled={login.isPending}>
                {login.isPending ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
              </button>

              <div className="auth-divider"><span>حسابات تجريبية</span></div>

              <div className="auth-demo">
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('STUDENT')} disabled={login.isPending}>
                  <Icon icon={GraduationCap} size={14} /> طالب
                </button>
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('TEACHER')} disabled={login.isPending}>
                  <Icon icon={School} size={14} /> أستاذ
                </button>
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('ADMIN')} disabled={login.isPending}>
                  <Icon icon={Building2} size={14} /> الإدارة
                </button>
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('QUALITY')} disabled={login.isPending}>
                  <Icon icon={AlertCircle} size={14} /> الجودة
                </button>
              </div>

              <div className="auth-register-prompt">
                ليس لديك حساب؟ تواصل مع المرشد الأكاديمي في كليّتك.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
