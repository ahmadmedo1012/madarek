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
import { BrandMark } from '../components/BrandMark';
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
const homeFor = (r: AppRole): string => ROLE_HOME[r];

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
      navigate(homeFor(result.user.role), { replace: true });
    } catch { /* error displayed below */ }
  });

  const onDemoLogin = async (role: AppRole) => {
    try {
      const result = await login.mutateAsync({ email: DEMO_EMAIL[role], password: '1234' });
      navigate(homeFor(result.user.role), { replace: true });
    } catch { /* */ }
  };

  return (
    <div className="auth-shell">
      <Link to="/" className="auth-back-home" aria-label="العودة للصفحة الرئيسية">
        <Icon icon={Home} size={14} />
        <span>الصفحة الرئيسية</span>
      </Link>

      <div className="auth-ministry">
        <div className="auth-ministry-inner">
          <span aria-hidden><LibyaFlag size={14} /></span>
          <span className="auth-ministry-text">
            <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
          </span>
        </div>
      </div>

      <div className="auth-center">
        <div className="auth-card">
          <div className="auth-brand-block">
            <div className="auth-brand-mark"><BrandMark size={48} /></div>
            <div className="auth-brand-block-name">منصة الزاوية</div>
            <div className="auth-brand-block-sub">جامعة الزاوية للتعليم الذكي</div>
          </div>

          <div className="auth-form-header">
            <h1 className="auth-form-title">تسجيل الدخول</h1>
            <p className="auth-form-sub">سجّل الدخول للوصول إلى مقرّراتك ومواردك الأكاديمية.</p>
          </div>

          <form onSubmit={onLogin} noValidate className="auth-form">
            <div className="auth-field">
              <label htmlFor="auth-email">البريد الإلكتروني أو رقم القيد</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={15} /></span>
                <input
                  id="auth-email"
                  type="text"
                  className="auth-input has-icon-start"
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
              <label htmlFor="auth-password">كلمة المرور</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={15} /></span>
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
                  <Icon icon={ArrowLeft} size={14} />
                </>
              )}
            </button>

            <div className="auth-divider"><span>أو جرّب بحساب تجريبي</span></div>

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
              ليس لديك حساب؟ تواصل مع المرشد الأكاديمي في كليّتك.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
