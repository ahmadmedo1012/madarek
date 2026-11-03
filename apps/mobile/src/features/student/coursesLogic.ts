/**
 * Courses screens pure logic (R334 Round-2, task 3-d).
 *
 * The filter reducer + facet derivation for «مقرراتي», the lecture
 * watch-state chip, the grid pairing for the list/grid toggle, and the
 * OFFERING-scope announcement filter for the course hub. Dependency-free
 * (types only) so the colocated net (coursesLogic.test.ts) mounts no
 * transports — the same rule as src/lib/errors.ts.
 */
import type { Announcement, EnrollmentRow, Lecture } from "@/api/types";
import { latn } from "@/lib/format";

/* ══ «مقرراتي» filters (the FilterSheet state machine) ════════════════ */

/** Progress bucket — derived from the enrollment's progressPct. */
export type ProgressFilter = "all" | "not-started" | "in-progress" | "done";

export interface CourseFilters {
  /** Offering term (e.g. «خريف 2025») — null = all terms. */
  term: string | null;
  /** Department name — null = all departments. */
  department: string | null;
  progress: ProgressFilter;
}

export const NO_COURSE_FILTERS: CourseFilters = { term: null, department: null, progress: "all" };

export const PROGRESS_FILTER_LABEL: Record<ProgressFilter, string> = {
  all: "كل المقرّرات",
  "not-started": "لم تبدأ",
  "in-progress": "قيد التقدّم",
  done: "مكتملة",
};

export const PROGRESS_FILTER_OPTIONS: ProgressFilter[] = ["all", "not-started", "in-progress", "done"];

export type CourseFilterAction =
  | { type: "term"; value: string | null }
  | { type: "department"; value: string | null }
  | { type: "progress"; value: ProgressFilter }
  | { type: "reset" };

/** The FilterSheet draft→apply state machine, pure (same value = same ref). */
export function courseFiltersReducer(state: CourseFilters, action: CourseFilterAction): CourseFilters {
  switch (action.type) {
    case "term":
      return { ...state, term: action.value };
    case "department":
      return { ...state, department: action.value };
    case "progress":
      return { ...state, progress: action.value };
    case "reset":
      return NO_COURSE_FILTERS;
  }
}

/** How many chips the filter button badge shows (progress "all" = not set). */
export function activeCourseFilterCount(f: CourseFilters): number {
  let n = 0;
  if (f.term !== null) n += 1;
  if (f.department !== null) n += 1;
  if (f.progress !== "all") n += 1;
  return n;
}

function progressBucket(pct: number): Exclude<ProgressFilter, "all"> {
  if (pct <= 0) return "not-started";
  if (pct >= 100) return "done";
  return "in-progress";
}

/** Filter the enrollments to what the FilterSheet committed. */
export function applyCourseFilters(rows: readonly EnrollmentRow[], f: CourseFilters): EnrollmentRow[] {
  if (f.term === null && f.department === null && f.progress === "all") return [...rows];
  return rows.filter((e) => {
    if (f.term !== null && e.offering.term !== f.term) return false;
    if (f.department !== null && (e.offering.course.department?.name ?? null) !== f.department) return false;
    if (f.progress !== "all" && progressBucket(e.progressPct) !== f.progress) return false;
    return true;
  });
}

/** Facet options derived from the loaded rows (sorted, deduped, Arabic-friendly). */
export function courseFilterFacets(rows: readonly EnrollmentRow[]): { terms: string[]; departments: string[] } {
  const terms = new Set<string>();
  const departments = new Set<string>();
  for (const e of rows) {
    if (e.offering.term) terms.add(e.offering.term);
    const d = e.offering.course.department?.name;
    if (d) departments.add(d);
  }
  const byAr = new Intl.Collator("ar", { numeric: true });
  return {
    terms: [...terms].sort(byAr.compare),
    departments: [...departments].sort(byAr.compare),
  };
}

/* ══ Lecture watch-state chip (course hub · المحاضرات tab) ════════════ */

/**
 * Chip tone seats — semantic FEEDBACK tones, never a second accent:
 * mint = done, copper = in progress, grey = not started.
 */
export type LectureChipTone = "mint" | "copper" | "grey";

export interface LectureChip {
  label: string;
  tone: LectureChipTone;
}

/**
 * The honest lecture state chip. The Lecture model carries no
 * scheduledAt/live flag, so «live/upcoming» cannot be derived — the chip
 * reflects the student's watch state (done / part-watched / not started).
 */
export function lectureChip(lec: Lecture): LectureChip {
  const we = lec.watchEvents?.[0];
  if (we?.completed) return { label: "مكتملة", tone: "mint" };
  const pct = we && we.totalSec > 0 ? Math.round((we.watchedSec / we.totalSec) * 100) : 0;
  if (pct > 0) return { label: `تابع ${latn(pct)}%`, tone: "copper" };
  return { label: "لم تُشاهَد", tone: "grey" };
}

/** Overall curriculum progress 0..100 across a course's lectures. */
export function lecturesProgress(lectures: readonly Lecture[]): number {
  if (lectures.length === 0) return 0;
  const done = lectures.filter((l) => l.watchEvents?.[0]?.completed).length;
  return Math.round((done / lectures.length) * 100);
}

/* ══ Catalog department filter (دليل المقرّرات FilterSheet) ══════════ */

/**
 * Structural slice of the `/faculties` payload the catalog FilterSheet
 * reads (catalogApi.faculties) — no import from the api layer so this
 * module stays dependency-free for its colocated net.
 */
export interface FacultyWithDepartments {
  id: string;
  name: string;
  departments?: { id: string; name: string }[] | null;
}

/** One faculty heading + its department options, Arabic-sorted. */
export interface CatalogDepartmentGroup {
  facultyId: string;
  facultyName: string;
  departments: { id: string; name: string }[];
}

/**
 * Group the faculties payload into FilterSheet sections (faculty heading
 * → department radio rows). Faculties with no departments are dropped
 * (an empty heading is noise, not information).
 */
export function catalogDepartmentGroups(
  faculties: readonly FacultyWithDepartments[],
): CatalogDepartmentGroup[] {
  const byAr = new Intl.Collator("ar", { numeric: true });
  return faculties
    .filter((f) => (f.departments?.length ?? 0) > 0)
    .map((f) => ({
      facultyId: f.id,
      facultyName: f.name,
      departments: [...(f.departments ?? [])].sort((a, b) => byAr.compare(a.name, b.name)),
    }))
    .sort((a, b) => byAr.compare(a.facultyName, b.facultyName));
}

/* ══ Grid pairing (the list/grid segmented toggle) ════════════════════ */

/** The segmented toggle's two layout modes. */
export type CourseView = "list" | "grid";

/** Rows of two for the 2-column grid view (odd tail keeps its own row). */
export function chunkPairs<T>(rows: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += 2) out.push(rows.slice(i, i + 2));
  return out;
}

/* ═ـ OFFERING-scoped announcements (course hub · الإعلانات tab) ══════ */

/**
 * The feed rows carry Prisma's scopeId (the mobile Announcement type
 * predates it) — the structural read stays honest for older payloads.
 */
export type ScopedAnnouncement = Announcement & { scopeId?: string | null };

/** True when a feed announcement belongs to this offering's audience. */
export function isOfferingAnnouncement(a: ScopedAnnouncement, offeringId: string): boolean {
  return a.scope === "OFFERING" && a.scopeId === offeringId;
}
