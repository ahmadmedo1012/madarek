import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  unwrap,
  extractSessionExtras,
  selectInstitution,
  requestPasswordReset,
  resetPassword,
  type AuthSessionResponse,
} from '../lib/api';
import { useAuthStore, type AuthUser, type AcademicPosition, type SessionInstitutionExtras } from '../stores/auth.store';

interface MeProfileResponse extends AuthUser, Partial<SessionInstitutionExtras> {
  scopeFaculty?: { id: string; name: string } | null;
  // 012-design-graphics-uplift — presentation preferences (no PII).
  themePreference?: 'LIGHT' | 'DARK' | 'SYSTEM';
  themePreferenceUpdatedAt?: string;
  onboardingCompletedAt?: string | null;
  firedMilestones?: string[];
  studentProfile?: {
    universityId: string;
    year: number;
    facultyId: string;
    departmentId: string;
    faculty?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
  } | null;
  teacherProfile?: {
    departmentId: string;
    specialty: string;
    position: AcademicPosition | null;
    positionFacultyId: string | null;
    positionDepartmentId: string | null;
    positionFaculty?: { id: string; name: string } | null;
    positionDepartment?: { id: string; name: string } | null;
    appointedAt: string | null;
    termEndsAt: string | null;
  } | null;
}

// r180: institutionSlug is the REG_NUMBER_AMBIGUOUS recovery hint — the
// backend resolves a reg-number collision across institutions with it.
interface LoginPayload { email: string; password: string; institutionSlug?: string }
interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Self-serve registration is restricted to academic roles. */
  role: 'STUDENT' | 'TEACHER';
  /** r178: the institution the account registers into — required for
   *  both public roles (the backend validates the faculty/department
   *  chain belongs to it). */
  institutionId: string;
  facultyId?: string;
  departmentId?: string;
  universityId?: string;
  year?: number;
  specialty?: string;
  rank?: 'LECTURER' | 'ASSISTANT_PROFESSOR' | 'ASSOCIATE_PROFESSOR' | 'PROFESSOR';
  // r323 B3.1 — an optional invite code (students): the backend
  // validates + consumes it inside the register transaction and
  // enrolls the caller into the scoped offering atomically.
  inviteCode?: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginPayload) =>
      unwrap<AuthSessionResponse>(api.post('/auth/login', input)),
    onSuccess: ({ user, accessToken }) => {
      // Session boundary (P0-1): drop the previous account's cached
      // queries BEFORE the new session renders — shared lab machines
      // must never see the predecessor's `me`/milestones/profile.
      qc.clear();
      setSession(user, accessToken, extractSessionExtras(user));
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterPayload) =>
      unwrap<AuthSessionResponse>(api.post('/auth/register', input)),
    onSuccess: ({ user, accessToken }) => {
      // Same session boundary as useLogin (P0-1).
      qc.clear();
      setSession(user, accessToken, extractSessionExtras(user));
    },
  });
}

/** r178: switch the session's institution context. The server verifies
 *  the active membership and mints a fresh access token (new `inst`
 *  claim). On success the store's context updates FIRST (the api
 *  interceptor already reads the new token), then every cached query
 *  is invalidated — institution-scoped data (faculties, courses,
 *  dashboards…) refetches in place under the new context instead of
 *  flashing the previous institution's rows. */
export function useSelectInstitution() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { institutionId: string }) => selectInstitution(input.institutionId),
    onSuccess: ({ user, accessToken }) => {
      setSession(user, accessToken, extractSessionExtras(user));
      qc.invalidateQueries();
    },
  });
}

export function useMe() {
  const token = useAuthStore((s) => s.accessToken);
  const applySessionExtras = useAuthStore((s) => s.applySessionExtras);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const me = await unwrap<MeProfileResponse>(api.get('/auth/me'));
      /* r178: /auth/me is the authoritative institution context (the
       * r178 auth module returns memberships + currentInstitution +
       * membershipRole with the membership-scoped profiles). Sync it
       * into the store WITHOUT touching the user/token pair: revocations,
       * suspensions and newly granted memberships land here first, and
       * a refresh that re-resolved a multi-membership session to
       * context=null is re-announced so the shell can offer selection
       * again (Agent B's refresh contract + the D4 honest-defaults
       * rule — no context in the payload resets the context). */
      applySessionExtras(extractSessionExtras(me));
      return me;
    },
    enabled: Boolean(token),
    staleTime: 60_000,
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
}

/* ── R320 §D (PAGES-GAP §5): the forgot-password flow ──────────────
 *
 * Both mutations are SESSION-NEUTRAL: neither touches the auth store
 * nor clears the query cache. The visitor is on a GuestRoute (no
 * session by definition), and the backend's answers are deliberately
 * uninformative (generic 200 / generic 400) — the pages own all state
 * presentation. On a SUCCESSFUL reset every existing session dies
 * server-side (tokenVersion bump), which a guest has none of. */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      resetPassword(input.token, input.password),
  });
}
