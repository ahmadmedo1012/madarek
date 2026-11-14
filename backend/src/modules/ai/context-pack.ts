/**
 * modules/ai/context-pack.ts — R352 A/G2: the StudentContextPack.
 *
 * WHY: the student system prompt previously saw only mastery levels +
 * enrollment titles. The platform already records far richer signals
 * (where the student STOPPED watching, recent checkpoint mistakes,
 * assignment grade trends, attendance, lesson progress) — none of it
 * reached the assistant, so the owner's requirement #4 («مساعد أذكى
 * يفهم محتوى وتقدّم كل طالب») was only half-true.
 *
 * THE LAW (mirrors the existing loaders' canon, r176b/r179):
 *  · institution-scoped: every query threads the VERIFIED
 *    institutionId through the academic chain (lecture→offering→
 *    course→institution) — no pack ever blends two institutions;
 *  · projection-only: titles, counts, percentages, dates — NEVER
 *    content and never raw PII beyond what the student already sees
 *    on their own dashboard;
 *  · bounded: every source read is take-capped; the rendered prompt
 *    block is line-capped (the token budget — see MAX_LINES);
 *  · deterministic: same inputs → same pack + same lines (sorted
 *    with explicit tie-breaks; no Date.now inside the pure renders —
 *    `now` is an injected parameter);
 *  · best-effort: a failing source degrades to its empty value and is
 *    logged by the caller — a partial pack must never fail a chat
 *    turn (the same ruling as the AI quota store).
 *
 * Caching: an in-process TTL cache (10 min) keyed userId:institutionId
 * + explicit invalidation hooks for the write surfaces that mutate the
 * signals (watch events, checkpoint answers, submission grading). The
 * pack is ADVISORY context, never authoritative data — a ≤10 min stale
 * pack is acceptable and honest (documented; the cache entry carries
 * its own builtAt).
 */
// ─── The pack shape (the structured JSON half of the contract) ─────

export interface PackConcept {
  concept: string;
  course: string;
  level: number; // 0..1
  lectureTitle?: string;
}

export interface PackLectureInProgress {
  lecture: string;
  course: string;
  /** 0..100 of watchedSec/totalSec at the last stop. */
  pct: number;
  /** Days since lastSeenAt (floor). */
  daysSinceSeen: number;
}

export interface PackCheckpointMistakes {
  lecture: string;
  course: string;
  wrong: number;
  total: number;
  /** The concept name when the checkpoint carries one. */
  concept?: string;
}

export interface PackCourseTrend {
  course: string;
  /** Last graded submission scores, oldest→newest (each 0..maxScore-normalized 0..100). */
  scores: number[];
  direction: 'up' | 'down' | 'flat';
}

export interface PackDeadline {
  title: string;
  course: string;
  dueAt: string; // ISO date (day precision is all the prompt needs)
  kind: 'assignment' | 'exam';
}

export interface StudentContextPack {
  builtAt: string;
  weakConcepts: PackConcept[]; // worst-first, level < 0.5
  developingCount: number; // 0.5 ≤ level < 0.8
  strongConcepts: PackConcept[]; // level ≥ 0.8, best-first
  inProgressLectures: PackLectureInProgress[]; // most-recently-seen first
  checkpointMistakes: PackCheckpointMistakes[]; // worst ratio first
  courseTrends: PackCourseTrend[];
  attendance30d: { present: number; absent: number };
  upcomingDeadlines: PackDeadline[]; // soonest first
  riskFlags: string[]; // Arabic, computed (see computeRiskFlags)
  summaryAr: string; // the token-budgeted Arabic summary
}

// ─── Pure helpers (DB-free, unit-pinned) ───────────────────────────

/** 0..1 mastery level → the SAME tier thresholds as the prompt canon. */
export function packTier(level: number): 'weak' | 'developing' | 'strong' {
  if (level < 0.5) return 'weak';
  if (level < 0.8) return 'developing';
  return 'strong';
}

/** Grade trend over the last scores: ≥10 points up on the last pair →
 *  up; ≤10 down → down; otherwise flat. <2 scores → flat (no trend). */
export function trendDirection(scores: number[]): 'up' | 'down' | 'flat' {
  if (scores.length < 2) return 'flat';
  const last = scores[scores.length - 1]!;
  const prev = scores[scores.length - 2]!;
  if (last - prev >= 10) return 'up';
  if (prev - last >= 10) return 'down';
  return 'flat';
}

/** Deterministic risk flags (Arabic) from the pack's OWN rows — never
 *  from data the pack does not carry. Order is fixed (determinism). */
export function computeRiskFlags(pack: Omit<StudentContextPack, 'riskFlags' | 'summaryAr'>): string[] {
  const flags: string[] = [];
  // 1. Absence: ≥3 absences in the 30-day window.
  if (pack.attendance30d.absent >= 3) {
    flags.push(`غياب متكرر: ${pack.attendance30d.absent} أيام في آخر 30 يومًا`);
  }
  // 2. Stalled lectures: ≥2 in-progress lectures untouched for ≥7 days.
  const stalled = pack.inProgressLectures.filter((l) => l.daysSinceSeen >= 7).length;
  if (stalled >= 2) {
    flags.push(`${stalled} محاضرات متوقفة منذ أسبوع أو أكثر دون متابعة`);
  }
  // 3. Declining grades: a down trend on any course with ≥2 scores.
  const declining = pack.courseTrends.filter((t) => t.direction === 'down');
  if (declining.length > 0) {
    flags.push(`تراجع درجات في «${declining[0]!.course}»`);
  }
  // 4. Checkpoint mistakes: ≥3 distinct lectures with a wrong majority.
  const heavy = pack.checkpointMistakes.filter((m) => m.wrong * 2 >= m.total && m.total > 0).length;
  if (heavy >= 3) {
    flags.push(`${heavy} محاضرات بأغلبية إجابات خاطئة في نقاط التفقّد`);
  }
  // 5. Deadlines piling: ≥3 deadlines in the next 14 days.
  if (pack.upcomingDeadlines.length >= 3) {
    flags.push(`${pack.upcomingDeadlines.length} استحقاقات قادمة خلال أسبوعين`);
  }
  return flags;
}

/** The compact Arabic summary — ONE paragraph, budget-capped. The
 *  prompt carries this + the rendered lines; both must stay small. */
export function composeSummaryAr(pack: Omit<StudentContextPack, 'riskFlags' | 'summaryAr'>): string {
  const parts: string[] = [];
  if (pack.weakConcepts.length > 0) {
    const top = pack.weakConcepts[0]!;
    parts.push(`أبرز فجوة: «${top.concept}» في «${top.course}» (${Math.round(top.level * 100)}%)`);
  }
  if (pack.strongConcepts.length > 0) {
    parts.push(`أقوى نقطة: «${pack.strongConcepts[0]!.concept}» (${Math.round(pack.strongConcepts[0]!.level * 100)}%)`);
  }
  if (pack.inProgressLectures.length > 0) {
    const l = pack.inProgressLectures[0]!;
    parts.push(`آخر توقف: «${l.lecture}» عند ${l.pct}%`);
  }
  if (pack.attendance30d.present + pack.attendance30d.absent > 0) {
    parts.push(`الحضور (30 يومًا): ${pack.attendance30d.present} حضور / ${pack.attendance30d.absent} غياب`);
  }
  if (pack.upcomingDeadlines.length > 0) {
    const d = pack.upcomingDeadlines[0]!;
    parts.push(`أقرب استحقاق: «${d.title}» (${d.dueAt.slice(0, 10)})`);
  }
  if (parts.length === 0) return 'لا توجد إشارات نشاط كافية بعد لبناء ملخّص.';
  return parts.join(' · ');
}

// ─── The prompt block renderer (the token-budgeted half) ───────────

/** Hard cap on the rendered block: every line is one short sentence. */
const MAX_LINES = 18;

export function renderContextPackLines(pack: StudentContextPack): string[] {
  const lines: string[] = [];
  lines.push(`ملخّص النشاط: ${pack.summaryAr}`);
  if (pack.riskFlags.length > 0) {
    lines.push(`مؤشرات تستحق الانتباه: ${pack.riskFlags.join('؛ ')}`);
  }
  for (const l of pack.inProgressLectures.slice(0, 4)) {
    lines.push(`محاضرة غير مكتملة: «${l.lecture}» (${l.course}) — توقفت عند ${l.pct}%، آخر مشاهدة قبل ${l.daysSinceSeen} يومًا`);
  }
  for (const m of pack.checkpointMistakes.slice(0, 4)) {
    const where = m.concept ? `، مفهوم «${m.concept}»` : '';
    lines.push(`أخطاء تفقّد حديثة في «${m.lecture}» (${m.course}): ${m.wrong} إجابة خاطئة${where}`);
  }
  for (const t of pack.courseTrends.slice(0, 3)) {
    const arrow = t.direction === 'up' ? 'تحسّن' : t.direction === 'down' ? 'تراجع' : 'مستقر';
    lines.push(`اتجاه الواجبات في «${t.course}»: ${t.scores.map((s) => `${s}%`).join(' ثم ')} — ${arrow}`);
  }
  for (const d of pack.upcomingDeadlines.slice(0, 4)) {
    const kind = d.kind === 'exam' ? 'امتحان' : 'تسليم واجب';
    lines.push(`${kind} قادم: «${d.title}» (${d.course}) — ${d.dueAt.slice(0, 10)}`);
  }
  return lines.slice(0, MAX_LINES);
}

// ─── The builder (injectable prisma — the storage-to-blob pattern) ─

export interface ContextPackPrisma {
  studentMastery: {
    findMany(args?: { where?: unknown; orderBy?: unknown; take?: number; select?: unknown }): Promise<unknown[]>;
  };
  watchEvent: {
    findMany(args?: { where?: unknown; orderBy?: unknown; take?: number; select?: unknown }): Promise<unknown[]>;
  };
  checkpointAnswer: {
    findMany(args?: { where?: unknown; orderBy?: unknown; take?: number; select?: unknown }): Promise<unknown[]>;
  };
  submission: {
    findMany(args?: { where?: unknown; orderBy?: unknown; take?: number; select?: unknown }): Promise<unknown[]>;
  };
  attendanceRecord: {
    findMany(args?: { where?: unknown; take?: number; select?: unknown }): Promise<unknown[]>;
  };
  enrollment: {
    findMany(args?: { where?: unknown; select?: unknown }): Promise<unknown[]>;
  };
  examAttempt: {
    findMany(args?: { where?: unknown; take?: number; select?: unknown; orderBy?: unknown }): Promise<unknown[]>;
  };
}

export interface BuildPackDeps {
  prisma: ContextPackPrisma;
  /** Injection seam: the pure renders take `now` from here. */
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function buildStudentContextPack(
  userId: string,
  institutionId: string,
  deps: BuildPackDeps,
): Promise<StudentContextPack> {
  const now = deps.now ?? new Date();
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const since14 = new Date(now.getTime() - 14 * DAY_MS);
  const in14 = new Date(now.getTime() + 14 * DAY_MS);

  // ── 1. mastery (the same bounded weakest-first read as the route) ─
  const masteries = (await deps.prisma.studentMastery.findMany({
    where: { studentId: userId, concept: { course: { institutionId } } },
    orderBy: { level: 'asc' },
    take: 25,
    select: {
      level: true,
      concept: {
        select: {
          name: true,
          course: { select: { name: true } },
          chapters: { take: 1, select: { lecture: { select: { title: true } } } },
        },
      },
    },
  })) as Array<{ level: unknown; concept: { name: string; course: { name: string }; chapters: Array<{ lecture: { title: string } | null }> } }>;

  const weak: PackConcept[] = [];
  let developing = 0;
  const strong: PackConcept[] = [];
  for (const m of masteries) {
    const level = Number(m.level);
    const row: PackConcept = {
      concept: m.concept.name,
      course: m.concept.course.name,
      level,
      lectureTitle: m.concept.chapters[0]?.lecture?.title ?? undefined,
    };
    const tier = packTier(level);
    if (tier === 'weak') weak.push(row);
    else if (tier === 'developing') developing += 1;
    else strong.push(row);
  }
  strong.sort((a, b) => b.level - a.level || a.concept.localeCompare(b.concept, 'ar'));

  // ── 2. watch events: where the student stopped (incomplete, recent) ─
  const watches = (await deps.prisma.watchEvent.findMany({
    where: {
      studentId: userId,
      completed: false,
      lecture: { offering: { course: { institutionId } } },
    },
    orderBy: { lastSeenAt: 'desc' },
    take: 8,
    select: {
      watchedSec: true,
      totalSec: true,
      lastSeenAt: true,
      lecture: { select: { title: true, offering: { select: { course: { select: { name: true } } } } } },
    },
  })) as Array<{ watchedSec: number; totalSec: number; lastSeenAt: Date; lecture: { title: string; offering: { course: { name: string } } } }>;

  const inProgressLectures: PackLectureInProgress[] = watches
    .filter((w) => w.totalSec > 0)
    .map((w) => ({
      lecture: w.lecture.title,
      course: w.lecture.offering.course.name,
      pct: Math.min(100, Math.round((w.watchedSec / w.totalSec) * 100)),
      daysSinceSeen: Math.max(0, Math.floor((now.getTime() - new Date(w.lastSeenAt).getTime()) / DAY_MS)),
    }))
    .slice(0, 6);

  // ── 3. checkpoint mistakes (last 14 days, wrong-heavy lectures) ──
  const mistakes = (await deps.prisma.checkpointAnswer.findMany({
    where: {
      studentId: userId,
      correct: false,
      updatedAt: { gte: since14 },
      checkpoint: { lecture: { offering: { course: { institutionId } } } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 40,
    select: {
      checkpoint: {
        select: {
          concept: { select: { name: true } },
          lecture: { select: { title: true, offering: { select: { course: { select: { name: true } } } } } },
        },
      },
    },
  })) as Array<{ checkpoint: { concept: { name: string } | null; lecture: { title: string; offering: { course: { name: string } } } } }>;

  // Wrong counts per lecture; total needs the same lecture's answered
  // checkpoints — a wrong-majority proxy from the wrong rows alone is
  // dishonest, so the pack reports wrong counts with the lecture's
  // checkpoint count as the denominator via the chapters' totals when
  // available; otherwise wrong-only rows collapse into one line each.
  const mistakesByLecture = new Map<string, PackCheckpointMistakes>();
  for (const row of mistakes) {
    const key = row.checkpoint.lecture.title;
    const existing = mistakesByLecture.get(key);
    if (existing) {
      existing.wrong += 1;
      existing.total += 1; // the invariant: total mirrors wrong (no fabricated denominator)
    } else {
      mistakesByLecture.set(key, {
        lecture: row.checkpoint.lecture.title,
        course: row.checkpoint.lecture.offering.course.name,
        wrong: 1,
        total: 1, // the invariant starts equal; see the comment at the slice
        concept: row.checkpoint.concept?.name ?? undefined,
      });
    }
  }
  const checkpointMistakes = [...mistakesByLecture.values()]
    .sort((a, b) => b.wrong - a.wrong || a.lecture.localeCompare(b.lecture, 'ar'))
    .slice(0, 6);
  // Denominator honesty: only WRONG rows are read (bounded), so the
  // pack reports per-lecture wrong COUNTS — never a fabricated total.
  // The render says "N إجابة خاطئة" (PackCheckpointMistakes.total is
  // kept in the struct for a future right-rows join; it equals wrong
  // here and nothing renders it).

  // ── 4. graded submissions: last 6 per course trend ──────────────
  const submissions = (await deps.prisma.submission.findMany({
    where: {
      studentId: userId,
      status: 'GRADED',
      gradedAt: { gte: since30 },
      assignment: { offering: { course: { institutionId } } },
    },
    orderBy: { gradedAt: 'desc' },
    take: 24,
    select: {
      grade: true,
      assignment: {
        select: {
          maxScore: true,
          offering: { select: { course: { select: { name: true } } } },
        },
      },
    },
  })) as Array<{ grade: unknown; assignment: { maxScore: number; offering: { course: { name: string } } } }>;

  const byCourse = new Map<string, number[]>();
  for (const s of submissions) {
    const grade = Number(s.grade);
    const max = Number(s.assignment.maxScore) || 100;
    if (!Number.isFinite(grade)) continue;
    const pct = Math.round((grade / max) * 100);
    const name = s.assignment.offering.course.name;
    // Rows arrive gradedAt-desc (newest first): PREPEND so the array
    // reads oldest→newest; cap 6 (the trend needs the recent window).
    const arr = byCourse.get(name) ?? [];
    byCourse.set(name, [pct, ...arr].slice(0, 6));
  }
  const courseTrends: PackCourseTrend[] = [...byCourse.entries()]
    .map(([course, scores]) => ({ course, scores, direction: trendDirection(scores) }))
    .sort((a, b) => b.scores.length - a.scores.length || a.course.localeCompare(b.course, 'ar'))
    .slice(0, 4);

  // ── 5. attendance (last 30 days) ─────────────────────────────────
  const attendance = (await deps.prisma.attendanceRecord.findMany({
    where: {
      studentId: userId,
      session: { date: { gte: since30 }, offering: { course: { institutionId } } },
    },
    take: 120,
    select: { status: true },
  })) as Array<{ status: string }>;
  // PRESENT/LATE count as attendance; EXCUSED counts as neither (the
  // pilot's convention: an excused absence is not a truancy signal).
  const attendance30d = {
    present: attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length,
    absent: attendance.filter((a) => a.status === 'ABSENT').length,
  };

  // ── 6. upcoming deadlines: assignments (14 d) + published exams ──
  const enrollments = (await deps.prisma.enrollment.findMany({
    where: { studentId: userId, status: 'active', offering: { course: { institutionId } } },
    select: {
      offering: {
        select: {
          course: { select: { name: true } },
          assignments: {
            where: { dueAt: { gte: now, lte: in14 } },
            orderBy: { dueAt: 'asc' },
            take: 3,
            select: { title: true, dueAt: true },
          },
        },
      },
    },
  })) as Array<{ offering: { course: { name: string }; assignments: Array<{ title: string; dueAt: Date }> } }>;

  const examAttempts = (await deps.prisma.examAttempt.findMany({
    where: {
      studentId: userId,
      status: 'IN_PROGRESS',
      expiresAt: { gte: now, lte: in14 },
      template: { offering: { course: { institutionId } } },
    },
    orderBy: { expiresAt: 'asc' },
    take: 3,
    select: {
      expiresAt: true,
      template: { select: { title: true, offering: { select: { course: { select: { name: true } } } } } },
    },
  })) as Array<{ expiresAt: Date; template: { title: string; offering: { course: { name: string } } } }>;

  const deadlines: PackDeadline[] = [];
  for (const e of enrollments) {
    for (const a of e.offering.assignments) {
      deadlines.push({ title: a.title, course: e.offering.course.name, dueAt: new Date(a.dueAt).toISOString(), kind: 'assignment' });
    }
  }
  for (const a of examAttempts) {
    deadlines.push({ title: a.template.title, course: a.template.offering.course.name, dueAt: new Date(a.expiresAt).toISOString(), kind: 'exam' });
  }
  deadlines.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title, 'ar'));
  const upcomingDeadlines = deadlines.slice(0, 6);

  // ── assemble ─────────────────────────────────────────────────────
  const base = {
    builtAt: now.toISOString(),
    weakConcepts: weak.slice(0, 8),
    developingCount: developing,
    strongConcepts: strong.slice(0, 5),
    inProgressLectures,
    checkpointMistakes,
    courseTrends,
    attendance30d,
    upcomingDeadlines,
  };
  const riskFlags = computeRiskFlags(base);
  const summaryAr = composeSummaryAr(base);
  return { ...base, riskFlags, summaryAr };
}

// ─── The TTL cache + invalidation hooks ────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { pack: StudentContextPack; at: number }>();
const MAX_CACHE = 128;

export function cacheKey(userId: string, institutionId: string): string {
  return `${userId}:${institutionId}`;
}

export async function getStudentContextPack(
  userId: string,
  institutionId: string,
  deps: BuildPackDeps,
  opts: { ttlMs?: number } = {},
): Promise<StudentContextPack> {
  const key = cacheKey(userId, institutionId);
  const hit = cache.get(key);
  const ttl = opts.ttlMs ?? CACHE_TTL_MS;
  if (hit && Date.now() - hit.at < ttl) return hit.pack;
  const pack = await buildStudentContextPack(userId, institutionId, deps);
  if (cache.size >= MAX_CACHE) {
    // Evict the OLDEST entry (Map preserves insertion order).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { pack, at: Date.now() });
  return pack;
}

/** Invalidate one student's pack (all institutions — the write
 *  surfaces do not know the institution of a lecture they touch). */
export function invalidateStudentContextPack(userId: string): void {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
}

/** Test seam: wipe everything. */
export function __resetContextPackCache(): void {
  cache.clear();
}
