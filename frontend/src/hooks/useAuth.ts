import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';
import { useAuthStore, type AuthUser } from '../stores/auth.store';

interface LoginPayload { email: string; password: string }
interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
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
    queryFn: () => unwrap<AuthUser & { studentProfile?: unknown; teacherProfile?: unknown }>(api.get('/auth/me')),
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
