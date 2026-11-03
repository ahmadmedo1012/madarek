/**
 * grouping.test.ts — pins the alerts-inbox day-section model: «اليوم» /
 * «أمس» / short-date headers, newest-day-first ordering, sticky indices,
 * unread rows flowing through untouched, and the icon-URL gate.
 * Pure module → no React mocks needed.
 */
import type { AppNotification } from "@/api/types";
import { shortDate } from "@/lib/format";
import { daySectionLabel, groupNotificationsByDay, notificationIconUrl } from "./grouping";

/** Africa/Tripoli is UTC+2 year-round (no DST) — fixed-offset fixtures. */
const NOW = new Date("2026-01-15T12:00:00+02:00"); // Thursday, 15 Jan 2026 (Tripoli)

function n(id: string, createdAt: string, extra: Partial<AppNotification> = {}): AppNotification {
  return { id, type: "ACADEMIC", title: `عنوان ${id}`, createdAt, ...extra };
}

describe("daySectionLabel", () => {
  test("same civil day → «اليوم» across the midnight boundary", () => {
    expect(daySectionLabel("2026-01-15T00:30:00+02:00", NOW)).toBe("اليوم");
    expect(daySectionLabel("2026-01-15T23:59:00+02:00", NOW)).toBe("اليوم");
  });

  test("previous civil day → «أمس» even when wall clocks differ by <24h", () => {
    expect(daySectionLabel("2026-01-14T23:00:00+02:00", NOW)).toBe("أمس");
  });

  test("older → the shared shortDate formatter (numeric day + short month)", () => {
    // 2026-01-03 → «3 يناير» via ar-LY-u-nu-latn (Western digits).
    const label = daySectionLabel("2026-01-03T10:00:00+02:00", NOW);
    expect(label).toContain("يناير");
    expect(label).toContain("3");
    expect(label).not.toContain("اليوم");
    expect(label).not.toContain("أمس");
  });

  test("Tripoli clock, not the device clock: UTC timestamps map to the civil day", () => {
    // 2026-01-15T01:00Z is 03:00 in Tripoli — still Thursday the 15th.
    expect(daySectionLabel("2026-01-15T01:00:00Z", NOW)).toBe("اليوم");
    // 2026-01-14T23:30Z is 01:30 on the 15th in Tripoli → اليوم, not أمس.
    expect(daySectionLabel("2026-01-14T23:30:00Z", NOW)).toBe("اليوم");
  });
});

describe("groupNotificationsByDay", () => {
  const rows: AppNotification[] = [
    n("old-2", "2026-01-03T09:00:00+02:00"),
    n("today-b", "2026-01-15T08:00:00+02:00", { readAt: null }),
    n("yday", "2026-01-14T20:00:00+02:00"),
    n("today-a", "2026-01-15T10:00:00+02:00", { readAt: "2026-01-15T11:00:00+02:00" }),
    n("old-1", "2026-01-03T18:00:00+02:00"),
  ];

  test("headers interleaved newest-day-first with rows newest-first inside a day", () => {
    const { items } = groupNotificationsByDay(rows, NOW);
    const kinds = items.map((i) => (i.kind === "header" ? `H:${i.label}` : `R:${i.key}`));
    expect(kinds).toEqual([
      "H:اليوم",
      "R:today-a",
      "R:today-b",
      "H:أمس",
      "R:yday",
      `H:${shortDate("2026-01-03T18:00:00+02:00")}`,
      "R:old-1",
      "R:old-2",
    ]);
  });

  test("sticky indices point at every header, headers are keyed by day", () => {
    const { items, stickyIndices } = groupNotificationsByDay(rows, NOW);
    for (const idx of stickyIndices) {
      expect(items[idx]?.kind).toBe("header");
    }
    expect(stickyIndices).toEqual([0, 3, 5]);
    const first = items[0];
    if (first?.kind === "header") expect(first.key).toBe("h-2026-01-15");
  });

  test("rows carry the notification verbatim (unread state survives grouping)", () => {
    const { items } = groupNotificationsByDay(rows, NOW);
    const row = items.find((i) => i.kind === "row" && i.key === "today-b");
    expect(row && row.kind === "row" && row.n.readAt).toBeNull();
    const readRow = items.find((i) => i.kind === "row" && i.key === "today-a");
    expect(readRow && readRow.kind === "row" && readRow.n.readAt).toBe("2026-01-15T11:00:00+02:00");
  });

  test("empty feed → no headers, no sticky indices", () => {
    expect(groupNotificationsByDay([], NOW)).toEqual({ items: [], stickyIndices: [] });
  });

  test("input order never matters (defensive sort)", () => {
    const a = groupNotificationsByDay(rows, NOW);
    const b = groupNotificationsByDay([...rows].reverse(), NOW);
    expect(a.items.map((i) => i.key)).toEqual(b.items.map((i) => i.key));
  });
});

describe("notificationIconUrl", () => {
  test("http(s) icons pass through as avatar URLs", () => {
    expect(notificationIconUrl("https://cdn.madarek.io/a.png")).toBe("https://cdn.madarek.io/a.png");
  });
  test("emoji / short icon names / null render the badge instead", () => {
    expect(notificationIconUrl("📢")).toBeNull();
    expect(notificationIconUrl("academic")).toBeNull();
    expect(notificationIconUrl(null)).toBeNull();
    expect(notificationIconUrl(undefined)).toBeNull();
  });
});
