import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Bot, BarChart3, FlaskConical, Briefcase,
  Mail, Lock, User,
  GraduationCap, School, Building2,
  AlertCircle, ArrowLeft,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { BrandMark } from '../components/BrandMark';
import { useLogin, useRegister } from '../hooks/useAuth';
import { useFaculties } from '../hooks/useResources';
import { useThemeSync } from '../components/layout/ThemeToggle';
import type { AppRole } from '../stores/auth.store';

type Tab = 'login' | 'register';

const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'مطلوب'),
});

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'مطلوب'),
    lastName: z.string().min(1, 'مطلوب'),
    email: z.string().email('بريد إلكتروني غير صالح'),
    password: z.string().min(8, '8 أحرف على الأقل'),
    confirm: z.string(),
    role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
    facultyId: z.string().optional(),
    departmentId: z.string().optional(),
    universityId: z.string().optional(),
    year: z.coerce.number().int().min(1).max(8).optional(),
    specialty: z.string().optional(),
    rank: z.enum(['LECTURER', 'ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR']).optional(),
  })
  .refine((d) => d.password === d.confirm, { message: 'كلمتا المرور غير متطابقتين', path: ['confirm'] });

type LoginInputs = z.infer<typeof loginSchema>;
type RegisterInputs = z.infer<typeof registerSchema>;

const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
  QUALITY: '/quality/dashboard',
};
const homeFor = (r: AppRole): string => ROLE_HOME[r];

export default function AuthPage() {
  useThemeSync();
  const [tab, setTab] = useState<Tab>('login');
  const [role, setRole] = useState<AppRole>('STUDENT');
  const navigate = useNavigate();
  const login = useLogin();
  const register = useRegister();
  const { data: faculties } = useFaculties();

  const loginForm = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'student@zu.edu.ly', password: '1234' },
  });

  const registerForm = useForm<RegisterInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STUDENT' },
  });
  const watchedFacultyId = registerForm.watch('facultyId');
  const departments = faculties?.find((f) => f.id === watchedFacultyId)?.departments ?? [];

  const onLogin = loginForm.handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync(values);
      navigate(homeFor(result.user.role), { replace: true });
    } catch { /* error rendered below */ }
  });

  const onRegister = registerForm.handleSubmit(async (values) => {
    const { confirm: _c, ...rest } = values;
    void _c;
    try {
      const result = await register.mutateAsync(rest);
      navigate(homeFor(result.user.role), { replace: true });
    } catch { /* error rendered below */ }
  });

  const onDemoLogin = async (r: AppRole) => {
    const emails: Record<AppRole, string> = {
      STUDENT: 'student@zu.edu.ly',
      TEACHER: 'teacher@zu.edu.ly',
      ADMIN: 'admin@zu.edu.ly',
      QUALITY: 'quality@zu.edu.ly',
    };
    loginForm.setValue('email', emails[r]);
    loginForm.setValue('password', '1234');
    try {
      const result = await login.mutateAsync({ email: emails[r], password: '1234' });
      navigate(homeFor(result.user.role), { replace: true });
    } catch { /* */ }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* ─── Brand pane ─── */}
        <div className="auth-brand">
          <div>
            <div className="auth-brand-header">
              <BrandMark size={44} />
              <div>
                <div className="auth-brand-name">
                  مدارك <span className="ai-tag">AI</span>
                </div>
                <div className="auth-brand-uni">جامعة الزاوية · تأسست 1988</div>
              </div>
            </div>

            <h1 className="auth-brand-hero">
              منصة موحدة لإدارة الحياة الأكاديمية الرقمية.
            </h1>
            <p className="auth-brand-tag">
              من إدارة المقررات والحضور إلى المعامل الافتراضية وفرص التوظيف،
              مدعومة بأدوات تعليمية ذكية.
            </p>

            <ul className="auth-features">
              <li><span className="auth-feat-icon"><Icon icon={Bot} size={14} /></span> مساعد دراسي مدعوم بالذكاء الاصطناعي</li>
              <li><span className="auth-feat-icon"><Icon icon={BarChart3} size={14} /></span> تحليل أداء وتغذية راجعة مستمرة</li>
              <li><span className="auth-feat-icon"><Icon icon={FlaskConical} size={14} /></span> معامل افتراضية تفاعلية</li>
              <li><span className="auth-feat-icon"><Icon icon={Briefcase} size={14} /></span> ربط مباشر بسوق العمل الليبي</li>
            </ul>
          </div>

          <div className="auth-brand-footer">
            © {new Date().getFullYear()} جامعة الزاوية. جميع الحقوق محفوظة.
          </div>
        </div>

        {/* ─── Form pane ─── */}
        <div className="auth-form-pane">
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" className={`auth-tab${tab === 'login' ? ' on' : ''}`} onClick={() => setTab('login')}>
              تسجيل الدخول
            </button>
            <button type="button" role="tab" className={`auth-tab${tab === 'register' ? ' on' : ''}`} onClick={() => setTab('register')}>
              إنشاء حساب
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={onLogin} className="flex-col" noValidate>
              <div className="auth-form-title">أهلاً بعودتك</div>
              <div className="auth-form-sub">أدخل بياناتك للوصول إلى حسابك الأكاديمي.</div>

              {login.isError && (
                <div className="auth-error">
                  <Icon icon={AlertCircle} size={14} />
                  <span>البريد أو كلمة المرور غير صحيحة.</span>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="login-email">البريد الإلكتروني</label>
                <div className="auth-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    className="auth-input has-icon"
                    placeholder="example@zu.edu.ly"
                    autoComplete="email"
                    {...loginForm.register('email')}
                  />
                  <span className="auth-input-icon"><Icon icon={Mail} size={14} /></span>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="login-pass">كلمة المرور</label>
                <div className="auth-input-wrap">
                  <input
                    id="login-pass"
                    type="password"
                    className="auth-input has-icon"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...loginForm.register('password')}
                  />
                  <span className="auth-input-icon"><Icon icon={Lock} size={14} /></span>
                </div>
              </div>

              <button type="button" className="auth-forgot">نسيت كلمة المرور؟</button>

              <button type="submit" className="auth-btn" disabled={login.isPending}>
                {login.isPending ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
                {!login.isPending && <Icon icon={ArrowLeft} size={14} />}
              </button>

              <div className="auth-divider">حسابات تجريبية</div>

              <div className="auth-demo">
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('STUDENT')}>
                  <Icon icon={GraduationCap} size={14} /> طالب
                </button>
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('TEACHER')}>
                  <Icon icon={School} size={14} /> أستاذ
                </button>
              </div>

              <div className="auth-terms">
                بتسجيل دخولك توافق على <span>شروط الاستخدام</span> و<span>سياسة الخصوصية</span>
              </div>
            </form>
          ) : (
            <form onSubmit={onRegister} className="flex-col" noValidate>
              <div className="auth-form-title">إنشاء حساب جديد</div>
              <div className="auth-form-sub">انضم إلى منصة مدارك الأكاديمية.</div>

              {register.isError && (
                <div className="auth-error">
                  <Icon icon={AlertCircle} size={14} />
                  <span>تعذّر إنشاء الحساب. تحقّق من البيانات وحاول مجدداً.</span>
                </div>
              )}

              <div className="auth-field">
                <label>نوع الحساب</label>
                <div className="auth-role-grid">
                  {(['STUDENT', 'TEACHER', 'ADMIN'] as Array<Exclude<AppRole, 'QUALITY'>>).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`auth-role-btn${role === r ? ' on' : ''}`}
                      onClick={() => {
                        setRole(r);
                        registerForm.setValue('role', r);
                      }}
                    >
                      <Icon icon={r === 'STUDENT' ? GraduationCap : r === 'TEACHER' ? School : Building2} size={18} />
                      {r === 'STUDENT' ? 'طالب' : r === 'TEACHER' ? 'أستاذ' : 'إداري'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="auth-row">
                <div className="auth-field">
                  <label>الاسم الأول</label>
                  <div className="auth-input-wrap">
                    <input className="auth-input has-icon" placeholder="أحمد" {...registerForm.register('firstName')} />
                    <span className="auth-input-icon"><Icon icon={User} size={14} /></span>
                  </div>
                </div>
                <div className="auth-field">
                  <label>اسم العائلة</label>
                  <input className="auth-input" placeholder="الزروق" {...registerForm.register('lastName')} />
                </div>
              </div>

              <div className="auth-field">
                <label>البريد الإلكتروني</label>
                <div className="auth-input-wrap">
                  <input className="auth-input has-icon" type="email" placeholder="example@zu.edu.ly" {...registerForm.register('email')} />
                  <span className="auth-input-icon"><Icon icon={Mail} size={14} /></span>
                </div>
              </div>

              {role === 'STUDENT' && (
                <>
                  <div className="auth-row">
                    <div className="auth-field">
                      <label>الكلية</label>
                      <select className="auth-input" {...registerForm.register('facultyId')}>
                        <option value="">اختر الكلية</option>
                        {faculties?.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
                      </select>
                    </div>
                    <div className="auth-field">
                      <label>القسم</label>
                      <select className="auth-input" {...registerForm.register('departmentId')}>
                        <option value="">اختر القسم</option>
                        {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="auth-row">
                    <div className="auth-field">
                      <label>السنة الدراسية</label>
                      <select className="auth-input" {...registerForm.register('year')}>
                        {[1, 2, 3, 4, 5].map((y) => (<option key={y} value={y}>السنة {y}</option>))}
                      </select>
                    </div>
                    <div className="auth-field">
                      <label>الرقم الجامعي</label>
                      <input className="auth-input" placeholder="UZ-2024-XXXXX" {...registerForm.register('universityId')} />
                    </div>
                  </div>
                </>
              )}

              {role === 'TEACHER' && (
                <>
                  <div className="auth-field">
                    <label>الكلية والقسم</label>
                    <select className="auth-input" {...registerForm.register('departmentId')}>
                      <option value="">اختر القسم</option>
                      {(faculties ?? []).flatMap((f) =>
                        f.departments.map((d) => (
                          <option key={d.id} value={d.id}>{f.name} — {d.name}</option>
                        )),
                      )}
                    </select>
                  </div>
                  <div className="auth-field">
                    <label>التخصص الأكاديمي</label>
                    <input className="auth-input" placeholder="علوم الحاسوب" {...registerForm.register('specialty')} />
                  </div>
                  <div className="auth-field">
                    <label>الرتبة الأكاديمية</label>
                    <select className="auth-input" {...registerForm.register('rank')}>
                      <option value="LECTURER">محاضر</option>
                      <option value="ASSISTANT_PROFESSOR">أستاذ مساعد</option>
                      <option value="ASSOCIATE_PROFESSOR">أستاذ مشارك</option>
                      <option value="PROFESSOR">أستاذ</option>
                    </select>
                  </div>
                </>
              )}

              <div className="auth-row">
                <div className="auth-field">
                  <label>كلمة المرور</label>
                  <div className="auth-input-wrap">
                    <input className="auth-input has-icon" type="password" placeholder="8 أحرف على الأقل" {...registerForm.register('password')} />
                    <span className="auth-input-icon"><Icon icon={Lock} size={14} /></span>
                  </div>
                </div>
                <div className="auth-field">
                  <label>تأكيد كلمة المرور</label>
                  <input className="auth-input" type="password" placeholder="أعد الإدخال" {...registerForm.register('confirm')} />
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={register.isPending}>
                {register.isPending ? 'جارٍ إنشاء الحساب…' : 'إنشاء الحساب'}
                {!register.isPending && <Icon icon={ArrowLeft} size={14} />}
              </button>

              <div className="auth-terms">
                بإنشاء حسابك توافق على <span>شروط الاستخدام</span> و<span>سياسة الخصوصية</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
