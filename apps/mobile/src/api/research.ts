/** Research papers: submission, scan, review, publishing, annotations. */
import { get, post, del } from "./client";
import type { Paginated, ResearchPaper, PaperAnnotation } from "./types";

export const researchApi = {
  mine: () => get<ResearchPaper[]>("/me/research"),
  submit: (payload: { title: string; abstract?: string; offeringId?: string; fileUrl?: string }) =>
    post<ResearchPaper>("/me/research", payload),
  scan: (id: string) => post<ResearchPaper>(`/research/${id}/scan`),
  grade: (id: string, payload: { grade: number; feedback?: string }) => post<ResearchPaper>(`/research/${id}/grade`, payload),
  publish: (id: string) => post<ResearchPaper>(`/research/${id}/publish`),
  queue: () => get<ResearchPaper[]>("/research/queue"),
  published: () => get<ResearchPaper[]>("/research/published"),
  search: (q: string) => get<ResearchPaper[]>("/research/search", { q }),
  annotations: (paperId: string) => get<PaperAnnotation[]>(`/research/${paperId}/annotations`),
  addAnnotation: (paperId: string, payload: { page: number; comment: string; color?: string }) =>
    post<PaperAnnotation>(`/research/${paperId}/annotations`, payload),
  deleteAnnotation: (annotationId: string) => del<void>(`/research/annotations/${annotationId}`),
  papersAdmin: (page = 1, limit = 20, q?: string) => get<Paginated<ResearchPaper>>("/admin/papers", { page, limit, q }),
};
