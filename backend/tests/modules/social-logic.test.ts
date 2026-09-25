/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/social.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/training-logic.test.ts`.
 * Covers the wave 13-2 fixes (audit 11-c §12-D, P1-3 + P2-14):
 *   - buildAnnouncementScopeConditions: the feed scope-filter construction
 *     (PLATFORM baseline; student faculty/department/enrolled offerings;
 *     teacher faculty/department/taught offerings)
 *   - unexpiredAnnouncementFilter: expired announcements leave every feed
 *     (previously expiresAt was write-only and expired rows rendered forever)
 *   - rsvpWouldExceedCapacity: only a transition INTO 'GOING' takes a seat
 *   - isScoreLocked: JUDGED freezes entry scores (final state)
 *   - canFinalizeJudging: judging needs ≥1 scored entry (empty sets OK)
 *   - toPublicEntryView: entry bodies/files never reach non-organizers
 *   - rsvpSchema / createEventSchema envelopes (strictness, bounds, refine)
 *
 * Wave 16-B8 additions (audits 15-b P2-1 + 15-i TOP-7):
 *   - createAnnouncementSchema: the scopeId-required-for-non-PLATFORM rule
 *     moved from the handler into a superRefine (fail-fast + testable)
 *   - assertScopeTargetPermitted: the pure permission matrix of the scopeId
 *     forgery guard (3 scopes × any / in-list / not-in-list; PLATFORM ignores)
 *   - CLOSABLE/JUDGEABLE claim sets: close claims exactly OPEN, judge
 *     exactly CLOSED — JUDGED is terminal, so a stale close can never
 *     regress a judged competition and re-open its locked scores
 *
 * The FOR UPDATE serializations (RSVP, competition enter) and the DB-coupled
 * handlers (feed reads, forgery-guard existence checks, conditional-claim
 * writes) need a DB harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import { AnnouncementScope, CompetitionStatus, RsvpStatus } from '@prisma/client';
import {
  assertScopeTargetPermitted,
  buildAnnouncementScopeConditions,
  canFinalizeJudging,
  CLOSABLE_COMPETITION_STATUSES,
  createAnnouncementSchema,
  createEventSchema,
  isCompetitionClosable,
  isCompetitionJudgeable,
  isScoreLocked,
  JUDGEABLE_COMPETITION_STATUSES,
  rsvpSchema,
  rsvpWouldExceedCapacity,
  toPublicEntryView,
  unexpiredAnnouncementFilter,
} from '../../src/http/routes/social.routes';

const NO_SCOPE_FACTS = {
  studentFacultyId: null,
  studentDepartmentId: null,
  enrolledOfferingIds: [],
  teacherFacultyId: null,
  teacherDepartmentId: null,
  taughtOfferingIds: [],
} as const;

/* ═══════════════ Announcement feed scope filter ═══════════════ */

describe('buildAnnouncementScopeConditions', () => {
  it('always includes the PLATFORM baseline', () => {
    expect(buildAnnouncementScopeConditions(NO_SCOPE_FACTS)).toEqual([{ scope: 'PLATFORM' }]);
  });

  it('builds faculty/department/offering conditions for a student with a full profile', () => {
    expect(buildAnnouncementScopeConditions({
      ...NO_SCOPE_FACTS,
      studentFacultyId: 'fac1',
      studentDepartmentId: 'dep1',
      enrolledOfferingIds: ['off1', 'off2'],
    })).toEqual([
      { scope: 'PLATFORM' },
      { scope: 'FACULTY', scopeId: 'fac1' },
      { scope: 'DEPARTMENT', scopeId: 'dep1' },
      { scope: 'OFFERING', scopeId: { in: ['off1', 'off2'] } },
    ]);
  });

  it('skips absent scopes instead of emitting null/empty scopeIds', () => {
    // Student with a faculty but no department and no enrollments.
    expect(buildAnnouncementScopeConditions({
      ...NO_SCOPE_FACTS,
      studentFacultyId: 'fac1',
    })).toEqual([
      { scope: 'PLATFORM' },
      { scope: 'FACULTY', scopeId: 'fac1' },
    ]);
    // Student enrolled nowhere with an empty profile.
    expect(buildAnnouncementScopeConditions({
      ...NO_SCOPE_FACTS,
      studentDepartmentId: 'dep9',
    })).toEqual([
      { scope: 'PLATFORM' },
      { scope: 'DEPARTMENT', scopeId: 'dep9' },
    ]);
  });

  it('covers a teacher: home faculty, home department, and taught offerings', () => {
    expect(buildAnnouncementScopeConditions({
      ...NO_SCOPE_FACTS,
      teacherFacultyId: 'fac2',
      teacherDepartmentId: 'dep2',
      taughtOfferingIds: ['off3'],
    })).toEqual([
      { scope: 'PLATFORM' },
      { scope: 'FACULTY', scopeId: 'fac2' },
      { scope: 'DEPARTMENT', scopeId: 'dep2' },
      { scope: 'OFFERING', scopeId: { in: ['off3'] } },
    ]);
  });

  it('teacher whose department has no faculty still gets department + offerings', () => {
    expect(buildAnnouncementScopeConditions({
      ...NO_SCOPE_FACTS,
      teacherFacultyId: null,
      teacherDepartmentId: 'dep2',
      taughtOfferingIds: ['off3', 'off4'],
    })).toEqual([
      { scope: 'PLATFORM' },
      { scope: 'DEPARTMENT', scopeId: 'dep2' },
      { scope: 'OFFERING', scopeId: { in: ['off3', 'off4'] } },
    ]);
  });

  it('teacher without a profile sees PLATFORM only', () => {
    expect(buildAnnouncementScopeConditions({
      ...NO_SCOPE_FACTS,
      teacherDepartmentId: null,
    })).toEqual([{ scope: 'PLATFORM' }]);
  });
});

/* ═══════════════ Announcement expiry filter ═══════════════ */

describe('unexpiredAnnouncementFilter', () => {
  it('keeps rows with no expiry and rows expiring strictly after the passed clock', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const filter = unexpiredAnnouncementFilter(now);
    expect(filter).toEqual({
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    });
    // The comparison uses the caller's clock instance, so the handler and
    // the filter agree on "now" within one request.
    expect((filter.OR as Array<{ expiresAt?: { gt?: Date } }>)[1]?.expiresAt?.gt).toBe(now);
  });
});

/* ═══════════════ Announcement create envelope + forgery matrix ═══════════════ */

describe('createAnnouncementSchema (scopeId superRefine — 15-i TOP-7)', () => {
  const base = {
    scope: AnnouncementScope.FACULTY,
    scopeId: 'cku5c2x9p0000fac1',
    title: 'إعلان هام لطلبة الكلية',
    body: 'نص الإعلان الكامل مع التفاصيل اللازمة للطلبة',
  };

  it('accepts every non-platform scope when its target id is present', () => {
    for (const scope of [AnnouncementScope.FACULTY, AnnouncementScope.DEPARTMENT, AnnouncementScope.OFFERING]) {
      expect(createAnnouncementSchema.safeParse({ ...base, scope }).success).toBe(true);
    }
  });

  it('rejects a non-platform scope without scopeId (previously handler-only)', () => {
    for (const scope of [AnnouncementScope.FACULTY, AnnouncementScope.DEPARTMENT, AnnouncementScope.OFFERING]) {
      const parsed = createAnnouncementSchema.safeParse({ ...base, scope, scopeId: undefined });
      expect(parsed.success).toBe(false);
    }
  });

  it('reports the violation on the scopeId path (field-level fail-fast)', () => {
    const parsed = createAnnouncementSchema.safeParse({ ...base, scopeId: undefined });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.length === 1 && i.path[0] === 'scopeId')).toBe(true);
    }
  });

  it('PLATFORM needs no scopeId — and ignores one when present', () => {
    expect(createAnnouncementSchema.safeParse({ ...base, scope: AnnouncementScope.PLATFORM, scopeId: undefined }).success)
      .toBe(true);
    // A stray scopeId on a PLATFORM row is inert — no feed read looks at
    // scopeId for PLATFORM scope (pinned: the schema accepts, per audit).
    expect(createAnnouncementSchema.safeParse({ ...base, scope: AnnouncementScope.PLATFORM }).success).toBe(true);
  });

  it('rejects a non-cuid scopeId', () => {
    expect(createAnnouncementSchema.safeParse({ ...base, scopeId: 'not-a-cuid' }).success).toBe(false);
  });

  it('keeps the envelope: strict keys, title/body bounds, pinned default, expiresAt coercion', () => {
    expect(createAnnouncementSchema.safeParse({ ...base, sneaky: true }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ ...base, title: 'قص' }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ ...base, title: 'x'.repeat(201) }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ ...base, body: 'x'.repeat(4001) }).success).toBe(false);
    const parsed = createAnnouncementSchema.parse({ ...base, expiresAt: '2026-06-01T00:00:00.000Z' });
    expect(parsed.pinned).toBe(false);
    expect(parsed.expiresAt).toBeInstanceOf(Date);
  });
});

describe('assertScopeTargetPermitted (scope-forgery matrix — 15-i TOP-7)', () => {
  // A teacher with one home faculty/department and one taught offering.
  const OWN = { faculty: ['fac1'], department: ['dep1'], offering: ['off1'] } as const;
  // Oversight roles (ADMIN/QUALITY/OWNER) may target any existing row.
  const ANY = { faculty: 'any', department: 'any', offering: 'any' } as const;
  // A teacher with no profile and no offerings — nothing is targetable.
  const NONE = { faculty: [], department: [], offering: [] } as const;

  it('oversight (any) may target every scope', () => {
    expect(() => assertScopeTargetPermitted(AnnouncementScope.FACULTY, 'fac-any', ANY)).not.toThrow();
    expect(() => assertScopeTargetPermitted(AnnouncementScope.DEPARTMENT, 'dep-any', ANY)).not.toThrow();
    expect(() => assertScopeTargetPermitted(AnnouncementScope.OFFERING, 'off-any', ANY)).not.toThrow();
  });

  it('an in-list target is permitted on every scope', () => {
    expect(() => assertScopeTargetPermitted(AnnouncementScope.FACULTY, 'fac1', OWN)).not.toThrow();
    expect(() => assertScopeTargetPermitted(AnnouncementScope.DEPARTMENT, 'dep1', OWN)).not.toThrow();
    expect(() => assertScopeTargetPermitted(AnnouncementScope.OFFERING, 'off1', OWN)).not.toThrow();
  });

  it('an out-of-list target is forbidden on every scope, with the per-scope message', () => {
    expect(() => assertScopeTargetPermitted(AnnouncementScope.FACULTY, 'fac2', OWN)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403, message: 'You cannot announce to this faculty' }),
    );
    expect(() => assertScopeTargetPermitted(AnnouncementScope.DEPARTMENT, 'dep2', OWN)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403, message: 'You cannot announce to this department' }),
    );
    expect(() => assertScopeTargetPermitted(AnnouncementScope.OFFERING, 'off2', OWN)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403, message: 'You cannot announce to this offering' }),
    );
  });

  it('PLATFORM ignores scopeId entirely — there is no target to forge', () => {
    expect(() => assertScopeTargetPermitted(AnnouncementScope.PLATFORM, 'fac2', NONE)).not.toThrow();
  });

  it('an empty allowlist (no profile, no offerings) forbids every target', () => {
    expect(() => assertScopeTargetPermitted(AnnouncementScope.FACULTY, 'fac1', NONE)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403 }),
    );
    expect(() => assertScopeTargetPermitted(AnnouncementScope.OFFERING, 'off1', NONE)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403 }),
    );
  });
});

/* ═══════════════ RSVP capacity decision ═══════════════ */

describe('rsvpWouldExceedCapacity', () => {
  it('blocks a NEW going rsvp once the event is at capacity', () => {
    expect(rsvpWouldExceedCapacity(RsvpStatus.GOING, null, 100, 100)).toBe(true);
    expect(rsvpWouldExceedCapacity(RsvpStatus.GOING, RsvpStatus.NO, 100, 100)).toBe(true);
    expect(rsvpWouldExceedCapacity(RsvpStatus.GOING, RsvpStatus.MAYBE, 100, 100)).toBe(true);
  });

  it('allows a new going rsvp while seats remain', () => {
    expect(rsvpWouldExceedCapacity(RsvpStatus.GOING, null, 99, 100)).toBe(false);
    expect(rsvpWouldExceedCapacity(RsvpStatus.GOING, RsvpStatus.MAYBE, 0, 1)).toBe(false);
  });

  it('a user already GOING keeps their seat (idempotent re-rsvp)', () => {
    // They already hold one of the counted seats — re-asserting GOING
    // must not be treated as taking a NEW seat at a full event.
    expect(rsvpWouldExceedCapacity(RsvpStatus.GOING, RsvpStatus.GOING, 100, 100)).toBe(false);
  });

  it('MAYBE and NO never consume a seat', () => {
    expect(rsvpWouldExceedCapacity(RsvpStatus.MAYBE, null, 100, 100)).toBe(false);
    expect(rsvpWouldExceedCapacity(RsvpStatus.NO, null, 100, 100)).toBe(false);
    // Switching AWAY from GOING frees a seat — never blocked.
    expect(rsvpWouldExceedCapacity(RsvpStatus.NO, RsvpStatus.GOING, 100, 100)).toBe(false);
  });
});

/* ═══════════════ Competition scoring / judging gates ═══════════════ */

describe('isScoreLocked (JUDGED scoring gate)', () => {
  it('locks scores only once judging completes', () => {
    expect(isScoreLocked(CompetitionStatus.OPEN)).toBe(false);
    expect(isScoreLocked(CompetitionStatus.CLOSED)).toBe(false);
    expect(isScoreLocked(CompetitionStatus.JUDGED)).toBe(true);
  });
});

describe('canFinalizeJudging', () => {
  it('requires at least one scored entry when entries exist', () => {
    expect(canFinalizeJudging([{ score: null }, { score: null }])).toBe(false);
    expect(canFinalizeJudging([{ score: null }, { score: 88 }])).toBe(true);
  });

  it('treats a score of 0 as a real score (not "unscored")', () => {
    expect(canFinalizeJudging([{ score: 0 }])).toBe(true);
  });

  it('allows finalizing a competition that received no entries', () => {
    expect(canFinalizeJudging([])).toBe(true);
  });
});

describe('competition lifecycle claim sets (15-b P2-1)', () => {
  it('closing claims exactly OPEN — a JUDGED competition can never regress to CLOSED', () => {
    expect([...CLOSABLE_COMPETITION_STATUSES]).toEqual(['OPEN']);
    expect(isCompetitionClosable(CompetitionStatus.OPEN)).toBe(true);
    expect(isCompetitionClosable(CompetitionStatus.CLOSED)).toBe(false);
    // The P2-1 regression pin: this is the exact transition that used to
    // re-open locked scores (isScoreLocked(CLOSED) === false) after winners
    // were announced.
    expect(isCompetitionClosable(CompetitionStatus.JUDGED)).toBe(false);
  });

  it('judging claims exactly CLOSED', () => {
    expect([...JUDGEABLE_COMPETITION_STATUSES]).toEqual(['CLOSED']);
    expect(isCompetitionJudgeable(CompetitionStatus.CLOSED)).toBe(true);
    // No skip: judging straight from OPEN stays illegal.
    expect(isCompetitionJudgeable(CompetitionStatus.OPEN)).toBe(false);
    expect(isCompetitionJudgeable(CompetitionStatus.JUDGED)).toBe(false);
  });

  it('the status × action matrix — JUDGED is terminal for every lifecycle write', () => {
    // The single table the conditional updateMany claims enforce. Locked
    // scores stay locked by construction: close cannot leave OPEN behind a
    // JUDGED row, judge cannot leave CLOSED, and the score write claims
    // exactly the negation of isScoreLocked.
    for (const s of [CompetitionStatus.OPEN, CompetitionStatus.CLOSED, CompetitionStatus.JUDGED]) {
      expect(isCompetitionClosable(s)).toBe(s === CompetitionStatus.OPEN);
      expect(isCompetitionJudgeable(s)).toBe(s === CompetitionStatus.CLOSED);
      expect(isScoreLocked(s)).toBe(s === CompetitionStatus.JUDGED);
    }
  });
});

/* ═══════════════ Non-organizer entry view ═══════════════ */

describe('toPublicEntryView', () => {
  const fullEntry = {
    id: 'entry1',
    title: 'مشاركة في مسابقة البرمجة',
    body: 'نص المشاركة الكامل — organizer-only',
    fileUrl: 'https://files.example/entry1.pdf',
    submittedAt: new Date('2026-01-01T00:00:00.000Z'),
    score: null,
    user: { firstName: 'سالم', lastName: 'أحمد', avatarColor: '#B57438', avatarInitials: 'سأ' },
  };

  it('projects only the summary fields — body and file never leak', () => {
    const view = toPublicEntryView(fullEntry);
    expect(view).toEqual({
      id: 'entry1',
      title: 'مشاركة في مسابقة البرمجة',
      submittedAt: fullEntry.submittedAt,
      score: null,
      user: fullEntry.user,
    });
    expect('body' in view).toBe(false);
    expect('fileUrl' in view).toBe(false);
  });
});

/* ═══════════════ zod envelopes ═══════════════ */

describe('rsvpSchema', () => {
  it('accepts exactly the three RSVP statuses', () => {
    expect(rsvpSchema.safeParse({ status: 'GOING' }).success).toBe(true);
    expect(rsvpSchema.safeParse({ status: 'MAYBE' }).success).toBe(true);
    expect(rsvpSchema.safeParse({ status: 'NO' }).success).toBe(true);
  });

  it('rejects unknown statuses, missing status, and unknown keys', () => {
    expect(rsvpSchema.safeParse({ status: 'going' }).success).toBe(false);
    expect(rsvpSchema.safeParse({ status: 'ATTENDING' }).success).toBe(false);
    expect(rsvpSchema.safeParse({}).success).toBe(false);
    expect(rsvpSchema.safeParse({ status: 'GOING', extra: 1 }).success).toBe(false);
  });
});

describe('createEventSchema', () => {
  const base = {
    title: 'ملتقى الطلبة السنوي',
    description: 'وصف الفعالية الكامل مع التفاصيل',
    location: 'قاعة المؤتمرات الكبرى',
    startsAt: '2026-03-01T10:00:00.000Z',
    endsAt: '2026-03-01T12:00:00.000Z',
  };

  it('coerces ISO strings to Dates and defaults capacity to 100', () => {
    const parsed = createEventSchema.parse(base);
    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.endsAt).toBeInstanceOf(Date);
    expect(parsed.startsAt.getTime()).toBe(Date.parse(base.startsAt));
    expect(parsed.capacity).toBe(100);
  });

  it('rejects endsAt equal to or before startsAt', () => {
    expect(createEventSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...base, endsAt: '2026-02-28T10:00:00.000Z' }).success).toBe(false);
  });

  it('bounds capacity to 1..10,000 and rejects unknown keys', () => {
    expect(createEventSchema.safeParse({ ...base, capacity: 0 }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...base, capacity: 10_001 }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...base, capacity: 10_000 }).success).toBe(true);
    expect(createEventSchema.safeParse({ ...base, sneaky: true }).success).toBe(false);
  });
});
