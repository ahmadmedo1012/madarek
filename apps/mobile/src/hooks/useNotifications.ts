import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch, post } from "@/api/client";
import type { AppNotification, Paginated } from "@/api/types";

/**
 * Notifications & messages — the real in-app inbox (backend has no remote
 * push tokens today; the inbox is REST-polled exactly like the web client).
 */

export const NOTIFICATIONS_FEED_LIMIT = 30;

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread"],
    enabled,
    queryFn: async () => {
      const res = await get<Paginated<AppNotification>>("/notifications", { limit: 1 });
      return res.meta?.unread ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useNotifications(page = 1, limit = NOTIFICATIONS_FEED_LIMIT, q?: string) {
  return useQuery({
    queryKey: ["notifications", "feed", page, limit, q ?? null],
    queryFn: () => get<Paginated<AppNotification>>("/notifications", { page, limit, q }),
    placeholderData: (prev) => prev,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch<AppNotification>(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ updated: number }>("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Deep links from a notification: only in-app paths are honored (web parity). */
export function safeDeepLink(link: string | null | undefined): string | null {
  if (!link) return null;
  if (!link.startsWith("/") || link.startsWith("//")) return null;
  return link;
}

/* R362 — the four `/me/messages/*` hooks that used to live here are
 * deleted: the generated OpenAPI registers no `/me/messages` routes
 * (the live inbox rides `/messages` via studentApi — MessagesUI), so
 * every exported hook was a latent 404 landmine consumed by nothing.
 * `useUnreadCount` above now reads real `meta.unread`: the R362
 * envelope passthrough stopped stripping the paginated sibling, so
 * the tab/top-bar badges render for the first time since the
 * key-presence unwrap landed. */
