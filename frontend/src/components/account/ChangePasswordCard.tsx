import { useState, type FormEvent } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, FormField } from '../primitives';
import { Icon } from '../Icon';
import {
  useChangePassword,
  changePasswordPolicy,
  isWrongCurrentPassword,
  changePasswordErrorMessage,
} from '../../hooks/useChangePassword';
import { toast } from '../../lib/toast';

/**
 * ChangePasswordCard — the ONE change-password surface (r180-F4 API).
 *
 * R320 cycle-3 (PAGES-GAP P2-1): this card was born inside the student
 * ProfilePage (§[04]) — but the API serves EVERY authenticated role,
 * and the teacher profile had NO change-password UI at all (verified:
 * zero matches in TeacherProfilePage.tsx). Lifted here verbatim so
 * `/settings` (any-authed) and the student profile share ONE
 * definition; the copy, validation and honest post-success behaviour
 * (this session re-issued its tokens — the OTHER devices were signed
 * out by the tokenVersion bump) are the hook's documented contract.
 *
 * POST /auth/change-password via hooks/useChangePassword. The policy
 * mirror (12–72 chars + the blocklist) is the hook's own export; the
 * field copy mirrors the register form's («12 حرفًا على الأقل» /
 * «كلمة المرور شائعة جدًا…»). Errors stay hidden until the first
 * blur/submit (the reveal convention — a pristine form shows nothing);
 * a 401 INVALID_CREDENTIALS lands ON the current-password field so the
 * user knows WHICH control failed; any other failure (429 limiter,
 * network) renders once below the form.
 */
export function ChangePasswordCard() {
  const submit = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [done, setDone] = useState(false);

  const policyCheck = next ? changePasswordPolicy.safeParse(next) : null;
  const currentError = current ? null : 'أدخل كلمة المرور الحالية.';
  const nextError = !next
    ? 'أدخل كلمة المرور الجديدة.'
    : policyCheck && !policyCheck.success
      ? (policyCheck.error.issues[0]?.message ?? null)
      : null;
  const confirmError = confirm === next ? null : 'كلمتا المرور غير متطابقتين.';

  const wrongCurrent = submit.isError && isWrongCurrentPassword(submit.error);
  const serverMessage = submit.isError && !wrongCurrent
    ? changePasswordErrorMessage(submit.error)
    : null;
  const currentFieldError = wrongCurrent
    ? changePasswordErrorMessage(submit.error)
    : reveal ? (currentError ?? undefined) : undefined;

  const canSubmit = Boolean(current) && Boolean(next) && !nextError && next === confirm;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setReveal(true);
    if (!canSubmit) return; // the inline field errors own this case
    try {
      await submit.mutateAsync({ currentPassword: current, newPassword: next });
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      // Honest copy per the backend contract: this session re-issued
      // its tokens (still logged in), the OTHER devices were signed
      // out by the tokenVersion bump.
      toast.success(
        'تمّ تغيير كلمة المرور — قد تحتاج الجلسات الأخرى إلى تسجيل الدخول مجددًا.',
        { title: 'تمّ التغيير' },
      );
    } catch {
      // surfaced inline from submit.isError below (wrong-current field
      // error or the general server banner)
    }
  };

  return (
    <Card>
      {done && (
        <div className="form-feedback ok" role="status" style={{ marginBlockEnd: 'var(--sp-3)' }}>
          <Icon icon={CheckCircle2} size={14} />
          <span className="flex-1">
            تمّ تغيير كلمة المرور بنجاح — بقيت جلستك الحالية مفتوحة، وقد تحتاج بقية الأجهزة إلى تسجيل الدخول مجددًا.
          </span>
        </div>
      )}
      {serverMessage && (
        <div className="form-feedback fail" role="alert" style={{ marginBlockEnd: 'var(--sp-3)' }}>
          <Icon icon={AlertCircle} size={14} />
          <span className="flex-1">{serverMessage}</span>
        </div>
      )}
      <form className="flex-col gap-3" onSubmit={onSubmit} noValidate>
        <FormField
          label="كلمة المرور الحالية"
          id="pw-current"
          error={currentFieldError}
        >
          {/* dir="ltr": passwords are overwhelmingly Latin runs; the
              input's own directionality keeps the caret sane without
              flipping the label column. */}
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setDone(false); }}
            onBlur={() => setReveal(true)}
            disabled={submit.isPending}
          />
        </FormField>
        <FormField
          label="كلمة المرور الجديدة"
          id="pw-new"
          hint="12 حرفًا على الأقل وحتى 72 حرفًا — تجنّب كلمات المرور الشائعة."
          error={reveal ? (nextError ?? undefined) : undefined}
        >
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={next}
            onChange={(e) => { setNext(e.target.value); setDone(false); }}
            onBlur={() => setReveal(true)}
            disabled={submit.isPending}
          />
        </FormField>
        <FormField
          label="تأكيد كلمة المرور الجديدة"
          id="pw-confirm"
          error={reveal ? (confirmError ?? undefined) : undefined}
        >
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setDone(false); }}
            onBlur={() => setReveal(true)}
            disabled={submit.isPending}
          />
        </FormField>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="btn primary"
            disabled={submit.isPending}
          >
            {submit.isPending ? 'جارٍ التغيير…' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </form>
    </Card>
  );
}
