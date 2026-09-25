import { Children, cloneElement, isValidElement, useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, GraduationCap, School,
  AlertCircle, ArrowLeft, ArrowRight, User, Hash, Building2, BookOpen, Lock as LockIcon,
  Eye, EyeOff, Check,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { useRegister } from '../hooks/useAuth';
import { useFaculties } from '../hooks/useResources';
import { Skeleton } from '../components/motion';
import { useThemeSync } from '../components/layout/ThemeToggle';
import type { AppRole } from '../stores/auth.store';

/**
 * Self-serve registration is restricted to academic roles.
 * Administrative roles (Dean / Dept Head / Admin / Quality / Owner) are
 * appointed by the university — they don't sign up through this form.
 */
type AcademicRole = Extract<AppRole, 'STUDENT' | 'TEACHER'>;

const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN:   '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER:   '/owner/dashboard',
};

const studentSchema = z.object({
  // D17-4 parity with the backend register schema (auth.dto.ts):
  // user-input strings trim BEFORE length validation — whitespace-only
  // values fail min() instead of minting an account; emails additionally
  // lowercase BEFORE validation (case-insensitive identity, same as the
  // backend's .trim().toLowerCase()). Passwords never trim (a space can
  // be a legitimate part of the secret); the faculty/department ids are
  // fixed-list cuids, not free input.
  firstName: z.string().trim().min(1, 'مطلوب').max(60),
  lastName: z.string().trim().min(1, 'مطلوب').max(60),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح').max(120),
  password: z.string().min(8, '8 أحرف على الأقل').max(72),
  universityId: z.string().trim().min(3, 'مطلوب').max(40),
  facultyId: z.string().min(1, 'اختر الكلّيّة'),
  departmentId: z.string().min(1, 'اختر القسم'),
  year: z.coerce.number().int().min(1).max(7),
});

const teacherSchema = z.object({
  firstName: z.string().trim().min(1, 'مطلوب').max(60),
  lastName: z.string().trim().min(1, 'مطلوب').max(60),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح').max(120),
  password: z.string().min(8, '8 أحرف على الأقل').max(72),
  facultyId: z.string().min(1, 'اختر الكلّيّة'),
  departmentId: z.string().min(1, 'اختر القسم'),
  specialty: z.string().trim().min(2, 'مطلوب').max(120),
});

type StudentInputs = z.infer<typeof studentSchema>;
type TeacherInputs = z.infer<typeof teacherSchema>;

/** Direction of the last step change — keys the slide animation so
 *  step 2 always enters from the reading-ahead edge and step 1 comes
 *  back from where it came (RTL-aware via --motion-direction). */
type StepDir = 'forward' | 'back';

export default function RegisterPage() {
  useThemeSync();
  const navigate = useNavigate();
  const register = useRegister();
  const facultiesQ = useFaculties();
  const [role, setRole] = useState<AcademicRole | null>(null);
  const [stepDir, setStepDir] = useState<StepDir>('forward');
  const facultiesState: FacultiesState = {
    status: facultiesQ.isLoading ? 'loading' : facultiesQ.isError ? 'error' : 'ready',
    items: facultiesQ.data ?? [],
    retry: () => void facultiesQ.refetch(),
  };

  const chooseRole = (r: AcademicRole) => {
    setStepDir('forward');
    setRole(r);
  };
  const backToRoles = () => {
    setStepDir('back');
    setRole(null);
  };

  return (
    <div className="auth-shell">
      <div className="auth-top">
        {role ? (
          <button type="button" className="auth-back-home" onClick={backToRoles}>
            <Icon icon={ArrowRight} size={14} />
            تغيير نوع الحساب
          </button>
        ) : (
          <Link to="/auth" className="auth-back-home">
            <Icon icon={ArrowRight} size={14} />
            تسجيل الدخول
          </Link>
        )}
        {role ? (
          <Link to="/auth" className="auth-back-home">
            تسجيل الدخول
            <Icon icon={ArrowLeft} size={14} />
          </Link>
        ) : (
          <span className="auth-context">إنشاء حساب جديد</span>
        )}
      </div>

      <main className="auth-center">
        {/* One card for BOTH steps (same width, same chrome) — stepping
            never reflows the layout; only the keyed panel slides. */}
        <div className="auth-card auth-card--wide">
          <div className="auth-brand-mini">
            <span className="auth-brand-mini-mark">م</span>
            <span className="auth-brand-mini-text">مدارك</span>
          </div>

          <ol className="auth-steps" aria-label="مراحل إنشاء الحساب">
            <li
              className="auth-step"
              data-state={role ? 'done' : 'current'}
              aria-current={role ? undefined : 'step'}
            >
              <span className="auth-step-dot" aria-hidden>
                {role ? <Icon icon={Check} size={12} /> : '1'}
              </span>
              نوع الحساب
            </li>
            <li
              className="auth-step"
              data-state={role ? 'current' : 'todo'}
              aria-current={role ? 'step' : undefined}
            >
              <span className="auth-step-dot" aria-hidden>2</span>
              البيانات
            </li>
          </ol>

          <div className="auth-step-panel" key={role ?? 'role'} data-dir={stepDir}>
            {role ? (
              <>
                <div className="auth-form-header">
                  <h1 className="auth-form-title">
                    {role === 'STUDENT' ? 'تسجيل طالب جديد' : 'تسجيل عضو هيئة تدريس'}
                  </h1>
                  <p className="auth-form-sub">جميع الحقول مطلوبة لإتمام إنشاء الحساب.</p>
                </div>

                {role === 'STUDENT' ? (
                  <StudentForm
                    isPending={register.isPending}
                    isError={register.isError}
                    faculties={facultiesState}
                    onSubmit={async (values) => {
                      try {
                        const res = await register.mutateAsync({ role: 'STUDENT', ...values });
                        navigate(ROLE_HOME[res.user.role], { replace: true });
                      } catch { /* surfaced below */ }
                    }}
                  />
                ) : (
                  <TeacherForm
                    isPending={register.isPending}
                    isError={register.isError}
                    faculties={facultiesState}
                    onSubmit={async (values) => {
                      try {
                        const res = await register.mutateAsync({ role: 'TEACHER', ...values });
                        navigate(ROLE_HOME[res.user.role], { replace: true });
                      } catch { /* surfaced below */ }
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <div className="auth-form-header">
                  <h1 className="auth-form-title">من أنت؟</h1>
                  <p className="auth-form-sub">
                    اختر نوع الحساب لإنشاء وصولك إلى منصّة جامعة الزاوية.
                  </p>
                </div>

                <div className="role-card-grid">
                  <button type="button" className="role-card" onClick={() => chooseRole('STUDENT')}>
                    <span className="role-card-icon"><Icon icon={GraduationCap} size={22} /></span>
                    <span className="role-card-body">
                      <span className="role-card-title">طالب</span>
                      <span className="role-card-sub">مقيَّد في إحدى كليّات الجامعة</span>
                    </span>
                    <span className="role-card-arrow"><Icon icon={ArrowLeft} size={16} /></span>
                  </button>

                  <button type="button" className="role-card" onClick={() => chooseRole('TEACHER')}>
                    <span className="role-card-icon"><Icon icon={School} size={22} /></span>
                    <span className="role-card-body">
                      <span className="role-card-title">عضو هيئة تدريس</span>
                      <span className="role-card-sub">أستاذ في إحدى الأقسام الأكاديمية</span>
                    </span>
                    <span className="role-card-arrow"><Icon icon={ArrowLeft} size={16} /></span>
                  </button>
                </div>

                <div className="role-invitation-note" role="note">
                  <Icon icon={LockIcon} size={13} />
                  <span>
                    المناصب القياديّة (عميد، رئيس قسم) والإدارة وضمان الجودة تُمنح بالتعيين، وليست
                    متاحة للتسجيل الذاتيّ. تواصل مع إدارة جامعتك للحصول على الوصول.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <div className="auth-bottom">
        دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
      </div>
    </div>
  );
}

interface FormFaculty { id: string; name: string; departments: { id: string; name: string }[] }

/** Load state of the faculties lookup. The register form is unusable
 *  without it, so loading and error are first-class states (skeleton /
 *  retry), never a silently empty select (audit 0-b P0-4). */
interface FacultiesState {
  status: 'loading' | 'error' | 'ready';
  items: FormFaculty[];
  retry: () => void;
}

interface StudentFormProps {
  faculties: FacultiesState;
  isPending: boolean;
  isError: boolean;
  onSubmit: (values: StudentInputs) => Promise<void>;
}

function StudentForm({ faculties, isPending, isError, onSubmit }: StudentFormProps) {
  const form = useForm<StudentInputs>({
    resolver: zodResolver(studentSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', universityId: '', facultyId: '', departmentId: '', year: 1 },
  });
  const [showPassword, setShowPassword] = useState(false);
  const facultyId = form.watch('facultyId');
  const departments = useMemo(
    () => faculties.items.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="auth-form">
      <div className="auth-row-2">
        <Field label="الاسم الأول" error={form.formState.errors.firstName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="input auth-input" type="text" autoComplete="given-name" {...form.register('firstName')} />
        </Field>
        <Field label="اللقب" error={form.formState.errors.lastName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="input auth-input" type="text" autoComplete="family-name" {...form.register('lastName')} />
        </Field>
      </div>

      <Field label="البريد الإلكتروني" error={form.formState.errors.email?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={16} /></span>
        <input className="input auth-input" type="email" dir="ltr" autoComplete="email" {...form.register('email')} />
      </Field>

      <Field label="كلمة المرور (8 أحرف على الأقل)" error={form.formState.errors.password?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
        <input className="input auth-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...form.register('password')} />
        <button
          type="button"
          className="auth-input-toggle"
          onClick={() => setShowPassword((v) => !v)}
          aria-pressed={showPassword}
          aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          <Icon icon={showPassword ? EyeOff : Eye} size={16} />
        </button>
      </Field>

      <Field label="رقم القيد الجامعي" error={form.formState.errors.universityId?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Hash} size={16} /></span>
        {/* dir="ltr": university IDs are Latin/digit runs (2024-CS-1234)
            that bidi-scramble inside an RTL input. */}
        <input className="input auth-input" type="text" placeholder="مثلاً 2024-CS-1234" dir="ltr" {...form.register('universityId')} />
      </Field>

      <div className="auth-row-2">
        <Field label="الكلّيّة" error={form.formState.errors.facultyId?.message}>
          {faculties.status === 'loading' && <Skeleton className="auth-select-skeleton" />}
          {faculties.status === 'error' && (
            <div className="auth-error" role="alert">
              <Icon icon={AlertCircle} size={14} />
              <span>تعذّر تحميل الكلّيّات — تحقّق من اتصالك بالشبكة.</span>
              <button type="button" className="auth-retry-link" onClick={faculties.retry}>
                إعادة المحاولة
              </button>
            </div>
          )}
          {faculties.status === 'ready' && (
          <select className="auth-input" {...form.register('facultyId')}>
            <option value="">اختر…</option>
            {faculties.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          )}
        </Field>
        <Field label="القسم" error={form.formState.errors.departmentId?.message}>
          <select className="auth-input" disabled={!facultyId} {...form.register('departmentId')}>
            <option value="">اختر…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      </div>

      <Field label="السنة الدراسية" error={form.formState.errors.year?.message}>
        <select className="auth-input" {...form.register('year')}>
          {[1, 2, 3, 4, 5, 6, 7].map((y) => <option key={y} value={y}>السنة {y}</option>)}
        </select>
      </Field>

      {isError && (
        <div className="auth-error" role="alert">
          <Icon icon={AlertCircle} size={14} />
          <span>
            تعذَّر إنشاء الحساب. راجع البيانات المدخلة وتأكَّد من اتصالك بالشبكة ثم أعد
            المحاولة — وإن كان بريدك مسجَّلاً مسبقاً فجرِّب تسجيل الدخول.
          </span>
        </div>
      )}

      <button type="submit" className="auth-submit" disabled={isPending}>
        {isPending && <span className="auth-submit-spinner" aria-hidden />}
        {isPending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
      </button>
    </form>
  );
}

interface TeacherFormProps {
  faculties: FacultiesState;
  isPending: boolean;
  isError: boolean;
  onSubmit: (values: TeacherInputs) => Promise<void>;
}

function TeacherForm({ faculties, isPending, isError, onSubmit }: TeacherFormProps) {
  const form = useForm<TeacherInputs>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', facultyId: '', departmentId: '', specialty: '' },
  });
  const [showPassword, setShowPassword] = useState(false);
  const facultyId = form.watch('facultyId');
  const departments = useMemo(
    () => faculties.items.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="auth-form">
      <div className="auth-row-2">
        <Field label="الاسم الأول" error={form.formState.errors.firstName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="input auth-input" type="text" autoComplete="given-name" {...form.register('firstName')} />
        </Field>
        <Field label="اللقب" error={form.formState.errors.lastName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="input auth-input" type="text" autoComplete="family-name" {...form.register('lastName')} />
        </Field>
      </div>

      <Field label="البريد الجامعي" error={form.formState.errors.email?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={16} /></span>
        <input className="input auth-input" type="email" dir="ltr" autoComplete="email" placeholder="example@zu.edu.ly" {...form.register('email')} />
      </Field>

      <Field label="كلمة المرور (8 أحرف على الأقل)" error={form.formState.errors.password?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
        <input className="input auth-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...form.register('password')} />
        <button
          type="button"
          className="auth-input-toggle"
          onClick={() => setShowPassword((v) => !v)}
          aria-pressed={showPassword}
          aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          <Icon icon={showPassword ? EyeOff : Eye} size={16} />
        </button>
      </Field>

      <div className="auth-row-2">
        <Field label="الكلّيّة" error={form.formState.errors.facultyId?.message}>
          {faculties.status === 'loading' && <Skeleton className="auth-select-skeleton" />}
          {faculties.status === 'error' && (
            <div className="auth-error" role="alert">
              <Icon icon={AlertCircle} size={14} />
              <span>تعذّر تحميل الكلّيّات — تحقّق من اتصالك بالشبكة.</span>
              <button type="button" className="auth-retry-link" onClick={faculties.retry}>
                إعادة المحاولة
              </button>
            </div>
          )}
          {faculties.status === 'ready' && (
          <select className="auth-input" {...form.register('facultyId')}>
            <option value="">اختر…</option>
            {faculties.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          )}
        </Field>
        <Field label="القسم" error={form.formState.errors.departmentId?.message}>
          <select className="auth-input" disabled={!facultyId} {...form.register('departmentId')}>
            <option value="">اختر…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      </div>

      <Field label="التخصص العلمي" error={form.formState.errors.specialty?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={BookOpen} size={16} /></span>
        <input className="input auth-input" type="text" placeholder="مثلاً: الذكاء الاصطناعي" {...form.register('specialty')} />
      </Field>

      <div className="role-invitation-note" role="note">
        <Icon icon={Building2} size={13} />
        <span>
          المنصب القياديّ (عميد، رئيس قسم) يُحدَّد بقرار إداريّ بعد التحقّق من الملف الأكاديميّ.
        </span>
      </div>

      {isError && (
        <div className="auth-error" role="alert">
          <Icon icon={AlertCircle} size={14} />
          <span>
            تعذَّر إنشاء الحساب. راجع البيانات المدخلة وتأكَّد من اتصالك بالشبكة ثم أعد
            المحاولة — وإن كان بريدك مسجَّلاً مسبقاً فجرِّب تسجيل الدخول.
          </span>
        </div>
      )}

      <button type="submit" className="auth-submit" disabled={isPending}>
        {isPending && <span className="auth-submit-spinner" aria-hidden />}
        {isPending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

/** Labeled form field. The label is programmatically associated with the
 *  single input/select child (useId), and validation errors are wired via
 *  aria-describedby + aria-invalid so they are announced on focus, not only
 *  through the role="alert" live region (audit 0-b P0-3 / P1-6). */
function Field({ label, error, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const wired = Children.map(children, (child) => {
    if (!isValidElement(child) || (child.type !== 'input' && child.type !== 'select')) {
      return child;
    }
    return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : undefined,
    });
  });
  return (
    <div className="auth-field">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="auth-input-wrap">{wired}</div>
      {error && <span id={errorId} className="auth-field-error" role="alert">{error}</span>}
    </div>
  );
}
