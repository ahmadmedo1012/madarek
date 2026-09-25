/**
 * Backend unit test — the OWNER governance surface in
 * `backend/src/http/routes/owner.routes.ts`.
 *
 * Covers:
 *  - the .strict() zod envelopes (the OWNER router mutates
 *    platform-critical state — roles, account status, settings,
 *    feature flags; non-strict zod objects silently ignored unknown
 *    keys, so a typo'd field name made a request look accepted while
 *    its payload was dropped);
 *  - the settings payload caps (an unbounded value/category let a
 *    single 1 MB JSON body become a 1 MB setting row);
 *  - the pure Education-page aggregation folds (attendance trend,
 *    teacher workload) extracted so the SQL-backed routes stay thin;
 *  - the pure System-page sync-feed mapping (SyncRun row → feed
 *    entry — the feed reads the REAL SyncRun table since audit 15-a
 *    P1-5, so the mapping is pinned like every other fold).
 */
import { SyncRunStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  bucketTeacherWorkload,
  buildAttendanceTrend,
  changeRoleSchema,
  settingKeySchema,
  syncRunAction,
  toSyncFeedEntry,
  toggleFlagSchema,
  toggleStatusSchema,
  upsertSettingSchema,
} from '../../src/http/routes/owner.routes';

describe('changeRoleSchema (.strict)', () => {
  it('accepts a bare role payload', () => {
    expect(changeRoleSchema.safeParse({ role: 'TEACHER' }).success).toBe(true);
  });

  it('accepts optional TEACHER provisioning fields', () => {
    expect(
      changeRoleSchema.safeParse({
        role: 'TEACHER',
        departmentId: 'cku5c2q8x0000mc9q7v0example',
        specialty: 'هندسة البرمجيات',
      }).success,
    ).toBe(true);
  });

  it('rejects unknown keys', () => {
    const result = changeRoleSchema.safeParse({ role: 'TEACHER', isAdmin: true });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid role value', () => {
    expect(changeRoleSchema.safeParse({ role: 'SUPERADMIN' }).success).toBe(false);
  });

  it('rejects a missing role', () => {
    expect(changeRoleSchema.safeParse({}).success).toBe(false);
  });
});

describe('toggleStatusSchema (.strict)', () => {
  it('accepts a boolean isActive', () => {
    expect(toggleStatusSchema.safeParse({ isActive: true }).success).toBe(true);
    expect(toggleStatusSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('rejects stringified booleans', () => {
    expect(toggleStatusSchema.safeParse({ isActive: 'true' }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(toggleStatusSchema.safeParse({ isActive: true, reason: 'cleanup' }).success).toBe(false);
  });
});

describe('upsertSettingSchema (.strict)', () => {
  it('accepts value + category', () => {
    expect(upsertSettingSchema.safeParse({ value: '42', category: 'ai' }).success).toBe(true);
  });

  it('accepts a bare value (category defaults server-side)', () => {
    expect(upsertSettingSchema.safeParse({ value: '42' }).success).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect(upsertSettingSchema.safeParse({ value: '42', ttl: 60 }).success).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(upsertSettingSchema.safeParse({ value: 42 }).success).toBe(false);
  });

  it('caps value at 2000 chars (no 1 MB setting rows)', () => {
    expect(upsertSettingSchema.safeParse({ value: 'x'.repeat(2000) }).success).toBe(true);
    expect(upsertSettingSchema.safeParse({ value: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('caps category at 40 chars, matching the key param rigor', () => {
    expect(upsertSettingSchema.safeParse({ value: '42', category: 'c'.repeat(40) }).success).toBe(true);
    expect(upsertSettingSchema.safeParse({ value: '42', category: 'c'.repeat(41) }).success).toBe(false);
  });
});

describe('toggleFlagSchema (.strict)', () => {
  it('accepts a boolean enabled', () => {
    expect(toggleFlagSchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect(toggleFlagSchema.safeParse({ enabled: true, scope: 'beta' }).success).toBe(false);
  });
});

describe('settingKeySchema (PUT /settings/:key param)', () => {
  it('accepts identifier-style keys', () => {
    expect(settingKeySchema.safeParse('ai.chat.enabled').success).toBe(true);
    expect(settingKeySchema.safeParse('feature-flag:beta').success).toBe(true);
    expect(settingKeySchema.safeParse('max_100').success).toBe(true);
    expect(settingKeySchema.safeParse('CamelCase').success).toBe(true); // i-flag: case-insensitive
  });

  it('rejects keys with spaces, slashes or non-identifier characters', () => {
    expect(settingKeySchema.safeParse('has space').success).toBe(false);
    expect(settingKeySchema.safeParse('A/B').success).toBe(false);
    expect(settingKeySchema.safeParse('مفتاح').success).toBe(false);
    expect(settingKeySchema.safeParse('key;drop').success).toBe(false);
  });

  it('rejects empty and over-long keys', () => {
    expect(settingKeySchema.safeParse('').success).toBe(false);
    expect(settingKeySchema.safeParse('x'.repeat(101)).success).toBe(false);
  });
});

// ── Education-page aggregation folds (pure) ──────────────────────

describe('buildAttendanceTrend (Education page, 6-month fold)', () => {
  // Fixed clock: mid-June 2026 → buckets Jan..Jun 2026 (UTC starts).
  const now = new Date('2026-06-15T12:00:00Z');
  const monthRow = (year: number, monthIndex: number, samples: number, present: number) => ({
    month: new Date(Date.UTC(year, monthIndex, 1)),
    samples,
    present,
  });

  it('always returns six buckets, oldest first, labeled with ar-LY month names', () => {
    const trend = buildAttendanceTrend(now, []);
    expect(trend).toHaveLength(6);
    expect(trend.map((t) => t.month)).toEqual([
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
    ]);
  });

  it('renders months without records as a gap (null pct), not a fake 0%', () => {
    const trend = buildAttendanceTrend(now, [monthRow(2026, 5, 10, 9)]);
    expect(trend.slice(0, 5).every((t) => t.attendancePct === null && t.samples === 0)).toBe(true);
    expect(trend[5]).toEqual({ month: 'يونيو', attendancePct: 90, samples: 10 });
  });

  it('computes the rounded attendance percentage per matched month', () => {
    const trend = buildAttendanceTrend(now, [
      monthRow(2026, 1, 4, 3), // Feb: 75%
      monthRow(2026, 2, 3, 1), // Mar: 33% (rounds down)
      monthRow(2026, 3, 7, 6), // Apr: 86% (rounds up from 85.7)
    ]);
    expect(trend[1]).toEqual({ month: 'فبراير', attendancePct: 75, samples: 4 });
    expect(trend[2]).toEqual({ month: 'مارس', attendancePct: 33, samples: 3 });
    expect(trend[3]).toEqual({ month: 'أبريل', attendancePct: 86, samples: 7 });
  });

  it('normalizes mid-month row dates onto their month bucket', () => {
    const trend = buildAttendanceTrend(now, [
      { month: new Date(Date.UTC(2026, 1, 17)), samples: 5, present: 5 },
    ]);
    expect(trend[1]).toEqual({ month: 'فبراير', attendancePct: 100, samples: 5 });
  });

  it('ignores months outside the six-bucket window', () => {
    const trend = buildAttendanceTrend(now, [
      monthRow(2025, 11, 8, 8), // Dec 2025 — before the window
      monthRow(2026, 6, 9, 9), // Jul 2026 — after `now`'s month
    ]);
    expect(trend.every((t) => t.samples === 0 && t.attendancePct === null)).toBe(true);
  });

  it('rolls the window back across a year boundary', () => {
    // Mid-March 2026 → buckets Oct 2025 .. Mar 2026.
    const trend = buildAttendanceTrend(new Date('2026-03-15T00:00:00Z'), [
      monthRow(2025, 9, 6, 3), // Oct 2025: 50%
    ]);
    expect(trend.map((t) => t.month)).toEqual([
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
      'يناير',
      'فبراير',
      'مارس',
    ]);
    expect(trend[0]).toEqual({ month: 'أكتوبر', attendancePct: 50, samples: 6 });
  });
});

describe('bucketTeacherWorkload (Education page, workload fold)', () => {
  it('all teachers idle when no offerings exist', () => {
    expect(bucketTeacherWorkload([], 5)).toEqual({
      idle: 5,
      one: 0,
      two: 0,
      three: 0,
      fourPlus: 0,
    });
  });

  it('distributes per-teacher offering counts into buckets', () => {
    expect(bucketTeacherWorkload([1, 2, 3, 4, 7], 6)).toEqual({
      idle: 1,
      one: 1,
      two: 1,
      three: 1,
      fourPlus: 2,
    });
  });

  it('clamps idle to 0 when offering holders exceed the teacher count (anomalous data)', () => {
    expect(bucketTeacherWorkload([1, 1, 1, 1], 2)).toEqual({
      idle: 0,
      one: 4,
      two: 0,
      three: 0,
      fourPlus: 0,
    });
  });

  it('zero-count entries land in no bucket (groupBy never emits them)', () => {
    // A 0-count groupBy row is impossible; if one ever arrived it must
    // not distort the distribution buckets. It still counts as a row
    // holder for the idle calc — exactly like the previous inline code
    // (idle = teachers − groupBy row count).
    expect(bucketTeacherWorkload([0, 1], 3)).toEqual({
      idle: 1,
      one: 1,
      two: 0,
      three: 0,
      fourPlus: 0,
    });
  });
});

// ── System-page sync feed (pure SyncRun mapping — audit 15-a P1-5) ─

describe('syncRunAction (SyncRun status → feed action vocabulary)', () => {
  it('maps every SyncRunStatus onto an action the System page label map knows', () => {
    // The FE label map (OwnerSystemPage SYNC_ACTION_LABEL) knows
    // exactly 'sync.run' / 'sync.partial' / 'sync.failed' — no status
    // may leak a raw enum string into the Arabic UI.
    expect([...new Set(Object.values(SyncRunStatus).map(syncRunAction))].sort()).toEqual([
      'sync.failed',
      'sync.partial',
      'sync.run',
    ]);
  });

  it("SUCCESS → sync.run (every run is a full sync — runSync has no partial semantics)", () => {
    expect(syncRunAction(SyncRunStatus.SUCCESS)).toBe('sync.run');
  });

  it('FAILED → sync.failed (the FE badge turns red on .includes("failed"))', () => {
    expect(syncRunAction(SyncRunStatus.FAILED)).toBe('sync.failed');
  });

  it('PARTIAL → sync.partial (reserved enum value runSync never writes today)', () => {
    expect(syncRunAction(SyncRunStatus.PARTIAL)).toBe('sync.partial');
  });

  it('RUNNING → sync.partial — an in-flight run renders as not-complete, never as success', () => {
    expect(syncRunAction(SyncRunStatus.RUNNING)).toBe('sync.partial');
  });
});

describe('toSyncFeedEntry (SyncRun row → System-page feed entry)', () => {
  const run = {
    id: 'run-1',
    startedAt: new Date('2026-06-15T08:00:00Z'),
    completedAt: new Date('2026-06-15T08:00:03Z'),
    status: SyncRunStatus.SUCCESS,
    source: 'static-markdown',
    factsAdded: 12,
    factsUpdated: 3,
    durationMs: 3_140,
    errorMsg: null,
    notes: 'Synced 15 fact(s) from static-markdown.',
  };

  it('keeps the feed shape the System page consumes (id / action / at / actor / metadata)', () => {
    const entry = toSyncFeedEntry(run);

    expect(entry.id).toBe('run-1');
    expect(entry.action).toBe('sync.run');
    expect(entry.at).toBe(run.startedAt);
    // SyncRun carries no user attribution — every run is
    // system-initiated (scheduler tick or guarded manual trigger).
    expect(entry.actor).toBe('النظام');
  });

  it('carries the run outcome detail in metadata for diagnosis', () => {
    expect(toSyncFeedEntry(run).metadata).toEqual({
      status: SyncRunStatus.SUCCESS,
      source: 'static-markdown',
      factsAdded: 12,
      factsUpdated: 3,
      durationMs: 3_140,
      completedAt: run.completedAt,
      errorMsg: null,
      notes: 'Synced 15 fact(s) from static-markdown.',
    });
  });

  it('preserves the failure detail of a FAILED run', () => {
    const entry = toSyncFeedEntry({
      ...run,
      id: 'run-2',
      status: SyncRunStatus.FAILED,
      factsAdded: 0,
      factsUpdated: 0,
      errorMsg: 'Error: connection reset',
      notes: null,
    });

    expect(entry.action).toBe('sync.failed');
    expect(entry.metadata.errorMsg).toBe('Error: connection reset');
  });

  it("anchors the timeline on the run START (matching the admin sync view’s startedAt ordering)", () => {
    const entry = toSyncFeedEntry({ ...run, status: SyncRunStatus.RUNNING, completedAt: null });

    expect(entry.at).toBe(run.startedAt);
    expect(entry.action).toBe('sync.partial');
    expect(entry.metadata.completedAt).toBeNull();
  });
});
