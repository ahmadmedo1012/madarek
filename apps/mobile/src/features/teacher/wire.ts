/**
 * wire — honest structural parsers for the teacher wire payloads whose
 * mobile API types are still loose (`teacherApi.grades` → `unknown[]`,
 * `TeacherDashboardData.trend/feed/pendingGrading` → index-signature
 * extras). Every parser reads fields structurally (typeof guards) and
 * never invents a key — the same discipline as `toRosterEntry`.
 *
 * Replaces the R1 `as unknown as Wire*` double-casts in grades.tsx and
 * (tabs)/dashboard.tsx with ONE typed, unit-tested seam.
 */

/* ─── GET /offerings/:id/grades (offerings.routes.ts) ────────────────── */

/** One stored grade row (per student × kind). */
export interface GradeRow {
  studentId: string;
  kind: string;
  score: number | null;
  maxScore: number | null;
  weight: number | null;
  feedback: string | null;
}

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const nmb = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Parses the grades payload; anything not shaped like a row is dropped. */
export function parseGradeRows(raw: readonly unknown[] | null | undefined): GradeRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: GradeRow[] = [];
  for (const item of raw) {
    if (!isRec(item)) continue;
    const studentId = str(item.studentId);
    const kind = str(item.kind);
    if (studentId === null || kind === null) continue;
    rows.push({
      studentId,
      kind,
      score: nmb(item.score),
      maxScore: nmb(item.maxScore),
      weight: nmb(item.weight),
      feedback: str(item.feedback),
    });
  }
  return rows;
}

/* ─── GET /teacher/dashboard extras (teacher-dashboard.routes.ts) ────── */

export interface TrendPoint {
  week: string;
  /** avgGradePct on the current wire, `value` on the legacy wire. */
  grade: number | null;
  attendance: number | null;
}

export function parseTrend(raw: unknown): TrendPoint[] {
  if (!Array.isArray(raw)) return [];
  const rows: TrendPoint[] = [];
  for (const item of raw) {
    if (!isRec(item)) continue;
    const week = str(item.week);
    if (week === null) continue;
    rows.push({
      week,
      grade: nmb(item.avgGradePct) ?? nmb(item.value),
      attendance: nmb(item.attendancePct),
    });
  }
  return rows;
}

export interface FeedItem {
  kind: string;
  title: string | null;
  text: string | null;
  when: string | null;
  author: string | null;
  late: boolean;
}

export function parseFeed(raw: unknown): FeedItem[] {
  if (!Array.isArray(raw)) return [];
  const rows: FeedItem[] = [];
  for (const item of raw) {
    if (!isRec(item)) continue;
    const authorRec = isRec(item.author) ? item.author : null;
    const first = authorRec ? str(authorRec.firstName) : null;
    const last = authorRec ? str(authorRec.lastName) : null;
    rows.push({
      kind: str(item.kind) ?? "",
      title: str(item.title),
      text: str(item.text),
      when: str(item.when) ?? str(item.at),
      author: authorRec !== null && (first !== null || last !== null)
        ? `${first ?? ""} ${last ?? ""}`.trim()
        : null,
      late: item.late === true,
    });
  }
  return rows;
}

export interface PendingGroup {
  assignmentId: string;
  title: string;
  count: number;
  courseName: string;
  courseCode: string;
  oldestSubmittedAt: string | null;
}

export function parsePendingGroups(raw: unknown): PendingGroup[] | null {
  if (!Array.isArray(raw)) return null; // the wire also allows a bare number
  const rows: PendingGroup[] = [];
  for (const item of raw) {
    if (!isRec(item)) continue;
    const course = isRec(item.course) ? item.course : null;
    rows.push({
      assignmentId: str(item.assignmentId) ?? "",
      title: str(item.title) ?? "تسليم",
      count: nmb(item.count) ?? 0,
      courseName: course ? (str(course.name) ?? "") : "",
      courseCode: course ? (str(course.code) ?? "") : "",
      oldestSubmittedAt: str(item.oldestSubmittedAt),
    });
  }
  return rows;
}

/* ─── Fast-grading navigation helpers ────────────────────────────────── */

/** Wraps a delta move around the roster (swipe / next-prev buttons). */
export function nextIndex(index: number, len: number, delta: number): number {
  if (len <= 0) return 0;
  return ((index + delta) % len + len) % len;
}

/** A grade draft is dirty when either half was typed. */
export function isDirtyDraft(d: { score: string; feedback: string } | undefined): boolean {
  return d !== undefined && (d.score.trim() !== "" || d.feedback.trim() !== "");
}
