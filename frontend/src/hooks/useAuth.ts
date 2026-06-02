import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';
import { useAuthStore, type AuthUser, type AcademicPosition } from '../stores/auth.store';

interface MeProfileResponse extends AuthUser {
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

interface LoginPayload { email: string; password: string }
interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Self-serve registration is restricted to academic roles. */
  role: 'STUDENT' | 'TEACHER';
  facultyId?: string;
  departmentId?: string;
  universityId?: string;
  year?: number;
  specialty?: string;
  rank?: 'LECTURER' | 'ASSISTANT_PROFESSOR' | 'ASSOCIATE_PROFESSOR' | 'PROFESSOR';
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginPayload) =>
      unwrap<{ user: AuthUser; accessToken: string }>(api.post('/auth/login', input)),
    onSuccess: ({ user, accessToken }) => setSession(user, accessToken),
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterPayload) =>
      unwrap<{ user: AuthUser; accessToken: string }>(api.post('/auth/register', input)),
    onSuccess: ({ user, accessToken }) => setSession(user, accessToken),
  });
}

export function useMe() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => unwrap<MeProfileResponse>(api.get('/auth/me')),
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
