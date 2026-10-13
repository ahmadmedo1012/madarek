// notifications.ts — r153c domain split of ../useResources.ts (notifications domain.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
