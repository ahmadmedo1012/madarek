import { useState } from 'react';
import { Users, GraduationCap, BookOpen, ShieldCheck, Search } from 'lucide-react';
import { Card, MetricCard, Badge, UserAvatar, Pill } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { useOwnerStats, useOwnerUsers, useChangeUserRole, useToggleUserStatus } from '../../hooks/useOwner';

type RoleFilter = 'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarInitials: string;
  avatarColor: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إداري',
  QUALITY: 'جودة',
  OWNER: 'مالك',
};

const ROLE_COLORS: Record<string, 'brand' | 'green' | 'purple' | 'gold' | 'amber'> = {
  STUDENT: 'brand',
  TEACHER: 'green',
  ADMIN: 'purple',
  QUALITY: 'gold',
  OWNER: 'amber',
};

export function OwnerUsersPage() {
  const stats = useOwnerStats();
  const changeRole = useChangeUserRole();
  const toggleStatus = useToggleUserStatus();

  const statData = stats.data;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);

  const ownerUsers = useOwnerUsers({ page, limit: 20, q: search || undefined });
  const liveUsers: UserRow[] = (ownerUsers.data?.data ?? []).map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    avatarInitials: u.avatarInitials ?? u.firstName.charAt(0) + u.lastName.charAt(0),
    avatarColor: u.avatarColor ?? '#3b82f6',
    createdAt: u.createdAt,
  }));

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; message: string; danger: boolean; onConfirm: () => void | Promise<void>;
  }>({ title: '', message: '', danger: false, onConfirm: () => {} });

  const filteredUsers = liveUsers.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    return true;
  });

  const handleRoleChange = (user: UserRow) => {
    const newRole = user.role === 'STUDENT' ? 'TEACHER' : 'STUDENT';
    setConfirmConfig({
      title: 'تغيير الدور',
      message: `هل تريد تغيير دور "${user.firstName} ${user.lastName}" من ${ROLE_LABELS[user.role]} إلى ${ROLE_LABELS[newRole]}؟`,
      danger: false,
      onConfirm: async () => {
        await changeRole.mutateAsync({ userId: user.id, role: newRole });
        setConfirmOpen(false);
      },
    });
    setConfirmOpen(true);
  };

  const handleToggleStatus = (user: UserRow) => {
    setConfirmConfig({
      title: user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب',
      message: user.isActive
        ? `هل تريد تعطيل حساب "${user.firstName} ${user.lastName}"؟ لن يتمكّن من الدخول.`
        : `هل تريد إعادة تفعيل حساب "${user.firstName} ${user.lastName}"؟`,
      danger: user.isActive,
      onConfirm: async () => {
        await toggleStatus.mutateAsync({ userId: user.id, isActive: !user.isActive });
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
    { value: 'QUALITY', label: 'جودة' },
  ];

  const meta = ownerUsers.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة المستخدمين</h1>
          <p className="page-subtitle">عرض، بحث، وإدارة جميع حسابات المنصة</p>
        </div>
      </header>

      {/* Metrics — gated on real stats; nothing rendered if the API fails */}
      <div className="grid-4">
        <MetricCard
          icon={Users}
          label="إجمالي المستخدمين"
          value={statData ? statData.totalUsers.toLocaleString('ar-LY') : '—'}
          color="brand"
        />
        <MetricCard
          icon={GraduationCap}
          label="الطلاب"
          value={statData ? statData.students.toLocaleString('ar-LY') : '—'}
          color="green"
        />
        <MetricCard
          icon={BookOpen}
          label="الأساتذة"
          value={statData ? statData.teachers.toLocaleString('ar-LY') : '—'}
          color="purple"
        />
        <MetricCard
          icon={ShieldCheck}
          label="إداريون وجودة"
          value={statData ? (statData.admins + statData.quality).toLocaleString('ar-LY') : '—'}
          color="gold"
        />
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="owner-search-bar">
          <Icon icon={Search} size={16} style={{ color: 'var(--text-subtle)' }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="owner-filter-pills">
          {filterItems.map((f) => (
            <Pill key={f.value} on={roleFilter === f.value} onClick={() => { setRoleFilter(f.value); setPage(1); }}>
              {f.label}
            </Pill>
          ))}
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {ownerUsers.isPending ? (
          <LoadingState />
        ) : ownerUsers.isError ? (
          <ErrorState error={ownerUsers.error} onRetry={() => ownerUsers.refetch()} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title={search ? 'لا توجد نتائج' : 'لا يوجد مستخدمون'}
            description={search ? 'جرّب بحثاً آخر أو فلتراً مختلفاً.' : undefined}
          />
        ) : (
          <table className="owner-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>تاريخ الانضمام</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="owner-user-cell">
                      <UserAvatar initials={user.avatarInitials} color={user.avatarColor} size={32} />
                      <span className="name">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{user.email}</td>
                  <td><Badge color={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Badge></td>
                  <td><Badge color={user.isActive ? 'green' : 'red'}>{user.isActive ? 'نشط' : 'معطّل'}</Badge></td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(() => {
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        const isRecent = new Date(user.createdAt) > sevenDaysAgo;
                        return isRecent ? <span className="owner-health-dot green" style={{ display: 'inline-block' }} /> : null;
                      })()}
                      {new Date(user.createdAt).toLocaleDateString('ar-LY', { dateStyle: 'medium' })}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="btn ghost" style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px' }} onClick={() => handleRoleChange(user)}>
                        تغيير الدور
                      </button>
                      <button type="button" className="btn ghost" style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px' }} onClick={() => handleToggleStatus(user)}>
                        {user.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Server-side pagination — driven by API meta */}
        {meta && totalPages > 1 && (
          <div className="owner-pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} type="button" className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
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
