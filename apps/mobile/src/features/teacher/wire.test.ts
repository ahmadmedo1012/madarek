/**
 * wire.test — pins the teacher wire parsers (structural reads, no invented
 * keys, malformed rows dropped) + the fast-grading navigation helpers.
 */
import { parseGradeRows, parseTrend, parseFeed, parsePendingGroups, nextIndex, isDirtyDraft } from "./wire";

describe("parseGradeRows", () => {
  it("parses well-formed rows", () => {
    expect(
      parseGradeRows([
        { studentId: "s1", kind: "HOMEWORK", score: 85, maxScore: 100, weight: 10, feedback: "أحسنت" },
        { studentId: "s2", kind: "QUIZ_1", score: null, maxScore: null, weight: null, feedback: null },
      ]),
    ).toEqual([
      { studentId: "s1", kind: "HOMEWORK", score: 85, maxScore: 100, weight: 10, feedback: "أحسنت" },
      { studentId: "s2", kind: "QUIZ_1", score: null, maxScore: null, weight: null, feedback: null },
    ]);
  });

  it("drops malformed rows and tolerates junk payloads", () => {
    expect(parseGradeRows([{ kind: "HOMEWORK" }, "junk", null, { studentId: "s1" }])).toEqual([]);
    expect(parseGradeRows(null)).toEqual([]);
    expect(parseGradeRows(undefined)).toEqual([]);
  });

  it("ignores non-finite numbers and empty strings honestly", () => {
    expect(parseGradeRows([{ studentId: "s1", kind: "K", score: Number.NaN, feedback: "" }])).toEqual([
      { studentId: "s1", kind: "K", score: null, maxScore: null, weight: null, feedback: null },
    ]);
  });
});

describe("parseTrend", () => {
  it("prefers avgGradePct, falls back to value, keeps attendance", () => {
    expect(
      parseTrend([
        { week: "w1", avgGradePct: 72.5, attendancePct: 90 },
        { week: "w2", value: 60 },
        { week: "w3" },
        "junk",
      ]),
    ).toEqual([
      { week: "w1", grade: 72.5, attendance: 90 },
      { week: "w2", grade: 60, attendance: null },
      { week: "w3", grade: null, attendance: null },
    ]);
  });

  it("returns [] for non-array payloads", () => {
    expect(parseTrend({})).toEqual([]);
    expect(parseTrend(undefined)).toEqual([]);
  });
});

describe("parseFeed", () => {
  it("reads both timestamp keys and composes the author name", () => {
    expect(
      parseFeed([{ kind: "research", title: "بحث", at: "2024-01-01", author: { firstName: "سالم", lastName: "المرابط" }, late: true }]),
    ).toEqual([{ kind: "research", title: "بحث", text: null, when: "2024-01-01", author: "سالم المرابط", late: true }]);
  });

  it("falls back to text and `when`, null author when absent", () => {
    expect(parseFeed([{ text: "تسليم متأخر", when: "w" }])).toEqual([
      { kind: "", title: null, text: "تسليم متأخر", when: "w", author: null, late: false },
    ]);
  });
});

describe("parsePendingGroups", () => {
  it("parses groups with course names", () => {
    expect(parsePendingGroups([{ assignmentId: "a1", title: "واجب 1", count: 3, course: { name: "فيزياء", code: "PHY101" } }])).toEqual([
      { assignmentId: "a1", title: "واجب 1", count: 3, courseName: "فيزياء", courseCode: "PHY101", oldestSubmittedAt: null },
    ]);
  });

  it("returns null for the bare-number wire shape (handled separately)", () => {
    expect(parsePendingGroups(7)).toBeNull();
    expect(parsePendingGroups(undefined)).toBeNull();
  });
});

describe("nextIndex / isDirtyDraft", () => {
  it("wraps both directions", () => {
    expect(nextIndex(0, 3, -1)).toBe(2);
    expect(nextIndex(2, 3, 1)).toBe(0);
    expect(nextIndex(0, 0, 1)).toBe(0);
  });

  it("dirty = any typed half", () => {
    expect(isDirtyDraft(undefined)).toBe(false);
    expect(isDirtyDraft({ score: "", feedback: "" })).toBe(false);
    expect(isDirtyDraft({ score: "8", feedback: "" })).toBe(true);
    expect(isDirtyDraft({ score: " ", feedback: "ملاحظة" })).toBe(true);
  });
});
