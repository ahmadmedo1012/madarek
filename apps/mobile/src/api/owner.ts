/** Platform owner endpoints. */
import { get, post, put, patch } from "./client";
import type { Paginated } from "./types";

export interface OwnerStats {
  [k: string]: unknown;
}

export interface OwnerInstitution {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  status?: string;
  membersCount?: number;
  facultiesCount?: number;
  adminMemberships?: unknown[];
  [k: string]: unknown;
}

export const ownerApi = {
  stats: () => get<OwnerStats>("/owner/stats"),
  users: (q?: { page?: number; limit?: number; q?: string; role?: string }) =>
    get<Paginated<unknown>>("/owner/users", { ...q, limit: q?.limit ?? 50 }),
  setUserRole: (userId: string, role: string) => post<unknown>(`/owner/users/${userId}/role`, { role }),
  setUserStatus: (userId: string, isActive: boolean) => patch<unknown>(`/owner/users/${userId}/status`, { isActive }),
  activity: (page = 1, limit = 30) => get<Paginated<unknown>>("/owner/activity", { page, limit }),
  realtime: () => get<Record<string, unknown>>("/owner/realtime"),
  aiMetrics: () => get<Record<string, unknown>>("/owner/ai-metrics"),
  alerts: () => get<{ id: string; severity?: string; category?: string; title: string; message?: string; resolvedAt?: string | null; createdAt?: string }[]>("/owner/alerts"),
  resolveAlert: (id: string) => post<unknown>(`/owner/alerts/${id}/resolve`),
  loginAnalytics: () => get<Record<string, unknown>>("/owner/login-analytics"),
  education: () => get<Record<string, unknown>>("/owner/education"),
  system: () => get<Record<string, unknown>>("/owner/system"),
  settings: () => get<{ key: string; value: unknown; category?: string }[]>("/owner/settings"),
  setSetting: (key: string, value: unknown) => put<unknown>(`/owner/settings/${key}`, { value }),
  featureFlags: () => get<{ slug: string; enabled: boolean; description?: string }[]>("/owner/feature-flags"),
  setFeatureFlag: (slug: string, enabled: boolean) => put<unknown>(`/owner/feature-flags/${slug}`, { enabled }),
  governance: () => get<Record<string, unknown>>("/owner/governance"),
  institutions: () => get<OwnerInstitution[]>("/owner/institutions"),
  createInstitution: (payload: { name: string; nameEn?: string; slug: string }) => post<OwnerInstitution>("/owner/institutions", payload),
  updateInstitution: (id: string, payload: Record<string, unknown>) => patch<OwnerInstitution>(`/owner/institutions/${id}`, payload),
  provisionAdmin: (id: string, payload: { email: string; firstName: string; lastName: string }) =>
    post<unknown>(`/owner/institutions/${id}/administrators`, payload),
  revokeMembership: (id: string, membershipId: string) => post<unknown>(`/owner/institutions/${id}/memberships/${membershipId}/revoke`),
  restoreMembership: (id: string, membershipId: string) => post<unknown>(`/owner/institutions/${id}/memberships/${membershipId}/restore`),
};
