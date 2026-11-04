/**
 * agenda-logic.test.ts — pure status/date-label helpers for the agenda
 * screens (schedule slot status + assignment status/countdown).
 *
 * WHY THIS LIVES HERE (not next to the route files): the render-net test
 * (src/test/render-net.test.tsx) walks EVERY .ts/.tsx file under app/ and
 * requires it as a route — a colocated *.test.ts in app/ would be picked
 * up and fail the `typeof default === "function"` gate. The comms agent
 * owns app/student/{schedule,assignments}.tsx plus src/features/{messages,
 * notifications}/** — so the helpers are EXPORTED from their route files
 * and their tests live in the nearest owned test-friendly directory.
 * The route modules import cleanly under jest (the render net proves it
 * for every route file on every run).
 */
import {
  minutesOf,
  slotStatusesForDay,
  tripoliMinutes,
} from "../../../app/student/schedule";
import {
  assignmentStatus,
  dueCountdown,
} from "../../../app/student/assignments";

const NOW = new Date("2026-01-15T11:30:00Z").getTime(); // fixed clock

describe("schedule — minutesOf", () => {
  test("HH:MM → minutes; tolerant of unparsable input", () => {
    expect(minutesOf("09:30")).toBe(570);
    expect(minutesOf("14:00")).toBe(840);
    expect(minutesOf("")).toBe(-1);
    expect(minutesOf("whenever")).toBe(-1);
  });
});

describe("schedule — slotStatusesForDay", () => {
  const slots = [
    { key: "a", startTime: "08:00", endTime: "09:30" }, // ended
    { key: "b", startTime: "11:00", endTime: "12:30" }, // running
    { key: "c", startTime: "13:00", endTime: "14:00" }, // first upcoming → next
    { key: "d", startTime: "15:00", endTime: "16:00" }, // later upcoming
  ];

  test("done / live / next (exactly one) / upcoming", () => {
    const now = minutesOf("11:30");
    const st = slotStatusesForDay(slots, now);
    expect(st.get("a")).toBe("done");
    expect(st.get("b")).toBe("live");
    expect(st.get("c")).toBe("next");
    expect(st.get("d")).toBeUndefined(); // plain upcoming — no chip
  });

  test("before everything: only the first slot is «التالية»", () => {
    const st = slotStatusesForDay(slots, minutesOf("07:00"));
    expect(st.get("a")).toBe("next");
    expect(st.get("b")).toBeUndefined();
    expect(st.get("c")).toBeUndefined();
  });

  test("after everything: all done, none next", () => {
    const st = slotStatusesForDay(slots, minutesOf("23:00"));
    expect([...st.values()].every((v) => v === "done")).toBe(true);
  });

  test("wire order never matters (sorted by start time)", () => {
    const a = slotStatusesForDay(slots, minutesOf("11:30"));
    const b = slotStatusesForDay([...slots].reverse(), minutesOf("11:30"));
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});

describe("schedule — tripoliMinutes", () => {
  test("converts an instant to Tripoli wall-clock minutes (UTC+2)", () => {
    // 09:00Z = 11:00 in Tripoli.
    expect(tripoliMinutes(new Date("2026-01-15T09:00:00Z"))).toBe(11 * 60);
    // 22:59Z = 00:59 NEXT civil day in Tripoli.
    expect(tripoliMinutes(new Date("2026-01-15T22:59:00Z"))).toBe(59);
  });
});

describe("assignments — assignmentStatus", () => {
  test("graded beats submitted beats lateness beats pending", () => {
    expect(assignmentStatus({ gradedAt: "2026-01-10T00:00:00Z" }, NOW)).toBe("graded");
    expect(assignmentStatus({ submittedAt: "2026-01-10T00:00:00Z" }, NOW)).toBe("submitted");
    expect(assignmentStatus({ dueAt: "2026-01-14T00:00:00Z" }, NOW)).toBe("late");
    expect(assignmentStatus({ overdue: true }, NOW)).toBe("late");
    expect(assignmentStatus({ dueAt: "2026-01-20T00:00:00Z" }, NOW)).toBe("pending");
    expect(assignmentStatus({}, NOW)).toBe("pending");
  });

  test("a submitted assignment is never late even past its due date", () => {
    expect(
      assignmentStatus({ dueAt: "2026-01-14T00:00:00Z", submittedAt: "2026-01-15T00:00:00Z" }, NOW),
    ).toBe("submitted");
  });
});

describe("assignments — dueCountdown", () => {
  test("hours, days, minutes — Arabic counted grammar, latn digits", () => {
    expect(dueCountdown(new Date(NOW + 3_600_000).toISOString(), NOW)).toContain("ساعة واحدة");
    expect(dueCountdown(new Date(NOW + 2 * 86_400_000).toISOString(), NOW)).toContain("يومان");
    expect(dueCountdown(new Date(NOW + 90_000).toISOString(), NOW)).toContain("دقيقة");
  });

  test("overdue text flips to «متأخر …»", () => {
    expect(dueCountdown(new Date(NOW - 2 * 86_400_000).toISOString(), NOW)).toContain("متأخر");
    expect(dueCountdown(new Date(NOW - 5 * 3_600_000).toISOString(), NOW)).toContain("متأخر");
  });

  test("no due date / garbage → null (never throws)", () => {
    expect(dueCountdown(null, NOW)).toBeNull();
    expect(dueCountdown(undefined, NOW)).toBeNull();
    expect(dueCountdown("ليس تاريخاً", NOW)).toBeNull();
  });
});
