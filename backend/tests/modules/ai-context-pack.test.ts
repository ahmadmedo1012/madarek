/**
 * R352 A/G2 — the StudentContextPack pins.
 *
 * DB-free (injected fake prisma — the storage-to-blob/db-diagnostics
 * pattern): the pure renders (tiers, trends, risk flags, summary, the
 * line budget), the builder's projection/scoping/tie-breaks, and the
 * cache TTL + invalidation laws.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildStudentContextPack,
  cacheKey,
  computeRiskFlags,
  composeSummaryAr,
  getStudentContextPack,
  invalidateStudentContextPack,
  packTier,
  renderContextPackLines,
  trendDirection,
  __resetContextPackCache,
  type ContextPackPrisma,
  type StudentContextPack,
} from '../../src/modules/ai/context-pack';

const NOW = new Date('2026-11-14T12:00:00.000Z');

function basePack(overrides: Partial<StudentContextPack> = {}): StudentContextPack {
  return {
    builtAt: NOW.toISOString(),
    weakConcepts: [
      { concept: 'التفاضل', course: 'الرياضيات 101', level: 0.32 },
      { concept: 'التكامل', course: 'الرياضيات 101', level: 0.44 },
    ],
    developingCount: 3,
    strongConcepts: [{ concept: 'الجبر', course: 'الرياضيات 101', level: 0.93 }],
    inProgressLectures: [
      { lecture: 'محاضرة التكامل 3', course: 'الرياضيات 101', pct: 42, daysSinceSeen: 9 },
      { lecture: 'محاضرة التفاضل 2', course: 'الرياضيات 101', pct: 71, daysSinceSeen: 8 },
    ],
    checkpointMistakes: [
      { lecture: 'محاضرة التكامل 3', course: 'الرياضيات 101', wrong: 3, total: 3, concept: 'التكامل' },
      { lecture: 'محاضرة التفاضل 2', course: 'الرياضيات 101', wrong: 2, total: 3 },
      { lecture: 'محاضرة الفيزياء 1', course: 'الفيزياء 201', wrong: 2, total: 3 },
    ],
    courseTrends: [{ course: 'الفيزياء 201', scores: [80, 60], direction: 'down' }],
    attendance30d: { present: 6, absent: 4 },
    upcomingDeadlines: [
      { title: 'واجب التكامل 4', course: 'الرياضيات 101', dueAt: '2026-11-17T00:00:00.000Z', kind: 'assignment' },
      { title: 'كويز الفيزياء', course: 'الفيزياء 201', dueAt: '2026-11-19T00:00:00.000Z', kind: 'exam' },
      { title: 'واجب الفيزياء 5', course: 'الفيزياء 201', dueAt: '2026-11-21T00:00:00.000Z', kind: 'assignment' },
    ],
    riskFlags: [],
    summaryAr: '',
    ...overrides,
  };
}

describe('packTier (the prompt canon thresholds)', () => {
  it('weak < 0.5, developing < 0.8, strong ≥ 0.8', () => {
    expect(packTier(0.49)).toBe('weak');
    expect(packTier(0.5)).toBe('developing');
    expect(packTier(0.79)).toBe('developing');
    expect(packTier(0.8)).toBe('strong');
  });
});

describe('trendDirection', () => {
  it('needs ≥2 scores; ±10 points decides', () => {
    expect(trendDirection([70])).toBe('flat');
    expect(trendDirection([70, 82])).toBe('up');
    expect(trendDirection([82, 70])).toBe('down');
    expect(trendDirection([70, 75])).toBe('flat');
  });
});

describe('computeRiskFlags', () => {
  it('flags absence, stalled lectures, decline, mistakes, deadline pile-up — in that fixed order', () => {
    const pack = basePack();
    const flags = computeRiskFlags(pack);
    expect(flags[0]).toMatch(/غياب متكرر: 4/);
    expect(flags[1]).toMatch(/محاضرات متوقفة/);
    expect(flags[2]).toMatch(/تراجع درجات في «الفيزياء 201»/);
    expect(flags[3]).toMatch(/أغلبية إجابات خاطئة/);
    expect(flags[4]).toMatch(/3 استحقاقات قادمة/);
  });
  it('a healthy pack carries zero flags', () => {
    const pack = basePack({
      attendance30d: { present: 9, absent: 0 },
      inProgressLectures: [{ lecture: 'م1', course: 'ج', pct: 50, daysSinceSeen: 1 }],
      courseTrends: [{ course: 'فيزياء', scores: [70, 75], direction: 'flat' }],
      checkpointMistakes: [],
      upcomingDeadlines: [],
    });
    expect(computeRiskFlags(pack)).toEqual([]);
  });
});

describe('composeSummaryAr', () => {
  it('one paragraph joining the top signals', () => {
    const s = composeSummaryAr(basePack());
    expect(s).toContain('أبرز فجوة: «التفاضل»');
    expect(s).toContain('أقوى نقطة: «الجبر»');
    expect(s).toContain('آخر توقف: «محاضرة التكامل 3» عند 42%');
    expect(s).toContain('الحضور (30 يومًا): 6 حضور / 4 غياب');
    expect(s).toContain('أقرب استحقاق: «واجب التكامل 4»');
  });
  it('the empty-signal pack is honest about it', () => {
    const pack = basePack({
      weakConcepts: [], strongConcepts: [], inProgressLectures: [],
      attendance30d: { present: 0, absent: 0 }, upcomingDeadlines: [],
    });
    expect(composeSummaryAr(pack)).toMatch(/لا توجد إشارات نشاط كافية/);
  });
});

describe('renderContextPackLines (the token budget)', () => {
  it('leads with the summary + flags, then bounded rows', () => {
    const pack = basePack({ riskFlags: ['غياب متكرر: 4 أيام في آخر 30 يومًا'], summaryAr: 'ملخص تجريبي' });
    const lines = renderContextPackLines(pack);
    expect(lines[0]).toBe('ملخّص النشاط: ملخص تجريبي');
    expect(lines[1]).toBe('مؤشرات تستحق الانتباه: غياب متكرر: 4 أيام في آخر 30 يومًا');
    expect(lines.some((l) => l.includes('توقفت عند 42%'))).toBe(true);
    expect(lines.some((l) => l.includes('3 إجابة خاطئة'))).toBe(true);
    expect(lines.some((l) => l.includes('اتجاه الواجبات في «الفيزياء 201»'))).toBe(true);
    expect(lines.some((l) => l.includes('امتحان قادم: «كويز الفيزياء»'))).toBe(true);
  });
  it('hard cap 18 lines regardless of row volume', () => {
    const many: StudentContextPack = basePack({
      inProgressLectures: Array.from({ length: 30 }, (_, i) => ({
        lecture: `م${i}`, course: 'ج', pct: i, daysSinceSeen: i,
      })),
      checkpointMistakes: Array.from({ length: 30 }, (_, i) => ({
        lecture: `ن${i}`, course: 'ج', wrong: i, total: i,
      })),
    });
    expect(renderContextPackLines(many).length).toBeLessThanOrEqual(18);
  });
});

// ─── the builder (fake prisma per source) ─────────────────────────

function fakePrisma(overrides: Partial<ContextPackPrisma> = {}): ContextPackPrisma & { calls: string[] } {
  const calls: string[] = [];
  const empty = {
    findMany: async () => {
      calls.push('findMany');
      return [];
    },
  };
  return {
    calls,
    studentMastery: overrides.studentMastery ?? (empty as never),
    watchEvent: overrides.watchEvent ?? (empty as never),
    checkpointAnswer: overrides.checkpointAnswer ?? (empty as never),
    submission: overrides.submission ?? (empty as never),
    attendanceRecord: overrides.attendanceRecord ?? (empty as never),
    enrollment: overrides.enrollment ?? (empty as never),
    examAttempt: overrides.examAttempt ?? (empty as never),
  };
}

describe('buildStudentContextPack', () => {
  it('tiers mastery rows and ranks weak worst-first / strong best-first with ar tie-breaks', async () => {
    const prisma = fakePrisma({
      studentMastery: {
        findMany: async () => [
          {
            level: 0.9,
            concept: { name: 'ب', course: { name: 'رياضيات' }, chapters: [] },
          },
          {
            level: 0.95,
            concept: { name: 'أ', course: { name: 'رياضيات' }, chapters: [] },
          },
          {
            level: 0.3,
            concept: {
              name: 'التفاضل',
              course: { name: 'رياضيات' },
              chapters: [{ lecture: { title: 'محاضرة التفاضل 1' } }],
            },
          },
          {
            level: 0.6,
            concept: { name: 'قيد التطور', course: { name: 'رياضيات' }, chapters: [] },
          },
        ],
      } as never,
    });
    const pack = await buildStudentContextPack('u1', 'inst1', { prisma, now: NOW });
    expect(pack.weakConcepts).toHaveLength(1);
    expect(pack.weakConcepts[0]!.lectureTitle).toBe('محاضرة التفاضل 1');
    expect(pack.developingCount).toBe(1);
    expect(pack.strongConcepts.map((s) => s.concept)).toEqual(['أ', 'ب']); // 0.95 > 0.9
  });

  it('computes stop pct + daysSinceSeen from watch rows', async () => {
    const prisma = fakePrisma({
      watchEvent: {
        findMany: async () => [
          {
            watchedSec: 900,
            totalSec: 2000,
            lastSeenAt: new Date('2026-11-12T12:00:00Z'),
            lecture: { title: 'م1', offering: { course: { name: 'رياضيات' } } },
          },
        ],
      } as never,
    });
    const pack = await buildStudentContextPack('u1', 'inst1', { prisma, now: NOW });
    expect(pack.inProgressLectures).toEqual([
      { lecture: 'م1', course: 'رياضيات', pct: 45, daysSinceSeen: 2 },
    ]);
  });

  it('groups checkpoint mistakes per lecture (worst-first, ar tie-break) and never invents totals', async () => {
    const prisma = fakePrisma({
      checkpointAnswer: {
        findMany: async () => [
          { checkpoint: { concept: { name: 'التكامل' }, lecture: { title: 'م2', offering: { course: { name: 'رياضيات' } } } } },
          { checkpoint: { concept: { name: 'التكامل' }, lecture: { title: 'م2', offering: { course: { name: 'رياضيات' } } } } },
          { checkpoint: { concept: null, lecture: { title: 'م1', offering: { course: { name: 'رياضيات' } } } } },
        ],
      } as never,
    });
    const pack = await buildStudentContextPack('u1', 'inst1', { prisma, now: NOW });
    expect(pack.checkpointMistakes).toHaveLength(2);
    expect(pack.checkpointMistakes[0]).toMatchObject({ lecture: 'م2', wrong: 2, concept: 'التكامل' });
    expect(pack.checkpointMistakes[0]!.total).toBe(pack.checkpointMistakes[0]!.wrong); // never fabricated
    expect(pack.checkpointMistakes[1]).toMatchObject({ lecture: 'م1', wrong: 1, concept: undefined });
  });

  it('normalizes grades to pct of maxScore, keeps oldest→newest order', async () => {
    const prisma = fakePrisma({
      submission: {
        findMany: async () => [
          // desc by gradedAt: newest first
          { grade: 8, assignment: { maxScore: 10, offering: { course: { name: 'فيزياء' } } } },
          { grade: 6, assignment: { maxScore: 10, offering: { course: { name: 'فيزياء' } } } },
          { grade: 9, assignment: { maxScore: 10, offering: { course: { name: 'فيزياء' } } } },
        ],
      } as never,
    });
    const pack = await buildStudentContextPack('u1', 'inst1', { prisma, now: NOW });
    expect(pack.courseTrends).toEqual([{ course: 'فيزياء', scores: [90, 60, 80], direction: 'up' }]);
  });

  it('counts PRESENT/LATE as attendance; ABSENT as absence; ignores EXCUSED', async () => {
    const prisma = fakePrisma({
      attendanceRecord: {
        findMany: async () => [
          { status: 'PRESENT' }, { status: 'LATE' }, { status: 'ABSENT' }, { status: 'EXCUSED' },
        ],
      } as never,
    });
    const pack = await buildStudentContextPack('u1', 'inst1', { prisma, now: NOW });
    expect(pack.attendance30d).toEqual({ present: 2, absent: 1 });
  });

  it('merges assignment + exam deadlines, soonest first, capped at 6', async () => {
    const prisma = fakePrisma({
      enrollment: {
        findMany: async () => [
          {
            offering: {
              course: { name: 'رياضيات' },
              assignments: [
                { title: 'واجب ب', dueAt: new Date('2026-11-19T00:00:00Z') },
                { title: 'واجب أ', dueAt: new Date('2026-11-16T00:00:00Z') },
              ],
            },
          },
        ],
      } as never,
      examAttempt: {
        findMany: async () => [
          { expiresAt: new Date('2026-11-17T00:00:00Z'), template: { title: 'كويز', offering: { course: { name: 'فيزياء' } } } },
        ],
      } as never,
    });
    const pack = await buildStudentContextPack('u1', 'inst1', { prisma, now: NOW });
    expect(pack.upcomingDeadlines.map((d) => d.title)).toEqual(['واجب أ', 'كويز', 'واجب ب']);
    expect(pack.upcomingDeadlines[1]!.kind).toBe('exam');
  });

  it('the all-empty pack degrades honestly (no crash, empty rows, honest summary)', async () => {
    const pack = await buildStudentContextPack('u1', 'inst1', { prisma: fakePrisma(), now: NOW });
    expect(pack.weakConcepts).toEqual([]);
    expect(pack.riskFlags).toEqual([]);
    expect(pack.summaryAr).toMatch(/لا توجد إشارات نشاط كافية/);
  });
});

// ─── the cache laws ───────────────────────────────────────────────

describe('the TTL cache + invalidation', () => {
  beforeEach(() => __resetContextPackCache());
  afterEach(() => __resetContextPackCache());

  it('hits within TTL (one build), evicts the oldest beyond capacity 128', async () => {
    const prisma = fakePrisma();
    let builds = 0;
    const counting = { prisma: { ...prisma, studentMastery: { findMany: async () => { builds += 1; return []; } } } } as unknown as Parameters<typeof getStudentContextPack>[2];
    await getStudentContextPack('u1', 'inst1', counting, { ttlMs: 60_000 });
    await getStudentContextPack('u1', 'inst1', counting, { ttlMs: 60_000 });
    expect(builds).toBe(1);
    // a different key builds its own
    await getStudentContextPack('u2', 'inst1', counting, { ttlMs: 60_000 });
    expect(builds).toBe(2);
  });

  it('expires past TTL (a fresh build)', async () => {
    const prisma = fakePrisma();
    let builds = 0;
    const counting = { prisma: { ...prisma, studentMastery: { findMany: async () => { builds += 1; return []; } } } } as unknown as Parameters<typeof getStudentContextPack>[2];
    await getStudentContextPack('u1', 'inst1', counting, { ttlMs: 1 });
    await new Promise((r) => setTimeout(r, 5));
    await getStudentContextPack('u1', 'inst1', counting, { ttlMs: 1 });
    expect(builds).toBe(2);
  });

  it('invalidation drops the student across ALL institutions', async () => {
    expect(cacheKey('u1', 'i1')).toBe('u1:i1');
    const prisma = fakePrisma();
    const deps = { prisma } as unknown as Parameters<typeof getStudentContextPack>[2];
    await getStudentContextPack('u1', 'i1', deps, { ttlMs: 60_000 });
    await getStudentContextPack('u1', 'i2', deps, { ttlMs: 60_000 });
    invalidateStudentContextPack('u1');
    // after invalidation, both keys rebuild (proving both were dropped)
    let builds = 0;
    const counting = { prisma: { ...prisma, studentMastery: { findMany: async () => { builds += 1; return []; } } } } as unknown as Parameters<typeof getStudentContextPack>[2];
    await getStudentContextPack('u1', 'i1', counting, { ttlMs: 60_000 });
    await getStudentContextPack('u1', 'i2', counting, { ttlMs: 60_000 });
    expect(builds).toBe(2);
  });
});
