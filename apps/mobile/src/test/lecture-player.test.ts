/**
 * Colocated logic net for the R334 Phase-D screens (task 3-e).
 *
 * The pure helpers live in and are exported from the screen files they
 * serve (ownership: only the 4 screen files + this net may change). The
 * render-net walks app/** and mounts every file as a ROUTE, so test files
 * cannot live under app/ — they would be required as routes and break the
 * gate. Hence src/test/ (the repo's established shared test dir) with the
 * screens imported by path.
 *
 * Covers: player clock/numerals, double-tap seek math, seek clamping,
 * active-cue lookup, report-total resolution, playback rates, the
 * library availability view-filter, and the materials course×type filter.
 */
import type { Book } from "@/api/types";
import type { MaterialRow } from "@/api/student";
import type { VttCue } from "@/features/student/components";
import {
  PLAYBACK_RATES,
  activeCueAt,
  clampSeek,
  doubleTapSeekDelta,
  filterCues,
  playerClock,
  remainingClock,
  resolveReportTotal,
} from "../../app/student/lectures/[lectureId]";
import { bookMatchesAvailability } from "../../app/student/library";
import { materialMatches } from "../../app/student/materials";

/* ── playerClock — numerals policy on the media clock ────────────────── */

describe("playerClock", () => {
  test("pads minutes/seconds with latin digits by default", () => {
    expect(playerClock(0, "latin")).toBe("00:00");
    expect(playerClock(754, "latin")).toBe("12:34");
    expect(playerClock(59, "latin")).toBe("00:59");
  });

  test("promotes to h:mm:ss beyond the hour", () => {
    expect(playerClock(3675, "latin")).toBe("1:01:15");
    expect(playerClock(3600, "latin")).toBe("1:00:00");
  });

  test("arabic-indic preference rewrites the digits (٫ separators untouched)", () => {
    expect(playerClock(754, "arabic-indic")).toBe("١٢:٣٤");
    expect(playerClock(3675, "arabic-indic")).toBe("١:٠١:١٥");
  });

  test("never throws on NaN/negative", () => {
    expect(playerClock(Number.NaN, "latin")).toBe("00:00");
    expect(playerClock(-5, "latin")).toBe("00:00");
  });
});

/* ── remainingClock ──────────────────────────────────────────────────── */

describe("remainingClock", () => {
  test("duration minus current, in the numerals preference", () => {
    expect(remainingClock(754, 3600, "latin")).toBe("47:26");
    expect(remainingClock(754, 3600, "arabic-indic")).toBe("٤٧:٢٦");
  });

  test("clamps at zero (never negative)", () => {
    expect(remainingClock(3600, 3600, "latin")).toBe("00:00");
    expect(remainingClock(4000, 3600, "latin")).toBe("00:00");
  });

  test("NaN duration is treated as zero remaining", () => {
    expect(remainingClock(10, Number.NaN, "latin")).toBe("00:00");
  });
});

/* ── double-tap seek math ────────────────────────────────────────────── */

describe("doubleTapSeekDelta", () => {
  test("physical halves: start side rewinds, end side fast-forwards", () => {
    expect(doubleTapSeekDelta(0, 400)).toBe(-10);
    expect(doubleTapSeekDelta(199, 400)).toBe(-10);
    expect(doubleTapSeekDelta(201, 400)).toBe(10);
    expect(doubleTapSeekDelta(400, 400)).toBe(10);
  });

  test("zero width degrades to forward (no crash)", () => {
    expect(doubleTapSeekDelta(0, 0)).toBe(10);
  });
});

/* ── clampSeek ───────────────────────────────────────────────────────── */

describe("clampSeek", () => {
  test("clamps into [0, duration−1]", () => {
    expect(clampSeek(-3, 600)).toBe(0);
    expect(clampSeek(700, 600)).toBe(599);
    expect(clampSeek(300, 600)).toBe(300);
  });

  test("unknown duration: only the zero floor applies", () => {
    expect(clampSeek(-3, Number.NaN)).toBe(0);
    expect(clampSeek(9_000, Number.NaN)).toBe(9_000);
  });
});

/* ── activeCueAt — the captions overlay lookup ───────────────────────── */

describe("activeCueAt", () => {
  const cues: VttCue[] = [
    { start: 0, end: 5, text: "بداية" },
    { start: 10, end: 20, text: "وسط" },
  ];
  test("finds the covering cue", () => {
    expect(activeCueAt(cues, 2)?.text).toBe("بداية");
    expect(activeCueAt(cues, 15)?.text).toBe("وسط");
  });
  test("gap and early/late times return null", () => {
    expect(activeCueAt(cues, 7)).toBeNull();
    expect(activeCueAt([], 1)).toBeNull();
    expect(activeCueAt(cues, 100)).toBeNull();
  });
});

/* ── filterCues — M5: transcript search over the FULL cue list ─────── */

describe("filterCues (M5 — the 200-cue data cap is gone)", () => {
  // a 90-minute lecture's honest shape: ~1000 cues, the match past cue 200
  const many: VttCue[] = Array.from({ length: 1000 }, (_, i) => ({
    start: i * 4,
    end: i * 4 + 4,
    text: i === 450 ? "قاعدة البيانات العلائقية" : `سطر النص ${i}`,
  }));

  test("empty/blank query keeps every cue — the old .slice(0, 200) kept 200", () => {
    expect(filterCues(many, "")).toHaveLength(1000);
    expect(filterCues(many, "   ")).toHaveLength(1000);
  });

  test("search reaches beyond the old 200-cue cut (the before→after witness)", () => {
    const hits = filterCues(many, "قاعدة البيانات");
    expect(hits).toHaveLength(1);
    expect(hits[0].start).toBe(450 * 4);
  });

  test("no match → empty (the panel's EmptyState takes over)", () => {
    expect(filterCues(many, "لا وجود لمثله")).toEqual([]);
  });

  test("empty list stays empty; trim is applied before matching", () => {
    expect(filterCues([], "ابحث")).toEqual([]);
    expect(filterCues(many.slice(0, 1), "  سطر  ")).toHaveLength(1);
  });
});

/* ── resolveReportTotal ──────────────────────────────────────────────── */

describe("resolveReportTotal", () => {
  test("real media duration wins and rounds", () => {
    expect(resolveReportTotal(604.8, 300)).toBe(605);
  });
  test("NaN/zero media falls back to the authored value", () => {
    expect(resolveReportTotal(Number.NaN, 300)).toBe(300);
    expect(resolveReportTotal(0, 300)).toBe(300);
  });
  test("nothing known → 0", () => {
    expect(resolveReportTotal(Number.NaN, null)).toBe(0);
    expect(resolveReportTotal(Number.NaN, undefined)).toBe(0);
  });
});

/* ── playback rates ──────────────────────────────────────────────────── */

describe("PLAYBACK_RATES", () => {
  test("exposes the web-parity ladder (the speed sheet options)", () => {
    expect([...PLAYBACK_RATES]).toEqual([0.75, 1, 1.25, 1.5, 2]);
  });
});

/* ── library availability view-filter ────────────────────────────────── */

describe("bookMatchesAvailability", () => {
  const book = (available: number): Book => ({
    id: "b1",
    title: "كتاب",
    author: "مؤلف",
    totalCopies: 3,
    availableCopies: available,
  });
  test("all passes everything", () => {
    expect(bookMatchesAvailability(book(0), "all")).toBe(true);
    expect(bookMatchesAvailability(book(3), "all")).toBe(true);
  });
  test("available requires copies; borrowed requires none", () => {
    expect(bookMatchesAvailability(book(1), "available")).toBe(true);
    expect(bookMatchesAvailability(book(0), "available")).toBe(false);
    expect(bookMatchesAvailability(book(0), "borrowed")).toBe(true);
    expect(bookMatchesAvailability(book(1), "borrowed")).toBe(false);
  });
});

/* ── materials course × type filter ──────────────────────────────────── */

describe("materialMatches", () => {
  const row: MaterialRow = {
    id: "m1",
    name: "محاضرة ١",
    type: "PDF",
    sizeBytes: 1024,
    url: "/files/materials/m1.pdf",
    courseName: "مقدمة في الحاسب",
  };
  test("no filter passes everything", () => {
    expect(materialMatches(row, null, null)).toBe(true);
  });
  test("course filter compares the attribution name", () => {
    expect(materialMatches(row, "مقدمة في الحاسب", null)).toBe(true);
    expect(materialMatches(row, "فيزياء", null)).toBe(false);
  });
  test("type filter compares the raw type enum", () => {
    expect(materialMatches(row, null, "PDF")).toBe(true);
    expect(materialMatches(row, null, "PPT")).toBe(false);
  });
  test("both filters AND together", () => {
    expect(materialMatches(row, "مقدمة في الحاسب", "PDF")).toBe(true);
    expect(materialMatches(row, "فيزياء", "PDF")).toBe(false);
  });
});
