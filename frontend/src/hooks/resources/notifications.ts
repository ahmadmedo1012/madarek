// notifications.ts — r153c domain split of ../useResources.ts (notifications domain.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';

// ── Notifications ──────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'URGENT' | 'ACADEMIC' | 'SYSTEM' | 'SOCIAL';
  icon?: string | null;
  title: string;
  body?: string | null;
  readAt?: string | null;
  createdAt: string;
}
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => unwrap<Notification[]>(api.get('/notifications?limit=50')),
  });
}
export function useMarkNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Bulk "mark all as read" — ONE POST /notifications/read-all (backend
 *  updateMany over the unread rows, returns { updated }) instead of a
 *  per-item PATCH loop that only reached the visible slice and refetched
 *  the list once per item (15-d P1-2). The per-item PATCH above stays for
 *  single-notification clicks. */
export function useMarkAllNotifsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<{ updated: number }>(api.post('/notifications/read-all', {})),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// Unread count from response meta — backend returns it on the notifications endpoint.
export function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get<{ data: Notification[]; meta: { unread: number } }>('/notifications?limit=1');
      return res.data.meta?.unread ?? 0;
    },
    refetchInterval: 60_000, // refresh every minute
    refetchIntervalInBackground: false, // don't poll a hidden tab
  });
}

// ── Notifications feed (r157/F8 — AlertsPage pagination) ────────
/** One server page of the notifications feed, envelope included.
 *  GET /me/notifications (me.routes.ts) answers:
 *  `{ data: Notification[], meta: { page, limit, total, totalPages, unread } }`
 *  (meta built by lib/pagination.buildMeta; `unread` rides the meta). */
export interface NotificationsFeedPage {
  data: Notification[];
  meta: { page: number; limit: number; total: number; totalPages: number; unread: number };
}

/** Page size for the feed query. 30 keeps the first paint close to the
 *  old slice(0,30) truncation while staying ≤ the backend's hard
 *  paginationSchema cap of 100 (lib/pagination.ts). */
export const NOTIFICATIONS_FEED_LIMIT = 30;

/**
 * The paginated notifications feed — the full AlertsPage previously
 * fetched limit=50 and then truncated the render with slice(0,30),
 * silently hiding every notification past #30 (audit 6A6 overlap).
 *
 * - `['notifications', 'feed']` sits UNDER the plain `['notifications']`
 *   key, so the existing markRead / markAllRead invalidations
 *   (queryKey: ['notifications']) prefix-match and refresh the feed
 *   too — one umbrella, no extra wiring.
 * - getNextPageParam is guarded by `page < totalPages` (buildMeta
 *   floors totalPages at 1) → undefined at the end: no infinite
 *   refetch loop on the last page.
 * - `unread` rides each page's meta — the badge reads the LAST page's
 *   meta.unread (server truth) instead of filtering the loaded slice.
 */
export function useNotificationsFeed() {
  return useInfiniteQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: ({ pageParam }) =>
      unwrap<NotificationsFeedPage>(
        api.get(`/notifications?page=${pageParam}&limit=${NOTIFICATIONS_FEED_LIMIT}`),
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}
