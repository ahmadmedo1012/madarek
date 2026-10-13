// research.ts — r153c domain split of ../useResources.ts (research domain: papers · annotations · the paper mutations (upload/scan/grade/publish).)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import type { AppRole } from '../../stores/auth.store';

// ── Research papers ────────────────────────────────────────────
export type PaperStatus =
  | 'UPLOADED' | 'SCANNING' | 'CHECKS_PASSED' | 'CHECKS_FAILED' | 'GRADED' | 'PUBLISHED';

export interface ResearchPaper {
  id: string;
  title: string;
  abstract?: string | null;
  fileUrl?: string | null;
  status: PaperStatus;
  plagiarismPct?: number | null;
  aiContentPct?: number | null;
  grade?: number | null;
  feedback?: string | null;
  uploadedAt: string;
  scannedAt?: string | null;
  gradedAt?: string | null;
  publishedAt?: string | null;
  student: { id: string; firstName: string; lastName: string; avatarInitials?: string | null; avatarColor?: string | null; email?: string };
  reviewer?: { id: string; firstName: string; lastName: string } | null;
  offering?: { id: string; course: { name: string; code: string } } | null;
}

export function useMyResearch() {
  return useQuery({
    queryKey: ['me', 'research'],
    queryFn: () => unwrap<ResearchPaper[]>(api.get('/me/research')),
  });
}

export function useResearchQueue() {
  return useQuery({
    queryKey: ['research', 'queue'],
    queryFn: () => unwrap<ResearchPaper[]>(api.get('/research/queue')),
  });
}

export function usePublishedResearch() {
  return useQuery({
    queryKey: ['research', 'published'],
    queryFn: () => unwrap<ResearchPaper[]>(api.get('/research/published')),
  });
}

// Cross-document search across published papers (title + abstract + body).
// Returns papers with matchedIn ('title' | 'abstract' | 'body') + a snippet
// containing <mark> tags around the search term.
export interface ResearchSearchHit extends ResearchPaper {
  matchedIn: 'title' | 'abstract' | 'body';
  snippet: string | null;
}
export function useResearchSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['research', 'search', trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const res = await api.get<{ data: ResearchSearchHit[]; meta: { query: string; total: number } }>(
        `/research/search?q=${encodeURIComponent(trimmed)}`,
      );
      return res.data;
    },
    /* 22-c (A3 P2-2): same flicker as useBooks — each new query term
       collapsed the list into its skeleton. Previous results stay
       mounted until the new search resolves. */
    placeholderData: keepPreviousData,
  });
}

// ── Paper annotations ─────────────────────────────────────────
export interface PaperAnnotation {
  id: string;
  paperId: string;
  page: number;
  comment: string;
  color: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    // AppRole (16-E2 hand-off, landed 16-E10): the backend ships user.role
    // raw and OWNER may annotate (learning.routes POST requireRole
    // TEACHER/ADMIN/OWNER) — the 4-role union mislabeled an OWNER author.
    role: AppRole;
    avatarColor: string | null;
    avatarInitials: string | null;
  };
}
export function useAnnotations(paperId: string | undefined) {
  return useQuery({
    queryKey: ['annotations', paperId],
    enabled: !!paperId,
    queryFn: () => unwrap<PaperAnnotation[]>(api.get(`/research/${paperId}/annotations`)),
  });
}
export function useCreateAnnotation(paperId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { page: number; comment: string; color?: string }) =>
      unwrap<PaperAnnotation>(api.post(`/research/${paperId}/annotations`, input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations', paperId] }),
  });
}
export function useDeleteAnnotation(paperId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (annotationId: string) =>
      api.delete(`/research/annotations/${annotationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations', paperId] }),
  });
}

export function useUploadPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; abstract?: string; offeringId?: string; fileUrl?: string }) =>
      unwrap<ResearchPaper>(api.post('/me/research', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'research'] }),
  });
}

export function useScanPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<ResearchPaper>(api.post(`/research/${id}/scan`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'research'] });
      qc.invalidateQueries({ queryKey: ['research', 'queue'] });
    },
  });
}

export function useGradePaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; grade: number; feedback?: string }) =>
      unwrap<ResearchPaper>(api.post(`/research/${input.id}/grade`, { grade: input.grade, feedback: input.feedback })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research', 'queue'] });
      qc.invalidateQueries({ queryKey: ['me', 'research'] });
      /* r153g: the admin research drill-down (useAdminPapers) shows the
       * paper's status — a teacher's grade left it stale until a later
       * mount's 30s stale window lapsed. */
      qc.invalidateQueries({ queryKey: ['admin', 'papers'] });
    },
  });
}

export function usePublishPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<ResearchPaper>(api.post(`/research/${id}/publish`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research', 'queue'] });
      qc.invalidateQueries({ queryKey: ['me', 'research'] });
      // 15-d P2-1: the library list surfaces published papers — a fresh
      // publish must appear there immediately, not after the 30s stale
      // window lapses on a later mount.
      qc.invalidateQueries({ queryKey: ['research', 'published'] });
      /* r153g: same admin drill-down freshness contract as grading
       * above — the status column flips to PUBLISHED on the admin
       * register too. */
      qc.invalidateQueries({ queryKey: ['admin', 'papers'] });
    },
  });
}
