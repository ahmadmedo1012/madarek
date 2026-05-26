import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Icon } from '../components/Icon';
import { BrandMark } from '../components/BrandMark';
import { useLogin } from '../hooks/useAuth';
import { useThemeSync } from '../components/layout/ThemeToggle';
import type { AppRole } from '../stores/auth.store';

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
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
    } catch { /* */ }
  });

  return (
    <div className="auth-overlay-madarek">
      <div className="auth-split">
        {/* Left Side - Image Background */}
        <div className="auth-left">
          <div className="auth-glass-card">
            <BrandMark size={48} />
            <h1 className="auth-glass-title">جامعة مدارك</h1>
            <p className="auth-glass-subtitle">منصة التعليم الذكي</p>
            <p className="auth-glass-desc">
              أهلاً بك في بوابتك الأكاديمية.
              <br />
              يرجى تسجيل الدخول للوصول إلى مواردك التعليمية.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="auth-right">
          <div className="auth-form-container">
            <h2 className="auth-form-title">تسجيل الدخول</h2>
            
            <form onSubmit={onLogin} noValidate className="auth-form">
              <div className="auth-field">
                <label>البريد الإلكتروني</label>
                <div className="auth-input-wrap">
                  <input
                    type="email"
                    className="auth-input has-icon-right"
                    placeholder="example@madarek.edu.ly"
                    {...loginForm.register('email')}
                  />
                  <span className="auth-input-icon"><Icon icon={Mail} size={16} /></span>
                </div>
              </div>

              <div className="auth-field">
                <label>كلمة المرور</label>
                <div className="auth-input-wrap">
                  <input
                    type="password"
                    className="auth-input has-icon-right"
                    placeholder="••••••••"
                    {...loginForm.register('password')}
                  />
                  <span className="auth-input-icon"><Icon icon={Lock} size={16} /></span>
                </div>
              </div>

              <div className="auth-forgot-row">
                <button type="button" className="auth-forgot" onClick={() => setForgotNotice(true)}>
                  نسيت كلمة المرور؟
                </button>
              </div>
              {forgotNotice && <div className="auth-forgot-notice">يرجى التواصل مع الإدارة.</div>}

              <button type="submit" className="auth-btn primary" disabled={login.isPending}>
                {login.isPending ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
              </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

              <div className="auth-register-prompt">
                ليس لديك حساب؟ <Link to="/register">إنشاء حساب جديد</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
