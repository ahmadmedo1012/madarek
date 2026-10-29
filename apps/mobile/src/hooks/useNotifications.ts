import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { del, get, patch, post } from "@/api/client";
import type { AppNotification, Message, Paginated } from "@/api/types";

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
      const res = await get<Paginated<AppNotification>>("/me/notifications", { limit: 1 });
      return res.meta?.unread ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useNotifications(page = 1, limit = NOTIFICATIONS_FEED_LIMIT, q?: string) {
  return useQuery({
    queryKey: ["notifications", "feed", page, limit, q ?? null],
    queryFn: () => get<Paginated<AppNotification>>("/me/notifications", { page, limit, q }),
    placeholderData: (prev) => prev,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch<AppNotification>(`/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<{ updated: number }>("/me/notifications/read-all"),
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

export function useMessages(page = 1, limit = 30) {
  return useQuery({
    queryKey: ["messages", page],
    queryFn: () => get<Paginated<Message>>("/me/messages", { page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { toUserId: string; body: string }) => post<Message>("/me/messages", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllMessagesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post("/me/messages/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => del(`/me/messages/${messageId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}
