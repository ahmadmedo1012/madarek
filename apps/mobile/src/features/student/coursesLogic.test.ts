/**
 * Courses screens pure logic net (R334 3-d) — colocated with
 * coursesLogic.ts. No transports mounted: these are the state machines
 * behind «مقرراتي»'s FilterSheet, the lecture chips, the grid pairing,
 * and the OFFERING-scope announcement filter.
 */
import type { Announcement, EnrollmentRow, Lecture } from "@/api/types";
import {
  activeCourseFilterCount,
  applyCourseFilters,
  catalogDepartmentGroups,
  chunkPairs,
  courseFilterFacets,
  courseFiltersReducer,
  isOfferingAnnouncement,
  lectureChip,
  lecturesProgress,
  NO_COURSE_FILTERS,
} from "./coursesLogic";

/* ── fixtures (Arabic, honest shapes) ────────────────────────────────── */

function enrollment(
  id: string,
  term: string,
  department: string | null,
  progressPct: number,
): EnrollmentRow {
  return {
    id,
    progressPct,
    offering: {
      id: `off-${id}`,
      term,
      course: {
        id: `c-${id}`,
        code: `CS${id}`,
        name: `مقرّر ${id}`,
        department: department ? { id: `d-${department}`, name: department } : null,
      },
      teacher: null,
      schedule: [],
    },
  };
}

const ROWS: EnrollmentRow[] = [
  enrollment("1", "خريف 2025", "علوم الحاسب", 0),
  enrollment("2", "خريف 2025", "الرياضيات", 45),
  enrollment("3", "ربيع 2026", "علوم الحاسب", 100),
  enrollment("4", "ربيع 2026", null, 33),
];

function lecture(
  id: string,
  watch?: { completed: boolean; watchedSec: number; totalSec: number },
): Lecture {
  return {
    id,
    offeringId: "off",
    title: `محاضرة ${id}`,
    ordinal: 1,
    videoUrl: "https://example.com/v.mp4",
    watchEvents: watch ? [{ lectureId: id, ...watch }] : undefined,
  };
}

/* ── the FilterSheet reducer ─────────────────────────────────────────── */

describe("courseFiltersReducer", () => {
  test("sets each facet and counts active filters", () => {
    let s = courseFiltersReducer(NO_COURSE_FILTERS, { type: "term", value: "خريف 2025" });
    expect(s).toEqual({ term: "خريف 2025", department: null, progress: "all" });
    expect(activeCourseFilterCount(s)).toBe(1);

    s = courseFiltersReducer(s, { type: "department", value: "علوم الحاسب" });
    s = courseFiltersReducer(s, { type: "progress", value: "in-progress" });
    expect(activeCourseFilterCount(s)).toBe(3);

    // selecting the same value again is a no-op (stable draft state)
    const again = courseFiltersReducer(s, { type: "progress", value: "in-progress" });
    expect(again).toEqual(s);
  });

  test("reset returns the canonical empty filters", () => {
    const s = courseFiltersReducer(
      { term: "خريف 2025", department: "الرياضيات", progress: "done" },
      { type: "reset" },
    );
    expect(s).toBe(NO_COURSE_FILTERS);
    expect(activeCourseFilterCount(s)).toBe(0);
  });
});

/* ── applying filters ────────────────────────────────────────────────── */

describe("applyCourseFilters", () => {
  test("no filters → every row passes (fresh array, same order)", () => {
    const out = applyCourseFilters(ROWS, NO_COURSE_FILTERS);
    expect(out.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  });

  test("term filter", () => {
    expect(applyCourseFilters(ROWS, { ...NO_COURSE_FILTERS, term: "ربيع 2026" }).map((r) => r.id)).toEqual([
      "3",
      "4",
    ]);
  });

  test("department filter (null department rows only match «all»)", () => {
    expect(
      applyCourseFilters(ROWS, { ...NO_COURSE_FILTERS, department: "علوم الحاسب" }).map((r) => r.id),
    ).toEqual(["1", "3"]);
  });

  test("progress buckets: 0 → not-started, 1-99 → in-progress, 100 → done", () => {
    expect(
      applyCourseFilters(ROWS, { ...NO_COURSE_FILTERS, progress: "not-started" }).map((r) => r.id),
    ).toEqual(["1"]);
    expect(applyCourseFilters(ROWS, { ...NO_COURSE_FILTERS, progress: "in-progress" }).map((r) => r.id)).toEqual([
      "2",
      "4",
    ]);
    expect(applyCourseFilters(ROWS, { ...NO_COURSE_FILTERS, progress: "done" }).map((r) => r.id)).toEqual(["3"]);
  });

  test("combined facets intersect", () => {
    expect(
      applyCourseFilters(ROWS, { term: "خريف 2025", department: null, progress: "in-progress" }).map((r) => r.id),
    ).toEqual(["2"]);
  });
});

describe("courseFilterFacets", () => {
  test("derives sorted, deduped options from the rows", () => {
    const f = courseFilterFacets(ROWS);
    expect(f.terms).toEqual(["خريف 2025", "ربيع 2026"]);
    expect(f.departments).toEqual(["الرياضيات", "علوم الحاسب"]);
  });

  test("empty rows → empty facets (never null/undefined)", () => {
    expect(courseFilterFacets([])).toEqual({ terms: [], departments: [] });
  });
});

/* ── lecture chips + progress ────────────────────────────────────────── */

describe("lectureChip", () => {
  test("completed → mint «مكتملة»", () => {
    expect(lectureChip(lecture("1", { completed: true, watchedSec: 600, totalSec: 600 }))).toEqual({
      label: "مكتملة",
      tone: "mint",
    });
  });

  test("part-watched → copper «تابع N%» with latin digits", () => {
    expect(lectureChip(lecture("2", { completed: false, watchedSec: 150, totalSec: 600 }))).toEqual({
      label: "تابع 25%",
      tone: "copper",
    });
  });

  test("never opened (no watch event) → grey «لم تُشاهَد»", () => {
    expect(lectureChip(lecture("3"))).toEqual({ label: "لم تُشاهَد", tone: "grey" });
  });

  test("zero-duration event never divides by zero", () => {
    expect(lectureChip(lecture("4", { completed: false, watchedSec: 0, totalSec: 0 }))).toEqual({
      label: "لم تُشاهَد",
      tone: "grey",
    });
  });
});

describe("lecturesProgress", () => {
  test("ratio of completed lectures, rounded", () => {
    expect(lecturesProgress([])).toBe(0);
    const one = lecture("a", { completed: true, watchedSec: 1, totalSec: 1 });
    const two = lecture("b", { completed: false, watchedSec: 1, totalSec: 2 });
    const three = lecture("c");
    expect(lecturesProgress([one, two, three])).toBe(33);
  });
});

/* ── grid pairing ────────────────────────────────────────────────────── */

describe("chunkPairs", () => {
  test("even → pairs, odd → tail keeps its own row", () => {
    expect(chunkPairs([1, 2, 3, 4])).toEqual([[1, 2], [3, 4]]);
    expect(chunkPairs([1, 2, 3])).toEqual([[1, 2], [3]]);
    expect(chunkPairs([])).toEqual([]);
  });
});

/* ── catalog department groups (دليل المقرّرات FilterSheet) ──────────── */

describe("catalogDepartmentGroups", () => {
  const faculties = [
    { id: "f1", name: "كلية الهندسة", departments: [{ id: "d2", name: "قسم المدنية" }, { id: "d1", name: "قسم الحاسوب" }] },
    { id: "f2", name: "كلية الآداب", departments: [] },
    { id: "f3", name: "كلية الطب", departments: [{ id: "d3", name: "قسم التشريح" }] },
    { id: "f4", name: "كلية بلا أقسام", departments: null },
  ];

  test("drops faculties with no departments, Arabic-sorts the rest", () => {
    const groups = catalogDepartmentGroups(faculties);
    expect(groups.map((g) => g.facultyName)).toEqual(["كلية الطب", "كلية الهندسة"]);
    expect(groups[1].departments.map((d) => d.name)).toEqual(["قسم الحاسوب", "قسم المدنية"]);
  });

  test("empty payload → empty groups (the sheet shows «كل الأقسام» only)", () => {
    expect(catalogDepartmentGroups([])).toEqual([]);
  });
});

/* ── OFFERING-scope announcements ────────────────────────────────────── */

describe("isOfferingAnnouncement", () => {
  const feed: (Announcement & { scopeId?: string | null })[] = [
    { id: "a1", scope: "PLATFORM", title: "إعلان عام", publishedAt: "2026-01-01" },
    { id: "a2", scope: "OFFERING", scopeId: "off-1", title: "إعلان المقرّر", publishedAt: "2026-01-02" },
    { id: "a3", scope: "OFFERING", scopeId: "off-2", title: "إعلان مقرّر آخر", publishedAt: "2026-01-03" },
    { id: "a4", scope: "FACULTY", title: "إعلان كلية", publishedAt: "2026-01-04" },
  ];

  test("only this offering's scoped rows match", () => {
    expect(feed.filter((a) => isOfferingAnnouncement(a, "off-1")).map((a) => a.id)).toEqual(["a2"]);
  });

  test("missing scopeId never matches (older payloads)", () => {
    expect(isOfferingAnnouncement({ id: "a5", scope: "OFFERING", title: "بلا معرّف", publishedAt: "2026-01-05" }, "off-1")).toBe(false);
  });
});
