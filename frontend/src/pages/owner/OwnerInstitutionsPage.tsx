import { useState } from 'react';
import {
  Plus, Landmark, ShieldCheck, Ban, RotateCcw, UserPlus,
  Users, GraduationCap, Calendar,
} from 'lucide-react';
import { Card, Badge, FormField } from '../../components/primitives';
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
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-LY')} مؤسسات`;
  return `${n.toLocaleString('ar-LY')} مؤسسة`;
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
  onCreate,
}: {
  isPending: boolean;
  onCreate: (draft: { name: string; nameEn?: string; slug?: string }) => void;
}) {
  const [draft, setDraft] = useState<CreateDraft>(EMPTY_CREATE_DRAFT);

  const nameProblem = draft.name.length > 0 && draft.name.trim().length < 2
    ? 'الاسم قصير جدًا — حرفان على الأقل'
    : undefined;
  const canSubmit = draft.name.trim().length >= 2 && !isPending;

  const submit = () => {
    if (!canSubmit) return;
    onCreate({
      name: draft.name.trim(),
      nameEn: draft.nameEn.trim() || undefined,
      slug: draft.slug.trim() || undefined,
    });
    setDraft(EMPTY_CREATE_DRAFT);
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
          submit();
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

function ProvisionAdminModal({
  open,
  institution,
  isPending,
  onClose,
  onProvision,
}: {
  open: boolean;
  institution: OwnerInstitution | null;
  isPending: boolean;
  onClose: () => void;
  onProvision: (body: {
    mode: ProvisionMode;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) => void;
}) {
  const [draft, setDraft] = useState<ProvisionDraft>(EMPTY_PROVISION_DRAFT);

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
    onClose();
  };

  const submit = () => {
    if (!canSubmit) return;
    onProvision({
      mode: draft.mode,
      email: draft.email.trim().toLowerCase(),
      firstName: draft.firstName.trim() || undefined,
      lastName: draft.lastName.trim() || undefined,
      password: draft.mode === 'new' ? draft.password : undefined,
    });
    setDraft(EMPTY_PROVISION_DRAFT);
  };

  return (
    <Modal open={open} onClose={close} ariaLabel="تعيين مدير مؤسسة">
      <div className="modal-header">
        <div className="modal-title">تعيين مدير مؤسسة</div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
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
                <input
                  className="input"
                  type="text"
                  dir="ltr"
                  autoComplete="new-password"
                  value={draft.password}
                  onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
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
  const onCreate = (draft: { name: string; nameEn?: string; slug?: string }) => {
    createM.mutate(draft, {
      onSuccess: ({ institution }) => {
        toast.success(`أُنشئت «${institution.name}» وهي نشطة الآن.`, { title: 'تمّ إنشاء المؤسسة' });
      },
      onError: (error) => {
        // 409 slug conflict carries its own Arabic message.
        toast.error(
          apiErrorMessage(error, 'تعذّر إنشاء المؤسسة — حاول مجدداً.'),
          { title: 'تعذّر الإنشاء' },
        );
      },
    });
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
  const onProvision = (body: {
    mode: ProvisionMode;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) => {
    const target = provisionTarget;
    if (!target) return;
    provisionM.mutate(
      { institutionId: target.id, body },
      {
        onSuccess: ({ user }) => {
          toast.success(
            `تمّ تعيين ${user.firstName} ${user.lastName} مديرًا لـ«${target.name}».`,
            { title: 'تمّ التعيين' },
          );
        },
        onError: (error) => {
          toast.error(
            apiErrorMessage(error, 'تعذّر تعيين المدير — حاول مجدداً.'),
            { title: 'تعذّر التعيين' },
          );
        },
      },
    );
    setProvisionTarget(null);
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

      <CreateInstitutionCard isPending={createM.isPending} onCreate={onCreate} />

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
                        {institution.activeMembershipCount.toLocaleString('ar-LY')}
                      </span>
                    </td>
                    <td data-label="الكليات">
                      <span className="owner-inst-metric">
                        <Icon icon={GraduationCap} size={13} />
                        {institution.facultyCount.toLocaleString('ar-LY')}
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
                        {new Date(institution.createdAt).toLocaleDateString('ar-LY', { dateStyle: 'medium' })}
                      </span>
                    </td>
                    <td data-label="إجراءات">
                      <span className="table-row-actions">
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
        onClose={() => setProvisionTarget(null)}
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
