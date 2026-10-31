// feedback.ts — r323 B3.6 — the pilot feedback loop hooks (the
// floating widget's send + the registrar/owner inbox read/status).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { withInstitutionScope } from '../../lib/queryClient';
import { useInstitutionScope } from '../../stores/auth.store';

export interface FeedbackRow {
  id: string;
  kind: 'BUG' | 'IDEA';
  role: string | null;
  route: string | null;
  userAgent: string | null;
  console: { t: number; text: string }[] | null;
  note: string;
  screenshot: string | null;
  status: 'open' | 'triage' | 'fixed' | 'dismissed';
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; role: string } | null;
}

export function useSendFeedback() {
  return useMutation({
    mutationFn: (body: {
      kind: 'BUG' | 'IDEA';
      note: string;
      route?: string;
      console?: { t: number; text: string }[];
      screenshot?: string;
    }) => unwrap<{ id: string }>(api.post('/feedback', body)),
  });
}

export function useFeedbackInbox(page: number, status: string | null) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['feedback-inbox', page, status], inst),
    /* r325 P2.4 (found live by the route sweep): the queryFn used to
     * resolve the whole AxiosResponse, so `inbox.data` was
     * `{data: body, status, …}` and the page's `inbox.data.data` read
     * the API ENVELOPE `{data: […], meta}` as the rows array —
     * `rows.map is not a function` crashed the whole owner page into
     * the error boundary. Resolve the BODY (rows + meta together). */
    queryFn: async () => {
      const res = await api.get<{ data: FeedbackRow[]; meta: { total: number; totalPages: number; page: number } }>(
        '/feedback',
        { params: { page, limit: 20, ...(status ? { status } : {}) } },
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'triage' | 'fixed' | 'dismissed' }) =>
      api.patch(`/feedback/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-inbox'] }),
  });
}

/* ── r326 M1.1 — native client-error telemetry (the owner inbox half) ── */

export interface ClientErrorRow {
  id: string;
  kind: 'crash' | 'js_error' | 'unhandled_rejection' | 'api_error' | 'render';
  message: string;
  stack: string | null;
  route: string | null;
  role: string | null;
  breadcrumbs: { rows: string[] } | null;
  appVersion: string | null;
  updateId: string | null;
  runtimeVersion: string | null;
  deviceModel: string | null;
  osName: string | null;
  osVersion: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export function useClientErrors(page: number, reviewed: 'no' | 'yes' | 'all') {
  return useQuery({
    queryKey: ['client-errors', page, reviewed],
    queryFn: async () => {
      const res = await api.get<{
        data: ClientErrorRow[];
        meta: { total: number; totalPages: number; page: number; unreviewed: number };
      }>('/client-errors', { params: { page, limit: 20, reviewed } });
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useClientErrorReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.patch(`/client-errors/${id}/reviewed`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-errors'] }),
  });
}
