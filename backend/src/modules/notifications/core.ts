/**
 * r323 B3.3 — notifications (pure layer).
 *
 * The academic events a student MUST hear about — a new material, a
 * new assignment (with its due date), a scheduled live session, an
 * announcement — each one Arabic-first, each one carrying the deep
 * link that opens the exact surface the event happened on. Pure on
 * purpose: the payloads are unit-tested verbatim; the fire layer
 * (fire.ts) owns only the audience resolution + the write.
 */

export interface NotificationPayload {
  type: 'URGENT' | 'ACADEMIC' | 'SYSTEM' | 'SOCIAL';
  icon: string;
  title: string;
  body: string;
  link: string;
}

/** R353 N — the push preference categories: one per NotificationPayload
 *  type (the only category axis the push fan-out can see). Stored in
 *  NotificationPreference.category alongside the mail categories
 *  (security/account/courses/…); absent row = push ON, no quiet hours. */
export const PUSH_CATEGORIES = ['URGENT', 'ACADEMIC', 'SYSTEM', 'SOCIAL'] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

/** R353 N — is `hour` (UTC, 0-23) inside the quiet window
 *  [start, end)? Half-open: `end` itself is NOT quiet. A window that
 *  wraps midnight (start > end, e.g. 22→6) covers start..23 and 0..end-1.
 *  start === end is an EMPTY window ([x, x) — the mathematically honest
 *  reading; muting a category outright is what pushEnabled=false is
 *  for). Pure on purpose: the unit tests pin every branch. */
export function isQuietHour(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // wraps midnight
}

/** Arabic day-month WITHOUT year (the due/start dates the pilot
 *  needs are always within the term — the year is noise in a bell
 *  row). Fixed month names: no ICU dependency, byte-stable in tests. */
const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function arabicDayMonth(d: Date): string {
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
}

/** «12 أكتوبر، 10:30» — the 24h clock Arabic rows read naturally.
 *  Minute shown always (a half-hour start is the pilot's norm). */
export function arabicDayMonthTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${arabicDayMonth(d)}، ${hh}:${mm}`;
}

/** A new material landed on the offering (PDF upload or a link). */
export function materialCreatedPayload(
  courseCode: string,
  materialName: string,
): NotificationPayload {
  return {
    type: 'ACADEMIC',
    icon: '📚',
    title: `مادة جديدة في ${courseCode}`,
    body: materialName.slice(0, 120),
    link: '/student/materials',
  };
}

/** A new assignment was posted; dueAt rides the body when set. */
export function assignmentCreatedPayload(
  courseCode: string,
  title: string,
  dueAt: Date | null,
): NotificationPayload {
  return {
    type: 'ACADEMIC',
    icon: '🗒️',
    title: `تكليف جديد في ${courseCode}`,
    body: `${title.slice(0, 80)}${dueAt ? ` — الاستحقاق ${arabicDayMonthTime(dueAt)}` : ''}`,
    link: '/student/assignments',
  };
}

/** R350 E3 — an exam template went live for its audience. */
export function examPublishedPayload(
  examTitle: string,
  openAt: Date | null,
  closeAt: Date | null,
): NotificationPayload {
  const window =
    openAt && closeAt
      ? `يفتح ${arabicDayMonthTime(openAt)} ويغلق ${arabicDayMonthTime(closeAt)}`
      : 'طالع التفاصيل من صفحة الاختبارات';
  return {
    type: 'ACADEMIC',
    icon: '📝',
    title: `اختبار جديد: ${examTitle.slice(0, 80)}`,
    body: window,
    link: '/student/online-exams',
  };
}

/** R353 N — the assignment-due REMINDER (the daily sweep's bell/push
 *  twin of the mail): title+body are a pure function of (title, dueAt),
 *  which the sweep leans on for its dedupe — the same assignment within
 *  the same window always renders the same row, so repeat sweeps
 *  collapse via a findFirst on (userId, title, body). */
export function assignmentDueReminderPayload(title: string, dueAt: Date): NotificationPayload {
  return {
    type: 'ACADEMIC',
    icon: '⏰',
    title: 'تذكير بتسليم تكليف',
    body: `${title.slice(0, 80)} — الاستحقاق ${arabicDayMonthTime(dueAt)}`,
    link: '/student/assignments',
  };
}

/** A live session was scheduled (Jitsi default or a pasted provider). */
export function liveScheduledPayload(
  sessionTitle: string,
  scheduledAt: Date,
): NotificationPayload {
  return {
    type: 'ACADEMIC',
    icon: '🎥',
    title: 'حصة مباشرة مجدولة',
    body: `${sessionTitle.slice(0, 80)} — ${arabicDayMonthTime(scheduledAt)}`,
    link: '/student/live',
  };
}

/** An announcement reached the caller's scope. */
export function announcementPayload(title: string, iconEmoji: string | null): NotificationPayload {
  return {
    type: 'SYSTEM',
    icon: iconEmoji ?? '📣',
    title: 'إعلان جديد',
    body: title.slice(0, 120),
    link: '/student/announcements',
  };
}
