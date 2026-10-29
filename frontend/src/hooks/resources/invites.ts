// invites.ts — r323 B3.1 — the invite-code hooks (the teacher/registrar
// generation seat + the public pre-submit validation the register page
// hints with).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { withInstitutionScope } from '../../lib/queryClient';
import { useInstitutionScope } from '../../stores/auth.store';

export interface InviteRow {
  id: string;
  code: string;
  role: 'STUDENT' | 'TEACHER';
  offeringId: string | null;
  departmentId: string | null;
  facultyId: string | null;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  offering?: { course: { code: string; name: string } } | null;
  department?: { name: string } | null;
  faculty?: { name: string } | null;
}

export function useInvites() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['invites'], inst),
    queryFn: () => unwrap<InviteRow[]>(api.get('/invites')),
    staleTime: 15_000,
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      role: 'STUDENT' | 'TEACHER';
      offeringId?: string;
      departmentId?: string;
      facultyId?: string;
      expiresInDays: number;
      maxUses: number;
    }) => unwrap<InviteRow>(api.post('/invites', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
}

/** The public pre-submit validation (no auth): the register page shows
 * the scope label honestly before the visitor creates the account. */
export async function validateInvitePublic(code: string, role: 'STUDENT' | 'TEACHER') {
  const { data } = await api.get(`/invites/${encodeURIComponent(code)}/validate`, {
    params: { role },
  });
  return data as { valid: true; role: string; scopeLabel: string | null };
}
