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
  resourceType: string | null;
  resourceId: string | null;
  userId: string | null;
  metadata: unknown;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
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

// ── Enterprise Types ─────────────────────────────────────────────
export interface RealtimeMetrics {
  activeSessions: number;
  aiRequestsPerMin: number;
  liveBroadcasts: number;
  activeExams: number;
}

export interface AiMetrics {
  totalRequests: number;
  totalTokens: number;
  successRate: number;
  avgLatencyMs: number;
  byFeature: Array<{ feature: string; count: number; tokens: number }>;
  trend: Array<{ date: string; count: number }>;
}

export interface OperationalAlert {
  id: string;
  severity: string;
  category: string;
  title: string;
  message: string;
  metadata: unknown;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface LoginAnalytics {
  total: number;
  successCount: number;
  failureCount: number;
  daily: Array<{ date: string; success: number; failure: number }>;
  topReasons: Array<{ reason: string; count: number }>;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface FeatureFlag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  category: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface GovernanceMetrics {
  permissionChanges: number;
  roleChanges: number;
  newUsersThisMonth: number;
  weeklyGrowth: Array<{ week: string; count: number }>;
}

// ── Enterprise Hooks ─────────────────────────────────────────────
export function useOwnerRealtime() {
  return useQuery({
    queryKey: ['owner', 'realtime'],
    queryFn: () => unwrap<RealtimeMetrics>(api.get('/owner/realtime')),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useOwnerAiMetrics() {
  return useQuery({
    queryKey: ['owner', 'ai-metrics'],
    queryFn: () => unwrap<AiMetrics>(api.get('/owner/ai-metrics')),
    staleTime: 60_000,
  });
}

export function useOwnerAlerts() {
  return useQuery({
    queryKey: ['owner', 'alerts'],
    queryFn: () => unwrap<OperationalAlert[]>(api.get('/owner/alerts')),
    staleTime: 30_000,
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<{ id: string }>(api.post(`/owner/alerts/${id}/resolve`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'alerts'] });
    },
  });
}

export function useOwnerLoginAnalytics() {
  return useQuery({
    queryKey: ['owner', 'login-analytics'],
    queryFn: () => unwrap<LoginAnalytics>(api.get('/owner/login-analytics')),
    staleTime: 60_000,
  });
}

export function useOwnerSettings() {
  return useQuery({
    queryKey: ['owner', 'settings'],
    queryFn: () => unwrap<PlatformSetting[]>(api.get('/owner/settings')),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, category }: { key: string; value: string; category?: string }) =>
      unwrap<PlatformSetting>(api.put(`/owner/settings/${key}`, { value, category })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'settings'] });
    },
  });
}

export function useOwnerFeatureFlags() {
  return useQuery({
    queryKey: ['owner', 'feature-flags'],
    queryFn: () => unwrap<FeatureFlag[]>(api.get('/owner/feature-flags')),
  });
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, enabled }: { slug: string; enabled: boolean }) =>
      unwrap<FeatureFlag>(api.put(`/owner/feature-flags/${slug}`, { enabled })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'feature-flags'] });
    },
  });
}

export function useOwnerGovernance() {
  return useQuery({
    queryKey: ['owner', 'governance'],
    queryFn: () => unwrap<GovernanceMetrics>(api.get('/owner/governance')),
    staleTime: 60_000,
  });
}
