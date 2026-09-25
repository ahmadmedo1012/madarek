/**
 * Backend unit test — the visibility + lifecycle logic of the 16-B10 route
 * trio `courses.routes.ts` / `search.routes.ts` / `teacher-profile.routes.ts`
 * (audit 15-i Batch D — TOP-3, TOP-9, TOP-10; wave 16-B10).
 *
 * DB-free, mirroring tests/modules/dashboard-logic.test.ts:
 *  · offeringVisibilityFilter (TOP-10) — the shared offering-visibility
 *    role branch, extracted so courses' GET /:id roster and search's global
 *    scope cannot drift apart again (they already had once: search grew the
 *    active-enrollment constraint first).
 *  · LIVE_SESSION_TRANSITIONS / nextLiveSessionStatus /
 *    liveTransitionConflictMessage (TOP-3) — the forward-only live-session
 *    state machine (11-d P2-11a): the 4 legal moves, the terminal rows, and
 *    the Arabic 409 labels the teacher UI shows verbatim.
 *  · sanitizeSearchQuery / searchHit (TOP-9) — the search route's q parse
 *    (non-string collapse, trim, 120 cap), the min-2 gate values, and the
 *    raw-OR-normalized candidate re-verification predicate.
 *
 * Integration coverage (auth gate, ILIKE query shapes, conditional
 * updateMany claims) needs a DB harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import { LiveSessionStatus, Role } from '@prisma/client';
import {
  LIVE_SESSION_TRANSITIONS,
  liveTransitionConflictMessage,
  nextLiveSessionStatus,
  type LiveSessionAction,
} from '../../src/http/routes/teacher-profile.routes';
import { offeringVisibilityFilter } from '../../src/http/routes/courses.routes';
import { sanitizeSearchQuery, searchHit } from '../../src/http/routes/search.routes';
import { normalizeArabicSearch } from '../../src/modules/search/normalize';

describe('offeringVisibilityFilter (audit 15-i TOP-10 — the shared role branch)', () => {
  it('TEACHER → only the offerings they teach', () => {
    expect(offeringVisibilityFilter(Role.TEACHER, 'teacher_7')).toEqual({ teacherId: 'teacher_7' });
  });

  it('STUDENT → only offerings with an ACTIVE enrollment (dropped/completed leftovers never grant visibility)', () => {
    expect(offeringVisibilityFilter(Role.STUDENT, 'student_9')).toEqual({
      enrollments: { some: { studentId: 'student_9', status: 'active' } },
    });
  });

  it('ADMIN / QUALITY / OWNER → unfiltered (oversight)', () => {
    expect(offeringVisibilityFilter(Role.ADMIN, 'admin_1')).toEqual({});
    expect(offeringVisibilityFilter(Role.QUALITY, 'quality_1')).toEqual({});
    expect(offeringVisibilityFilter(Role.OWNER, 'owner_1')).toEqual({});
  });
});

describe('live-session lifecycle (audit 15-i TOP-3 — forward-only state machine, 11-d P2-11a)', () => {
  const LEGAL: Array<[status: LiveSessionStatus, action: LiveSessionAction, next: LiveSessionStatus]> = [
    ['SCHEDULED', 'START', 'LIVE'], // go live
    ['SCHEDULED', 'CANCEL', 'CANCELLED'], // cancel before it starts
    ['LIVE', 'END', 'ENDED'], // end the broadcast
    ['LIVE', 'CANCEL', 'CANCELLED'], // cancel mid-broadcast
  ];
  const STATUSES: LiveSessionStatus[] = ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'];
  const ACTIONS: LiveSessionAction[] = ['START', 'END', 'CANCEL'];

  it('allows exactly the four forward transitions', () => {
    for (const [status, action, next] of LEGAL) {
      expect(nextLiveSessionStatus(status, action)).toBe(next);
    }
  });

  it('marks ENDED and CANCELLED terminal — empty transition rows', () => {
    expect(LIVE_SESSION_TRANSITIONS.ENDED).toEqual({});
    expect(LIVE_SESSION_TRANSITIONS.CANCELLED).toEqual({});
  });

  it('rejects every other combination as null (full 4×3 matrix)', () => {
    const legal = new Set(LEGAL.map(([s, a]) => `${s}:${a}`));
    for (const status of STATUSES) {
      for (const action of ACTIONS) {
        if (legal.has(`${status}:${action}`)) continue;
        expect(nextLiveSessionStatus(status, action)).toBeNull();
      }
    }
  });

  it('returns null for the pre-11-d-P2-11a regressions the map closed', () => {
    expect(nextLiveSessionStatus('SCHEDULED', 'END')).toBeNull(); // END a never-started session
    expect(nextLiveSessionStatus('CANCELLED', 'START')).toBeNull(); // START a cancelled session
    expect(nextLiveSessionStatus('ENDED', 'START')).toBeNull(); // re-START an ended session (used to reset startedAt)
    expect(nextLiveSessionStatus('ENDED', 'CANCEL')).toBeNull(); // CANCEL an ended session
  });

  it('builds the exact Arabic 409 message (the teacher UI shows it verbatim)', () => {
    expect(liveTransitionConflictMessage('SCHEDULED', 'END')).toBe('لا يمكن إنهاء جلسة مجدولة');
    expect(liveTransitionConflictMessage('ENDED', 'START')).toBe('لا يمكن بدء جلسة منتهية');
    expect(liveTransitionConflictMessage('CANCELLED', 'START')).toBe('لا يمكن بدء جلسة ملغاة');
  });

  it('every illegal-move message embeds the Arabic action label (بدء/إنهاء/إلغاء) and status label (مجدولة/مباشرة/منتهية/ملغاة)', () => {
    const ACTION_LABEL: Record<LiveSessionAction, string> = { START: 'بدء', END: 'إنهاء', CANCEL: 'إلغاء' };
    const STATUS_LABEL: Record<LiveSessionStatus, string> = {
      SCHEDULED: 'مجدولة',
      LIVE: 'مباشرة',
      ENDED: 'منتهية',
      CANCELLED: 'ملغاة',
    };
    for (const status of STATUSES) {
      for (const action of ACTIONS) {
        if (nextLiveSessionStatus(status, action) !== null) continue;
        const msg = liveTransitionConflictMessage(status, action);
        expect(msg).toContain(ACTION_LABEL[action]);
        expect(msg).toContain(STATUS_LABEL[status]);
        expect(msg).toContain('جلسة');
      }
    }
  });
});

describe('sanitizeSearchQuery (audit 15-i TOP-9 — q parse)', () => {
  it('collapses non-string query params to empty string', () => {
    expect(sanitizeSearchQuery(undefined)).toBe('');
    expect(sanitizeSearchQuery(null)).toBe('');
    expect(sanitizeSearchQuery(42)).toBe('');
    expect(sanitizeSearchQuery(['خوارزميات'])).toBe('');
    expect(sanitizeSearchQuery({ q: 'خوارزميات' })).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeSearchQuery('  خوارزميات  ')).toBe('خوارزميات');
  });

  it('hard-caps at 120 chars (q flows into ILIKE patterns)', () => {
    expect(sanitizeSearchQuery('خ'.repeat(130))).toBe('خ'.repeat(120));
    expect(sanitizeSearchQuery('x'.repeat(120))).toHaveLength(120);
  });

  it('leaves in-range queries untouched', () => {
    expect(sanitizeSearchQuery('ab')).toBe('ab');
    expect(sanitizeSearchQuery('خوارزميات')).toBe('خوارزميات');
  });
});

describe('the min-2 gate (handler: q.length < 2 || qN.length < 2 — audit 15-i TOP-9)', () => {
  it('gates a 1-char raw query', () => {
    const q = sanitizeSearchQuery('خ');
    const qN = normalizeArabicSearch(q);
    expect(q.length < 2 || qN.length < 2).toBe(true);
  });

  it('gates a query that is mostly diacritics — 2 raw chars normalizing to 1', () => {
    const q = sanitizeSearchQuery('بِ'); // beh + kasra
    const qN = normalizeArabicSearch(q);
    expect(q.length).toBe(2); // survives the raw-length half of the gate…
    expect(qN.length).toBe(1); // …but not the normalized half
    expect(q.length < 2 || qN.length < 2).toBe(true);
  });

  it('gates a diacritics-only query down to the empty normalized form', () => {
    const q = sanitizeSearchQuery('ًٌ');
    const qN = normalizeArabicSearch(q);
    expect(qN).toBe('');
    expect(q.length < 2 || qN.length < 2).toBe(true);
  });

  it('passes a real word through both halves of the gate', () => {
    const q = sanitizeSearchQuery('الخوارزميات');
    const qN = normalizeArabicSearch(q);
    expect(q.length < 2 || qN.length < 2).toBe(false);
  });
});

describe('searchHit (audit 15-i TOP-9 — raw OR normalized candidate re-verification)', () => {
  it('matches a raw substring, ASCII case-insensitively', () => {
    expect(searchHit(['Cisco Networking'], 'cisco', normalizeArabicSearch('cisco'))).toBe(true);
    expect(searchHit(['Cisco Networking'], 'CISCO', normalizeArabicSearch('CISCO'))).toBe(true);
  });

  it('matches through the normalized arm when raw misses (hamza-variant query)', () => {
    // Raw 'احمد عبدالله' does not contain the raw query 'أحمد' — only the folded arm hits.
    expect(searchHit(['احمد عبدالله'], 'أحمد', normalizeArabicSearch('أحمد'))).toBe(true);
  });

  it('matches a diacritized haystack via the normalized arm', () => {
    expect(searchHit(['خوارزِميَات متقدمة'], 'خوارزميات', normalizeArabicSearch('خوارزميات'))).toBe(true);
  });

  it('applies the ال prefix tolerance at the wire level (the matcher itself is lib-tested)', () => {
    expect(searchHit(['خوارزميات متقدمة'], 'الخوارزميات', normalizeArabicSearch('الخوارزميات'))).toBe(true);
  });

  it('any haystack hit wins (some, not every)', () => {
    expect(searchHit(['شبكات الحاسوب', 'جامعة الزاوية'], 'الزاوية', normalizeArabicSearch('الزاوية'))).toBe(true);
    expect(searchHit(['خوارزميات متقدمة', 'Cisco'], 'cisco', normalizeArabicSearch('cisco'))).toBe(true);
  });

  it('returns false when neither arm hits any haystack', () => {
    expect(searchHit(['شبكات الحاسوب'], 'خوارزميات', normalizeArabicSearch('خوارزميات'))).toBe(false);
    expect(searchHit(['xyz'], 'cisco', normalizeArabicSearch('cisco'))).toBe(false);
  });

  it('returns false for an empty haystack list', () => {
    expect(searchHit([], 'خوارزميات', normalizeArabicSearch('خوارزميات'))).toBe(false);
  });
});
