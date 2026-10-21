import { useEffect, useRef, useState } from 'react';
import { Users, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
/* r252 (Phase B): the directory composes the shell patterns — StatLine
 * facts, FilterBar (search + role pills), and the table becomes dense
 * RowList rows whose actions live behind the inline expansion (the
 * Superlist "detail attached to the item" move). */
import { PageFrame, PageHeader as PatternsPageHeader, StatLine, FilterBar, RowList, RowItem } from '../../components/patterns';
import { Card, Badge, UserAvatar, AlertRow } from '../../components/primitives';
import { ErrorState, EmptyState, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { apiErrorMessage } from '../../hooks/useResources';
import { useOwnerStats, useOwnerUsers, useChangeUserRole, useToggleUserStatus } from '../../hooks/useOwner';
import { formatDate, formatNum } from '../../utils/numbers';

/**
 * Owner user management — the accounts directory.
 *
 * Wave 6-b (audit 0-e P1-24/P1-25 + craft sweep):
 *  - role filter is SERVER-side (the API paginates within the role) — the
 *    old client-side filter hid rows on the current page only
 *  - pagination rebuilt on the .table-pagination system: windowed page
 *    numbers, RTL-correct chevrons (prev points right in RTL), honest
 *    "page X of Y · N users" line, aria-current, disabled edge states
 *  - r252 (Phase B): the 7-column table becomes RowList rows — identity
 *    + role/status at a glance, memberships in the meta line, and the
 *    actions (role picker + status toggle + joined date) behind each
 *    row's inline expansion. Same server contract, same confirm flow.
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
  /** r183-B5: the ACTIVE institution memberships (A9 wave-A P2 — the
   *  directory's institution scope). Empty = the honest «بلا مؤسسة». */
  memberships: OwnerUserMembership[];
}

interface OwnerUserMembership {
  institution: { id: string; name: string; slug: string; status: 'ACTIVE' | 'SUSPENDED' };
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

/** r154e: roles the owner may assign from this console. OWNER is excluded —
 *  the backend blocks owner-role changes here (owner.routes.ts guards the
 *  last-active owner), and creating new owners is not this UI's purpose. */
const ELIGIBLE_ROLES: readonly string[] = ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY'];

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
  if (n >= 3 && n <= 10) return `${formatNum(n)} مستخدمين`;
  return `${formatNum(n)} مستخدماً`;
}

/** A pending mutation targets at most one row — only that row waits. */
type Attempt = { kind: 'role'; user: UserRow; role: string } | { kind: 'status'; user: UserRow };

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
  // mirrors the LibraryPage pattern. The mount-time run carries an
  // unchanged term and must not reset pagination (a page opened inside
  // the first 300ms would silently bounce back to page 1).
  const appliedSearch = useRef(debouncedSearch);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim();
      if (next === appliedSearch.current) return;
      appliedSearch.current = next;
      setDebouncedSearch(next);
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
    memberships: u.memberships ?? [],
  }));

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    /* 6A10-6: per-action confirm verb. Optional so the ConfirmDialog
     * keeps its «تأكيد» default for the 16 other consumers; the three
     * user actions below always pass their own verb so the button
     * names WHAT it does, not a generic "yes". */
    title: string; message: string; danger: boolean; confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }>({ title: '', message: '', danger: false, onConfirm: () => {} });
  /** r154e: the pending role change (select → confirm). While set, the row's
   *  select shows the pending role; on cancel it reverts to the user's real
   *  role. One pending change at a time — the confirm dialog is modal. */
  const [pendingRole, setPendingRole] = useState<{ user: UserRow; role: string } | null>(null);

  /** Runs a row action; failures surface inline with a retry (never a
   *  silent unhandled rejection). */
  const runAttempt = async (attempt: Attempt) => {
    setLastAttempt(attempt);
    const name = `${attempt.user.firstName} ${attempt.user.lastName}`;
    try {
      if (attempt.kind === 'role') {
        await changeRole.mutateAsync({ userId: attempt.user.id, role: attempt.role });
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

  /** r154e: role picker — replaces the binary STUDENT↔TEACHER toggle. The
   *  owner picks any eligible role from the select; promotions to
   *  ADMIN/QUALITY and any demotion from those roles are flagged dangerous
   *  (red confirm) because they change the user's governance capabilities.
   *  r183-B5 (A9 P2 acceptance): the confirm names the user's institution(s)
   *  — scope ambiguity was the finding's whole point. */
  const institutionsLabel = (user: UserRow): string | null =>
    user.memberships.length > 0
      ? user.memberships.map((m) => m.institution.name).join('، ')
      : null;
  const handleRoleSelect = (user: UserRow, role: string) => {
    if (role === user.role) return;
    setPendingRole({ user, role });
    const isSensitive =
      role === 'ADMIN' || role === 'QUALITY' ||
      user.role === 'ADMIN' || user.role === 'QUALITY';
    const insts = institutionsLabel(user);
    setConfirmConfig({
      title: 'تغيير الدور',
      confirmLabel: 'تغيير الدور',
      message: `هل تريد تغيير دور «${user.firstName} ${user.lastName}» من ${ROLE_LABELS[user.role] ?? user.role} إلى ${ROLE_LABELS[role]}؟${insts ? ` عضويته النشطة: ${insts}.` : ' لا عضوية مؤسسة نشطة لهذا الحساب.'}`,
      danger: isSensitive,
      onConfirm: async () => {
        await runAttempt({ kind: 'role', user, role });
        setConfirmOpen(false);
        setPendingRole(null);
      },
    });
    setConfirmOpen(true);
  };

  const handleToggleStatus = (user: UserRow) => {
    setConfirmConfig({
      title: user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب',
      confirmLabel: user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب',
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
    stats.isPending ? '…' : statData ? formatNum(n) : '—';

  /* r299 (honesty): «أكبر شريحة» used to render unconditionally — the
   * hint asserted students are the largest segment without comparing
   * the counts (a teachers-heavy platform would print a false claim).
   * Now the claim only prints where it is true, the dashboard's
   * topSegment idiom (r253) ported to the facts this page already
   * fetched; otherwise the hint stays a neutral noun. */
  const segments = statData
    ? [
        { key: 'students', n: statData.students },
        { key: 'teachers', n: statData.teachers },
        { key: 'staff', n: (statData.admins ?? 0) + (statData.quality ?? 0) },
      ]
    : [];
  const topSegmentKey = segments.length > 0
    ? segments.reduce((a, b) => (b.n > a.n ? b : a)).key
    : null;

  return (
    <PageFrame width="default">
      <PatternsPageHeader
        title="إدارة المستخدمين"
        description="عرض جميع حسابات المنصّة والبحث فيها وإدارتها"
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'المستخدمون' }]}
      />

      {/* Metrics — real values only: '…' while loading, '—' on error
          (never a fake zero). r252: the patterns StatLine. */}
      <StatLine
        items={[
          { label: 'إجمالي المستخدمين', value: kpiValue(statData?.totalUsers ?? 0), hint: 'حسابات مسجَّلة' },
          { label: 'الطلاب', value: kpiValue(statData?.students ?? 0), hint: topSegmentKey === 'students' ? 'الفئة الأكبر' : 'حسابات الطلاب' },
          { label: 'الأساتذة', value: kpiValue(statData?.teachers ?? 0), hint: topSegmentKey === 'teachers' ? 'الفئة الأكبر' : 'هيئة التدريس' },
          { label: 'إداريون وجودة', value: kpiValue((statData?.admins ?? 0) + (statData?.quality ?? 0)), hint: topSegmentKey === 'staff' ? 'الفئة الأكبر' : 'إدارة ومتابعة' },
        ]}
      />

      {/* r252: search + role pills ride one FilterBar rail. */}
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'ابحث بالاسم أو البريد الإلكتروني…',
        }}
        filters={(
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
        )}
      />

      {/* Users list — dense rows with inline expansion (r252). */}
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
          <ListSkeleton rows={6} />
        ) : ownerUsers.isError ? (
          <ErrorState error={ownerUsers.error} onRetry={() => ownerUsers.refetch()} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            illustration="empty-list"
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
          <>
            <RowList aria-label="قائمة المستخدمين">
              {users.map((user) => {
                const joined = new Date(user.createdAt);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const isRecent = joined > sevenDaysAgo;
                return (
                  <RowItem
                    key={user.id}
                    leading={<UserAvatar initials={user.avatarInitials} color={user.avatarColor ?? undefined} size={36} />}
                    title={`${user.firstName} ${user.lastName}`}
                    meta={(
                      <>
                        <bdi className="owner-num" dir="ltr">{user.email}</bdi>
                        {' · '}
                        {user.memberships.length === 0 ? (
                          <span className="text-xs text-subtle">بلا مؤسسة</span>
                        ) : (
                          /* r299: the utility-class + inline-style conflict
                             died — one owner-owned class owns the chips'
                              wrapping anatomy (owner.css). */
                          <span className="owner-membership-chips">
                            {user.memberships.map((m) => (
                              <Badge
                                key={m.institution.id}
                                /* r299: a SUSPENDED institution reads red on
                                   every other surface (the institutions
                                   list, the detail header) — the chip used
                                   to fall back to the neutral badge while
                                   its own text said « · معلّقة». */
                                color={m.institution.status === 'ACTIVE' ? 'brand' : 'red'}
                              >
                                {m.institution.name}
                                {m.institution.status === 'SUSPENDED' ? ' · معلّقة' : ''}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </>
                    )}
                    trailing={(
                      <>
                        <Badge color={ROLE_COLORS[user.role]}>
                          {ROLE_LABELS[user.role] ?? <bdi>{user.role}</bdi>}
                        </Badge>
                        <Badge color={user.isActive ? 'green' : 'red'}>{user.isActive ? 'نشط' : 'معطّل'}</Badge>
                      </>
                    )}
                    expandLabel={`إجراءات ${user.firstName} ${user.lastName}`}
                  >
                    {/* The expansion body — the row's actions (r252): the
                        role picker, the status toggle, and the joined
                        date with its recent dot. Same confirm flow as
                        the table era; nothing fires without its dialog. */}
                    <div className="owner-row-actions">
                      <span className="owner-joined" title={formatDate(joined, { dateStyle: 'full' })}>
                        {isRecent && (
                          <>
                            {/* r299: the recent-join marker is a quiet static
                                dot, NOT the pulsing health-grammar dot —
                                green + heartbeat means "system healthy" and
                                pulled the eye with a status semantic a join
                                date never carried. */}
                            <span className="owner-joined-dot" aria-hidden />
                            <span className="visually-hidden">انضم خلال الأسبوع الماضي — </span>
                          </>
                        )}
                        انضم {formatDate(joined, { dateStyle: 'medium' })}
                      </span>
                      {user.role === 'OWNER' ? (
                        <span className="text-xs text-subtle" title="دور المالك لا يُغيَّر من هذه الواجهة">
                          {ROLE_LABELS.OWNER}
                        </span>
                      ) : (
                        <select
                          className="input"
                          style={{ width: 'auto', minWidth: 120 }}
                          value={pendingRole?.user.id === user.id ? pendingRole.role : user.role}
                          onChange={(e) => handleRoleSelect(user, e.target.value)}
                          disabled={rowBusy(user)}
                          aria-label={`دور ${user.firstName} ${user.lastName}`}
                        >
                          {ELIGIBLE_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => handleToggleStatus(user)}
                        disabled={rowBusy(user)}
                      >
                        {user.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  </RowItem>
                );
              })}
            </RowList>

            {/* Server-side pagination — driven by API meta; bounded page
                window + RTL-correct chevrons (prev points right in RTL).
                r164-i (table-coherence): the footer renders whenever rows
                exist, single page included. */}
            {meta && users.length > 0 && (
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
          </>
        )}
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        danger={confirmConfig.danger}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => { setConfirmOpen(false); setPendingRole(null); }}
      />
    </PageFrame>
  );
}
