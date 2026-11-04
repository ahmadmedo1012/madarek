/** Quality office endpoints (QUALITY_VIEW, institution-scoped). */
import { get } from "./client";

/**
 * Wire shape of GET /quality/overview (backend learning.routes.ts r179:
 * prisma groupBy counts). The three group maps are keyed by enum value
 * (role / attendance status / paper status) → count; the three scalars
 * are plain counts. Values stay `unknown`-coerced at render time via
 * `numOf` (honest "—" for anything the wire did not actually send) —
 * the index signature keeps any EXTRA aggregate the backend adds later
 * flowing into the honest `rest` ledger instead of being dropped.
 */
export interface QualityOverview {
  /** role (STUDENT/TEACHER/…) → user count */
  users?: Partial<Record<string, number>>;
  /** attendance status (PRESENT/LATE/ABSENT/EXCUSED) → record count */
  attendance?: Partial<Record<string, number>>;
  /** paper status (UPLOADED/…/PUBLISHED) → count */
  papers?: Partial<Record<string, number>>;
  courses?: number;
  offerings?: number;
  lectures?: number;
  /** any aggregate added later still renders (honest ledger), never typed away */
  [k: string]: unknown;
}

export const qualityApi = {
  overview: () => get<QualityOverview>("/quality/overview"),
  courses: (page = 1, limit = 20) => get<unknown>("/quality/courses", { page, limit }),
  professors: (page = 1, limit = 20) => get<unknown>("/quality/professors", { page, limit }),
  engagement: () => get<unknown>("/quality/engagement"),
  curriculum: () => get<unknown>("/quality/curriculum"),
  alerts: () => get<unknown[]>("/quality/alerts"),
};
