import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useLogin, useRegister } from '../hooks/useAuth';
import type { AppRole } from '../stores/auth.store';
import { useFaculties, type Faculty } from '../hooks/useResources';

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
const homeFor = (role: AppRole): string => ROLE_HOME[role];

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
    } catch {
      /* error message rendered below */
    }
  });

  const onRegister = registerForm.handleSubmit(async (values) => {
    const { confirm: _confirm, ...rest } = values;
    void _confirm;
    try {
      const result = await register.mutateAsync(rest);
      navigate(homeFor(result.user.role), { replace: true });
    } catch {
      /* error message rendered below */
    }
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
    } catch {
      /* */
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-container">
        {/* Left branding panel */}
        <div className="auth-left">
          <div className="auth-logo-big">
            مدارك<br /><span>AI</span>
          </div>
          <div className="auth-logo-sub">منصة التعليم الذكي<br />جامعة الزاوية</div>
          <ul className="auth-features">
            <li><div className="auth-feat-icon">🤖</div> مساعد ذكاء اصطناعي أكاديمي</li>
            <li><div className="auth-feat-icon">📊</div> تحليل الأداء في الوقت الفعلي</li>
            <li><div className="auth-feat-icon">🔬</div> معامل افتراضية تفاعلية</li>
            <li><div className="auth-feat-icon">🏆</div> نقاط وإنجازات تحفيزية</li>
            <li><div className="auth-feat-icon">💼</div> ربط بسوق العمل الليبي</li>
            <li><div className="auth-feat-icon">🌐</div> تعليم هجين متكامل</li>
          </ul>
        </div>

        {/* Right form panel */}
        <div className="auth-right">
          <div className="auth-tabs">
            <button type="button" className={`auth-tab ${tab === 'login' ? 'on' : ''}`} onClick={() => setTab('login')}>
              تسجيل الدخول
            </button>
            <button type="button" className={`auth-tab ${tab === 'register' ? 'on' : ''}`} onClick={() => setTab('register')}>
              إنشاء حساب
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="auth-form-title">أهلاً بعودتك 👋</div>
              <div className="auth-form-sub">سجّل دخولك للوصول إلى منصة مدارك الأكاديمية</div>

              {login.isError && (
                <div className="auth-error">❌ البريد أو كلمة المرور غير صحيحة. جرّب: student@zu.edu.ly / 1234</div>
              )}

              <div className="auth-field">
                <label htmlFor="login-email">البريد الإلكتروني الجامعي</label>
                <div className="auth-input-icon">
                  <span className="iico">✉️</span>
                  <input id="login-email" className="auth-input" type="email" placeholder="example@zu.edu.ly" {...loginForm.register('email')} />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="login-pass">كلمة المرور</label>
                <div className="auth-input-icon">
                  <span className="iico">🔒</span>
                  <input id="login-pass" className="auth-input" type="password" placeholder="••••••••" {...loginForm.register('password')} />
                </div>
              </div>
              <button type="button" className="auth-forgot">نسيت كلمة المرور؟</button>

              <button type="submit" className="auth-btn" disabled={login.isPending}>
                {login.isPending ? 'جارٍ الدخول…' : '🚀 دخول إلى المنصة'}
              </button>

              <div className="auth-divider">أو</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onDemoLogin('STUDENT')}
                  style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'rgba(79,142,247,.08)', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}
                >
                  👨‍🎓 دخول كطالب
                </button>
                <button
                  type="button"
                  onClick={() => onDemoLogin('TEACHER')}
                  style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'rgba(61,214,140,.08)', color: 'var(--green)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}
                >
                  👨‍🏫 دخول كأستاذ
                </button>
              </div>

              <div className="auth-terms">
                بتسجيل دخولك توافق على <span>شروط الاستخدام</span> و<span>سياسة الخصوصية</span>
              </div>
            </form>
          ) : (
            <form onSubmit={onRegister} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="auth-form-title">إنشاء حساب جديد ✨</div>
              <div className="auth-form-sub">انضم إلى آلاف الطلاب والأساتذة على منصة مدارك</div>

              {register.isError && (
                <div className="auth-error">❌ تعذّر إنشاء الحساب. تحقّق من البيانات وحاول مجدداً.</div>
              )}

              <div className="auth-field">
                <label>نوع الحساب</label>
                <div className="auth-role-grid">
                  {(['STUDENT', 'TEACHER', 'ADMIN'] as AppRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`auth-role-btn ${role === r ? 'on' : ''}`}
                      onClick={() => {
                        setRole(r);
                        registerForm.setValue('role', r);
                      }}
                    >
                      <span className="role-icon">{r === 'STUDENT' ? '👨‍🎓' : r === 'TEACHER' ? '👨‍🏫' : '🏛️'}</span>
                      {r === 'STUDENT' ? 'طالب' : r === 'TEACHER' ? 'أستاذ' : 'إداري'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="auth-row">
                <div className="auth-field">
                  <label>الاسم الأول</label>
                  <input className="auth-input" placeholder="أحمد" {...registerForm.register('firstName')} />
                </div>
                <div className="auth-field">
                  <label>اسم العائلة</label>
                  <input className="auth-input" placeholder="الزروق" {...registerForm.register('lastName')} />
                </div>
              </div>

              <div className="auth-field">
                <label>البريد الإلكتروني الجامعي</label>
                <div className="auth-input-icon">
                  <span className="iico">✉️</span>
                  <input className="auth-input" type="email" placeholder="example@zu.edu.ly" {...registerForm.register('email')} />
                </div>
              </div>

              {role === 'STUDENT' && (
                <>
                  <div className="auth-row">
                    <div className="auth-field">
                      <label>الكلية</label>
                      <select className="auth-input" {...registerForm.register('facultyId')}>
                        <option value="">اختر الكلية</option>
                        {faculties?.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="auth-field">
                      <label>القسم</label>
                      <select className="auth-input" {...registerForm.register('departmentId')}>
                        <option value="">اختر القسم</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="auth-row">
                    <div className="auth-field">
                      <label>السنة الدراسية</label>
                      <select className="auth-input" {...registerForm.register('year')}>
                        {[1, 2, 3, 4, 5].map((y) => (
                          <option key={y} value={y}>السنة {y}</option>
                        ))}
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
                  <input className="auth-input" type="password" placeholder="8 أحرف على الأقل" {...registerForm.register('password')} />
                </div>
                <div className="auth-field">
                  <label>تأكيد كلمة المرور</label>
                  <input className="auth-input" type="password" placeholder="أعد إدخال كلمة المرور" {...registerForm.register('confirm')} />
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={register.isPending}>
                {register.isPending ? 'جارٍ إنشاء الحساب…' : 'إنشاء الحساب ✨'}
              </button>

              <div className="auth-terms">
                بإنشاء حسابك توافق على <span>شروط الاستخدام</span> و<span>سياسة الخصوصية</span> لمنصة مدارك
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
