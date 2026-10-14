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
  /* r165d (D1): the backend schema (prisma Notification.link) has
   * carried a nullable deep link since r155a — GET /notifications
   * returns it in every row (findMany with no select) and
   * me.routes.ts writes '/teacher/messages' for teacher DM
   * recipients — but the FE contract never declared it, so no
   * consumer could act on it and a DM notification could never
   * reach the inbox. Optional + nullable: old cached payloads and
   * the e2e fixture corpus (field-for-field, no invented fields)
   * keep resolving without it. */
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

/** r165d (D1) — resolve a notification's SPA deep link.
 *
 *  The backend's `link` is honored ONLY when it is an in-app path:
 *  a string that starts with `/` and NOT with `//` (a leading `//`
 *  is a PROTOCOL-RELATIVE URL — the browser resolves it against the
 *  current scheme, so it is an external origin in disguise). Anything
 *  else (null, '', 'https://…', 'mailto:…', 'javascript:…') is
 *  ignored and the caller falls back to its own default destination
 *  (the role's alerts page). This mirrors the app's CSP posture —
 *  anchor hrefs are only ever SPA paths, never external URLs — and
 *  the backend's own r155a stance that a dead deep link is worse
 *  than none.
 *
 *  Pure on purpose (the NotificationsFeedPage rows flow through the
 *  same Notification contract) so both consumers — the bell's
 *  dropdown rows and the AlertsPage rows — share ONE routing
 *  decision, pinned by tests on both surfaces. */
export function notifDeepLink(n: Pick<Notification, 'link'>): string | null {
  const link = n.link;
  if (typeof link !== 'string' || link.length === 0) return null;
  if (!link.startsWith('/') || link.startsWith('//')) return null;
  return link;
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
    /* r161 (C1): the page shape is `{ data, meta }` AT THE ENVELOPE
       LEVEL — the backend's paginated routes answer `{ data: [...],
       meta: buildMeta(...) }` where meta is a SIBLING of data, not
       nested inside it. The old queryFn ran this response through
       unwrap() (which returns res.data.data — the bare array, meta
       dropped), so every resolved page had lastPage.meta === undefined
       and getNextPageParam's destructure threw at render time —
       AlertsPage crashed the whole app to the error boundary the
       moment notifications arrived (all three roles' /alerts routes).
       The hook now returns the FULL envelope per page, exactly the
       NotificationsFeedPage contract the page and tests always
       assumed. useUnreadNotifications above already read
       res.data.meta directly (the correct pattern); this brings the
       feed in line. Pinned end-to-end (transport-level axios mock)
       by tests/unit/notifications-feed-envelope.test.tsx — the old
       hook-mock tests could not see the unwrap shape drift. */
    queryFn: async ({ pageParam }) =>
      (
        await api.get<NotificationsFeedPage>(
          `/notifications?page=${pageParam}&limit=${NOTIFICATIONS_FEED_LIMIT}`,
        )
      ).data,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}
