/**
 * r323 B3.3 — notification payloads (pure) — the grammar tests.
 */
import { describe, expect, it } from 'vitest';
import {
  announcementPayload,
  arabicDayMonth,
  arabicDayMonthTime,
  assignmentCreatedPayload,
  liveScheduledPayload,
  materialCreatedPayload,
} from '../../src/modules/notifications/core.js';

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
