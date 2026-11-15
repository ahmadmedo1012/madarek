/**
 * r353-F — the discovery search pure logic (GET /search/discover).
 *
 * The 15 typed categories of the backend's discovery engine, the
 * role → categories param (a STUDENT discovers no people and never the
 * staff question bank — globalSearchScope nulls those rows, so the
 * request never asks for them), and the wire → UI-section flattening.
 * Dependency-free (types only) so the colocated net (discoverLogic.test.ts)
 * mounts no transports — the same rule as coursesLogic.ts.
 */
import type { DiscoverResults, DiscoverItem } from "@/api/types";

/** The canonical category order (backend GLOBAL_SEARCH_CATEGORIES). */
export const DISCOVER_CATEGORY_ORDER = [
  "students",
  "teachers",
  "institutions",
  "faculties",
  "departments",
  "courses",
  "lectures",
  "materials",
  "papers",
  "tracks",
  "books",
  "jobs",
  "events",
  "announcements",
  "questions",
] as const;

export type DiscoverCategoryKey = (typeof DISCOVER_CATEGORY_ORDER)[number];

/** One flattened UI row — title + ONE meta, the 1-line law. */
export interface DiscoverRow {
  id: string;
  kind: DiscoverItem["kind"];
  title: string;
  meta: string | null;
  href: string | null;
}

/** One rendered section (a category that answered). */
export interface DiscoverSection {
  key: DiscoverCategoryKey;
  title: string;
  rows: DiscoverRow[];
}

export const SECTION_TITLE: Record<DiscoverCategoryKey, string> = {
  students: "الطلاب",
  teachers: "الأساتذة",
  institutions: "المؤسسات",
  faculties: "الكليات",
  departments: "الأقسام",
  courses: "المقرّرات",
  lectures: "المحاضرات",
  materials: "المواد التعليمية",
  papers: "البحوث",
  tracks: "مسارات التدريب",
  books: "الكتب",
  jobs: "الوظائف",
  events: "الفعاليات",
  announcements: "الإعلانات",
  questions: "بنك الأسئلة",
};

/**
 * The role → categories param. The mobile app seats STUDENT/TEACHER
 * only; a STUDENT asks for the 12 record categories (no students /
 * teachers / questions — the backend scope nulls those rows anyway),
 * everyone else asks for all fifteen.
 */
export function discoverCategoriesForRole(role: string | null | undefined): string {
  if (role && role !== "STUDENT") return DISCOVER_CATEGORY_ORDER.join(",");
  return DISCOVER_CATEGORY_ORDER.filter(
    (c) => c !== "students" && c !== "teachers" && c !== "questions",
  ).join(",");
}

/**
 * Flatten the discovery envelope into UI sections, canonical category
 * order (people first). Empty categories drop out; every row carries
 * the backend's role-honest href (null = a plain row, never a dead
 * tap).
 */
export function flattenDiscoverSections(data: DiscoverResults | undefined | null): DiscoverSection[] {
  if (!data?.categories) return [];
  const sections: DiscoverSection[] = [];
  for (const key of DISCOVER_CATEGORY_ORDER) {
    const category = data.categories[key];
    if (!category || category.items.length === 0) continue;
    sections.push({
      key,
      title: SECTION_TITLE[key],
      rows: category.items.map((it) => ({
        id: it.id,
        kind: it.kind,
        title: it.titleAr,
        meta: it.subtitleAr,
        href: it.href,
      })),
    });
  }
  return sections;
}
