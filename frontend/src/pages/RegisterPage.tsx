import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Home, GraduationCap, School,
  AlertCircle, ArrowLeft, ArrowRight, User, Hash, Building2, BookOpen, Lock as LockIcon,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { useRegister } from '../hooks/useAuth';
import { useFaculties } from '../hooks/useResources';
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
  firstName: z.string().min(1, 'مطلوب').max(60),
  lastName: z.string().min(1, 'مطلوب').max(60),
  email: z.string().email('بريد إلكتروني غير صالح').max(120),
  password: z.string().min(8, '٨ أحرف على الأقل').max(72),
  universityId: z.string().min(3, 'مطلوب').max(40),
  facultyId: z.string().min(1, 'اختر الكلية'),
  departmentId: z.string().min(1, 'اختر القسم'),
  year: z.coerce.number().int().min(1).max(8),
});

const teacherSchema = z.object({
  firstName: z.string().min(1, 'مطلوب').max(60),
  lastName: z.string().min(1, 'مطلوب').max(60),
  email: z.string().email('بريد إلكتروني غير صالح').max(120),
  password: z.string().min(8, '٨ أحرف على الأقل').max(72),
  facultyId: z.string().min(1, 'اختر الكلية'),
  departmentId: z.string().min(1, 'اختر القسم'),
  specialty: z.string().min(2, 'مطلوب').max(120),
});

type StudentInputs = z.infer<typeof studentSchema>;
type TeacherInputs = z.infer<typeof teacherSchema>;

export default function RegisterPage() {
  useThemeSync();
  const navigate = useNavigate();
  const register = useRegister();
  const facultiesQ = useFaculties();
  const [role, setRole] = useState<AcademicRole | null>(null);

  if (!role) {
    return (
      <div className="auth-shell">
        <div className="auth-top">
          <Link to="/auth" className="auth-back-home">
            <Icon icon={Home} size={14} />
            تسجيل الدخول
          </Link>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>إنشاء حساب جديد</span>
        </div>

        <div className="auth-center">
          <div className="auth-card" style={{ maxWidth: 520 }}>
            <div className="auth-brand-mini">
              <span className="auth-brand-mini-mark">م</span>
              <span className="auth-brand-mini-text">مدارك</span>
            </div>

            <div className="auth-form-header">
              <h2 className="auth-form-title">من أنت؟</h2>
              <p className="auth-form-sub">
                اختر نوع الحساب لإنشاء وصولك إلى منصّة جامعة الزاوية.
              </p>
            </div>

            <div className="role-card-grid" style={{ display: 'grid', gap: 12 }}>
              <button type="button" className="role-card" onClick={() => setRole('STUDENT')}>
                <span className="role-card-icon"><Icon icon={GraduationCap} size={22} /></span>
                <span className="role-card-body">
                  <span className="role-card-title">طالب</span>
                  <span className="role-card-sub">مقيَّد في إحدى كليّات الجامعة</span>
                </span>
                <span className="role-card-arrow"><Icon icon={ArrowLeft} size={16} /></span>
              </button>

              <button type="button" className="role-card" onClick={() => setRole('TEACHER')}>
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
          </div>
        </div>

        <div className="auth-bottom">
          دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-top">
        <button type="button" className="auth-back-home" onClick={() => setRole(null)}>
          <Icon icon={ArrowRight} size={14} />
          تغيير نوع الحساب
        </button>
        <Link to="/auth" className="auth-back-home">
          تسجيل الدخول
          <Icon icon={ArrowLeft} size={14} />
        </Link>
      </div>

      <div className="auth-center">
        <div className="auth-card" style={{ maxWidth: 560 }}>
          <div className="auth-brand-mini">
            <span className="auth-brand-mini-mark">م</span>
            <span className="auth-brand-mini-text">مدارك</span>
          </div>

          <div className="auth-form-header">
            <h2 className="auth-form-title">
              {role === 'STUDENT' ? 'تسجيل طالب جديد' : 'تسجيل عضو هيئة تدريس'}
            </h2>
            <p className="auth-form-sub">
              املأ بياناتك لإنشاء الحساب. كل الحقول المطلوبة مُعلَّمة.
            </p>
          </div>

          {role === 'STUDENT' ? (
            <StudentForm
              isPending={register.isPending}
              isError={register.isError}
              faculties={facultiesQ.data ?? []}
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
              faculties={facultiesQ.data ?? []}
              onSubmit={async (values) => {
                try {
                  const res = await register.mutateAsync({ role: 'TEACHER', ...values });
                  navigate(ROLE_HOME[res.user.role], { replace: true });
                } catch { /* surfaced below */ }
              }}
            />
          )}
        </div>
      </div>

      <div className="auth-bottom">
        دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية
      </div>
    </div>
  );
}

interface FormFaculty { id: string; name: string; departments: { id: string; name: string }[] }

interface StudentFormProps {
  faculties: FormFaculty[];
  isPending: boolean;
  isError: boolean;
  onSubmit: (values: StudentInputs) => Promise<void>;
}

function StudentForm({ faculties, isPending, isError, onSubmit }: StudentFormProps) {
  const form = useForm<StudentInputs>({
    resolver: zodResolver(studentSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', universityId: '', facultyId: '', departmentId: '', year: 1 },
  });
  const facultyId = form.watch('facultyId');
  const departments = useMemo(
    () => faculties.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="auth-form">
      <div className="auth-row-2">
        <Field label="الاسم الأول" error={form.formState.errors.firstName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="auth-input has-icon-start" autoComplete="given-name" {...form.register('firstName')} />
        </Field>
        <Field label="اللقب" error={form.formState.errors.lastName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="auth-input has-icon-start" autoComplete="family-name" {...form.register('lastName')} />
        </Field>
      </div>

      <Field label="البريد الإلكتروني" error={form.formState.errors.email?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={16} /></span>
        <input className="auth-input has-icon-start" type="email" autoComplete="email" {...form.register('email')} />
      </Field>

      <Field label="كلمة المرور (٨ أحرف على الأقل)" error={form.formState.errors.password?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
        <input className="auth-input has-icon-start" type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>

      <Field label="رقم القيد الجامعي" error={form.formState.errors.universityId?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Hash} size={16} /></span>
        <input className="auth-input has-icon-start" placeholder="مثلاً 2024-CS-1234" {...form.register('universityId')} />
      </Field>

      <div className="auth-row-2">
        <Field label="الكلية" error={form.formState.errors.facultyId?.message}>
          <select className="auth-input" {...form.register('facultyId')}>
            <option value="">اختر…</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
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
          {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>السنة {y}</option>)}
        </select>
      </Field>

      {isError && (
        <div className="auth-error" role="alert">
          <Icon icon={AlertCircle} size={14} />
          <span>تعذَّر إنشاء الحساب. تحقَّق من البيانات وحاول مجدداً.</span>
        </div>
      )}

      <button type="submit" className="auth-submit" disabled={isPending}>
        {isPending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
      </button>
    </form>
  );
}

interface TeacherFormProps {
  faculties: FormFaculty[];
  isPending: boolean;
  isError: boolean;
  onSubmit: (values: TeacherInputs) => Promise<void>;
}

function TeacherForm({ faculties, isPending, isError, onSubmit }: TeacherFormProps) {
  const form = useForm<TeacherInputs>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', facultyId: '', departmentId: '', specialty: '' },
  });
  const facultyId = form.watch('facultyId');
  const departments = useMemo(
    () => faculties.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="auth-form">
      <div className="auth-row-2">
        <Field label="الاسم الأول" error={form.formState.errors.firstName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="auth-input has-icon-start" autoComplete="given-name" {...form.register('firstName')} />
        </Field>
        <Field label="اللقب" error={form.formState.errors.lastName?.message}>
          <span className="auth-input-icon" aria-hidden><Icon icon={User} size={16} /></span>
          <input className="auth-input has-icon-start" autoComplete="family-name" {...form.register('lastName')} />
        </Field>
      </div>

      <Field label="البريد الجامعي" error={form.formState.errors.email?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Mail} size={16} /></span>
        <input className="auth-input has-icon-start" type="email" autoComplete="email" placeholder="example@zu.edu.ly" {...form.register('email')} />
      </Field>

      <Field label="كلمة المرور (٨ أحرف على الأقل)" error={form.formState.errors.password?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
        <input className="auth-input has-icon-start" type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>

      <div className="auth-row-2">
        <Field label="الكلية" error={form.formState.errors.facultyId?.message}>
          <select className="auth-input" {...form.register('facultyId')}>
            <option value="">اختر…</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
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
        <input className="auth-input has-icon-start" placeholder="مثلاً: الذكاء الاصطناعي" {...form.register('specialty')} />
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
          <span>تعذَّر إنشاء الحساب. تحقَّق من البيانات وحاول مجدداً.</span>
        </div>
      )}

      <button type="submit" className="auth-submit" disabled={isPending}>
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

function Field({ label, error, children }: FieldProps) {
  return (
    <div className="auth-field">
      <label className="form-label">{label}</label>
      <div className="auth-input-wrap">{children}</div>
      {error && <span className="auth-field-error" role="alert">{error}</span>}
    </div>
  );
}
