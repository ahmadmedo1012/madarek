/**
 * r353-F — the discovery logic net, colocated with discoverLogic.ts.
 * No transports mounted: the categories param (the role filter), the
 * section flattening (canonical order, empty categories dropped), and
 * the 1-line row mapping (titleAr/subtitleAr → title/meta, the
 * role-honest href carried through untouched).
 */
import type { DiscoverResults } from "@/api/types";
import {
  DISCOVER_CATEGORY_ORDER,
  discoverCategoriesForRole,
  flattenDiscoverSections,
} from "./discoverLogic";

/* ── fixtures (Arabic, honest wire shapes) ───────────────────────────── */

function envelope(categories: DiscoverResults["categories"]): DiscoverResults {
  return { query: "هندسة", categories, tookMs: 2 };
}

describe("discoverCategoriesForRole — the role filter rides the param", () => {
  it("a STUDENT asks for the 12 record categories — people and the question bank never requested", () => {
    const param = discoverCategoriesForRole("STUDENT");
    const list = param.split(",");
    expect(list).toHaveLength(12);
    expect(list).not.toContain("students");
    expect(list).not.toContain("teachers");
    expect(list).not.toContain("questions");
    // canonical order preserved
    expect(list).toEqual([
      "institutions", "faculties", "departments", "courses", "lectures",
      "materials", "papers", "tracks", "books", "jobs", "events", "announcements",
    ]);
  });

  it("a TEACHER asks for ALL fifteen (their enrolled students + colleagues + the bank)", () => {
    expect(discoverCategoriesForRole("TEACHER").split(",")).toEqual([
      ...DISCOVER_CATEGORY_ORDER,
    ]);
  });

  it("an unknown/missing role falls back to the conservative records-only set", () => {
    expect(discoverCategoriesForRole(null)).toBe(discoverCategoriesForRole("STUDENT"));
    expect(discoverCategoriesForRole(undefined)).toBe(discoverCategoriesForRole("STUDENT"));
  });
});

describe("flattenDiscoverSections — the wire → UI sections", () => {
  it("flattens in canonical category order (people first), dropping empty categories", () => {
    const data = envelope({
      // deliberately out of order + one empty category
      books: { items: [{ id: "b1", kind: "book", titleAr: "أساسيات الشبكات", subtitleAr: "م. سالم", href: "/student/library" }], total: 1 },
      students: { items: [{ id: "s1", kind: "student", titleAr: "محمد المهدي", subtitleAr: "UZ-2024-00001 · كلية الهندسة", href: "/admin/students" }], total: 1 },
      courses: { items: [], total: 0 },
    });
    const sections = flattenDiscoverSections(data);
    expect(sections.map((s) => s.key)).toEqual(["students", "books"]);
    expect(sections[0]!.title).toBe("الطلاب");
    expect(sections[1]!.title).toBe("الكتب");
  });

  it("maps one row: title + ONE meta, the href carried through (null = plain row)", () => {
    const data = envelope({
      departments: {
        items: [
          { id: "d1", kind: "department", titleAr: "قسم الهندسة الكهربائية", subtitleAr: "كلية الهندسة", href: null },
          { id: "d2", kind: "department", titleAr: "قسم الحاسوب", subtitleAr: null, href: null },
        ],
        total: 2,
      },
    });
    const rows = flattenDiscoverSections(data)[0]!.rows;
    expect(rows[0]).toEqual({
      id: "d1",
      kind: "department",
      title: "قسم الهندسة الكهربائية",
      meta: "كلية الهندسة",
      href: null,
    });
    expect(rows[1]!.meta).toBeNull();
  });

  it("handles the missing/undefined envelope without crashing (the render-net crash class)", () => {
    expect(flattenDiscoverSections(undefined)).toEqual([]);
    expect(flattenDiscoverSections(null)).toEqual([]);
    expect(flattenDiscoverSections(envelope({}))).toEqual([]);
  });
});
