import { Children, cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
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
import { useInstitutions } from '../hooks/useInstitutions';
import { Skeleton } from '../components/motion';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { usePageTitle } from '../hooks/usePageTitle';
import { ROLE_HOME } from '../lib/nav';
import { countAr } from '../lib/format';
import { authErrorView } from '../lib/authErrors';
import { isCommonPassword } from '../lib/commonPasswords';
import type { AppRole } from '../stores/auth.store';

/**
 * Self-serve registration is restricted to academic roles.
 * Administrative roles (Dean / Dept Head / Admin / Quality / Owner) are
 * appointed by the university — they don't sign up through this form.
 */
type AcademicRole = Extract<AppRole, 'STUDENT' | 'TEACHER'>;

/** r165f: FE mirror of the backend password policy (auth.dto.ts +
 *  password-policy.ts). Same rules, same Arabic message the backend's
 *  field-specific 400 now carries — a blocklist password (password123,
 *  12345678…) used to pass the client check, submit, then come back as
 *  the field-less «تحقّق من البيانات المُدخلة» so the visitor retried
 *  the SAME secret in a loop. The refine rides after the length checks,
 *  so a short password still reports the length message first.
 * r170g mirror: the backend floor moved 8→12 (ASVS 2.1.1) — the FE
 * schema keeps exact parity so an 8–11-char secret can't pass the
 * client and bounce as the generic 400 (the r165f failure mode). */
export const registerPasswordSchema = z
  .string()
  .min(12, '12 حرفًا على الأقل')
  .max(72)
  .refine((pw) => !isCommonPassword(pw), {
    message: 'كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا',
  });

const studentSchema = z.object({
  // D17-4 parity with the backend register schema (auth.dto.ts):
  // user-input strings trim BEFORE length validation — whitespace-only
  // values fail min() instead of minting an account; emails additionally
  // lowercase BEFORE validation (case-insensitive identity, same as the
  // backend's .trim().toLowerCase()). Passwords never trim (a space can
  // be a legitimate part of the secret); the institution/faculty/
  // department ids are fixed-list ids, not free input.
  firstName: z.string().trim().min(1, 'مطلوب').max(60),
  lastName: z.string().trim().min(1, 'مطلوب').max(60),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح').max(120),
  password: registerPasswordSchema,
  universityId: z.string().trim().min(3, 'مطلوب').max(40),
  // r178: the institution the account registers into — required for
  // both public roles (the backend validates the faculty→institution
  // chain server-side). The value itself is owned by the page-level
  // institution step and mirrored into the form via setValue.
  institutionId: z.string().min(1, 'اختر المؤسسة'),
  facultyId: z.string().min(1, 'اختر الكلّيّة'),
  departmentId: z.string().min(1, 'اختر القسم'),
  // r157 F5: year max mirrors the backend contract (auth.dto.ts:42 —
  // `.max(8)`), not the legacy 7: an 8th-year student (e.g. a bridging
  // / transferred cohort) used to be rejected FE-side while the backend
  // would have accepted the payload.
  year: z.coerce.number().int().min(1).max(8),
});

const teacherSchema = z.object({
  firstName: z.string().trim().min(1, 'مطلوب').max(60),
  lastName: z.string().trim().min(1, 'مطلوب').max(60),
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح').max(120),
  password: registerPasswordSchema,
  // r178: same institution requirement as the student schema.
  institutionId: z.string().min(1, 'اختر المؤسسة'),
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

/** Generic refusal ONLY for failures the server never answered (network)
 *  — or Latin transport prose the Arabic guard rejected. When the backend
 *  DID answer, its own Arabic message shows verbatim (authErrorView,
 *  r157 F5 / D17-3), and a 409 adds the login link. */
const GENERIC_REGISTER_ERROR =
  'تعذَّر إنشاء الحساب. راجع البيانات المدخلة وتأكَّد من اتصالك بالشبكة ثم أعد المحاولة.';

/** r157 F5: honest empty state for a faculty whose department list is
 *  empty — 21 of 25 live faculties ship zero departments; the old dead
 *  select promised a choice that does not exist. */
const NO_DEPARTMENTS_TEXT =
  'لا توجد أقسام مسجّلة في هذه الكلّيّة بعد — اختر كلّيّة أخرى أو تواصل مع إدارة الجامعة.';

/* ═─ r170-e: password strength hint (ASVS 2.1.8 advisory) ────────────
 *
 * A live, dependency-free heuristic under the password input, shared
 * by BOTH role forms. Tier rules (documented contract):
 *   - blocklist hit (lib/commonPasswords.ts mirror) → ALWAYS ضعيفة;
 *   - length < 8 → ضعيفة; 8–11 → متوسطة; ≥ 12 → قوية.
 * ADVISORY ONLY — never blocks submit: the zod schema
 * (registerPasswordSchema) still enforces the real rules; this hint
 * exists so the visitor gets feedback while typing, before the first
 * failed submit. role="status" = polite live region (announced on
 * change, never interrupts — same pattern as auth-form-summary). */
export type PasswordTier = 'weak' | 'medium' | 'strong';

export function passwordStrengthTier(password: string): PasswordTier | null {
  if (password.length === 0) return null; // empty → no announcement
  if (isCommonPassword(password)) return 'weak';
  if (password.length < 8) return 'weak';
  if (password.length < 12) return 'medium';
  return 'strong';
}

const TIER_TEXT: Record<PasswordTier, string> = {
  weak: 'قوة كلمة المرور: ضعيفة',
  medium: 'قوة كلمة المرور: متوسطة',
  strong: 'قوة كلمة المرور: قوية',
};

function PasswordStrengthHint({ password }: { password: string }) {
  const tier = passwordStrengthTier(password);
  if (tier === null) return null;
  return (
    <p className="auth-form-summary" role="status" aria-live="polite">
      {TIER_TEXT[tier]}
    </p>
  );
}

/** Submit-level banner (r157 F5 finding 5 keeps role="alert" here — the
 *  server's answer IS worth an announcement). D17-3 via authErrorView:
 *  the backend's Arabic message verbatim; a 409 conflict (email already
 *  registered) appends the login link, so the visitor's next step is one
 *  honest click away instead of a guess. */
function RegisterErrorBanner({ error }: { error: unknown }) {
  const { serverMessage, isConflict } = authErrorView(error);
  return (
    <div className="auth-error" role="alert">
      <Icon icon={AlertCircle} size={14} />
      <span>
        {serverMessage ?? GENERIC_REGISTER_ERROR}
        {isConflict && (
          <>
            {' — '}
            <Link to="/auth" className="auth-error-link">سجِّل الدخول</Link>
          </>
        )}
      </span>
    </div>
  );
}

export default function RegisterPage() {
  useThemeSync();
  usePageTitle('إنشاء حساب جامعي');
  const navigate = useNavigate();
  const register = useRegister();
  /* r178 (multi-institution): the institution step — the public
   * listing (GET /institutions) drives a select that must be answered
   * BEFORE the faculty select; the faculties query is scoped to the
   * selected institution's slug and held (enabled: false) until one is
   * chosen, so the form never offers cross-institution faculties. */
  const institutionsQ = useInstitutions();
  const [institutionId, setInstitutionId] = useState('');
  // useMemo so the derived array is referentially stable across renders
  // (the auto-select effect below depends on it; a fresh `?? []` per
  // render would re-fire it needlessly — and exhaust the repo's
  // documented warning budget).
  const institutions = useMemo(() => institutionsQ.data ?? [], [institutionsQ.data]);
  const selectedInstitution = institutions.find((i) => i.id === institutionId) ?? null;
  const institutionsState: InstitutionsState = {
    status: institutionsQ.isLoading ? 'loading' : institutionsQ.isError ? 'error' : 'ready',
    items: institutions,
    retry: () => void institutionsQ.refetch(),
  };
  const facultiesQ = useFaculties(selectedInstitution?.slug, {
    enabled: Boolean(selectedInstitution),
  });
  const [role, setRole] = useState<AcademicRole | null>(null);
  const [stepDir, setStepDir] = useState<StepDir>('forward');
  const facultiesState: FacultiesState = {
    status: facultiesQ.isLoading ? 'loading' : facultiesQ.isError ? 'error' : 'ready',
    items: facultiesQ.data ?? [],
    retry: () => void facultiesQ.refetch(),
  };

  // Single-institution deployment: the field still renders (preselected)
  // so the context stays visible — but the visitor skips one decision.
  // A guard (not a dependency-free effect) so re-renders can't fight it.
  useEffect(() => {
    if (institutions.length === 1 && institutionId === '') {
      setInstitutionId(institutions[0]!.id);
    }
  }, [institutions, institutionId]);

  // Form state lives at PAGE level, above the keyed step panel
  // (audit 4-A13 P2-3): the panel's keyed remount drives the slide
  // animation but used to destroy everything typed into it — a
  // student who picked the wrong role (or stepped away and back)
  // retyped the whole form. With the RHF state hoisted here, the
  // remount only resets transient view state (the password toggle).
  const studentForm = useForm<StudentInputs>({
    resolver: zodResolver(studentSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', universityId: '', institutionId: '', facultyId: '', departmentId: '', year: 1 },
  });
  const teacherForm = useForm<TeacherInputs>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', institutionId: '', facultyId: '', departmentId: '', specialty: '' },
  });

  /* r178: the institution step owns the selection (page state, shared
   * by both role forms). It mirrors into each form's schema field (the
   * submit payload carries it) AND resets the faculty/department picks
   * — the old faculty belongs to the old institution, and keeping it
   * silently would submit a cross-institution id the backend rejects
   * with a generic 400 (the exact r157 F5 faculty→department pattern,
   * one level up). */
  const prevInstitutionRef = useRef(institutionId);
  useEffect(() => {
    if (prevInstitutionRef.current === institutionId) return;
    prevInstitutionRef.current = institutionId;
    // The two forms are separate RHF instances with different input
    // shapes — a shared loop unions their setValue signatures into an
    // uncallable type, so each gets its explicit mirror block.
    studentForm.setValue('institutionId', institutionId, { shouldValidate: false });
    if (studentForm.getValues('facultyId')) {
      studentForm.setValue('facultyId', '', { shouldValidate: false });
    }
    if (studentForm.getValues('departmentId')) {
      studentForm.setValue('departmentId', '', { shouldValidate: false });
    }
    teacherForm.setValue('institutionId', institutionId, { shouldValidate: false });
    if (teacherForm.getValues('facultyId')) {
      teacherForm.setValue('facultyId', '', { shouldValidate: false });
    }
    if (teacherForm.getValues('departmentId')) {
      teacherForm.setValue('departmentId', '', { shouldValidate: false });
    }
  }, [institutionId, studentForm, teacherForm]);

  // Focus continuity (audit 4-A13 P2-2): the step panel's keyed
  // remount unmounts the clicked role card, which used to drop
  // focus to <body> at the exact moment the screen changed. Move
  // focus to the incoming step's heading instead (tabIndex={-1}),
  // the same pattern OnboardingFlow uses for its CTA. The previous-
  // role guard skips the very first mount — a fresh page load keeps
  // the browser's default focus behaviour.
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const prevRoleRef = useRef<AcademicRole | null>(null);
  useEffect(() => {
    if (prevRoleRef.current === role) return;
    prevRoleRef.current = role;
    stepHeadingRef.current?.focus();
  }, [role]);

  const chooseRole = (r: AcademicRole) => {
    // r152a (A4 P3): both step-2 forms share ONE mutation instance — a
    // failed student submission used to carry its error state onto the
    // teacher form (and vice versa) the moment the user switched roles,
    // showing "تعذَّر إنشاء الحساب" for a form never submitted. Reset
    // the mutation on every role transition; TanStack only clears it on
    // the next mutate otherwise.
    register.reset();
    setStepDir('forward');
    setRole(r);
  };
  const backToRoles = () => {
    register.reset();
    setStepDir('back');
    setRole(null);
  };

  return (
    <div className="auth-shell">
      {/* a11y: page-level chrome as a banner landmark (matches AuthPage's
          imm-5 fix — axe "all content in landmarks"). */}
      <header className="auth-top">
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
        {/* r157 F5: on step 2 the login link is demoted to a quiet
            .auth-context chip — the header carries ONE pill («تغيير
            نوع الحساب»); a second loud action competed with it. */}
        {role ? (
          <Link to="/auth" className="auth-context">تسجيل الدخول</Link>
        ) : (
          <span className="auth-context">إنشاء حساب جديد</span>
        )}
      </header>

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
                  <h1 className="auth-form-title" tabIndex={-1} ref={stepHeadingRef}>
                    {role === 'STUDENT' ? 'تسجيل طالب جديد' : 'تسجيل عضو هيئة تدريس'}
                  </h1>
                  <p className="auth-form-sub">جميع الحقول مطلوبة لإتمام إنشاء الحساب.</p>
                </div>

                {role === 'STUDENT' ? (
                  <StudentForm
                    form={studentForm}
                    error={register.error}
                    isPending={register.isPending}
                    faculties={facultiesState}
                    institutions={institutionsState}
                    institutionId={institutionId}
                    onInstitutionChange={setInstitutionId}
                    onSubmit={async (values) => {
                      try {
                        const res = await register.mutateAsync({ role: 'STUDENT', ...values });
                        navigate(ROLE_HOME[res.user.role], { replace: true });
                      } catch { /* surfaced below */ }
                    }}
                  />
                ) : (
                  <TeacherForm
                    form={teacherForm}
                    error={register.error}
                    isPending={register.isPending}
                    faculties={facultiesState}
                    institutions={institutionsState}
                    institutionId={institutionId}
                    onInstitutionChange={setInstitutionId}
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
                  <h1 className="auth-form-title" tabIndex={-1} ref={stepHeadingRef}>من أنت؟</h1>
                  <p className="auth-form-sub">
                    اختر نوع الحساب لإنشاء وصولك إلى منصّة مدارك.
                  </p>
                </div>

                {/* r168a: the chooser is a named group — each card is a
                    commit-action button (tap = choose + advance), so
                    radio state semantics don't apply; the group label
                    gives SR users the question context in one place. */}
                <div className="role-card-grid" role="group" aria-label="نوع الحساب">
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

      <footer className="auth-bottom">
        {/* r177: was the ministry/university line — now the platform's own identity */}
        صُنع في ليبيا · <strong>منصّة تعليم ذكي مستقلّة</strong>
      </footer>
    </div>
  );
}

interface FormFaculty { id: string; name: string; departments: { id: string; name: string }[] }

/** r178: the public institutions listing for the register form's
 *  institution step (GET /institutions — {id, name, nameEn?, slug}). */
interface FormInstitution { id: string; name: string; nameEn?: string | null; slug: string }

/** Load state of the institutions lookup — same first-class
 *  loading/error/ready contract as FacultiesState (audit 0-b P0-4:
 *  never a silently empty select). */
interface InstitutionsState {
  status: 'loading' | 'error' | 'ready';
  items: FormInstitution[];
  retry: () => void;
}

/** Load state of the faculties lookup. The register form is unusable
 *  without it, so loading and error are first-class states (skeleton /
 *  retry), never a silently empty select (audit 0-b P0-4). */
interface FacultiesState {
  status: 'loading' | 'error' | 'ready';
  items: FormFaculty[];
  retry: () => void;
}

/** r157 F5: the failed mutation's error object (not a bare boolean) so
 *  RegisterErrorBanner can read the backend's Arabic message verbatim
 *  and detect the 409 conflict; `error` is null while idle/never-
 *  submitted, `isPending` drives the submit button's busy state. */
interface RegisterFormProps {
  error: unknown;
  isPending: boolean;
  faculties: FacultiesState;
  /** r178: the institution step's data + controlled selection. */
  institutions: InstitutionsState;
  institutionId: string;
  onInstitutionChange: (id: string) => void;
}

interface StudentFormProps extends RegisterFormProps {
  form: UseFormReturn<StudentInputs>;
  onSubmit: (values: StudentInputs) => Promise<void>;
}

function StudentForm({ form, error, isPending, faculties, institutions, institutionId, onInstitutionChange, onSubmit }: StudentFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const facultyId = form.watch('facultyId');
  // r170-e: live strength hint rides the same watch subscription —
  // re-renders per keystroke, advisory only.
  const passwordValue = form.watch('password');
  const departments = useMemo(
    () => faculties.items.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  // r157 F5: a chosen faculty with ZERO departments gets the honest
  // NO_DEPARTMENTS box instead of a dead select that promises options.
  const deptEmpty = faculties.status === 'ready' && !!facultyId && departments.length === 0;

  // r157 F5: departmentId must reset when facultyId changes — the old
  // department belongs to the old faculty; keeping it silently submitted
  // a cross-faculty id the backend rejects with a generic 400.
  const prevFacultyRef = useRef(facultyId);
  useEffect(() => {
    if (prevFacultyRef.current === facultyId) return;
    prevFacultyRef.current = facultyId;
    if (form.getValues('departmentId')) {
      form.setValue('departmentId', '', { shouldValidate: false });
    }
  }, [facultyId, form]);

  // ONE polite summary (r157 F5 finding 5): counts validation problems
  // with countAr — field errors themselves stay describedby-only.
  const issueCount = Object.values(form.formState.errors).filter(Boolean).length;

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

      <Field label="كلمة المرور (12 حرفًا على الأقل)" error={form.formState.errors.password?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
        {/* dir="ltr": passwords are overwhelmingly Latin runs; the caret
            and masked glyphs must not bidi-flip in RTL. */}
        <input className="input auth-input" type={showPassword ? 'text' : 'password'} dir="ltr" autoComplete="new-password" {...form.register('password')} />
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

      {/* r170-e (ASVS 2.1.8): advisory live-region strength hint under the
          password input — polite, dependency-free, never blocks submit. */}
      <PasswordStrengthHint password={passwordValue} />

      <Field label="رقم القيد الجامعي" error={form.formState.errors.universityId?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Hash} size={16} /></span>
        {/* dir="ltr": university IDs are Latin/digit runs (2024-CS-1234)
            that bidi-scramble inside an RTL input. */}
        <input className="input auth-input" type="text" placeholder="مثلاً 2024-CS-1234" dir="ltr" {...form.register('universityId')} />
      </Field>

      {/* r178: institution step — BEFORE the faculty select (the
          faculties listing is scoped to this selection server-side). */}
      <InstitutionField
        institutions={institutions}
        institutionId={institutionId}
        onInstitutionChange={onInstitutionChange}
        error={form.formState.errors.institutionId?.message}
      />

      <div className="auth-row-2">
        <Field label="الكلّيّة" error={form.formState.errors.facultyId?.message}>
          {/* r157 F5 (6A11 #5 opt-in): the faculties skeleton announces
              itself — role=status + aria-busy via the Wave-1 Skeleton
              aria-label contract. */}
          {faculties.status === 'loading' && (
            <Skeleton className="auth-select-skeleton" aria-label="جارٍ تحميل الكليات" />
          )}
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
          <select className="auth-input" disabled={!institutionId} {...form.register('facultyId')}>
            <option value="">اختر…</option>
            {faculties.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          )}
        </Field>
        <Field
          label="القسم"
          /* r157 F5: while the honest empty state is showing, the
             «اختر القسم» error would name a control that doesn't exist —
             the empty box IS the explanation, so the field error is
             suppressed (the summary still counts the blocked field). */
          error={deptEmpty ? undefined : form.formState.errors.departmentId?.message}
        >
          {deptEmpty ? (
            <div className="auth-dept-empty">{NO_DEPARTMENTS_TEXT}</div>
          ) : (
            <select className="auth-input" disabled={!facultyId} {...form.register('departmentId')}>
              <option value="">اختر…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </Field>
      </div>

      <Field label="السنة الدراسية" error={form.formState.errors.year?.message}>
        <select className="auth-input" {...form.register('year')}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => <option key={y} value={y}>السنة {y}</option>)}
        </select>
      </Field>

      {error != null && <RegisterErrorBanner error={error} />}

      {issueCount > 0 && (
        <p className="auth-form-summary" role="status" aria-live="polite">
          {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة ثم أعد المحاولة.
        </p>
      )}

      <button type="submit" className="auth-submit" disabled={isPending}>
        {isPending && <span className="auth-submit-spinner" aria-hidden />}
        {isPending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
      </button>
    </form>
  );
}

interface TeacherFormProps extends RegisterFormProps {
  form: UseFormReturn<TeacherInputs>;
  onSubmit: (values: TeacherInputs) => Promise<void>;
}

function TeacherForm({ form, error, isPending, faculties, institutions, institutionId, onInstitutionChange, onSubmit }: TeacherFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const facultyId = form.watch('facultyId');
  // r170-e: same live strength contract as the student form.
  const passwordValue = form.watch('password');
  const departments = useMemo(
    () => faculties.items.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  // r157 F5: same honest empty state + departmentId reset as the student
  // form — both step-2 paths share the contract.
  const deptEmpty = faculties.status === 'ready' && !!facultyId && departments.length === 0;

  const prevFacultyRef = useRef(facultyId);
  useEffect(() => {
    if (prevFacultyRef.current === facultyId) return;
    prevFacultyRef.current = facultyId;
    if (form.getValues('departmentId')) {
      form.setValue('departmentId', '', { shouldValidate: false });
    }
  }, [facultyId, form]);

  const issueCount = Object.values(form.formState.errors).filter(Boolean).length;

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
        <input className="input auth-input" type="email" dir="ltr" autoComplete="email" placeholder="example@email.com" {...form.register('email')} />
      </Field>

      <Field label="كلمة المرور (12 حرفًا على الأقل)" error={form.formState.errors.password?.message}>
        <span className="auth-input-icon" aria-hidden><Icon icon={Lock} size={16} /></span>
        {/* dir="ltr": passwords are overwhelmingly Latin runs; the caret
            and masked glyphs must not bidi-flip in RTL. */}
        <input className="input auth-input" type={showPassword ? 'text' : 'password'} dir="ltr" autoComplete="new-password" {...form.register('password')} />
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

      {/* r170-e (ASVS 2.1.8): advisory live-region strength hint under the
          password input — same contract as the student form. */}
      <PasswordStrengthHint password={passwordValue} />

      {/* r178: institution step — BEFORE the faculty select (same
          contract as the student form). */}
      <InstitutionField
        institutions={institutions}
        institutionId={institutionId}
        onInstitutionChange={onInstitutionChange}
        error={form.formState.errors.institutionId?.message}
      />

      <div className="auth-row-2">
        <Field label="الكلّيّة" error={form.formState.errors.facultyId?.message}>
          {/* r157 F5 (6A11 #5 opt-in): the faculties skeleton announces
              itself — role=status + aria-busy via the Wave-1 Skeleton
              aria-label contract. */}
          {faculties.status === 'loading' && (
            <Skeleton className="auth-select-skeleton" aria-label="جارٍ تحميل الكليات" />
          )}
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
          <select className="auth-input" disabled={!institutionId} {...form.register('facultyId')}>
            <option value="">اختر…</option>
            {faculties.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          )}
        </Field>
        <Field
          label="القسم"
          error={deptEmpty ? undefined : form.formState.errors.departmentId?.message}
        >
          {deptEmpty ? (
            <div className="auth-dept-empty">{NO_DEPARTMENTS_TEXT}</div>
          ) : (
            <select className="auth-input" disabled={!facultyId} {...form.register('departmentId')}>
              <option value="">اختر…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
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

      {error != null && <RegisterErrorBanner error={error} />}

      {issueCount > 0 && (
        <p className="auth-form-summary" role="status" aria-live="polite">
          {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة ثم أعد المحاولة.
        </p>
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
 *  aria-describedby + aria-invalid so they are announced on focus (audit
 *  0-b P0-3 / P1-6).
 *
 *  DEVIATION (r157 F5, documented): this scaffold is intentionally NOT
 *  migrated to primitives/Form.tsx's FormField — FormField hardwires
 *  role="alert" on every field error, which would recreate the exact
 *  alert storm finding 5 removed (7 simultaneous alerts on a failed
 *  submit). The hand-rolled Field keeps the SAME ARIA contract
 *  (useId + htmlFor + aria-invalid + aria-describedby) minus the
 *  per-field role="alert"; the ONE polite countAr summary carries the
 *  announcement instead. Migrate only after FormField grows a quiet
 *  error variant (wave-3 hand-off). */
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
      {error && <span id={errorId} className="auth-field-error">{error}</span>}
    </div>
  );
}

/** r178: the institution select — the FIRST link of the academic chain
 *  (institution → faculty → department). Controlled by the page-level
 *  selection (both role forms share it); the load states follow the
 *  faculties lookup's exact contract (skeleton / retry alert / select —
 *  never a silently empty select, audit 0-b P0-4). Single-institution
 *  deployments still render the field, preselected by the page. */
interface InstitutionFieldProps {
  institutions: InstitutionsState;
  institutionId: string;
  onInstitutionChange: (id: string) => void;
  error?: string;
}

function InstitutionField({
  institutions,
  institutionId,
  onInstitutionChange,
  error,
}: InstitutionFieldProps) {
  return (
    <Field label="المؤسسة التعليمية" error={error}>
      {institutions.status === 'loading' && (
        <Skeleton className="auth-select-skeleton" aria-label="جارٍ تحميل المؤسسات" />
      )}
      {institutions.status === 'error' && (
        <div className="auth-error" role="alert">
          <Icon icon={AlertCircle} size={14} />
          <span>تعذّر تحميل المؤسسات — تحقّق من اتصالك بالشبكة.</span>
          <button type="button" className="auth-retry-link" onClick={institutions.retry}>
            إعادة المحاولة
          </button>
        </div>
      )}
      {institutions.status === 'ready' && (
        <select
          className="auth-input"
          value={institutionId}
          onChange={(e) => onInstitutionChange(e.target.value)}
        >
          <option value="">اختر…</option>
          {institutions.items.map((inst) => (
            <option key={inst.id} value={inst.id}>{inst.name}</option>
          ))}
        </select>
      )}
    </Field>
  );
}
