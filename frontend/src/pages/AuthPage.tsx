import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  BarChart3,
  FlaskConical,
  Trophy,
  Briefcase,
  Globe,
  Mail,
  Lock,
  User,
  GraduationCap,
  School,
  Building2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { useLogin, useRegister } from '../hooks/useAuth';
import { useFaculties } from '../hooks/useResources';
import type { AppRole } from '../stores/auth.store';

type Tab = 'login' | 'register';

const loginSchema = z.object({
  email: z.string().email('بريد غير صالح'),
  password: z.string().min(1, 'مطلوب'),
});

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'مطلوب'),
    lastName: z.string().min(1, 'مطلوب'),
    email: z.string().email('بريد غير صالح'),
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
};
const homeFor = (r: AppRole): string => ROLE_HOME[r];

export default function AuthPage() {
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
          <div className="auth-brand-logo">
            <div className="auth-brand-mark">M</div>
            <div>
              <div className="auth-brand-title">مدارك AI</div>
              <div className="auth-brand-subtitle">جامعة الزاوية</div>
            </div>
          </div>

          <h1 className="auth-brand-hero">منصة التعليم الذكي للجامعات الليبية</h1>
          <p className="auth-brand-hero-sub">
            أدوات أكاديمية متكاملة مدعومة بالذكاء الاصطناعي — من إدارة المقررات إلى المعامل الافتراضية وفرص العمل.
          </p>

          <ul className="auth-brand-features">
            <li><span className="auth-feat-icon"><Icon icon={Bot} size={16} /></span> مساعد ذكاء اصطناعي أكاديمي</li>
            <li><span className="auth-feat-icon"><Icon icon={BarChart3} size={16} /></span> تحليل الأداء في الوقت الفعلي</li>
            <li><span className="auth-feat-icon"><Icon icon={FlaskConical} size={16} /></span> معامل افتراضية تفاعلية</li>
            <li><span className="auth-feat-icon"><Icon icon={Trophy} size={16} /></span> نظام تحفيز ومكافآت</li>
            <li><span className="auth-feat-icon"><Icon icon={Briefcase} size={16} /></span> ربط بسوق العمل الليبي</li>
            <li><span className="auth-feat-icon"><Icon icon={Globe} size={16} /></span> تعليم هجين متكامل</li>
          </ul>
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
              <div className="auth-form-sub">سجّل دخولك للوصول إلى منصة مدارك الأكاديمية</div>

              {login.isError && (
                <div className="auth-error">
                  <Icon icon={AlertCircle} size={14} />
                  <span>البريد أو كلمة المرور غير صحيحة. جرّب: student@zu.edu.ly / 1234</span>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="login-email">البريد الإلكتروني الجامعي</label>
                <div className="auth-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    className="auth-input has-icon"
                    placeholder="example@zu.edu.ly"
                    {...loginForm.register('email')}
                  />
                  <span className="auth-input-icon"><Icon icon={Mail} size={15} /></span>
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
                    {...loginForm.register('password')}
                  />
                  <span className="auth-input-icon"><Icon icon={Lock} size={15} /></span>
                </div>
              </div>

              <button type="button" className="auth-forgot">نسيت كلمة المرور؟</button>

              <button type="submit" className="auth-btn" disabled={login.isPending}>
                <Icon icon={Sparkles} size={16} />
                {login.isPending ? 'جارٍ الدخول…' : 'دخول إلى المنصة'}
              </button>

              <div className="auth-divider">أو جرّب الحسابات التجريبية</div>

              <div className="auth-demo">
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('STUDENT')}>
                  <Icon icon={GraduationCap} size={15} /> دخول كطالب
                </button>
                <button type="button" className="auth-demo-btn" onClick={() => onDemoLogin('TEACHER')}>
                  <Icon icon={School} size={15} /> دخول كأستاذ
                </button>
              </div>

              <div className="auth-terms">
                بتسجيل دخولك توافق على <span>شروط الاستخدام</span> و<span>سياسة الخصوصية</span>
              </div>
            </form>
          ) : (
            <form onSubmit={onRegister} className="flex-col" noValidate>
              <div className="auth-form-title">إنشاء حساب جديد</div>
              <div className="auth-form-sub">انضم إلى آلاف الطلاب والأساتذة على منصة مدارك</div>

              {register.isError && (
                <div className="auth-error">
                  <Icon icon={AlertCircle} size={14} />
                  <span>تعذّر إنشاء الحساب. تحقّق من البيانات وحاول مجدداً.</span>
                </div>
              )}

              <div className="auth-field">
                <label>نوع الحساب</label>
                <div className="auth-role-grid">
                  {(['STUDENT', 'TEACHER', 'ADMIN'] as AppRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`auth-role-btn${role === r ? ' on' : ''}`}
                      onClick={() => {
                        setRole(r);
                        registerForm.setValue('role', r);
                      }}
                    >
                      <Icon
                        icon={r === 'STUDENT' ? GraduationCap : r === 'TEACHER' ? School : Building2}
                        size={20}
                        className="auth-role-icon"
                      />
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
                    <span className="auth-input-icon"><Icon icon={User} size={15} /></span>
                  </div>
                </div>
                <div className="auth-field">
                  <label>اسم العائلة</label>
                  <input className="auth-input" placeholder="الزروق" {...registerForm.register('lastName')} />
                </div>
              </div>

              <div className="auth-field">
                <label>البريد الإلكتروني الجامعي</label>
                <div className="auth-input-wrap">
                  <input className="auth-input has-icon" type="email" placeholder="example@zu.edu.ly" {...registerForm.register('email')} />
                  <span className="auth-input-icon"><Icon icon={Mail} size={15} /></span>
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
                    <label>الكلية / القسم</label>
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
                    <input className="auth-input" placeholder="علوم الحاسوب والذكاء الاصطناعي" {...registerForm.register('specialty')} />
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
                    <span className="auth-input-icon"><Icon icon={Lock} size={15} /></span>
                  </div>
                </div>
                <div className="auth-field">
                  <label>تأكيد كلمة المرور</label>
                  <input className="auth-input" type="password" placeholder="أعد إدخال كلمة المرور" {...registerForm.register('confirm')} />
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={register.isPending}>
                <Icon icon={Sparkles} size={16} />
                {register.isPending ? 'جارٍ إنشاء الحساب…' : 'إنشاء الحساب'}
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
