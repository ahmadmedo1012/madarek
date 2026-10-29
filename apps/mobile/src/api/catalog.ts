/** Catalog: institutions, faculties, courses, library, mooc, jobs, labs, leaderboard, facts. */
import { get, post } from "./client";
import type { Book, Faculty, Institution, JobPost, MoocCourse, Paginated } from "./types";

export const catalogApi = {
  institutions: () => get<Institution[]>("/institutions"),
  faculties: (institutionSlug?: string) => get<(Faculty & { departments: { id: string; name: string }[] })[]>("/faculties", institutionSlug ? { institutionSlug } : undefined),
  universityFacts: () => get<unknown>("/university/facts"),
  libraryBooks: (q?: { page?: number; limit?: number; q?: string }) => get<Paginated<Book>>("/library/books", q),
  borrow: (bookId: string) => post<unknown>("/library/loans", { bookId }),
  returnBook: (loanId: string) => post<unknown>(`/library/loans/${loanId}/return`),
  mooc: (limit = 50) => get<MoocCourse[]>("/mooc", { limit }),
  jobs: (limit = 50) => get<JobPost[]>("/jobs", { limit }),
  applyJob: (jobId: string) => post<unknown>(`/jobs/${jobId}/apply`),
  labs: () => get<{ id: string; name: string; discipline?: string; description?: string | null; iconEmoji?: string | null; experiments?: { id: string; name: string }[] }[]>("/labs"),
  arExperiences: () => get<{ id: string; title: string; type: string; contentUrl?: string | null; description?: string | null }[]>("/ar-experiences"),
  leaderboard: () => get<{ id: string; firstName: string; lastName: string; avatarInitials?: string | null; avatarColor?: string | null; totalXp: number; level: number }[]>("/leaderboard"),
};

export interface CollegeRow {
  id: string;
  slug?: string;
  name: string;
  city?: string | null;
  programsCount?: number;
  studentCount?: number;
  [k: string]: unknown;
}

export const collegesApi = {
  list: () => get<CollegeRow[]>("/colleges"),
  leaderboard: () => get<(CollegeRow & { score?: number })[]>("/colleges/leaderboard"),
  detail: (id: string) => get<CollegeRow & { programs?: unknown[]; faculties?: Faculty[]; stats?: Record<string, number> }>(`/colleges/${id}`),
};
