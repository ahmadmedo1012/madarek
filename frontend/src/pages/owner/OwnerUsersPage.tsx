import { useState } from 'react';
import { Users, GraduationCap, BookOpen, ShieldCheck, Search } from 'lucide-react';
import { Card, MetricCard, Badge, UserAvatar, Pill } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { useOwnerStats, useChangeUserRole, useToggleUserStatus } from '../../hooks/useOwner';

type RoleFilter = 'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';

interface DemoUser {
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

const DEMO_USERS: DemoUser[] = [
  { id: '1', firstName: 'أحمد', lastName: 'بن محمد', email: 'ahmed@zu.edu.ly', role: 'STUDENT', isActive: true, avatarInitials: 'أم', avatarColor: '#3b82f6', createdAt: '2024-09-15' },
  { id: '2', firstName: 'فاطمة', lastName: 'العلي', email: 'fatima@zu.edu.ly', role: 'TEACHER', isActive: true, avatarInitials: 'فع', avatarColor: '#10b981', createdAt: '2024-08-20' },
  { id: '3', firstName: 'خالد', lastName: 'الزاوي', email: 'khaled@zu.edu.ly', role: 'TEACHER', isActive: true, avatarInitials: 'خز', avatarColor: '#f59e0b', createdAt: '2024-07-10' },
  { id: '4', firstName: 'سارة', lastName: 'أحمد', email: 'sara@zu.edu.ly', role: 'STUDENT', isActive: true, avatarInitials: 'سأ', avatarColor: '#8b5cf6', createdAt: '2024-10-01' },
  { id: '5', firstName: 'محمد', lastName: 'السنوسي', email: 'mohammed@zu.edu.ly', role: 'ADMIN', isActive: true, avatarInitials: 'مس', avatarColor: '#ef4444', createdAt: '2024-06-15' },
  { id: '6', firstName: 'نورة', lastName: 'الحسن', email: 'noura@zu.edu.ly', role: 'TEACHER', isActive: false, avatarInitials: 'نح', avatarColor: '#06b6d4', createdAt: '2024-05-20' },
  { id: '7', firstName: 'علي', lastName: 'عبدالله', email: 'ali@zu.edu.ly', role: 'STUDENT', isActive: true, avatarInitials: 'عع', avatarColor: '#84cc16', createdAt: '2024-11-05' },
  { id: '8', firstName: 'مريم', lastName: 'الطرابلسي', email: 'maryam@zu.edu.ly', role: 'QUALITY', isActive: true, avatarInitials: 'مط', avatarColor: '#f97316', createdAt: '2024-04-12' },
  { id: '9', firstName: 'عمر', lastName: 'البرعصي', email: 'omar@zu.edu.ly', role: 'STUDENT', isActive: true, avatarInitials: 'عب', avatarColor: '#14b8a6', createdAt: '2024-12-01' },
  { id: '10', firstName: 'ليلى', lastName: 'المصراتي', email: 'layla@zu.edu.ly', role: 'STUDENT', isActive: false, avatarInitials: 'لم', avatarColor: '#ec4899', createdAt: '2024-03-18' },
];

export function OwnerUsersPage() {
  const stats = useOwnerStats();
  const changeRole = useChangeUserRole();
  const toggleStatus = useToggleUserStatus();

  const statData = stats.data ?? { totalUsers: 4850, students: 4200, teachers: 420, admins: 15, quality: 8, owners: 1, totalCourses: 186, totalOfferings: 312, totalEnrollments: 12400, recentAuditLogs: 245 };

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [page, setPage] = useState(1);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; message: string; danger: boolean; onConfirm: () => void | Promise<void>;
  }>({ title: '', message: '', danger: false, onConfirm: () => {} });

  const filteredUsers = DEMO_USERS.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search && !`${u.firstName} ${u.lastName} ${u.email}`.includes(search)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / 5);
  const paged = filteredUsers.slice((page - 1) * 5, page * 5);

  const handleRoleChange = (user: DemoUser) => {
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

  const handleToggleStatus = (user: DemoUser) => {
    setConfirmConfig({
      title: user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب',
      message: user.isActive
        ? `هل تريد تعطيل حساب "${user.firstName} ${user.lastName}"؟ لن يتمكن من الدخول.`
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

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة المستخدمين</h1>
          <p className="page-subtitle">عرض، بحث، وإدارة جميع حسابات المنصة</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-4">
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={statData.totalUsers.toLocaleString('ar-LY')} color="brand" />
        <MetricCard icon={GraduationCap} label="الطلاب" value={statData.students.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={BookOpen} label="الأساتذة" value={statData.teachers.toString()} color="purple" />
        <MetricCard icon={ShieldCheck} label="إداريون وجودة" value={(statData.admins + statData.quality).toString()} color="gold" />
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
            {paged.map((user) => (
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
                <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{user.createdAt}</td>
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

        {/* Pagination */}
        <div className="owner-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} type="button" className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>
              {i + 1}
            </button>
          ))}
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
        </div>
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
