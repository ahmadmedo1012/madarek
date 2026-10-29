/**
 * r323 B2.4 — live sessions core (pure layer) — the contract tests.
 */
import { describe, expect, it } from 'vitest';
import {
  attendanceDayBucket,
  canJoin,
  canTransition,
  defaultJoinUrlFor,
  jitsiRoomNameFor,
  jitsiUrlFor,
  transitionError,
} from '../../src/modules/live/core.js';

describe('live/core — the Jitsi default', () => {
  it('derives a stable, prefixed, sanitized room name from the session id', () => {
    const id = 'clxabc123def456ghi';
    expect(jitsiRoomNameFor(id)).toMatch(/^madarek-[a-z0-9]{1,12}$/);
    expect(jitsiRoomNameFor(id)).toBe(jitsiRoomNameFor(id));
    expect(jitsiRoomNameFor('clx!!weird__id!!')).not.toMatch(/[^a-z0-9-]/);
  });

  it('encodes the room into a meet.jit.si URL (idempotent, safe chars only)', () => {
    expect(jitsiUrlFor('madarek-abc123')).toBe('https://meet.jit.si/madarek-abc123');
    expect(jitsiUrlFor('a b')).toBe('https://meet.jit.si/a%20b');
    expect(defaultJoinUrlFor('clxabc123def456ghi')).toContain('https://meet.jit.si/madarek-');
  });
});

describe('live/core — the lifecycle guard', () => {
  it('allows SCHEDULED → LIVE/CANCELLED and LIVE → ENDED/CANCELLED only', () => {
    expect(canTransition('SCHEDULED', 'LIVE')).toBe(true);
    expect(canTransition('SCHEDULED', 'CANCELLED')).toBe(true);
    expect(canTransition('LIVE', 'ENDED')).toBe(true);
    expect(canTransition('LIVE', 'CANCELLED')).toBe(true);
    expect(canTransition('SCHEDULED', 'ENDED')).toBe(false);
    expect(canTransition('ENDED', 'LIVE')).toBe(false);
    expect(canTransition('CANCELLED', 'LIVE')).toBe(false);
    expect(canTransition('ENDED', 'CANCELLED')).toBe(false);
  });

  it('writes the Arabic transition error naming both states', () => {
    expect(transitionError('ENDED', 'LIVE')).toContain('منتهية');
    expect(transitionError('ENDED', 'LIVE')).toContain('جارية');
  });
});

describe('live/core — the join window + attendance bucket', () => {
  const scheduled = new Date('2026-11-01T10:00:00.000Z');

  it('opens 10 minutes before the scheduled start (early bird joins)', () => {
    expect(canJoin('SCHEDULED', scheduled, new Date('2026-11-01T09:49:00.000Z')).ok).toBe(false);
    expect(canJoin('SCHEDULED', scheduled, new Date('2026-11-01T09:50:00.000Z')).ok).toBe(true);
    expect(canJoin('SCHEDULED', scheduled, new Date('2026-11-01T09:50:00.000Z')).reason).toBeUndefined();
  });

  it('LIVE always joins; ENDED/CANCELLED never do — with Arabic reasons', () => {
    expect(canJoin('LIVE', scheduled, new Date('2026-11-01T10:30:00.000Z')).ok).toBe(true);
    const ended = canJoin('ENDED', scheduled);
    expect(ended.ok).toBe(false);
    expect(ended.reason).toContain('انتهت');
    const cancelled = canJoin('CANCELLED', scheduled);
    expect(cancelled.ok).toBe(false);
    expect(cancelled.reason).toContain('ملغاة');
  });

  it('buckets attendance by the UTC calendar day (the 15-h P1-1 convention)', () => {
    expect(attendanceDayBucket(new Date('2026-11-01T21:30:00.000Z'))).toBe('2026-11-01');
    expect(attendanceDayBucket(new Date('2026-11-01T00:00:00.000Z'))).toBe('2026-11-01');
  });
});
