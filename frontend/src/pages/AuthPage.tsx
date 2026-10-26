import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, GraduationCap, School,
  Building2, AlertCircle, ShieldCheck, ArrowLeft, Crown, Eye, EyeOff,
  FlaskConical, X,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { StarMark } from '../components/StarMark';
import { useLogin, useSelectInstitution } from '../hooks/useAuth';
import { listPublicInstitutions } from '../lib/api';
import { apiErrorCode } from '../lib/format';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { usePageTitle } from '../hooks/usePageTitle';
import { ROLE_HOME, ROLE_LABELS } from '../lib/nav';
// R320 §B: the demo buttons consume the shared role-label source
// (lib/roleLabels.ts) — ADMIN is «المسجل العام» now; the other roles'
// demo-panel wording is the established one (AUTH_DEMO_ROLE_LABELS).
import { AUTH_DEMO_ROLE_LABELS } from '../lib/roleLabels';
import { countAr } from '../lib/format';
import { authErrorView } from '../lib/authErrors';
import type { AppRole, MembershipInfo } from '../stores/auth.store';
import type { AxiosError } from 'axios';

/** Login-error envelope the backend rejects with (lib/errors.ts):
 *  `{ error: { code, message } }` — the message is authored Arabic. */
type LoginErrorBody = { error?: { code?: string; message?: string } };

/** A13 P2-1: a 429 lockout is NOT a credentials problem. The generic
 *  «تحقَّق من البريد وكلمة المرور» banner actively misled students
 *  during the 10/15-min rate-limit window (they kept "fixing" a
 *  password that was fine). Detect the lockout — by status OR by the
 *  backend's TOO_MANY_REQUESTS code — and surface the honest Arabic
 *  message the backend already sends («محاولات دخول كثيرة — انتظر
 *  قليلاً ثم أعد المحاولة»). Ordered FIRST: the lockout branch wins
 *  before the generic authErrorView path (r157 F5 finding 3). */
function isRateLimitError(error: unknown): boolean {
  const ax = error as AxiosError<LoginErrorBody> | null;
  return ax?.response?.status === 429 || ax?.response?.data?.error?.code === 'TOO_MANY_REQUESTS';
}

function rateLimitMessage(error: unknown): string {
  const ax = error as AxiosError<LoginErrorBody> | null;
  const serverMessage = ax?.response?.data?.error?.message;
  return serverMessage ?? 'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة.';
}

/** Generic refusal ONLY for failures the server never answered (network)
 *  — or Latin transport prose the Arabic guard rejected. When the backend
 *  DID answer, its own Arabic message shows verbatim (authErrorView,
 *  r157 F5 / D17-3). */
const GENERIC_LOGIN_ERROR =
  'تعذَّر تسجيل الدخول. تحقَّق من البريد وكلمة المرور وتأكَّد من اتصالك بالشبكة، ثم أعد المحاولة.';

const loginSchema = z.object({
  // Validation-first «مطلوب» (r157 F5): empty / whitespace-only input is
  // answered with the ONE word that names the problem, before any shape
  // check — same grammar as the register schema (D17-4). The value is
  // trimmed before length (the identifier is sent trimmed, matching the
  // backend's loginSchema), and email SHAPE is only checked when the
  // field contains '@' (it also accepts university reg numbers).
  email: z
    .string()
    .trim()
    .min(1, 'مطلوب')
    .max(120, 'الحقل طويل جداً')
    .refine(
      (v) => v.includes('@') ? z.string().email().safeParse(v).success : true,
      { message: 'بريد إلكتروني غير صالح' },
    ),
  password: z.string().min(1, 'مطلوب'),
});
type LoginInputs = z.infer<typeof loginSchema>;

/** Demo credentials are a dev-only convenience. Gating on
 *  import.meta.env.DEV keeps known emails/passwords out of production
 *  bundles (Vite replaces the flag statically, so the whole branch,
 *  its handlers and this map are dead-code-eliminated in prod builds). */
const SHOW_DEMO_LOGIN = import.meta.env.DEV;

const DEMO_EMAIL: Record<AppRole, string> = {
  STUDENT: 'student@demo.madarek.ly',
  TEACHER: 'teacher@demo.madarek.ly',
  ADMIN:   'admin@demo.madarek.ly',
  QUALITY: 'quality@demo.madarek.ly',
  OWNER:   'owner@demo.madarek.ly',
};
/** Demo password — canonical value shared with the backend seed
 *  (backend/prisma/seed.ts) and the snap/probe scripts. Keeping one
 *  constant means a fresh `npm run db:seed` demo database always
 *  matches what these dev-only buttons fill in. */
const DEMO_PASSWORD = 'Madarek2026!';

/** Deep link a visitor was trying to reach when ProtectedRoute bounced
 *  them here (ProtectedRoute passes `state={{ from: location }}`). Only
 *  in-app pathnames are honored — anything else falls back to the role
 *  home, so the param can never be used to navigate off-app. */
function readFromPath(state: unknown): string | null {
  const from = (state as { from?: { pathname?: unknown } } | null)?.from?.pathname;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null;
}

export default function AuthPage() {
  useThemeSync();
  usePageTitle('تسجيل الدخول');
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const selectInstitution = useSelectInstitution();
  const [forgotNotice, setForgotNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // r178 (multi-institution): after a successful login whose session
  // carries MULTIPLE active memberships and NO auto-selected context,
  // the visitor must pick the institution for this session. The
  // response's membership list is captured here; the card swaps the
  // login form for an institution chooser. Exactly-one membership is
  // auto-selected server-side (context set) and zero memberships
  // (platform owner) proceeds straight to the role home — the
  // pre-r178 behavior.
  const [pendingSelection, setPendingSelection] = useState<MembershipInfo[] | null>(null);
  // r157 F5: the demo panel starts COLLAPSED — it is a dev convenience,
  // never the first thing a real visitor should read. A quiet reopen
  // chip (.auth-demo-hint-reopen) keeps it one honest click away.
  const [demoHintOpen, setDemoHintOpen] = useState(false);

  const loginForm = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // After login, resume the deep link the visitor came for (e.g. a college
  // page from the landing popover) — fall back to the role home.
  const navigateAfterLogin = (role: AppRole) => {
    navigate(readFromPath(location.state) ?? ROLE_HOME[role], { replace: true });
  };

  // r180 (REG_NUMBER_AMBIGUOUS recovery): the same reg-number can be
  // registered in several institutions (the seed deliberately proves
  // it: UZ-2024-00001 lives in both demo institutions). The backend
  // login accepts an institutionSlug hint — when it answers 400
  // REG_NUMBER_AMBIGUOUS the form grows ONE institution select (the
  // public /institutions list) and the next submit carries the choice;
  // email login never hits this path.
  const [ambiguitySlug, setAmbiguitySlug] = useState('');
  const ambiguity = login.isError && apiErrorCode(login.error) === 'REG_NUMBER_AMBIGUOUS';
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: listPublicInstitutions,
    enabled: ambiguity,
    staleTime: 5 * 60_000,
  });

  const onLogin = loginForm.handleSubmit(async (values) => {
    try {
      const result = await login.mutateAsync({
        ...values,
        ...(ambiguitySlug ? { institutionSlug: ambiguitySlug } : {}),
      });
      // r178: multi-membership without an auto-selected context → the
      // institution selection step owns the navigation from here.
      if (
        (result.user.memberships?.length ?? 0) > 1 &&
        !result.user.currentInstitution
      ) {
        setPendingSelection(result.user.memberships ?? []);
        return;
      }
      navigateAfterLogin(result.user.role);
    } catch { /* error displayed below */ }
  });

  /** r178: commit the visitor's institution choice — POST
   *  /auth/select-institution mints a context-bearing token; only then
   *  does the post-login navigation fire (same deep-link resume as a
   *  direct login). Failures keep the chooser mounted with the
   *  server's Arabic message (403 INSTITUTION_CONTEXT_INVALID et al). */
  const onChooseInstitution = async (membership: MembershipInfo) => {
    try {
      const res = await selectInstitution.mutateAsync({
        institutionId: membership.institutionId,
      });
      setPendingSelection(null);
      navigateAfterLogin(res.user.role);
    } catch { /* error displayed in the chooser */ }
  };

  /** One-click FILL of the demo credentials — the visitor reviews the
   *  filled fields and submits the form themselves (no hidden
   *  auto-login; the action stays visible and honest). */
  const fillDemo = (role: AppRole) => {
    loginForm.setValue('email', DEMO_EMAIL[role], { shouldValidate: false });
    loginForm.setValue('password', DEMO_PASSWORD, { shouldValidate: false });
  };

  // r157 F5 (finding 5 — alert storm): field-level errors are
  // aria-describedby-ONLY now (announced on focus, never shouted); ONE
  // polite summary line below counts them with countAr.
  const errors = loginForm.formState.errors;
  const issueCount = [errors.email, errors.password].filter(Boolean).length;

  // D17-3 via authErrorView: when the backend answered, ITS Arabic
  // message wins verbatim (401 «البريد الإلكتروني أو كلمة المرور غير
  // صحيحة», 403 «هذا الحساب معطّل…»); the generic line is for network
  // silence only.
  const authFailure = authErrorView(login.error);

  return (
    <div className="auth-shell">

      {/* ═══ THE SHEET CHROME (R315 · K-I — the landing's frame grammar):
          the full-page drafting frame (fixed 1px hairline at the 7px
          inset + the 10×10 mono corner marks) and the measured paper
          grain film. Decorative only: aria-hidden, pointer-transparent,
          visible at every breakpoint the reference shows its frame. */}
      <div className="auth-frame" aria-hidden="true">
        <span className="auth-mark auth-mark-tl">+</span>
        <span className="auth-mark auth-mark-tr">+</span>
        <span className="auth-mark auth-mark-bl">+</span>
        <span className="auth-mark auth-mark-br">+</span>
      </div>
      <div className="auth-grain" aria-hidden="true" />

      {/* imm-5 a11y fix (axe "all content in landmarks" — was a bare
          div): the page-level chrome reads as banner / contentinfo
          landmarks; <main> above already carried the form. RegisterPage
          shares this structure. */}
      <header className="auth-top">
        <Link to="/" className="auth-back-home">
          <Icon icon={Home} size={14} />
          الصفحة الرئيسية
        </Link>
        {/* r191: the brand mark owns the auth chrome — the national-flag
            provenance marker is retired with the rejected slogan family. */}
        <span className="auth-context">
          <StarMark size={14} /> مدارك
        </span>
      </header>

      <main className="auth-center">
        {/* R315 (K-I): the centred CARD is dissolved — the sheet column
            sits directly on the framed paper; the ruled cell composition
            carries all the structure (auth.css §2/§4). */}
        <div className="auth-card">

          {/* the mono micro-label row — the drawing sheet's identity
              line (Latin/technical chrome, dir=ltr run, decorative). */}
          <p className="auth-sheet-label" aria-hidden="true">
            <span dir="ltr">[MDRK-AUTH] · SHEET 01/01</span>
          </p>

          {pendingSelection ? (
            <>
              {/* r178 (multi-institution): institution selection step —
                  the login succeeded but the account holds MORE THAN ONE
                  active membership and no auto-selected context. The
                  visitor commits to one institution for this session
                  (same sheet, same chrome; the ruled role-row grammar the
                  register page's chooser owns — no new styles). */}
              <div className="auth-form-header">
                <span className="auth-meta">(اختيار المؤسسة)</span>
                <h1 className="auth-form-title">اختر مؤسستك</h1>
                <p className="auth-form-sub">
                  حسابك عضو في أكثر من مؤسسة تعليمية — اختر المؤسسة التي ستعمل ضمنها في هذه الجلسة.
                </p>
              </div>

              <div className="role-card-grid" role="group" aria-label="اختيار المؤسسة">
                {pendingSelection.map((membership, i) => (
                  <button
                    key={membership.institutionId}
                    type="button"
                    className="role-card"
                    onClick={() => void onChooseInstitution(membership)}
                    disabled={selectInstitution.isPending}
                  >
                    <span className="role-card-index" dir="ltr" aria-hidden="true">
                      [{String(i + 1).padStart(2, '0')}]
                    </span>
                    <span className="role-card-body">
                      <span className="role-card-title">{membership.name}</span>
                      <span className="role-card-sub">
                        {ROLE_LABELS[membership.role] ?? <bdi>{membership.role}</bdi>}
                      </span>
                    </span>
                    <span className="role-card-arrow"><Icon icon={ArrowLeft} size={16} /></span>
                  </button>
                ))}
              </div>

              {selectInstitution.isError && (
                <div className="auth-error" role="alert">
                  <Icon icon={AlertCircle} size={14} />
                  <span>
                    {/* D17-3: the backend's own Arabic message verbatim
                        (403 INSTITUTION_CONTEXT_INVALID «عضوية المؤسسة
                        غير نشطة أو غير صالحة»…); the generic line only
                        when the server never answered. */}
                    {authErrorView(selectInstitution.error).serverMessage ?? GENERIC_LOGIN_ERROR}
                  </span>
                </div>
              )}

              {/* sr-only pending mirror (r157 F5 contract): the disabled
                  buttons are silent — this polite region announces the
                  verification while the selection request is in flight. */}
              {selectInstitution.isPending && (
                <span className="sr-only" role="status" aria-live="polite">
                  جارٍ التحقق من العضوية…
                </span>
              )}
            </>
          ) : (
            <>
          <div className="auth-form-header">
            {/* imm-5 journey alignment: the landing scenes' coded
                metadata voice as a quiet eyebrow over the title
                (.auth-meta, mono metric role). A real Arabic phrase —
                journey-meta precedent — so it stays in the accessibility
                tree, unlike the bento's purely decorative code badges. */}
            <span className="auth-meta">(بوابة المنصّة)</span>
            {/* R315 (K-I): the heavy tight display heading — NO tashkeel
                (the tanween on «مرحباً» is dropped per the owner sheet
                rule), lh ~1, two lines max, joins never tracked. */}
            <h1 className="auth-form-title">مرحبا بعودتك</h1>
            <p className="auth-form-sub">
              {/* r183-B8 (A5 finding 2): journey-aware wall copy — a
                  visitor bounced here by a protected route (or a public
                  college CTA carrying state.from, r183-B3) is told the
                  login resumes THE page they asked for; a plain visit
                  keeps the platform pitch. readFromPath keeps the
                  condition honest: only a real in-app from-path (the
                  exact thing navigateAfterLogin will resume) counts. */}
              {readFromPath(location.state)
                ? 'سجّل الدخول للمتابعة إلى الصفحة التي طلبها.'
                : 'سجِّل دخولك للوصول إلى مقرَّراتك ومواردك الأكاديمية.'}
            </p>
          </div>

          {/* R315 (K-I): the ruled cell composition — every field a
              hairline-separated row: mono [NN] index + Arabic label +
              the control filling the row. Transparent inputs, no icons
              inside them; errors are mono red micro-labels beside
              their row (describedby-only, r157 F5). */}
          <form onSubmit={onLogin} noValidate className="auth-form">
            <div className="auth-cells">
              <div className="auth-cell">
                <span className="auth-cell-index" dir="ltr" aria-hidden="true">[01]</span>
                <label htmlFor="auth-email" className="form-label">البريد الإلكتروني أو رقم القيد</label>
                <div className="auth-cell-control">
                  {/* dir="ltr": accepts university IDs like 2024-CS-1234 —
                      Latin/digit runs must not be bidi-scrambled by the RTL page. */}
                  <input
                    id="auth-email"
                    type="text"
                    dir="ltr"
                    className="input auth-input"
                    placeholder="example@email.com"
                    autoComplete="username"
                    aria-invalid={!!loginForm.formState.errors.email}
                    aria-describedby={loginForm.formState.errors.email ? 'auth-email-error' : undefined}
                    {...loginForm.register('email')}
                  />
                  {/* describedby-only (r157 F5): the span keeps its id/contract
                      for aria-describedby wiring, but no longer role="alert" —
                      the ONE summary line below is the announcement. */}
                  {loginForm.formState.errors.email && (
                    <span id="auth-email-error" className="auth-field-error">
                      {loginForm.formState.errors.email.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="auth-cell">
                <span className="auth-cell-index" dir="ltr" aria-hidden="true">[02]</span>
                <label htmlFor="auth-password" className="form-label">كلمة المرور</label>
                <div className="auth-cell-control">
                  <div className="auth-input-wrap has-toggle">
                    {/* dir="ltr": passwords are overwhelmingly Latin runs; the
                        caret and masked glyphs must not bidi-flip in RTL. */}
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      className="input auth-input"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={!!loginForm.formState.errors.password}
                      aria-describedby={loginForm.formState.errors.password ? 'auth-password-error' : undefined}
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      className="auth-input-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      <Icon icon={showPassword ? EyeOff : Eye} size={16} />
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <span id="auth-password-error" className="auth-field-error">
                      {loginForm.formState.errors.password.message}
                    </span>
                  )}
                  {/* the forgot-password action belongs to the password row
                      (R315 seat; the DOM order keeps the pinned
                      toggle → forgot keyboard sequence). */}
                  <div className="auth-forgot-row">
                    <button type="button" className="auth-forgot" onClick={() => setForgotNotice(true)}>
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                </div>
              </div>

              {/* r180: the ambiguity recovery select — mounted only while
                  the last submit answered REG_NUMBER_AMBIGUOUS; choosing an
                  institution and resubmitting sends the slug hint.
                  r305 (2-a): the lookup gets the SAME first-class load
                  contract as the register page's institution field
                  (audit 0-b P0-4 — never a silently empty select): the
                  failed query shows the honest Arabic alert with a retry
                  (the same .auth-error/.auth-retry-link grammar), while
                  the loading state stays the select's own placeholder
                  option. No API semantic changes — the choice still
                  rides the next submit as institutionSlug. */}
              {ambiguity && (
                <div className="auth-cell">
                  <span className="auth-cell-index" dir="ltr" aria-hidden="true">[03]</span>
                  <label htmlFor="auth-ambiguity-institution" className="form-label">مؤسستك</label>
                  <div className="auth-cell-control">
                    {institutions.isError ? (
                      <div className="auth-error" role="alert">
                        <Icon icon={AlertCircle} size={14} />
                        <span>تعذّر تحميل المؤسسات — تحقّق من اتصالك بالشبكة.</span>
                        <button
                          type="button"
                          className="auth-retry-link"
                          onClick={() => void institutions.refetch()}
                        >
                          إعادة المحاولة
                        </button>
                      </div>
                    ) : (
                      <select
                        id="auth-ambiguity-institution"
                        className="auth-input"
                        value={ambiguitySlug}
                        onChange={(e) => setAmbiguitySlug(e.target.value)}
                        disabled={institutions.isLoading}
                      >
                        <option value="">{institutions.isLoading ? 'جارٍ تحميل المؤسسات…' : 'اختر المؤسسة…'}</option>
                        {(institutions.data ?? []).map((i) => (
                          <option key={i.id} value={i.slug}>{i.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>

            {forgotNotice && (
              <div className="auth-forgot-notice" role="status">
                يرجى التواصل مع المرشد الأكاديميّ في كليّتك لإعادة تعيين كلمة المرور.
              </div>
            )}

            {login.isError && (
              <div className="auth-error" role="alert">
                <Icon icon={AlertCircle} size={14} />
                <span>
                  {/* A13 P2-1 first (the lockout copy must name the lockout);
                      then D17-3: the backend's own Arabic message verbatim;
                      the generic line only when the server never answered. */}
                  {isRateLimitError(login.error)
                    ? rateLimitMessage(login.error)
                    : (authFailure.serverMessage ?? GENERIC_LOGIN_ERROR)}
                </span>
              </div>
            )}

            {/* ONE polite summary (r157 F5 finding 5): a single status
                line counts the validation problems — instead of every
                field error firing its own role="alert" (a 7-alert storm
                on the register page). */}
            {issueCount > 0 && (
              <p className="auth-form-summary" role="status" aria-live="polite">
                {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة ثم أعد المحاولة.
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={login.isPending}
              aria-busy={login.isPending}
            >
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

            {/* sr-only pending mirror (r157 F5): aria-busy alone is silent;
                this polite region mounts with «جارٍ التحقق…» while the
                request is in flight, so the flip to busy is announced —
                without adding visible chrome. */}
            {login.isPending && (
              <span className="sr-only" role="status" aria-live="polite">
                جارٍ التحقق…
              </span>
            )}

            {SHOW_DEMO_LOGIN && !demoHintOpen && (
              <button
                type="button"
                className="auth-demo-hint-reopen"
                onClick={() => setDemoHintOpen(true)}
              >
                <Icon icon={FlaskConical} size={14} />
                <span>عرض الحسابات التجريبية</span>
              </button>
            )}

            {SHOW_DEMO_LOGIN && demoHintOpen && (
              <div className="auth-demo-hint">
                <div className="auth-demo-hint-head">
                  <Icon icon={FlaskConical} size={14} />
                  <span>حسابات تجريبية — بيئة التطوير</span>
                  <button
                    type="button"
                    className="auth-demo-hint-close"
                    onClick={() => setDemoHintOpen(false)}
                    aria-label="إخفاء لوحة الحسابات التجريبية"
                  >
                    <Icon icon={X} size={14} />
                  </button>
                </div>
                <p className="auth-demo-hint-body">
                  اضغط دوراً لتعبئة الحقول ببيانات حساب تجريبي، ثم اضغط زر تسجيل الدخول.
                </p>
                <div className="auth-demo-actions">
                  {(['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const).map((role) => {
                    const DemoIcon =
                      role === 'STUDENT' ? GraduationCap :
                      role === 'TEACHER' ? School :
                      role === 'ADMIN' ? Building2 :
                      role === 'QUALITY' ? ShieldCheck :
                      Crown;
                    return (
                      <button
                        key={role}
                        type="button"
                        className="btn sm auth-demo-btn"
                        onClick={() => fillDemo(role)}
                        disabled={login.isPending}
                      >
                        <Icon icon={DemoIcon} size={14} />
                        <span>{AUTH_DEMO_ROLE_LABELS[role]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* r183-B3 (A5 P1-1): the register prompt forwards the LIVE
                location.state — a visitor who landed here from a public
                college CTA (state.from) keeps the deep link through the
                login→register hop, instead of silently dropping it at the
                door. */}
            <p className="auth-register-prompt">
              ليس لديك حساب؟ <Link to="/auth/register" state={location.state} className="auth-register-link">أنشئ حسابك الآن</Link>
            </p>
          </form>
            </>
          )}
        </div>
      </main>

      <footer className="auth-bottom">
        {/* r177 → r191: the platform's own identity; the operator-rejected
            provenance slogan is gone — the honest identity stays. */}
        <strong>منصّة تعليم ذكية مستقلّة</strong> · عربية أولًا
      </footer>
    </div>
  );
}
