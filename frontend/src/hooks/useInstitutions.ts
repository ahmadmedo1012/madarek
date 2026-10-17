import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInstitution,
  listOwnerInstitutions,
  listPublicInstitutions,
  provisionInstitutionAdmin,
  restoreInstitutionMembership,
  revokeInstitutionMembership,
  updateInstitution,
  type CreateInstitutionInput,
  type InstitutionMembershipRow,
  type ProvisionAdminInput,
  type UpdateInstitutionInput,
} from '../lib/api';

/**
 * r178 (multi-institution foundation) — institution domain hooks.
 *
 * One module owns the whole surface so the pages (register's
 * institution step, the owner console) and their tests have a single
 * mock boundary. Query keys live under the `institutions` /
 * `['owner', 'institutions']` families; every mutation invalidates the
 * owner listing (the console's source of truth).
 *
 * Toast feedback stays at the PAGE call sites (per-mutate callbacks
 * name the specific institution/admin in the Arabic copy — a
 * hook-level generic message would lose that context).
 */

/** Public listing (GET /institutions — active institutions, no auth). */
export function useInstitutions() {
  return useQuery({
    queryKey: ['institutions'],
    queryFn: () => listPublicInstitutions(),
    staleTime: 5 * 60_000,
  });
}

/** OWNER console listing (GET /owner/institutions — counts + admins). */
export function useOwnerInstitutions() {
  return useQuery({
    queryKey: ['owner', 'institutions'],
    queryFn: () => listOwnerInstitutions(),
    staleTime: 15_000,
  });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInstitutionInput) => createInstitution(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'institutions'] });
    },
  });
}

export function useUpdateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: UpdateInstitutionInput }) =>
      updateInstitution(input.id, input.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'institutions'] });
    },
  });
}

export function useProvisionInstitutionAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { institutionId: string; body: ProvisionAdminInput }) =>
      provisionInstitutionAdmin(input.institutionId, input.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'institutions'] });
    },
  });
}

export function useRevokeInstitutionMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { institutionId: string; membershipId: string }): Promise<{
      membership: InstitutionMembershipRow;
    }> => revokeInstitutionMembership(input.institutionId, input.membershipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'institutions'] });
    },
  });
}

export function useRestoreInstitutionMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { institutionId: string; membershipId: string }): Promise<{
      membership: InstitutionMembershipRow;
    }> => restoreInstitutionMembership(input.institutionId, input.membershipId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'institutions'] });
    },
  });
}
