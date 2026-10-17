// permissions.ts — r153c domain split of ../useResources.ts (permissions / governance domain.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';
import type { AppRole } from '../../stores/auth.store';

// ════════════════════════════════════════════════════════════════
//  Academic intelligence + governance + exams + social
// ════════════════════════════════════════════════════════════════

// ── Permissions / governance ──────────────────────────────────
export type AppCapability =
  | 'RESEARCH_GRADE_OWN' | 'RESEARCH_GRADE_ANY' | 'RESEARCH_PUBLISH'
  | 'EXAMS_AUTHOR' | 'EXAMS_MODERATE' | 'EXAMS_TAKE'
  | 'CURRICULUM_EDIT_OWN' | 'CURRICULUM_EDIT_ANY'
  | 'USERS_MANAGE' | 'ROLES_ASSIGN' | 'TEACHERS_VERIFY'
  | 'QUALITY_VIEW' | 'QUALITY_REPORT'
  | 'ANNOUNCE_PLATFORM' | 'ANNOUNCE_FACULTY'
  | 'COMPETITIONS_RUN' | 'EVENTS_RUN';

export interface MyPermissions {
  // Same wire truth as MyProfile.role (15-c P1-4): the backend echoes
  // req.user.role raw, OWNER included.
  role: AppRole;
  capabilities: AppCapability[];
  roleDefaults: AppCapability[];
}
export function useMyPermissions() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['me', 'permissions'], inst),
    queryFn: () => unwrap<MyPermissions>(api.get('/me/permissions')),
  });
}
