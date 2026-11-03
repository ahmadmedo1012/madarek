/**
 * notifications/grouping — pure day-section model for the alerts inbox.
 *
 * The inbox lists notifications grouped by civil day (Africa/Tripoli — the
 * audience calendar, same clock as the schedule/calendar screens) with
 * sticky section headers on DataList («اليوم» / «أمس» / «١٥ يناير»).
 *
 * Pure by design: no React, no Intl-at-module-scope — everything is a
 * function of (rows, now) so the colocated grouping.test.ts pins the
 * sectioning, ordering and label grammar without a renderer.
 */
import type { AppNotification } from "@/api/types";
import { shortDate } from "@/lib/format";
import { civilKey, civilOf } from "@/features/student/components";

/** One DataList data item: a sticky day header or a notification row. */
export type NotificationSectionItem =
  | { kind: "header"; key: string; label: string }
  | { kind: "row"; key: string; n: AppNotification };

export interface NotificationSections {
  /** Feed for DataList — headers interleaved with rows, newest day first. */
  items: NotificationSectionItem[];
  /** Indices into `items` where a header sits (DataList stickyHeaderIndices). */
  stickyIndices: number[];
}

/** The civil-day key of an instant on the audience (Tripoli) calendar. */
function dayKeyOf(value: string | Date): string {
  return civilKey(civilOf(value));
}

/**
 * «اليوم» / «أمس» / «١٥ يناير» — the section label for a timestamp.
 * Older-than-yesterday falls back to the shared shortDate formatter
 * (numeric day + short Arabic month, Western digits per numerals policy).
 */
export function daySectionLabel(iso: string, now: Date = new Date()): string {
  const key = dayKeyOf(iso);
  if (key === dayKeyOf(now)) return "اليوم";
  // Yesterday on the civil calendar (UTC arithmetic keeps DST-free math).
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (key === dayKeyOf(yesterday)) return "أمس";
  return shortDate(iso);
}

/**
 * Group a notification feed into day sections, newest first. Rows inside a
 * day keep their wire order after a defensive newest-first sort (the API
 * already sends desc, but the grouping must not depend on it). Rows with
 * equal timestamps keep a stable order (sort is stable in ES2019+).
 */
export function groupNotificationsByDay(
  rows: readonly AppNotification[],
  now: Date = new Date(),
): NotificationSections {
  const ordered = [...rows].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  const items: NotificationSectionItem[] = [];
  const stickyIndices: number[] = [];
  let currentKey = "";
  for (const n of ordered) {
    const key = dayKeyOf(n.createdAt);
    if (key !== currentKey) {
      stickyIndices.push(items.length);
      items.push({ kind: "header", key: `h-${key}`, label: daySectionLabel(n.createdAt, now) });
      currentKey = key;
    }
    items.push({ kind: "row", key: n.id, n });
  }
  return { items, stickyIndices };
}

/** Notification.icon is a URL only when it points at the web — else render the type badge. */
export function notificationIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  return /^https?:\/\//.test(icon) ? icon : null;
}
