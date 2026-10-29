/** Quality office endpoints (QUALITY_VIEW, institution-scoped). */
import { get } from "./client";

export interface QualityOverview {
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
