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
    queryFn: () =>
      api.get('/feedback', { params: { page, limit: 20, ...(status ? { status } : {}) } }),
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
