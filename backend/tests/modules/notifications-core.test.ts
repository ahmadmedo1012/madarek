/**
 * r323 B3.3 — notification payloads (pure) — the grammar tests.
 * R353 N additions: the quiet-hours predicate (every branch) and the
 * assignment-due reminder payload (the sweep's bell/push twin).
 */
import { describe, expect, it } from 'vitest';
import {
  announcementPayload,
  arabicDayMonth,
  arabicDayMonthTime,
  assignmentCreatedPayload,
  assignmentDueReminderPayload,
  isQuietHour,
  liveScheduledPayload,
  materialCreatedPayload,
  PUSH_CATEGORIES,
} from '../../src/modules/notifications/core.js';

describe('R353 N — isQuietHour (the [start, end) window, UTC hours)', () => {
  it('a same-day window: start inclusive, end exclusive', () => {
    expect(isQuietHour(9, 9, 17)).toBe(true);
    expect(isQuietHour(16, 9, 17)).toBe(true);
    expect(isQuietHour(17, 9, 17)).toBe(false); // end NOT quiet
    expect(isQuietHour(8, 9, 17)).toBe(false);
  });

  it('a wrap-around window (22→6): 22..23 and 0..5 are quiet', () => {
    expect(isQuietHour(22, 22, 6)).toBe(true);
    expect(isQuietHour(23, 22, 6)).toBe(true);
    expect(isQuietHour(0, 22, 6)).toBe(true);
    expect(isQuietHour(5, 22, 6)).toBe(true);
    expect(isQuietHour(6, 22, 6)).toBe(false); // end NOT quiet
    expect(isQuietHour(12, 22, 6)).toBe(false);
    expect(isQuietHour(21, 22, 6)).toBe(false);
  });

  it('start === end is an EMPTY window ([x, x) — muting a category is what pushEnabled=false is for)', () => {
    expect(isQuietHour(5, 5, 5)).toBe(false);
    expect(isQuietHour(23, 23, 23)).toBe(false);
  });

  it('the full-day minus one shape (0→23) is almost everything', () => {
    expect(isQuietHour(0, 0, 23)).toBe(true);
    expect(isQuietHour(22, 0, 23)).toBe(true);
    expect(isQuietHour(23, 0, 23)).toBe(false);
  });
});

describe('R353 N — the push category list + the reminder payload', () => {
  it('the push categories are exactly the NotificationPayload types', () => {
    expect([...PUSH_CATEGORIES]).toEqual(['URGENT', 'ACADEMIC', 'SYSTEM', 'SOCIAL']);
  });

  it('the reminder payload is a pure function of (title, dueAt) — the dedupe law', () => {
    const due = new Date(2026, 10, 15, 23, 59);
    const a = assignmentDueReminderPayload('بحوث الفصل', due);
    const b = assignmentDueReminderPayload('بحوث الفصل', due);
    expect(a).toEqual(b);
    expect(a.type).toBe('ACADEMIC');
    expect(a.icon).toBe('⏰');
    expect(a.title).toBe('تذكير بتسليم تكليف');
    expect(a.body).toBe(`بحوث الفصل — الاستحقاق 15 نوفمبر، 23:59`);
    expect(a.link).toBe('/student/assignments');
  });

  it('the reminder payload truncates a long title to 80 chars', () => {
    const p = assignmentDueReminderPayload('x'.repeat(120), new Date(2026, 10, 15));
    expect(p.body.startsWith('x'.repeat(80))).toBe(true);
  });
});

describe('arabicDayMonth / arabicDayMonthTime', () => {
  it('formats day + fixed Arabic month (no ICU, no year)', () => {
    expect(arabicDayMonth(new Date(2026, 9, 12))).toBe('12 أكتوبر');
    expect(arabicDayMonth(new Date(2026, 0, 3))).toBe('3 يناير');
  });

  it('pads the 24h clock', () => {
    expect(arabicDayMonthTime(new Date(2026, 9, 12, 10, 30))).toBe('12 أكتوبر، 10:30');
    expect(arabicDayMonthTime(new Date(2026, 9, 12, 9, 5))).toBe('12 أكتوبر، 09:05');
  });
});

describe('payload builders', () => {
  it('material: ACADEMIC + 📚 + the course code title + the deep link', () => {
    const p = materialCreatedPayload('CS201', 'محاضرة الأشجار الثنائية');
    expect(p.type).toBe('ACADEMIC');
    expect(p.icon).toBe('📚');
    expect(p.title).toBe('مادة جديدة في CS201');
    expect(p.body).toBe('محاضرة الأشجار الثنائية');
    expect(p.link).toBe('/student/materials');
  });

  it('assignment: the due date rides the body via arabicDayMonthTime', () => {
    const due = new Date(2026, 9, 20, 23, 59);
    const p = assignmentCreatedPayload('CS201', 'واجب الأشجار', due);
    expect(p.title).toBe('تكليف جديد في CS201');
    expect(p.body).toBe('واجب الأشجار — الاستحقاق 20 أكتوبر، 23:59');
    expect(p.link).toBe('/student/assignments');

    const noDue = assignmentCreatedPayload('CS201', 'واجب', null);
    expect(noDue.body).toBe('واجب');
  });

  it('assignment truncates a long title to 80 chars', () => {
    const p = assignmentCreatedPayload('CS201', 'x'.repeat(120), null);
    expect(p.body).toBe('x'.repeat(80));
  });

  it('live: the schedule text carries the start clock', () => {
    const p = liveScheduledPayload('مراجعة منتصف الفصل', new Date(2026, 10, 2, 14, 0));
    expect(p.title).toBe('حصة مباشرة مجدولة');
    expect(p.body).toBe('مراجعة منتصف الفصل — 2 نوفمبر، 14:00');
    expect(p.link).toBe('/student/live');
  });

  it('announcement: the emoji rides when authored, 📣 otherwise', () => {
    expect(announcementPayload('بداية الاختبارات', '⚠️').icon).toBe('⚠️');
    expect(announcementPayload('بداية الاختبارات', null).icon).toBe('📣');
    expect(announcementPayload('بداية الاختبارات', null).type).toBe('SYSTEM');
  });

  it('material truncates a long name to 120 chars', () => {
    const p = materialCreatedPayload('CS201', 'y'.repeat(200));
    expect(p.body).toBe('y'.repeat(120));
  });
});
