import { useState, type InputHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Landmark, ShieldCheck, Ban, RotateCcw, UserPlus,
  Users, GraduationCap, Calendar, ArrowLeft, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { Card, Badge, FormField, AlertRow } from '../../components/primitives';
import { ErrorState, EmptyState, TableSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { Modal } from '../../components/overlays/Modal';
import {
  useCreateInstitution,
  useOwnerInstitutions,
  useProvisionInstitutionAdmin,
  useRestoreInstitutionMembership,
  useRevokeInstitutionMembership,
  useUpdateInstitution,
} from '../../hooks/useInstitutions';
import { apiErrorMessage } from '../../hooks/useResources';
import { toast } from '../../lib/toast';
import type { InstitutionAdminRow, OwnerInstitution } from '../../lib/api';
import { formatDate, formatNum } from '../../utils/numbers';

/**
 * r178 (multi-institution foundation) — the OWNER's institution console.
 *
 * Surfaces the platform-owner half of the contract: create institutions,
 * provision their institutional ADMINs (new users or existing ones),
 * suspend/reactivate an institution, and revoke/restore admin
 * memberships. Mutations land through hooks/useInstitutions.ts
 * (invalidate ['owner','institutions']) with the page's own toast
 * feedback naming the touched institution — D17-3 Arabic copy, the
 * backend's own Arabic message on failure (authErrorView family via
 * apiErrorMessage).
 *
 * Design: the owner console's established grammar (OwnerUsersPage —
 * .page / .page-header / Card + .table + .tbl-stack, Badge statuses,
 * ConfirmDialog for destructive actions, TableSkeleton/ErrorState/
 * EmptyState for the listing's three honest states, FormField for
 * labelled modal fields). No new design language; tokens only.
 */

/** Counted Arabic plural for the institutions total line. */
function institutionsCountLabel(n: number): string {
  if (n === 0) return 'لا مؤسسات';
  if (n === 1) return 'مؤسسة واحدة';
  if (n === 2) return 'مؤسستان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} مؤسسات`;
  return `${formatNum(n)} مؤسسة`;
}

const STATUS_LABELS: Record<OwnerInstitution['status'], string> = {
  ACTIVE: 'نشطة',
  SUSPENDED: 'معلّقة',
};

/* ── Create form ─────────────────────────────────────────────── */

interface CreateDraft {
  name: string;
  nameEn: string;
  slug: string;
}

const EMPTY_CREATE_DRAFT: CreateDraft = { name: '', nameEn: '', slug: '' };

function CreateInstitutionCard({
  isPending,
  error,
  onCreate,
}: {
  isPending: boolean;
  /** The create mutation's last error (r183-B5 — the keep-edits rule:
   *  the draft survives a failed create and the failure is named
   *  inline, mirroring the AdminCoursesPage modal contract). */
  error: unknown;
  /** Resolves true ONLY on success — the child clears its draft then
   *  (and only then). */
  onCreate: (draft: { name: string; nameEn?: string; slug?: string }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<CreateDraft>(EMPTY_CREATE_DRAFT);

  const nameProblem = draft.name.length > 0 && draft.name.trim().length < 2
    ? 'الاسم قصير جدًا — حرفان على الأقل'
    : undefined;
  const canSubmit = draft.name.trim().length >= 2 && !isPending;

  const submit = async () => {
    if (!canSubmit) return;
    const ok = await onCreate({
      name: draft.name.trim(),
      nameEn: draft.nameEn.trim() || undefined,
      slug: draft.slug.trim() || undefined,
    });
    // r183-B5 (A9 P2 — optimistic input loss): the draft is cleared
    // ONLY on success. A 409 slug conflict keeps every field the owner
    // typed with the failure named inline below.
    if (ok) setDraft(EMPTY_CREATE_DRAFT);
  };

  return (
    <Card
      title="إنشاء مؤسسة جديدة"
      subtitle="أضف مؤسسة تعليمية إلى المنصّة — تُنشأ نشطة ويمكن تعيين مديرها بعد ذلك."
      icon={Plus}
    >
      <form
        className="owner-inst-create-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <FormField label="اسم المؤسسة" error={nameProblem} hint="مطلوب — كما سيظهر لأعضاء المؤسسة">
          <input
            className="input"
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="مثلاً: أكاديمية طرابلس للعلوم"
            maxLength={200}
          />
        </FormField>
        <FormField label="الاسم بالإنجليزية (اختياري)">
          <input
            className="input"
            type="text"
            dir="ltr"
            value={draft.nameEn}
            onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))}
            placeholder="Tripoli Academy of Sciences"
            maxLength={200}
          />
        </FormField>
        <FormField
          label="المعرّف (slug — اختياري)"
          hint="أحرف لاتينية صغيرة وأرقام وشرطات؛ يُشتق تلقائيًا إن تُرك فارغًا"
        >
          <input
            className="input"
            type="text"
            dir="ltr"
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            placeholder="inst-example"
            maxLength={64}
          />
        </FormField>
        <button type="submit" className="btn primary sm" disabled={!canSubmit} aria-busy={isPending}>
          <Icon icon={Plus} size={13} />
          {isPending ? 'جارٍ الإنشاء…' : 'إنشاء المؤسسة'}
        </button>
        {error != null && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر إنشاء المؤسسة"
            description={apiErrorMessage(error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </form>
    </Card>
  );
}

/* ── Provision-admin modal ────────────────────────────────────── */

type ProvisionMode = 'new' | 'existing';

interface ProvisionDraft {
  mode: ProvisionMode;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const EMPTY_PROVISION_DRAFT: ProvisionDraft = {
  mode: 'new',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
};

/**
 * FormField-compatible password control (r183-B5, A9 P3): masked by
 * default with an opt-in reveal toggle (the AuthPage Eye/EyeOff grammar
 * on the generic .icon-btn chrome — no auth-scoped CSS leaks into the
 * owner sheet). FormField clones its single child with the control
 * id/aria props, so this component FORWARDS everything it receives
 * onto the inner input — the label htmlFor wiring and the tests'
 * getByLabelText keep working.
 */
function PasswordControl({
  value, onChange, show, onToggle, disabled, ...fieldProps
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /* The FormField-injected control props (id, aria-*) ride the inner
   * input verbatim. `onChange` is Omitted so THIS component's string
   * callback is the only signature — the raw intersection made TS
   * contextually type the call site's parameter as the event union. */
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <span className="flex items-center gap-2">
      {/* dir="ltr": passwords are overwhelmingly Latin runs; the caret
          and masked glyphs must not bidi-flip in RTL (the AuthPage note). */}
      <input
        {...fieldProps}
        className="input"
        style={{ flex: '1 1 auto', minWidth: 0 }}
        type={show ? 'text' : 'password'}
        dir="ltr"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={onToggle}
        aria-pressed={show}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        disabled={disabled}
      >
        <Icon icon={show ? EyeOff : Eye} size={16} />
      </button>
    </span>
  );
}

function ProvisionAdminModal({
  open,
  institution,
  isPending,
  error,
  onClose,
  onProvision,
}: {
  open: boolean;
  institution: OwnerInstitution | null;
  isPending: boolean;
  /** The provision mutation's last error (r183-B5 — the keep-edits
   *  rule: the modal stays open, the draft survives, the failure is
   *  named inline — the settings/detail-page modal contract). */
  error: unknown;
  onClose: () => void;
  /** Resolves true ONLY on success — the child clears its draft then
   *  (and only then). */
  onProvision: (body: {
    mode: ProvisionMode;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<ProvisionDraft>(EMPTY_PROVISION_DRAFT);
  // r183-B5 (A9 P3): masked by default, reveal is opt-in (the AuthPage
  // toggle grammar — aria-pressed + the Eye/EyeOff pair, generic
  // .icon-btn chrome so no auth-scoped CSS leaks into the owner sheet).
  const [showPassword, setShowPassword] = useState(false);

  const emailProblem =
    draft.email.length > 0 && !/.+@.+\..+/.test(draft.email.trim())
      ? 'بريد إلكتروني غير صالح'
      : undefined;
  // mode 'new' follows the platform password policy (12+ — the backend
  // applies the shared passwordSchema; the FE gate mirrors it so the
  // owner sees the rule before the 400).
  const passwordProblem =
    draft.mode === 'new' && draft.password.length > 0 && draft.password.length < 12
      ? '12 حرفًا على الأقل'
      : undefined;
  const canSubmit =
    /.+@.+\..+/.test(draft.email.trim()) &&
    (draft.mode === 'existing' || draft.password.length >= 12) &&
    !isPending;

  const close = () => {
    setDraft(EMPTY_PROVISION_DRAFT);
    setShowPassword(false);
    onClose();
  };

  const submit = async () => {
    if (!canSubmit) return;
    const ok = await onProvision({
      mode: draft.mode,
      email: draft.email.trim().toLowerCase(),
      firstName: draft.firstName.trim() || undefined,
      lastName: draft.lastName.trim() || undefined,
      password: draft.mode === 'new' ? draft.password : undefined,
    });
    // r183-B5 (A9 P2 — optimistic input loss): the draft is cleared
    // ONLY on success (the parent closes the modal then — this reset
    // keeps a stale draft from riding into the next open). A failed
    // provision (404 unknown email, 409 …) keeps every field the owner
    // typed with the failure named inline below.
    if (ok) {
      setDraft(EMPTY_PROVISION_DRAFT);
      setShowPassword(false);
    }
  };

  return (
    <Modal open={open} onClose={close} ariaLabel="تعيين مدير مؤسسة">
      <div className="modal-header">
        {/* r183-B5 (A9 P3): h3 — the owner modals' heading grammar (the
            four detail-page modals all use h3.modal-title). */}
        <h3 className="modal-title">تعيين مدير مؤسسة</h3>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="modal-body">
          {institution && (
            <p className="owner-confirm-message" style={{ marginBlockEnd: 'var(--sp-4)' }}>
              {institution.name} — يُمنح الدور داخل هذه المؤسسة فقط.
            </p>
          )}

          <FormField label="نوع المستخدم">
            <select
              className="input"
              value={draft.mode}
              onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as ProvisionMode }))}
            >
              <option value="new">مستخدم جديد — يُنشأ حساب بكلمة مرور</option>
              <option value="existing">مستخدم قائم — يُربط بالمؤسسة</option>
            </select>
          </FormField>

          <FormField label="البريد الإلكتروني" error={emailProblem} hint="مطلوب">
            <input
              className="input"
              type="email"
              dir="ltr"
              autoComplete="off"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="admin@example.com"
            />
          </FormField>

          {draft.mode === 'new' && (
            <>
              <div className="auth-row-2">
                <FormField label="الاسم الأول">
                  <input
                    className="input"
                    type="text"
                    value={draft.firstName}
                    onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                    maxLength={60}
                  />
                </FormField>
                <FormField label="اللقب">
                  <input
                    className="input"
                    type="text"
                    value={draft.lastName}
                    onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                    maxLength={60}
                  />
                </FormField>
              </div>
              <FormField label="كلمة المرور" error={passwordProblem} hint="مطلوبة — 12 حرفًا على الأقل">
                <PasswordControl
                  value={draft.password}
                  onChange={(v) => setDraft((d) => ({ ...d, password: v }))}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  disabled={isPending}
                />
              </FormField>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={close} disabled={isPending}>
            إلغاء
          </button>
          <button type="submit" className="btn primary" disabled={!canSubmit} aria-busy={isPending}>
            <Icon icon={UserPlus} size={13} />
            {isPending ? 'جارٍ التعيين…' : 'تعيين المدير'}
          </button>
        </div>
        {error != null && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر تعيين المدير"
            description={apiErrorMessage(error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </form>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export function OwnerInstitutionsPage() {
  const listing = useOwnerInstitutions();
  const createM = useCreateInstitution();
  const updateM = useUpdateInstitution();
  const provisionM = useProvisionInstitutionAdmin();
  const revokeM = useRevokeInstitutionMembership();
  const restoreM = useRestoreInstitutionMembership();

  const [provisionTarget, setProvisionTarget] = useState<OwnerInstitution | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    danger: boolean;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }>({ title: '', message: '', danger: false, onConfirm: () => {} });

  const institutions = listing.data ?? [];
  const mutationBusy =
    createM.isPending || updateM.isPending || provisionM.isPending ||
    revokeM.isPending || restoreM.isPending;

  /* ── Create ─────────────────────────────────────────────── */
  /* r183-B5 (A9 P2 — optimistic input loss): mutateAsync + a boolean
   * result — the create card clears its draft only on success; the
   * failure is named inline by the card's AlertRow (the 409 slug
   * conflict carries its own Arabic message from the backend), the
   * toast keeps the positive side. */
  const onCreate = async (draft: { name: string; nameEn?: string; slug?: string }): Promise<boolean> => {
    try {
      const { institution } = await createM.mutateAsync(draft);
      toast.success(`أُنشئت «${institution.name}» وهي نشطة الآن.`, { title: 'تمّ إنشاء المؤسسة' });
      return true;
    } catch {
      return false;
    }
  };

  /* ── Suspend / reactivate ───────────────────────────────── */
  const onToggleStatus = (institution: OwnerInstitution) => {
    const suspending = institution.status === 'ACTIVE';
    setConfirmConfig({
      title: suspending ? 'تعليق المؤسسة' : 'تنشيط المؤسسة',
      confirmLabel: suspending ? 'تعليق المؤسسة' : 'تنشيط المؤسسة',
      message: suspending
        ? `هل تريد تعليق «${institution.name}»؟ لن يتمكّن أعضاؤها من الوصول إلى سياق المؤسسة حتى تُنشَّط مجددًا.`
        : `هل تريد إعادة تنشيط «${institution.name}»؟ سيستعيد أعضاؤها النشطون وصولهم.`,
      danger: suspending,
      onConfirm: async () => {
        setConfirmOpen(false);
        updateM.mutate(
          { id: institution.id, patch: { status: suspending ? 'SUSPENDED' : 'ACTIVE' } },
          {
            onSuccess: () => {
              toast.success(
                suspending ? `تمّ تعليق «${institution.name}».` : `أُعيد تنشيط «${institution.name}».`,
                { title: 'تمّ تحديث الحالة' },
              );
            },
            onError: (error) => {
              toast.error(
                apiErrorMessage(error, 'تعذّر تحديث حالة المؤسسة — حاول مجدداً.'),
                { title: 'تعذّر التحديث' },
              );
            },
          },
        );
      },
    });
    setConfirmOpen(true);
  };

  /* ── Provision admin ────────────────────────────────────── */
  /* r183-B5 (A9 P2): same keep-edits contract — the modal closes ONLY
   * on success (the old code closed it right after mutate(), so a 404
   * unknown-email or 409 swallowed the draft and the error landed on a
   * page without context). The inline AlertRow names the failure. */
  const onProvision = async (body: {
    mode: ProvisionMode;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }): Promise<boolean> => {
    const target = provisionTarget;
    if (!target) return false;
    try {
      const { user } = await provisionM.mutateAsync({ institutionId: target.id, body });
      toast.success(
        `تمّ تعيين ${user.firstName} ${user.lastName} مديرًا لـ«${target.name}».`,
        { title: 'تمّ التعيين' },
      );
      setProvisionTarget(null);
      return true;
    } catch {
      return false; // the modal stays open; the draft stays typed.
    }
  };

  /* ── Membership revoke / restore ────────────────────────── */
  const onRevokeAdmin = (institution: OwnerInstitution, admin: InstitutionAdminRow) => {
    setConfirmConfig({
      title: 'إلغاء عضوية مدير',
      confirmLabel: 'إلغاء العضوية',
      message: `هل تريد إلغاء عضوية «${admin.firstName} ${admin.lastName}» في «${institution.name}»؟ سيفقد وصوله إلى سياق هذه المؤسسة فورًا.`,
      danger: true,
      onConfirm: async () => {
        setConfirmOpen(false);
        revokeM.mutate(
          { institutionId: institution.id, membershipId: admin.membershipId },
          {
            onSuccess: () => {
              toast.success(`أُلغيت عضوية ${admin.firstName} في «${institution.name}».`, {
                title: 'تمّ إلغاء العضوية',
              });
            },
            onError: (error) => {
              toast.error(
                apiErrorMessage(error, 'تعذّر إلغاء العضوية — حاول مجدداً.'),
                { title: 'تعذّر الإلغاء' },
              );
            },
          },
        );
      },
    });
    setConfirmOpen(true);
  };

  const onRestoreAdmin = (institution: OwnerInstitution, admin: InstitutionAdminRow) => {
    restoreM.mutate(
      { institutionId: institution.id, membershipId: admin.membershipId },
      {
        onSuccess: () => {
          toast.success(`أُعيدت عضوية ${admin.firstName} في «${institution.name}».`, {
            title: 'تمّت الاستعادة',
          });
        },
        onError: (error) => {
          toast.error(
            apiErrorMessage(error, 'تعذّرت استعادة العضوية — حاول مجدداً.'),
            { title: 'تعذّرت الاستعادة' },
          );
        },
      },
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المؤسسات</h1>
          <p className="page-subtitle">إدارة المؤسسات التعليمية على المنصّة</p>
        </div>
      </header>

      <CreateInstitutionCard
        isPending={createM.isPending}
        error={createM.isError ? createM.error : null}
        onCreate={onCreate}
      />

      <Card className="owner-users-card" title="المؤسسات المسجّلة">
        {listing.isPending ? (
          <TableSkeleton rows={4} cols={6} />
        ) : listing.isError ? (
          <ErrorState error={listing.error} onRetry={() => listing.refetch()} />
        ) : institutions.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="لا توجد مؤسسات بعد"
            description="أنشئ أول مؤسسة تعليمية من النموذج أعلاه لبدء استقبال أعضائها."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">المؤسسة</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">الأعضاء النشطون</th>
                  <th scope="col">الكليات</th>
                  <th scope="col">المديرون</th>
                  <th scope="col">تاريخ الإنشاء</th>
                  <th scope="col">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((institution) => (
                  <tr key={institution.id}>
                    <td className="tbl-strong" data-label="المؤسسة">
                      <div className="owner-inst-cell">
                        <span className="owner-inst-name">{institution.name}</span>
                        {institution.nameEn && (
                          <span className="owner-inst-sub" dir="ltr">{institution.nameEn}</span>
                        )}
                        <span className="owner-inst-sub font-mono" dir="ltr">{institution.slug}</span>
                      </div>
                    </td>
                    <td data-label="الحالة">
                      <Badge color={institution.status === 'ACTIVE' ? 'green' : 'red'}>
                        {STATUS_LABELS[institution.status]}
                      </Badge>
                    </td>
                    <td data-label="الأعضاء النشطون">
                      <span className="owner-inst-metric">
                        <Icon icon={Users} size={13} />
                        {formatNum(institution.activeMembershipCount)}
                      </span>
                    </td>
                    <td data-label="الكليات">
                      <span className="owner-inst-metric">
                        <Icon icon={GraduationCap} size={13} />
                        {formatNum(institution.facultyCount)}
                      </span>
                    </td>
                    <td data-label="المديرون">
                      {institution.admins.length === 0 ? (
                        <span className="text-xs text-subtle">لا مديرين بعد</span>
                      ) : (
                        <ul className="owner-inst-admins">
                          {institution.admins.map((admin) => (
                            <li key={admin.membershipId}>
                              <span className="owner-inst-admin-name">
                                {admin.firstName} {admin.lastName}
                                {admin.isActive ? '' : ' · معطّلة'}
                              </span>
                              <bdi className="owner-inst-admin-email" dir="ltr">{admin.email}</bdi>
                              <button
                                type="button"
                                className="btn ghost sm"
                                disabled={mutationBusy}
                                onClick={() =>
                                  admin.isActive
                                    ? onRevokeAdmin(institution, admin)
                                    : onRestoreAdmin(institution, admin)
                                }
                              >
                                <Icon icon={admin.isActive ? Ban : RotateCcw} size={12} />
                                {admin.isActive ? 'إلغاء العضوية' : 'استعادة'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td data-label="تاريخ الإنشاء">
                      <span className="owner-inst-metric">
                        <Icon icon={Calendar} size={13} />
                        {formatDate(institution.createdAt, { dateStyle: 'medium' })}
                      </span>
                    </td>
                    <td data-label="إجراءات">
                      <span className="table-row-actions">
                        {/* r181 (phase-8 owner setup): the institution's own
                            academic-setup context — faculties → departments
                            → courses → offerings, all bound to THIS
                            institution's slug. */}
                        <Link
                          to={`/owner/institutions/${institution.slug}`}
                          className="btn ghost sm"
                          title={`فتح سياق «${institution.name}» وإعداد بنيتها الأكاديمية`}
                        >
                          <Icon icon={ArrowLeft} size={13} />
                          فتح المؤسسة
                        </Link>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setProvisionTarget(institution)}
                          disabled={mutationBusy}
                          title={`تعيين مدير لـ«${institution.name}»`}
                        >
                          <Icon icon={ShieldCheck} size={13} />
                          تعيين مدير
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => onToggleStatus(institution)}
                          disabled={mutationBusy}
                        >
                          <Icon icon={institution.status === 'ACTIVE' ? Ban : RotateCcw} size={13} />
                          {institution.status === 'ACTIVE' ? 'تعليق' : 'تنشيط'}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-pagination">
              <span>{institutionsCountLabel(institutions.length)}</span>
            </div>
          </div>
        )}
      </Card>

      <ProvisionAdminModal
        open={provisionTarget !== null}
        institution={provisionTarget}
        isPending={provisionM.isPending}
        error={provisionM.isError ? provisionM.error : null}
        onClose={() => {
          setProvisionTarget(null);
          /* A user-initiated close discards the attempt with its error —
           * the next open (maybe another institution) starts clean. */
          provisionM.reset();
        }}
        onProvision={onProvision}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        danger={confirmConfig.danger}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
