/**
 * messages/logic — the pure conversation model for the DM inbox.
 *
 * The /messages wire shape is a flat, newest-first feed of DMs; the inbox
 * composes it client-side into per-correspondent conversations (the same
 * collectCorrespondents approach the web inbox uses). Everything here is a
 * pure function of (rows, myId) so logic.test.ts pins grouping, unread
 * counting, thread ordering and the attachment-URL gate without a renderer.
 */
import type { Message } from "@/api/types";
import { initials } from "@/lib/format";

export interface Correspondent {
  id: string;
  name: string;
  avatarInitials: string | null;
  avatarColor: string | null;
  /** The newest message in the conversation (the list-row preview). */
  last: Message;
  unread: number;
}

function displayName(m: Message, myId: string): { id: string; name: string; initials: string | null; color: string | null } | null {
  const other = m.fromUserId === myId ? m.toUser : m.fromUser;
  const otherId = m.fromUserId === myId ? m.toUserId : m.fromUserId;
  if (!otherId) return null;
  const name = other ? `${other.firstName} ${other.lastName}`.trim() : "";
  return {
    id: otherId,
    name: name !== "" ? name : "مستخدم",
    initials: other ? initials(other.firstName, other.lastName) : null,
    color: (other as { avatarColor?: string | null } | null)?.avatarColor ?? null,
  };
}

/**
 * Compose conversations from the flat feed: newest-first by last message,
 * unread counts only for messages FROM the other side, mine-or-theirs
 * preview prefix decided by the caller (the «أنت: » hint).
 */
export function collectConversations(rows: readonly Message[], myId: string): Correspondent[] {
  const byUser = new Map<string, Correspondent>();
  const ordered = [...rows].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  for (const m of ordered) {
    const other = displayName(m, myId);
    if (!other) continue;
    const unreadInc = !m.readAt && m.fromUserId !== myId ? 1 : 0;
    const existing = byUser.get(other.id);
    if (existing) {
      existing.unread += unreadInc;
    } else {
      byUser.set(other.id, {
        id: other.id,
        name: other.name,
        avatarInitials: other.initials,
        avatarColor: other.color,
        last: m,
        unread: unreadInc,
      });
    }
  }
  return [...byUser.values()];
}

/** The thread with one correspondent, oldest-first (chat reading order). */
export function threadMessages(rows: readonly Message[], otherId: string): Message[] {
  return rows
    .filter((m) => m.fromUserId === otherId || m.toUserId === otherId)
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
}

/** Image-looking http(s) URLs (the only attachments plain-text DMs can carry). */
const IMAGE_URL = /^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif)(\?\S*)?$/i;

/**
 * Attachment URLs found in a message body — rendered as expo-image preview
 * chips in the bubble. The /messages contract has no attachment field, so
 * an image LINK inside the text is the honest best signal available.
 */
export function imageUrlsInBody(body: string): string[] {
  const urls: string[] = [];
  for (const token of body.split(/\s+/)) {
    if (IMAGE_URL.test(token) && !urls.includes(token)) urls.push(token);
  }
  return urls;
}
