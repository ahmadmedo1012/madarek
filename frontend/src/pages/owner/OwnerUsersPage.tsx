import { useEffect, useState, type CSSProperties } from 'react';
import {
  Users, GraduationCap, BookOpen, ShieldCheck, Search,
  ChevronLeft, ChevronRight, X, AlertCircle,
} from 'lucide-react';
import { Card, MetricCard, Badge, UserAvatar, AlertRow } from '../../components/primitives';
import { ErrorState, EmptyState, TableSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { apiErrorMessage } from '../../hooks/useResources';
import { useOwnerStats, useOwnerUsers, useChangeUserRole, useToggleUserStatus } from '../../hooks/useOwner';

/**
 * Owner user management — the accounts directory.
 *
 * Wave 6-b (audit 0-e P1-24/P1-25 + craft sweep):
 *  - role filter is SERVER-side (the API paginates within the role) — the
 *    old client-side filter hid rows on the current page only
 *  - pagination rebuilt on the .table-pagination system: windowed page
 *    numbers, RTL-correct chevrons (prev points right in RTL), honest
 *    "page X of Y · N users" line, aria-current, disabled edge states
 *  - table migrated to the .table system + .tbl-stack mobile collapse,
 *    row actions reveal on hover/focus (.table-row-actions)
 *  - row entrance stagger is the page's authored moment (owner.css §6-b)
 */

type RoleFilter = 'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarInitials: string;
  avatarColor: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إداري',
  // Person-noun, unified with nav.ts ROLE_LABELS (17-a2 / 15-j P1-8).
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

const ROLE_COLORS: Record<string, 'brand' | 'green' | 'purple' | 'gold' | 'amber'> = {
  STUDENT: 'brand',
  TEACHER: 'green',
  ADMIN: 'purple',
  QUALITY: 'gold',
  OWNER: 'amber',
};

/** Pages rendered either side of the current one before an ellipsis gap. */
const PAGE_NEIGHBORS = 2;

/**
 * Bounded page list: always 1 and the last page, a window around the
 * current page, and 'gap' markers where numbers were elided — a
 * 200-page result renders ≤ 2·PAGE_NEIGHBORS + 4 buttons, never 200
 * (audit 0-e P1-25). Exported pure — pinned by
 * tests/unit/OwnerUsersPage-pagination.test.ts (audit 11-f P2-14).
 */
export function pageList(page: number, totalPages: number): Array<number | 'gap'> {
  const include = new Set<number>([1, totalPages]);
  const from = Math.max(1, page - PAGE_NEIGHBORS);
  const to = Math.min(totalPages, page + PAGE_NEIGHBORS);
  for (let p = from; p <= to; p++) include.add(p);
  const out: Array<number | 'gap'> = [];
  let prev = 0;
  for (const p of [...include].sort((a, b) => a - b)) {
    if (p - prev > 1) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

/** Proper Arabic counted plural for the users total. */
function usersCountLabel(n: number): string {
  if (n === 0) return 'لا مستخدمين';
  if (n === 1) return 'مستخدم واحد';
  if (n === 2) return 'مستخدمان';
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-LY')} مستخدمين`;
  return `${n.toLocaleString('ar-LY')} مستخدماً`;
}

/** A pending mutation targets at most one row — only that row waits. */
type Attempt = { kind: 'role' | 'status'; user: UserRow };

export function OwnerUsersPage() {
  const stats = useOwnerStats();
  const changeRole = useChangeUserRole();
  const toggleStatus = useToggleUserStatus();

  const statData = stats.data;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<{ title: string; detail: string } | null>(null);
  /** Last attempted row action — powers the inline retry (5-b pattern). */
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);

  // Debounce the search input (250–300ms of idle typing) so the users
  // query fires once typing pauses instead of on every keystroke —
  // mirrors the LibraryPage pattern.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const ownerUsers = useOwnerUsers({
    page,
    limit: 20,
    q: debouncedSearch || undefined,
    // Server-side role filter (audit 0-e P1-24): the API paginates within
    // the role, so pill counts and pagination meta always agree.
    role: roleFilter === 'ALL' ? undefined : roleFilter,
  });
  const users: UserRow[] = (ownerUsers.data?.data ?? []).map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    avatarInitials: u.avatarInitials ?? u.firstName.charAt(0) + u.lastName.charAt(0),
    // null color → the .avatar primitive's own copper-pastel default
    // (token-clean; was a hardcoded #3b82f6, audit 0-e P2-35)
    avatarColor: u.avatarColor ?? null,
    createdAt: u.createdAt,
  }));

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; message: string; danger: boolean; onConfirm: () => void | Promise<void>;
  }>({ title: '', message: '', danger: false, onConfirm: () => {} });

  /** Runs a row action; failures surface inline with a retry (never a
   *  silent unhandled rejection). */
  const runAttempt = async (attempt: Attempt) => {
    setLastAttempt(attempt);
    const name = `${attempt.user.firstName} ${attempt.user.lastName}`;
    try {
      if (attempt.kind === 'role') {
        const newRole = attempt.user.role === 'STUDENT' ? 'TEACHER' : 'STUDENT';
        await changeRole.mutateAsync({ userId: attempt.user.id, role: newRole });
      } else {
        await toggleStatus.mutateAsync({ userId: attempt.user.id, isActive: !attempt.user.isActive });
      }
      setActionError(null);
    } catch (e) {
      setActionError({
        title: attempt.kind === 'role'
          ? `تعذَّر تغيير دور «${name}»`
          : `تعذَّر تحديث حالة حساب «${name}»`,
        detail: apiErrorMessage(e, 'حاول مرة أخرى بعد لحظات.'),
      });
    }
  };

  const handleRoleChange = (user: UserRow) => {
    const newRole = user.role === 'STUDENT' ? 'TEACHER' : 'STUDENT';
    setConfirmConfig({
      title: 'تغيير الدور',
      message: `هل تريد تغيير دور «${user.firstName} ${user.lastName}» من ${ROLE_LABELS[user.role] ?? user.role} إلى ${ROLE_LABELS[newRole]}؟`,
      danger: false,
      onConfirm: async () => {
        await runAttempt({ kind: 'role', user });
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const handleToggleStatus = (user: UserRow) => {
    setConfirmConfig({
      title: user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب',
      message: user.isActive
        ? `هل تريد تعطيل حساب «${user.firstName} ${user.lastName}»؟ لن يتمكّن من الدخول إلى المنصّة.`
        : `هل تريد إعادة تفعيل حساب «${user.firstName} ${user.lastName}»؟ سيتمكّن من الدخول مجدداً.`,
      danger: user.isActive,
      onConfirm: async () => {
        await runAttempt({ kind: 'status', user });
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const filterItems: Array<{ value: RoleFilter; label: string }> = [
    { value: 'ALL', label: 'الكل' },
    { value: 'STUDENT', label: 'طلاب' },
    { value: 'TEACHER', label: 'أساتذة' },
    { value: 'ADMIN', label: 'إداريون' },
    { value: 'QUALITY', label: 'أخصائيو جودة' },
  ];

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters = roleFilter !== 'ALL' || debouncedSearch !== '';

  const meta = ownerUsers.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const rowBusy = (user: UserRow) =>
    (changeRole.isPending && changeRole.variables?.userId === user.id) ||
    (toggleStatus.isPending && toggleStatus.variables?.userId === user.id);
  const mutationBusy = changeRole.isPending || toggleStatus.isPending;

  const kpiValue = (n: number) =>
    stats.isPending ? '…' : statData ? n.toLocaleString('ar-LY') : '—';

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة المستخدمين</h1>
          <p className="page-subtitle">عرض جميع حسابات المنصّة والبحث فيها وإدارتها</p>
        </div>
      </header>

      {/* Metrics — real values only: '…' while loading, '—' on error
          (never a fake zero). */}
      <div className="grid-4">
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={kpiValue(statData?.totalUsers ?? 0)} color="brand" />
        <MetricCard icon={GraduationCap} label="الطلاب" value={kpiValue(statData?.students ?? 0)} color="green" />
        <MetricCard icon={BookOpen} label="الأساتذة" value={kpiValue(statData?.teachers ?? 0)} color="purple" />
        <MetricCard icon={ShieldCheck} label="إداريون وجودة" value={kpiValue((statData?.admins ?? 0) + (statData?.quality ?? 0))} color="gold" />
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="owner-search-bar">
          <Icon icon={Search} size={16} />
          <input
            type="search"
            placeholder="ابحث بالاسم أو البريد الإلكتروني…"
            aria-label="بحث في حسابات المستخدمين"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="owner-filter-pills" role="group" aria-label="تصفية حسب الدور">
          {filterItems.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`pill${roleFilter === f.value ? ' on' : ''}`}
              aria-pressed={roleFilter === f.value}
              onClick={() => { setRoleFilter(f.value); setPage(1); }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Users Table */}
      <Card className="owner-users-card">
        {actionError && (
          <AlertRow
            color="red"
            icon={AlertCircle}
            title={actionError.title}
            description={actionError.detail}
            actions={
              <>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => lastAttempt && void runAttempt(lastAttempt)}
                  disabled={mutationBusy || !lastAttempt}
                >
                  إعادة المحاولة
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setActionError(null)}
                  disabled={mutationBusy}
                >
                  إغلاق
                </button>
              </>
            }
          />
        )}

        {ownerUsers.isPending ? (
          <TableSkeleton rows={6} cols={6} />
        ) : ownerUsers.isError ? (
          <ErrorState error={ownerUsers.error} onRetry={() => ownerUsers.refetch()} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasActiveFilters ? 'لا نتائج مطابقة' : 'لا يوجد مستخدمون بعد'}
            description={hasActiveFilters
              ? 'لم نجد حسابات تطابق البحث أو الدور المحدّد.'
              : 'ستظهر الحسابات هنا فور تسجيل أوّل مستخدم في المنصّة.'}
            action={hasActiveFilters ? (
              <button type="button" className="btn ghost sm" onClick={clearFilters}>
                <Icon icon={X} size={13} />
                مسح البحث والفلاتر
              </button>
            ) : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack owner-users-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>تاريخ الانضمام</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const joined = new Date(user.createdAt);
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  const isRecent = joined > sevenDaysAgo;
                  return (
                    <tr key={user.id} style={{ '--row-i': i } as CSSProperties}>
                      <td className="tbl-strong" data-label="المستخدم">
                        <div className="owner-user-cell">
                          <UserAvatar initials={user.avatarInitials} color={user.avatarColor ?? undefined} size={32} />
                          <span className="name">{user.firstName} {user.lastName}</span>
                        </div>
                      </td>
                      <td data-label="البريد الإلكتروني">
                        <bdi className="owner-num" dir="ltr">{user.email}</bdi>
                      </td>
                      <td data-label="الدور">
                        <Badge color={ROLE_COLORS[user.role]}>
                          {ROLE_LABELS[user.role] ?? <bdi>{user.role}</bdi>}
                        </Badge>
                      </td>
                      <td data-label="الحالة">
                        <Badge color={user.isActive ? 'green' : 'red'}>{user.isActive ? 'نشط' : 'معطّل'}</Badge>
                      </td>
                      <td data-label="تاريخ الانضمام">
                        <span className="owner-joined" title={joined.toLocaleDateString('ar-LY', { dateStyle: 'full' })}>
                          {isRecent && (
                            <>
                              <span className="owner-health-dot green" aria-hidden />
                              <span className="visually-hidden">انضم خلال الأسبوع الماضي — </span>
                            </>
                          )}
                          {joined.toLocaleDateString('ar-LY', { dateStyle: 'medium' })}
                        </span>
                      </td>
                      <td data-label="إجراءات">
                        {/* Actions stay quiet until the row is hovered /
                            focused (CSS .table-row-actions — persistent on
                            touch); part of the page's authored moment. */}
                        <span className="table-row-actions owner-row-actions">
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => handleRoleChange(user)}
                            disabled={rowBusy(user)}
                          >
                            تغيير الدور
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => handleToggleStatus(user)}
                            disabled={rowBusy(user)}
                          >
                            {user.isActive ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Server-side pagination — driven by API meta; bounded page
                window + RTL-correct chevrons (prev points right in RTL). */}
            {meta && totalPages > 1 && (
              <div className="table-pagination">
                <span>
                  الصفحة {page} من {totalPages} · {usersCountLabel(meta.total)}
                </span>
                <div className="table-pagination-actions">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="الصفحة السابقة"
                  >
                    <Icon icon={ChevronRight} size={14} aria-hidden />
                    السابق
                  </button>
                  {pageList(page, totalPages).map((item, i) =>
                    item === 'gap' ? (
                      <span key={`gap-${i}`} className="owner-page-gap" aria-hidden>…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        aria-current={item === page ? 'page' : undefined}
                        aria-label={`الصفحة ${item}`}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    aria-label="الصفحة التالية"
                  >
                    التالي
                    <Icon icon={ChevronLeft} size={14} aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        danger={confirmConfig.danger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
