import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';

// ── Types ────────────────────────────────────────────────────────
interface OwnerStats {
  totalUsers: number;
  students: number;
  teachers: number;
  admins: number;
  quality: number;
  owners: number;
  totalCourses: number;
  totalOfferings: number;
  totalEnrollments: number;
  recentAuditLogs: number;
}

interface OwnerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarColor: string | null;
  avatarInitials: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string;
  meta: unknown;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ── Hooks ────────────────────────────────────────────────────────
export function useOwnerStats() {
  return useQuery({
    queryKey: ['owner', 'stats'],
    queryFn: () => unwrap<OwnerStats>(api.get('/owner/stats')),
    staleTime: 30_000,
  });
}

export function useOwnerUsers(params: { page?: number; limit?: number; q?: string } = {}) {
  const { page = 1, limit = 20, q } = params;
  return useQuery({
    queryKey: ['owner', 'users', { page, limit, q }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<OwnerUser>>('/owner/users', {
        params: { page, limit, q },
      });
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useOwnerActivity(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['owner', 'activity', { page, limit }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<AuditLogEntry>>('/owner/activity', {
        params: { page, limit },
      });
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      unwrap<{ id: string; role: string }>(api.post(`/owner/users/${userId}/role`, { role })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'users'] });
      qc.invalidateQueries({ queryKey: ['owner', 'stats'] });
    },
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      unwrap<{ id: string; isActive: boolean }>(api.patch(`/owner/users/${userId}/status`, { isActive })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'users'] });
    },
  });
}
