/**
 * r323 B2.4 — live sessions core (pure layer).
 *
 * The Jitsi default (public meet.jit.si embed, generated room names —
 * the owner's brief) + the status transition guard + the attendance
 * day-bucket. Pure here so the route layer stays thin and the tests
 * need no DB (the repo's modules/* convention).
 */

/** Rooms are unguessable-enough for a class: the platform prefix +
 * the session id's tail (cuids end in base36 time+random — stable per
 * session, never the full id on the wire). */
export function jitsiRoomNameFor(sessionId: string): string {
  const tail = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-12).toLowerCase();
  return `madarek-${tail}`;
}

export function jitsiUrlFor(room: string): string {
  return `https://meet.jit.si/${encodeURIComponent(room)}`;
}

/** The join URL a session gets when the teacher didn't paste one. */
export function defaultJoinUrlFor(sessionId: string): string {
  return jitsiUrlFor(jitsiRoomNameFor(sessionId));
}

export type LiveStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

/** The one-way lifecycle: SCHEDULED → LIVE → ENDED, with CANCELLED
 * reachable from the two pre-end states. Terminal states reject. */
const TRANSITIONS: Record<LiveStatus, LiveStatus[]> = {
  SCHEDULED: ['LIVE', 'CANCELLED'],
  LIVE: ['ENDED', 'CANCELLED'],
  ENDED: [],
  CANCELLED: [],
};

export function canTransition(from: LiveStatus, to: LiveStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Arabic message for the illegal transition (the route maps to 409). */
export function transitionError(from: LiveStatus, to: LiveStatus): string {
  const labels: Record<LiveStatus, string> = {
    SCHEDULED: 'مجدولة',
    LIVE: 'جارية',
    ENDED: 'منتهية',
    CANCELLED: 'ملغاة',
  };
  return `لا يمكن الانتقال من حالة «${labels[from]}» إلى «${labels[to]}».`;
}

/** The attendance day-bucket for a join at `at` — a UTC date string
 * (YYYY-MM-DD). The AttendanceSession unique key is (offeringId, date). */
export function attendanceDayBucket(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** Join window: students may join from 10 minutes before the scheduled
 * start (the early birds get their attendance too) until the session
 * is ENDED. CANCELLED never accepts. */
export function canJoin(
  status: LiveStatus,
  scheduledAt: Date,
  now: Date = new Date(),
): { ok: boolean; reason?: string } {
  if (status === 'CANCELLED') return { ok: false, reason: 'الحصة ملغاة.' };
  if (status === 'ENDED') return { ok: false, reason: 'الحصة انتهت.' };
  const opens = scheduledAt.getTime() - 10 * 60 * 1000;
  if (status === 'SCHEDULED' && now.getTime() < opens) {
    return { ok: false, reason: 'لم يُفتح الانضمام بعد — يفتح قبل البداية بعشر دقائق.' };
  }
  return { ok: true };
}
